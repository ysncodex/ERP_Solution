import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env.js';
import type { Role } from '../generated/prisma/enums.js';

export interface AuthTokenPayload {
  sub: string;
  role: Role;
  isDemo: boolean;
}

export function signAuthToken(userId: string, role: Role, isDemo = false): string {
  const options: SignOptions = {
    // Demo sessions are short-lived; real sessions use the configured expiry.
    expiresIn: (isDemo ? '2h' : env.JWT_EXPIRES_IN) as SignOptions['expiresIn'],
  };
  return jwt.sign({ role, isDemo }, env.JWT_SECRET, { subject: userId, ...options });
}

export function verifyAuthToken(token: string): AuthTokenPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET);
  if (typeof decoded === 'string' || !decoded.sub || !('role' in decoded)) {
    throw new Error('Malformed token payload');
  }
  return {
    sub: String(decoded.sub),
    role: decoded.role as Role,
    // Tokens issued before this change have no flag: treat them as real sessions.
    isDemo: decoded.isDemo === true,
  };
}
