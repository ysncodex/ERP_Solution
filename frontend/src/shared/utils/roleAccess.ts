/**
 * Role-based navigation and route access.
 *
 * Centralises which dashboard sections each role may see so Sidebar,
 * route guards, and post-login redirects stay in sync.
 */

import { toast } from 'sonner';
import type { TabId } from '@/shared/components/layout/Layout.types';
import { getUserRole, type StaticUserRole } from './staticPassword';

/** Default landing path after login or when visiting `/dashboard`. */
export const ROLE_HOME_PATH: Record<StaticUserRole, string> = {
  owner: '/dashboard/overview',
  manager: '/dashboard/manager-overview',
  visitor: '/dashboard/overview',
};

/** Sidebar group labels visible per role. */
export const ROLE_NAV_GROUP_LABELS: Record<StaticUserRole, readonly string[]> = {
  owner: ['Overview', 'Orders', 'Products', 'Finance', 'Inventory', 'HR & Team'],
  // 'Overview' surfaces the Manager Dashboard; Finance/Inventory expose the cost tabs.
  manager: ['Overview', 'Orders', 'Products', 'Finance', 'Inventory'],
  visitor: ['Overview', 'Orders', 'Products', 'Finance', 'Inventory', 'HR & Team'],
};

/** Human-readable role labels for UI badges. */
export const ROLE_LABELS: Record<StaticUserRole, string> = {
  owner: 'Owner',
  manager: 'Manager',
  visitor: 'Visitor',
};

/** Short descriptions shown on the login page and header. */
export const ROLE_DESCRIPTIONS: Record<StaticUserRole, string> = {
  owner: 'Full access to every module — finance, inventory, HR, and reports.',
  manager: 'Day-to-day operations — take orders, manage the menu, and log costs.',
  visitor: 'Explore every screen. View only — nothing can be changed.',
};

const MANAGER_PATHS = new Set([
  '/dashboard/manager-overview',
  '/dashboard/new-order',
  '/dashboard/order-history',
  '/dashboard/pos-sync',
  '/dashboard/product-list',
  '/dashboard/fixed-costs',
  '/dashboard/product-costs',
]);

/** Manager-only sections that owner should not land on. */
const MANAGER_ONLY_PATHS = new Set(['/dashboard/manager-overview']);

/** Normalise a pathname to the section path used for access checks. */
function normalizeDashboardPath(pathname: string): string {
  const parts = pathname.split('/').filter(Boolean);
  if (parts[0] !== 'dashboard') return pathname;
  if (parts.length <= 1) return '/dashboard/overview';
  return `/dashboard/${parts[1]}`;
}

/** Whether the given role may create, edit, or delete ERP / menu data. */
export function canMutateData(role: StaticUserRole | null | undefined): boolean {
  return role === 'owner' || role === 'manager';
}

export function isReadOnlyUser(): boolean {
  return getUserRole() === 'visitor';
}

export function notifyReadOnlyBlocked(): void {
  toast.error('Visitor mode is view-only. Sign in as Owner or Manager to make changes.');
}

/** Returns true when the current user must not mutate data. */
export function blockReadOnlyMutation(notify = true): boolean {
  if (!isReadOnlyUser()) return false;
  if (notify) notifyReadOnlyBlocked();
  return true;
}

/** Whether the given role may open this dashboard route. */
export function canAccessPath(role: StaticUserRole, pathname: string): boolean {
  const path = normalizeDashboardPath(pathname);

  switch (role) {
    case 'owner':
      return path.startsWith('/dashboard/') && !MANAGER_ONLY_PATHS.has(path);
    case 'manager':
      return MANAGER_PATHS.has(path);
    case 'visitor':
      return path.startsWith('/dashboard/');
    default:
      return false;
  }
}

/** Whether a sidebar tab id is reachable for the given role. */
export function canAccessTab(role: StaticUserRole, tabId: TabId): boolean {
  const tabToPath: Partial<Record<TabId, string>> = {
    dashboard: '/dashboard/overview',
    manager_dashboard: '/dashboard/manager-overview',
    report: '/dashboard/reports',
    new_order: '/dashboard/new-order',
    order_history: '/dashboard/order-history',
    pos_sync: '/dashboard/pos-sync',
    product_list: '/dashboard/product-list',
    daily_expense: '/dashboard/expenses',
    daily_record: '/dashboard/records',
    fixed_cost: '/dashboard/fixed-costs',
    fund: '/dashboard/fund',
    product_cost: '/dashboard/product-costs',
    suppliers: '/dashboard/suppliers',
    staff_roster: '/dashboard/staff-roster',
    payroll: '/dashboard/payroll',
  };

  const path = tabToPath[tabId];
  return path ? canAccessPath(role, path) : false;
}
