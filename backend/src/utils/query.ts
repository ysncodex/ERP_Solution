import { businessDateKey, parseBusinessDate } from './businessDate.js';

/**
 * Build a Prisma `date` filter from optional ISO/`YYYY-MM-DD` bounds.
 * Bounds are resolved to business-day keys, then expanded to the full UTC day
 * so they correctly capture rows stored at UTC noon of that business day.
 */
export function dateRangeWhere(startDate?: string, endDate?: string) {
  const date: { gte?: Date; lte?: Date } = {};

  if (startDate) {
    const [y, m, d] = businessDateKey(startDate).split('-').map(Number);
    date.gte = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
  }

  if (endDate) {
    const [y, m, d] = businessDateKey(endDate).split('-').map(Number);
    date.lte = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999));
  }

  return Object.keys(date).length > 0 ? { date } : {};
}

/** Normalise pagination query params into Prisma skip/take. */
export function paginate(page?: number, limit?: number) {
  const safeLimit = Math.min(Math.max(limit ?? 1000, 1), 5000);
  const safePage = Math.max(page ?? 1, 1);
  return { skip: (safePage - 1) * safeLimit, take: safeLimit };
}

/** Parse request date strings consistently for writes. */
export { parseBusinessDate };
