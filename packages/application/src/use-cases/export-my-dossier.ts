import type { Case, UserCaseSubscription } from '@kawal/domain';
import type { CaseRepo } from '../repositories/case-repo.js';
import type { SubscriptionRepo } from '../repositories/dossier-repos.js';

/**
 * Spec: user-management / "User-initiated dossier export".
 *
 * Returns a JSON-serialisable shape covering every record owned by the
 * requesting user. The tracer bullet exports cases + subscriptions; future
 * iterations extend to entities/sources/claims/events/relationships +
 * their revision histories.
 */
export interface ExportMyDossierDeps {
  readonly cases: CaseRepo;
  readonly subscriptions: SubscriptionRepo;
}

export interface DossierExport {
  readonly exportedAt: string;
  readonly userId: string;
  readonly cases: ReadonlyArray<{
    readonly id: string;
    readonly name: string;
    readonly aliases: readonly string[];
    readonly status: string;
    readonly jurisdiction: string;
    readonly caseType: string;
    readonly summary: string;
  }>;
  readonly subscriptions: ReadonlyArray<{
    readonly id: string;
    readonly caseId: string;
    readonly cadence: string;
    readonly adoptedAt: string;
    readonly lastViewedAt: string | null;
  }>;
}

export class ExportMyDossier {
  constructor(private readonly deps: ExportMyDossierDeps) {}

  async execute(input: { userId: string }): Promise<DossierExport> {
    const [cases, subscriptions] = await Promise.all([
      this.deps.cases.listForOwner(input.userId),
      this.deps.subscriptions.listForOwner(input.userId),
    ]);
    return {
      exportedAt: new Date().toISOString(),
      userId: input.userId,
      cases: cases.map((c: Case) => ({
        id: c.id,
        name: c.name,
        aliases: [...c.aliases],
        status: c.status,
        jurisdiction: c.jurisdiction,
        caseType: c.caseType,
        summary: c.summary.value,
      })),
      subscriptions: subscriptions.map((s: UserCaseSubscription) => ({
        id: s.id,
        caseId: s.caseId,
        cadence: s.cadence,
        adoptedAt: s.adoptedAt.toISOString(),
        lastViewedAt: s.lastViewedAt?.toISOString() ?? null,
      })),
    };
  }
}
