import { useMemo, useState, useEffect, useRef } from 'react';
import {
  Calendar,
  Pencil,
  TrendingUp,
  TrendingDown,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Eye,
  X,
  DollarSign,
  Wallet,
  Activity,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { useERP } from '@/core/context/useERP';
import { computeDailyRecords } from '@/core/context/erp/dailyRecords';
import type { DailyRecord } from '@/core/types';
import { useClientPagination } from '@/shared/hooks';
import { ManagerPasswordModal, Pagination } from '@/shared/components/ui';
import { getStoredUser, handleError, canMutateData } from '@/shared/utils';
import { ExportDropdown, DAILY_RECORD_EXPORT_COLUMNS } from '@/shared/export';

// ─── Types ────────────────────────────────────────────────────────────────────
type SortField =
  | 'date'
  | 'totalSales'
  | 'cashSales'
  | 'bkashSales'
  | 'bankSales'
  | 'dailyCosts'
  | 'dailyAvail';

type EnrichedRecord = DailyRecord;

// ─── Column header config ─────────────────────────────────────────────────────
interface ColConfig {
  field: SortField;
  label: string;
  right?: boolean;
  dot?: string; // tailwind bg color for indicator dot
}

const COLS: ColConfig[] = [
  { field: 'date', label: 'Date' },
  { field: 'totalSales', label: 'Total Sales', right: true },
  { field: 'cashSales', label: 'Cash Received', right: true, dot: 'bg-emerald-500' },
  { field: 'bkashSales', label: 'bKash Received', right: true, dot: 'bg-fuchsia-500' },
  { field: 'bankSales', label: 'Bank Transfer', right: true, dot: 'bg-sky-500' },
  { field: 'dailyCosts', label: 'Total Expenses', right: true },
  { field: 'dailyAvail', label: 'Net Cash Flow', right: true },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return n.toLocaleString();
}

function AmountCell({
  value,
  positive,
  neutral,
  dot,
}: {
  value: number;
  positive?: boolean;
  neutral?: boolean;
  dot?: string;
}) {
  if (value === 0) return <span className="text-slate-300">—</span>;
  const color = neutral
    ? 'text-slate-700'
    : positive
      ? value >= 0
        ? 'text-emerald-600'
        : 'text-rose-500'
      : 'text-slate-700';
  return (
    <span
      className={`inline-flex items-center justify-end gap-1.5 font-semibold tabular-nums whitespace-nowrap ${color}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />}
      {fmt(value)} ৳
    </span>
  );
}

// ─── SummaryCard ──────────────────────────────────────────────────────────────
function SummaryCard({
  label,
  value,
  icon: Icon,
  iconColor,
  iconBg,
  valueColor = 'text-slate-800',
  sub,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  valueColor?: string;
  sub?: string;
}) {
  return (
    <div className="flex items-center gap-2.5 sm:gap-3 p-3 sm:p-4 bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
      <div className={`p-2 sm:p-2.5 rounded-lg sm:rounded-xl shrink-0 ${iconBg}`}>
        <Icon size={16} strokeWidth={2.5} className={iconColor} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1.5 truncate">
          {label}
        </p>
        <p
          className={`text-sm sm:text-base font-extrabold tabular-nums tracking-tight leading-none truncate ${valueColor}`}
          title={value}
        >
          {value}
        </p>
        {sub && (
          <p className="text-[9px] sm:text-[10px] text-slate-400 mt-1 leading-none truncate">
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

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
    <div className="flex items-center justify-between sm:justify-center gap-1 bg-white border border-slate-200 rounded-xl px-2 py-1.5 shadow-sm w-full sm:w-auto">
      <button
        type="button"
        onClick={onPrev}
        aria-label="Previous month"
        className="p-2 sm:p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
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
        className="p-2 sm:p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

export default function DailyRecord() {
  const now = new Date();
  const { transactions, addTransaction } = useERP();
  const canEdit = canMutateData(getStoredUser()?.role);

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

  const monthStart = useMemo(
    () => new Date(selectedMonth.year, selectedMonth.month, 1),
    [selectedMonth]
  );
  const monthEnd = useMemo(
    () => new Date(selectedMonth.year, selectedMonth.month + 1, 0, 23, 59, 59, 999),
    [selectedMonth]
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

  const monthTransactions = useMemo(
    () =>
      transactions.filter(
        (t) => t.date instanceof Date && t.date >= monthStart && t.date <= monthEnd
      ),
    [transactions, monthStart, monthEnd]
  );

  const monthDailyRecords = useMemo(
    () => computeDailyRecords(monthTransactions),
    [monthTransactions]
  );

  // ── Sort state ────────────────────────────────────────────────────────────
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  // ── Owner Password Modal ───────────────────────────────────────────────────
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [passwordModalTitle, setPasswordModalTitle] = useState('');

  // ── Edit Modal ─────────────────────────────────────────────────────────────
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<DailyRecord | null>(null);
  const [editValues, setEditValues] = useState({ cashSales: 0, bkashSales: 0, bankSales: 0 });

  // ── Detail Modal ───────────────────────────────────────────────────────────
  const [detailRecord, setDetailRecord] = useState<EnrichedRecord | null>(null);

  // ── Action row menu ────────────────────────────────────────────────────────
  const [openMenuDate, setOpenMenuDate] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openMenuDate) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuDate(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openMenuDate]);

  // ── Enrich records ─────────────────────────────────────────────────────────
  const enrichedRecords = useMemo<EnrichedRecord[]>(() => monthDailyRecords, [monthDailyRecords]);

  // ── Sort ───────────────────────────────────────────────────────────────────
  const sortedRecords = useMemo(() => {
    return [...enrichedRecords].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'date':
          cmp = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case 'totalSales':
          cmp = a.totalSales - b.totalSales;
          break;
        case 'cashSales':
          cmp = a.cashSales - b.cashSales;
          break;
        case 'bkashSales':
          cmp = a.bkashSales - b.bkashSales;
          break;
        case 'bankSales':
          cmp = a.bankSales - b.bankSales;
          break;
        case 'dailyCosts':
          cmp = a.dailyCosts - b.dailyCosts;
          break;
        case 'dailyAvail':
          cmp = a.dailyAvail - b.dailyAvail;
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [enrichedRecords, sortField, sortDir]);

  // ── Footer totals (full range, not just current page) ─────────────────────
  const totals = useMemo(() => {
    return enrichedRecords.reduce(
      (acc, r) => ({
        cashSales: acc.cashSales + r.cashSales,
        bkashSales: acc.bkashSales + r.bkashSales,
        bankSales: acc.bankSales + r.bankSales,
        dailyCosts: acc.dailyCosts + r.dailyCosts,
        dailyAvail: acc.dailyAvail + r.dailyAvail,
      }),
      {
        cashSales: 0,
        bkashSales: 0,
        bankSales: 0,
        dailyCosts: 0,
        dailyAvail: 0,
      }
    );
  }, [enrichedRecords]);

  // ── Period summary stats ───────────────────────────────────────────────────
  const summaryStats = useMemo(() => {
    if (enrichedRecords.length === 0) return null;
    const totalRevenue = enrichedRecords.reduce((s, r) => s + r.totalSales, 0);
    const totalExpenses = enrichedRecords.reduce((s, r) => s + r.dailyCosts, 0);
    const netCashFlow = enrichedRecords.reduce((s, r) => s + r.dailyAvail, 0);
    const profitableDays = enrichedRecords.filter((r) => r.dailyAvail > 0).length;
    const avgDailyRevenue = Math.round(totalRevenue / enrichedRecords.length);

    const bestDay = enrichedRecords.reduce((best, r) =>
      r.totalSales > best.totalSales ? r : best
    );
    const worstDay = enrichedRecords.reduce((worst, r) =>
      r.dailyAvail < worst.dailyAvail ? r : worst
    );

    return {
      totalRevenue,
      totalExpenses,
      netCashFlow,
      profitableDays,
      avgDailyRevenue,
      bestDay,
      worstDay,
      days: enrichedRecords.length,
    };
  }, [enrichedRecords]);

  const { paginatedData, pagination } = useClientPagination(sortedRecords, {
    initialPageSize: 10,
    pageSizeOptions: [5, 10, 20, 50],
  });

  const colSpan = COLS.length + 1; // +1 for the Actions column

  const exportConfig = useMemo(
    () => ({
      filenameBase: 'daily_records',
      title: 'Daily Records Report',
      subtitle: 'Day-by-day cash and expense summary',
      columns: DAILY_RECORD_EXPORT_COLUMNS,
      sheetName: 'Daily Records',
      getData: () => sortedRecords,
      summaryRows: sortedRecords.length
        ? ([
            ['TOTAL Cash (৳)', totals.cashSales],
            ['TOTAL bKash (৳)', totals.bkashSales],
            ['TOTAL Bank (৳)', totals.bankSales],
            ['TOTAL Expenses (৳)', totals.dailyCosts],
            ['TOTAL Net Flow (৳)', totals.dailyAvail],
          ] as Array<[string, string | number]>)
        : undefined,
    }),
    [sortedRecords, totals]
  );

  // ── Edit handlers ──────────────────────────────────────────────────────────
  const handleManagerEdit = (record: DailyRecord) => {
    setPasswordModalTitle('Edit Daily Sales');
    setPendingAction(() => () => {
      setEditingRecord(record);
      setEditValues({
        cashSales: Number(record.cashSales) || 0,
        bkashSales: Number(record.bkashSales) || 0,
        bankSales: Number(record.bankSales) || 0,
      });
      setEditModalOpen(true);
    });
    setPasswordModalOpen(true);
  };

  const handleSaveEdits = () => {
    try {
      if (!editingRecord?.date) return;
      const date = new Date(editingRecord.date);
      date.setHours(12, 0, 0, 0);
      const current = {
        cashSales: Number(editingRecord.cashSales) || 0,
        bkashSales: Number(editingRecord.bkashSales) || 0,
        bankSales: Number(editingRecord.bankSales) || 0,
      };
      const next = {
        cashSales: Number(editValues.cashSales) || 0,
        bkashSales: Number(editValues.bkashSales) || 0,
        bankSales: Number(editValues.bankSales) || 0,
      };
      const diffs = {
        cash: next.cashSales - current.cashSales,
        bkash: next.bkashSales - current.bkashSales,
        bank: next.bankSales - current.bankSales,
      };
      const dateLabel = new Date(editingRecord.date).toLocaleDateString();
      (['cash', 'bkash', 'bank'] as const).forEach((method) => {
        const diff = diffs[method];
        if (!diff) return;
        addTransaction({
          type: 'sale_adjustment',
          method,
          amount: diff,
          channel: 'in_store',
          description: `Sales adjustment (${dateLabel})`,
          date,
        });
      });
      setEditModalOpen(false);
      setEditingRecord(null);
      toast.success('Sales record updated');
    } catch (error) {
      handleError(error, { action: 'save_daily_record_edits', severity: 'high' });
    }
  };

  // ── Sort icon ──────────────────────────────────────────────────────────────
  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field)
      return <ChevronsUpDown size={12} className="text-slate-400 shrink-0" />;
    return sortDir === 'asc' ? (
      <ChevronUp size={12} className="text-indigo-500 shrink-0" />
    ) : (
      <ChevronDown size={12} className="text-indigo-500 shrink-0" />
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 pb-20 sm:pb-0">
      {/* ── Modals ── */}
      <ManagerPasswordModal
        isOpen={passwordModalOpen}
        onClose={() => {
          setPasswordModalOpen(false);
          setPendingAction(null);
        }}
        onConfirm={() => {
          if (pendingAction) pendingAction();
        }}
        title={passwordModalTitle}
      />

      {/* Edit Modal */}
      {editModalOpen && editingRecord && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-lg p-5 sm:p-6 pb-8 sm:pb-6 animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-indigo-100 p-3 rounded-xl text-indigo-600">
                <Pencil size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Edit Sales</h3>
                <p className="text-xs text-slate-500">
                  {new Date(editingRecord.date).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Grid fix: 1 col on mobile, 3 on desktop */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-3">
              {(['cashSales', 'bkashSales', 'bankSales'] as const).map((k) => (
                <div key={k}>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">
                    {k === 'cashSales' ? 'Cash' : k === 'bkashSales' ? 'bKash' : 'Bank'}
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={editValues[k]}
                    onChange={(e) => setEditValues((v) => ({ ...v, [k]: Number(e.target.value) }))}
                    className="w-full p-3 sm:p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
                  />
                </div>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-6">
              <button
                onClick={() => {
                  setEditModalOpen(false);
                  setEditingRecord(null);
                }}
                className="flex-1 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdits}
                className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detailRecord && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-md p-5 sm:p-6 pb-8 sm:pb-6 animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="bg-slate-100 p-2.5 rounded-xl">
                  <Calendar size={18} className="text-slate-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">Day Details</h3>
                  <p className="text-[11px] sm:text-xs text-slate-500">
                    {new Date(detailRecord.date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDetailRecord(null)}
                className="p-2 -mr-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
              >
                <X size={20} />
              </button>
            </div>

            {/* Revenue breakdown mini-bar */}
            {detailRecord.totalSales > 0 && (
              <div className="mb-4 p-3.5 sm:p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                  Revenue Breakdown
                </p>
                <div className="flex h-2 rounded-full overflow-hidden gap-px mb-2.5">
                  <div
                    className="bg-emerald-400 transition-all"
                    style={{
                      width: `${(detailRecord.cashSales / detailRecord.totalSales) * 100}%`,
                    }}
                  />
                  <div
                    className="bg-fuchsia-400 transition-all"
                    style={{
                      width: `${(detailRecord.bkashSales / detailRecord.totalSales) * 100}%`,
                    }}
                  />
                  <div
                    className="bg-sky-400 transition-all"
                    style={{
                      width: `${(detailRecord.bankSales / detailRecord.totalSales) * 100}%`,
                    }}
                  />
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-[10px] sm:text-xs text-slate-500 font-semibold">
                  {detailRecord.cashSales > 0 && (
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                      Cash {((detailRecord.cashSales / detailRecord.totalSales) * 100).toFixed(0)}%
                    </span>
                  )}
                  {detailRecord.bkashSales > 0 && (
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400 inline-block" />
                      bKash {((detailRecord.bkashSales / detailRecord.totalSales) * 100).toFixed(0)}
                      %
                    </span>
                  )}
                  {detailRecord.bankSales > 0 && (
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-400 inline-block" />
                      Bank {((detailRecord.bankSales / detailRecord.totalSales) * 100).toFixed(0)}%
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-2">
              {[
                { label: 'Cash Received', value: detailRecord.cashSales, dot: 'bg-emerald-500' },
                { label: 'bKash Received', value: detailRecord.bkashSales, dot: 'bg-fuchsia-500' },
                { label: 'Bank Transfer', value: detailRecord.bankSales, dot: 'bg-sky-500' },
                { label: 'Total Revenue', value: detailRecord.totalSales, bold: true },
                { label: 'Total Expenses', value: detailRecord.dailyCosts, negative: true },
              ].map((row) => (
                <div
                  key={row.label}
                  className={`flex justify-between items-center py-2 sm:py-1.5 ${row.bold ? 'border-t border-slate-100 pt-3 sm:pt-2.5 mt-1' : ''}`}
                >
                  <span
                    className={`text-xs sm:text-sm flex items-center gap-2 ${row.bold ? 'font-bold text-slate-700' : 'text-slate-500'}`}
                  >
                    {row.dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${row.dot}`} />}
                    {row.label}
                  </span>
                  <span
                    className={`text-xs sm:text-sm font-bold tabular-nums ${
                      row.negative && row.value > 0
                        ? 'text-rose-500'
                        : row.bold
                          ? 'text-slate-800'
                          : 'text-slate-700'
                    }`}
                  >
                    {row.negative && row.value > 0 ? '-' : ''}
                    {fmt(row.value)} ৳
                  </span>
                </div>
              ))}

              {/* Gross Profit row */}
              {(() => {
                const grossProfit = detailRecord.totalSales - detailRecord.dailyCosts;
                const margin =
                  detailRecord.totalSales > 0
                    ? ((grossProfit / detailRecord.totalSales) * 100).toFixed(1)
                    : '0.0';
                return (
                  <div className="border-t border-dashed border-slate-200 pt-3 sm:pt-2.5 mt-1 flex flex-wrap justify-between items-center gap-2">
                    <span className="text-xs sm:text-sm font-bold text-slate-600 flex items-center">
                      Gross Profit
                      <span className="ml-2 text-[10px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md">
                        {margin}% margin
                      </span>
                    </span>
                    <span
                      className={`text-xs sm:text-sm font-bold tabular-nums ${grossProfit >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}
                    >
                      {grossProfit >= 0 ? '+' : ''}
                      {fmt(grossProfit)} ৳
                    </span>
                  </div>
                );
              })()}

              <div className="border-t-2 border-slate-200 pt-3 mt-2 flex justify-between items-center">
                <span className="text-sm sm:text-base font-bold text-slate-700">Net Cash Flow</span>
                <span
                  className={`text-base sm:text-lg font-extrabold tabular-nums ${detailRecord.dailyAvail >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}
                >
                  {detailRecord.dailyAvail >= 0 ? '+' : ''}
                  {fmt(detailRecord.dailyAvail)} ৳
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Page Header ── */}
      <div className="p-4 md:p-6 border-b border-slate-100 bg-gradient-to-r from-indigo-50 via-white to-slate-50">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-2.5 bg-indigo-100 rounded-lg sm:rounded-xl text-indigo-600 shadow-sm shrink-0">
              <Calendar size={20} className="sm:w-5 sm:h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-800 leading-tight">
                Daily Records
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                Aggregated day-by-day performance
              </p>
            </div>
            {enrichedRecords.length > 0 && (
              <span className="hidden sm:inline-flex bg-indigo-50 text-indigo-600 border border-indigo-100 text-xs font-bold px-2.5 py-1 rounded-full tabular-nums ml-2">
                {enrichedRecords.length} days
              </span>
            )}
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            <div className="flex justify-end w-full sm:w-auto">
              <ExportDropdown config={exportConfig} disabled={sortedRecords.length === 0} />
            </div>
            <MonthNavigator
              label={monthLabel}
              onPrev={goToPrevMonth}
              onNext={goToNextMonth}
              disableNext={isCurrentMonth}
            />
          </div>
        </div>
      </div>

      {/* ── Period Summary Panel ── */}
      {summaryStats &&
        (() => {
          const totalRevForBar = totals.cashSales + totals.bkashSales + totals.bankSales;
          const cashPct =
            totalRevForBar > 0 ? Math.round((totals.cashSales / totalRevForBar) * 100) : 0;
          const bkashPct =
            totalRevForBar > 0 ? Math.round((totals.bkashSales / totalRevForBar) * 100) : 0;
          const bankPct = 100 - cashPct - bkashPct;
          const profitRate =
            summaryStats.days > 0
              ? Math.round((summaryStats.profitableDays / summaryStats.days) * 100)
              : 0;
          return (
            <div className="p-4 md:p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50/60 to-white space-y-4">
              {/* Stat cards grid - Mobile optimized columns */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                <SummaryCard
                  label="Total Revenue"
                  value={`${summaryStats.totalRevenue.toLocaleString()} ৳`}
                  icon={DollarSign}
                  iconColor="text-indigo-600"
                  iconBg="bg-indigo-100"
                  sub={`${summaryStats.days} day period`}
                />
                <SummaryCard
                  label="Total Expenses"
                  value={`${summaryStats.totalExpenses.toLocaleString()} ৳`}
                  icon={TrendingDown}
                  iconColor="text-rose-500"
                  iconBg="bg-rose-50"
                  valueColor="text-rose-600"
                />
                <SummaryCard
                  label="Net Cash Flow"
                  value={`${summaryStats.netCashFlow >= 0 ? '+' : ''}${summaryStats.netCashFlow.toLocaleString()} ৳`}
                  icon={Wallet}
                  iconColor={summaryStats.netCashFlow >= 0 ? 'text-emerald-600' : 'text-rose-500'}
                  iconBg={summaryStats.netCashFlow >= 0 ? 'bg-emerald-50' : 'bg-rose-50'}
                  valueColor={summaryStats.netCashFlow >= 0 ? 'text-emerald-600' : 'text-rose-500'}
                />
                <SummaryCard
                  label="Profitable Days"
                  value={`${summaryStats.profitableDays} / ${summaryStats.days}`}
                  icon={TrendingUp}
                  iconColor="text-emerald-600"
                  iconBg="bg-emerald-50"
                  valueColor="text-emerald-600"
                  sub={`${profitRate}% profitable`}
                />
                <SummaryCard
                  label="Daily Avg Revenue"
                  value={`${summaryStats.avgDailyRevenue.toLocaleString()} ৳`}
                  icon={Activity}
                  iconColor="text-sky-600"
                  iconBg="bg-sky-50"
                />
              </div>

              {/* Revenue channel split + best/worst day row */}
              <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4">
                {/* Revenue breakdown bar */}
                {totalRevForBar > 0 && (
                  <div className="flex-1 min-w-0 bg-white border border-slate-100 rounded-xl p-3.5 shadow-sm">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">
                      Revenue Channels
                    </p>
                    <div className="flex h-2 rounded-full overflow-hidden gap-px mb-2.5">
                      <div
                        className="bg-emerald-400 transition-all"
                        style={{ width: `${cashPct}%` }}
                      />
                      <div
                        className="bg-fuchsia-400 transition-all"
                        style={{ width: `${bkashPct}%` }}
                      />
                      <div className="bg-sky-400 transition-all" style={{ width: `${bankPct}%` }} />
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[10px] sm:text-xs font-semibold text-slate-500">
                      {cashPct > 0 && (
                        <span className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block shrink-0" />
                          Cash {cashPct}%
                        </span>
                      )}
                      {bkashPct > 0 && (
                        <span className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400 inline-block shrink-0" />
                          bKash {bkashPct}%
                        </span>
                      )}
                      {bankPct > 0 && (
                        <span className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-sky-400 inline-block shrink-0" />
                          Bank {bankPct}%
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Best / Worst day callouts */}
                <div className="flex flex-col sm:flex-row flex-wrap gap-3 shrink-0">
                  <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 flex-1 sm:flex-none">
                    <span className="text-sm shrink-0">★</span>
                    <div>
                      <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest leading-none mb-1">
                        Best Day
                      </p>
                      <p className="text-xs sm:text-sm font-bold text-emerald-800 tabular-nums">
                        {summaryStats.bestDay.date.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}{' '}
                        <span className="text-[10px] sm:text-xs font-semibold text-emerald-600 ml-1">
                          {summaryStats.bestDay.totalSales.toLocaleString()} ৳
                        </span>
                      </p>
                    </div>
                  </div>
                  {summaryStats.worstDay.dailyAvail < 0 && (
                    <div className="flex items-center gap-3 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3 flex-1 sm:flex-none">
                      <div>
                        <p className="text-[10px] font-bold text-rose-600 uppercase tracking-widest leading-none mb-1">
                          Worst Day
                        </p>
                        <p className="text-xs sm:text-sm font-bold text-rose-800 tabular-nums">
                          {summaryStats.worstDay.date.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}{' '}
                          <span className="text-[10px] sm:text-xs font-semibold text-rose-600 ml-1">
                            {summaryStats.worstDay.dailyAvail.toLocaleString()} ৳ net
                          </span>
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

      {/* ── Table ── */}
      <div className="overflow-x-auto overflow-y-auto max-h-[600px] w-full scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100 hover:scrollbar-thumb-slate-400">
        <table
          className={`w-full text-left ${canEdit ? 'min-w-[900px] lg:min-w-[1100px] xl:min-w-[1380px]' : 'min-w-[820px] lg:min-w-[1000px] xl:min-w-[1280px]'}`}
        >
          {/* Sticky header */}
          <thead className="sticky top-0 z-10 bg-slate-50 border-b-2 border-slate-200 shadow-sm">
            <tr>
              {COLS.map((col) => (
                <th
                  key={col.field}
                  onClick={() => handleSort(col.field)}
                  className={`px-4 sm:px-5 py-3.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider cursor-pointer select-none hover:bg-slate-100 transition-colors group ${col.right ? 'text-right' : ''}`}
                >
                  <div
                    className={`flex items-center gap-1.5 whitespace-nowrap ${col.right ? 'justify-end' : ''}`}
                  >
                    {col.dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${col.dot}`} />}
                    {col.label}
                    <SortIcon field={col.field} />
                  </div>
                </th>
              ))}
              {/* Actions column */}
              <th className="px-4 sm:px-5 py-3.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider text-right w-16">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {sortedRecords.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="p-4 bg-slate-50 rounded-2xl">
                      <Calendar size={28} className="text-slate-300" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-500">No records found</p>
                      <p className="text-xs text-slate-400 mt-1 max-w-[200px] mx-auto leading-relaxed">
                        Switch to a different month to view daily records
                      </p>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedData.map((r, idx) => (
                <tr
                  key={r.date.toISOString()}
                  className={`transition-colors duration-100 hover:bg-indigo-50/50 ${
                    idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                  }`}
                >
                  {/* Date — left border indicates profit/loss status */}
                  <td
                    className={`px-4 sm:px-5 py-3 sm:py-2.5 text-xs font-semibold text-slate-700 whitespace-nowrap border-l-2 ${
                      r.dailyAvail > 0
                        ? 'border-emerald-400'
                        : r.dailyAvail < 0
                          ? 'border-rose-400'
                          : 'border-slate-200'
                    }`}
                  >
                    {r.date.toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </td>

                  {/* Total Sales */}
                  <td className="px-4 sm:px-5 py-3 sm:py-2.5 text-right text-xs">
                    <span className="font-bold tabular-nums text-slate-800 whitespace-nowrap">
                      {r.totalSales > 0 ? (
                        `${fmt(r.totalSales)} ৳`
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </span>
                  </td>

                  {/* Cash Received */}
                  <td className="px-4 sm:px-5 py-3 sm:py-2.5 text-right text-xs">
                    <AmountCell value={r.cashSales} dot="bg-emerald-500" neutral />
                  </td>

                  {/* bKash Received */}
                  <td className="px-4 sm:px-5 py-3 sm:py-2.5 text-right text-xs">
                    <AmountCell value={r.bkashSales} dot="bg-fuchsia-500" neutral />
                  </td>

                  {/* Bank Transfer */}
                  <td className="px-4 sm:px-5 py-3 sm:py-2.5 text-right text-xs">
                    <AmountCell value={r.bankSales} dot="bg-sky-500" neutral />
                  </td>

                  {/* Total Expenses */}
                  <td className="px-4 sm:px-5 py-3 sm:py-2.5 text-right text-xs">
                    {r.dailyCosts > 0 ? (
                      <span className="text-rose-500 font-semibold tabular-nums whitespace-nowrap">
                        -{fmt(r.dailyCosts)} ৳
                      </span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>

                  {/* Net Cash Flow */}
                  <td className="px-4 sm:px-5 py-3 sm:py-2.5 text-right text-xs">
                    <span
                      className={`font-bold tabular-nums whitespace-nowrap ${r.dailyAvail >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}
                    >
                      {r.dailyAvail >= 0 ? '+' : ''}
                      {fmt(r.dailyAvail)} ৳
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-4 sm:px-5 py-3 sm:py-2.5 text-right">
                    <div
                      className="relative inline-block"
                      ref={openMenuDate === r.date.toISOString() ? menuRef : undefined}
                    >
                      <button
                        onClick={() =>
                          setOpenMenuDate((d) =>
                            d === r.date.toISOString() ? null : r.date.toISOString()
                          )
                        }
                        className="p-2 sm:p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                        title="Actions"
                      >
                        <MoreHorizontal size={16} />
                      </button>

                      {openMenuDate === r.date.toISOString() && (
                        <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-lg z-20 py-1.5 animate-in fade-in zoom-in-95 duration-100">
                          <button
                            onClick={() => {
                              setDetailRecord(r);
                              setOpenMenuDate(null);
                            }}
                            className="w-full flex items-center gap-2.5 px-4 py-2.5 sm:py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors focus-visible:outline-none focus-visible:bg-slate-50"
                          >
                            <Eye size={14} />
                            View Details
                          </button>
                          {canEdit && (
                            <button
                              onClick={() => {
                                setOpenMenuDate(null);
                                handleManagerEdit(r);
                              }}
                              className="w-full flex items-center gap-2.5 px-4 py-2.5 sm:py-2 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors focus-visible:outline-none focus-visible:bg-indigo-50"
                            >
                              <Pencil size={14} />
                              Edit Sales
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>

          {/* ── Summary Footer ── */}
          {enrichedRecords.length > 0 && (
            <tfoot className="sticky bottom-0 z-10 bg-slate-100 border-t-2 border-slate-300">
              <tr>
                <td className="px-4 sm:px-5 py-3.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap border-l-2 border-slate-400">
                  Total ({enrichedRecords.length} days)
                </td>
                {/* Total Sales footer */}
                <td className="px-4 sm:px-5 py-3.5 text-right">
                  <span className="text-xs font-bold text-slate-900 tabular-nums whitespace-nowrap">
                    {fmt(totals.cashSales + totals.bkashSales + totals.bankSales)} ৳
                  </span>
                </td>
                <td className="px-4 sm:px-5 py-3.5 text-right">
                  <span className="text-xs font-bold text-slate-800 tabular-nums whitespace-nowrap">
                    {fmt(totals.cashSales)} ৳
                  </span>
                </td>
                <td className="px-4 sm:px-5 py-3.5 text-right">
                  <span className="text-xs font-bold text-slate-800 tabular-nums whitespace-nowrap">
                    {fmt(totals.bkashSales)} ৳
                  </span>
                </td>
                <td className="px-4 sm:px-5 py-3.5 text-right">
                  <span className="text-xs font-bold text-slate-800 tabular-nums whitespace-nowrap">
                    {fmt(totals.bankSales)} ৳
                  </span>
                </td>
                <td className="px-4 sm:px-5 py-3.5 text-right">
                  <span className="text-xs font-bold text-rose-500 tabular-nums whitespace-nowrap">
                    -{fmt(totals.dailyCosts)} ৳
                  </span>
                </td>
                <td className="px-4 sm:px-5 py-3.5 text-right">
                  <span
                    className={`text-xs font-bold tabular-nums whitespace-nowrap ${totals.dailyAvail >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}
                  >
                    {totals.dailyAvail >= 0 ? '+' : ''}
                    {fmt(totals.dailyAvail)} ৳
                  </span>
                </td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* ── Pagination ── */}
      {enrichedRecords.length > 0 && (
        <div className="px-4 sm:px-5 py-4 sm:py-3.5 border-t border-slate-200 bg-slate-50 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs sm:text-sm text-slate-500 w-full text-center md:text-left leading-relaxed">
            <span className="font-bold text-slate-700">{enrichedRecords.length}</span> day
            {enrichedRecords.length !== 1 ? 's' : ''} ·{' '}
            <span className="font-bold text-indigo-600 whitespace-nowrap">
              {(totals.cashSales + totals.bkashSales + totals.bankSales).toLocaleString()} ৳
            </span>{' '}
            total revenue ·{' '}
            <span
              className={`font-bold whitespace-nowrap ${totals.dailyAvail >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}
            >
              {totals.dailyAvail >= 0 ? '+' : ''}
              {totals.dailyAvail.toLocaleString()} ৳
            </span>{' '}
            net flow
          </p>
          <div className="w-full md:w-auto">
            <Pagination pagination={pagination} showPageInfo={false} />
          </div>
        </div>
      )}
    </div>
  );
}
