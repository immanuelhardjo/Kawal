import type { AuditLogRepo } from '../repositories/audit-log-repo.js';
import type { UserRepo } from '../repositories/user-repo.js';

export interface DeleteAccountDeps {
  readonly users: UserRepo;
  readonly audit: AuditLogRepo;
  readonly newId: () => string;
  readonly now: () => Date;
}

/**
 * Spec: user-management / "Account deletion cascades through the user's
 * dossier". The UserRepo.deleteCascade(userId) is implemented in
 * infrastructure as a single transaction that removes every owned row,
 * every revision row, every session, and every audit-log entry for the
 * user.
 *
 * We append a single "account_deleted" audit entry *before* the cascade
 * starts so an external sink (if any) sees the closing event; the cascade
 * then removes the User row and—per spec—any audit rows tied to this user.
 */
export class DeleteAccount {
  constructor(private readonly deps: DeleteAccountDeps) {}

  async execute(input: { userId: string; ip: string | null; userAgent: string | null }): Promise<void> {
    await this.deps.audit.append({
      id: this.deps.newId(),
      kind: 'account_deleted',
      userId: input.userId,
      aggregateType: null,
      aggregateId: null,
      revisionNo: null,
      ip: input.ip,
      userAgent: input.userAgent,
      reason: null,
      at: this.deps.now(),
    });
    await this.deps.users.deleteCascade(input.userId);
  }
}
