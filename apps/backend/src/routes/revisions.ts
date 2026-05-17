import {
  aggregateTypeSchema,
  listRevisionsResponseSchema,
  type AggregateTypeDto,
  type ListRevisionsResponse,
  type RevisionDto,
} from '@kawal/contracts';
import { Router } from 'express';
import { z } from 'zod';
import type { Composition } from '../composition.js';

interface RevisionRow {
  readonly revisionNo: number;
  readonly validFrom: Date;
  readonly validTo: Date | null;
  readonly actorUserId: string;
  readonly changeKind: 'created' | 'updated' | 'tombstoned';
  readonly payload: unknown;
}

function toDto(r: RevisionRow): RevisionDto {
  return {
    revisionNo: r.revisionNo,
    validFrom: r.validFrom.toISOString(),
    validTo: r.validTo?.toISOString() ?? null,
    actorUserId: r.actorUserId,
    changeKind: r.changeKind,
    payload: r.payload,
  };
}

/**
 * Spec: every dossier capability / "Append-only revision history".
 *
 * One route per aggregate type; the path encodes the aggregate so the
 * client can browse history for any owned record.
 */
export function revisionRoutes(composition: Composition): Router {
  const router = Router();

  const repos = {
    case: composition.cases,
    entity: composition.entities,
    source: composition.sources,
    claim: composition.claims,
    event: composition.events,
    relationship: composition.relationships,
  } as const satisfies Record<
    AggregateTypeDto,
    {
      listRevisionsForOwner(id: string, ownerUserId: string): Promise<RevisionRow[]>;
    }
  >;

  router.get('/:aggregateType/:id', async (req, res, next) => {
    try {
      const aggregateType = aggregateTypeSchema.parse(req.params.aggregateType);
      const id = z.string().min(1).parse(req.params.id);
      const repo = repos[aggregateType];
      const rows = await repo.listRevisionsForOwner(id, req.user!.id);
      const body: ListRevisionsResponse = {
        aggregateType,
        aggregateId: id,
        revisions: rows.map(toDto),
      };
      res.json(listRevisionsResponseSchema.parse(body));
    } catch (err) {
      next(err);
    }
  });

  return router;
}
