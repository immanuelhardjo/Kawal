import {
  certaintyLabelSchema,
  entityTypeSchema,
  visibleGraphResponseSchema,
  type EntityDto,
  type RelationshipDto,
  type VisibleGraphResponse,
} from '@kawal/contracts';
import type { Entity, Relationship } from '@kawal/domain';
import { Router } from 'express';
import { z } from 'zod';
import type { Composition } from '../composition.js';

const csv = z
  .string()
  .optional()
  .transform((v) => (v ? v.split(',').filter(Boolean) : undefined));

const querySchema = z.object({
  asOfDate: z.string().datetime().optional(),
  certainties: csv,
  nodeTypes: csv,
});

function toEntityDto(e: Entity): EntityDto {
  return {
    id: e.id,
    type: e.type,
    canonicalName: e.canonicalName,
    aliases: [...e.aliases],
    description: e.description.value,
    publicFigure: e.publicFigure,
    profile: e.profile as unknown as Record<string, unknown>,
  };
}

function toRelationshipDto(r: Relationship): RelationshipDto {
  return {
    id: r.id,
    fromEntityId: r.fromEntityId,
    toEntityId: r.toEntityId,
    type: r.type,
    certainty: r.certainty,
    sourceIds: [...r.sourceIds],
    activeFrom: r.activeFrom.toISOString(),
    activeTo: r.activeTo ? r.activeTo.toISOString() : null,
    description: r.description.value,
  };
}

/**
 * Spec: relationship-graph / "Peta Kasus rendered with React Flow",
 *                          / "As-of-date driven by the linked timeline section".
 */
export function graphRoutes(composition: Composition): Router {
  const router = Router();

  router.get('/:caseId', async (req, res, next) => {
    try {
      const caseId = z.string().min(1).parse(req.params.caseId);
      const parsed = querySchema.parse(req.query);
      const certainties = parsed.certainties
        ? z.array(certaintyLabelSchema).parse(parsed.certainties)
        : undefined;
      const nodeTypes = parsed.nodeTypes
        ? z.array(entityTypeSchema).parse(parsed.nodeTypes)
        : undefined;
      const asOfDate = parsed.asOfDate ? new Date(parsed.asOfDate) : new Date();
      const visible = await composition.getVisibleGraph.execute({
        userId: req.user!.id,
        caseId,
        asOfDate,
        filters: { certainties, nodeTypes },
      });
      const body: VisibleGraphResponse = {
        caseId,
        asOfDate: asOfDate.toISOString(),
        nodes: visible.nodes.map(toEntityDto),
        edges: visible.edges.map(toRelationshipDto),
      };
      res.json(visibleGraphResponseSchema.parse(body));
    } catch (err) {
      next(err);
    }
  });

  return router;
}
