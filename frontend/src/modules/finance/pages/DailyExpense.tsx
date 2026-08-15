import { useMemo, useCallback, useState } from 'react';
import {
  Pencil,
  Trash2,
  TrendingDown,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Banknote,
  Smartphone,
  Landmark,
  Tag,
  Layers,
  Search,
  X,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { useERP } from '@/core/context/useERP';
import { ManagerPasswordModal, EditTransactionModal, Pagination } from '@/shared/components/ui';
import { useClientPagination, useCanMutate } from '@/shared/hooks';
import type { Transaction } from '@/core/types';
import { handleError } from '@/shared/utils';
import { ExportDropdown, TRANSACTION_EXPORT_COLUMNS } from '@/shared/export';

// ─── Constants ────────────────────────────────────────────────────────────────

const TABLE_COLUMNS = ['Date', 'Type', 'Details', 'Supplier', 'Via', 'Cost', 'Actions'] as const;
type TableColumn = (typeof TABLE_COLUMNS)[number];

const RIGHT_ALIGNED_COLUMNS = new Set<TableColumn>(['Cost', 'Actions']);

const EXPENSE_TYPE_CONFIG: Record<string, { label: string; className: string }> = {
  expense_product: {
    label: 'Variable',
    className: 'bg-orange-50 text-orange-700 border border-orange-200',
  },
};
const DEFAULT_TYPE_CONFIG = {
  label: 'Fixed',
  className: 'bg-purple-50 text-purple-700 border border-purple-200',
};

const METHOD_CONFIG: Record<
  string,
  { label: string; icon: LucideIcon; color: string; bg: string; border: string }
> = {
  cash: {
    label: 'Cash',
    icon: Banknote,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-100',
  },
  bank: {
    label: 'Bank',
    icon: Landmark,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-100',
  },
  bkash: {
    label: 'bKash',
    icon: Smartphone,
    color: 'text-pink-600',
    bg: 'bg-pink-50',
    border: 'border-pink-100',
  },
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface SelectedMonth {
  year: number;
  month: number; // 0-indexed
}

interface PasswordModalState {
  isOpen: boolean;
  title: string;
  action: (() => void) | null;
  requiredRole: 'owner' | 'manager';
}

interface EditModalState {
  isOpen: boolean;
  transaction: Transaction | null;
}

type TypeFilterValue = 'all' | 'fixed' | 'variable';
type MethodFilterValue = 'all' | 'cash' | 'bank' | 'bkash';

const CLOSED_PASSWORD_MODAL: PasswordModalState = { isOpen: false, title: '', action: null, requiredRole: 'owner' };
const CLOSED_EDIT_MODAL: EditModalState = { isOpen: false, transaction: null };

// ─── Sub-components ───────────────────────────────────────────────────────────

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <tr>
      <td colSpan={TABLE_COLUMNS.length} className="px-4 py-16 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="p-4 bg-slate-50 rounded-2xl">
            <AlertCircle size={28} className="text-slate-300" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500">No expenses found</p>
            <p className="text-xs text-slate-400 mt-1 max-w-[200px] mx-auto leading-relaxed">
              {hasFilters
                ? 'Try adjusting your filters or search query'
                : 'No expenses recorded for this period'}
            </p>
          </div>
        </div>
      </td>
    </tr>
  );
}

interface MonthNavigatorProps {
  label: string;
  onPrev: () => void;
  onNext: () => void;
  disableNext: boolean;
}

function MonthNavigator({ label, onPrev, onNext, disableNext }: MonthNavigatorProps) {
  return (
    <div className="flex items-center justify-between sm:justify-center gap-1 bg-white border border-slate-200 rounded-xl px-2 py-1.5 shadow-sm w-full sm:w-auto">
      <button
        type="button"
        onClick={onPrev}
        aria-label="Previous month"
        className="p-2 sm:p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
      >
        <ChevronLeft size={16} />
      </button>
      <span className="text-sm font-bold text-slate-700 min-w-[130px] text-center select-none px-2">
        {label}
      </span>
      <button
        type="button"
        onClick={onNext}
        disabled={disableNext}
        aria-label="Next month"
        className="p-2 sm:p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DailyExpenseTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const amount: number = payload[0]?.value ?? 0;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xl p-3 text-xs min-w-[130px]">
      <p className="font-semibold text-slate-500 mb-1.5">Day {label}</p>
      <p className="text-sm font-extrabold text-rose-600">{amount.toLocaleString()} ৳</p>
      <p className="text-[10px] text-slate-400 mt-0.5">Total expenses</p>
    </div>
  );
}

interface MiniStatProps {
  label: string;
  value: string;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  valueColor?: string;
}

function MiniStat({
  label,
  value,
  icon: Icon,
  iconColor,
  iconBg,
  valueColor = 'text-slate-800',
}: MiniStatProps) {
  return (
    <div className="flex items-center gap-2.5 sm:gap-3 p-3 sm:p-3.5 bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
      <div className={`p-2 sm:p-2.5 rounded-lg sm:rounded-xl shrink-0 ${iconBg}`}>
        <Icon size={16} strokeWidth={2.5} className={iconColor} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1 truncate">
          {label}
        </p>
        <p
          className={`text-sm sm:text-base font-extrabold tabular-nums tracking-tight leading-none truncate ${valueColor}`}
          title={value}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

const now = new Date();

export default function DailyExpense() {
  const canMutate = useCanMutate();
  const { transactions, deleteTransaction, updateTransaction, itemNames, suppliers } = useERP();

  // ── Month selection ──────────────────────────────────────────────────────
  const [selectedMonth, setSelectedMonth] = useState<SelectedMonth>({
    year: now.getFullYear(),
    month: now.getMonth(),
  });

  const isCurrentMonth =
    selectedMonth.year === now.getFullYear() && selectedMonth.month === now.getMonth();

  const monthLabel = useMemo(
    () =>
      new Date(selectedMonth.year, selectedMonth.month, 1).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      }),
    [selectedMonth]
  );

  const goToPrevMonth = useCallback(
    () =>
      setSelectedMonth((prev) =>
        prev.month === 0
          ? { year: prev.year - 1, month: 11 }
          : { year: prev.year, month: prev.month - 1 }
      ),
    []
  );

  const goToNextMonth = useCallback(
    () =>
      setSelectedMonth((prev) =>
        prev.month === 11
          ? { year: prev.year + 1, month: 0 }
          : { year: prev.year, month: prev.month + 1 }
      ),
    []
  );

  // ── Filters ──────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilterValue>('all');
  const [methodFilter, setMethodFilter] = useState<MethodFilterValue>('all');

  // ── Derived data ─────────────────────────────────────────────────────────

  // Filter from all transactions (not filteredTransactions) so month navigation
  // is independent of any global date-range filter applied elsewhere in the app.
  const expenseTransactions = useMemo(
    () =>
      transactions.filter(
        (t) =>
          t.type.includes('expense') &&
          t.date instanceof Date &&
          t.date.getFullYear() === selectedMonth.year &&
          t.date.getMonth() === selectedMonth.month
      ),
    [transactions, selectedMonth]
  );

  const monthlyTotal = useMemo(
    () => expenseTransactions.reduce((sum, t) => sum + t.amount, 0),
    [expenseTransactions]
  );

  const fixedTotal = useMemo(
    () =>
      expenseTransactions
        .filter((t) => t.type !== 'expense_product')
        .reduce((s, t) => s + t.amount, 0),
    [expenseTransactions]
  );

  const variableTotal = useMemo(
    () =>
      expenseTransactions
        .filter((t) => t.type === 'expense_product')
        .reduce((s, t) => s + t.amount, 0),
    [expenseTransactions]
  );

  const activeDays = useMemo(
    () => new Set(expenseTransactions.map((t) => t.date.getDate())).size,
    [expenseTransactions]
  );

  const avgDailyExpense = activeDays > 0 ? Math.round(monthlyTotal / activeDays) : 0;

  const methodBreakdown = useMemo(() => {
    const b = { cash: 0, bank: 0, bkash: 0 };
    expenseTransactions.forEach((t) => {
      const method = t.method ?? 'cash';
      if (method in b) b[method as keyof typeof b] += t.amount;
    });
    return b;
  }, [expenseTransactions]);

  const topSuppliers = useMemo(() => {
    const map = new Map<string, number>();
    expenseTransactions.forEach((t) => {
      if (t.supplier) map.set(t.supplier, (map.get(t.supplier) ?? 0) + t.amount);
    });
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, total]) => ({ name, total }));
  }, [expenseTransactions]);

  const dailyChartData = useMemo(() => {
    const daysInMonth = new Date(selectedMonth.year, selectedMonth.month + 1, 0).getDate();
    const byDay = new Map<number, number>();
    expenseTransactions.forEach((t) => {
      const day = t.date.getDate();
      byDay.set(day, (byDay.get(day) ?? 0) + t.amount);
    });
    return Array.from({ length: daysInMonth }, (_, i) => ({
      day: i + 1,
      amount: byDay.get(i + 1) ?? 0,
    }));
  }, [expenseTransactions, selectedMonth]);

  const hasActiveFilters = searchQuery !== '' || typeFilter !== 'all' || methodFilter !== 'all';

  const filteredExpenses = useMemo(() => {
    return expenseTransactions.filter((t) => {
      if (
        searchQuery &&
        !t.description.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !(t.supplier ?? '').toLowerCase().includes(searchQuery.toLowerCase())
      )
        return false;
      if (typeFilter === 'variable' && t.type !== 'expense_product') return false;
      if (typeFilter === 'fixed' && t.type === 'expense_product') return false;
      if (methodFilter !== 'all' && t.method !== methodFilter) return false;
      return true;
    });
  }, [expenseTransactions, searchQuery, typeFilter, methodFilter]);

  // ── Modal state ──────────────────────────────────────────────────────────
  const [passwordModal, setPasswordModal] = useState<PasswordModalState>(CLOSED_PASSWORD_MODAL);
  const [editModal, setEditModal] = useState<EditModalState>(CLOSED_EDIT_MODAL);

  // ── Pagination ───────────────────────────────────────────────────────────
  const { paginatedData: paginatedExpenses, pagination } = useClientPagination(filteredExpenses, {
    initialPageSize: 10,
    pageSizeOptions: [5, 10, 20],
  });

  const exportConfig = useMemo(
    () => ({
      filenameBase: `expenses_${monthLabel.replace(/\s+/g, '_').toLowerCase()}`,
      title: 'Daily Expenses',
      subtitle: monthLabel,
      columns: TRANSACTION_EXPORT_COLUMNS,
      sheetName: 'Expenses',
      getData: () => filteredExpenses,
    }),
    [filteredExpenses, monthLabel]
  );

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleManagerDelete = useCallback(
    (id: string) => {
      setPasswordModal({
        isOpen: true,
        title: 'Delete Transaction',
        requiredRole: 'owner',
        action: async () => {
          try {
            await deleteTransaction(id);
            toast.success('Expense deleted successfully.');
          } catch (error) {
            handleError(error, {
              action: 'delete_expense',
              severity: 'high',
              metadata: { transactionId: id },
            });
          }
        },
      });
    },
    [deleteTransaction]
  );

  const handleManagerEdit = useCallback((transaction: Transaction) => {
    setPasswordModal({
      isOpen: true,
      title: 'Edit Transaction',
      requiredRole: 'owner',
      action: () => setEditModal({ isOpen: true, transaction }),
    });
  }, []);

  const handleSaveEdit = useCallback(
    (updated: Transaction) => {
      try {
        updateTransaction(updated);
        toast.success('Expense updated successfully.');
      } catch (error) {
        handleError(error, {
          action: 'update_expense',
          severity: 'high',
          metadata: { transactionId: updated.id },
        });
      }
    },
    [updateTransaction]
  );

  const handlePasswordConfirm = useCallback(() => {
    passwordModal.action?.();
    setPasswordModal(CLOSED_PASSWORD_MODAL);
  }, [passwordModal]);

  const handlePasswordClose = useCallback(() => setPasswordModal(CLOSED_PASSWORD_MODAL), []);
  const handleEditClose = useCallback(() => setEditModal(CLOSED_EDIT_MODAL), []);

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setTypeFilter('all');
    setMethodFilter('all');
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4 sm:space-y-6 pb-20 sm:pb-8 animate-in fade-in zoom-in-95">
      <ManagerPasswordModal
        isOpen={passwordModal.isOpen}
        onClose={handlePasswordClose}
        onConfirm={handlePasswordConfirm}
        title={passwordModal.title}
        requiredRole={passwordModal.requiredRole}
      />
      <EditTransactionModal
        isOpen={editModal.isOpen}
        onClose={handleEditClose}
        transaction={editModal.transaction}
        onSave={handleSaveEdit}
        itemNames={itemNames}
        suppliers={suppliers.map((s) => s.name)}
      />

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 md:p-6 bg-gradient-to-r from-rose-50 via-white to-slate-50 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
            <div className="flex items-center gap-3">
              <div className="p-2 sm:p-2.5 bg-rose-100 rounded-lg sm:rounded-xl text-rose-600 shadow-sm shrink-0">
                <TrendingDown size={20} className="sm:w-6 sm:h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-800 leading-tight">
                  Master Expense Register
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-500">
                  Monthly expense tracking &amp; management
                </p>
              </div>
            </div>
            <div className="w-full sm:w-auto">
              <MonthNavigator
                label={monthLabel}
                onPrev={goToPrevMonth}
                onNext={goToNextMonth}
                disableNext={isCurrentMonth}
              />
            </div>
          </div>

          {/* Stat cards - Grid updated for better mobile layout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
            <MiniStat
              label="Total Expenses"
              value={`${monthlyTotal.toLocaleString()} ৳`}
              icon={TrendingDown}
              iconColor="text-rose-600"
              iconBg="bg-rose-100"
              valueColor="text-rose-600"
            />
            <MiniStat
              label="Fixed Costs"
              value={`${fixedTotal.toLocaleString()} ৳`}
              icon={Layers}
              iconColor="text-purple-600"
              iconBg="bg-purple-100"
              valueColor="text-slate-800"
            />
            <MiniStat
              label="Variable Costs"
              value={`${variableTotal.toLocaleString()} ৳`}
              icon={Tag}
              iconColor="text-orange-600"
              iconBg="bg-orange-100"
              valueColor="text-slate-800"
            />
            <MiniStat
              label="Avg / Active Day"
              value={`${avgDailyExpense.toLocaleString()} ৳`}
              icon={ChevronRight}
              iconColor="text-indigo-600"
              iconBg="bg-indigo-100"
              valueColor="text-slate-800"
            />
          </div>
        </div>
      </div>

      {/* ── Analytics Row ───────────────────────────────────────────────── */}
      {expenseTransactions.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
          {/* Daily spend chart */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-sm font-bold text-slate-700">Daily Spend Pattern</h4>
                <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5">{monthLabel}</p>
              </div>
              <span className="text-[10px] sm:text-xs font-semibold text-slate-400 bg-slate-50 border border-slate-200 px-2 sm:px-2.5 py-1 rounded-lg whitespace-nowrap">
                {activeDays} active days
              </span>
            </div>
            <div className="w-full -ml-2 sm:ml-0">
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={dailyChartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                    interval={dailyChartData.length > 20 ? 4 : 2}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                    width={32}
                  />
                  <RechartsTooltip content={<DailyExpenseTooltip />} cursor={{ fill: '#f1f5f9' }} />
                  <Bar dataKey="amount" radius={[4, 4, 0, 0]} maxBarSize={28}>
                    {dailyChartData.map((entry) => (
                      <Cell
                        key={`cell-${entry.day}`}
                        fill={entry.amount > 0 ? '#fb7185' : '#f1f5f9'}
                        opacity={entry.amount > 0 ? 1 : 0.4}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Sidebar panels */}
          <div className="flex flex-col gap-4">
            {/* Payment method breakdown */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 flex-1">
              <h4 className="text-sm font-bold text-slate-700 mb-3">Payment Methods</h4>
              <div className="space-y-3 sm:space-y-2.5">
                {(Object.entries(METHOD_CONFIG) as [string, (typeof METHOD_CONFIG)[string]][]).map(
                  ([key, cfg]) => {
                    const amount = methodBreakdown[key as keyof typeof methodBreakdown];
                    const pct = monthlyTotal > 0 ? Math.round((amount / monthlyTotal) * 100) : 0;
                    const Icon = cfg.icon;
                    return (
                      <div key={key} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className={`p-1.5 rounded-lg ${cfg.bg}`}>
                              <Icon size={14} className={cfg.color} />
                            </div>
                            <span className="text-xs font-semibold text-slate-600">
                              {cfg.label}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-bold text-slate-700">
                              {amount.toLocaleString()} ৳
                            </span>
                            <span className="text-[10px] text-slate-400 ml-1.5 w-6 inline-block">
                              {pct}%
                            </span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              key === 'cash'
                                ? 'bg-emerald-400'
                                : key === 'bank'
                                  ? 'bg-blue-400'
                                  : 'bg-pink-400'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            </div>

            {/* Top suppliers */}
            {topSuppliers.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 flex-1">
                <h4 className="text-sm font-bold text-slate-700 mb-3">Top Suppliers</h4>
                <div className="space-y-2.5">
                  {topSuppliers.map(({ name, total }, idx) => (
                    <div key={name} className="flex items-center gap-2.5">
                      <span className="text-[10px] font-bold text-slate-400 w-4 shrink-0">
                        #{idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-slate-600 truncate mr-2">
                            {name}
                          </span>
                          <span className="text-xs font-bold text-slate-700 tabular-nums shrink-0">
                            {total.toLocaleString()} ৳
                          </span>
                        </div>
                        <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-rose-300 rounded-full"
                            style={{
                              width: `${Math.round((total / (topSuppliers[0]?.total || 1)) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Table Card ──────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Filter bar - Refactored for Mobile Layout */}
        <div className="p-4 md:p-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex flex-col space-y-3 sm:space-y-4">
            {/* Top Row: Search & Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Search */}
              <div className="relative w-full sm:max-w-xs">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <input
                  type="text"
                  placeholder="Search description or supplier…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-9 py-2 sm:py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-300 transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-200"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Actions (Export / Clear) */}
              <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-700 underline underline-offset-2 transition-colors"
                  >
                    Clear filters
                  </button>
                )}
                <div className="shrink-0">
                  <ExportDropdown config={exportConfig} disabled={filteredExpenses.length === 0} />
                </div>
              </div>
            </div>

            {/* Bottom Row: Filter Pills (Horizontal scroll on mobile) */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 -mx-4 px-4 sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {/* Type filter */}
              <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 shrink-0">
                {(['all', 'fixed', 'variable'] as const).map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setTypeFilter(val)}
                    className={`px-3 py-1.5 sm:py-1 text-[11px] font-bold rounded-md transition-colors capitalize whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 ${
                      typeFilter === val
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {val === 'all' ? 'All Types' : val}
                  </button>
                ))}
              </div>

              {/* Method filter */}
              <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 shrink-0">
                {(['all', 'cash', 'bank', 'bkash'] as const).map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setMethodFilter(val)}
                    className={`px-3 py-1.5 sm:py-1 text-[11px] font-bold rounded-md transition-colors capitalize whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 ${
                      methodFilter === val
                        ? 'bg-slate-700 text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {val === 'all'
                      ? 'All'
                      : val === 'bkash'
                        ? 'bKash'
                        : val.charAt(0).toUpperCase() + val.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Results summary */}
          {hasActiveFilters && (
            <p className="text-[11px] text-slate-500 mt-3 pt-3 border-t border-slate-200/60">
              Showing <span className="font-bold text-slate-700">{filteredExpenses.length}</span> of{' '}
              <span className="font-bold text-slate-700">{expenseTransactions.length}</span>{' '}
              expenses
            </p>
          )}
        </div>

        {/* Table - Edge to Edge responsive scroll */}
        <div className="overflow-x-auto overflow-y-auto max-h-[600px] w-full scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100 hover:scrollbar-thumb-slate-400">
          <table className="w-full text-left min-w-[750px]">
            <thead className="bg-slate-50 border-b-2 border-slate-200 sticky top-0 z-10">
              <tr>
                {TABLE_COLUMNS.map((col) => (
                  <th
                    key={col}
                    className={`px-4 sm:px-5 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider${
                      RIGHT_ALIGNED_COLUMNS.has(col) ? ' text-right' : ''
                    }`}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExpenses.length === 0 ? (
                <EmptyState hasFilters={hasActiveFilters} />
              ) : (
                paginatedExpenses.map((t) => {
                  const typeConfig = EXPENSE_TYPE_CONFIG[t.type] ?? DEFAULT_TYPE_CONFIG;
                  const methodCfg = METHOD_CONFIG[t.method ?? 'cash'];
                  const MethodIcon = methodCfg?.icon;
                  return (
                    <tr key={t.id} className="hover:bg-rose-50/40 transition-colors group">
                      <td className="px-4 sm:px-5 py-3 sm:py-3.5 text-xs font-medium text-slate-600 whitespace-nowrap">
                        {t.date?.toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-4 sm:px-5 py-3 sm:py-3.5">
                        <span
                          className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${typeConfig.className}`}
                        >
                          {typeConfig.label}
                        </span>
                      </td>
                      <td className="px-4 sm:px-5 py-3 sm:py-3.5 text-xs text-slate-700 max-w-[180px] sm:max-w-[220px]">
                        <span className="line-clamp-1">{t.description}</span>
                        {t.category && (
                          <span className="text-[10px] text-slate-400 block mt-1">
                            {t.category}
                          </span>
                        )}
                      </td>
                      <td className="px-4 sm:px-5 py-3 sm:py-3.5 text-xs text-slate-500">
                        {t.supplier ? (
                          <span className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-md px-2 py-0.5 text-[11px] font-medium text-slate-600">
                            {t.supplier}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-4 sm:px-5 py-3 sm:py-3.5">
                        {methodCfg ? (
                          <span
                            className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded-md whitespace-nowrap ${methodCfg.bg} ${methodCfg.color}`}
                          >
                            {MethodIcon && <MethodIcon size={12} />}
                            {methodCfg.label}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500 capitalize">{t.method}</span>
                        )}
                      </td>
                      <td className="px-4 sm:px-5 py-3 sm:py-3.5 text-right">
                        <span className="text-sm font-extrabold text-rose-600 tabular-nums whitespace-nowrap">
                          -{t.amount.toLocaleString()} ৳
                        </span>
                      </td>
                      <td className="px-4 sm:px-5 py-3 sm:py-3.5">
                        {canMutate && (
                          // Opacity remains 100% on touch devices, only hides on desktop until hover
                          <div className="flex gap-1.5 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity justify-end">
                            <button
                              onClick={() => handleManagerEdit(t)}
                              aria-label="Edit transaction (Owner Only)"
                              title="Edit (Owner Only)"
                              className="p-2 sm:p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 bg-slate-50 lg:bg-transparent rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => handleManagerDelete(t.id)}
                              aria-label="Delete transaction (Owner Only)"
                              title="Delete (Owner Only)"
                              className="p-2 sm:p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 bg-slate-50 lg:bg-transparent rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer: record count + pagination */}
        {filteredExpenses.length > 0 && (
          <div className="px-4 sm:px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-slate-500 w-full text-center md:text-left">
              <span className="font-bold text-slate-700">{filteredExpenses.length}</span> expense
              {filteredExpenses.length !== 1 ? 's' : ''} ·{' '}
              <span className="font-bold text-rose-600">
                {filteredExpenses.reduce((s, t) => s + t.amount, 0).toLocaleString()} ৳
              </span>{' '}
              total
            </p>
            <div className="w-full md:w-auto">
              <Pagination pagination={pagination} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
