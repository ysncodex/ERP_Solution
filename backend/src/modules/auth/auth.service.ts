import bcrypt from 'bcrypt';
import { prisma } from '../../lib/prisma.js';
import { signAuthToken } from '../../utils/jwt.js';
import { ApiError } from '../../utils/ApiError.js';
import type { LoginInput } from './auth.schema.js';
import type { Role } from '../../generated/prisma/enums.js';

interface PublicUser {
  id: string;
  name: string;
  role: Role;
}

interface LoginResult {
  token: string;
  user: PublicUser;
}

/** Issue a read-only JWT for the seeded visitor account (no password). */
export async function loginVisitor(): Promise<LoginResult> {
  const user = await prisma.user.findFirst({ where: { role: 'visitor' } });
  if (!user) {
    throw ApiError.unauthorized('Visitor access is not available');
  }

  return {
    token: signAuthToken(user.id, user.role),
    user: { id: user.id, name: user.name, role: user.role },
  };
}

/** Validate role + password against the seeded user and issue a JWT. */
export async function login({ role, password }: LoginInput): Promise<LoginResult> {
  const user = await prisma.user.findFirst({ where: { role } });

  // Run a comparison even when the user is missing to reduce timing leaks.
  const hash = user?.passwordHash ?? '$2b$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv';
  const ok = await bcrypt.compare(password, hash);

  if (!user || !ok) {
    throw ApiError.unauthorized('Invalid role or password');
  }

  return {
    token: signAuthToken(user.id, user.role),
    user: { id: user.id, name: user.name, role: user.role },
  };
}

export async function getPublicUserById(id: string): Promise<PublicUser> {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw ApiError.unauthorized('User no longer exists');
  return { id: user.id, name: user.name, role: user.role };
}
