import { z } from 'zod';

export const askQuestionResponseSchema = z.object({
  textBahasa: z.string(),
  citedClaimIds: z.array(z.string()),
  citedEventIds: z.array(z.string()),
  citedSourceIds: z.array(z.string()),
});
export type AskQuestionResponse = z.infer<typeof askQuestionResponseSchema>;

export const conversationMessageSchema = z.object({
  id: z.string(),
  userId: z.string(),
  caseId: z.string(),
  question: z.string(),
  answerText: z.string(),
  citedClaimIds: z.array(z.string()),
  citedEventIds: z.array(z.string()),
  citedSourceIds: z.array(z.string()),
  createdAt: z.string(),
});
export type ConversationMessageDto = z.infer<typeof conversationMessageSchema>;

export const conversationHistoryResponseSchema = z.object({
  messages: z.array(conversationMessageSchema),
});
export type ConversationHistoryResponse = z.infer<typeof conversationHistoryResponseSchema>;
