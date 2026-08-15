/**
 * ManagerDashboard — shift-focused operations cockpit.
 *
 * Built for the person running the floor, not the books. It answers four
 * questions at a glance:
 *   1. How is today's shift going?           → Live daily sales & orders
 *   2. Does the drawer reconcile?            → Cash & bKash point-of-sale balances
 *   3. What's moving on the floor?           → Recent orders & top items
 */

import { useState, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import {
  TrendingUp,
  TrendingDown,
  Banknote,
  Smartphone,
  Landmark,
  Utensils,
  Clock,
  ShoppingCart,
  CalendarDays,
  Wallet,
  Flame,
  RefreshCw,
  ScrollText,
  CircleDollarSign,
  type LucideIcon,
} from 'lucide-react';

import { useERP } from '@/core/context/useERP';
import { handleError } from '@/shared/utils';
import { businessDateKey, todayBusinessKey, formatBusinessTime } from '@/shared/utils/businessDate';
import { getUserDisplayName } from '@/shared/utils/staticPassword';
import type { Transaction, PaymentMethod } from '@/core/types';

// ─── Utility functions ────────────────────────────────────────────────────────

function formatDate(date: Date) {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

// ─── Today's shift analytics ──────────────────────────────────────────────────

interface TopItem {
  name: string;
  qty: number;
  revenue: number;
}

function useShiftStats(transactions: Transaction[]) {
  return useMemo(() => {
    const todayKey = todayBusinessKey();

    let revenue = 0;
    let orderCount = 0;
    let expenses = 0;
    const byMethod: Record<PaymentMethod, number> = { cash: 0, bkash: 0, bank: 0 };
    const byChannel = { in_store: 0, foodpanda: 0, foodi: 0 };
    const todaySales: Transaction[] = [];
    const itemMap = new Map<string, TopItem>();

    for (const t of transactions) {
      if (!t.date || businessDateKey(t.date) !== todayKey) continue;

      if (t.type === 'sale') {
        const amt = Number(t.amount);
        revenue += amt;
        orderCount++;
        todaySales.push(t);
        if (t.method) byMethod[t.method] += amt;
        if (t.channel) byChannel[t.channel] += amt;

        if (t.receiptLines?.length) {
          for (const line of t.receiptLines) {
            const key = line.name.trim().toLowerCase();
            const existing = itemMap.get(key) ?? { name: line.name, qty: 0, revenue: 0 };
            existing.qty += Number(line.qty) || 0;
            existing.revenue += (Number(line.qty) || 0) * (Number(line.unitPrice) || 0);
            itemMap.set(key, existing);
          }
        }
      } else if (t.type === 'sale_adjustment') {
        const amt = Number(t.amount);
        revenue -= amt;
        if (t.method) byMethod[t.method] -= amt;
      } else if (t.type === 'expense_product' || t.type === 'expense_fixed') {
        expenses += Number(t.amount);
      }
    }

    // Cap the rendered feed — a busy day can have hundreds of orders and we
    // only need the most recent ones on screen (full count is in `orderCount`).
    const recentOrders = [...todaySales]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 30);

    const topItems = [...itemMap.values()].sort((a, b) => b.qty - a.qty).slice(0, 5);

    const avgOrder = orderCount > 0 ? revenue / orderCount : 0;

    return {
      revenue,
      orderCount,
      expenses,
      netCash: revenue - expenses,
      avgOrder,
      byMethod,
      byChannel,
      recentOrders,
      topItems,
    };
  }, [transactions]);
}

// ─── Reusable presentational pieces ───────────────────────────────────────────

function LiveClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1_000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="font-mono tabular-nums">
      {now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })}
    </span>
  );
}

interface KpiCardProps {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  accent: string;
  iconBg: string;
}

function KpiCard({ label, value, hint, icon: Icon, accent, iconBg }: KpiCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
          <p
            className={`mt-2 text-2xl sm:text-[26px] font-black tabular-nums leading-none ${accent}`}
          >
            {value}
          </p>
          {hint && <p className="mt-1.5 text-[11px] text-slate-400 truncate">{hint}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
          <Icon size={18} />
        </div>
      </div>
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  right,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3 bg-slate-50">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0">
          <Icon size={15} className="text-slate-600" />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-slate-800 truncate">{title}</h2>
          {subtitle && <p className="text-[11px] text-slate-400 truncate">{subtitle}</p>}
        </div>
      </div>
      {right}
    </div>
  );
}

// ─── Point of Sale reconciliation ─────────────────────────────────────────────

interface BalanceRowProps {
  label: string;
  icon: LucideIcon;
  balance: number;
  todaySales: number;
  accent: string;
  iconBg: string;
  low?: boolean;
}

function BalanceRow({
  label,
  icon: Icon,
  balance,
  todaySales,
  accent,
  iconBg,
  low,
}: BalanceRowProps) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        low ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-white'
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${iconBg}`}>
          <Icon size={14} />
        </div>
        <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
          {label}
        </span>
      </div>
      <p className={`text-2xl font-black tabular-nums ${low ? 'text-red-600' : accent}`}>
        ৳{balance.toLocaleString()}
      </p>
      <p className="text-[11px] text-slate-400 mt-1">
        <span className="font-semibold text-emerald-600">+৳{todaySales.toLocaleString()}</span> in
        sales today
      </p>
      {low && (
        <p className="text-[10px] text-red-500 font-semibold mt-1">⚠ Low balance — refill soon</p>
      )}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function ManagerDashboard() {
  const { transactions, stats, isLoadingTransactions, refreshTransactions, refreshFundBalances } =
    useERP();
  const shift = useShiftStats(transactions);
  const [refreshing, setRefreshing] = useState(false);

  const managerName = getUserDisplayName();

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await Promise.all([refreshTransactions({ silent: true }), refreshFundBalances()]);
      toast.success('Shift data refreshed');
    } catch (error) {
      handleError(error, { action: 'manager_refresh', severity: 'low' });
    } finally {
      setRefreshing(false);
    }
  };

  const expectedDrawer = stats.cashBalance;
  const lowCash = stats.cashBalance < 2_000;

  return (
    <div className="space-y-5 pb-10">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800">
            {greeting()}, {managerName}
          </h1>
          <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-0.5">
            <CalendarDays size={13} /> {formatDate(new Date())}
            <span className="mx-1 text-slate-300">·</span>
            <Clock size={13} /> <LiveClock />
          </p>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing || isLoadingTransactions}
          className="inline-flex items-center gap-2 self-start px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-sm font-semibold text-slate-600 shadow-sm hover:border-slate-300 hover:text-slate-800 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* ── Live KPI strip ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard
          label="Today's Sales"
          value={`৳${shift.revenue.toLocaleString()}`}
          hint={`Avg order ৳${Math.round(shift.avgOrder).toLocaleString()}`}
          icon={TrendingUp}
          accent="text-emerald-600"
          iconBg="bg-emerald-50 text-emerald-600"
        />
        <KpiCard
          label="Orders"
          value={shift.orderCount.toLocaleString()}
          hint="Completed this shift"
          icon={ShoppingCart}
          accent="text-slate-800"
          iconBg="bg-amber-50 text-amber-600"
        />
        <KpiCard
          label="Expenses"
          value={`৳${shift.expenses.toLocaleString()}`}
          hint="Spent today"
          icon={TrendingDown}
          accent="text-rose-600"
          iconBg="bg-rose-50 text-rose-600"
        />
        <KpiCard
          label="Net Cash Flow"
          value={`${shift.netCash < 0 ? '−' : ''}৳${Math.abs(shift.netCash).toLocaleString()}`}
          hint="Sales − expenses"
          icon={CircleDollarSign}
          accent={shift.netCash >= 0 ? 'text-emerald-600' : 'text-rose-600'}
          iconBg="bg-blue-50 text-blue-600"
        />
      </div>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        {/* LEFT (2 cols) — Recent orders + top items */}
        <div className="lg:col-span-2 space-y-5">
          {/* Recent Orders */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <SectionHeader
              icon={ScrollText}
              title="Recent Orders"
              subtitle="Live flow of today's sales"
              right={
                <span className="flex h-2.5 w-2.5 relative shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
              }
            />
            <div className="max-h-[420px] overflow-y-auto">
              {shift.recentOrders.length === 0 ? (
                <div className="flex flex-col items-center py-14 text-center">
                  <ShoppingCart size={30} className="text-slate-200 mb-2" />
                  <p className="text-sm font-semibold text-slate-400">No orders yet today</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    New sales will appear here in real time
                  </p>
                </div>
              ) : (
                shift.recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center gap-3 px-5 py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors"
                  >
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        order.method === 'cash'
                          ? 'bg-emerald-50 text-emerald-600'
                          : order.method === 'bkash'
                            ? 'bg-pink-50 text-pink-600'
                            : 'bg-blue-50 text-blue-600'
                      }`}
                    >
                      {order.method === 'cash' ? (
                        <Banknote size={15} />
                      ) : order.method === 'bkash' ? (
                        <Smartphone size={15} />
                      ) : (
                        <Landmark size={15} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">
                        {order.description || 'Sale'}
                      </p>
                      <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                        {order.orderNumber && (
                          <span className="font-mono">{order.orderNumber}</span>
                        )}
                        {order.orderNumber && <span className="text-slate-300">·</span>}
                        {formatBusinessTime(new Date(order.date))}
                        {order.channel && (
                          <span className="capitalize">
                            <span className="text-slate-300"> · </span>
                            {order.channel.replace('_', '-')}
                          </span>
                        )}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-emerald-600 tabular-nums shrink-0">
                      ৳{Number(order.amount).toLocaleString()}
                    </span>
                  </div>
                ))
              )}
            </div>
            {shift.orderCount > shift.recentOrders.length && (
              <div className="px-5 py-2.5 border-t border-slate-100 bg-slate-50 text-center">
                <p className="text-[11px] text-slate-400">
                  Showing latest {shift.recentOrders.length} of {shift.orderCount} orders — see{' '}
                  <span className="font-semibold text-slate-500">Order History</span> for all
                </p>
              </div>
            )}
          </div>

          {/* Top Items */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <SectionHeader
              icon={Flame}
              title="Top Items Today"
              subtitle="Most ordered by quantity"
            />
            <div className="p-4 sm:p-5">
              {shift.topItems.length === 0 ? (
                <div className="flex flex-col items-center py-10 text-center">
                  <Utensils size={28} className="text-slate-200 mb-2" />
                  <p className="text-sm font-semibold text-slate-400">No itemised sales yet</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Top items appear once POS orders come in
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {shift.topItems.map((item, index) => {
                    const max = shift.topItems[0]?.qty || 1;
                    return (
                      <div key={item.name} className="space-y-1.5">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-5 text-[11px] font-black text-slate-400 tabular-nums shrink-0">
                              #{index + 1}
                            </span>
                            <span className="text-sm font-semibold text-slate-700 truncate">
                              {item.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-xs font-bold text-slate-500 tabular-nums">
                              {item.qty}×
                            </span>
                            <span className="text-sm font-bold text-emerald-600 tabular-nums w-20 text-right">
                              ৳{Math.round(item.revenue).toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-amber-400 transition-all duration-700"
                            style={{ width: `${Math.min(100, (item.qty / max) * 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT (1 col) — POS reconciliation */}
        <div className="space-y-5">
          {/* POS Balances / Reconciliation */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <SectionHeader
              icon={Wallet}
              title="Point of Sale Balances"
              subtitle="Reconcile the drawer at close"
            />
            <div className="p-4 sm:p-5 space-y-3">
              <BalanceRow
                label="Cash Drawer"
                icon={Banknote}
                balance={stats.cashBalance}
                todaySales={shift.byMethod.cash}
                accent="text-emerald-700"
                iconBg="bg-emerald-50 text-emerald-600"
                low={lowCash}
              />
              <BalanceRow
                label="bKash Wallet"
                icon={Smartphone}
                balance={stats.bkashBalance}
                todaySales={shift.byMethod.bkash}
                accent="text-pink-700"
                iconBg="bg-pink-50 text-pink-600"
              />

              {/* End-of-day reconciliation summary */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 mt-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
                  Shift Reconciliation
                </p>
                <div className="space-y-2 text-[13px]">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Cash sales today</span>
                    <span className="font-bold text-slate-700 tabular-nums">
                      +৳{shift.byMethod.cash.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">bKash sales today</span>
                    <span className="font-bold text-slate-700 tabular-nums">
                      +৳{shift.byMethod.bkash.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Card / bank sales</span>
                    <span className="font-bold text-slate-700 tabular-nums">
                      +৳{shift.byMethod.bank.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Expenses today</span>
                    <span className="font-bold text-rose-600 tabular-nums">
                      −৳{shift.expenses.toLocaleString()}
                    </span>
                  </div>
                  <div className="border-t border-slate-200 pt-2 flex justify-between items-center">
                    <span className="text-xs font-bold uppercase tracking-wide text-slate-600">
                      Expected in drawer
                    </span>
                    <span
                      className={`text-base font-black tabular-nums ${
                        lowCash ? 'text-red-600' : 'text-slate-800'
                      }`}
                    >
                      ৳{expectedDrawer.toLocaleString()}
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 mt-3 leading-relaxed">
                  Count the physical cash and match it against the expected drawer balance before
                  closing the shift.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
