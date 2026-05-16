import type { SessionStorePort } from '../ports/session-store-port.js';
import type { AuditLogRepo } from '../repositories/audit-log-repo.js';

export interface SignOutDeps {
  readonly sessions: SessionStorePort;
  readonly audit: AuditLogRepo;
  readonly newId: () => string;
  readonly now: () => Date;
}

export class SignOut {
  constructor(private readonly deps: SignOutDeps) {}

  async execute(input: {
    sessionId: string;
    userId: string;
    ip: string | null;
    userAgent: string | null;
  }): Promise<void> {
    await this.deps.sessions.invalidate(input.sessionId);
    await this.deps.audit.append({
      id: this.deps.newId(),
      kind: 'sign_out',
      userId: input.userId,
      aggregateType: null,
      aggregateId: null,
      revisionNo: null,
      ip: input.ip,
      userAgent: input.userAgent,
      reason: null,
      at: this.deps.now(),
    });
  }
}
