import type { NextFunction, Request, Response } from 'express';
import type { Composition } from '../composition.js';
import { logger } from '../util/logger.js';

/**
 * Spec: tasks 11.2 — "lightweight in-process session-store sweep that purges
 * expired sessions on a per-request lazy schedule (no separate worker)".
 *
 * Fires DrizzleSessionStore.sweepExpired() at most once every `cooldownMs`
 * (default 10 minutes) regardless of request volume. Errors are logged and
 * swallowed — sweep is best-effort.
 */
export function sessionSweepMiddleware(
  composition: Composition,
  options: { cooldownMs?: number } = {},
) {
  const cooldownMs = options.cooldownMs ?? 10 * 60 * 1000;
  const inactivityMs = composition.env.SESSION_INACTIVITY_DAYS * 24 * 60 * 60 * 1000;
  let lastSweepAt = 0;
  let inFlight = false;

  return (_req: Request, _res: Response, next: NextFunction) => {
    next();
    const now = Date.now();
    if (inFlight || now - lastSweepAt < cooldownMs) return;
    lastSweepAt = now;
    inFlight = true;
    const cutoff = new Date(now - inactivityMs);
    composition.sessions
      .sweepExpired(cutoff)
      .then((removed: number) => {
        if (removed > 0) logger.info({ removed }, 'sessions_sweep');
      })
      .catch((err: unknown) => {
        logger.warn({ err }, 'sessions_sweep_failed');
      })
      .finally(() => {
        inFlight = false;
      });
  };
}
