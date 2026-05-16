import type {
  CertaintyLabel,
  Entity,
  EntityType,
  Relationship,
} from '@kawal/domain';
import { NotFound } from '../errors.js';
import type { CaseRepo } from '../repositories/case-repo.js';
import type {
  EntityRepo,
  RelationshipRepo,
} from '../repositories/dossier-repos.js';

/**
 * Spec: relationship-graph / "As-of-date driven by the linked timeline
 * section", "Certainty filter", "Node-type filter".
 */
export interface GraphFilters {
  readonly certainties?: readonly CertaintyLabel[];
  readonly nodeTypes?: readonly EntityType[];
}

export interface VisibleGraph {
  readonly nodes: readonly Entity[];
  readonly edges: readonly Relationship[];
}

export interface GetVisibleGraphDeps {
  readonly cases: CaseRepo;
  readonly entities: EntityRepo;
  readonly relationships: RelationshipRepo;
}

export class GetVisibleGraph {
  constructor(private readonly deps: GetVisibleGraphDeps) {}

  async execute(input: {
    userId: string;
    caseId: string;
    asOfDate: Date;
    filters: GraphFilters;
  }): Promise<VisibleGraph> {
    const ownedCase = await this.deps.cases.findByIdForOwner(input.caseId, input.userId);
    if (!ownedCase) throw new NotFound('Case', input.caseId);

    const allEdges = await this.deps.relationships.listForCase(input.caseId, input.userId);
    const visibleEdges = allEdges.filter((edge) => {
      if (!edge.isActiveOn(input.asOfDate)) return false;
      if (
        input.filters.certainties &&
        input.filters.certainties.length > 0 &&
        !input.filters.certainties.includes(edge.certainty)
      ) {
        return false;
      }
      return true;
    });

    // Pull only entities touched by visible edges, then apply the node-type
    // filter. Orphaned entities are excluded from the rendered set per spec's
    // hide-band semantics (the UI keeps them faded if needed).
    const touchedIds = new Set<string>();
    for (const edge of visibleEdges) {
      touchedIds.add(edge.fromEntityId);
      touchedIds.add(edge.toEntityId);
    }
    const ownedEntities = await this.deps.entities.listForOwner(input.userId);
    const visibleNodes = ownedEntities.filter((entity) => {
      if (!touchedIds.has(entity.id)) return false;
      if (
        input.filters.nodeTypes &&
        input.filters.nodeTypes.length > 0 &&
        !input.filters.nodeTypes.includes(entity.type)
      ) {
        return false;
      }
      return true;
    });

    return { nodes: visibleNodes, edges: visibleEdges };
  }
}
