import { BahasaText, Case, type CaseProps, type ChangeKind, type Revision } from '@kawal/domain';
import type { CaseRepo, CaseRevisionPayload } from '@kawal/application';
import { and, asc, eq, isNull } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { cases, casesRevisions } from '../db/schema/pg.js';

export class DrizzleCaseRepo implements CaseRepo {
  constructor(private readonly db: Db) {}

  async findByIdForOwner(caseId: string, ownerUserId: string): Promise<Case | null> {
    const row = await this.db.query.cases.findFirst({
      where: (c, { and, eq }) => and(eq(c.id, caseId), eq(c.ownerUserId, ownerUserId)),
    });
    return row ? toCase(row) : null;
  }

  async listForOwner(ownerUserId: string): Promise<Case[]> {
    const rows = await this.db.query.cases.findMany({
      where: (c, { eq }) => eq(c.ownerUserId, ownerUserId),
      orderBy: (c, { desc }) => desc(c.updatedAt),
    });
    return rows.map(toCase);
  }

  async findByAliasForOwner(alias: string, ownerUserId: string): Promise<Case | null> {
    const all = await this.listForOwner(ownerUserId);
    return all.find((c) => c.name === alias || c.aliases.includes(alias)) ?? null;
  }

  async save(input: {
    aggregate: Case;
    change: ChangeKind;
    actorUserId: string;
    now: Date;
  }): Promise<void> {
    const c = input.aggregate;
    if (c.ownerUserId !== input.actorUserId) {
      throw new Error(
        `actor ${input.actorUserId} cannot save case ${c.id} owned by ${c.ownerUserId}`,
      );
    }
    await this.db.transaction(async (tx) => {
      const existing = await tx.query.cases.findFirst({
        where: (row, { eq }) => eq(row.id, c.id),
      });
      const nextRevisionNo = existing ? existing.currentRevisionNo + 1 : 1;
      const change: ChangeKind = existing ? 'updated' : 'created';
      const effectiveChange = input.change === 'tombstoned' ? 'tombstoned' : change;

      // Close prior revision window
      if (existing) {
        await tx
          .update(casesRevisions)
          .set({ validTo: input.now })
          .where(and(eq(casesRevisions.aggregateId, c.id), isNull(casesRevisions.validTo)));
      }

      // Insert new revision row
      await tx.insert(casesRevisions).values({
        aggregateId: c.id,
        revisionNo: nextRevisionNo,
        validFrom: input.now,
        validTo: null,
        actorUserId: input.actorUserId,
        changeKind: effectiveChange,
        payload: toPayload(c),
      });

      // Upsert current row
      await tx
        .insert(cases)
        .values({
          id: c.id,
          ownerUserId: c.ownerUserId,
          name: c.name,
          aliases: [...c.aliases],
          status: c.status,
          startedAt: c.startedAt,
          closedAt: c.closedAt,
          jurisdiction: c.jurisdiction,
          caseType: c.caseType,
          summary: c.summary.value,
          currentRevisionNo: nextRevisionNo,
          updatedAt: input.now,
        })
        .onConflictDoUpdate({
          target: cases.id,
          set: {
            name: c.name,
            aliases: [...c.aliases],
            status: c.status,
            closedAt: c.closedAt,
            summary: c.summary.value,
            currentRevisionNo: nextRevisionNo,
            updatedAt: input.now,
          },
        });
    });
  }

  async tombstone(input: { caseId: string; actorUserId: string; now: Date }): Promise<void> {
    await this.db.transaction(async (tx) => {
      const row = await tx.query.cases.findFirst({
        where: (c, { and, eq }) =>
          and(eq(c.id, input.caseId), eq(c.ownerUserId, input.actorUserId)),
      });
      if (!row) return;
      await tx
        .update(casesRevisions)
        .set({ validTo: input.now })
        .where(and(eq(casesRevisions.aggregateId, input.caseId), isNull(casesRevisions.validTo)));
      await tx.insert(casesRevisions).values({
        aggregateId: input.caseId,
        revisionNo: row.currentRevisionNo + 1,
        validFrom: input.now,
        validTo: null,
        actorUserId: input.actorUserId,
        changeKind: 'tombstoned',
        payload: { tombstoned: true },
      });
      await tx.delete(cases).where(eq(cases.id, input.caseId));
    });
  }

  async listRevisionsForOwner(
    caseId: string,
    ownerUserId: string,
  ): Promise<Revision<CaseRevisionPayload>[]> {
    // Owner-scope check: the case row must (have once been) owned by this user.
    // Since revisions live in their own table and the live row may be tombstoned,
    // we filter via the actor or via a join on the cases table.
    const liveRow = await this.db.query.cases.findFirst({
      where: (c, { and, eq }) => and(eq(c.id, caseId), eq(c.ownerUserId, ownerUserId)),
    });
    if (!liveRow) return []; // either not owned by user or already removed
    const rows = await this.db
      .select()
      .from(casesRevisions)
      .where(eq(casesRevisions.aggregateId, caseId))
      .orderBy(asc(casesRevisions.revisionNo));
    return rows.map((r) => ({
      aggregateId: r.aggregateId,
      revisionNo: r.revisionNo,
      validFrom: r.validFrom,
      validTo: r.validTo,
      actorUserId: r.actorUserId,
      changeKind: r.changeKind,
      payload: r.payload as CaseRevisionPayload,
    }));
  }
}

function toCase(row: typeof cases.$inferSelect): Case {
  const props: CaseProps = {
    id: row.id,
    ownerUserId: row.ownerUserId,
    name: row.name,
    aliases: row.aliases,
    status: row.status,
    startedAt: row.startedAt,
    closedAt: row.closedAt,
    jurisdiction: row.jurisdiction,
    caseType: row.caseType,
    summary: BahasaText.of(row.summary),
  };
  return Case.restore(props);
}

function toPayload(c: Case): CaseRevisionPayload {
  return {
    name: c.name,
    aliases: c.aliases,
    status: c.status,
    startedAt: c.startedAt.toISOString(),
    closedAt: c.closedAt ? c.closedAt.toISOString() : null,
    jurisdiction: c.jurisdiction,
    caseType: c.caseType,
    summary: c.summary.value,
  };
}
