import type { CertaintyLabel, Event, EventType } from '@kawal/domain';
import { NotFound } from '../errors.js';
import type { CaseRepo } from '../repositories/case-repo.js';
import type { EventRepo } from '../repositories/dossier-repos.js';

/**
 * Spec: event-timeline / "Timeline filters" — three axes, AND across,
 * OR within.
 */
export interface TimelineFilters {
  readonly entityIds?: readonly string[];
  readonly certainties?: readonly CertaintyLabel[];
  readonly eventTypes?: readonly EventType[];
}

export interface GetTimelineDeps {
  readonly cases: CaseRepo;
  readonly events: EventRepo;
}

export class GetTimeline {
  constructor(private readonly deps: GetTimelineDeps) {}

  async execute(input: {
    userId: string;
    caseId: string;
    filters: TimelineFilters;
  }): Promise<Event[]> {
    const ownedCase = await this.deps.cases.findByIdForOwner(input.caseId, input.userId);
    if (!ownedCase) throw new NotFound('Case', input.caseId);
    const all = await this.deps.events.listForCase(input.caseId, input.userId);
    return all.filter((e) => matchesAllAxes(e, input.filters));
  }
}

function matchesAllAxes(event: Event, filters: TimelineFilters): boolean {
  if (filters.entityIds && filters.entityIds.length > 0) {
    const set = new Set(filters.entityIds);
    if (!event.entityIds.some((id) => set.has(id))) return false;
  }
  if (filters.certainties && filters.certainties.length > 0) {
    if (!filters.certainties.includes(event.certainty)) return false;
  }
  if (filters.eventTypes && filters.eventTypes.length > 0) {
    if (!filters.eventTypes.includes(event.type)) return false;
  }
  return true;
}
