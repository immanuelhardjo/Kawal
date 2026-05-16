import type { MeResponse } from '@kawal/contracts';
import { Router } from 'express';
import type { Composition } from '../composition.js';
import { NotFound } from '@kawal/application';

export function meRoutes(composition: Composition): Router {
  const router = Router();

  router.get('/', async (req, res, next) => {
    try {
      const user = await composition.users.findById(req.user!.id);
      if (!user) throw new NotFound('User', req.user!.id);
      const body: MeResponse = {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        pictureUrl: user.pictureUrl,
      };
      res.json(body);
    } catch (err) {
      next(err);
    }
  });

  router.delete('/', async (req, res, next) => {
    try {
      await composition.deleteAccount.execute({
        userId: req.user!.id,
        ip: req.ip ?? null,
        userAgent: req.get('user-agent') ?? null,
      });
      res.clearCookie(composition.env.SESSION_COOKIE_NAME, { path: '/' });
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  router.get('/export', async (req, res, next) => {
    try {
      const dossier = await composition.exportMyDossier.execute({ userId: req.user!.id });
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="kawal-dossier-export.json"');
      res.json(dossier);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
