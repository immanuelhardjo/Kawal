import { Case, User } from '@kawal/domain';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  hasPostgres,
  openPostgresFixture,
  resetUsers,
  type PostgresFixture,
} from '../test/postgres-test-helpers.js';
import { DrizzleUserRepo } from './drizzle-user-repo.js';
import { DrizzleCaseRepo } from './drizzle-case-repo.js';

/**
 * Spec: design D2 + every dossier capability's "Append-only revision history".
 *
 * Integration test against a real Postgres instance:
 *   - editing a Case writes a new revision row;
 *   - the prior revision's valid_to is closed;
 *   - the owner can read the full revision history;
 *   - a non-owner request returns an empty history (no leakage).
 *
 * Skipped automatically when DATABASE_URL is unset.
 */
describe.skipIf(!hasPostgres)('DrizzleCaseRepo — revision history (12.9)', () => {
  let fixture: PostgresFixture;
  let users: DrizzleUserRepo;
  let cases: DrizzleCaseRepo;
  const NOW = new Date('2025-01-01T00:00:00Z');

  beforeAll(async () => {
    fixture = await openPostgresFixture();
    users = new DrizzleUserRepo(fixture.db);
    cases = new DrizzleCaseRepo(fixture.db);
  });

  afterAll(async () => {
    await fixture.end();
  });

  beforeEach(async () => {
    await resetUsers(fixture.db);
  });

  async function seedUsers(): Promise<{ userA: string; userB: string }> {
    const userA = 'user_a';
    const userB = 'user_b';
    for (const id of [userA, userB] as const) {
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
    return { userA, userB };
  }

  it('saves successive edits as separate revision rows with closed valid_to', async () => {
    const { userA } = await seedUsers();
    const c0 = Case.create({
      id: 'case_1',
      ownerUserId: userA,
      name: 'Kasus PT X',
      jurisdiction: 'Jakarta',
      caseType: 'tipikor',
      now: NOW,
    });
    await cases.save({ aggregate: c0, change: 'created', actorUserId: userA, now: NOW });
    const c1 = c0.rename('Kasus PT X (revisi)');
    await cases.save({
      aggregate: c1,
      change: 'updated',
      actorUserId: userA,
      now: new Date(NOW.getTime() + 1000),
    });

    const revisions = await cases.listRevisionsForOwner('case_1', userA);
    expect(revisions).toHaveLength(2);
    expect(revisions[0]!.revisionNo).toBe(1);
    expect(revisions[0]!.changeKind).toBe('created');
    expect(revisions[0]!.validTo).not.toBeNull(); // closed when rev 2 landed
    expect(revisions[1]!.revisionNo).toBe(2);
    expect(revisions[1]!.changeKind).toBe('updated');
    expect(revisions[1]!.validTo).toBeNull(); // current revision is open
    expect(revisions[1]!.payload.name).toBe('Kasus PT X (revisi)');
  });

  it('only the owner can read the case revision history', async () => {
    const { userA, userB } = await seedUsers();
    const c = Case.create({
      id: 'case_a_only',
      ownerUserId: userA,
      name: 'Kasus A',
      jurisdiction: 'Jakarta',
      caseType: 'tipikor',
      now: NOW,
    });
    await cases.save({ aggregate: c, change: 'created', actorUserId: userA, now: NOW });

    const asOwner = await cases.listRevisionsForOwner('case_a_only', userA);
    const asOther = await cases.listRevisionsForOwner('case_a_only', userB);
    expect(asOwner.length).toBeGreaterThan(0);
    expect(asOther).toEqual([]);
  });
});

