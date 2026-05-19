export interface ConversationMessage {
  readonly id: string;
  readonly userId: string;
  readonly caseId: string;
  readonly question: string;
  readonly answerText: string;
  readonly citedClaimIds: readonly string[];
  readonly citedEventIds: readonly string[];
  readonly citedSourceIds: readonly string[];
  readonly createdAt: Date;
}

export interface ConversationHistoryRepo {
  append(message: ConversationMessage): Promise<void>;
  getHistory(input: {
    userId: string;
    caseId: string;
    limit: number;
  }): Promise<readonly ConversationMessage[]>;
}
