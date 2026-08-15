import { Menu, Calendar, UserCircle2 } from 'lucide-react';
import type { HeaderProps } from './Layout.types';
import { getUserDisplayName, getUserRole, ROLE_LABELS } from '@/shared/utils';

export function Header({ activeTab, onMobileMenuToggle }: HeaderProps) {
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  const getPageTitle = (tab: string) => {
    const titles: Record<string, string> = {
      // Main
      dashboard:         'Dashboard',
      manager_dashboard: 'Manager Dashboard',
      daily_record:      'All Records',
      report:       'Analytics',
      // Operations
      daily_expense: 'Daily Expenses',
      product_cost:  'Product Costs',
      fixed_cost:    'Fixed Costs',
      fund:          'Fund Management',
      // Revenue
      pos_sync:    'POS Sync',
      daily_sales: 'Daily Sales',
      invoices:    'Invoices',
      // Inventory
      stock_levels: 'Stock Levels',
      suppliers:    'Suppliers',
      wastage:      'Wastage',
      // Workforce
      staff_roster: 'Staff Roster',
      payroll:      'Payroll',
    };
    return titles[tab] ?? tab.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const getPageDescription = (tab: string) => {
    const descriptions: Record<string, string> = {
      // Main
      // Overview
      dashboard:         'Overview of key financial metrics and recent activities',
      manager_dashboard: "Live shift overview — sales, orders, drawer balances, and quick entry",
      report:            'Generate comprehensive financial reports and analytics',
      // Finance
      daily_expense: 'Track daily operational expenses',
      daily_record:  'Browse and search all transaction records by date range',
      fixed_cost:    'Monitor and manage recurring fixed expenses',
      fund:          'Manage fund additions and withdrawals',
      // Inventory
      product_cost:  'Manage product costs and variable inventory expenses',
      // Revenue
      pos_sync:    'Sync and reconcile point-of-sale transactions in real time',
      daily_sales: 'Track and analyse daily sales performance across all channels',
      invoices:    'Generate, send, and manage invoices for customers and vendors',
      // Inventory
      stock_levels: 'Monitor ingredient and product inventory across all storage locations',
      suppliers:    'Manage supplier contacts, purchase orders, and delivery schedules',
      wastage:      'Log and review spoilage and wastage to reduce inventory losses',
      // Workforce
      staff_roster: 'Plan and manage employee shifts, schedules, and attendance',
      payroll:      'Calculate and process staff salaries, bonuses, and deductions',
    };
    return descriptions[tab] ?? 'ERP_Solutions Management System';
  };

  const userName = getUserDisplayName();
  const userRole = getUserRole();
  const roleLabel = userRole ? ROLE_LABELS[userRole] : null;

  const roleBadgeClass =
    userRole === 'owner'
      ? 'bg-amber-100 text-amber-700'
      : userRole === 'manager'
        ? 'bg-emerald-100 text-emerald-700'
        : userRole === 'visitor'
          ? 'bg-sky-100 text-sky-700'
          : 'bg-slate-100 text-slate-700';

  return (
    <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200/80 shadow-sm">
      <div className="px-4 py-3 md:px-5 md:py-4 lg:px-6 xl:px-8">
        <div className="flex items-center justify-between">
          {/* Left Section: Title and Description */}
          <div className="flex items-center gap-3 flex-1">
            <button
              onClick={onMobileMenuToggle}
              className="md:hidden p-2 -ml-2 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
              aria-label="Toggle menu"
            >
              <Menu size={24} />
            </button>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 md:gap-3 min-w-0">
                <h1 className="text-base sm:text-lg lg:text-xl xl:text-2xl font-bold text-slate-900 tracking-tight truncate">
                  {getPageTitle(activeTab)}
                </h1>
                <span className={`hidden md:inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full ${roleBadgeClass}`}>
                  {roleLabel ?? 'Active'}
                </span>
              </div>
              <p className="text-xs lg:text-sm text-slate-500 mt-1 hidden lg:block">
                {getPageDescription(activeTab)}
              </p>
            </div>
          </div>

          {/* Right Section: Date and User */}
          <div className="flex items-center gap-2 md:gap-3">
            <div className="hidden lg:flex items-center gap-2 text-sm text-slate-700 bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm">
              <UserCircle2 size={18} className="text-slate-400" />
              <span className="font-semibold">{userName}</span>
            </div>
            <div className="hidden lg:flex items-center gap-2 text-sm text-slate-600 bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm">
              <Calendar size={16} className="text-slate-400" />
              <span className="font-medium">{currentDate}</span>
            </div>
          </div>
        </div>

        {/* Compact date/user row — phones through small laptops (below lg) */}
        <div className="lg:hidden mt-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Calendar size={14} className="text-slate-400" />
            <span>{currentDate}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 shadow-sm">
              <UserCircle2 size={14} className="text-slate-400" />
              <span className="font-semibold">{userName}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
