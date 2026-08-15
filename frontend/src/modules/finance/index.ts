/**
 * Finance module — expense tracking, records, and cost management
 *
 * Future additions:
 *   hooks/     → useExpenseForm, useCostSummary
 *   types/     → ExpenseEntry, CostCategory
 *   services/  → move src/core/api/services/expenses.service.ts here
 *   components/ → ExpenseTable, CostBreakdown
 */

export { default as DailyExpense }   from './pages/DailyExpense';
export { default as DailyRecord }    from './pages/DailyRecord';
export { default as FixedCosts }     from './pages/FixedCosts';
export { default as FundManagement } from './pages/FundManagement';
