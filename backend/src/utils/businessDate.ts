/**
 * Business-day helpers (server mirror of the frontend logic).
 *
 * ERP dates are anchored to a single business timezone (Asia/Dhaka, UTC+6,
 * no DST). The Render host runs in UTC, so we must NOT use the server's local
 * clock to decide the calendar day — otherwise sales made between 00:00 and
 * 06:00 Dhaka time would be filed under the previous day.
 *
 * A business day is stored as UTC noon of its key; noon UTC = 6pm Dhaka, so the
 * stored UTC date always equals the business date (backward compatible).
 */

/** Fixed business timezone offset in minutes (Asia/Dhaka = UTC+6). */
export const BUSINESS_UTC_OFFSET_MINUTES = 6 * 60;

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** YYYY-MM-DD calendar-day key (in the business timezone) for any instant. */
function instantToBusinessKey(instant: Date): string {
  const shifted = new Date(instant.getTime() + BUSINESS_UTC_OFFSET_MINUTES * 60_000);
  return shifted.toISOString().slice(0, 10);
}

/** YYYY-MM-DD key for grouping/filtering by business day. */
export function businessDateKey(input: string | Date): string {
  if (input instanceof Date) return instantToBusinessKey(input);

  const trimmed = input.trim();
  if (DATE_ONLY_RE.test(trimmed)) return trimmed;

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) throw new Error(`Invalid date: ${input}`);
  return instantToBusinessKey(parsed);
}

/** Parse an ISO/YYYY-MM-DD value into the canonical UTC-noon instant for its business day. */
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
  if (Number.isNaN(parsed.getTime())) throw new Error(`Invalid date: ${input}`);
  return parsed;
}

/** Today's business-day key (YYYY-MM-DD) in the business timezone. */
export function todayBusinessKey(): string {
  return instantToBusinessKey(new Date());
}

/** Last calendar day of a YYYY-MM month (business timezone keys). */
export function businessMonthEndKey(month: string): string {
  const [year, mon] = month.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year, mon, 0)).getUTCDate();
  return `${month}-${String(lastDay).padStart(2, '0')}`;
}
