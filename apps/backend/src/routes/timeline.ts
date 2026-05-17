import {
  certaintyLabelSchema,
  eventTypeSchema,
  getTimelineResponseSchema,
  type EventDto,
  type GetTimelineResponse,
} from '@kawal/contracts';
import type { Event } from '@kawal/domain';
import { Router } from 'express';
import { z } from 'zod';
import type { Composition } from '../composition.js';

const csv = z
  .string()
  .optional()
  .transform((v) => (v ? v.split(',').filter(Boolean) : undefined));

const querySchema = z.object({
  entityIds: csv,
  certainties: csv,
  eventTypes: csv,
});

function toDto(e: Event): EventDto {
  return {
    id: e.id,
    caseId: e.caseId,
    type: e.type,
    date: e.date.toISOString(),
    title: e.title,
    summary: e.summary.value,
    certainty: e.certainty,
    sourceIds: [...e.sourceIds],
    entityIds: [...e.entityIds],
  };
}

/**
 * Spec: event-timeline / "Timeline filters" + "Garis Waktu rendered as a
 * React Flow timeline".
 */
export function timelineRoutes(composition: Composition): Router {
  const router = Router();

  router.get('/:caseId', async (req, res, next) => {
    try {
      const caseId = z.string().min(1).parse(req.params.caseId);
      const parsed = querySchema.parse(req.query);
      const certainties = parsed.certainties
        ? z.array(certaintyLabelSchema).parse(parsed.certainties)
        : undefined;
      const eventTypes = parsed.eventTypes
        ? z.array(eventTypeSchema).parse(parsed.eventTypes)
        : undefined;
      const events = await composition.getTimeline.execute({
        userId: req.user!.id,
        caseId,
        filters: {
          entityIds: parsed.entityIds,
          certainties,
          eventTypes,
        },
      });
      const body: GetTimelineResponse = {
        caseId,
        events: events.map(toDto),
      };
      res.json(getTimelineResponseSchema.parse(body));
    } catch (err) {
      next(err);
    }
  });

  return router;
}
