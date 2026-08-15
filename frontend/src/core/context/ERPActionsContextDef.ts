import { createContext } from 'react';
import type { ERPContextType } from '@/core/types';

/**
 * The action/dispatch surface of the ERP context.
 *
 * These are all referentially stable (useCallback / state setters), so the
 * actions context value never changes after mount. Components that only need to
 * *trigger* mutations (quick-entry forms, refresh buttons, etc.) should consume
 * `useERPActions()` instead of `useERP()` so they don't re-render every time the
 * ledger data changes.
 */
export type ERPActions = Pick<
  ERPContextType,
  | 'addTransaction'
  | 'deleteTransaction'
  | 'updateTransaction'
  | 'clearAllData'
  | 'setDateRange'
  | 'setCustomStart'
  | 'setCustomEnd'
  | 'setCustomDateRange'
  | 'refreshTransactions'
  | 'refreshCatalogs'
  | 'refreshFundMovements'
  | 'refreshFundBalances'
  | 'addFixedCostItem'
  | 'renameFixedCostItem'
  | 'deleteFixedCostItem'
  | 'addProductCostItem'
  | 'renameProductCostItem'
  | 'deleteProductCostItem'
  | 'addItemName'
  | 'renameItemName'
  | 'deleteItemName'
  | 'addSupplier'
  | 'renameSupplier'
  | 'deleteSupplier'
>;

export const ERPActionsContext = createContext<ERPActions | undefined>(undefined);
