import { NotFound } from '../errors.js';
import type { ConversationAnswer, ConversationPort } from '../ports/ai-ports.js';
import type { CaseRepo } from '../repositories/case-repo.js';
import { withEditorialToneGuard } from './editorial-tone-filter.js';

/**
 * Spec: ai-assistance / "Conversational Q&A ('Tanya Apa Saja')".
 */
export interface AskQuestionDeps {
  readonly cases: CaseRepo;
  readonly conversation: ConversationPort;
}

export class AskQuestion {
  constructor(private readonly deps: AskQuestionDeps) {}

  async execute(input: {
    userId: string;
    caseId: string;
    question: string;
  }): Promise<ConversationAnswer> {
    const ownedCase = await this.deps.cases.findByIdForOwner(input.caseId, input.userId);
    if (!ownedCase) throw new NotFound('Case', input.caseId);
    return withEditorialToneGuard(
      () =>
        this.deps.conversation.ask({
          scope: { userId: input.userId, caseId: input.caseId },
          question: input.question,
        }),
      (out) => out.textBahasa,
      (out, safe) => ({ ...out, textBahasa: safe }),
    );
  }
}
