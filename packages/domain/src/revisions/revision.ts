import { InvariantViolation } from '../errors.js';

/**
 * Spec: every dossier capability / "Append-only revision history".
 * Design D2 — per-aggregate `<aggregate>_revisions` tables.
 */
export const CHANGE_KINDS = ['created', 'updated', 'tombstoned'] as const;
export type ChangeKind = (typeof CHANGE_KINDS)[number];

export interface Revision<TPayload> {
  readonly aggregateId: string;
  readonly revisionNo: number;
  readonly validFrom: Date;
  readonly validTo: Date | null;
  readonly actorUserId: string;
  readonly changeKind: ChangeKind;
  readonly payload: TPayload;
}

export function newRevision<TPayload>(input: {
  aggregateId: string;
  revisionNo: number;
  validFrom: Date;
  actorUserId: string;
  changeKind: ChangeKind;
  payload: TPayload;
}): Revision<TPayload> {
  if (!Number.isInteger(input.revisionNo) || input.revisionNo < 1) {
    throw new InvariantViolation('revisionNo must be a positive integer', input);
  }
  if (!input.aggregateId) {
    throw new InvariantViolation('Revision requires an aggregateId');
  }
  if (!input.actorUserId) {
    throw new InvariantViolation('Revision requires an actorUserId');
  }
  return {
    aggregateId: input.aggregateId,
    revisionNo: input.revisionNo,
    validFrom: input.validFrom,
    validTo: null,
    actorUserId: input.actorUserId,
    changeKind: input.changeKind,
    payload: input.payload,
  };
}
