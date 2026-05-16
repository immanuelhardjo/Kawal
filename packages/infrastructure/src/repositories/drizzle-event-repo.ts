import type { EventRepo, EventRevisionPayload } from '@kawal/application';
import {
  BahasaText,
  Event,
  type CertaintyLabel,
  type ChangeKind,
  type EventProps,
  type EventType,
  type Revision,
} from '@kawal/domain';
import { and, asc, eq, isNull } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { events, eventsRevisions } from '../db/schema/pg.js';

export class DrizzleEventRepo implements EventRepo {
  constructor(private readonly db: Db) {}

  async findByIdForOwner(id: string, ownerUserId: string): Promise<Event | null> {
    const row = await this.db.query.events.findFirst({
      where: (e, { and, eq }) => and(eq(e.id, id), eq(e.ownerUserId, ownerUserId)),
    });
    return row ? toEvent(row) : null;
  }

  async listForCase(caseId: string, ownerUserId: string): Promise<Event[]> {
    const rows = await this.db.query.events.findMany({
      where: (e, { and, eq }) => and(eq(e.caseId, caseId), eq(e.ownerUserId, ownerUserId)),
      orderBy: (e, { desc }) => desc(e.date),
    });
    return rows.map(toEvent);
  }

  async save(input: {
    aggregate: Event;
    change: ChangeKind;
    actorUserId: string;
    now: Date;
  }): Promise<void> {
    const e = input.aggregate;
    if (e.ownerUserId !== input.actorUserId) {
      throw new Error(
        `actor ${input.actorUserId} cannot save event ${e.id} owned by ${e.ownerUserId}`,
      );
    }
    await this.db.transaction(async (tx) => {
      const existing = await tx.query.events.findFirst({
        where: (row, { eq }) => eq(row.id, e.id),
      });
      const nextRevisionNo = existing ? existing.currentRevisionNo + 1 : 1;
      const effectiveChange = resolveChangeKind(input.change, existing != null);
      if (existing) {
        await tx
          .update(eventsRevisions)
          .set({ validTo: input.now })
          .where(and(eq(eventsRevisions.aggregateId, e.id), isNull(eventsRevisions.validTo)));
      }
      await tx.insert(eventsRevisions).values({
        aggregateId: e.id,
        revisionNo: nextRevisionNo,
        validFrom: input.now,
        validTo: null,
        actorUserId: input.actorUserId,
        changeKind: effectiveChange,
        payload: toPayload(e),
      });
      await tx
        .insert(events)
        .values({
          id: e.id,
          ownerUserId: e.ownerUserId,
          caseId: e.caseId,
          type: e.type,
          date: e.date,
          title: e.title,
          summary: e.summary.value,
          certainty: e.certainty,
          sourceIds: [...e.sourceIds],
          entityIds: [...e.entityIds],
          currentRevisionNo: nextRevisionNo,
          updatedAt: input.now,
        })
        .onConflictDoUpdate({
          target: events.id,
          set: {
            type: e.type,
            date: e.date,
            title: e.title,
            summary: e.summary.value,
            certainty: e.certainty,
            sourceIds: [...e.sourceIds],
            entityIds: [...e.entityIds],
            currentRevisionNo: nextRevisionNo,
            updatedAt: input.now,
          },
        });
    });
  }

  async tombstone(input: { id: string; actorUserId: string; now: Date }): Promise<void> {
    await this.db.transaction(async (tx) => {
      const row = await tx.query.events.findFirst({
        where: (e, { and, eq }) =>
          and(eq(e.id, input.id), eq(e.ownerUserId, input.actorUserId)),
      });
      if (!row) return;
      await tx
        .update(eventsRevisions)
        .set({ validTo: input.now })
        .where(and(eq(eventsRevisions.aggregateId, input.id), isNull(eventsRevisions.validTo)));
      await tx.insert(eventsRevisions).values({
        aggregateId: input.id,
        revisionNo: row.currentRevisionNo + 1,
        validFrom: input.now,
        validTo: null,
        actorUserId: input.actorUserId,
        changeKind: 'tombstoned',
        payload: { tombstoned: true },
      });
      await tx.delete(events).where(eq(events.id, input.id));
    });
  }

  async listRevisionsForOwner(
    id: string,
    ownerUserId: string,
  ): Promise<Revision<EventRevisionPayload>[]> {
    const liveRow = await this.db.query.events.findFirst({
      where: (e, { and, eq }) => and(eq(e.id, id), eq(e.ownerUserId, ownerUserId)),
    });
    if (!liveRow) return [];
    const rows = await this.db
      .select()
      .from(eventsRevisions)
      .where(eq(eventsRevisions.aggregateId, id))
      .orderBy(asc(eventsRevisions.revisionNo));
    return rows.map((r) => ({
      aggregateId: r.aggregateId,
      revisionNo: r.revisionNo,
      validFrom: r.validFrom,
      validTo: r.validTo,
      actorUserId: r.actorUserId,
      changeKind: r.changeKind,
      payload: r.payload as EventRevisionPayload,
    }));
  }
}

function resolveChangeKind(requested: ChangeKind, exists: boolean): ChangeKind {
  if (requested === 'tombstoned') return 'tombstoned';
  return exists ? 'updated' : 'created';
}

function toEvent(row: typeof events.$inferSelect): Event {
  const props: EventProps = {
    id: row.id,
    ownerUserId: row.ownerUserId,
    caseId: row.caseId,
    type: row.type as EventType,
    date: row.date,
    title: row.title,
    summary: BahasaText.of(row.summary),
    certainty: row.certainty as CertaintyLabel,
    sourceIds: row.sourceIds,
    entityIds: row.entityIds,
  };
  return Event.restore(props);
}

function toPayload(e: Event): EventRevisionPayload {
  return {
    caseId: e.caseId,
    type: e.type,
    date: e.date.toISOString(),
    title: e.title,
    summary: e.summary.value,
    certainty: e.certainty,
    sourceIds: e.sourceIds,
    entityIds: e.entityIds,
  };
}
