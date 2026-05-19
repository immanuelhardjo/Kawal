import { z } from 'zod';

export const sourceDtoSchema = z.object({
  id: z.string(),
  url: z.string(),
  publisher: z.string(),
  tier: z.enum(['tier_1', 'tier_2', 'tier_3']),
  fetchedAt: z.string(),
  excerpt: z.string(),
  archiveUrl: z.string().nullable(),
});
export type SourceDto = z.infer<typeof sourceDtoSchema>;

export const listSourcesResponseSchema = z.object({
  sources: z.array(sourceDtoSchema),
});
export type ListSourcesResponse = z.infer<typeof listSourcesResponseSchema>;
