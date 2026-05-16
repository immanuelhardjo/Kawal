/**
 * Spec: user-management / session lifecycle. Design D10 — Postgres-backed.
 *
 * Sessions are server-side; the cookie carries an opaque session id.
 */
export interface SessionContext {
  readonly sessionId: string;
  readonly userId: string;
  readonly createdAt: Date;
  readonly lastSeenAt: Date;
}

export interface SessionStorePort {
  create(input: {
    userId: string;
    now: Date;
    ip: string | null;
    userAgent: string | null;
  }): Promise<{ sessionId: string }>;
  /**
   * Returns the session if still valid (i.e. lastSeenAt within inactivity
   * window), otherwise null. Implementations MUST delete the expired record
   * before returning null to satisfy the spec's "Expired session rejected"
   * scenario.
   */
  hydrate(input: { sessionId: string; now: Date; inactivityMs: number }): Promise<SessionContext | null>;
  invalidate(sessionId: string): Promise<void>;
  invalidateAllForUser(userId: string): Promise<void>;
}
