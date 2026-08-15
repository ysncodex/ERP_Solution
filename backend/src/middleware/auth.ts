import type { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/ApiError.js';
import { verifyAuthToken } from '../utils/jwt.js';
import type { Role } from '../generated/prisma/enums.js';

/** Require a valid `Authorization: Bearer <token>` header. */
export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw ApiError.unauthorized('Missing or malformed Authorization header');
  }

  const token = header.slice('Bearer '.length).trim();
  try {
    const payload = verifyAuthToken(token);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    throw ApiError.unauthorized('Invalid or expired token');
  }
}

/** Require the authenticated user to have one of the given roles. */
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw ApiError.unauthorized();
    if (!roles.includes(req.user.role)) {
      throw ApiError.forbidden('You do not have permission to perform this action');
    }
    next();
  };
}
