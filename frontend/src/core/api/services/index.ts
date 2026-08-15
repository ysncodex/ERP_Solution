// Export all services from a single entry point
export { authService } from './auth.service';
export { salesService } from './sales.service';
export { expensesService } from './expenses.service';
export { reportsService } from './reports.service';
export { menuService } from './menu.service';
export { catalogService } from './catalog.service';
export { suppliersService } from './suppliers.service';
export { fundsService } from './funds.service';

// Re-export types
export type { LoginCredentials, AuthResponse, AuthRole, User } from './auth.service';
export type { SaleCreateData, SaleUpdateData, SalesStats } from './sales.service';
export type { MenuItemCreateData, MenuItemUpdateData } from './menu.service';
export type { ExpenseCreateData, ExpenseStats } from './expenses.service';
export type { DailyReport, MonthlyReport, ProfitLossReport } from './reports.service';
export type { CatalogItem } from './catalog.service';
export type { Supplier, SupplierCreateData, SupplierUpdateData } from './suppliers.service';
export type { FundMovementCreateData } from '@/core/types/fund.types';
