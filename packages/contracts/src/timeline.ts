import { z } from 'zod';
import { certaintyLabelSchema } from './common.js';

export const eventTypeSchema = z.enum([
  'hearing',
  'indictment',
  'verdict',
  'asset_seizure',
  'public_statement',
  'other',
]);
export type EventTypeDto = z.infer<typeof eventTypeSchema>;

export const eventDtoSchema = z.object({
  id: z.string(),
  caseId: z.string(),
  type: eventTypeSchema,
  date: z.string(),
  title: z.string(),
  summary: z.string(),
  certainty: certaintyLabelSchema,
  sourceIds: z.array(z.string()),
  entityIds: z.array(z.string()),
});
export type EventDto = z.infer<typeof eventDtoSchema>;

export const timelineFiltersSchema = z
  .object({
    entityIds: z.array(z.string()).optional(),
    certainties: z.array(certaintyLabelSchema).optional(),
    eventTypes: z.array(eventTypeSchema).optional(),
  })
  .partial();
export type TimelineFiltersDto = z.infer<typeof timelineFiltersSchema>;

export const getTimelineResponseSchema = z.object({
  caseId: z.string(),
  events: z.array(eventDtoSchema),
});
export type GetTimelineResponse = z.infer<typeof getTimelineResponseSchema>;
