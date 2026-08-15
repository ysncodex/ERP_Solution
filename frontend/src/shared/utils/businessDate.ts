/**
 * Business-day helpers.
 *
 * All ERP reporting is anchored to a single business timezone (Asia/Dhaka,
 * UTC+6, no DST) so that "today" means the same calendar day for every device
 * regardless of where it runs — the Render server (UTC), the cashier's tablet,
 * or an owner travelling abroad.
 *
 * A business day is stored as **UTC noon** of that day's key. Noon UTC is 6pm
 * in Dhaka, so the UTC calendar date always equals the business date — which
 * keeps this backward compatible with every row already stored at UTC noon.
 */

/** Fixed business timezone offset in minutes (Asia/Dhaka = UTC+6). */
export const BUSINESS_UTC_OFFSET_MINUTES = 6 * 60;

/** IANA timezone for receipt labels and business-day display. */
export const BUSINESS_TIMEZONE = 'Asia/Dhaka';

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** YYYY-MM-DD calendar-day key (in the business timezone) for any instant. */
function instantToBusinessKey(instant: Date): string {
  const shifted = new Date(instant.getTime() + BUSINESS_UTC_OFFSET_MINUTES * 60_000);
  return shifted.toISOString().slice(0, 10);
}

/** YYYY-MM-DD key for grouping/filtering transactions by business day. */
export function businessDateKey(input: string | Date): string {
  if (typeof input === 'string') {
    const trimmed = input.trim();
    // Already a plain day key (e.g. from a date picker) — use as-is.
    if (DATE_ONLY_RE.test(trimmed)) return trimmed;

    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) return trimmed.slice(0, 10);
    return instantToBusinessKey(parsed);
  }
  return instantToBusinessKey(input);
}

/** Parse a Date or ISO/YYYY-MM-DD value to the canonical UTC-noon instant for its business day. */
export function parseBusinessDate(input: string | Date): Date {
  const key = businessDateKey(input);
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0, 0));
}

/**
 * Resolve a value for ledger / POS storage.
 * Date-picker keys (YYYY-MM-DD) → UTC noon of that business day.
 * Full ISO datetimes → preserve the exact instant (order creation time).
 */
export function resolveTransactionDate(input: string | Date): Date {
  if (input instanceof Date) return input;

  const trimmed = input.trim();
  if (DATE_ONLY_RE.test(trimmed)) return parseBusinessDate(trimmed);

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return parseBusinessDate(trimmed);
  return parsed;
}

/** Format time in the business timezone (receipts, order history). */
export function formatBusinessTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('en-US', {
    timeZone: BUSINESS_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/** Format calendar date in the business timezone. */
export function formatBusinessDateLabel(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-GB', {
    timeZone: BUSINESS_TIMEZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/** Convert an explicit calendar day (from a date picker) to the canonical ISO instant. */
export function localDatePickerToIso(year: number, month: number, day: number): string {
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0)).toISOString();
}

/** Today's business-day key (YYYY-MM-DD) in the business timezone. */
export function todayBusinessKey(): string {
  return instantToBusinessKey(new Date());
}

/** True when `dayKey` falls between two YYYY-MM-DD bounds (inclusive). */
export function isBusinessDayKeyInRange(
  dayKey: string,
  fromKey: string,
  toKey: string,
): boolean {
  return dayKey >= fromKey && dayKey <= toKey;
}

/** Calendar parts for the current business day (order numbers, labels). */
export function todayBusinessParts(): { year: number; month: number; day: number } {
  const [y, m, d] = todayBusinessKey().split('-').map(Number);
  return { year: y, month: m, day: d };
}

/** `{ from, to }` date-picker range for the current business day only. */
export function businessTodayDateRange(): { from: Date; to: Date } {
  const day = parseBusinessDate(todayBusinessKey());
  return { from: day, to: day };
}

/** First day of the current business month → today (better for reviewing demo history). */
export function businessMonthToDateRange(): { from: Date; to: Date } {
  const today = todayBusinessKey();
  const monthStart = `${today.slice(0, 7)}-01`;
  return {
    from: parseBusinessDate(monthStart),
    to: parseBusinessDate(today),
  };
}
