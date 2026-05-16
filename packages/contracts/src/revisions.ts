import { z } from 'zod';

export const revisionDtoSchema = z.object({
  revisionNo: z.number().int().positive(),
  validFrom: z.string(),
  validTo: z.string().nullable(),
  actorUserId: z.string(),
  changeKind: z.enum(['created', 'updated', 'tombstoned']),
  payload: z.unknown(),
});
export type RevisionDto = z.infer<typeof revisionDtoSchema>;

export const aggregateTypeSchema = z.enum([
  'case',
  'entity',
  'source',
  'claim',
  'event',
  'relationship',
]);
export type AggregateTypeDto = z.infer<typeof aggregateTypeSchema>;

export const listRevisionsResponseSchema = z.object({
  aggregateType: aggregateTypeSchema,
  aggregateId: z.string(),
  revisions: z.array(revisionDtoSchema),
});
export type ListRevisionsResponse = z.infer<typeof listRevisionsResponseSchema>;
