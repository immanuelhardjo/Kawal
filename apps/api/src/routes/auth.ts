import { Router } from 'express';
import { z } from 'zod';
import type { Composition } from '../composition.js';

const OAUTH_TX_COOKIE = 'kawal_oauth_tx';

const callbackQuerySchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
});

export function authRoutes(composition: Composition): Router {
  const router = Router();

  router.get('/google/start', async (_req, res, next) => {
    try {
      const start = await composition.signInWithGoogle.beginAuthorization();
      // Store state/nonce/codeVerifier in a short-lived HTTP-only cookie so the
      // callback can verify them. This is server-side state from the browser's
      // perspective; nothing here is exposed to JS.
      const txPayload = Buffer.from(
        JSON.stringify({
          state: start.state,
          nonce: start.nonce,
          codeVerifier: start.codeVerifier,
        }),
      ).toString('base64url');
      res.cookie(OAUTH_TX_COOKIE, txPayload, {
        httpOnly: true,
        secure: composition.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 10 * 60 * 1000,
        path: '/',
      });
      res.redirect(302, start.url);
    } catch (err) {
      next(err);
    }
  });

  router.get('/google/callback', async (req, res, next) => {
    try {
      const { code, state } = callbackQuerySchema.parse(req.query);
      const tx = req.cookies?.[OAUTH_TX_COOKIE] as string | undefined;
      if (!tx) {
        res.status(400).json({
          code: 'oauth_state_missing',
          message: 'Missing OAuth transaction cookie',
        });
        return;
      }
      const parsed = JSON.parse(Buffer.from(tx, 'base64url').toString('utf8')) as {
        state: string;
        nonce: string;
        codeVerifier: string;
      };
      const result = await composition.signInWithGoogle.complete({
        code,
        state,
        expectedState: parsed.state,
        expectedNonce: parsed.nonce,
        codeVerifier: parsed.codeVerifier,
        ip: req.ip ?? null,
        userAgent: req.get('user-agent') ?? null,
      });

      res.clearCookie(OAUTH_TX_COOKIE);
      res.cookie(composition.env.SESSION_COOKIE_NAME, result.sessionId, {
        httpOnly: true,
        secure: composition.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: composition.env.SESSION_INACTIVITY_DAYS * 24 * 60 * 60 * 1000,
      });
      res.redirect(302, composition.env.WEB_ORIGIN);
    } catch (err) {
      next(err);
    }
  });

  router.post('/signout', async (req, res, next) => {
    try {
      const sessionId = req.cookies?.[composition.env.SESSION_COOKIE_NAME] as string | undefined;
      if (!sessionId || !req.user) {
        res.status(204).end();
        return;
      }
      await composition.signOut.execute({
        sessionId,
        userId: req.user.id,
        ip: req.ip ?? null,
        userAgent: req.get('user-agent') ?? null,
      });
      res.clearCookie(composition.env.SESSION_COOKIE_NAME, { path: '/' });
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  return router;
}
