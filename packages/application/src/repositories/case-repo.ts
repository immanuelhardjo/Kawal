import type { Case, ChangeKind, Revision } from '@kawal/domain';

export interface CaseRevisionPayload {
  readonly name: string;
  readonly aliases: readonly string[];
  readonly status: string;
  readonly startedAt: string;
  readonly closedAt: string | null;
  readonly jurisdiction: string;
  readonly caseType: string;
  readonly summary: string;
}

export interface CaseRepo {
  /** All reads are owner-scoped. */
  findByIdForOwner(caseId: string, ownerUserId: string): Promise<Case | null>;
  listForOwner(ownerUserId: string): Promise<Case[]>;
  findByAliasForOwner(alias: string, ownerUserId: string): Promise<Case | null>;

  /**
   * Persist the current state of a case and append a revision row in the same
   * transaction. `change` is `created` on first save, `updated` on subsequent.
   * Implementation must set the prior revision's `valid_to = now` if any.
   */
  save(input: {
    aggregate: Case;
    change: ChangeKind;
    actorUserId: string;
    now: Date;
  }): Promise<void>;

  tombstone(input: { caseId: string; actorUserId: string; now: Date }): Promise<void>;

  listRevisionsForOwner(
    caseId: string,
    ownerUserId: string,
  ): Promise<Revision<CaseRevisionPayload>[]>;
}
