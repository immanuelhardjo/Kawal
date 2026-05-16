import type { SessionContext, SessionStorePort } from '@kawal/application';
import { eq, lte } from 'drizzle-orm';
import { randomBytes } from 'node:crypto';
import type { Db } from '../db/client.js';
import { sessions } from '../db/schema/pg.js';

/**
 * Spec: user-management / "Session cookie issuance and protection",
 *                       / "Session inactivity expiry and sign-out invalidation".
 *
 * Session ids are 32 random bytes hex-encoded. The cookie carries only this
 * opaque value; everything else (userId, lastSeenAt, ip, userAgent) is
 * server-side in this table.
 */
export class DrizzleSessionStore implements SessionStorePort {
  constructor(private readonly db: Db) {}

  async create(input: {
    userId: string;
    now: Date;
    ip: string | null;
    userAgent: string | null;
  }): Promise<{ sessionId: string }> {
    const sessionId = randomBytes(32).toString('hex');
    await this.db.insert(sessions).values({
      id: sessionId,
      userId: input.userId,
      createdAt: input.now,
      lastSeenAt: input.now,
      ip: input.ip,
      userAgent: input.userAgent,
    });
    return { sessionId };
  }

  async hydrate(input: {
    sessionId: string;
    now: Date;
    inactivityMs: number;
  }): Promise<SessionContext | null> {
    const row = await this.db.query.sessions.findFirst({
      where: (s, { eq }) => eq(s.id, input.sessionId),
    });
    if (!row) return null;
    if (input.now.getTime() - row.lastSeenAt.getTime() > input.inactivityMs) {
      await this.invalidate(input.sessionId);
      return null;
    }
    await this.db
      .update(sessions)
      .set({ lastSeenAt: input.now })
      .where(eq(sessions.id, input.sessionId));
    return {
      sessionId: row.id,
      userId: row.userId,
      createdAt: row.createdAt,
      lastSeenAt: input.now,
    };
  }

  async invalidate(sessionId: string): Promise<void> {
    await this.db.delete(sessions).where(eq(sessions.id, sessionId));
  }

  async invalidateAllForUser(userId: string): Promise<void> {
    await this.db.delete(sessions).where(eq(sessions.userId, userId));
  }

  /** Section 11.2 — lazy sweep of expired sessions. */
  async sweepExpired(beforeLastSeenAt: Date): Promise<number> {
    const result = await this.db
      .delete(sessions)
      .where(lte(sessions.lastSeenAt, beforeLastSeenAt));
    return result.rowCount ?? 0;
  }
}
