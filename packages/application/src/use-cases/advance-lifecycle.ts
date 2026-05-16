import type { CaseLifecycleState } from '@kawal/domain';
import { NotFound } from '../errors.js';
import type { AuditLogRepo } from '../repositories/audit-log-repo.js';
import type { CaseRepo } from '../repositories/case-repo.js';

export interface AdvanceLifecycleDeps {
  readonly cases: CaseRepo;
  readonly audit: AuditLogRepo;
  readonly newId: () => string;
  readonly now: () => Date;
}

export interface AdvanceLifecycleInput {
  readonly userId: string;
  readonly caseId: string;
  readonly target: CaseLifecycleState;
  readonly overrideReason?: string;
}

export class AdvanceLifecycle {
  constructor(private readonly deps: AdvanceLifecycleDeps) {}

  async execute(input: AdvanceLifecycleInput) {
    const current = await this.deps.cases.findByIdForOwner(input.caseId, input.userId);
    if (!current) throw new NotFound('Case', input.caseId);
    const advanced = input.overrideReason
      ? current.overrideTransition(input.target, input.overrideReason)
      : current.advance(input.target);
    const now = this.deps.now();
    await this.deps.cases.save({
      aggregate: advanced,
      change: 'updated',
      actorUserId: input.userId,
      now,
    });
    await this.deps.audit.append({
      id: this.deps.newId(),
      kind: 'aggregate_updated',
      userId: input.userId,
      aggregateType: 'case',
      aggregateId: advanced.id,
      revisionNo: null,
      ip: null,
      userAgent: null,
      reason: input.overrideReason ?? null,
      at: now,
    });
    return advanced;
  }
}
