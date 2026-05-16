import { NotFound } from '../errors.js';
import type { GlossaryAnswer, GlossaryPort } from '../ports/ai-ports.js';
import type { CaseRepo } from '../repositories/case-repo.js';
import { withEditorialToneGuard } from './editorial-tone-filter.js';

/**
 * Spec: glosarium + ai-assistance / "Glossary explanations".
 *
 * Optional (user, case) scope — without it the explainer is corpus-only
 * (no case-specific examples). When provided, the case ownership is
 * verified before any retrieval happens.
 */
export interface ExplainTermDeps {
  readonly cases: CaseRepo;
  readonly glossary: GlossaryPort;
}

export class ExplainTerm {
  constructor(private readonly deps: ExplainTermDeps) {}

  async execute(input: {
    term: string;
    userId?: string;
    caseId?: string;
  }): Promise<GlossaryAnswer> {
    let scope: { userId: string; caseId: string } | null = null;
    if (input.userId && input.caseId) {
      const ownedCase = await this.deps.cases.findByIdForOwner(input.caseId, input.userId);
      if (!ownedCase) throw new NotFound('Case', input.caseId);
      scope = { userId: input.userId, caseId: input.caseId };
    }
    return withEditorialToneGuard(
      () => this.deps.glossary.explain({ term: input.term, scope }),
      (out) => out.explainerBahasa,
      (out, safe) => ({ ...out, explainerBahasa: safe }),
    );
  }
}
