import { z } from 'zod';

export const entityTypeSchema = z.enum(['person', 'institution', 'company', 'document']);
export type EntityTypeDto = z.infer<typeof entityTypeSchema>;

export const entityDtoSchema = z.object({
  id: z.string(),
  type: entityTypeSchema,
  canonicalName: z.string(),
  aliases: z.array(z.string()),
  description: z.string(),
  publicFigure: z.boolean(),
  profile: z.record(z.unknown()),
});
export type EntityDto = z.infer<typeof entityDtoSchema>;

export const listEntitiesResponseSchema = z.object({
  entities: z.array(entityDtoSchema),
});
export type ListEntitiesResponse = z.infer<typeof listEntitiesResponseSchema>;
