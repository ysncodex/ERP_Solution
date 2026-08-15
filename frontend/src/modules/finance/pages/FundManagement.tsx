import { useState, useMemo, useCallback } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Wallet,
  ArrowRightLeft,
  ArrowDownToLine,
  ArrowUpFromLine,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Banknote,
  Smartphone,
  Landmark,
  Vault,
  Search,
  X,
  Trash2,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react';
import { useERP } from '@/core/context/useERP';
import { fundsService } from '@/core/api/services';
import type { FundAccountType, FundMovement } from '@/core/types/fund.types';
import { ManagerPasswordModal, ButtonLoading, Pagination } from '@/shared/components/ui';
import { useClientPagination, useCanMutate } from '@/shared/hooks';
import { handleError, formatCurrency, formatDate } from '@/shared/utils';
import { ExportDropdown } from '@/shared/export';
import type { ColDef } from '@/shared/export';

const MOVEMENT_TYPE_LABELS: Record<FundMovement['movementType'], string> = {
  transfer: 'Fund Transfer',
  add: 'Funds Added',
  withdraw: 'Funds Withdrawn',
  opening: 'Opening Balance',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ─── Constants & Config ───────────────────────────────────────────────────────

const ACCOUNT_CONFIG: Record<
  string,
  { label: string; icon: LucideIcon; color: string; bg: string; border: string }
> = {
  cash: {
    label: 'Cash Drawer',
    icon: Banknote,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-100',
  },
  bank: {
    label: 'Bank Account',
    icon: Landmark,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-100',
  },
  bkash: {
    label: 'bKash Wallet',
    icon: Smartphone,
    color: 'text-pink-600',
    bg: 'bg-pink-50',
    border: 'border-pink-100',
  },
  reserve: {
    label: 'Reserve Fund',
    icon: Vault,
    color: 'text-purple-600',
    bg: 'bg-purple-50',
    border: 'border-purple-100',
  },
  external: {
    label: 'External / Owner',
    icon: Wallet,
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    border: 'border-orange-100',
  },
};

const MOVEMENT_TYPES = [
  { value: 'transfer', label: 'Transfer Between Accounts', icon: ArrowRightLeft },
  { value: 'add', label: 'Add Extra Funds / Investment', icon: ArrowDownToLine },
  { value: 'withdraw', label: 'Withdrawal / Drawings', icon: ArrowUpFromLine },
  { value: 'opening', label: 'Opening Balance (Prev Month)', icon: Wallet },
] as const;

// ─── Form Schema ──────────────────────────────────────────────────────────────

const fundMovementSchema = z
  .object({
    movementType: z.enum(['transfer', 'add', 'withdraw', 'opening']),
    fromAccount: z.string().optional(),
    toAccount: z.string().optional(),
    // Reverted back to string parsing to prevent TS conflicts
    amount: z
      .string()
      .min(1, 'Amount is required')
      .refine((val) => !isNaN(Number(val)) && Number(val) > 0, 'Must be greater than 0'),
    date: z.string().min(1, 'Date is required'),
    notes: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.movementType === 'transfer') {
        return !!data.fromAccount && !!data.toAccount && data.fromAccount !== data.toAccount;
      }
      if (data.movementType === 'add' || data.movementType === 'opening') {
        return !!data.toAccount;
      }
      if (data.movementType === 'withdraw') {
        return !!data.fromAccount;
      }
      return true;
    },
    {
      message: 'Please select valid accounts for this movement',
      path: ['toAccount'], // Attach error to the toAccount field generally
    }
  );

type FundMovementFormData = z.infer<typeof fundMovementSchema>;

// ─── Sub-components ───────────────────────────────────────────────────────────

interface SelectedMonth {
  year: number;
  month: number;
}

function MonthNavigator({
  label,
  onPrev,
  onNext,
  disableNext,
}: {
  label: string;
  onPrev: () => void;
  onNext: () => void;
  disableNext: boolean;
}) {
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

function AccountBadge({ account }: { account: string }) {
  const cfg = ACCOUNT_CONFIG[account] || ACCOUNT_CONFIG.external;
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-semibold px-2 py-1 rounded-md whitespace-nowrap ${cfg.bg} ${cfg.color} border ${cfg.border}`}
    >
      <Icon size={12} />
      {cfg.label}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FundManagement() {
  const canMutate = useCanMutate();
  const { fundMovements, refreshFundMovements, refreshFundBalances, fundBalances } = useERP();

  const now = new Date();
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

  // ── UI States ──
  const [showMobileForm, setShowMobileForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void | Promise<void>) | null>(null);
  const [passwordModalTitle, setPasswordModalTitle] = useState('');

  // ── Form Setup ──
  const {
    register,
    handleSubmit: handleFormSubmit,
    formState: { errors, isSubmitting },
    reset,
    control,
  } = useForm<FundMovementFormData>({
    resolver: zodResolver(fundMovementSchema),
    defaultValues: {
      movementType: 'transfer',
      fromAccount: '',
      toAccount: '',
      amount: '',
      date: todayISO(),
      notes: '',
    },
  });

  const watchMovementType = useWatch({ control, name: 'movementType' });

  // ── Derived Data ──

  const monthFundMovements = useMemo(() => {
    return fundMovements.filter((movement) => {
      const isRightMonth =
        movement.date instanceof Date &&
        movement.date.getFullYear() === selectedMonth.year &&
        movement.date.getMonth() === selectedMonth.month;
      return isRightMonth;
    });
  }, [fundMovements, selectedMonth]);

  const netFlows = useMemo(() => {
    const flows = { cash: 0, bank: 0, bkash: 0, reserve: 0 };

    monthFundMovements.forEach((movement) => {
      const amount = movement.amount;
      const from = movement.fromAccount || '';
      const to = movement.toAccount || '';

      if (from && from in flows) flows[from as keyof typeof flows] -= amount;
      if (to && to in flows) flows[to as keyof typeof flows] += amount;
    });

    return flows;
  }, [monthFundMovements]);

  const filteredFunds = useMemo(() => {
    if (!searchQuery) return monthFundMovements;
    const lowerQ = searchQuery.toLowerCase();
    return monthFundMovements.filter(
      (movement) =>
        movement.notes.toLowerCase().includes(lowerQ) ||
        (movement.fromAccount && movement.fromAccount.toLowerCase().includes(lowerQ)) ||
        (movement.toAccount && movement.toAccount.toLowerCase().includes(lowerQ)) ||
        MOVEMENT_TYPE_LABELS[movement.movementType].toLowerCase().includes(lowerQ)
    );
  }, [monthFundMovements, searchQuery]);

  const { paginatedData, pagination } = useClientPagination(filteredFunds, {
    initialPageSize: 10,
    pageSizeOptions: [10, 20, 50],
  });

  // ── Handlers ──

  const onSubmit = useCallback(
    async (data: FundMovementFormData) => {
      try {
        const amount = Number(data.amount);
        if (
          (data.movementType === 'withdraw' || data.movementType === 'transfer') &&
          data.fromAccount
        ) {
          const available = Math.max(
            0,
            Number(fundBalances?.combined?.[data.fromAccount as FundAccountType] ?? 0),
          );
          if (available + 1e-9 < amount) {
            const label =
              data.fromAccount === 'bank'
                ? 'Bank/Card'
                : data.fromAccount === 'bkash'
                  ? 'bKash'
                  : data.fromAccount === 'reserve'
                    ? 'Reserve'
                    : 'Cash';
            toast.error(
              `Insufficient ${label} balance. Available ৳${available.toLocaleString('en-IN')}, required ৳${amount.toLocaleString('en-IN')}.`,
            );
            return;
          }
        }

        await fundsService.create({
          movementType: data.movementType,
          fromAccount: data.fromAccount ? (data.fromAccount as FundAccountType) : undefined,
          toAccount: data.toAccount ? (data.toAccount as FundAccountType) : undefined,
          amount,
          date: data.date,
          notes: data.notes?.trim() || undefined,
        });

        await refreshFundMovements();
        await refreshFundBalances();
        toast.success('Movement recorded successfully');

        reset({ ...data, amount: '', notes: '' });

        if (window.innerWidth < 1024) setShowMobileForm(false);
      } catch (error) {
        handleError(error, { action: 'add_fund_movement', severity: 'high' });
      }
    },
    [refreshFundMovements, refreshFundBalances, reset, fundBalances],
  );

  const handleDelete = useCallback(
    (id: string) => {
      setPasswordModalTitle('Delete Movement');
      setPendingAction(() => async () => {
        try {
          await fundsService.delete(id);
          await refreshFundMovements();
          toast.success('Record deleted successfully');
        } catch (error) {
          handleError(error, { action: 'delete_fund_movement', severity: 'high' });
        }
      });
      setPasswordModalOpen(true);
    },
    [refreshFundMovements]
  );

  // Export mapping
  const exportConfig = useMemo(
    () => ({
      filenameBase: `fund_movements_${selectedMonth.year}_${selectedMonth.month + 1}`,
      title: 'Fund Movements',
      subtitle: monthLabel,

      columns: [
        {
          header: 'Date',
          accessor: 'date' as const,
          format: (v: string | number | null | undefined) => formatDate(new Date(String(v))),
        },
        { header: 'Type', accessor: 'movementType' as const },
        {
          header: 'From',
          accessor: (row: FundMovement) => row.fromAccount ?? 'External',
        },
        {
          header: 'To',
          accessor: (row: FundMovement) => row.toAccount ?? 'External',
        },
        {
          header: 'Amount',
          accessor: 'amount' as const,
          format: (v: string | number | null | undefined) => Number(v).toFixed(2),
        },
        { header: 'Notes', accessor: 'notes' as const },
      ] satisfies ColDef<FundMovement>[],
      sheetName: 'Movements',
      getData: () => filteredFunds,
    }),
    [filteredFunds, monthLabel, selectedMonth]
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 sm:gap-6 animate-in fade-in zoom-in-95 duration-300 pb-20 sm:pb-0">
      {/* Modals */}
      <ManagerPasswordModal
        isOpen={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
        onConfirm={() => {
          void pendingAction?.();
          setPasswordModalOpen(false);
        }}
        title={passwordModalTitle}
        requiredRole="owner"
      />

      {/* ── Add Movement Form Panel (Left Col Desktop / Expandable Top Mobile) ── */}
      <div className="bg-white/90 backdrop-blur p-4 sm:p-5 lg:p-6 rounded-2xl shadow-sm border border-slate-200 h-fit lg:sticky lg:top-28 transition-all">
        {/* Panel header / Mobile Toggle */}
        <div
          className={`flex items-start justify-between gap-3 cursor-pointer lg:cursor-default ${
            showMobileForm
              ? 'mb-5 pb-5 border-b border-slate-100'
              : 'mb-0 pb-0 border-transparent lg:mb-5 lg:pb-5 lg:border-slate-100 border-b'
          }`}
          onClick={() => window.innerWidth < 1024 && setShowMobileForm(!showMobileForm)}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 shrink-0">
              <ArrowRightLeft size={20} className="sm:w-5 sm:h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-800 leading-tight">
                Log Movement
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                Transfers &amp; Adjustments
              </p>
            </div>
          </div>

          <div className="flex items-center shrink-0 lg:hidden">
            <div className="p-2 rounded-lg bg-slate-50 text-slate-500 flex items-center justify-center border border-slate-100">
              {showMobileForm ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </div>
        </div>

        {/* Form Body */}
        <div
          className={`lg:block ${showMobileForm ? 'block animate-in slide-in-from-top-2 fade-in duration-200' : 'hidden'}`}
        >
          {canMutate && (
            <form onSubmit={handleFormSubmit(onSubmit)} className="space-y-4 sm:space-y-5">
              {/* Type Selection */}
              <div>
                <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide mb-2 block">
                  Movement Type
                </label>
                <div className="relative">
                  <select
                    {...register('movementType')}
                    className="w-full h-11 pl-3 sm:pl-4 pr-9 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 appearance-none text-sm font-medium cursor-pointer"
                  >
                    {MOVEMENT_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={16}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                </div>
              </div>

              {/* Dynamic From/To Accounts */}
              <div className="grid grid-cols-2 gap-3">
                {/* From Account */}
                {(watchMovementType === 'transfer' || watchMovementType === 'withdraw') && (
                  <div className={watchMovementType === 'withdraw' ? 'col-span-2' : 'col-span-1'}>
                    <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide mb-2 block">
                      From Account
                    </label>
                    <div className="relative">
                      <select
                        {...register('fromAccount')}
                        className={`w-full h-11 pl-3 sm:pl-4 pr-9 bg-slate-50 border ${errors.fromAccount ? 'border-red-400' : 'border-slate-200'} rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 appearance-none text-sm cursor-pointer`}
                      >
                        <option value="">Select...</option>
                        {Object.entries(ACCOUNT_CONFIG)
                          .filter(([k]) => k !== 'external')
                          .map(([key, cfg]) => (
                            <option key={key} value={key}>
                              {cfg.label}
                            </option>
                          ))}
                      </select>
                      <ChevronDown
                        size={16}
                        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                    </div>
                  </div>
                )}

                {/* To Account */}
                {(watchMovementType === 'transfer' ||
                  watchMovementType === 'add' ||
                  watchMovementType === 'opening') && (
                  <div
                    className={
                      watchMovementType === 'add' || watchMovementType === 'opening'
                        ? 'col-span-2'
                        : 'col-span-1'
                    }
                  >
                    <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide mb-2 block">
                      To Account
                    </label>
                    <div className="relative">
                      <select
                        {...register('toAccount')}
                        className={`w-full h-11 pl-3 sm:pl-4 pr-9 bg-slate-50 border ${errors.toAccount ? 'border-red-400' : 'border-slate-200'} rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 appearance-none text-sm cursor-pointer`}
                      >
                        <option value="">Select...</option>
                        {Object.entries(ACCOUNT_CONFIG)
                          .filter(([k]) => k !== 'external')
                          .map(([key, cfg]) => (
                            <option key={key} value={key}>
                              {cfg.label}
                            </option>
                          ))}
                      </select>
                      <ChevronDown
                        size={16}
                        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                      />
                    </div>
                  </div>
                )}
                {errors.toAccount && (
                  <p className="col-span-2 text-xs text-red-600">{errors.toAccount.message}</p>
                )}
              </div>

              {/* Amount & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide mb-2 block">
                    Amount (৳)
                  </label>
                  <input
                    type="number"
                    step="any" // This explicitly allows .50, 0.5, 1.75, etc.
                    placeholder="0.00"
                    {...register('amount')}
                    className={`w-full h-11 px-3 sm:px-4 bg-white border ${errors.amount ? 'border-red-400' : 'border-slate-200'} rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800 text-sm`}
                  />
                  {errors.amount && (
                    <p className="text-xs text-red-600 mt-1">{errors.amount.message}</p>
                  )}
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide mb-2 block">
                    Date
                  </label>
                  <input
                    type="date"
                    max={todayISO()}
                    {...register('date')}
                    className="w-full h-11 px-2.5 sm:px-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm cursor-pointer"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide mb-2 block">
                  Notes / Reference
                </label>
                <input
                  type="text"
                  placeholder="Optional details..."
                  {...register('notes')}
                  className="w-full h-11 px-3 sm:px-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>

              <ButtonLoading
                loading={isSubmitting}
                type="submit"
                className="w-full min-h-[48px] px-4 py-3.5 text-white rounded-xl font-bold shadow-md shadow-indigo-200 mt-2 bg-indigo-600 hover:bg-indigo-700 flex items-center justify-center whitespace-nowrap transition-transform active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2"
              >
                Record Movement
              </ButtonLoading>
            </form>
          )}
        </div>
      </div>

      {/* ── Summary & History Panel ──────────────────────────────────────── */}
      <div className="lg:col-span-2 space-y-4 sm:space-y-5">
        {/* Header & Flow Summary */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 md:p-6 bg-gradient-to-r from-indigo-50 via-white to-slate-50 border-b border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
              <div className="flex items-center gap-3">
                <div className="p-2 sm:p-2.5 bg-indigo-100 rounded-lg sm:rounded-xl text-indigo-600 shadow-sm shrink-0">
                  <Wallet size={20} className="sm:w-5 sm:h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-800 leading-tight">
                    Fund Management
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                    Track liquidity &amp; reserves
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

            {/* Net Flows Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                {
                  key: 'cash',
                  label: 'Cash Flow',
                  icon: Banknote,
                  colors: 'text-emerald-600 bg-emerald-50',
                },
                {
                  key: 'bkash',
                  label: 'bKash Flow',
                  icon: Smartphone,
                  colors: 'text-pink-600 bg-pink-50',
                },
                {
                  key: 'bank',
                  label: 'Bank Flow',
                  icon: Landmark,
                  colors: 'text-blue-600 bg-blue-50',
                },
                {
                  key: 'reserve',
                  label: 'Reserve Flow',
                  icon: Vault,
                  colors: 'text-purple-600 bg-purple-50',
                },
              ].map((flow) => {
                const amount = netFlows[flow.key as keyof typeof netFlows] || 0;
                const Icon = flow.icon;
                return (
                  <div
                    key={flow.key}
                    className="p-3 sm:p-4 bg-white rounded-xl border border-slate-100 shadow-sm"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`p-1.5 rounded-md ${flow.colors}`}>
                        <Icon size={14} />
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">
                        {flow.label}
                      </p>
                    </div>
                    <p
                      className={`text-sm sm:text-base font-extrabold tabular-nums ${amount === 0 ? 'text-slate-600' : amount > 0 ? 'text-emerald-600' : 'text-rose-500'}`}
                    >
                      {amount > 0 ? '+' : ''}
                      {formatCurrency(amount)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* History Table Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-4 md:px-6 py-4 bg-slate-50/60 border-b border-slate-200">
            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="relative w-full sm:max-w-xs">
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  placeholder="Search notes or accounts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-9 py-2.5 sm:py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-colors"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-md"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <div className="flex w-full sm:w-auto justify-end">
                <ExportDropdown config={exportConfig} disabled={filteredFunds.length === 0} />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto max-h-[600px] scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
            <table className="w-full text-left min-w-[700px]">
              <thead className="bg-slate-50 border-b-2 border-slate-200 sticky top-0 z-10">
                <tr>
                  <th className="px-4 sm:px-5 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider w-[15%]">
                    Date
                  </th>
                  <th className="px-4 sm:px-5 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider w-[35%]">
                    Movement
                  </th>
                  <th className="px-4 sm:px-5 py-3.5 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider w-[20%]">
                    Amount
                  </th>
                  <th className="px-4 sm:px-5 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider w-[20%]">
                    Notes
                  </th>
                  <th className="px-4 sm:px-5 py-3.5 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider w-[10%]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedData.length > 0 ? (
                  paginatedData.map((movement) => (
                    <tr key={movement.id} className="hover:bg-indigo-50/40 transition-colors group">
                      <td className="px-4 sm:px-5 py-3.5 text-xs font-medium text-slate-600 whitespace-nowrap">
                        {formatDate(movement.date)}
                      </td>
                      <td className="px-4 sm:px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          {movement.fromAccount ? (
                            <AccountBadge account={movement.fromAccount} />
                          ) : (
                            <span className="text-xs text-slate-400">External</span>
                          )}
                          <ArrowRight size={12} className="text-slate-300" />
                          {movement.toAccount ? (
                            <AccountBadge account={movement.toAccount} />
                          ) : (
                            <span className="text-xs text-slate-400">External</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 sm:px-5 py-3.5 text-right">
                        <span className="text-sm font-extrabold text-slate-800 tabular-nums">
                          {formatCurrency(movement.amount)}
                        </span>
                      </td>
                      <td className="px-4 sm:px-5 py-3.5 max-w-[200px]">
                        <span
                          className="text-xs text-slate-500 truncate block"
                          title={movement.notes || MOVEMENT_TYPE_LABELS[movement.movementType]}
                        >
                          {movement.notes || MOVEMENT_TYPE_LABELS[movement.movementType]}
                        </span>
                      </td>
                      <td className="px-4 sm:px-5 py-3.5 text-right">
                        {canMutate && (
                          <div className="flex gap-1.5 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity justify-end">
                            <button
                              onClick={() => handleDelete(movement.id)}
                              className="p-2 sm:p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 bg-slate-50 lg:bg-transparent rounded-lg transition-colors focus-visible:outline-none"
                              title="Delete Movement"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-16 sm:py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <ArrowRightLeft size={28} className="text-slate-300" />
                        </div>
                        <p className="text-sm font-semibold text-slate-600">
                          No fund movements found
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          {filteredFunds.length > 0 && (
            <div className="px-4 sm:px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex flex-col md:flex-row items-center justify-between gap-4">
              <p className="text-xs text-slate-500 w-full text-center md:text-left">
                <span className="font-bold text-slate-700">{filteredFunds.length}</span> record
                {filteredFunds.length !== 1 ? 's' : ''}
              </p>
              <div className="w-full md:w-auto">
                <Pagination pagination={pagination} showPageInfo={false} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
