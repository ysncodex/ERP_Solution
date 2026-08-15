export interface HeaderProps {
  activeTab: TabId;
  onMobileMenuToggle: () => void;
}

export interface SidebarProps {
  activeTab: TabId;
  isOpen: boolean;
  onClose: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export type TabId =
  // Main
  | 'dashboard' | 'manager_dashboard' | 'daily_record' | 'report'
  // Operations
  | 'daily_expense' | 'product_cost' | 'fixed_cost' | 'fund'
  // Revenue
  | 'pos_sync' | 'new_order' | 'product_list' | 'order_history'
  // Inventory
  | 'suppliers'
  // Workforce
  | 'staff_roster' | 'payroll';
