import { z } from 'zod';
import { cadenceSchema, certaintyLabelSchema, lifecycleStateSchema } from './common.js';

export const createCaseRequestSchema = z.object({
  name: z.string().min(1),
  jurisdiction: z.string().min(1),
  caseType: z.string().min(1),
  aliases: z.array(z.string()).optional(),
  summary: z.string().optional(),
});
export type CreateCaseRequest = z.infer<typeof createCaseRequestSchema>;

export const caseDtoSchema = z.object({
  id: z.string(),
  name: z.string(),
  aliases: z.array(z.string()),
  status: lifecycleStateSchema,
  startedAt: z.string(),
  closedAt: z.string().nullable(),
  jurisdiction: z.string(),
  caseType: z.string(),
  summary: z.string(),
});
export type CaseDto = z.infer<typeof caseDtoSchema>;

export const listCasesResponseSchema = z.object({
  cases: z.array(caseDtoSchema),
});
export type ListCasesResponse = z.infer<typeof listCasesResponseSchema>;

export const advanceLifecycleRequestSchema = z.object({
  target: lifecycleStateSchema,
  overrideReason: z.string().min(1).optional(),
});
export type AdvanceLifecycleRequest = z.infer<typeof advanceLifecycleRequestSchema>;

export const subscribeRequestSchema = z.object({
  caseId: z.string(),
  cadence: cadenceSchema,
  alasanSaya: z.string().optional(),
});
export type SubscribeRequest = z.infer<typeof subscribeRequestSchema>;

export const subscriptionDtoSchema = z.object({
  id: z.string(),
  caseId: z.string(),
  cadence: cadenceSchema,
  adoptedAt: z.string(),
  lastViewedAt: z.string().nullable(),
});
export type SubscriptionDto = z.infer<typeof subscriptionDtoSchema>;

export const whatChangedItemSchema = z.object({
  kind: z.literal('event'),
  id: z.string(),
  date: z.string(),
  title: z.string(),
  certainty: certaintyLabelSchema,
  sourceIds: z.array(z.string()),
});
export type WhatChangedItem = z.infer<typeof whatChangedItemSchema>;

export const whatChangedResponseSchema = z.object({
  caseId: z.string(),
  items: z.array(whatChangedItemSchema),
});
export type WhatChangedResponse = z.infer<typeof whatChangedResponseSchema>;
