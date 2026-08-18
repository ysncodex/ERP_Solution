import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import type {
  Transaction,
  DateRange,
  DateRangeFilter,
  ERPContextType,
  CatalogItem,
  Supplier,
  FundMovement,
  FundBalances,
} from '@/core/types';
import { generateId, STORAGE_KEYS, blockReadOnlyMutation, isAuthenticated } from '@/shared/utils';
import { businessMonthToDateRange, todayBusinessKey } from '@/shared/utils/businessDate';

import { savePersistedERPState } from './erp/storage';
import { normalizeLabel } from './erp/listUtils';
import { filterTransactions } from './erp/filters';
import { computeStats } from './erp/stats';
import { computeDailyRecords } from './erp/dailyRecords';
import {
  createTransactionOnServer,
  deleteTransactionOnServer,
  fetchAllTransactions,
  fetchRecentTransactions,
  mergeLedgerWithOptimistic,
  updateTransactionOnServer,
} from './erp/apiRepository';
import { catalogService, suppliersService, fundsService } from '@/core/api/services';
import { waitForApi } from '@/core/api/client';

import { ERPContext } from './ERPContextDef';
import { ERPActionsContext, type ERPActions } from './ERPActionsContextDef';

/** Drop saved calendar ranges when the business day rolls over (Asia/Dhaka). */
function syncBusinessDayStorage(): void {
  if (typeof window === 'undefined') return;
  const today = todayBusinessKey();
  const last = localStorage.getItem(STORAGE_KEYS.ERP_BUSINESS_DAY);
  if (last !== today) {
    localStorage.removeItem(STORAGE_KEYS.DATE_RANGE);
    localStorage.setItem(STORAGE_KEYS.ERP_BUSINESS_DAY, today);
  }
}

function loadSavedDateRange(): DateRangeFilter {
  if (typeof window === 'undefined') return businessMonthToDateRange();
  syncBusinessDayStorage();
  // Open on the current business month so costs, records, and KPIs show seeded history.
  return businessMonthToDateRange();
}

/** Legacy localStorage bootstrap — catalogs now load from the API. */
export function ERPProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [fundMovements, setFundMovements] = useState<FundMovement[]>([]);
  const [fundBalances, setFundBalances] = useState<FundBalances | null>(null);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>('today');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [customDateRange, setCustomDateRangeState] = useState<DateRangeFilter>(loadSavedDateRange);

  const setCustomDateRange = useCallback((range: DateRangeFilter) => {
    setCustomDateRangeState(range.from && range.to ? range : businessMonthToDateRange());
  }, []);

  const [fixedCostItems, setFixedCostItems] = useState<CatalogItem[]>([]);
  const [productCostItems, setProductCostItems] = useState<CatalogItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const refreshCatalogs = useCallback(async () => {
    if (!isAuthenticated()) {
      setFixedCostItems([]);
      setProductCostItems([]);
      setSuppliers([]);
      return;
    }

    try {
      const [fixedItems, productItems, supplierRows] = await Promise.all([
        catalogService.getFixedItems(),
        catalogService.getProductItems(),
        suppliersService.getAll(),
      ]);
      setFixedCostItems(fixedItems);
      setProductCostItems(productItems);
      setSuppliers(supplierRows);
    } catch {
      toast.error('Could not load expense catalogs from server');
    }
  }, []);

  const refreshFundMovements = useCallback(async () => {
    if (!isAuthenticated()) {
      setFundMovements([]);
      return;
    }

    try {
      const rows = await fundsService.getAll();
      setFundMovements(rows);
    } catch {
      toast.error('Could not load fund movements from server');
      setFundMovements([]);
    }
  }, []);

  // Authoritative account balances (server aggregates the full ledger, so these
  // are correct even though the client only caches a recent window of rows).
  const refreshFundBalances = useCallback(async () => {
    if (!isAuthenticated()) {
      setFundBalances(null);
      return;
    }

    try {
      setFundBalances(await fundsService.getBalances());
    } catch {
      // Non-fatal: stats gracefully fall back to client-derived balances.
      setFundBalances(null);
    }
  }, []);

  const refreshTransactions = useCallback(async (opts?: { silent?: boolean }) => {
    if (!isAuthenticated()) {
      setTransactions([]);
      setIsLoadingTransactions(false);
      return;
    }

    if (!opts?.silent) setIsLoadingTransactions(true);
    try {
      const rows = await fetchAllTransactions();
      setTransactions((prev) => mergeLedgerWithOptimistic(rows, prev));
    } catch {
      if (!opts?.silent) toast.error('Could not load transactions from server');
      if (!opts?.silent) setTransactions([]);
    } finally {
      setIsLoadingTransactions(false);
    }
  }, []);

  /** Apply a completed POS sale immediately (ledger + live method balances). */
  const ingestPostedSale = useCallback((tx: Transaction | (Omit<Transaction, 'id' | 'date'> & { id?: string; date?: Date })) => {
    const row: Transaction = {
      ...tx,
      id: tx.id || `sale-${generateId()}`,
      date: tx.date ?? new Date(),
      type: 'sale',
      receiptStatus: tx.receiptStatus ?? 'completed',
    };

    setTransactions((prev) => {
      if (prev.some((t) => t.id === row.id || (t.orderNumber && t.orderNumber === row.orderNumber))) {
        return prev;
      }
      return [row, ...prev];
    });

    if (row.method && row.receiptStatus !== 'pending' && row.receiptStatus !== 'voided') {
      const amount = Number(row.amount) || 0;
      if (amount > 0) {
        setFundBalances((prev) => {
          if (!prev) return prev;
          const combined = {
            ...prev.combined,
            [row.method!]: Number(prev.combined[row.method!] ?? 0) + amount,
          };
          return {
            ...prev,
            combined,
            totalLiquidity:
              Number(combined.cash ?? 0) +
              Number(combined.bank ?? 0) +
              Number(combined.bkash ?? 0) +
              Number(combined.reserve ?? 0),
          };
        });
      }
    }
  }, []);

  // Legacy localStorage hook — no longer persists catalog names
  useEffect(() => {
    savePersistedERPState(STORAGE_KEYS.ERP_STATE, {
      transactions: [],
      itemNames: [],
      suppliers: [],
    });
  }, []);

  // ── Load ledger from backend on mount (balances first for fast KPI paint) ──
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      await waitForApi();
      if (cancelled) return;

      // 1) Paint Live Account Balances ASAP.
      await Promise.all([refreshFundBalances(), refreshFundMovements(), refreshCatalogs()]);
      if (cancelled) return;

      // 2) Quick recent ledger so Manager/Owner dashboards become interactive.
      setIsLoadingTransactions(true);
      try {
        const recent = await fetchRecentTransactions();
        if (!cancelled) setTransactions(recent);
      } catch {
        if (!cancelled) toast.error('Could not load transactions from server');
      } finally {
        if (!cancelled) setIsLoadingTransactions(false);
      }

      // 3) Backfill the full ledger silently in the background.
      if (!cancelled) {
        void refreshTransactions({ silent: true });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [refreshTransactions, refreshCatalogs, refreshFundMovements, refreshFundBalances]);

  // ── Derived state ───────────────────────────────────────────────────────────
  const filteredTransactions = useMemo(
    () => filterTransactions({ transactions, dateRange, customStart, customEnd, customDateRange }),
    [transactions, dateRange, customStart, customEnd, customDateRange]
  );

  const authoritativeBalances = useMemo(
    () =>
      fundBalances
        ? {
            cash: fundBalances.combined.cash,
            bank: fundBalances.combined.bank,
            bkash: fundBalances.combined.bkash,
            reserve: fundBalances.combined.reserve,
            totalLiquidity: fundBalances.totalLiquidity,
          }
        : undefined,
    [fundBalances]
  );

  const stats = useMemo(
    () => computeStats(transactions, filteredTransactions, fundMovements, authoritativeBalances),
    [transactions, filteredTransactions, fundMovements, authoritativeBalances]
  );

  const dailyRecords = useMemo(
    () => computeDailyRecords(filteredTransactions),
    [filteredTransactions]
  );

  // ── Transaction actions (optimistic UI + API sync) ──────────────────────────

  const addTransaction = useCallback(
    (data: Omit<Transaction, 'id' | 'date'> & { date?: Date }): Transaction => {
      if (blockReadOnlyMutation()) {
        return { ...data, id: 'blocked', date: data.date ?? new Date() } as Transaction;
      }

      const isExpense = data.type === 'expense_fixed' || data.type === 'expense_product';
      if (isExpense && data.method) {
        const available = Math.max(0, Number(fundBalances?.combined?.[data.method] ?? 0));
        const amount = Number(data.amount);
        if (available + 1e-9 < amount) {
          const label = data.method === 'bank' ? 'Bank/Card' : data.method === 'bkash' ? 'bKash' : 'Cash';
          toast.error(
            `Insufficient ${label} balance. Available ৳${available.toLocaleString('en-IN')}, required ৳${amount.toLocaleString('en-IN')}.`,
          );
          return { ...data, id: 'blocked', date: data.date ?? new Date() } as Transaction;
        }
      }

      const optimistic: Transaction = {
        ...data,
        id: `temp-${generateId()}`,
        date: data.date ?? new Date(),
      };

      setTransactions((prev) => [optimistic, ...prev]);

      // Optimistic live-balance update (reconciled after server save).
      const amount = Number(data.amount) || 0;
      if (amount > 0 && data.method) {
        const isPendingSale = data.type === 'sale' && data.receiptStatus === 'pending';
        if (!isPendingSale) {
          let delta = 0;
          if (isExpense || data.type === 'sale_adjustment') delta = -amount;
          else if (data.type === 'sale') delta = amount;

          if (delta !== 0) {
            setFundBalances((prev) => {
              if (!prev) return prev;
              const next = Math.max(0, Number(prev.combined[data.method!] ?? 0) + delta);
              const combined = { ...prev.combined, [data.method!]: next };
              return {
                ...prev,
                combined,
                totalLiquidity:
                  Number(combined.cash ?? 0) +
                  Number(combined.bank ?? 0) +
                  Number(combined.bkash ?? 0) +
                  Number(combined.reserve ?? 0),
              };
            });
          }
        }
      }

      void createTransactionOnServer(data)
        .then((saved) => {
          setTransactions((prev) => prev.map((t) => (t.id === optimistic.id ? saved : t)));
          if (saved.type === 'expense_fixed' || saved.type === 'expense_product') {
            void refreshCatalogs();
          }
          void refreshFundBalances();
        })
        .catch((err: unknown) => {
          setTransactions((prev) => prev.filter((t) => t.id !== optimistic.id));
          void refreshFundBalances();
          const message =
            (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
            'Failed to save transaction';
          toast.error(message);
        });

      return optimistic;
    },
    [refreshCatalogs, refreshFundBalances, fundBalances],
  );

  const deleteTransaction = useCallback(async (id: string) => {
    if (blockReadOnlyMutation()) return;

    // Read the row from the latest state inside the updater so this callback
    // stays referentially stable (empty deps) and doesn't churn the context value.
    let existing: Transaction | undefined;
    setTransactions((prev) => {
      existing = prev.find((t) => t.id === id);
      return existing ? prev.filter((t) => t.id !== id) : prev;
    });
    if (!existing) return;

    const countedSale =
      existing.type === 'sale' &&
      existing.method &&
      existing.receiptStatus !== 'pending' &&
      existing.receiptStatus !== 'voided';
    const countedExpense =
      (existing.type === 'expense_fixed' || existing.type === 'expense_product') && existing.method;
    const countedAdj = existing.type === 'sale_adjustment' && existing.method;
    const amount = Number(existing.amount) || 0;

    if (amount > 0 && existing.method && (countedSale || countedExpense || countedAdj)) {
      const method = existing.method;
      const delta = countedSale ? -amount : amount; // remove sale (−), undo expense/adj (+)
      setFundBalances((fb) => {
        if (!fb) return fb;
        const combined = {
          ...fb.combined,
          [method]: Math.max(0, Number(fb.combined[method] ?? 0) + delta),
        };
        return {
          ...fb,
          combined,
          totalLiquidity:
            Number(combined.cash ?? 0) +
            Number(combined.bank ?? 0) +
            Number(combined.bkash ?? 0) +
            Number(combined.reserve ?? 0),
        };
      });
    }

    try {
      await deleteTransactionOnServer(id, existing.type);
      void refreshFundBalances();
    } catch (error) {
      const restored = existing;
      setTransactions((prev) => [restored, ...prev.filter((t) => t.id !== id)]);
      void refreshFundBalances();
      throw error;
    }
  }, [refreshFundBalances]);

  const updateTransaction = useCallback(
    (updated: Transaction) => {
      if (blockReadOnlyMutation()) return;

      let previous: Transaction | undefined;
      setTransactions((prev) => {
        previous = prev.find((t) => t.id === updated.id);
        return prev.map((t) => (t.id === updated.id ? updated : t));
      });

      // Optimistic live-balance delta (e.g. completing a pending POS order).
      if (previous) {
        const prevCounted =
          previous.type === 'sale' &&
          Boolean(previous.method) &&
          previous.receiptStatus !== 'pending' &&
          previous.receiptStatus !== 'voided';
        const nextCounted =
          updated.type === 'sale' &&
          Boolean(updated.method) &&
          updated.receiptStatus !== 'pending' &&
          updated.receiptStatus !== 'voided';

        const prevAmt = prevCounted ? Number(previous.amount) || 0 : 0;
        const nextAmt = nextCounted ? Number(updated.amount) || 0 : 0;
        const prevMethod = previous.method;
        const nextMethod = updated.method;

        if (prevAmt !== nextAmt || prevMethod !== nextMethod || prevCounted !== nextCounted) {
          setFundBalances((fb) => {
            if (!fb) return fb;
            const combined = { ...fb.combined };
            if (prevCounted && prevMethod) {
              combined[prevMethod] = Math.max(0, Number(combined[prevMethod] ?? 0) - prevAmt);
            }
            if (nextCounted && nextMethod) {
              combined[nextMethod] = Number(combined[nextMethod] ?? 0) + nextAmt;
            }
            return {
              ...fb,
              combined,
              totalLiquidity:
                Number(combined.cash ?? 0) +
                Number(combined.bank ?? 0) +
                Number(combined.bkash ?? 0) +
                Number(combined.reserve ?? 0),
            };
          });
        }
      }

      void updateTransactionOnServer(updated)
        .then((saved) => {
          setTransactions((p) => p.map((t) => (t.id === saved.id ? saved : t)));
          void refreshFundBalances();
        })
        .catch(() => {
          if (previous) {
            setTransactions((p) => p.map((t) => (t.id === previous!.id ? previous! : t)));
          }
          void refreshFundBalances();
          toast.error('Failed to update transaction');
        });
    },
    [refreshFundBalances],
  );

  const clearAllData = useCallback(() => {
    if (blockReadOnlyMutation()) return;
    setTransactions([]);
    toast.message('Local transaction cache cleared — refresh to reload from server.');
  }, []);

  const findFixedByName = useCallback(
    (name: string) => fixedCostItems.find((i) => i.name.toLowerCase() === name.toLowerCase()),
    [fixedCostItems]
  );
  const findProductByName = useCallback(
    (name: string) => productCostItems.find((i) => i.name.toLowerCase() === name.toLowerCase()),
    [productCostItems]
  );
  const findSupplierByName = useCallback(
    (name: string) => suppliers.find((s) => s.name.toLowerCase() === name.toLowerCase()),
    [suppliers]
  );

  const addFixedCostItem = useCallback(
    async (name: string) => {
      if (blockReadOnlyMutation()) return;
      const v = normalizeLabel(name);
      if (!v) return;
      await catalogService.createFixedItem(v);
      await refreshCatalogs();
    },
    [refreshCatalogs]
  );

  const addProductCostItem = useCallback(
    async (name: string) => {
      if (blockReadOnlyMutation()) return;
      const v = normalizeLabel(name);
      if (!v) return;
      await catalogService.createProductItem(v);
      await refreshCatalogs();
    },
    [refreshCatalogs]
  );

  const addSupplier = useCallback(
    async (data: import('@/core/api/services').SupplierCreateData) => {
      if (blockReadOnlyMutation()) return;
      const name = normalizeLabel(data.name);
      const phone = data.phone?.trim();
      const address = data.address?.trim();
      if (!name || !phone || !address) {
        throw new Error('Name, contact, and address are required');
      }
      await suppliersService.create({
        name,
        phone,
        address,
        email: data.email?.trim() || undefined,
        notes: data.notes?.trim() || undefined,
      });
      await refreshCatalogs();
    },
    [refreshCatalogs]
  );

  const renameFixedCostItem = useCallback(
    async (oldName: string, newName: string) => {
      if (blockReadOnlyMutation()) return;
      const item = findFixedByName(oldName);
      const v = normalizeLabel(newName);
      if (!item || !v) return;
      await catalogService.renameFixedItem(item.id, v);
      await refreshCatalogs();
    },
    [findFixedByName, refreshCatalogs]
  );

  const renameProductCostItem = useCallback(
    async (oldName: string, newName: string) => {
      if (blockReadOnlyMutation()) return;
      const item = findProductByName(oldName);
      const v = normalizeLabel(newName);
      if (!item || !v) return;
      await catalogService.renameProductItem(item.id, v);
      await refreshCatalogs();
    },
    [findProductByName, refreshCatalogs]
  );

  const renameSupplier = useCallback(
    async (oldName: string, newName: string) => {
      if (blockReadOnlyMutation()) return;
      const row = findSupplierByName(oldName);
      const v = normalizeLabel(newName);
      if (!row || !v) return;
      await suppliersService.update(row.id, { name: v });
      await refreshCatalogs();
    },
    [findSupplierByName, refreshCatalogs]
  );

  const deleteFixedCostItem = useCallback(
    async (name: string) => {
      if (blockReadOnlyMutation()) return;
      const item = findFixedByName(name);
      if (!item) return;
      await catalogService.deleteFixedItem(item.id);
      await refreshCatalogs();
    },
    [findFixedByName, refreshCatalogs]
  );

  const deleteProductCostItem = useCallback(
    async (name: string) => {
      if (blockReadOnlyMutation()) return;
      const item = findProductByName(name);
      if (!item) return;
      await catalogService.deleteProductItem(item.id);
      await refreshCatalogs();
    },
    [findProductByName, refreshCatalogs]
  );

  const deleteSupplier = useCallback(
    async (name: string) => {
      if (blockReadOnlyMutation()) return;
      const row = findSupplierByName(name);
      if (!row) return;
      await suppliersService.delete(row.id);
      await refreshCatalogs();
    },
    [findSupplierByName, refreshCatalogs]
  );

  /** Legacy alias — product cost item names for older modals */
  const itemNames = useMemo(() => productCostItems.map((i) => i.name), [productCostItems]);

  const addItemName = useCallback(
    (name: string) => {
      void addProductCostItem(name);
    },
    [addProductCostItem]
  );

  const renameItemName = useCallback(
    (oldName: string, newName: string) => {
      void renameProductCostItem(oldName, newName);
    },
    [renameProductCostItem]
  );

  const deleteItemName = useCallback(
    (name: string) => {
      void deleteProductCostItem(name);
    },
    [deleteProductCostItem]
  );

  // Memoize the context value so consumers only re-render when data they use
  // actually changes — not on every provider render. All callbacks below are
  // referentially stable (useCallback), so the deps are effectively the state.
  const value = useMemo<ERPContextType>(
    () => ({
      transactions,
      filteredTransactions,
      addTransaction,
      deleteTransaction,
      updateTransaction,
      clearAllData,
      dateRange,
      setDateRange,
      customStart,
      setCustomStart,
      customEnd,
      setCustomEnd,
      customDateRange,
      setCustomDateRange,
      stats,
      dailyRecords,
      isLoadingTransactions,
      refreshTransactions,
      ingestPostedSale,
      refreshCatalogs,
      fundMovements,
      refreshFundMovements,
      fundBalances,
      refreshFundBalances,
      fixedCostItems,
      productCostItems,
      suppliers,
      itemNames,
      addFixedCostItem,
      renameFixedCostItem,
      deleteFixedCostItem,
      addProductCostItem,
      renameProductCostItem,
      deleteProductCostItem,
      addItemName,
      renameItemName,
      deleteItemName,
      addSupplier,
      renameSupplier,
      deleteSupplier,
    }),
    [
      transactions,
      filteredTransactions,
      addTransaction,
      deleteTransaction,
      updateTransaction,
      clearAllData,
      dateRange,
      setDateRange,
      customStart,
      customEnd,
      customDateRange,
      setCustomDateRange,
      stats,
      dailyRecords,
      isLoadingTransactions,
      refreshTransactions,
      ingestPostedSale,
      refreshCatalogs,
      fundMovements,
      refreshFundMovements,
      fundBalances,
      refreshFundBalances,
      fixedCostItems,
      productCostItems,
      suppliers,
      itemNames,
      addFixedCostItem,
      renameFixedCostItem,
      deleteFixedCostItem,
      addProductCostItem,
      renameProductCostItem,
      deleteProductCostItem,
      addItemName,
      renameItemName,
      deleteItemName,
      addSupplier,
      renameSupplier,
      deleteSupplier,
    ]
  );

  // Stable action-only surface. All entries are referentially stable, so this
  // value never changes after mount → `useERPActions()` consumers never re-render
  // on data changes.
  const actionsValue = useMemo<ERPActions>(
    () => ({
      addTransaction,
      deleteTransaction,
      updateTransaction,
      clearAllData,
      setDateRange,
      setCustomStart,
      setCustomEnd,
      setCustomDateRange,
      refreshTransactions,
      refreshCatalogs,
      refreshFundMovements,
      refreshFundBalances,
      addFixedCostItem,
      renameFixedCostItem,
      deleteFixedCostItem,
      addProductCostItem,
      renameProductCostItem,
      deleteProductCostItem,
      addItemName,
      renameItemName,
      deleteItemName,
      addSupplier,
      renameSupplier,
      deleteSupplier,
    }),
    [
      addTransaction,
      deleteTransaction,
      updateTransaction,
      clearAllData,
      setCustomDateRange,
      refreshTransactions,
      refreshCatalogs,
      refreshFundMovements,
      refreshFundBalances,
      addFixedCostItem,
      renameFixedCostItem,
      deleteFixedCostItem,
      addProductCostItem,
      renameProductCostItem,
      deleteProductCostItem,
      addItemName,
      renameItemName,
      deleteItemName,
      addSupplier,
      renameSupplier,
      deleteSupplier,
    ]
  );

  return (
    <ERPActionsContext.Provider value={actionsValue}>
      <ERPContext.Provider value={value}>{children}</ERPContext.Provider>
    </ERPActionsContext.Provider>
  );
}
