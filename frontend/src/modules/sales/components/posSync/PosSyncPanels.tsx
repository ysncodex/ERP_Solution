import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Cloud,
  Layers,
  Pencil,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
  Wifi,
  WifiOff,
  XCircle,
} from 'lucide-react';
import RangeCalendar from '@/shared/components/ui/Calendar/CustomCalendar';
import { Pagination } from '@/shared/components/ui';
import type { Transaction, SalesChannel } from '@/core/types';
import type { UsePaginationReturn } from '@/shared/hooks';
import { formatCurrency, formatDateTime } from '@/shared/utils/formatters';
import {
  CHANNEL_DISPLAY,
  DELIVERY_INTEGRATIONS,
  INTEGRATION_UI,
  METHOD_DISPLAY,
  POS_SYNC_QUICK_GUIDE,
  SYNC_SALES_CHANNELS,
  TRANSACTION_TYPE_LABELS,
} from '@/modules/sales/utils/posSync.constants';
import type {
  IntegrationActivityLogEntry,
  SyncFailureLogEntry,
} from '@/modules/sales/utils/posSyncHub.storage';

/* ─── Quick guide ─────────────────────────────────────────────────────────── */

export function PosSyncQuickGuide() {
  return (
    <section
      aria-label="How POS Sync works"
      className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-3 sm:p-5"
    >
      <p className="text-xs font-bold uppercase tracking-wide text-indigo-700 mb-3">Quick guide</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {POS_SYNC_QUICK_GUIDE.map(({ step, title, body, icon: Icon }) => (
          <div key={step} className="rounded-xl border border-white/80 bg-white/90 p-3 shadow-sm">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-bold text-white">
                {step}
              </span>
              <Icon size={14} className="text-indigo-600 shrink-0" />
              <span className="text-xs font-bold text-slate-800">{title}</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed pl-8">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─── Connection bar ──────────────────────────────────────────────────────── */

export function PosSyncConnectionBar({
  isOnline,
  pendingCount,
  lastSyncPhrase,
  isFlushingPending,
  onSync,
  readOnly = false,
}: {
  isOnline: boolean;
  pendingCount: number;
  lastSyncPhrase: string;
  isFlushingPending: boolean;
  onSync: () => void;
  readOnly?: boolean;
}) {
  const statusMessage = !isOnline
    ? 'You are offline. Complete orders in New Order — they will upload when Wi-Fi returns.'
    : pendingCount > 0
      ? `${pendingCount} receipt${pendingCount === 1 ? '' : 's'} ready to upload`
      : 'You are online. New sales save to Daily Sales immediately.';

  return (
    <section
      aria-label="Connection status"
      className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-4 sm:px-5 py-4 bg-gradient-to-r from-slate-50 via-white to-slate-50/80 border-b border-slate-100">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className={`p-2.5 rounded-xl shrink-0 ${
              isOnline ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
            }`}
          >
            {isOnline ? <Wifi size={20} /> : <WifiOff size={20} />}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide border ${
                  isOnline
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}
              >
                {isOnline ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
            <p className="text-sm font-semibold text-slate-800 mt-2 leading-snug">
              {statusMessage}
            </p>
            <p className="text-xs text-slate-500 mt-1">{lastSyncPhrase}</p>
          </div>
        </div>

        {!readOnly && (
          <button
            type="button"
            disabled={isFlushingPending || !isOnline || pendingCount === 0}
            onClick={onSync}
            className="w-full sm:w-auto shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 disabled:opacity-45 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw size={15} className={isFlushingPending ? 'animate-spin' : ''} />
            {isFlushingPending ? 'Uploading…' : 'Upload now'}
          </button>
        )}
      </div>
    </section>
  );
}

/* ─── Offline queue ───────────────────────────────────────────────────────── */

export function PosSyncOfflineQueue({
  pendingCount,
  isOnline,
  isFlushingPending,
  flushProgress,
  onAddOfflineReceipt,
  readOnly = false,
}: {
  pendingCount: number;
  isOnline: boolean;
  isFlushingPending: boolean;
  flushProgress: number;
  onAddOfflineReceipt: () => void;
  readOnly?: boolean;
}) {
  return (
    <div className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden h-full">
      <div className="px-4 sm:px-5 py-4 border-b border-slate-100 flex items-start gap-3">
        <div className="bg-amber-50 p-2.5 rounded-xl text-amber-700 shrink-0">
          <Layers size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold text-slate-800">Offline upload queue</h2>
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
            Orders completed without internet appear here until you upload them.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 items-baseline">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 tabular-nums">
              {pendingCount}
            </span>
            <span className="text-sm font-semibold text-slate-600">
              receipt{pendingCount === 1 ? '' : 's'} waiting
            </span>
          </div>
          {pendingCount === 0 && (
            <p className="mt-3 text-xs text-slate-500 leading-relaxed">
              No receipts waiting. Use New Order while offline to add sales here automatically.
            </p>
          )}
          {pendingCount > 0 && (
            <div className="mt-4 space-y-1.5">
              <div className="flex justify-between text-[11px] font-bold uppercase tracking-wide text-slate-400">
                <span>Upload progress</span>
                <span>
                  {isFlushingPending
                    ? `${Math.round(flushProgress)}%`
                    : isOnline
                      ? 'Ready'
                      : 'Paused'}
                </span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                <div
                  className={`h-full rounded-full transition-[width] duration-300 ease-out ${
                    isFlushingPending
                      ? 'bg-gradient-to-r from-indigo-500 to-emerald-500'
                      : 'bg-indigo-200'
                  }`}
                  style={{
                    width: `${isFlushingPending ? flushProgress : isOnline ? 12 : 0}%`,
                  }}
                />
              </div>
              {!isOnline && (
                <p className="text-[11px] text-rose-700 font-semibold mt-2 flex items-center gap-1">
                  <WifiOff size={13} />
                  Upload starts automatically when you reconnect.
                </p>
              )}
            </div>
          )}
          {!readOnly && (
            <button
              type="button"
              onClick={onAddOfflineReceipt}
              className="mt-4 w-full sm:w-auto text-xs font-bold text-indigo-700 px-3 py-2.5 rounded-xl border border-indigo-200 hover:bg-indigo-50 transition-colors"
            >
              + Add Offline Receipt
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Delivery integrations ───────────────────────────────────────────────── */

export function PosSyncIntegrations({
  isOnline,
  integrationLogs,
  onConnectPartner,
  readOnly = false,
}: {
  isOnline: boolean;
  integrationLogs: IntegrationActivityLogEntry[];
  onConnectPartner: (key: (typeof DELIVERY_INTEGRATIONS)[number]) => void;
  readOnly?: boolean;
}) {
  return (
    <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col h-full">
      <div className="px-4 sm:px-5 py-4 border-b border-slate-100 flex items-center gap-2">
        <Cloud size={18} className="text-indigo-500 shrink-0" />
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-slate-800">Delivery apps</h2>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Link Foodpanda, Foodi, and Pathao to import delivery orders into Daily Sales.
          </p>
        </div>
      </div>
      <div className="p-4 sm:p-5 grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {DELIVERY_INTEGRATIONS.map((key) => {
          const ui = INTEGRATION_UI[key];
          const Icon = ui.icon;
          return (
            <div
              key={key}
              className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 flex flex-col gap-3"
            >
              <div className="flex items-center gap-3">
                <div className="bg-white p-2 rounded-xl border border-slate-200 shrink-0">
                  <Icon size={22} className="text-indigo-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-800">{ui.title}</p>
                  <p className="text-[11px] text-slate-500 leading-snug">{ui.subtitle}</p>
                </div>
              </div>
              <span
                className={`inline-flex items-center w-fit px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                  isOnline
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}
              >
                {isOnline ? 'Ready to connect' : 'Needs internet'}
              </span>
              {!readOnly && (
                <button
                  type="button"
                  disabled={!isOnline}
                  onClick={() => onConnectPartner(key)}
                  className="mt-auto w-full py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wide bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shadow-indigo-100"
                >
                  Connect API
                </button>
              )}
            </div>
          );
        })}
      </div>
      <div className="border-t border-slate-100 bg-slate-50/60 px-4 sm:px-5 py-3 flex-1 min-h-[100px]">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-2 flex items-center gap-1">
          <ClipboardList size={12} />
          Connection history
        </p>
        <div className="space-y-2 max-h-36 sm:max-h-40 overflow-y-auto pr-1">
          {integrationLogs.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center leading-relaxed">
              Tap Connect API on a delivery app to start linking your store.
            </p>
          ) : (
            integrationLogs.map((log) => (
              <div
                key={log.id}
                className="text-xs text-slate-600 bg-white border border-slate-100 rounded-xl px-3 py-2"
              >
                <span className="text-[10px] text-slate-400 mr-2 font-mono">
                  {formatDateTime(log.atISO)}
                </span>
                {log.message}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Posted sales log ────────────────────────────────────────────────────── */

export function PosSyncTransactionLog({
  periodLabel,
  searchQuery,
  channelFilter,
  typeFilter,
  onSearchChange,
  onChannelChange,
  onTypeChange,
  onResetFilters,
  onDateRangeChange,
  customDateRange,
  dayTransactionCount,
  filteredCount,
  rows,
  pagination,
  onEdit,
  onDelete,
  readOnly = false,
}: {
  periodLabel: string;
  searchQuery: string;
  channelFilter: SalesChannel | 'all';
  typeFilter: 'all' | 'sale' | 'sale_adjustment';
  onSearchChange: (v: string) => void;
  onChannelChange: (v: SalesChannel | 'all') => void;
  onTypeChange: (v: 'all' | 'sale' | 'sale_adjustment') => void;
  onResetFilters: () => void;
  onDateRangeChange: (range: { from: Date | null; to: Date | null }) => void;
  customDateRange: { from: Date | null; to: Date | null };
  dayTransactionCount: number;
  filteredCount: number;
  rows: Transaction[];
  pagination: UsePaginationReturn;
  onEdit: (tx: Transaction) => void;
  onDelete: (tx: Transaction) => void;
  readOnly?: boolean;
}) {
  const hasActiveFilters = searchQuery || channelFilter !== 'all' || typeFilter !== 'all';

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="px-4 sm:px-5 py-4 border-b border-slate-100 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="bg-slate-100 p-2.5 rounded-xl shrink-0">
            <ClipboardList size={17} className="text-slate-600" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800">Uploaded sales</h2>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
              Sales and adjustments already in Daily Sales for {periodLabel}.
            </p>
          </div>
        </div>
        <div className="shrink-0 w-full sm:w-auto overflow-x-auto">
          <RangeCalendar value={customDateRange} onRangeChange={onDateRangeChange} align="right" />
        </div>
      </div>

      <div className="px-4 sm:px-5 py-3 border-b border-slate-100 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between bg-slate-50/40">
        <div className="relative w-full sm:flex-1 sm:max-w-xs min-w-0">
          <Search
            size={14}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search amount or description…"
            className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
          />
        </div>
        <div className="flex flex-col sm:flex-row flex-wrap gap-2 w-full sm:w-auto">
          <select
            value={channelFilter}
            onChange={(e) => onChannelChange(e.target.value as SalesChannel | 'all')}
            className="w-full sm:w-auto px-2.5 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
          >
            <option value="all">All channels</option>
            {SYNC_SALES_CHANNELS.map((ch) => (
              <option key={ch} value={ch}>
                {CHANNEL_DISPLAY[ch].label}
              </option>
            ))}
          </select>
          <select
            value={typeFilter}
            onChange={(e) => onTypeChange(e.target.value as 'all' | 'sale' | 'sale_adjustment')}
            className="w-full sm:w-auto px-2.5 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
          >
            <option value="all">All types</option>
            <option value="sale">Sale</option>
            <option value="sale_adjustment">Adjustment</option>
          </select>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="inline-flex items-center gap-1.5 px-2.5 py-2 text-xs text-rose-600 border border-rose-200 rounded-lg hover:bg-rose-50 font-medium transition-colors"
            >
              <RotateCcw size={12} />
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        {filteredCount === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-slate-400 px-4 text-center">
            <ClipboardList size={36} strokeWidth={1.2} />
            <p className="text-sm font-medium">No sales found</p>
            <p className="text-xs max-w-sm">
              {dayTransactionCount === 0
                ? 'No sales in this period. Change the date range or upload queued receipts.'
                : 'Try different filters or search terms.'}
            </p>
          </div>
        ) : (
          <table className="w-full min-w-[640px]">
            <thead className="bg-slate-50 border-b border-slate-100 sticky top-0 z-10">
              <tr>
                {(
                  [
                    'Date & time',
                    'Type',
                    'Channel',
                    'Method',
                    'Description',
                    'Amount',
                    'Actions',
                  ] as const
                ).map((h) => (
                  <th
                    key={h}
                    className={`px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider ${
                      h === 'Actions' ? 'text-right' : 'text-left'
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {rows.map((row) => {
                const ch = row.channel as SalesChannel | undefined;
                const chCfg = ch ? CHANNEL_DISPLAY[ch] : null;
                const ChIcon = chCfg?.icon;
                const mCfg = METHOD_DISPLAY[row.method ?? 'cash'];
                const Mi = mCfg.icon;
                const isAdj = row.type === 'sale_adjustment';

                return (
                  <tr
                    key={row.id}
                    className="hover:bg-indigo-50/30 transition-colors duration-100 group text-xs"
                  >
                    <td className="px-4 py-2.5 font-mono text-slate-600 whitespace-nowrap">
                      {formatDateTime(row.date)}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          isAdj
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        {TRANSACTION_TYPE_LABELS[row.type] ?? row.type}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      {!chCfg || !ChIcon ? (
                        <span className="text-slate-400">—</span>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${chCfg.badgeClass}`}
                        >
                          <ChIcon size={11} />
                          {chCfg.label}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center gap-1 font-medium ${mCfg.color}`}>
                        <Mi size={13} />
                        {mCfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 max-w-[200px]">
                      <span className="text-slate-700 truncate block">
                        {row.description || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`font-bold tabular-nums ${isAdj ? 'text-rose-600' : 'text-emerald-700'}`}
                      >
                        {isAdj ? '−' : '+'}
                        {formatCurrency(row.amount)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {!readOnly && (
                        <div className="inline-flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => onEdit(row)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Edit (manager)"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDelete(row)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete (manager)"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {filteredCount > 0 && (
        <div className="px-4 sm:px-5 py-3 border-t border-slate-100">
          <Pagination pagination={pagination} showPageSizeSelector showPageInfo />
        </div>
      )}
    </section>
  );
}

/* ─── Sync errors ─────────────────────────────────────────────────────────── */

export function PosSyncErrorLog({
  errors,
  openCount,
  isOnline,
  onRetry,
  onResolve,
  readOnly = false,
}: {
  errors: SyncFailureLogEntry[];
  openCount: number;
  isOnline: boolean;
  onRetry: (entry: SyncFailureLogEntry) => void;
  onResolve: (id: string) => void;
  readOnly?: boolean;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="px-4 sm:px-5 py-4 border-b border-slate-100 flex flex-wrap gap-3">
        <AlertTriangle size={18} className="text-rose-500 shrink-0" />
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-slate-800">Upload errors</h2>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            {openCount === 0
              ? 'No open issues. Failed uploads appear here for manager review.'
              : `${openCount} open issue${openCount === 1 ? '' : 's'} need manager approval.`}
          </p>
        </div>
      </div>
      <div className="overflow-x-auto -mx-px">
        <table className="w-full min-w-[520px]">
          <thead className="bg-slate-50 border-b border-slate-100 text-left">
            <tr>
              <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                When
              </th>
              <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Receipt
              </th>
              <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Problem
              </th>
              <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {errors.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-400 italic">
                  No sync failures logged.
                </td>
              </tr>
            ) : (
              errors.map((row) => (
                <tr
                  key={row.id}
                  className={`text-xs ${row.resolved ? 'bg-slate-50/80 opacity-80' : 'hover:bg-indigo-50/40'}`}
                >
                  <td className="px-4 py-3 font-mono text-slate-500 whitespace-nowrap">
                    {formatDateTime(row.createdAtISO)}
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{row.orderLabel}</td>
                  <td className="px-4 py-3 text-slate-700 max-w-md">{row.message}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ring-1 ${
                        row.resolved
                          ? 'bg-slate-200 text-slate-700 ring-slate-200'
                          : 'bg-rose-50 text-rose-700 ring-rose-200'
                      }`}
                    >
                      {row.resolved ? 'Resolved' : 'Open'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!row.resolved && !readOnly ? (
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          disabled={row.payload == null || !isOnline}
                          onClick={() => row.payload && onRetry(row)}
                          className="text-[11px] font-bold text-indigo-700 px-2.5 py-1 rounded-lg border border-indigo-200 hover:bg-indigo-50 disabled:opacity-35"
                        >
                          Retry
                        </button>
                        <button
                          type="button"
                          onClick={() => onResolve(row.id)}
                          className="text-[11px] font-bold text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50"
                        >
                          Mark resolved
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-semibold">Closed</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
