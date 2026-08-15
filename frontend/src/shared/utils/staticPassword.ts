/**
 * Static Password Auth (Offline / Local)
 *
 * Passwords are read from environment variables — never hardcoded in source.
 * Set VITE_OWNER_PASSWORD and VITE_MANAGER_PASSWORD in `.env` for offline
 * fallback when the API is unreachable. Production sign-in uses the backend JWT.
 *
 * Visitor explore is passwordless (POST /auth/visitor). Offline fallback still
 * opens the UI, but live data requires the API.
 *
 * NOTE: Offline mode is not secure and is intended for demo/local usage only.
 */

import { STORAGE_KEYS } from './constants';

export type StaticUserRole = 'owner' | 'manager' | 'visitor';

export type StaticUser = {
  id: string;
  name: string;
  role: StaticUserRole;
};

function offlinePassword(role: Exclude<StaticUserRole, 'visitor'>): string {
  if (role === 'owner') return import.meta.env.VITE_OWNER_PASSWORD?.trim() ?? '';
  return import.meta.env.VITE_MANAGER_PASSWORD?.trim() ?? '';
}

export function formatLoginSuccessMessage(userName: string): string {
  return `${userName} signed in successfully`;
}

/** @deprecated Use validateRolePassword('owner', password) instead. */
export function validateLoginPassword(password: string): boolean {
  return validateRolePassword('owner', password);
}

export function validateRolePassword(role: StaticUserRole, password: string): boolean {
  if (role === 'visitor') return false;
  const expected = offlinePassword(role);
  if (!expected) return false;
  return password === expected;
}

export function validateManagerPassword(password: string): boolean {
  return validateRolePassword('manager', password);
}

function persistUser(user: StaticUser): StaticUser {
  if (typeof window === 'undefined') return user;
  localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, 'local');
  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  return user;
}

export function loginAs(role: StaticUserRole): StaticUser {
  return persistUser(USER_PROFILES[role]);
}

/** @deprecated Use loginAs('owner') instead. */
export function loginAsOwner(): StaticUser {
  return loginAs('owner');
}

export function loginAsManager(): StaticUser {
  return loginAs('manager');
}

export function loginAsVisitor(): StaticUser {
  return loginAs('visitor');
}

export function logoutAndClearAllStorage(): void {
  if (typeof window === 'undefined') return;
  localStorage.clear();
}

export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  if (!token) return false;
  return getStoredUser() !== null;
}

function parseStoredRole(raw: unknown): StaticUserRole | null {
  if (raw === 'owner' || raw === 'manager' || raw === 'visitor') return raw;
  return null;
}

const USER_PROFILES: Record<StaticUserRole, StaticUser> = {
  owner: { id: 'owner', name: 'Owner', role: 'owner' },
  manager: { id: 'manager', name: 'Manager', role: 'manager' },
  visitor: { id: 'visitor', name: 'Visitor', role: 'visitor' },
};

export function getStoredUser(): StaticUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USER);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') return null;

    const role = parseStoredRole(parsed.role);
    if (!role) return null;

    return {
      id: String(parsed.id ?? role),
      name: String(parsed.name ?? ROLE_DISPLAY_NAME[role]),
      role,
    };
  } catch {
    return null;
  }
}

const ROLE_DISPLAY_NAME: Record<StaticUserRole, string> = {
  owner: 'Owner',
  manager: 'Manager',
  visitor: 'Visitor',
};

export function getUserDisplayName(): string {
  return getStoredUser()?.name || 'User';
}

export function getUserRole(): StaticUserRole | null {
  return getStoredUser()?.role ?? null;
}
