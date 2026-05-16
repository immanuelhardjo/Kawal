import type { EntityRepo, EntityRevisionPayload } from '@kawal/application';
import {
  BahasaText,
  Entity,
  RightOfReply,
  type ChangeKind,
  type EntityProfile,
  type EntityProps,
  type EntityType,
  type Revision,
  type RightOfReplyStatement,
} from '@kawal/domain';
import { and, asc, eq, isNull } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { entities, entitiesRevisions } from '../db/schema/pg.js';

export class DrizzleEntityRepo implements EntityRepo {
  constructor(private readonly db: Db) {}

  async findByIdForOwner(id: string, ownerUserId: string): Promise<Entity | null> {
    const row = await this.db.query.entities.findFirst({
      where: (e, { and, eq }) => and(eq(e.id, id), eq(e.ownerUserId, ownerUserId)),
    });
    return row ? toEntity(row) : null;
  }

  async listForOwner(ownerUserId: string, _caseId?: string): Promise<Entity[]> {
    // Cases ↔ entities link via Event / Relationship / Claim references; the
    // tracer-bullet read returns all entities owned by the user. A
    // case-scoped projection is added once those tables are populated.
    const rows = await this.db.query.entities.findMany({
      where: (e, { eq }) => eq(e.ownerUserId, ownerUserId),
      orderBy: (e, { asc }) => asc(e.canonicalName),
    });
    return rows.map(toEntity);
  }

  async save(input: {
    aggregate: Entity;
    change: ChangeKind;
    actorUserId: string;
    now: Date;
  }): Promise<void> {
    const e = input.aggregate;
    if (e.ownerUserId !== input.actorUserId) {
      throw new Error(
        `actor ${input.actorUserId} cannot save entity ${e.id} owned by ${e.ownerUserId}`,
      );
    }
    await this.db.transaction(async (tx) => {
      const existing = await tx.query.entities.findFirst({
        where: (row, { eq }) => eq(row.id, e.id),
      });
      const nextRevisionNo = existing ? existing.currentRevisionNo + 1 : 1;
      const effectiveChange = resolveChangeKind(input.change, existing != null);

      if (existing) {
        await tx
          .update(entitiesRevisions)
          .set({ validTo: input.now })
          .where(and(eq(entitiesRevisions.aggregateId, e.id), isNull(entitiesRevisions.validTo)));
      }
      await tx.insert(entitiesRevisions).values({
        aggregateId: e.id,
        revisionNo: nextRevisionNo,
        validFrom: input.now,
        validTo: null,
        actorUserId: input.actorUserId,
        changeKind: effectiveChange,
        payload: toPayload(e),
      });
      await tx
        .insert(entities)
        .values({
          id: e.id,
          ownerUserId: e.ownerUserId,
          type: e.type,
          canonicalName: e.canonicalName,
          aliases: [...e.aliases],
          description: e.description.value,
          publicFigure: e.publicFigure,
          profile: e.profile,
          currentRevisionNo: nextRevisionNo,
          updatedAt: input.now,
        })
        .onConflictDoUpdate({
          target: entities.id,
          set: {
            canonicalName: e.canonicalName,
            aliases: [...e.aliases],
            description: e.description.value,
            publicFigure: e.publicFigure,
            profile: e.profile,
            currentRevisionNo: nextRevisionNo,
            updatedAt: input.now,
          },
        });
    });
  }

  async tombstone(input: { id: string; actorUserId: string; now: Date }): Promise<void> {
    await this.db.transaction(async (tx) => {
      const row = await tx.query.entities.findFirst({
        where: (e, { and, eq }) =>
          and(eq(e.id, input.id), eq(e.ownerUserId, input.actorUserId)),
      });
      if (!row) return;
      await tx
        .update(entitiesRevisions)
        .set({ validTo: input.now })
        .where(
          and(eq(entitiesRevisions.aggregateId, input.id), isNull(entitiesRevisions.validTo)),
        );
      await tx.insert(entitiesRevisions).values({
        aggregateId: input.id,
        revisionNo: row.currentRevisionNo + 1,
        validFrom: input.now,
        validTo: null,
        actorUserId: input.actorUserId,
        changeKind: 'tombstoned',
        payload: { tombstoned: true },
      });
      await tx.delete(entities).where(eq(entities.id, input.id));
    });
  }

  async listRevisionsForOwner(
    id: string,
    ownerUserId: string,
  ): Promise<Revision<EntityRevisionPayload>[]> {
    const liveRow = await this.db.query.entities.findFirst({
      where: (e, { and, eq }) => and(eq(e.id, id), eq(e.ownerUserId, ownerUserId)),
    });
    if (!liveRow) return [];
    const rows = await this.db
      .select()
      .from(entitiesRevisions)
      .where(eq(entitiesRevisions.aggregateId, id))
      .orderBy(asc(entitiesRevisions.revisionNo));
    return rows.map((r) => ({
      aggregateId: r.aggregateId,
      revisionNo: r.revisionNo,
      validFrom: r.validFrom,
      validTo: r.validTo,
      actorUserId: r.actorUserId,
      changeKind: r.changeKind,
      payload: r.payload as EntityRevisionPayload,
    }));
  }
}

function resolveChangeKind(requested: ChangeKind, exists: boolean): ChangeKind {
  if (requested === 'tombstoned') return 'tombstoned';
  return exists ? 'updated' : 'created';
}

function toEntity(row: typeof entities.$inferSelect): Entity {
  const rawProfile = row.profile as Record<string, unknown>;
  const restoredProfile = restoreProfile(row.type, rawProfile);
  const props: EntityProps = {
    id: row.id,
    ownerUserId: row.ownerUserId,
    type: row.type,
    canonicalName: row.canonicalName,
    aliases: row.aliases,
    description: BahasaText.of(row.description),
    publicFigure: row.publicFigure,
    profile: restoredProfile,
  };
  return Entity.restore(props);
}

function restoreRightOfReply(raw: unknown): RightOfReply {
  if (!isRecord(raw)) return RightOfReply.empty();
  const statementRaw = raw.statement;
  if (!isRecord(statementRaw)) return RightOfReply.empty();
  const sourceId = typeof statementRaw.sourceId === 'string' ? statementRaw.sourceId : null;
  const publishedAtIso =
    typeof statementRaw.publishedAt === 'string' ? statementRaw.publishedAt : null;
  if (!sourceId || !publishedAtIso) return RightOfReply.empty();
  const textValue = extractTextValue(statementRaw.text);
  const statement: RightOfReplyStatement = {
    text: BahasaText.of(textValue),
    sourceId,
    publishedAt: new Date(publishedAtIso),
  };
  return RightOfReply.withStatement(statement);
}

function extractTextValue(raw: unknown): string {
  if (typeof raw === 'string') return raw;
  if (isRecord(raw) && typeof raw.value === 'string') return raw.value;
  return '';
}

function bahasaFrom(raw: unknown): BahasaText {
  if (typeof raw === 'string') return BahasaText.of(raw);
  if (isRecord(raw) && typeof raw.value === 'string') return BahasaText.of(raw.value);
  return BahasaText.of('');
}

function stringArrayOrEmpty(raw: unknown): string[] {
  return Array.isArray(raw) ? raw.filter((s): s is string => typeof s === 'string') : [];
}

function nullableStringOrNull(raw: unknown): string | null {
  return typeof raw === 'string' ? raw : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function restoreProfile(type: EntityType, raw: Record<string, unknown>): EntityProfile {
  if (type === 'person') {
    return {
      type: 'person',
      currentPositions: stringArrayOrEmpty(raw.currentPositions),
      priorPositions: stringArrayOrEmpty(raw.priorPositions),
      lhkpnUrl: nullableStringOrNull(raw.lhkpnUrl),
      photoUrl: nullableStringOrNull(raw.photoUrl),
      rightOfReply: restoreRightOfReply(raw.rightOfReply),
    };
  }
  if (type === 'institution') {
    return {
      type: 'institution',
      mandate: bahasaFrom(raw.mandate),
      leadership: stringArrayOrEmpty(raw.leadership),
      rightOfReply: restoreRightOfReply(raw.rightOfReply),
    };
  }
  if (type === 'company') {
    return {
      type: 'company',
      beneficialOwners: stringArrayOrEmpty(raw.beneficialOwners),
      rightOfReply: restoreRightOfReply(raw.rightOfReply),
    };
  }
  return {
    type: 'document',
    originalPdfUrl: typeof raw.originalPdfUrl === 'string' ? raw.originalPdfUrl : '',
  };
}

function toPayload(e: Entity): EntityRevisionPayload {
  return {
    type: e.type,
    canonicalName: e.canonicalName,
    aliases: e.aliases,
    description: e.description.value,
    publicFigure: e.publicFigure,
    profile: e.profile,
  };
}
