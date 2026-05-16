export type IngestStatus = 'in_progress' | 'done' | 'failed' | 'timeout';

export interface IngestActivityRecord {
  readonly id: string;
  readonly ownerUserId: string;
  readonly caseId: string;
  readonly url: string;
  readonly publisher: string | null;
  readonly phasesReached: readonly string[];
  readonly status: IngestStatus;
  readonly startedAt: Date;
  readonly endedAt: Date | null;
  readonly recordsCreated: number;
  readonly failureReason: string | null;
}

export interface IngestActivityRepo {
  start(input: {
    id: string;
    ownerUserId: string;
    caseId: string;
    url: string;
    now: Date;
  }): Promise<IngestActivityRecord>;
  appendPhase(id: string, phase: string): Promise<void>;
  setPublisher(id: string, publisher: string): Promise<void>;
  complete(input: {
    id: string;
    status: IngestStatus;
    now: Date;
    recordsCreated: number;
    failureReason?: string | null;
  }): Promise<void>;
  listForOwner(ownerUserId: string): Promise<IngestActivityRecord[]>;
}
