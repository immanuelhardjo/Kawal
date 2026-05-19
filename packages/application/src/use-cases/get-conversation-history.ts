import { NotFound } from '../errors.js';
import type { ConversationHistoryRepo, ConversationMessage } from '../ports/conversation-history-port.js';
import type { CaseRepo } from '../repositories/case-repo.js';

export interface GetConversationHistoryDeps {
  readonly cases: CaseRepo;
  readonly conversationHistory: ConversationHistoryRepo;
}

export class GetConversationHistory {
  constructor(private readonly deps: GetConversationHistoryDeps) {}

  async execute(input: {
    userId: string;
    caseId: string;
  }): Promise<readonly ConversationMessage[]> {
    const owned = await this.deps.cases.findByIdForOwner(input.caseId, input.userId);
    if (!owned) throw new NotFound('Case', input.caseId);
    return this.deps.conversationHistory.getHistory({
      userId: input.userId,
      caseId: input.caseId,
      limit: 50,
    });
  }
}
