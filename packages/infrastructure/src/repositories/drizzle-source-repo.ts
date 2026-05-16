import type { SourceRepo, SourceRevisionPayload } from '@kawal/application';
import {
  Excerpt,
  Source,
  type ChangeKind,
  type Revision,
  type SourceProps,
  type SourceTier,
} from '@kawal/domain';
import { and, asc, eq, isNull } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { sources, sourcesRevisions } from '../db/schema/pg.js';

export class DrizzleSourceRepo implements SourceRepo {
  constructor(private readonly db: Db) {}

  async findByIdForOwner(id: string, ownerUserId: string): Promise<Source | null> {
    const row = await this.db.query.sources.findFirst({
      where: (s, { and, eq }) => and(eq(s.id, id), eq(s.ownerUserId, ownerUserId)),
    });
    return row ? toSource(row) : null;
  }

  async findByUrlForOwner(url: string, ownerUserId: string): Promise<Source | null> {
    const row = await this.db.query.sources.findFirst({
      where: (s, { and, eq }) => and(eq(s.url, url), eq(s.ownerUserId, ownerUserId)),
    });
    return row ? toSource(row) : null;
  }

  async save(input: {
    aggregate: Source;
    change: ChangeKind;
    actorUserId: string;
    now: Date;
  }): Promise<void> {
    const s = input.aggregate;
    if (s.ownerUserId !== input.actorUserId) {
      throw new Error(
        `actor ${input.actorUserId} cannot save source ${s.id} owned by ${s.ownerUserId}`,
      );
    }
    await this.db.transaction(async (tx) => {
      const existing = await tx.query.sources.findFirst({
        where: (row, { eq }) => eq(row.id, s.id),
      });
      const nextRevisionNo = existing ? existing.currentRevisionNo + 1 : 1;
      const effectiveChange = resolveChangeKind(input.change, existing != null);
      if (existing) {
        await tx
          .update(sourcesRevisions)
          .set({ validTo: input.now })
          .where(and(eq(sourcesRevisions.aggregateId, s.id), isNull(sourcesRevisions.validTo)));
      }
      await tx.insert(sourcesRevisions).values({
        aggregateId: s.id,
        revisionNo: nextRevisionNo,
        validFrom: input.now,
        validTo: null,
        actorUserId: input.actorUserId,
        changeKind: effectiveChange,
        payload: toPayload(s),
      });
      await tx
        .insert(sources)
        .values({
          id: s.id,
          ownerUserId: s.ownerUserId,
          url: s.url,
          publisher: s.publisher,
          tier: s.tier,
          fetchedAt: s.fetchedAt,
          excerpt: s.excerpt.value,
          archiveUrl: s.archiveUrl,
          bodyHash: s.bodyHash,
          currentRevisionNo: nextRevisionNo,
          updatedAt: input.now,
        })
        .onConflictDoUpdate({
          target: sources.id,
          set: {
            fetchedAt: s.fetchedAt,
            excerpt: s.excerpt.value,
            archiveUrl: s.archiveUrl,
            bodyHash: s.bodyHash,
            currentRevisionNo: nextRevisionNo,
            updatedAt: input.now,
          },
        });
    });
  }

  async tombstone(input: { id: string; actorUserId: string; now: Date }): Promise<void> {
    await this.db.transaction(async (tx) => {
      const row = await tx.query.sources.findFirst({
        where: (s, { and, eq }) =>
          and(eq(s.id, input.id), eq(s.ownerUserId, input.actorUserId)),
      });
      if (!row) return;
      await tx
        .update(sourcesRevisions)
        .set({ validTo: input.now })
        .where(
          and(eq(sourcesRevisions.aggregateId, input.id), isNull(sourcesRevisions.validTo)),
        );
      await tx.insert(sourcesRevisions).values({
        aggregateId: input.id,
        revisionNo: row.currentRevisionNo + 1,
        validFrom: input.now,
        validTo: null,
        actorUserId: input.actorUserId,
        changeKind: 'tombstoned',
        payload: { tombstoned: true },
      });
      await tx.delete(sources).where(eq(sources.id, input.id));
    });
  }

  async listRevisionsForOwner(
    id: string,
    ownerUserId: string,
  ): Promise<Revision<SourceRevisionPayload>[]> {
    const liveRow = await this.db.query.sources.findFirst({
      where: (s, { and, eq }) => and(eq(s.id, id), eq(s.ownerUserId, ownerUserId)),
    });
    if (!liveRow) return [];
    const rows = await this.db
      .select()
      .from(sourcesRevisions)
      .where(eq(sourcesRevisions.aggregateId, id))
      .orderBy(asc(sourcesRevisions.revisionNo));
    return rows.map((r) => ({
      aggregateId: r.aggregateId,
      revisionNo: r.revisionNo,
      validFrom: r.validFrom,
      validTo: r.validTo,
      actorUserId: r.actorUserId,
      changeKind: r.changeKind,
      payload: r.payload as SourceRevisionPayload,
    }));
  }
}

function resolveChangeKind(requested: ChangeKind, exists: boolean): ChangeKind {
  if (requested === 'tombstoned') return 'tombstoned';
  return exists ? 'updated' : 'created';
}

function toSource(row: typeof sources.$inferSelect): Source {
  const props: SourceProps = {
    id: row.id,
    ownerUserId: row.ownerUserId,
    url: row.url,
    publisher: row.publisher,
    tier: row.tier as SourceTier,
    fetchedAt: row.fetchedAt,
    excerpt: Excerpt.of(row.excerpt),
    archiveUrl: row.archiveUrl,
    bodyHash: row.bodyHash,
  };
  return Source.restore(props);
}

function toPayload(s: Source): SourceRevisionPayload {
  return {
    url: s.url,
    publisher: s.publisher,
    tier: s.tier,
    fetchedAt: s.fetchedAt.toISOString(),
    excerpt: s.excerpt.value,
    archiveUrl: s.archiveUrl,
    bodyHash: s.bodyHash,
  };
}
