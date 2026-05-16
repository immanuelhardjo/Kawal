import { z } from 'zod';
import { certaintyLabelSchema } from './common.js';
import { entityDtoSchema, entityTypeSchema } from './entities.js';

export const relationshipTypeSchema = z.enum([
  'employed_by',
  'allegedly_paid',
  'testified_for',
  'prosecuted_by',
  'ruled_on',
  'owned_by',
  'other',
]);
export type RelationshipTypeDto = z.infer<typeof relationshipTypeSchema>;

export const relationshipDtoSchema = z.object({
  id: z.string(),
  fromEntityId: z.string(),
  toEntityId: z.string(),
  type: relationshipTypeSchema,
  certainty: certaintyLabelSchema,
  sourceIds: z.array(z.string()),
  activeFrom: z.string(),
  activeTo: z.string().nullable(),
  description: z.string(),
});
export type RelationshipDto = z.infer<typeof relationshipDtoSchema>;

export const graphFiltersSchema = z
  .object({
    certainties: z.array(certaintyLabelSchema).optional(),
    nodeTypes: z.array(entityTypeSchema).optional(),
  })
  .partial();
export type GraphFiltersDto = z.infer<typeof graphFiltersSchema>;

export const visibleGraphResponseSchema = z.object({
  caseId: z.string(),
  asOfDate: z.string(),
  nodes: z.array(entityDtoSchema),
  edges: z.array(relationshipDtoSchema),
});
export type VisibleGraphResponse = z.infer<typeof visibleGraphResponseSchema>;
