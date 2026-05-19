import { NotFound, type CaseRevisionPayload } from '@kawal/application';
import {
  advanceLifecycleRequestSchema,
  caseDtoSchema,
  createCaseRequestSchema,
  listCasesResponseSchema,
  subscribeRequestSchema,
  whatChangedResponseSchema,
  type CaseDto,
  type ListCasesResponse,
  type WhatChangedResponse,
} from '@kawal/contracts';
import type { Case, Revision } from '@kawal/domain';
import { Router } from 'express';
import { z } from 'zod';
import type { Composition } from '../composition.js';

function toDto(c: Case): CaseDto {
  const dto: CaseDto = {
    id: c.id,
    name: c.name,
    aliases: [...c.aliases],
    status: c.status,
    startedAt: c.startedAt.toISOString(),
    closedAt: c.closedAt?.toISOString() ?? null,
    jurisdiction: c.jurisdiction,
    caseType: c.caseType,
    summary: c.summary.value,
  };
  return caseDtoSchema.parse(dto);
}

export function caseRoutes(composition: Composition): Router {
  const router = Router();

  router.get('/', async (req, res, next) => {
    try {
      const cases = await composition.cases.listForOwner(req.user!.id);
      const body: ListCasesResponse = { cases: cases.map(toDto) };
      res.json(listCasesResponseSchema.parse(body));
    } catch (err) {
      next(err);
    }
  });

  router.post('/', async (req, res, next) => {
    try {
      const input = createCaseRequestSchema.parse(req.body);
      const created = await composition.createCase.execute({
        userId: req.user!.id,
        name: input.name,
        jurisdiction: input.jurisdiction,
        caseType: input.caseType,
        aliases: input.aliases,
        summary: input.summary,
      });
      res.status(201).json(toDto(created));
    } catch (err) {
      next(err);
    }
  });

  router.get('/:caseId', async (req, res, next) => {
    try {
      const caseId = z.string().min(1).parse(req.params.caseId);
      const c = await composition.cases.findByIdForOwner(caseId, req.user!.id);
      if (!c) throw new NotFound('Case', caseId);
      res.json(toDto(c));
    } catch (err) {
      next(err);
    }
  });

  router.post('/:caseId/advance', async (req, res, next) => {
    try {
      const caseId = z.string().min(1).parse(req.params.caseId);
      const input = advanceLifecycleRequestSchema.parse(req.body);
      const advanced = await composition.advanceLifecycle.execute({
        userId: req.user!.id,
        caseId,
        target: input.target,
        overrideReason: input.overrideReason,
      });
      res.json(toDto(advanced));
    } catch (err) {
      next(err);
    }
  });

  router.post('/subscribe', async (req, res, next) => {
    try {
      const input = subscribeRequestSchema.parse(req.body);
      const sub = await composition.subscribeToCase.execute({
        userId: req.user!.id,
        caseId: input.caseId,
        cadence: input.cadence,
        alasanSaya: input.alasanSaya ?? null,
      });
      res.status(201).json({
        id: sub.id,
        caseId: sub.caseId,
        cadence: sub.cadence,
        adoptedAt: sub.adoptedAt.toISOString(),
        lastViewedAt: sub.lastViewedAt?.toISOString() ?? null,
      });
    } catch (err) {
      next(err);
    }
  });

  router.get('/:caseId/what-changed', async (req, res, next) => {
    try {
      const caseId = z.string().min(1).parse(req.params.caseId);
      const items = await composition.computeWhatChanged.execute({
        userId: req.user!.id,
        caseId,
      });
      const body: WhatChangedResponse = {
        caseId,
        items: items.map((item) => ({
          kind: 'event' as const,
          id: item.event.id,
          date: item.event.date.toISOString(),
          title: item.event.title,
          certainty: item.event.certainty,
          sourceIds: [...item.event.sourceIds],
        })),
      };
      res.json(whatChangedResponseSchema.parse(body));
    } catch (err) {
      next(err);
    }
  });

  router.get('/:caseId/revisions', async (req, res, next) => {
    try {
      const caseId = z.string().min(1).parse(req.params.caseId);
      const revisions = await composition.cases.listRevisionsForOwner(caseId, req.user!.id);
      res.json({
        caseId,
        revisions: revisions.map((r: Revision<CaseRevisionPayload>) => ({
          revisionNo: r.revisionNo,
          validFrom: r.validFrom.toISOString(),
          validTo: r.validTo?.toISOString() ?? null,
          actorUserId: r.actorUserId,
          changeKind: r.changeKind,
          payload: r.payload,
        })),
      });
    } catch (err) {
      next(err);
    }
  });

  router.get('/:caseId/sources', async (req, res, next) => {
    try {
      const caseId = z.string().min(1).parse(req.params.caseId);
      const userId = req.user!.id;
      const owned = await composition.cases.findByIdForOwner(caseId, userId);
      if (!owned) { res.status(404).json({ code: 'not_found', message: `Case ${caseId} not found` }); return; }
      const [evts, rels] = await Promise.all([
        composition.events.listForCase(caseId, userId),
        composition.relationships.listForCase(caseId, userId),
      ]);
      const ids = [...new Set([...evts.flatMap((e) => [...e.sourceIds]), ...rels.flatMap((r) => [...r.sourceIds])])];
      const srcs = await composition.sources.listByIdsForOwner(ids, userId);
      res.json({
        sources: srcs.map((s) => ({
          id: s.id,
          url: s.url,
          publisher: s.publisher,
          tier: s.tier,
          fetchedAt: s.fetchedAt.toISOString(),
          excerpt: s.excerpt.value,
          archiveUrl: s.archiveUrl,
        })),
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
