import { NotFound } from '../errors.js';
import type { VerificationOutcome, VerificationPort } from '../ports/ai-ports.js';
import type { CaseRepo } from '../repositories/case-repo.js';
import { withEditorialToneGuard } from './editorial-tone-filter.js';

/**
 * Spec: ai-assistance / "Claim verification ('Inbox Klaim')".
 */
export interface VerifyClaimDeps {
  readonly cases: CaseRepo;
  readonly verifier: VerificationPort;
}

export class VerifyClaim {
  constructor(private readonly deps: VerifyClaimDeps) {}

  async execute(input: {
    userId: string;
    caseId: string;
    text: string;
  }): Promise<VerificationOutcome> {
    const ownedCase = await this.deps.cases.findByIdForOwner(input.caseId, input.userId);
    if (!ownedCase) throw new NotFound('Case', input.caseId);
    return withEditorialToneGuard(
      () =>
        this.deps.verifier.verify({
          scope: { userId: input.userId, caseId: input.caseId },
          claimText: input.text,
        }),
      (out) => out.rationaleBahasa,
      (out, safe) => ({ ...out, rationaleBahasa: safe }),
    );
  }
}
