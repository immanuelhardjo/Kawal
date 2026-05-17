import type { NextFunction, Request, Response } from 'express';
import type { Composition } from '../composition.js';

declare global {
  namespace Express {
    interface Request {
      user?: { id: string };
      sessionId?: string;
    }
  }
}

/**
 * Spec: user-management / "Session lookup on protected request".
 *
 * Reads the session-id cookie, hydrates `req.user` if valid, refreshes
 * lastSeenAt, expires on inactivity. Does NOT enforce auth — that's the
 * job of requireAuth, applied after this middleware on protected routes.
 */
export function sessionMiddleware(composition: Composition) {
  const inactivityMs = composition.env.SESSION_INACTIVITY_DAYS * 24 * 60 * 60 * 1000;
  const cookieName = composition.env.SESSION_COOKIE_NAME;
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const sessionId = (req.cookies?.[cookieName] as string | undefined) ?? null;
      if (!sessionId) return next();
      const ctx = await composition.sessions.hydrate({
        sessionId,
        now: new Date(),
        inactivityMs,
      });
      if (!ctx) return next();
      req.user = { id: ctx.userId };
      req.sessionId = ctx.sessionId;
      return next();
    } catch (err) {
      return next(err);
    }
  };
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({ code: 'unauthenticated', message: 'Sign in required' });
    return;
  }
  next();
}
