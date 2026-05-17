import {
  ApplicationError,
  Forbidden,
  IngestFailed,
  IngestTimeout,
  NotFound,
  Unauthenticated,
} from '@kawal/application';
import {
  CrossUserReference,
  DomainError,
  IllegalTransition,
  InvariantViolation,
} from '@kawal/domain';
import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { logger } from '../util/logger.js';

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    res.status(400).json({
      code: 'validation_failed',
      message: 'Request did not match the expected schema',
      details: { issues: err.issues },
    });
    return;
  }
  if (err instanceof Unauthenticated) {
    res.status(401).json({ code: err.code, message: err.message });
    return;
  }
  if (err instanceof Forbidden) {
    res.status(403).json({ code: err.code, message: err.message });
    return;
  }
  if (err instanceof NotFound) {
    res.status(404).json({ code: err.code, message: err.message });
    return;
  }
  if (err instanceof IngestTimeout) {
    res.status(408).json({ code: err.code, message: err.message, details: err.details });
    return;
  }
  if (err instanceof IngestFailed) {
    res.status(422).json({ code: err.code, message: err.message, details: err.details });
    return;
  }
  if (err instanceof InvariantViolation) {
    res.status(400).json({ code: err.code, message: err.message, details: err.details });
    return;
  }
  if (err instanceof IllegalTransition) {
    res.status(409).json({ code: err.code, message: err.message, details: err.details });
    return;
  }
  if (err instanceof CrossUserReference) {
    res.status(403).json({ code: err.code, message: err.message });
    return;
  }
  if (err instanceof DomainError || err instanceof ApplicationError) {
    res.status(400).json({ code: err.code, message: err.message, details: err.details });
    return;
  }
  logger.error({ err, path: req.path }, 'unhandled_error');
  res.status(500).json({ code: 'internal_error', message: 'Internal server error' });
}
