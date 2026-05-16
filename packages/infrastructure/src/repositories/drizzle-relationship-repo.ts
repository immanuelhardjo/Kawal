import type {
  RelationshipRepo,
  RelationshipRevisionPayload,
} from '@kawal/application';
import {
  BahasaText,
  Relationship,
  type CertaintyLabel,
  type ChangeKind,
  type RelationshipProps,
  type RelationshipType,
  type Revision,
} from '@kawal/domain';
import { and, asc, eq, isNull } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { relationships, relationshipsRevisions } from '../db/schema/pg.js';

export class DrizzleRelationshipRepo implements RelationshipRepo {
  constructor(private readonly db: Db) {}

  async findByIdForOwner(id: string, ownerUserId: string): Promise<Relationship | null> {
    const row = await this.db.query.relationships.findFirst({
      where: (r, { and, eq }) => and(eq(r.id, id), eq(r.ownerUserId, ownerUserId)),
    });
    return row ? toRelationship(row) : null;
  }

  async listForCase(caseId: string, ownerUserId: string): Promise<Relationship[]> {
    // Relationships are scoped per-case via the entities they connect.
    // For the tracer-bullet read we return all relationships owned by the
    // user; case-scoping based on entity membership is a follow-up.
    void caseId;
    const rows = await this.db.query.relationships.findMany({
      where: (r, { eq }) => eq(r.ownerUserId, ownerUserId),
      orderBy: (r, { desc }) => desc(r.activeFrom),
    });
    return rows.map(toRelationship);
  }

  async save(input: {
    aggregate: Relationship;
    change: ChangeKind;
    actorUserId: string;
    now: Date;
  }): Promise<void> {
    const r = input.aggregate;
    if (r.ownerUserId !== input.actorUserId) {
      throw new Error(
        `actor ${input.actorUserId} cannot save relationship ${r.id} owned by ${r.ownerUserId}`,
      );
    }
    await this.db.transaction(async (tx) => {
      const existing = await tx.query.relationships.findFirst({
        where: (row, { eq }) => eq(row.id, r.id),
      });
      const nextRevisionNo = existing ? existing.currentRevisionNo + 1 : 1;
      const effectiveChange = resolveChangeKind(input.change, existing != null);
      if (existing) {
        await tx
          .update(relationshipsRevisions)
          .set({ validTo: input.now })
          .where(
            and(
              eq(relationshipsRevisions.aggregateId, r.id),
              isNull(relationshipsRevisions.validTo),
            ),
          );
      }
      await tx.insert(relationshipsRevisions).values({
        aggregateId: r.id,
        revisionNo: nextRevisionNo,
        validFrom: input.now,
        validTo: null,
        actorUserId: input.actorUserId,
        changeKind: effectiveChange,
        payload: toPayload(r),
      });
      await tx
        .insert(relationships)
        .values({
          id: r.id,
          ownerUserId: r.ownerUserId,
          fromEntityId: r.fromEntityId,
          toEntityId: r.toEntityId,
          type: r.type,
          certainty: r.certainty,
          sourceIds: [...r.sourceIds],
          activeFrom: r.activeFrom,
          activeTo: r.activeTo,
          description: r.description.value,
          currentRevisionNo: nextRevisionNo,
          updatedAt: input.now,
        })
        .onConflictDoUpdate({
          target: relationships.id,
          set: {
            type: r.type,
            certainty: r.certainty,
            sourceIds: [...r.sourceIds],
            activeFrom: r.activeFrom,
            activeTo: r.activeTo,
            description: r.description.value,
            currentRevisionNo: nextRevisionNo,
            updatedAt: input.now,
          },
        });
    });
  }

  async tombstone(input: { id: string; actorUserId: string; now: Date }): Promise<void> {
    await this.db.transaction(async (tx) => {
      const row = await tx.query.relationships.findFirst({
        where: (r, { and, eq }) =>
          and(eq(r.id, input.id), eq(r.ownerUserId, input.actorUserId)),
      });
      if (!row) return;
      await tx
        .update(relationshipsRevisions)
        .set({ validTo: input.now })
        .where(
          and(
            eq(relationshipsRevisions.aggregateId, input.id),
            isNull(relationshipsRevisions.validTo),
          ),
        );
      await tx.insert(relationshipsRevisions).values({
        aggregateId: input.id,
        revisionNo: row.currentRevisionNo + 1,
        validFrom: input.now,
        validTo: null,
        actorUserId: input.actorUserId,
        changeKind: 'tombstoned',
        payload: { tombstoned: true },
      });
      await tx.delete(relationships).where(eq(relationships.id, input.id));
    });
  }

  async listRevisionsForOwner(
    id: string,
    ownerUserId: string,
  ): Promise<Revision<RelationshipRevisionPayload>[]> {
    const liveRow = await this.db.query.relationships.findFirst({
      where: (r, { and, eq }) => and(eq(r.id, id), eq(r.ownerUserId, ownerUserId)),
    });
    if (!liveRow) return [];
    const rows = await this.db
      .select()
      .from(relationshipsRevisions)
      .where(eq(relationshipsRevisions.aggregateId, id))
      .orderBy(asc(relationshipsRevisions.revisionNo));
    return rows.map((row) => ({
      aggregateId: row.aggregateId,
      revisionNo: row.revisionNo,
      validFrom: row.validFrom,
      validTo: row.validTo,
      actorUserId: row.actorUserId,
      changeKind: row.changeKind,
      payload: row.payload as RelationshipRevisionPayload,
    }));
  }
}

function resolveChangeKind(requested: ChangeKind, exists: boolean): ChangeKind {
  if (requested === 'tombstoned') return 'tombstoned';
  return exists ? 'updated' : 'created';
}

function toRelationship(row: typeof relationships.$inferSelect): Relationship {
  const props: RelationshipProps = {
    id: row.id,
    ownerUserId: row.ownerUserId,
    fromEntityId: row.fromEntityId,
    toEntityId: row.toEntityId,
    type: row.type as RelationshipType,
    certainty: row.certainty as CertaintyLabel,
    sourceIds: row.sourceIds,
    activeFrom: row.activeFrom,
    activeTo: row.activeTo,
    description: BahasaText.of(row.description),
  };
  return Relationship.restore(props);
}

function toPayload(r: Relationship): RelationshipRevisionPayload {
  return {
    fromEntityId: r.fromEntityId,
    toEntityId: r.toEntityId,
    type: r.type,
    certainty: r.certainty,
    sourceIds: r.sourceIds,
    activeFrom: r.activeFrom.toISOString(),
    activeTo: r.activeTo ? r.activeTo.toISOString() : null,
    description: r.description.value,
  };
}
