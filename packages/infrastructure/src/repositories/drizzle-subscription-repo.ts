import {
  UserCaseSubscription,
  type SubscriptionCadence,
  type UserCaseSubscriptionProps,
} from '@kawal/domain';
import type { SubscriptionRepo } from '@kawal/application';
import { and, eq } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { userCaseSubscriptions } from '../db/schema/pg.js';

const ALLOWED_CADENCES: ReadonlySet<SubscriptionCadence> = new Set([
  'daily',
  'weekly',
  'on_change',
  'manual',
]);

export class DrizzleSubscriptionRepo implements SubscriptionRepo {
  constructor(private readonly db: Db) {}

  async findForOwnerAndCase(
    ownerUserId: string,
    caseId: string,
  ): Promise<UserCaseSubscription | null> {
    const row = await this.db.query.userCaseSubscriptions.findFirst({
      where: (s, { and, eq }) => and(eq(s.ownerUserId, ownerUserId), eq(s.caseId, caseId)),
    });
    return row ? toSubscription(row) : null;
  }

  async listForOwner(ownerUserId: string): Promise<UserCaseSubscription[]> {
    const rows = await this.db.query.userCaseSubscriptions.findMany({
      where: (s, { eq }) => eq(s.ownerUserId, ownerUserId),
      orderBy: (s, { desc }) => desc(s.adoptedAt),
    });
    return rows.map(toSubscription);
  }

  async save(subscription: UserCaseSubscription): Promise<void> {
    await this.db
      .insert(userCaseSubscriptions)
      .values({
        id: subscription.id,
        ownerUserId: subscription.ownerUserId,
        caseId: subscription.caseId,
        adoptedAt: subscription.adoptedAt,
        cadence: subscription.cadence,
        lastViewedAt: subscription.lastViewedAt,
        alasanSaya: subscription.alasanSaya,
      })
      .onConflictDoUpdate({
        target: userCaseSubscriptions.id,
        set: {
          cadence: subscription.cadence,
          lastViewedAt: subscription.lastViewedAt,
          alasanSaya: subscription.alasanSaya,
        },
      });
  }

  async deleteById(id: string, ownerUserId: string): Promise<void> {
    await this.db
      .delete(userCaseSubscriptions)
      .where(
        and(
          eq(userCaseSubscriptions.id, id),
          eq(userCaseSubscriptions.ownerUserId, ownerUserId),
        ),
      );
  }
}

function toSubscription(row: typeof userCaseSubscriptions.$inferSelect): UserCaseSubscription {
  if (!ALLOWED_CADENCES.has(row.cadence as SubscriptionCadence)) {
    throw new Error(`Unknown subscription cadence in database: ${row.cadence}`);
  }
  const props: UserCaseSubscriptionProps = {
    id: row.id,
    ownerUserId: row.ownerUserId,
    caseId: row.caseId,
    adoptedAt: row.adoptedAt,
    cadence: row.cadence as SubscriptionCadence,
    lastViewedAt: row.lastViewedAt,
    alasanSaya: row.alasanSaya,
  };
  return UserCaseSubscription.restore(props);
}
