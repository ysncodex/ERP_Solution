import type { DateRange, DateRangeFilter, Transaction } from '@/core/types';
import { businessDateKey, todayBusinessKey } from '@/shared/utils/businessDate';

/** Add `days` to a YYYY-MM-DD business key and return the resulting key. */
function shiftKey(key: string, days: number): string {
  const [y, m, d] = key.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d, 12, 0, 0, 0));
  t.setUTCDate(t.getUTCDate() + days);
  return t.toISOString().slice(0, 10);
}

function dayStartUtc(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
}

function dayEndUtc(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));
}

export function filterTransactions(params: {
  transactions: Transaction[];
  dateRange: DateRange;
  customStart: string;
  customEnd: string;
  customDateRange: DateRangeFilter;
}) {
  const { transactions, dateRange, customStart, customEnd, customDateRange } = params;

  // All boundaries are anchored to the business timezone (UTC+6) so that
  // "today"/"week"/"month" mean the same calendar day everywhere.
  const todayKey = todayBusinessKey();
  const [ty, tm, td] = todayKey.split('-').map(Number);

  // Week starts on Sunday, matching the previous behaviour.
  const dayOfWeek = new Date(Date.UTC(ty, tm - 1, td, 12, 0, 0, 0)).getUTCDay();
  const weekStartKey = shiftKey(todayKey, -dayOfWeek);

  const monthStartKey = `${ty}-${String(tm).padStart(2, '0')}-01`;
  const prevMonthStartKey = shiftKey(monthStartKey, -1).slice(0, 8) + '01';
  const prevMonthEndKey = shiftKey(monthStartKey, -1);

  return transactions.filter((t) => {
    if (!t.date) return false;
    const tKey = businessDateKey(t.date);

    if (customDateRange.from && customDateRange.to) {
      const startKey = businessDateKey(customDateRange.from);
      const endKey = businessDateKey(customDateRange.to);
      return tKey >= startKey && tKey <= endKey;
    }

    if (dateRange === 'today') return tKey === todayKey;
    if (dateRange === 'week') return tKey >= weekStartKey && tKey <= todayKey;
    if (dateRange === 'month') return tKey >= monthStartKey && tKey <= todayKey;
    if (dateRange === 'prev_month') return tKey >= prevMonthStartKey && tKey <= prevMonthEndKey;
    if (dateRange === 'custom' && customStart && customEnd) {
      const startKey = customStart.slice(0, 10);
      const endKey = customEnd.slice(0, 10);
      return tKey >= startKey && tKey <= endKey;
    }

    return true;
  });
}

export { dayStartUtc, dayEndUtc };
