import { z } from 'zod';

export const ingestPhaseSchema = z.enum([
  'resolving_publisher',
  'queued',
  'fetching',
  'archived',
  'extracting',
  'reconciling',
  'writing',
  'done',
  'failed',
  'timeout',
]);
export type IngestPhaseDto = z.infer<typeof ingestPhaseSchema>;

export const ingestRequestSchema = z.object({
  caseId: z.string().min(1),
  url: z.string().url(),
});
export type IngestRequest = z.infer<typeof ingestRequestSchema>;

export const ingestEventSchema = z.object({
  phase: ingestPhaseSchema,
  reason: z.string().optional(),
  publisher: z.string().optional(),
  recordsCreated: z.number().int().nonnegative().optional(),
});
export type IngestEvent = z.infer<typeof ingestEventSchema>;

export const ingestActivityRecordSchema = z.object({
  id: z.string(),
  caseId: z.string(),
  url: z.string(),
  publisher: z.string().nullable(),
  phasesReached: z.array(z.string()),
  status: z.enum(['in_progress', 'done', 'failed', 'timeout']),
  startedAt: z.string(),
  endedAt: z.string().nullable(),
  recordsCreated: z.number().int().nonnegative(),
  failureReason: z.string().nullable(),
});
export type IngestActivityRecordDto = z.infer<typeof ingestActivityRecordSchema>;

export const ingestActivityResponseSchema = z.object({
  activity: z.array(ingestActivityRecordSchema),
});
export type IngestActivityResponse = z.infer<typeof ingestActivityResponseSchema>;
