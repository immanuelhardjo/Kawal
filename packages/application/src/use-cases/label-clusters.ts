import { NotFound } from '../errors.js';
import type { ClusterLabel, ClusterLabelPort } from '../ports/ai-ports.js';
import type { CaseRepo } from '../repositories/case-repo.js';

/**
 * Spec: ai-assistance / "Cluster labeling",
 *       relationship-graph / "Cluster detection overlay".
 *
 * The infrastructure adapter handles per-(user, signature) caching; this
 * use case just enforces (user, case) scope and forwards the request.
 */
export interface LabelClustersDeps {
  readonly cases: CaseRepo;
  readonly clusterLabeler: ClusterLabelPort;
}

export class LabelClusters {
  constructor(private readonly deps: LabelClustersDeps) {}

  async execute(input: {
    userId: string;
    caseId: string;
    clusters: readonly { signatureHash: string; memberEntityIds: readonly string[] }[];
  }): Promise<readonly ClusterLabel[]> {
    const ownedCase = await this.deps.cases.findByIdForOwner(input.caseId, input.userId);
    if (!ownedCase) throw new NotFound('Case', input.caseId);
    return this.deps.clusterLabeler.label({
      scope: { userId: input.userId, caseId: input.caseId },
      clusters: input.clusters,
    });
  }
}
