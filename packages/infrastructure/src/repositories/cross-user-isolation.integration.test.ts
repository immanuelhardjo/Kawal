import { BahasaText, Case, User, UserCaseSubscription } from '@kawal/domain';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  hasPostgres,
  openPostgresFixture,
  resetUsers,
  type PostgresFixture,
} from '../test/postgres-test-helpers.js';
import { DrizzleCaseRepo } from './drizzle-case-repo.js';
import { DrizzleSubscriptionRepo } from './drizzle-subscription-repo.js';
import { DrizzleUserRepo } from './drizzle-user-repo.js';

/**
 * Spec: user-management / "Per-user isolation across the entire dossier",
 *                       / "No admin endpoint exists",
 *                       / "Same publisher URL ingested by two users".
 *
 * Integration test (skip-if-no-DATABASE_URL) that asserts user A cannot
 * read, write, or enumerate user B's records at the repository layer. The
 * HTTP routes always pass `req.user.id` as the owner argument, so verifying
 * the repository's owner-scoped reads/writes here is the load-bearing
 * guarantee.
 */
describe.skipIf(!hasPostgres)('Cross-user dossier isolation (12.6)', () => {
  let fixture: PostgresFixture;
  let users: DrizzleUserRepo;
  let cases: DrizzleCaseRepo;
  let subscriptions: DrizzleSubscriptionRepo;
  const NOW = new Date('2025-01-01T00:00:00Z');

  beforeAll(async () => {
    fixture = await openPostgresFixture();
    users = new DrizzleUserRepo(fixture.db);
    cases = new DrizzleCaseRepo(fixture.db);
    subscriptions = new DrizzleSubscriptionRepo(fixture.db);
  });

  afterAll(async () => {
    await fixture.end();
  });

  beforeEach(async () => {
    await resetUsers(fixture.db);
  });

  async function seed(): Promise<{ userA: string; userB: string }> {
    for (const id of ['user_a', 'user_b'] as const) {
      await users.save(
        User.restore({
          id,
          googleSub: `sub_${id}`,
          email: `${id}@example.com`,
          displayName: id,
          pictureUrl: null,
          createdAt: NOW,
          lastSignedInAt: NOW,
        }),
      );
    }
    return { userA: 'user_a', userB: 'user_b' };
  }

  it("findByIdForOwner returns null when caller is not the owner", async () => {
    const { userA, userB } = await seed();
    const aCase = Case.create({
      id: 'case_a',
      ownerUserId: userA,
      name: 'Kasus A',
      jurisdiction: 'Jakarta',
      caseType: 'tipikor',
      now: NOW,
    });
    await cases.save({ aggregate: aCase, change: 'created', actorUserId: userA, now: NOW });
    expect(await cases.findByIdForOwner('case_a', userA)).not.toBeNull();
    expect(await cases.findByIdForOwner('case_a', userB)).toBeNull();
  });

  it('listForOwner returns only the calling user’s cases', async () => {
    const { userA, userB } = await seed();
    for (const owner of [userA, userB] as const) {
      const c = Case.create({
        id: `case_${owner}`,
        ownerUserId: owner,
        name: `Kasus ${owner}`,
        jurisdiction: 'Jakarta',
        caseType: 'tipikor',
        now: NOW,
      });
      await cases.save({ aggregate: c, change: 'created', actorUserId: owner, now: NOW });
    }
    const aList = await cases.listForOwner(userA);
    const bList = await cases.listForOwner(userB);
    expect(aList.map((c) => c.id)).toEqual(['case_user_a']);
    expect(bList.map((c) => c.id)).toEqual(['case_user_b']);
  });

  it('save rejects an actor that does not own the aggregate', async () => {
    const { userA, userB } = await seed();
    const aCase = Case.create({
      id: 'case_a',
      ownerUserId: userA,
      name: 'Kasus A',
      jurisdiction: 'Jakarta',
      caseType: 'tipikor',
      now: NOW,
    });
    await expect(
      cases.save({ aggregate: aCase, change: 'created', actorUserId: userB, now: NOW }),
    ).rejects.toThrow();
  });

  it('two users may hold cases with the same canonical name without seeing each other', async () => {
    const { userA, userB } = await seed();
    for (const owner of [userA, userB] as const) {
      const c = Case.create({
        id: `case_${owner}_same`,
        ownerUserId: owner,
        name: 'Kasus Korupsi PT X',
        jurisdiction: 'Jakarta',
        caseType: 'tipikor',
        now: NOW,
      });
      await cases.save({ aggregate: c, change: 'created', actorUserId: owner, now: NOW });
    }
    const aLookup = await cases.findByAliasForOwner('Kasus Korupsi PT X', userA);
    const bLookup = await cases.findByAliasForOwner('Kasus Korupsi PT X', userB);
    expect(aLookup?.id).toBe('case_user_a_same');
    expect(bLookup?.id).toBe('case_user_b_same');
  });

  it('subscriptions are owner-scoped', async () => {
    const { userA, userB } = await seed();
    const aCase = Case.create({
      id: 'case_sub_a',
      ownerUserId: userA,
      name: 'Sub A',
      jurisdiction: 'Jakarta',
      caseType: 'tipikor',
      now: NOW,
    });
    await cases.save({ aggregate: aCase, change: 'created', actorUserId: userA, now: NOW });
    await subscriptions.save(
      UserCaseSubscription.create({
        id: 'sub_a',
        ownerUserId: userA,
        caseId: 'case_sub_a',
        cadence: 'manual',
        now: NOW,
      }),
    );
    expect((await subscriptions.listForOwner(userA))).toHaveLength(1);
    expect((await subscriptions.listForOwner(userB))).toHaveLength(0);
  });

  it('cascade-delete removes user A’s data and leaves user B untouched', async () => {
    const { userA, userB } = await seed();
    for (const owner of [userA, userB] as const) {
      const c = Case.create({
        id: `case_cascade_${owner}`,
        ownerUserId: owner,
        name: `Cascade ${owner}`,
        jurisdiction: 'Jakarta',
        caseType: 'tipikor',
        now: NOW,
      });
      await cases.save({ aggregate: c, change: 'created', actorUserId: owner, now: NOW });
    }

    await users.deleteCascade(userA);

    expect(await users.findById(userA)).toBeNull();
    expect((await cases.listForOwner(userA))).toEqual([]);
    expect(await users.findById(userB)).not.toBeNull();
    expect((await cases.listForOwner(userB))).toHaveLength(1);
  });

  // Note: BahasaText is imported defensively here in case future test
  // expansions need it for richer case summaries.
  void BahasaText;
});
