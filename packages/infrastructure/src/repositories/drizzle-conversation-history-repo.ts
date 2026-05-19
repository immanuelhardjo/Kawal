import type { ConversationHistoryRepo, ConversationMessage } from '@kawal/application';
import { asc, desc, eq, and } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { conversationMessages } from '../db/schema/pg.js';

export class DrizzleConversationHistoryRepo implements ConversationHistoryRepo {
  constructor(private readonly db: Db) {}

  async append(message: ConversationMessage): Promise<void> {
    await this.db.insert(conversationMessages).values({
      id: message.id,
      userId: message.userId,
      caseId: message.caseId,
      question: message.question,
      answerText: message.answerText,
      citedClaimIds: [...message.citedClaimIds],
      citedEventIds: [...message.citedEventIds],
      citedSourceIds: [...message.citedSourceIds],
      createdAt: message.createdAt,
    });
  }

  async getHistory(input: {
    userId: string;
    caseId: string;
    limit: number;
  }): Promise<readonly ConversationMessage[]> {
    const rows = await this.db.query.conversationMessages.findMany({
      where: (m, { and, eq }) => and(eq(m.userId, input.userId), eq(m.caseId, input.caseId)),
      orderBy: (m, { desc }) => desc(m.createdAt),
      limit: input.limit,
    });
    return rows
      .reverse()
      .map((row) => ({
        id: row.id,
        userId: row.userId,
        caseId: row.caseId,
        question: row.question,
        answerText: row.answerText,
        citedClaimIds: row.citedClaimIds,
        citedEventIds: row.citedEventIds,
        citedSourceIds: row.citedSourceIds,
        createdAt: row.createdAt,
      }));
  }
}
