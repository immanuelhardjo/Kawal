import type { ClaimRepo, ClaimRevisionPayload } from '@kawal/application';
import {
  Claim,
  type CertaintyLabel,
  type ChangeKind,
  type ClaimProps,
  type Revision,
} from '@kawal/domain';
import { and, asc, eq, isNull } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { claims, claimsRevisions } from '../db/schema/pg.js';

export class DrizzleClaimRepo implements ClaimRepo {
  constructor(private readonly db: Db) {}

  async findByIdForOwner(id: string, ownerUserId: string): Promise<Claim | null> {
    const row = await this.db.query.claims.findFirst({
      where: (c, { and, eq }) => and(eq(c.id, id), eq(c.ownerUserId, ownerUserId)),
    });
    return row ? toClaim(row) : null;
  }

  async save(input: {
    aggregate: Claim;
    change: ChangeKind;
    actorUserId: string;
    now: Date;
  }): Promise<void> {
    const c = input.aggregate;
    if (c.ownerUserId !== input.actorUserId) {
      throw new Error(
        `actor ${input.actorUserId} cannot save claim ${c.id} owned by ${c.ownerUserId}`,
      );
    }
    await this.db.transaction(async (tx) => {
      const existing = await tx.query.claims.findFirst({
        where: (row, { eq }) => eq(row.id, c.id),
      });
      const nextRevisionNo = existing ? existing.currentRevisionNo + 1 : 1;
      const effectiveChange = resolveChangeKind(input.change, existing != null);
      if (existing) {
        await tx
          .update(claimsRevisions)
          .set({ validTo: input.now })
          .where(and(eq(claimsRevisions.aggregateId, c.id), isNull(claimsRevisions.validTo)));
      }
      await tx.insert(claimsRevisions).values({
        aggregateId: c.id,
        revisionNo: nextRevisionNo,
        validFrom: input.now,
        validTo: null,
        actorUserId: input.actorUserId,
        changeKind: effectiveChange,
        payload: toPayload(c),
      });
      await tx
        .insert(claims)
        .values({
          id: c.id,
          ownerUserId: c.ownerUserId,
          caseId: c.caseId,
          textValue: c.text,
          certainty: c.certainty,
          sourceIds: [...c.sourceIds],
          contradictedByClaimIds: [...c.contradictedByClaimIds],
          currentRevisionNo: nextRevisionNo,
          updatedAt: input.now,
        })
        .onConflictDoUpdate({
          target: claims.id,
          set: {
            textValue: c.text,
            certainty: c.certainty,
            sourceIds: [...c.sourceIds],
            contradictedByClaimIds: [...c.contradictedByClaimIds],
            currentRevisionNo: nextRevisionNo,
            updatedAt: input.now,
          },
        });
    });
  }

  async tombstone(input: { id: string; actorUserId: string; now: Date }): Promise<void> {
    await this.db.transaction(async (tx) => {
      const row = await tx.query.claims.findFirst({
        where: (c, { and, eq }) =>
          and(eq(c.id, input.id), eq(c.ownerUserId, input.actorUserId)),
      });
      if (!row) return;
      await tx
        .update(claimsRevisions)
        .set({ validTo: input.now })
        .where(and(eq(claimsRevisions.aggregateId, input.id), isNull(claimsRevisions.validTo)));
      await tx.insert(claimsRevisions).values({
        aggregateId: input.id,
        revisionNo: row.currentRevisionNo + 1,
        validFrom: input.now,
        validTo: null,
        actorUserId: input.actorUserId,
        changeKind: 'tombstoned',
        payload: { tombstoned: true },
      });
      await tx.delete(claims).where(eq(claims.id, input.id));
    });
  }

  async listRevisionsForOwner(
    id: string,
    ownerUserId: string,
  ): Promise<Revision<ClaimRevisionPayload>[]> {
    const liveRow = await this.db.query.claims.findFirst({
      where: (c, { and, eq }) => and(eq(c.id, id), eq(c.ownerUserId, ownerUserId)),
    });
    if (!liveRow) return [];
    const rows = await this.db
      .select()
      .from(claimsRevisions)
      .where(eq(claimsRevisions.aggregateId, id))
      .orderBy(asc(claimsRevisions.revisionNo));
    return rows.map((r) => ({
      aggregateId: r.aggregateId,
      revisionNo: r.revisionNo,
      validFrom: r.validFrom,
      validTo: r.validTo,
      actorUserId: r.actorUserId,
      changeKind: r.changeKind,
      payload: r.payload as ClaimRevisionPayload,
    }));
  }
}

function resolveChangeKind(requested: ChangeKind, exists: boolean): ChangeKind {
  if (requested === 'tombstoned') return 'tombstoned';
  return exists ? 'updated' : 'created';
}

function toClaim(row: typeof claims.$inferSelect): Claim {
  const props: ClaimProps = {
    id: row.id,
    ownerUserId: row.ownerUserId,
    caseId: row.caseId,
    text: row.textValue,
    certainty: row.certainty as CertaintyLabel,
    sourceIds: row.sourceIds,
    contradictedByClaimIds: row.contradictedByClaimIds,
  };
  return Claim.restore(props);
}

function toPayload(c: Claim): ClaimRevisionPayload {
  return {
    caseId: c.caseId,
    text: c.text,
    certainty: c.certainty,
    sourceIds: c.sourceIds,
    contradictedByClaimIds: c.contradictedByClaimIds,
  };
}
