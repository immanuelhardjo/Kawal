import { NotFound } from '../errors.js';
import type { AudioBriefing, BriefingPort } from '../ports/ai-ports.js';
import type { CaseRepo } from '../repositories/case-repo.js';
import { withEditorialToneGuard } from './editorial-tone-filter.js';

/**
 * Spec: ai-assistance / "On-demand audio briefings".
 */
export interface GenerateBriefingDeps {
  readonly cases: CaseRepo;
  readonly briefer: BriefingPort;
}

export class GenerateBriefing {
  constructor(private readonly deps: GenerateBriefingDeps) {}

  async execute(input: { userId: string; caseId: string }): Promise<AudioBriefing> {
    const ownedCase = await this.deps.cases.findByIdForOwner(input.caseId, input.userId);
    if (!ownedCase) throw new NotFound('Case', input.caseId);
    return withEditorialToneGuard(
      () => this.deps.briefer.generate({ userId: input.userId, caseId: input.caseId }),
      (out) => out.textBahasa,
      (out, safe) => ({ ...out, textBahasa: safe }),
    );
  }
}
