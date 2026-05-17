import { NotFound } from '@kawal/application';
import {
  entityDtoSchema,
  listEntitiesResponseSchema,
  type EntityDto,
  type ListEntitiesResponse,
} from '@kawal/contracts';
import type { Entity } from '@kawal/domain';
import { Router } from 'express';
import { z } from 'zod';
import type { Composition } from '../composition.js';

function toDto(e: Entity): EntityDto {
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

/**
 * Spec: entity-dossier / "Entity types and canonical identity, scoped to
 * one owner" + per-type profile fields. The detailed Profil rendering
 * lives in the web app; this endpoint hands the entity record over.
 */
export function entityRoutes(composition: Composition): Router {
  const router = Router();

  router.get('/', async (req, res, next) => {
    try {
      const caseId = z.string().min(1).optional().parse(req.query.caseId);
      const list = await composition.entities.listForOwner(req.user!.id, caseId);
      const body: ListEntitiesResponse = { entities: list.map(toDto) };
      res.json(listEntitiesResponseSchema.parse(body));
    } catch (err) {
      next(err);
    }
  });

  router.get('/:entityId', async (req, res, next) => {
    try {
      const entityId = z.string().min(1).parse(req.params.entityId);
      const entity = await composition.entities.findByIdForOwner(entityId, req.user!.id);
      if (!entity) throw new NotFound('Entity', entityId);
      res.json(entityDtoSchema.parse(toDto(entity)));
    } catch (err) {
      next(err);
    }
  });

  return router;
}
