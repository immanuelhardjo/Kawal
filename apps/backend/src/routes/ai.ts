import { Router } from 'express';
import { z } from 'zod';
import type { Composition } from '../composition.js';

/**
 * Spec: ai-assistance + 5.12 — every endpoint requires `case_id` (and where
 * applicable `entity_id`) at the schema level so an unscoped call is
 * impossible.
 *
 * Use cases live in @kawal/application and enforce ownership of the case;
 * cross-user invocations are rejected with NotFound.
 */
export function aiRoutes(composition: Composition): Router {
  const router = Router();

  const askBody = z.object({
    caseId: z.string().min(1),
    question: z.string().min(1),
  });
  router.post('/ask', async (req, res, next) => {
    try {
      const input = askBody.parse(req.body);
      const answer = await composition.askQuestion.execute({
        userId: req.user!.id,
        caseId: input.caseId,
        question: input.question,
      });
      res.json(answer);
    } catch (err) {
      next(err);
    }
  });

  const verifyBody = z.object({
    caseId: z.string().min(1),
    text: z.string().min(1),
  });
  router.post('/verify-claim', async (req, res, next) => {
    try {
      const input = verifyBody.parse(req.body);
      const outcome = await composition.verifyClaim.execute({
        userId: req.user!.id,
        caseId: input.caseId,
        text: input.text,
      });
      res.json(outcome);
    } catch (err) {
      next(err);
    }
  });

  const explainBody = z.object({
    term: z.string().min(1),
    caseId: z.string().min(1).optional(),
  });
  router.post('/explain-term', async (req, res, next) => {
    try {
      const input = explainBody.parse(req.body);
      const answer = await composition.explainTerm.execute({
        term: input.term,
        userId: req.user!.id,
        caseId: input.caseId,
      });
      res.json(answer);
    } catch (err) {
      next(err);
    }
  });

  const scenariosBody = z.object({ caseId: z.string().min(1) });
  router.post('/generate-scenarios', async (req, res, next) => {
    try {
      const input = scenariosBody.parse(req.body);
      const scenarios = await composition.generateScenarios.execute({
        userId: req.user!.id,
        caseId: input.caseId,
      });
      res.json({ scenarios });
    } catch (err) {
      next(err);
    }
  });

  const briefingBody = z.object({ caseId: z.string().min(1) });
  router.post('/generate-briefing', async (req, res, next) => {
    try {
      const input = briefingBody.parse(req.body);
      const briefing = await composition.generateBriefing.execute({
        userId: req.user!.id,
        caseId: input.caseId,
      });
      res.json(briefing);
    } catch (err) {
      next(err);
    }
  });

  const cardBody = z.object({
    caseId: z.string().min(1),
    snippetText: z.string().min(1),
  });
  router.post('/generate-card', async (req, res, next) => {
    try {
      const input = cardBody.parse(req.body);
      // Card port delegates straight through; ownership is verified by the
      // case lookup below.
      const owned = await composition.cases.findByIdForOwner(input.caseId, req.user!.id);
      if (!owned) {
        res.status(404).json({ code: 'not_found', message: `Case ${input.caseId} not found` });
        return;
      }
      const card = await composition.cards.generate({
        scope: { userId: req.user!.id, caseId: input.caseId },
        snippetText: input.snippetText,
      });
      res.json(card);
    } catch (err) {
      next(err);
    }
  });

  const clusterBody = z.object({
    caseId: z.string().min(1),
    clusters: z
      .array(
        z.object({
          signatureHash: z.string().min(1),
          memberEntityIds: z.array(z.string()).min(1),
        }),
      )
      .min(1),
  });
  router.post('/label-clusters', async (req, res, next) => {
    try {
      const input = clusterBody.parse(req.body);
      const labels = await composition.labelClusters.execute({
        userId: req.user!.id,
        caseId: input.caseId,
        clusters: input.clusters,
      });
      res.json({ labels });
    } catch (err) {
      next(err);
    }
  });

  router.post('/scan-glossary-backlog', async (req, res, next) => {
    try {
      const entries = await composition.scanGlossaryBacklog.execute({ userId: req.user!.id });
      res.json({ entries });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
