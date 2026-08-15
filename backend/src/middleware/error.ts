import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { ApiError } from '../utils/ApiError.js';
import { isProd } from '../config/env.js';

/** Catch-all for unmatched routes → 404 JSON. */
export function notFound(req: Request, res: Response) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

/** Central error handler. Returns a consistent `{ message }` JSON body. */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
) {
  if (err instanceof ZodError) {
    res.status(400).json({
      message: 'Validation failed',
      issues: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    });
    return;
  }

  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      message: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
    return;
  }

  const message = err instanceof Error ? err.message : 'Internal server error';
  if (!isProd) console.error('Unhandled error:', err);

  res.status(500).json({
    message: isProd ? 'Internal server error' : message,
  });
}
