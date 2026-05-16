import { z } from 'zod';

export const certaintyLabelSchema = z.enum([
  'established',
  'alleged',
  'reported',
  'disputed',
  'unverified',
]);
export type CertaintyLabel = z.infer<typeof certaintyLabelSchema>;

export const lifecycleStateSchema = z.enum([
  'open',
  'trial',
  'verdict',
  'appeal',
  'inkracht',
  'closed',
]);
export type LifecycleState = z.infer<typeof lifecycleStateSchema>;

export const cadenceSchema = z.enum(['daily', 'weekly', 'on_change', 'manual']);
export type Cadence = z.infer<typeof cadenceSchema>;

export const apiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.unknown()).optional(),
});
export type ApiError = z.infer<typeof apiErrorSchema>;
