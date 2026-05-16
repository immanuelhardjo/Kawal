import type {
  IngestActivityRecord,
  IngestActivityRepo,
  IngestStatus,
} from '@kawal/application';
import { eq } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { ingestActivity } from '../db/schema/pg.js';

export class DrizzleIngestActivityRepo implements IngestActivityRepo {
  constructor(private readonly db: Db) {}

  async start(input: {
    id: string;
    ownerUserId: string;
    caseId: string;
    url: string;
    now: Date;
  }): Promise<IngestActivityRecord> {
    await this.db.insert(ingestActivity).values({
      id: input.id,
      ownerUserId: input.ownerUserId,
      caseId: input.caseId,
      url: input.url,
      publisher: null,
      phasesReached: [],
      status: 'in_progress',
      startedAt: input.now,
      endedAt: null,
      recordsCreated: 0,
      failureReason: null,
    });
    return {
      id: input.id,
      ownerUserId: input.ownerUserId,
      caseId: input.caseId,
      url: input.url,
      publisher: null,
      phasesReached: [],
      status: 'in_progress',
      startedAt: input.now,
      endedAt: null,
      recordsCreated: 0,
      failureReason: null,
    };
  }

  async appendPhase(id: string, phase: string): Promise<void> {
    const row = await this.db.query.ingestActivity.findFirst({
      where: (a, { eq }) => eq(a.id, id),
    });
    if (!row) return;
    const phases = [...row.phasesReached, phase];
    await this.db
      .update(ingestActivity)
      .set({ phasesReached: phases })
      .where(eq(ingestActivity.id, id));
  }

  async setPublisher(id: string, publisher: string): Promise<void> {
    await this.db.update(ingestActivity).set({ publisher }).where(eq(ingestActivity.id, id));
  }

  async complete(input: {
    id: string;
    status: IngestStatus;
    now: Date;
    recordsCreated: number;
    failureReason?: string | null;
  }): Promise<void> {
    await this.db
      .update(ingestActivity)
      .set({
        status: input.status,
        endedAt: input.now,
        recordsCreated: input.recordsCreated,
        failureReason: input.failureReason ?? null,
      })
      .where(eq(ingestActivity.id, input.id));
  }

  async listForOwner(ownerUserId: string): Promise<IngestActivityRecord[]> {
    const rows = await this.db.query.ingestActivity.findMany({
      where: (a, { eq }) => eq(a.ownerUserId, ownerUserId),
      orderBy: (a, { desc }) => desc(a.startedAt),
    });
    return rows.map((row) => ({
      id: row.id,
      ownerUserId: row.ownerUserId,
      caseId: row.caseId,
      url: row.url,
      publisher: row.publisher,
      phasesReached: row.phasesReached,
      status: row.status as IngestStatus,
      startedAt: row.startedAt,
      endedAt: row.endedAt,
      recordsCreated: row.recordsCreated,
      failureReason: row.failureReason,
    }));
  }
}
