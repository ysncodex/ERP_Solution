import { Suspense, useMemo, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Header, Sidebar, type TabId } from '@/shared/components/layout';
import { PageLoader } from '@/shared/components/ui/Loading/Skeletons';
import { canAccessPath, getStoredUser, isReadOnlyUser, ROLE_HOME_PATH } from '@/shared/utils';

function tabFromPathname(pathname: string): TabId {
  // Expected: /dashboard/<section>
  const parts = pathname.split('/').filter(Boolean);
  const section = parts[1];

  switch (section) {
    // Overview
    case undefined:
    case 'overview': return 'dashboard';
    case 'manager-overview': return 'manager_dashboard';
    case 'reports':  return 'report';
    // Finance
    case 'expenses':    return 'daily_expense';
    case 'records':     return 'daily_record';
    case 'fixed-costs': return 'fixed_cost';
    case 'fund':        return 'fund';
    // Sales
    case 'pos-sync':      return 'pos_sync';
    case 'new-order':     return 'new_order';
    case 'product-list':  return 'product_list';
    case 'order-history': return 'order_history';
    // Inventory
    case 'product-costs': return 'product_cost';
    case 'suppliers':     return 'suppliers';
    // HR
    case 'staff-roster': return 'staff_roster';
    case 'payroll':      return 'payroll';
    default:             return 'dashboard';
  }
}

export function DashboardLayout() {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  // Start collapsed on small laptops / tablets (below xl = 1280px) so content
  // gets maximum width; the user can still expand it manually.
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 1280
  );

  const activeTab = useMemo(() => tabFromPathname(location.pathname), [location.pathname]);
  const user = getStoredUser();
  const homePath = user ? ROLE_HOME_PATH[user.role] : '/dashboard/overview';

  // If someone visits exactly /dashboard, redirect to their role home.
  if (location.pathname === '/dashboard') {
    return <Navigate to={homePath} replace />;
  }

  // Block routes outside the user's allowed sections.
  if (user && !canAccessPath(user.role, location.pathname)) {
    return <Navigate to={homePath} replace />;
  }

  return (
    <div className="min-h-[100dvh] bg-[#F8FAFC] font-sans text-slate-800 flex relative overflow-x-hidden">
      {/* Mobile sidebar backdrop */}
      {isMobileMenuOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-[2px] md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <Sidebar
        activeTab={activeTab}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((v) => !v)}
      />

      <main className="flex-1 min-w-0 overflow-y-auto bg-[#F8FAFC] w-full h-[100dvh] flex flex-col">
        {isReadOnlyUser() && (
          <div className="shrink-0 bg-sky-50 border-b border-sky-200 px-3 sm:px-4 py-2 text-center text-[11px] sm:text-sm text-sky-800">
            <span className="font-semibold">Visitor mode</span>
            <span className="hidden sm:inline"> — explore every screen. Changes are disabled.</span>
            <span className="sm:hidden"> — view only, edits are disabled.</span>
          </div>
        )}

        <Header
          activeTab={activeTab}
          onMobileMenuToggle={() => setIsMobileMenuOpen(true)}
        />

        <div className="p-3 sm:p-4 md:p-5 lg:p-6 xl:p-8 max-w-[1600px] mx-auto space-y-4 sm:space-y-5 lg:space-y-6 xl:space-y-8 pb-[max(5rem,env(safe-area-inset-bottom))] md:pb-20 w-full min-w-0">
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
