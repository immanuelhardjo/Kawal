export type AuditEventKind =
  | 'sign_in_success'
  | 'sign_in_failure'
  | 'sign_out'
  | 'account_deleted'
  | 'dossier_export'
  | 'aggregate_created'
  | 'aggregate_updated'
  | 'aggregate_tombstoned';

export interface AuditEntry {
  readonly id: string;
  readonly kind: AuditEventKind;
  readonly userId: string | null;
  readonly aggregateType: string | null;
  readonly aggregateId: string | null;
  readonly revisionNo: number | null;
  readonly ip: string | null;
  readonly userAgent: string | null;
  readonly reason: string | null;
  readonly at: Date;
}

export interface AuditLogRepo {
  append(entry: AuditEntry): Promise<void>;
  deleteByUserId(userId: string): Promise<void>;
}
