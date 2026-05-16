import type { Event } from '@kawal/domain';
import type { CaseRepo } from '../repositories/case-repo.js';
import type { EventRepo, SubscriptionRepo } from '../repositories/dossier-repos.js';
import { NotFound } from '../errors.js';

export interface WhatChangedItem {
  readonly kind: 'event';
  readonly event: Event;
}

export interface ComputeWhatChangedDeps {
  readonly cases: CaseRepo;
  readonly subscriptions: SubscriptionRepo;
  readonly events: EventRepo;
}

/**
 * Spec: case-management / "What changed diff per case".
 * Returns events created/updated after the subscription's lastViewedAt.
 * (Wider aggregate coverage is a follow-up; events are the minimum surface
 *  needed for Beranda's "apa yang berubah" list.)
 */
export class ComputeWhatChanged {
  constructor(private readonly deps: ComputeWhatChangedDeps) {}

  async execute(input: { userId: string; caseId: string }): Promise<WhatChangedItem[]> {
    const c = await this.deps.cases.findByIdForOwner(input.caseId, input.userId);
    if (!c) throw new NotFound('Case', input.caseId);
    const subscription = await this.deps.subscriptions.findForOwnerAndCase(input.userId, input.caseId);
    const cutoff = subscription?.lastViewedAt ?? new Date(0);
    const all = await this.deps.events.listForCase(input.caseId, input.userId);
    return all.filter((e) => e.date.getTime() > cutoff.getTime()).map((event) => ({ kind: 'event' as const, event }));
  }
}
