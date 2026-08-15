import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Search,
  X,
  Eye,
  Pencil,
  Trash2,
  Printer,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Banknote,
  Smartphone,
  Landmark,
  Store,
  Utensils,
  ShoppingBag,
  ReceiptText,
  TrendingUp,
  ShoppingCart,
  DollarSign,
  Clock,
  Filter,
  SlidersHorizontal,
  ArrowUpDown,
  ChevronUp,
  ChevronDown as ChevronDownIcon,
  AlertTriangle,
  UtensilsCrossed,
  Loader2,
  Gift,
  Trophy,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { salesService } from '@/core/api/services';
import { useERP } from '@/core/context/useERP';
import {
  EditTransactionModal,
  ManagerPasswordModal,
  Pagination,
  DataTableShell,
  DataTable,
  DataTableColGroup,
  DataTableHead,
  DataTableHeadRow,
  DataTableHeadCell,
  DataTableBody,
  DataTableRow,
  DataTableCell,
} from '@/shared/components/ui';
import { useClientPagination } from '@/shared/hooks';
import { useCanMutate } from '@/shared/hooks/useCanMutate';
import { PAGINATION } from '@/shared/utils/constants';
import { formatCurrency, formatDate, formatTime } from '@/shared/utils/formatters';
import { getStoredUser } from '@/shared/utils'; // Added import for role check
import {
  businessDateKey,
  isBusinessDayKeyInRange,
  todayBusinessKey,
} from '@/shared/utils/businessDate';
import type { Transaction, PaymentMethod, SalesChannel, ReceiptStatus } from '@/core/types';
import { printOrderAsync } from '../utils/posPrintService';
import {
  transactionToOrder,
  transactionToSaleUpdate,
  resolveOrderTimestamp,
} from '../utils/orderUtils';
import { PaymentPanel } from '../components/PaymentPanel';
import type { NewOrderData } from '../types/menuItem.types';

// ─── Constants ────────────────────────────────────────────────────────────────

type SortField = 'date' | 'amount' | 'items';
type SortDir = 'asc' | 'desc';

const STATUS_CONFIG: Record<
  ReceiptStatus,
  { label: string; bg: string; text: string; icon: LucideIcon; dot: string }
> = {
  pending: {
    label: 'Pending',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    icon: Clock,
    dot: 'bg-amber-500',
  },
  completed: {
    label: 'Completed',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    icon: CheckCircle2,
    dot: 'bg-emerald-500',
  },
  refunded: {
    label: 'Refunded',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    icon: RotateCcw,
    dot: 'bg-amber-500',
  },
  voided: {
    label: 'Voided',
    bg: 'bg-red-50',
    text: 'text-red-600',
    icon: XCircle,
    dot: 'bg-red-500',
  },
};

const METHOD_CONFIG: Record<PaymentMethod, { label: string; icon: LucideIcon; color: string }> = {
  cash: { label: 'Cash', icon: Banknote, color: 'text-emerald-600' },
  bkash: { label: 'bKash', icon: Smartphone, color: 'text-pink-600' },
  bank: { label: 'Card / Bank', icon: Landmark, color: 'text-blue-600' },
};

const CHANNEL_CONFIG: Record<
  SalesChannel,
  { label: string; icon: LucideIcon; badgeClass: string }
> = {
  in_store: {
    label: 'In-Store',
    icon: Store,
    badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  },
  foodpanda: {
    label: 'Foodpanda',
    icon: ShoppingBag,
    badgeClass: 'bg-orange-50 text-orange-700 border border-orange-200',
  },
  foodi: {
    label: 'Foodi',
    icon: Utensils,
    badgeClass: 'bg-violet-50 text-violet-700 border border-violet-200',
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusOf(t: Transaction): ReceiptStatus {
  return t.receiptStatus ?? 'completed';
}

function itemCount(t: Transaction): number {
  if (t.receiptLines && t.receiptLines.length > 0)
    return t.receiptLines.reduce((s, r) => s + r.qty, 0);
  return t.quantity ?? 1;
}

/** Best-effort instant for sorting — prefers order date, falls back to row insert time. */
function orderInstant(t: Transaction): number {
  return new Date(resolveOrderTimestamp(t)).getTime();
}

/** Highest-value completed order in the current filtered set (for row highlight). */
function findTopOrderId(rows: Transaction[]): string | null {
  const completed = rows.filter((t) => statusOf(t) === 'completed');
  if (completed.length === 0) return null;

  let top = completed[0];
  for (const t of completed) {
    if (
      t.amount > top.amount ||
      (t.amount === top.amount && itemCount(t) > itemCount(top)) ||
      (t.amount === top.amount &&
        itemCount(t) === itemCount(top) &&
        orderInstant(t) > orderInstant(top))
    ) {
      top = t;
    }
  }
  return top.id;
}

function orderLabel(t: Transaction): string {
  if (t.orderNumber) return t.orderNumber;
  const match = t.description.match(/BB-\d{8}-\d{4}/);
  return match ? match[0] : t.description.slice(0, 24) + (t.description.length > 24 ? '…' : '');
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

const PAYMENT_REVENUE_CONFIG = [
  {
    key: 'cash' as const,
    label: 'Cash',
    bar: 'bg-emerald-400',
    dot: 'bg-emerald-400',
    text: 'text-emerald-600',
  },
  {
    key: 'bkash' as const,
    label: 'bKash',
    bar: 'bg-pink-400',
    dot: 'bg-pink-400',
    text: 'text-pink-600',
  },
  {
    key: 'bank' as const,
    label: 'Card / Bank',
    bar: 'bg-blue-400',
    dot: 'bg-blue-400',
    text: 'text-blue-600',
  },
] as const;

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: LucideIcon;
  color: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 flex items-start gap-2.5 sm:gap-3">
      <div
        className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}
      >
        <Icon size={16} className="text-white sm:hidden" />
        <Icon size={19} className="text-white hidden sm:block" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wide truncate">
          {label}
        </p>
        <p className="text-base sm:text-xl font-black text-slate-800 leading-tight truncate">
          {value}
        </p>
        {sub && <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 truncate">{sub}</p>}
      </div>
    </div>
  );
}

function RevenueKpiCard({
  revenue,
  byMethod,
}: {
  revenue: number;
  byMethod: Record<PaymentMethod, number>;
}) {
  const [expanded, setExpanded] = useState(false);
  const total = Math.max(0, byMethod.cash + byMethod.bkash + byMethod.bank);

  return (
    <div
      className={`bg-white rounded-2xl border transition-all duration-200 ${
        expanded
          ? 'col-span-2 sm:col-span-1 border-emerald-300 shadow-md ring-2 ring-emerald-100'
          : 'border-slate-200'
      }`}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full p-3 sm:p-4 flex items-start gap-2.5 sm:gap-3 text-left group"
        aria-expanded={expanded}
      >
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 bg-emerald-500">
          <TrendingUp size={16} className="text-white sm:hidden" />
          <TrendingUp size={19} className="text-white hidden sm:block" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wide truncate">
              Total Revenue
            </p>
            <ChevronDownIcon
              size={14}
              className={`text-slate-400 shrink-0 transition-transform duration-200 ${
                expanded ? 'rotate-180' : ''
              }`}
            />
          </div>
          <p className="text-base sm:text-xl font-black text-slate-800 leading-tight truncate">
            {formatCurrency(revenue)}
          </p>
          <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 truncate">
            {expanded ? 'Tap to hide payment breakdown' : 'Completed orders · tap for breakdown'}
          </p>
        </div>
      </button>

      {expanded && (
        <div className="px-3 sm:px-4 pb-3 sm:pb-4 pt-0 space-y-3 border-t border-slate-100">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pt-3">
            By Payment Method
          </p>

          {total > 0 && (
            <div className="flex h-2 rounded-full overflow-hidden gap-px">
              {PAYMENT_REVENUE_CONFIG.map(({ key, bar }) => {
                const pct = (byMethod[key] / total) * 100;
                if (pct <= 0) return null;
                return (
                  <div
                    key={key}
                    className={`${bar} transition-all duration-500`}
                    style={{ width: `${pct}%` }}
                  />
                );
              })}
            </div>
          )}

          <div className="space-y-2">
            {PAYMENT_REVENUE_CONFIG.map(({ key, label, dot, text }) => {
              const amount = byMethod[key];
              const pct = total > 0 ? Math.round((amount / total) * 100) : 0;
              return (
                <div key={key} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
                    <span className="text-xs font-semibold text-slate-700">{label}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`text-sm font-bold tabular-nums ${text}`}>
                      {formatCurrency(amount)}
                    </span>
                    <span className="text-[11px] text-slate-400 ml-1.5">{pct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Pending Payment Modal ────────────────────────────────────────────────────

function PendingPaymentModal({
  tx,
  onClose,
  onComplete,
}: {
  tx: Transaction;
  onClose: () => void;
  onComplete: (
    updated: Transaction,
    payment: { method: PaymentMethod; customerPaid: number; changeAmount: number }
  ) => void;
}) {
  const baseOrder = useMemo(() => transactionToOrder(tx), [tx]);
  const [customerPaidStr, setCustomerPaidStr] = useState(() =>
    String(tx.customerPaid ?? tx.amount)
  );
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(tx.method ?? 'cash');
  const [printing, setPrinting] = useState(false);

  if (!baseOrder) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
          <p className="text-sm text-slate-600 mb-4">
            This order cannot be opened for payment — line items are missing.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 text-white text-sm font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const paid = parseFloat(customerPaidStr) || 0;
  const change = Math.max(0, paid - tx.amount);
  const paymentOk = paid >= tx.amount;

  const finalize = async (withPrint: boolean) => {
    if (!paymentOk) {
      toast.error(`Customer must pay at least ৳${tx.amount}`);
      return;
    }
    const enriched: NewOrderData = {
      ...baseOrder,
      paymentMethod,
      customerPaid: paid,
      changeAmount: change,
    };
    if (withPrint) {
      setPrinting(true);
      try {
        const ok = await printOrderAsync(enriched, 'customer');
        if (!ok) {
          toast.error('Pop-up blocked — allow pop-ups and retry');
          return;
        }
      } finally {
        setPrinting(false);
      }
    }
    onComplete(
      { ...tx, receiptStatus: 'completed', method: paymentMethod },
      { method: paymentMethod, customerPaid: paid, changeAmount: change }
    );
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden">
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 px-5 pt-5 pb-4 text-white shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-base font-bold">Receive Payment</h2>
              <p className="text-xs opacity-90 mt-0.5">
                {orderLabel(tx)} · ৳{tx.amount}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center"
            >
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 mb-2">
              Payment Method
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {(['cash', 'bank', 'bkash'] as PaymentMethod[]).map((m) => {
                const cfg = METHOD_CONFIG[m];
                const Icon = cfg.icon;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPaymentMethod(m)}
                    className={`py-2.5 rounded-xl text-xs font-bold border flex flex-col items-center gap-1 transition-all ${
                      paymentMethod === m
                        ? 'bg-emerald-50 border-emerald-400 text-emerald-800'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <Icon size={14} className={cfg.color} />
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>
          <PaymentPanel
            billTotal={tx.amount}
            paymentMethod={paymentMethod}
            customerPaidStr={customerPaidStr}
            onPaidChange={setCustomerPaidStr}
            discountAmount={tx.discountAmount}
          />
        </div>
        <div className="p-4 border-t border-slate-100 space-y-2 shrink-0">
          <button
            type="button"
            disabled={printing || !paymentOk}
            onClick={() => void finalize(true)}
            className="w-full flex items-center justify-center gap-2 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-sm disabled:opacity-50"
          >
            {printing ? <Loader2 size={15} className="animate-spin" /> : <Printer size={15} />}
            Print Receipt & Complete
          </button>
          <button
            type="button"
            disabled={printing || !paymentOk}
            onClick={() => void finalize(false)}
            className="w-full py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-semibold text-sm disabled:opacity-50"
          >
            Complete Without Print
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Detail Drawer ────────────────────────────────────────────────────────────

function DetailDrawer({
  tx,
  onClose,
  onEdit,
  onDelete,
  onReceivePayment,
  canMutate,
  isOwner, // Added check
}: {
  tx: Transaction;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onReceivePayment: () => void;
  canMutate: boolean;
  isOwner: boolean;
}) {
  const status = statusOf(tx);
  const method = tx.method ? METHOD_CONFIG[tx.method] : null;
  const channel = tx.channel ? CHANNEL_CONFIG[tx.channel] : null;
  const MethodIcon = method?.icon;
  const ChannelIcon = channel?.icon;
  const isPending = status === 'pending';

  const handlePrint = async (kind: 'customer' | 'kitchen') => {
    const order = transactionToOrder(tx);
    if (!order) {
      toast.error('Cannot print — order line items are missing');
      return;
    }
    const ok = await printOrderAsync(order, kind);
    if (!ok) toast.error('Pop-up blocked — allow pop-ups and retry');
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-sm bg-white shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white px-5 pt-5 pb-6 shrink-0">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-white/15 rounded-xl flex items-center justify-center">
                <ReceiptText size={18} />
              </div>
              <div>
                <h2 className="text-sm font-bold leading-tight">Order Details</h2>
                <p className="text-[11px] opacity-60 mt-0.5">{orderLabel(tx)}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
            >
              <X size={15} />
            </button>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white/10 rounded-xl p-2.5 text-center">
              <p className="text-[10px] opacity-70 uppercase tracking-wide">Total</p>
              <p className="text-base font-black">৳{tx.amount}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-2.5 text-center">
              <p className="text-[10px] opacity-70 uppercase tracking-wide">Items</p>
              <p className="text-base font-black">{itemCount(tx)}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-2.5 text-center">
              <p className="text-[10px] opacity-70 uppercase tracking-wide">Status</p>
              <p
                className={`text-[11px] font-bold mt-0.5 ${
                  status === 'completed'
                    ? 'text-emerald-300'
                    : status === 'pending'
                      ? 'text-amber-300'
                      : status === 'refunded'
                        ? 'text-amber-300'
                        : 'text-red-300'
                }`}
              >
                {STATUS_CONFIG[status].label}
              </p>
            </div>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Order Meta */}
          <section>
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
              Order Info
            </h3>
            <div className="bg-slate-50 rounded-xl divide-y divide-slate-100">
              {[
                { label: 'Date', value: formatDate(resolveOrderTimestamp(tx)) },
                { label: 'Time', value: formatTime(resolveOrderTimestamp(tx)) },
                ...(tx.tableNumber ? [{ label: 'Table', value: tx.tableNumber }] : []),
                ...(tx.customerName ? [{ label: 'Customer', value: tx.customerName }] : []),
                ...(tx.cashier ? [{ label: 'Cashier', value: tx.cashier }] : []),
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between px-3 py-2 text-sm">
                  <span className="text-slate-500 font-medium">{label}</span>
                  <span className="font-semibold text-slate-800">{value}</span>
                </div>
              ))}

              {/* Channel */}
              {channel && (
                <div className="flex justify-between px-3 py-2 text-sm items-center">
                  <span className="text-slate-500 font-medium">Channel</span>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${channel.badgeClass}`}
                  >
                    {ChannelIcon && <ChannelIcon size={11} />}
                    {channel.label}
                  </span>
                </div>
              )}

              {/* Payment */}
              <div className="flex justify-between px-3 py-2 text-sm items-center">
                <span className="text-slate-500 font-medium">Payment</span>
                {method && MethodIcon ? (
                  <span
                    className={`inline-flex items-center gap-1.5 font-semibold ${method.color}`}
                  >
                    <MethodIcon size={13} />
                    {method.label}
                  </span>
                ) : (
                  <span className="text-xs font-semibold text-amber-600">Unpaid</span>
                )}
              </div>
            </div>
          </section>

          {/* Order Items */}
          {tx.receiptLines && tx.receiptLines.length > 0 && (
            <section>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                Order Items
              </h3>
              <div className="bg-slate-50 rounded-xl overflow-hidden">
                {/* Header */}
                <div className="grid grid-cols-[1fr_auto_auto] px-3 py-1.5 bg-slate-100 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  <span>Item</span>
                  <span className="text-center w-8">Qty</span>
                  <span className="text-right w-16">Price</span>
                </div>
                {tx.receiptLines.map((line, i) => (
                  <div
                    key={i}
                    className={`grid grid-cols-[1fr_auto_auto] px-3 py-2 border-t border-slate-100 text-sm ${line.isGift ? 'bg-emerald-50/50' : ''}`}
                  >
                    <span className="font-medium text-slate-800 leading-snug pr-2 flex items-center gap-1.5 min-w-0">
                      <span className="truncate">{line.name}</span>
                      {line.isGift && (
                        <span className="shrink-0 text-[9px] font-bold uppercase text-emerald-600 bg-emerald-100 px-1 py-0.5 rounded">
                          Gift
                        </span>
                      )}
                    </span>
                    <span className="text-center w-8 text-slate-500 font-semibold">
                      {line.qty}×
                    </span>
                    <span className="text-right w-16 font-bold text-slate-800">
                      {line.isGift ? 'FREE' : `৳${line.qty * line.unitPrice}`}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Description (if no receipt lines) */}
          {(!tx.receiptLines || tx.receiptLines.length === 0) && (
            <section>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                Description
              </h3>
              <div className="bg-slate-50 rounded-xl px-3 py-2.5 text-sm text-slate-700 font-medium">
                {tx.description}
              </div>
            </section>
          )}

          {/* Payment Summary */}
          <section>
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
              Payment Summary
            </h3>
            <div className="bg-slate-50 rounded-xl divide-y divide-slate-100">
              {tx.receiptLines && tx.receiptLines.length > 0 && (
                <div className="flex justify-between px-3 py-2 text-sm">
                  <span className="text-slate-500">Subtotal</span>
                  <span className="font-medium">
                    ৳{tx.receiptLines.reduce((s, r) => s + r.qty * r.unitPrice, 0)}
                  </span>
                </div>
              )}
              {tx.discountAmount && tx.discountAmount > 0 ? (
                <div className="flex justify-between px-3 py-2 text-sm text-emerald-600">
                  <span>Discount</span>
                  <span className="font-semibold">−৳{tx.discountAmount}</span>
                </div>
              ) : null}
              {tx.giftItemCount && tx.giftItemCount > 0 ? (
                <div className="flex justify-between px-3 py-2 text-sm text-emerald-700">
                  <span className="flex items-center gap-1">
                    <Gift size={12} /> Gift Items ({tx.giftItemCount})
                  </span>
                  <span className="font-semibold">Value ৳{tx.giftTotalValue ?? 0}</span>
                </div>
              ) : null}
              <div className="flex justify-between px-3 py-2.5 text-sm font-bold text-slate-800 bg-slate-100 rounded-b-xl">
                <span>Total</span>
                <span>৳{tx.amount}</span>
              </div>
            </div>
          </section>
        </div>

        {/* Action footer */}
        <div className="border-t border-slate-100 p-4 space-y-2 shrink-0 bg-white">
          {isPending && canMutate ? (
            <button
              onClick={onReceivePayment}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-sm transition-colors"
            >
              <Banknote size={15} />
              Receive Payment
            </button>
          ) : !isPending ? (
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => void handlePrint('customer')}
                className="flex items-center justify-center gap-1.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-sm transition-colors"
              >
                <Printer size={14} />
                Receipt Customer
              </button>
              <button
                onClick={() => void handlePrint('kitchen')}
                className="flex items-center justify-center gap-1.5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-sm transition-colors"
              >
                <UtensilsCrossed size={14} />
                Receipt Kitchen
              </button>
            </div>
          ) : null}
          {/* ONLY OWNER CAN EDIT OR DELETE */}
          {isOwner && (
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onEdit}
                className="flex items-center justify-center gap-1.5 py-2.5 border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl font-semibold text-sm transition-colors"
              >
                <Pencil size={13} />
                Edit Order
              </button>
              <button
                onClick={onDelete}
                className="flex items-center justify-center gap-1.5 py-2.5 border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-semibold text-sm transition-colors"
              >
                <Trash2 size={13} />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────

function DeleteConfirmModal({
  tx,
  onConfirm,
  onCancel,
}: {
  tx: Transaction;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle size={22} className="text-red-500" />
        </div>
        <h3 className="text-center text-lg font-bold text-slate-800 mb-1">Delete Order?</h3>
        <p className="text-center text-sm text-slate-500 mb-1">
          <span className="font-semibold">{orderLabel(tx)}</span> · ৳{tx.amount}
        </p>
        <p className="text-center text-xs text-slate-400 mb-5">
          This action cannot be undone. The sale record will be permanently removed.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Sort Button ──────────────────────────────────────────────────────────────

function SortBtn({
  field,
  label,
  sortField,
  sortDir,
  onSort,
}: {
  field: SortField;
  label: string;
  sortField: SortField;
  sortDir: SortDir;
  onSort: (f: SortField) => void;
}) {
  const active = sortField === field;
  return (
    <button
      onClick={() => onSort(field)}
      className={`flex items-center gap-1 text-xs font-semibold uppercase tracking-wide transition-colors ${
        active ? 'text-amber-600' : 'text-slate-500 hover:text-slate-700'
      }`}
    >
      {label}
      {active ? (
        sortDir === 'asc' ? (
          <ChevronUp size={13} />
        ) : (
          <ChevronDownIcon size={13} />
        )
      ) : (
        <ArrowUpDown size={12} className="opacity-40" />
      )}
    </button>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function OrderHistory() {
  const canMutate = useCanMutate();
  const isOwner = getStoredUser()?.role === 'owner'; // Added check

  const {
    itemNames,
    suppliers,
    transactions,
    refreshTransactions,
    refreshFundBalances,
    isLoadingTransactions,
  } = useERP();
  const supplierNames = useMemo(() => suppliers.map((s) => s.name), [suppliers]);

  // Reuse the ledger already loaded by ERP context instead of issuing a second
  // identical full fetch. Edits/deletes below refresh the shared context (ledger
  // + authoritative balances), so changes show up here and everywhere instantly.
  const refreshSales = useCallback(async () => {
    await refreshTransactions();
    void refreshFundBalances();
  }, [refreshTransactions, refreshFundBalances]);
  const loading = isLoadingTransactions;

  // ── Filters ──
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReceiptStatus | 'all'>('all');
  const [methodFilter, setMethodFilter] = useState<PaymentMethod | 'all'>('all');
  const [channelFilter, setChannelFilter] = useState<SalesChannel | 'all'>('all');
  const [dateFrom, setDateFrom] = useState(() => {
    const today = todayBusinessKey();
    return `${today.slice(0, 7)}-01`;
  });
  const [dateTo, setDateTo] = useState(() => todayBusinessKey());
  const [datesLockedToToday, setDatesLockedToToday] = useState(false);

  useEffect(() => {
    const syncTodayFilter = () => {
      if (document.visibilityState === 'hidden') return;
      const today = todayBusinessKey();
      if (!datesLockedToToday) return;
      setDateFrom(today);
      setDateTo(today);
    };
    window.addEventListener('focus', syncTodayFilter);
    document.addEventListener('visibilitychange', syncTodayFilter);
    return () => {
      window.removeEventListener('focus', syncTodayFilter);
      document.removeEventListener('visibilitychange', syncTodayFilter);
    };
  }, [datesLockedToToday]);

  // ── Sort ──
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // ── Selected / modals ──
  const [viewing, setViewing] = useState<Transaction | null>(null);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState<Transaction | null>(null);
  const [showManagerPin, setShowManagerPin] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Transaction | null>(null);
  const [payingOrder, setPayingOrder] = useState<Transaction | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // ── Extract sale transactions ──
  const allSales = useMemo(() => transactions.filter((t) => t.type === 'sale'), [transactions]);

  // ── Filtered + sorted ──
  const filtered = useMemo(() => {
    let rows = allSales;

    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (t) =>
          t.description.toLowerCase().includes(q) ||
          (t.customerName ?? '').toLowerCase().includes(q) ||
          (t.receiptLines ?? []).some((l) => l.name.toLowerCase().includes(q))
      );
    }
    if (statusFilter !== 'all') rows = rows.filter((t) => statusOf(t) === statusFilter);
    if (methodFilter !== 'all') rows = rows.filter((t) => t.method === methodFilter);
    if (channelFilter !== 'all') rows = rows.filter((t) => t.channel === channelFilter);

    const fromKey = dateFrom || todayBusinessKey();
    const toKey = dateTo || todayBusinessKey();
    rows = rows.filter((t) => isBusinessDayKeyInRange(businessDateKey(t.date), fromKey, toKey));

    return [...rows].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'date') cmp = orderInstant(a) - orderInstant(b);
      if (sortField === 'amount') cmp = a.amount - b.amount;
      if (sortField === 'items') cmp = itemCount(a) - itemCount(b);
      if (cmp === 0) cmp = b.id.localeCompare(a.id);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [
    allSales,
    search,
    statusFilter,
    methodFilter,
    channelFilter,
    dateFrom,
    dateTo,
    sortField,
    sortDir,
  ]);

  // ── Pagination ──
  const { paginatedData, pagination } = useClientPagination(filtered, {
    initialPageSize: PAGINATION.ORDER_HISTORY_PAGE_SIZE,
    pageSizeOptions: PAGINATION.ORDER_HISTORY_PAGE_SIZE_OPTIONS,
  });
  const { currentPage, totalPages, totalItems } = pagination;

  const topOrderId = useMemo(() => findTopOrderId(filtered), [filtered]);

  // ── KPIs ──
  const kpis = useMemo(() => {
    const active = filtered.filter((t) => statusOf(t) === 'completed');
    const pendingCount = filtered.filter((t) => statusOf(t) === 'pending').length;

    const revenueByMethod: Record<PaymentMethod, number> = { cash: 0, bkash: 0, bank: 0 };
    active.forEach((t) => {
      const method = t.method ?? 'cash';
      revenueByMethod[method] += t.amount;
    });
    const totalRevenue = revenueByMethod.cash + revenueByMethod.bkash + revenueByMethod.bank;
    const avgOrder = active.length ? Math.round(totalRevenue / active.length) : 0;

    // Most ordered item
    const itemTally: Record<string, number> = {};
    active.forEach((t) =>
      (t.receiptLines ?? []).forEach((l) => {
        itemTally[l.name] = (itemTally[l.name] ?? 0) + l.qty;
      })
    );
    const topItem = Object.entries(itemTally).sort((a, b) => b[1] - a[1])[0];

    return {
      total: filtered.length,
      pendingCount,
      revenue: totalRevenue,
      revenueByMethod,
      avg: avgOrder,
      topItem,
    };
  }, [filtered]);

  // ── Sort toggle ──
  const handleSort = useCallback((field: SortField) => {
    setSortField((prev) => {
      if (prev === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      else {
        setSortDir('desc');
      }
      return field;
    });
  }, []);

  // ── Delete flow ──
  const requestDelete = useCallback((tx: Transaction) => {
    setPendingDelete(tx);
    setShowManagerPin(true);
  }, []);

  const handlePinVerified = useCallback(() => {
    setShowManagerPin(false);
    if (pendingDelete) setDeleting(pendingDelete);
  }, [pendingDelete]);

  const confirmDelete = useCallback(async () => {
    if (!deleting) return;
    try {
      await salesService.delete(deleting.id);
      if (viewing?.id === deleting.id) setViewing(null);
      setDeleting(null);
      setPendingDelete(null);
      await refreshSales();
      toast.success('Order deleted');
    } catch {
      toast.error('Failed to delete order');
    }
  }, [deleting, viewing, refreshSales]);

  const handleSaveEdit = useCallback(
    async (updated: Transaction) => {
      try {
        const editable = updated as Transaction & {
          subtotal?: number;
          tax?: number;
          discountType?: 'flat' | 'percent';
          discountValue?: number;
          customerPaid?: number;
          changeAmount?: number;
          receiptStatus?: ReceiptStatus;
          posChannel?: 'in_store' | 'takeaway' | 'delivery';
          orderNumber?: string;
          tableNumber?: string;
          cashier?: string;
        };
        const payload = {
          channel: editable.channel,
          paymentMethod: editable.method,
          amount: editable.amount,
          description: editable.description,
          date:
            editable.date instanceof Date
              ? editable.date.toISOString()
              : new Date(editable.date).toISOString(),
          orderNumber: editable.orderNumber,
          receiptStatus: editable.receiptStatus,
          posChannel: editable.posChannel,
          customerName: editable.customerName,
          tableNumber: editable.tableNumber,
          category: editable.category,
          quantity: editable.quantity,
          discountAmount: editable.discountAmount,
          giftItemCount: editable.giftItemCount,
          giftTotalValue: editable.giftTotalValue,
          cashier: editable.cashier,
          receiptLines: editable.receiptLines,
          subtotal: editable.subtotal,
          customerPaid: editable.customerPaid,
          changeAmount: editable.changeAmount,
          discountType: editable.discountType,
          discountValue: editable.discountValue,
          tax: editable.tax,
        };
        const saved = await salesService.update(updated.id, payload);
        if (viewing?.id === saved.id) setViewing(saved);
        setEditing(null);
        await refreshSales();
        toast.success('Order updated and saved');
      } catch {
        toast.error('Failed to update order');
      }
    },
    [refreshSales, viewing]
  );

  const handlePaymentComplete = useCallback(
    async (
      updated: Transaction,
      payment: { method: PaymentMethod; customerPaid: number; changeAmount: number }
    ) => {
      try {
        const saved = await salesService.update(
          updated.id,
          transactionToSaleUpdate(updated, payment)
        );
        setViewing(saved);
        setPayingOrder(null);
        await refreshSales();
        toast.success(`Payment received · ${orderLabel(updated)} completed`);
      } catch {
        toast.error('Failed to complete payment');
      }
    },
    [refreshSales]
  );

  // ── Active filter count ──
  const todayKey = todayBusinessKey();
  const datesCustomized = dateFrom !== todayKey || dateTo !== todayKey;

  const activeFilters = [
    statusFilter !== 'all',
    methodFilter !== 'all',
    channelFilter !== 'all',
    datesCustomized,
  ].filter(Boolean).length;

  const clearFilters = () => {
    setStatusFilter('all');
    setMethodFilter('all');
    setChannelFilter('all');
    setDateFrom(todayKey);
    setDateTo(todayKey);
    setDatesLockedToToday(true);
    setSearch('');
  };

  return (
    <div className="space-y-3 sm:space-y-5">
      {/* ── Page Header ── */}
      <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl font-bold text-slate-800">Order History</h1>
          <p className="text-[11px] sm:text-sm text-slate-500 mt-0.5 truncate">
            {loading
              ? 'Loading orders from server…'
              : `${filtered.length} orders in range · ${filtered.filter((t) => statusOf(t) === 'completed').length} completed${kpis.pendingCount > 0 ? ` · ${kpis.pendingCount} pending` : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {activeFilters > 0 && (
            <button
              onClick={clearFilters}
              className="text-[11px] sm:text-xs text-red-500 hover:text-red-600 font-semibold flex items-center gap-1 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 transition-colors whitespace-nowrap"
            >
              <X size={12} /> Clear ({activeFilters})
            </button>
          )}
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`flex items-center gap-1.5 sm:gap-2 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl border text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
              showFilters || activeFilters > 0
                ? 'border-amber-400 bg-amber-50 text-amber-700'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
            }`}
          >
            <SlidersHorizontal size={14} />
            Filters
            {activeFilters > 0 && (
              <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-black flex items-center justify-center">
                {activeFilters}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
        <KpiCard
          label="Total Orders"
          value={String(kpis.total)}
          sub={`${kpis.pendingCount} pending · ${filtered.filter((t) => statusOf(t) === 'completed').length} completed`}
          icon={ShoppingCart}
          color="bg-amber-500"
        />
        <RevenueKpiCard revenue={kpis.revenue} byMethod={kpis.revenueByMethod} />
        <KpiCard
          label="Avg Order"
          value={`৳${kpis.avg}`}
          sub="Per completed order"
          icon={DollarSign}
          color="bg-blue-500"
        />
        <KpiCard
          label="Top Item"
          value={kpis.topItem ? kpis.topItem[0].split(' ').slice(0, 2).join(' ') : '—'}
          sub={kpis.topItem ? `${kpis.topItem[1]} sold` : 'No data'}
          icon={UtensilsCrossed}
          color="bg-violet-500"
        />
      </div>

      {/* ── Search ── */}
      <div className="relative">
        <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by order description, customer name, or item..."
          className="w-full pl-11 pr-10 py-3 rounded-2xl border border-slate-200 bg-white shadow-sm text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* ── Advanced Filters ── */}
      {showFilters && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
          {/* Status */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1.5">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ReceiptStatus | 'all')}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold outline-none focus:border-amber-400 transition-all bg-white"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="refunded">Refunded</option>
              <option value="voided">Voided</option>
            </select>
          </div>

          {/* Payment */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1.5">
              Payment
            </label>
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value as PaymentMethod | 'all')}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold outline-none focus:border-amber-400 transition-all bg-white"
            >
              <option value="all">All Methods</option>
              <option value="cash">Cash</option>
              <option value="bkash">bKash</option>
              <option value="bank">Card / Bank</option>
            </select>
          </div>

          {/* Channel */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1.5">
              Channel
            </label>
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value as SalesChannel | 'all')}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold outline-none focus:border-amber-400 transition-all bg-white"
            >
              <option value="all">All Channels</option>
              <option value="in_store">In-Store</option>
              <option value="foodpanda">Foodpanda</option>
              <option value="foodi">Foodi</option>
            </select>
          </div>

          {/* Date From */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1.5">
              From Date
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDatesLockedToToday(false);
                setDateFrom(e.target.value);
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:border-amber-400 transition-all"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1.5">
              To Date
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDatesLockedToToday(false);
                setDateTo(e.target.value);
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:border-amber-400 transition-all"
            />
          </div>
        </div>
      )}

      {/* ── Results info ── */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <Filter size={12} />
          Showing <strong className="text-slate-700">{filtered.length}</strong> of{' '}
          <strong className="text-slate-700">{allSales.length}</strong> orders in database
        </span>
        <div className="flex items-center gap-3">
          {topOrderId && (
            <span className="hidden sm:inline-flex items-center gap-1 text-violet-600 font-semibold">
              <Trophy size={12} className="text-violet-500" />
              Top order = highest completed bill in results
            </span>
          )}
          <span>
            Page {currentPage} of {Math.max(1, totalPages)}
          </span>
        </div>
      </div>

      {/* ── Table ── */}
      <DataTableShell>
        {paginatedData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <ShoppingCart size={44} className="text-slate-200 mb-3" />
            <p className="text-base font-bold text-slate-500">No orders found</p>
            <p className="text-sm text-slate-400 mt-1">
              {search || activeFilters > 0
                ? 'Try adjusting your search or filters'
                : 'Orders placed from New Order will appear here'}
            </p>
            {(search || activeFilters > 0) && (
              <button
                onClick={clearFilters}
                className="mt-3 text-sm text-amber-600 hover:text-amber-700 font-semibold"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <DataTable>
            <DataTableColGroup widths={['22%', '14%', '10%', '8%', '11%', '11%', '11%', '13%']} />
            <DataTableHead>
              <DataTableHeadRow>
                <DataTableHeadCell align="left">Order</DataTableHeadCell>
                <DataTableHeadCell align="left">
                  <SortBtn
                    field="date"
                    label="Date / Time"
                    sortField={sortField}
                    sortDir={sortDir}
                    onSort={handleSort}
                  />
                </DataTableHeadCell>
                <DataTableHeadCell align="center">Table</DataTableHeadCell>
                <DataTableHeadCell align="center">
                  <span className="inline-flex justify-center w-full">
                    <SortBtn
                      field="items"
                      label="Items"
                      sortField={sortField}
                      sortDir={sortDir}
                      onSort={handleSort}
                    />
                  </span>
                </DataTableHeadCell>
                <DataTableHeadCell align="center">Payment</DataTableHeadCell>
                <DataTableHeadCell align="center">Channel</DataTableHeadCell>
                <DataTableHeadCell align="right">
                  <span className="inline-flex justify-end w-full">
                    <SortBtn
                      field="amount"
                      label="Amount"
                      sortField={sortField}
                      sortDir={sortDir}
                      onSort={handleSort}
                    />
                  </span>
                </DataTableHeadCell>
                <DataTableHeadCell align="center">Actions</DataTableHeadCell>
              </DataTableHeadRow>
            </DataTableHead>
            <DataTableBody>
              {paginatedData.map((tx) => {
                const status = statusOf(tx);
                const cfg = STATUS_CONFIG[status];
                const StatusIcon = cfg.icon;
                const mCfg = tx.method ? METHOD_CONFIG[tx.method] : null;
                const MIcon = mCfg?.icon;
                const chCfg = tx.channel ? CHANNEL_CONFIG[tx.channel] : null;
                const ChIcon = chCfg?.icon;
                const isTop = tx.id === topOrderId;
                const isSelected = viewing?.id === tx.id;
                const rowVariant = isSelected ? 'selected' : isTop ? 'top' : 'default';

                return (
                  <DataTableRow
                    key={tx.id}
                    variant={rowVariant}
                    onClick={() => setViewing((v) => (v?.id === tx.id ? null : tx))}
                  >
                    <DataTableCell align="left">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-sm font-semibold text-slate-800 truncate max-w-[140px] sm:max-w-none">
                            {orderLabel(tx)}
                          </p>
                          {isTop && (
                            <span className="shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide bg-violet-100 text-violet-700 border border-violet-200">
                              <Trophy size={9} />
                              Top
                            </span>
                          )}
                          <span
                            className={`shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${cfg.bg} ${cfg.text}`}
                          >
                            <StatusIcon size={10} />
                            {cfg.label}
                          </span>
                        </div>
                        {tx.customerName && (
                          <p className="text-xs text-slate-400 mt-0.5 truncate">
                            {tx.customerName}
                          </p>
                        )}
                      </div>
                    </DataTableCell>

                    <DataTableCell align="left">
                      <p className="text-xs font-semibold text-slate-700 tabular-nums">
                        {formatDate(resolveOrderTimestamp(tx))}
                      </p>
                      <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5 tabular-nums">
                        <Clock size={10} className="shrink-0" />
                        {formatTime(resolveOrderTimestamp(tx))}
                      </p>
                    </DataTableCell>

                    <DataTableCell align="center">
                      {tx.tableNumber ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-bold border border-slate-200">
                          {tx.tableNumber}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </DataTableCell>

                    <DataTableCell align="center">
                      <span className="text-sm font-bold text-slate-700 tabular-nums">
                        {itemCount(tx)}
                      </span>
                      <p className="text-[10px] text-slate-400">items</p>
                    </DataTableCell>

                    <DataTableCell align="center">
                      {mCfg && MIcon ? (
                        <span
                          className={`inline-flex items-center justify-center gap-1 text-xs font-semibold ${mCfg.color}`}
                        >
                          <MIcon size={13} />
                          {mCfg.label}
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-amber-600">Unpaid</span>
                      )}
                    </DataTableCell>

                    <DataTableCell align="center">
                      {chCfg && ChIcon ? (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${chCfg.badgeClass}`}
                        >
                          <ChIcon size={10} />
                          {chCfg.label}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </DataTableCell>

                    <DataTableCell align="right">
                      <span
                        className={`text-sm font-bold tabular-nums ${isTop ? 'text-violet-700' : 'text-slate-800'}`}
                      >
                        ৳{tx.amount.toLocaleString()}
                      </span>
                    </DataTableCell>

                    <DataTableCell align="center">
                      <div
                        className="flex items-center justify-center gap-0.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {status === 'pending' && canMutate && (
                          <button
                            type="button"
                            onClick={() => {
                              setViewing(tx);
                              setPayingOrder(tx);
                            }}
                            title="Receive Payment"
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-amber-500 hover:text-amber-700 hover:bg-amber-50 transition-all"
                          >
                            <Banknote size={14} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setViewing((v) => (v?.id === tx.id ? null : tx))}
                          title="View details"
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                        >
                          <Eye size={14} />
                        </button>

                        {/* ONLY OWNER CAN SEE TABLE EDIT/DELETE BUTTONS */}
                        {isOwner && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setEditing(tx);
                              }}
                              title="Edit"
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-all"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => requestDelete(tx)}
                              title="Delete"
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
                            >
                              <Trash2 size={13} />
                            </button>
                          </>
                        )}
                      </div>
                    </DataTableCell>
                  </DataTableRow>
                );
              })}
            </DataTableBody>
          </DataTable>
        )}
      </DataTableShell>

      {/* ── Pagination ── */}
      {totalItems > PAGINATION.ORDER_HISTORY_PAGE_SIZE && (
        <Pagination pagination={pagination} showPageSizeSelector />
      )}

      {/* ── Detail Drawer ── */}
      {viewing && (
        <DetailDrawer
          tx={viewing}
          onClose={() => setViewing(null)}
          onEdit={() => {
            setEditing(viewing);
          }}
          onDelete={() => requestDelete(viewing)}
          onReceivePayment={() => setPayingOrder(viewing)}
          canMutate={canMutate}
          isOwner={isOwner} // Passed down to restrict Drawer actions
        />
      )}

      {payingOrder && (
        <PendingPaymentModal
          tx={payingOrder}
          onClose={() => setPayingOrder(null)}
          onComplete={handlePaymentComplete}
        />
      )}

      {/* ── Edit Modal ── */}
      <EditTransactionModal
        isOpen={!!editing}
        transaction={editing}
        onClose={() => setEditing(null)}
        onSave={handleSaveEdit}
        itemNames={itemNames}
        suppliers={supplierNames}
      />

      {/* ── Manager PIN gate ── */}
      <ManagerPasswordModal
        isOpen={showManagerPin}
        onClose={() => {
          setShowManagerPin(false);
          setPendingDelete(null);
        }}
        onConfirm={handlePinVerified}
        title="Confirm Delete"
        requiredRole="owner"
      />

      {/* ── Delete confirmation ── */}
      {deleting && (
        <DeleteConfirmModal
          tx={deleting}
          onConfirm={confirmDelete}
          onCancel={() => {
            setDeleting(null);
            setPendingDelete(null);
          }}
        />
      )}
    </div>
  );
}
