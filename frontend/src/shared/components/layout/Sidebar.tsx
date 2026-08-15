import { useState, useMemo } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Coffee,
  LayoutDashboard,
  FileBarChart,
  History,
  ShoppingBag,
  Building2,
  Wallet,
  ChevronRight,
  ChevronDown,
  X,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  MonitorSmartphone,
  Truck,
  Users,
  Banknote,
  ClipboardList,
  UtensilsCrossed,
  ClockArrowDown,
  Package,
  type LucideIcon,
} from 'lucide-react';
import type { SidebarProps, TabId } from './Layout.types';
import {
  getStoredUser,
  logoutAndClearAllStorage,
  ROLE_LABELS,
  ROLE_NAV_GROUP_LABELS,
  canAccessTab, // Added this import
} from '@/shared/utils';
import type { StaticUserRole } from '@/shared/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface NavItemDef {
  id: TabId;
  to: string;
  label: string;
  icon: LucideIcon;
}

interface NavGroup {
  label: string;
  /** Tailwind gradient + shadow for the active item */
  accentClass: string;
  /** Left-bar accent colour shown next to the section label */
  barColor: string;
  items: NavItemDef[];
}

// ─── Navigation structure ─────────────────────────────────────────────────────

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    accentClass: 'from-amber-500 to-amber-600 shadow-amber-500/30',
    barColor: 'bg-amber-500',
    items: [
      { id: 'dashboard', to: '/dashboard/overview', label: 'Dashboard', icon: LayoutDashboard },
      {
        id: 'manager_dashboard',
        to: '/dashboard/manager-overview',
        label: 'Dashboard',
        icon: LayoutDashboard,
      },
      { id: 'report', to: '/dashboard/reports', label: 'Analytics', icon: FileBarChart },
    ],
  },
  {
    label: 'Orders',
    accentClass: 'from-emerald-500 to-emerald-600 shadow-emerald-500/30',
    barColor: 'bg-emerald-500',
    items: [
      { id: 'new_order', to: '/dashboard/new-order', label: 'New Order', icon: UtensilsCrossed },
      {
        id: 'order_history',
        to: '/dashboard/order-history',
        label: 'Order History',
        icon: ClockArrowDown,
      },
      { id: 'pos_sync', to: '/dashboard/pos-sync', label: 'POS Sync', icon: MonitorSmartphone },
    ],
  },
  {
    label: 'Products',
    accentClass: 'from-orange-500 to-orange-600 shadow-orange-500/30',
    barColor: 'bg-orange-500',
    items: [
      {
        id: 'product_list',
        to: '/dashboard/product-list',
        label: 'Products List',
        icon: ClipboardList,
      },
    ],
  },
  {
    label: 'Finance',
    accentClass: 'from-indigo-500 to-indigo-600 shadow-indigo-500/30',
    barColor: 'bg-indigo-500',
    items: [
      {
        id: 'daily_expense',
        to: '/dashboard/expenses',
        label: 'Daily Expenses',
        icon: ShoppingBag,
      },
      { id: 'daily_record', to: '/dashboard/records', label: 'All Records', icon: History },
      { id: 'fixed_cost', to: '/dashboard/fixed-costs', label: 'Fixed Costs', icon: Building2 },
      { id: 'fund', to: '/dashboard/fund', label: 'Fund Management', icon: Wallet },
    ],
  },
  {
    label: 'Inventory',
    accentClass: 'from-cyan-500 to-cyan-600 shadow-cyan-500/30',
    barColor: 'bg-cyan-500',
    items: [
      { id: 'product_cost', to: '/dashboard/product-costs', label: 'Product Costs', icon: Package },
      { id: 'suppliers', to: '/dashboard/suppliers', label: 'Suppliers', icon: Truck },
    ],
  },
  {
    label: 'HR & Team',
    accentClass: 'from-violet-500 to-violet-600 shadow-violet-500/30',
    barColor: 'bg-violet-500',
    items: [
      { id: 'staff_roster', to: '/dashboard/staff-roster', label: 'Staff Roster', icon: Users },
      { id: 'payroll', to: '/dashboard/payroll', label: 'Payroll', icon: Banknote },
    ],
  },
];

// ─── Section label ────────────────────────────────────────────────────────────

function SectionLabel({
  label,
  barColor,
  isCollapsed,
  isOpen,
  onToggle,
}: {
  label: string;
  barColor: string;
  isCollapsed: boolean;
  isOpen: boolean;
  onToggle: () => void;
}) {
  if (isCollapsed) {
    return (
      <div className="hidden md:flex justify-center my-3">
        <div className={`w-5 h-0.5 rounded-full ${barColor} opacity-60`} />
      </div>
    );
  }
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-2 px-2 pt-5 pb-1.5 group/sec"
    >
      <span className={`w-0.5 h-3 rounded-full shrink-0 ${barColor}`} />
      <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.12em] flex-1 text-left">
        {label}
      </span>
      <ChevronDown
        size={11}
        className={`text-slate-600 group-hover/sec:text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-0' : '-rotate-90'}`}
      />
    </button>
  );
}

// ─── Nav item ─────────────────────────────────────────────────────────────────

function NavItem({
  item,
  isActive,
  isCollapsed,
  accentClass,
  onClose,
}: {
  item: NavItemDef;
  isActive: boolean;
  isCollapsed: boolean;
  accentClass: string;
  onClose: () => void;
}) {
  return (
    <NavLink
      to={item.to}
      onClick={onClose}
      title={isCollapsed ? item.label : undefined}
      className={[
        'flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 group relative',
        isCollapsed ? 'md:justify-center md:px-0' : '',
        isActive
          ? `bg-gradient-to-r ${accentClass} text-white shadow-lg`
          : 'text-slate-400 hover:bg-white/5 hover:text-white',
      ].join(' ')}
    >
      {/* Active left indicator bar (expanded mode) */}
      {isActive && !isCollapsed && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-white/60 rounded-r-full" />
      )}

      <item.icon
        size={17}
        className={
          isActive ? 'text-white shrink-0' : 'shrink-0 transition-colors group-hover:text-white'
        }
      />

      {/* Desktop label */}
      {!isCollapsed && (
        <span className="hidden md:inline text-[13px] font-semibold whitespace-nowrap leading-none">
          {item.label}
        </span>
      )}
      {/* Mobile label */}
      <span className="md:hidden text-[13px] font-semibold whitespace-nowrap leading-none">
        {item.label}
      </span>

      {isActive && !isCollapsed && (
        <ChevronRight size={13} className="ml-auto opacity-70 shrink-0" />
      )}
    </NavLink>
  );
}

// ─── Collapse toggle button ───────────────────────────────────────────────────

function CollapseToggle({ isCollapsed, onToggle }: { isCollapsed: boolean; onToggle: () => void }) {
  return (
    <div className="hidden md:block border-b border-slate-700/40">
      <button
        onClick={onToggle}
        title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className={`w-full flex items-center gap-2.5 px-4 py-2.5 transition-all duration-200
          text-slate-500 hover:text-slate-300 hover:bg-white/5
          ${isCollapsed ? 'justify-center' : ''}`}
      >
        {isCollapsed ? (
          <PanelLeftOpen size={16} />
        ) : (
          <>
            <PanelLeftClose size={16} />
            <span className="text-[11px] font-semibold uppercase tracking-wider">Collapse</span>
            <span className="ml-auto text-[10px] text-slate-600 font-mono">⌘\</span>
          </>
        )}
      </button>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export function Sidebar({
  activeTab,
  isOpen,
  onClose,
  isCollapsed,
  onToggleCollapse,
}: SidebarProps) {
  const navigate = useNavigate();
  const userRole: StaticUserRole = getStoredUser()?.role ?? 'owner';

  // Compute dynamically filtered groups based on role permissions
  const visibleGroups = useMemo(() => {
    const allowedGroupLabels = ROLE_NAV_GROUP_LABELS[userRole];

    return NAV_GROUPS.map((group) => {
      // 1. Check if the entire group is disallowed
      if (!allowedGroupLabels.includes(group.label)) {
        return null;
      }

      // 2. Filter individual items inside the group
      let allowedItems = group.items.filter((item) => canAccessTab(userRole, item.id));

      // Visitor sees both dashboards — distinguish the labels.
      const hasOwnerDash = allowedItems.some((item) => item.id === 'dashboard');
      const hasManagerDash = allowedItems.some((item) => item.id === 'manager_dashboard');
      if (hasOwnerDash && hasManagerDash) {
        allowedItems = allowedItems.map((item) => {
          if (item.id === 'dashboard') return { ...item, label: 'Owner Dashboard' };
          if (item.id === 'manager_dashboard') return { ...item, label: 'Manager Dashboard' };
          return item;
        });
      }

      // 3. Hide the group completely if all items inside are restricted
      if (allowedItems.length === 0) {
        return null;
      }

      // 4. Return the group with only the allowed items
      return {
        ...group,
        items: allowedItems,
      };
    }).filter(Boolean) as NavGroup[];
  }, [userRole]);

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(visibleGroups.map((g) => [g.label, true]))
  );

  const toggleGroup = (label: string) =>
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));

  const handleLogout = () => {
    try {
      logoutAndClearAllStorage();
    } catch {
      /* ignore */
    }
    navigate('/');
  };

  return (
    <aside
      className={[
        'fixed inset-y-0 left-0 z-40 flex flex-col',
        'h-[100dvh] max-h-[100dvh] supports-[height:100dvh]:h-[100dvh]',
        'bg-slate-900 text-slate-300 shadow-2xl',
        'transition-all duration-300 ease-in-out',
        'md:translate-x-0 md:sticky md:inset-auto md:top-0 md:h-[100dvh]',
        isOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64',
        isCollapsed ? 'md:w-[62px]' : 'md:w-64',
      ].join(' ')}
    >
      {/* ── Brand header ── */}
      <div
        className={`shrink-0 flex items-center border-b border-slate-700/50 bg-slate-800/60
          ${isCollapsed ? 'md:flex-col md:gap-0 md:py-3 md:px-0 p-4' : 'gap-3 px-4 py-3.5'}`}
      >
        {/* Logo */}
        <div
          className={`shrink-0 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl shadow-lg shadow-amber-500/20
          ${isCollapsed ? 'md:p-2' : 'p-2'}`}
        >
          <Coffee className="text-white" size={17} strokeWidth={2.5} />
        </div>

        {/* Brand text — hidden when desktop-collapsed, always on mobile */}
        {!isCollapsed && (
          <div className="hidden md:block min-w-0 flex-1">
            <p className="text-[15px] font-black text-white leading-tight tracking-tight whitespace-nowrap">
              ERP_Solutions
            </p>
            <p className="text-[10px] text-slate-500 font-medium mt-0.5">
              V2.6 &nbsp;·&nbsp; ERP_Solutions
            </p>
            <p className="text-[10px] text-amber-400/90 font-semibold mt-0.5">
              {ROLE_LABELS[userRole]}
            </p>
          </div>
        )}
        <div className="md:hidden min-w-0 flex-1">
          <p className="text-[15px] font-black text-white leading-tight tracking-tight">ERP_Solutions</p>
          <p className="text-[10px] text-slate-500 font-medium mt-0.5">V2.6 · ERP_Solutions</p>
          <p className="text-[10px] text-amber-400/90 font-semibold mt-0.5">
            {ROLE_LABELS[userRole]}
          </p>
        </div>

        {/* Mobile close */}
        <button
          onClick={onClose}
          className="md:hidden ml-auto p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* ── Collapse toggle (desktop only, just below brand) ── */}
      <CollapseToggle isCollapsed={isCollapsed} onToggle={onToggleCollapse} />

      {/* ── Navigation ── */}
      <nav className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-2 pb-3 scroll-smooth">
        {visibleGroups.map((group) => {
          const isGroupOpen = isCollapsed || openGroups[group.label];
          return (
            <div key={group.label}>
              <SectionLabel
                label={group.label}
                barColor={group.barColor}
                isCollapsed={isCollapsed}
                isOpen={openGroups[group.label]}
                onToggle={() => toggleGroup(group.label)}
              />
              {isGroupOpen && (
                <div className="space-y-0.5 mt-0.5">
                  {group.items.map((item) => (
                    <NavItem
                      key={item.id}
                      item={item}
                      isActive={activeTab === item.id}
                      isCollapsed={isCollapsed}
                      accentClass={group.accentClass}
                      onClose={onClose}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* ── Sign out — always pinned at bottom (incl. iPhone safe area) ── */}
      <div className="shrink-0 p-2 border-t border-slate-700/50 bg-slate-800/40 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <button
          onClick={handleLogout}
          title={isCollapsed ? 'Sign Out' : undefined}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
            text-slate-400 hover:text-rose-400 hover:bg-rose-500/10
            transition-all duration-200 group
            ${isCollapsed ? 'md:justify-center' : ''}`}
        >
          <LogOut size={16} className="shrink-0 transition-colors group-hover:text-rose-400" />
          <span className={`text-[13px] font-semibold ${isCollapsed ? 'md:sr-only' : ''}`}>
            Sign Out
          </span>
        </button>
      </div>
    </aside>
  );
}
