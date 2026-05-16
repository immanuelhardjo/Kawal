import { UserCaseSubscription, type SubscriptionCadence } from '@kawal/domain';
import { NotFound } from '../errors.js';
import type { CaseRepo } from '../repositories/case-repo.js';
import type { SubscriptionRepo } from '../repositories/dossier-repos.js';

export interface SubscribeToCaseDeps {
  readonly cases: CaseRepo;
  readonly subscriptions: SubscriptionRepo;
  readonly newId: () => string;
  readonly now: () => Date;
}

export class SubscribeToCase {
  constructor(private readonly deps: SubscribeToCaseDeps) {}

  async execute(input: {
    userId: string;
    caseId: string;
    cadence: SubscriptionCadence;
    alasanSaya?: string | null;
  }): Promise<UserCaseSubscription> {
    const c = await this.deps.cases.findByIdForOwner(input.caseId, input.userId);
    if (!c) throw new NotFound('Case', input.caseId);
    const existing = await this.deps.subscriptions.findForOwnerAndCase(input.userId, input.caseId);
    if (existing) return existing;
    const sub = UserCaseSubscription.create({
      id: this.deps.newId(),
      ownerUserId: input.userId,
      caseId: input.caseId,
      cadence: input.cadence,
      alasanSaya: input.alasanSaya ?? null,
      now: this.deps.now(),
    });
    await this.deps.subscriptions.save(sub);
    return sub;
  }
}
