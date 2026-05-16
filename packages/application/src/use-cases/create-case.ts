import { BahasaText, Case } from '@kawal/domain';
import type { AuditLogRepo } from '../repositories/audit-log-repo.js';
import type { CaseRepo } from '../repositories/case-repo.js';

export interface CreateCaseDeps {
  readonly cases: CaseRepo;
  readonly audit: AuditLogRepo;
  readonly newId: () => string;
  readonly now: () => Date;
}

export interface CreateCaseInput {
  readonly userId: string;
  readonly name: string;
  readonly jurisdiction: string;
  readonly caseType: string;
  readonly aliases?: readonly string[];
  readonly summary?: string;
}

/**
 * Spec: case-management / "Case as the unit of attention, owned by exactly
 * one user", / "Case lifecycle and subscription actions are unrestricted
 * beyond ownership".
 */
export class CreateCase {
  constructor(private readonly deps: CreateCaseDeps) {}

  async execute(input: CreateCaseInput): Promise<Case> {
    const now = this.deps.now();
    const aggregate = Case.create({
      id: this.deps.newId(),
      ownerUserId: input.userId,
      name: input.name,
      jurisdiction: input.jurisdiction,
      caseType: input.caseType,
      aliases: input.aliases,
      summary: input.summary ? BahasaText.of(input.summary) : undefined,
      now,
    });
    await this.deps.cases.save({
      aggregate,
      change: 'created',
      actorUserId: input.userId,
      now,
    });
    await this.deps.audit.append({
      id: this.deps.newId(),
      kind: 'aggregate_created',
      userId: input.userId,
      aggregateType: 'case',
      aggregateId: aggregate.id,
      revisionNo: 1,
      ip: null,
      userAgent: null,
      reason: null,
      at: now,
    });
    return aggregate;
  }
}
