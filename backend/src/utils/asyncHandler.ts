import type { NextFunction, Request, Response } from 'express';

type AsyncRoute = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

/**
 * Wrap an async route so any thrown/rejected error is forwarded to the
 * Express error handler. (Express 5 forwards most rejections automatically,
 * but this keeps behaviour explicit and consistent.)
 */
export const asyncHandler =
  (fn: AsyncRoute) => (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
