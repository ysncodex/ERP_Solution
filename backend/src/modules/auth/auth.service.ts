import bcrypt from 'bcrypt';
import { prisma } from '../../lib/prisma.js';
import { signAuthToken } from '../../utils/jwt.js';
import { ApiError } from '../../utils/ApiError.js';
import type { DemoLoginInput, LoginInput } from './auth.schema.js';
import type { Role } from '../../generated/prisma/enums.js';

interface PublicUser {
  id: string;
  name: string;
  role: Role;
  isDemo: boolean;
}

interface LoginResult {
  token: string;
  user: PublicUser;
}

function toPublicUser(user: { id: string; name: string; role: Role; isDemo: boolean }): PublicUser {
  return { id: user.id, name: user.name, role: user.role, isDemo: user.isDemo };
}

/** Issue a read-only JWT for the seeded demo account of the requested role (no password). */
export async function loginDemo({ role }: DemoLoginInput): Promise<LoginResult> {
  const user = await prisma.user.findFirst({ where: { role, isDemo: true } });
  if (!user) {
    throw ApiError.unauthorized('Demo access is not available');
  }

  return {
    token: signAuthToken(user.id, user.role, true),
    user: toPublicUser(user),
  };
}

/** Validate role + password against the real (non-demo) user and issue a JWT. */
export async function login({ role, password }: LoginInput): Promise<LoginResult> {
  // isDemo: false is essential, otherwise a demo account could match this lookup.
  const user = await prisma.user.findFirst({ where: { role, isDemo: false } });

  // Run a comparison even when the user is missing to reduce timing leaks.
  const hash = user?.passwordHash ?? '$2b$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv';
  const ok = await bcrypt.compare(password, hash);

  if (!user || !ok) {
    throw ApiError.unauthorized('Invalid role or password');
  }

  return {
    token: signAuthToken(user.id, user.role, false),
    user: toPublicUser(user),
  };
}

export async function getPublicUserById(id: string): Promise<PublicUser> {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw ApiError.unauthorized('User no longer exists');
  return toPublicUser(user);
}
