import { NotFound } from '../errors.js';
import type { ConversationAnswer, ConversationPort } from '../ports/ai-ports.js';
import type { ConversationHistoryRepo } from '../ports/conversation-history-port.js';
import type { CaseRepo } from '../repositories/case-repo.js';
import { withEditorialToneGuard } from './editorial-tone-filter.js';

export interface AskQuestionDeps {
  readonly cases: CaseRepo;
  readonly conversation: ConversationPort;
  readonly conversationHistory: ConversationHistoryRepo;
  readonly newId: () => string;
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
    const answer = await withEditorialToneGuard(
      () =>
        this.deps.conversation.ask({
          scope: { userId: input.userId, caseId: input.caseId },
          question: input.question,
        }),
      (out) => out.textBahasa,
      (out, safe) => ({ ...out, textBahasa: safe }),
    );
    await this.deps.conversationHistory.append({
      id: this.deps.newId(),
      userId: input.userId,
      caseId: input.caseId,
      question: input.question,
      answerText: answer.textBahasa,
      citedClaimIds: answer.citedClaimIds,
      citedEventIds: answer.citedEventIds,
      citedSourceIds: answer.citedSourceIds,
      createdAt: new Date(),
    });
    return answer;
  }
}
