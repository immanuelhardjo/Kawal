import {
  ingestActivityResponseSchema,
  ingestEventSchema,
  ingestRequestSchema,
  type IngestActivityResponse,
  type IngestEvent,
} from '@kawal/contracts';
import { Router } from 'express';
import type { Composition } from '../composition.js';

/**
 * Spec: osint-ingestion / "Ingestion is request-time and per-user",
 *                       / "Progress streaming during request-time ingest".
 */
export function ingestRoutes(composition: Composition): Router {
  const router = Router();

  router.post('/', async (req, res, next) => {
    try {
      const input = ingestRequestSchema.parse(req.body);

      // SSE headers must be sent before the use case can emit phases.
      res.status(200);
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders?.();

      const writePhase = (event: IngestEvent) => {
        const validated = ingestEventSchema.parse(event);
        res.write(`event: phase\n`);
        res.write(`data: ${JSON.stringify(validated)}\n\n`);
      };

      try {
        await composition.ingestSource.execute({
          userId: req.user!.id,
          caseId: input.caseId,
          url: input.url,
          onPhase: writePhase,
        });
      } catch {
        // The use case already emitted a terminal `failed` or `timeout`
        // phase via the callback before throwing. We close the SSE stream
        // here without bouncing the error to the JSON error handler,
        // which would corrupt the SSE framing.
      }
      res.end();
    } catch (err) {
      if (res.headersSent) res.end();
      else next(err);
    }
  });

  router.get('/activity', async (req, res, next) => {
    try {
      const rows = await composition.ingestActivity.listForOwner(req.user!.id);
      const body: IngestActivityResponse = {
        activity: rows.map((r) => ({
          id: r.id,
          caseId: r.caseId,
          url: r.url,
          publisher: r.publisher,
          phasesReached: [...r.phasesReached],
          status: r.status,
          startedAt: r.startedAt.toISOString(),
          endedAt: r.endedAt?.toISOString() ?? null,
          recordsCreated: r.recordsCreated,
          failureReason: r.failureReason,
        })),
      };
      res.json(ingestActivityResponseSchema.parse(body));
    } catch (err) {
      next(err);
    }
  });

  return router;
}
