/**
 * Common Type Definitions
 */

export type DateRange = 'today' | 'week' | 'month' | 'prev_month' | 'custom' | 'all';

export interface DateRangeFilter {
  from: Date | null;
  to: Date | null;
}

export interface SelectOption {
  value: string;
  label: string;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
  total: number;
}

export interface PaginatedData<T> {
  data: T[];
  pagination: PaginationParams;
}

export interface ApiPaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}
