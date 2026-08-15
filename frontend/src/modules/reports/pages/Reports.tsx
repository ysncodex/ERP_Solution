/**
 * Reports — financial summary for a selected period.
 *
 * Layout:
 *   1. Header       → period picker, comparison, export
 *   2. Summary        → revenue, expenses, net profit, margin
 *   3. P&L Statement  → expandable cost lines
 *   4. Details        → daily trend + sales channels
 */

import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  X,
  Store,
  Bike,
  Utensils,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Gift,
} from 'lucide-react';
import { useERP } from '@/core/context/useERP';
import { computeStats } from '@/core/context/erp/stats';
import { isPaidSale } from '@/core/types/transaction.types';
import { formatCurrency } from '@/shared/utils/formatters';
import { ExportDropdown, createReportExportConfig } from '@/shared/export';

type ComparisonPeriod = 'none' | 'previous' | 'year';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatPeriodLabel(from: Date | null, to: Date | null): string {
  if (!from || !to) return 'Current selection';
  const a = startOfDay(from);
  const b = startOfDay(to);
  if (a.getTime() === b.getTime()) {
    return a.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }
  const sameYear = a.getFullYear() === b.getFullYear();
  const fmt = (d: Date, withYear: boolean) =>
    d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      ...(withYear ? { year: 'numeric' } : {}),
    });
  return `${fmt(a, !sameYear)} – ${fmt(b, true)}`;
}

function pctOf(total: number, part: number) {
  return total > 0 ? ((part / total) * 100).toFixed(1) : '0.0';
}

const COMPARISON_OPTIONS: { value: ComparisonPeriod; label: string }[] = [
  { value: 'none', label: 'No comparison' },
  { value: 'previous', label: 'vs Previous period' },
  { value: 'year', label: 'vs Last year' },
];

function ComparisonSelect({
  value,
  onChange,
}: {
  value: ComparisonPeriod;
  onChange: (v: ComparisonPeriod) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = COMPARISON_OPTIONS.find((o) => o.value === value)?.label ?? 'No comparison';

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 min-w-[160px] px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50 shadow-sm transition-all"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="flex-1 text-left truncate">{selected}</span>
        <ChevronDown
          size={14}
          className={`text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute right-0 top-full mt-1 w-full min-w-[180px] bg-white border border-slate-200 rounded-lg shadow-lg z-50 py-1 overflow-hidden"
        >
          {COMPARISON_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="option"
              aria-selected={value === opt.value}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={`w-full text-left px-4 py-2.5 text-sm font-medium border-b border-slate-50 last:border-0 transition-colors ${
                value === opt.value
                  ? 'bg-slate-50 text-slate-900'
                  : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Expense Breakdown Drawer ─────────────────────────────────────────────────

function ExpensesDrawer({
  open,
  onClose,
  productCosts,
  fixedCosts,
  totalProductCost,
  totalFixedCost,
}: {
  open: boolean;
  onClose: () => void;
  productCosts: Array<{ name: string; cost: number; qty: number; unit: string }>;
  fixedCosts: Array<{ name: string; amount: number }>;
  totalProductCost: number;
  totalFixedCost: number;
}) {
  const total = totalProductCost + totalFixedCost;
  return (
    <>
      {open && <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-sm bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900">Expense Breakdown</h3>
            <p className="text-xs text-slate-500 mt-0.5">{formatCurrency(total)} total</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          <section>
            <div className="flex justify-between mb-2">
              <h4 className="text-sm font-bold text-slate-700">Variable (COGS)</h4>
              <span className="text-sm font-bold text-orange-600">
                {formatCurrency(totalProductCost)}
              </span>
            </div>
            <div className="space-y-1.5">
              {productCosts.map((item) => (
                <div
                  key={item.name}
                  className="flex justify-between text-sm px-3 py-2 bg-orange-50 rounded-lg"
                >
                  <span className="text-slate-700">{item.name}</span>
                  <span className="font-semibold text-orange-600">{formatCurrency(item.cost)}</span>
                </div>
              ))}
              {productCosts.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-3">No product costs</p>
              )}
            </div>
          </section>
          <section>
            <div className="flex justify-between mb-2">
              <h4 className="text-sm font-bold text-slate-700">Fixed (OpEx)</h4>
              <span className="text-sm font-bold text-purple-600">
                {formatCurrency(totalFixedCost)}
              </span>
            </div>
            <div className="space-y-1.5">
              {fixedCosts.map((item) => (
                <div
                  key={item.name}
                  className="flex justify-between text-sm px-3 py-2 bg-purple-50 rounded-lg"
                >
                  <span className="text-slate-700">{item.name}</span>
                  <span className="font-semibold text-purple-600">
                    {formatCurrency(item.amount)}
                  </span>
                </div>
              ))}
              {fixedCosts.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-3">No fixed costs</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

// ─── Small UI pieces ──────────────────────────────────────────────────────────

function DeltaBadge({
  change,
  pct,
  invert = false,
}: {
  change: number;
  pct: number;
  invert?: boolean;
}) {
  const good = invert ? change <= 0 : change >= 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
        good ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
      }`}
    >
      {change >= 0 ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
      {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

function SummaryCard({
  label,
  value,
  tone = 'neutral',
  onClick,
  delta,
  compareLabel,
}: {
  label: string;
  value: string;
  tone?: 'neutral' | 'positive' | 'negative' | 'expense';
  onClick?: () => void;
  delta?: { change: number; pct: number; invert?: boolean };
  compareLabel?: string;
}) {
  const tones = {
    neutral: 'bg-white border-slate-200',
    positive: 'bg-gradient-to-br from-emerald-600 to-emerald-800 border-emerald-600 text-white',
    negative: 'bg-gradient-to-br from-rose-600 to-rose-800 border-rose-600 text-white',
    expense: 'bg-white border-slate-200 hover:border-rose-300',
  };
  const isColored = tone === 'positive' || tone === 'negative';
  const Tag = onClick ? 'button' : 'div';

  return (
    <Tag
      onClick={onClick}
      className={`p-5 rounded-xl border shadow-sm text-left w-full transition-all ${tones[tone]} ${onClick ? 'cursor-pointer hover:shadow-md' : ''}`}
    >
      <p
        className={`text-xs font-bold uppercase tracking-wider mb-1 ${isColored ? 'text-white/80' : 'text-slate-500'}`}
      >
        {label}
      </p>
      <p className={`text-2xl font-extrabold ${isColored ? 'text-white' : 'text-slate-900'}`}>
        {value}
      </p>
      {delta && compareLabel && (
        <div className="mt-2 flex items-center gap-2">
          <DeltaBadge change={delta.change} pct={delta.pct} invert={delta.invert} />
          <span className={`text-xs ${isColored ? 'text-white/60' : 'text-slate-400'}`}>
            vs {compareLabel}
          </span>
        </div>
      )}
      {onClick && <p className="text-xs text-rose-500 mt-2 font-medium">Tap for breakdown →</p>}
    </Tag>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
        {label}
      </span>
      <div className="flex-1 h-px bg-slate-100" />
    </div>
  );
}

const CHANNELS = [
  {
    key: 'inStore' as const,
    label: 'In-Store',
    icon: Store,
    bar: 'bg-teal-500',
    text: 'text-teal-700',
    bg: 'bg-teal-50',
  },
  {
    key: 'foodpanda' as const,
    label: 'Foodpanda',
    icon: Bike,
    bar: 'bg-orange-500',
    text: 'text-orange-700',
    bg: 'bg-orange-50',
  },
  {
    key: 'foodi' as const,
    label: 'Foodi',
    icon: Utensils,
    bar: 'bg-violet-500',
    text: 'text-violet-700',
    bg: 'bg-violet-50',
  },
];

interface SelectedMonth {
  year: number;
  month: number;
}

interface MonthNavigatorProps {
  label: string;
  onPrev: () => void;
  onNext: () => void;
  disableNext: boolean;
}

function MonthNavigator({ label, onPrev, onNext, disableNext }: MonthNavigatorProps) {
  return (
    <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-2 py-1.5 shadow-sm">
      <button
        type="button"
        onClick={onPrev}
        aria-label="Previous month"
        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
      >
        <ChevronLeft size={15} />
      </button>
      <span className="text-sm font-bold text-slate-700 min-w-[130px] text-center select-none px-1">
        {label}
      </span>
      <button
        type="button"
        onClick={onNext}
        disabled={disableNext}
        aria-label="Next month"
        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <ChevronRight size={15} />
      </button>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Reports() {
  const { transactions, fundMovements } = useERP();
  const now = new Date();

  const [comparisonPeriod, setComparisonPeriod] = useState<ComparisonPeriod>('none');
  const [selectedMonth, setSelectedMonth] = useState<SelectedMonth>({
    year: now.getFullYear(),
    month: now.getMonth(),
  });
  const [expensesOpen, setExpensesOpen] = useState(false);
  const [cogsOpen, setCogsOpen] = useState(false);
  const [opexOpen, setOpexOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpensesOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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

  const monthStart = useMemo(
    () => new Date(selectedMonth.year, selectedMonth.month, 1),
    [selectedMonth]
  );
  const monthEnd = useMemo(
    () => new Date(selectedMonth.year, selectedMonth.month + 1, 0, 23, 59, 59, 999),
    [selectedMonth]
  );

  const monthTransactions = useMemo(
    () =>
      transactions.filter(
        (t) => t.date instanceof Date && t.date >= monthStart && t.date <= monthEnd
      ),
    [transactions, monthStart, monthEnd]
  );

  const stats = useMemo(
    () => computeStats(transactions, monthTransactions, fundMovements),
    [transactions, monthTransactions, fundMovements]
  );

  const goToPrevMonth = () =>
    setSelectedMonth((prev) =>
      prev.month === 0
        ? { year: prev.year - 1, month: 11 }
        : { year: prev.year, month: prev.month - 1 }
    );

  const goToNextMonth = () =>
    setSelectedMonth((prev) =>
      prev.month === 11
        ? { year: prev.year + 1, month: 0 }
        : { year: prev.year, month: prev.month + 1 }
    );

  const resetToCurrentMonth = () => {
    const today = new Date();
    setSelectedMonth({ year: today.getFullYear(), month: today.getMonth() });
  };

  const comparison = useMemo(() => {
    if (comparisonPeriod === 'none') return null;

    const start = monthStart;
    const end = monthEnd;
    const days = Math.ceil((end.getTime() - start.getTime()) / 86_400_000);

    let cmpStart: Date;
    let cmpEnd: Date;
    if (comparisonPeriod === 'previous') {
      cmpEnd = new Date(start);
      cmpEnd.setDate(cmpEnd.getDate() - 1);
      cmpStart = new Date(cmpEnd);
      cmpStart.setDate(cmpStart.getDate() - days);
    } else {
      cmpStart = new Date(start);
      cmpStart.setFullYear(cmpStart.getFullYear() - 1);
      cmpEnd = new Date(end);
      cmpEnd.setFullYear(cmpEnd.getFullYear() - 1);
    }

    const cmpTx = transactions.filter(
      (t) => t.date instanceof Date && t.date >= cmpStart && t.date <= cmpEnd
    );
    const sales = cmpTx
      .filter((t) => t.type === 'sale' || t.type === 'sale_adjustment')
      .reduce((s, t) => s + t.amount, 0);
    const expenses = cmpTx
      .filter((t) => t.type === 'expense_product' || t.type === 'expense_fixed')
      .reduce((s, t) => s + t.amount, 0);
    const profit = sales - expenses;

    return {
      label: comparisonPeriod === 'previous' ? 'previous period' : 'same period last year',
      salesChange: stats.totalSales - sales,
      salesPct: sales > 0 ? ((stats.totalSales - sales) / sales) * 100 : 0,
      expensesChange: stats.totalExpenses - expenses,
      expensesPct: expenses > 0 ? ((stats.totalExpenses - expenses) / expenses) * 100 : 0,
      profitChange: stats.profit - profit,
      profitPct: profit !== 0 ? ((stats.profit - profit) / Math.abs(profit)) * 100 : 0,
    };
  }, [comparisonPeriod, monthStart, monthEnd, transactions, stats]);

  const profitMargin = stats.totalSales > 0 ? (stats.profit / stats.totalSales) * 100 : 0;
  const grossMargin = stats.totalSales > 0 ? (stats.grossProfit / stats.totalSales) * 100 : 0;

  const channels = useMemo(() => {
    const foodpanda = stats.foodpandaSales;
    const foodi = stats.foodiSales;
    const inStore = Math.max(0, stats.totalSales - foodpanda - foodi);
    const total = stats.totalSales || 1;
    return {
      inStore: { revenue: inStore, share: (inStore / total) * 100 },
      foodpanda: { revenue: foodpanda, share: (foodpanda / total) * 100 },
      foodi: { revenue: foodi, share: (foodi / total) * 100 },
    };
  }, [stats]);

  const trendData = useMemo(() => {
    const map = new Map<string, { sales: number; expenses: number }>();
    for (const t of monthTransactions) {
      if (!t.date) continue;
      const key = t.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const row = map.get(key) ?? { sales: 0, expenses: 0 };
      if (t.type === 'sale' || t.type === 'sale_adjustment') row.sales += t.amount;
      else if (t.type === 'expense_product' || t.type === 'expense_fixed') row.expenses += t.amount;
      map.set(key, row);
    }
    return [...map.entries()]
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .slice(-7)
      .map(([date, data]) => ({ date, ...data }));
  }, [monthTransactions]);

  const maxBar = Math.max(...trendData.flatMap((d) => [d.sales, d.expenses]), 1);

  const giftStats = useMemo(() => {
    let itemCount = 0;
    let totalValue = 0;
    for (const t of monthTransactions) {
      if (!isPaidSale(t)) continue;
      itemCount += t.giftItemCount ?? 0;
      totalValue += t.giftTotalValue ?? 0;
    }
    return { itemCount, totalValue };
  }, [monthTransactions]);

  const periodLabel = formatPeriodLabel(monthStart, monthEnd);
  const hasData = monthTransactions.length > 0;

  const reportExportInput = useMemo(
    () => ({
      stats,
      periodLabel,
      profitMargin,
      grossMargin,
      expenseRatio: pctOf(stats.totalSales, stats.totalExpenses),
      channels,
      trendData,
    }),
    [periodLabel, stats, profitMargin, grossMargin, channels, trendData]
  );

  const exportConfig = useMemo(
    () => createReportExportConfig(reportExportInput),
    [reportExportInput]
  );

  return (
    <div className="space-y-6 pb-16 animate-in slide-in-from-bottom-2">
      <ExpensesDrawer
        open={expensesOpen}
        onClose={() => setExpensesOpen(false)}
        productCosts={stats.topProducts}
        fixedCosts={stats.topFixed}
        totalProductCost={stats.totalProductCost}
        totalFixedCost={stats.totalFixedCost}
      />

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Financial Report</h2>
          <p className="text-sm text-slate-500 mt-1 flex items-center gap-1.5">
            <Calendar size={14} />
            {periodLabel}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <MonthNavigator
            label={monthLabel}
            onPrev={goToPrevMonth}
            onNext={goToNextMonth}
            disableNext={isCurrentMonth}
          />
          <ComparisonSelect value={comparisonPeriod} onChange={setComparisonPeriod} />
          <ExportDropdown config={exportConfig} disabled={!hasData} />
        </div>
      </div>

      {/* Empty state */}
      {!hasData && (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <BarChart3 size={36} className="text-slate-300 mx-auto mb-3" />
          <p className="font-semibold text-slate-700">No transactions in this period</p>
          <p className="text-sm text-slate-400 mt-1">Pick a different date range above.</p>
          <button
            onClick={resetToCurrentMonth}
            className="mt-4 text-sm font-semibold text-emerald-600 hover:text-emerald-700"
          >
            Reset to current month
          </button>
        </div>
      )}

      {hasData && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryCard
              label="Total Revenue"
              value={formatCurrency(stats.totalSales)}
              delta={
                comparison
                  ? { change: comparison.salesChange, pct: comparison.salesPct }
                  : undefined
              }
              compareLabel={comparison?.label}
            />
            <SummaryCard
              label="Total Expenses"
              value={formatCurrency(stats.totalExpenses)}
              tone="expense"
              onClick={() => setExpensesOpen(true)}
              delta={
                comparison
                  ? { change: comparison.expensesChange, pct: comparison.expensesPct, invert: true }
                  : undefined
              }
              compareLabel={comparison?.label}
            />
            <SummaryCard
              label={stats.profit >= 0 ? 'Net Profit' : 'Net Loss'}
              value={`${stats.profit >= 0 ? '+' : ''}${formatCurrency(Math.abs(stats.profit))}`}
              tone={stats.profit >= 0 ? 'positive' : 'negative'}
              delta={
                comparison
                  ? { change: comparison.profitChange, pct: comparison.profitPct }
                  : undefined
              }
              compareLabel={comparison?.label}
            />
            <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                Key Ratios
              </p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Profit margin</span>
                  <span className="font-bold text-emerald-600">{profitMargin.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Gross margin</span>
                  <span className="font-bold text-blue-600">{grossMargin.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Expense ratio</span>
                  <span className="font-bold text-orange-600">
                    {pctOf(stats.totalSales, stats.totalExpenses)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {giftStats.itemCount > 0 && (
            <div className="flex items-center gap-4 p-4 rounded-xl border border-emerald-200 bg-emerald-50/60">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                <Gift size={20} className="text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-emerald-800">Complimentary Items</p>
                <p className="text-xs text-emerald-600 mt-0.5">
                  {giftStats.itemCount} gift item{giftStats.itemCount === 1 ? '' : 's'} · retail
                  value {formatCurrency(giftStats.totalValue)}
                </p>
              </div>
            </div>
          )}

          {/* P&L + Channels */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Profit & Loss */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
                <h3 className="font-bold text-slate-800">Profit & Loss</h3>
                <p className="text-xs text-slate-500 mt-0.5">How revenue flows to net profit</p>
              </div>
              <div className="px-6 py-5 space-y-4">
                {/* Revenue */}
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-800">Total Sales</span>
                  <div className="text-right">
                    <span className="font-bold text-slate-900">
                      {formatCurrency(stats.totalSales)}
                    </span>
                    <span className="text-xs text-slate-400 ml-2">100%</span>
                  </div>
                </div>

                {/* COGS */}
                <div>
                  <button
                    onClick={() => setCogsOpen((v) => !v)}
                    className="w-full flex justify-between items-center group"
                  >
                    <span className="flex items-center gap-1.5 text-rose-600 font-medium">
                      {cogsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      (−) Variable Costs
                    </span>
                    <div className="text-right">
                      <span className="font-bold text-rose-600">
                        ({formatCurrency(stats.totalProductCost)})
                      </span>
                      <span className="text-xs text-rose-400 ml-2">
                        ({pctOf(stats.totalSales, stats.totalProductCost)}%)
                      </span>
                    </div>
                  </button>
                  {cogsOpen && stats.topProducts.length > 0 && (
                    <div className="mt-2 ml-5 space-y-1 border-l-2 border-rose-100 pl-3">
                      {stats.topProducts.map((item) => (
                        <div
                          key={item.name}
                          className="flex justify-between text-sm text-slate-600 py-0.5"
                        >
                          <span>{item.name}</span>
                          <span className="font-medium text-rose-500">
                            {formatCurrency(item.cost)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Gross profit */}
                <div className="flex justify-between items-center py-2 px-3 bg-slate-50 rounded-lg">
                  <span className="font-semibold text-slate-700">Gross Profit</span>
                  <div className="text-right">
                    <span
                      className={`font-bold ${stats.grossProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}
                    >
                      {formatCurrency(stats.grossProfit)}
                    </span>
                    <span className="text-xs text-slate-400 ml-2">
                      ({pctOf(stats.totalSales, stats.grossProfit)}%)
                    </span>
                  </div>
                </div>

                {/* OpEx */}
                <div>
                  <button
                    onClick={() => setOpexOpen((v) => !v)}
                    className="w-full flex justify-between items-center group"
                  >
                    <span className="flex items-center gap-1.5 text-purple-600 font-medium">
                      {opexOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      (−) Fixed Costs
                    </span>
                    <div className="text-right">
                      <span className="font-bold text-purple-600">
                        ({formatCurrency(stats.totalFixedCost)})
                      </span>
                      <span className="text-xs text-purple-400 ml-2">
                        ({pctOf(stats.totalSales, stats.totalFixedCost)}%)
                      </span>
                    </div>
                  </button>
                  {opexOpen && stats.topFixed.length > 0 && (
                    <div className="mt-2 ml-5 space-y-1 border-l-2 border-purple-100 pl-3">
                      {stats.topFixed.map((item) => (
                        <div
                          key={item.name}
                          className="flex justify-between text-sm text-slate-600 py-0.5"
                        >
                          <span>{item.name}</span>
                          <span className="font-medium text-purple-500">
                            {formatCurrency(item.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border-t-2 border-slate-900 pt-4 flex justify-between items-center">
                  <span
                    className={`text-lg font-black uppercase ${stats.profit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}
                  >
                    {stats.profit >= 0 ? 'Net Profit' : 'Net Loss'}
                  </span>
                  <span
                    className={`text-2xl font-black ${stats.profit >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}
                  >
                    {formatCurrency(stats.profit)}
                  </span>
                </div>
              </div>
            </div>

            {/* Sales channels */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="font-bold text-slate-800">Sales Channels</h3>
                <p className="text-xs text-slate-500 mt-0.5">Where revenue comes from</p>
              </div>
              <div className="p-5 space-y-4">
                {CHANNELS.map(({ key, label, icon: Icon, bar, text, bg }) => {
                  const ch = channels[key];
                  return (
                    <div key={key}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center ${bg}`}
                          >
                            <Icon size={14} className={text} />
                          </div>
                          <span className="text-sm font-semibold text-slate-700">{label}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-bold text-slate-800">
                            {formatCurrency(ch.revenue)}
                          </span>
                          <span className="text-xs text-slate-400 ml-1">
                            {ch.share.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${bar}`}
                          style={{ width: `${Math.min(ch.share, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Daily trend */}
          {trendData.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <Divider label="Daily Trend (last 7 days)" />
              <div className="mt-4 space-y-3">
                {trendData.map((day) => (
                  <div key={day.date} className="flex items-center gap-3">
                    <span className="w-14 text-xs font-medium text-slate-500 shrink-0">
                      {day.date}
                    </span>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <TrendingUp size={12} className="text-emerald-500 shrink-0" />
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full"
                            style={{ width: `${(day.sales / maxBar) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-slate-600 w-16 text-right tabular-nums">
                          {formatCurrency(day.sales)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <TrendingDown size={12} className="text-rose-500 shrink-0" />
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-rose-400 rounded-full"
                            style={{ width: `${(day.expenses / maxBar) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-slate-600 w-16 text-right tabular-nums">
                          {formatCurrency(day.expenses)}
                        </span>
                      </div>
                    </div>
                    <span
                      className={`text-xs font-bold w-20 text-right tabular-nums ${day.sales - day.expenses >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}
                    >
                      {day.sales - day.expenses >= 0 ? '+' : ''}
                      {formatCurrency(day.sales - day.expenses)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex gap-4 mt-4 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> Revenue
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-400" /> Expenses
                </span>
                <span className="ml-auto">Right column = daily net</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
