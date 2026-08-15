import { useState, useEffect, useCallback, useRef } from 'react';
import { usePagination, type PaginationConfig, type UsePaginationReturn } from './usePagination';

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface UsePaginatedApiOptions<T> extends PaginationConfig {
  autoFetch?: boolean;
  dependencies?: unknown[];
  onSuccess?: (data: T[]) => void;
  onError?: (error: Error) => void;
}

export interface UsePaginatedApiReturn<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  pagination: UsePaginationReturn;
  refetch: () => Promise<void>;
}

export const usePaginatedApi = <T>(
  apiFunction: (page: number, pageSize: number) => Promise<PaginatedResponse<T>>,
  options: UsePaginatedApiOptions<T> = {}
): UsePaginatedApiReturn<T> => {
  const { autoFetch = true, dependencies = [], onSuccess, onError, ...paginationConfig } = options;

  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(autoFetch);
  const [error, setError] = useState<string | null>(null);

  const pagination = usePagination(paginationConfig);
  const { currentPage, pageSize, setTotalItems } = pagination;

  // Use refs for callbacks to prevent infinite loops when inline functions are passed
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;
  }, [onSuccess, onError]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiFunction(currentPage, pageSize);

      // Update data and pagination state
      setData(response.data);
      setTotalItems(response.total);

      // Safely call success ref
      if (onSuccessRef.current) {
        onSuccessRef.current(response.data);
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } }; message?: string };
      const errorMessage =
        axiosErr.response?.data?.message || axiosErr.message || 'Failed to fetch data';
      setError(errorMessage);
      console.error('Paginated API Error:', err);

      // Safely call error ref
      if (onErrorRef.current) {
        onErrorRef.current(err instanceof Error ? err : new Error(errorMessage));
      }
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiFunction, currentPage, pageSize, setTotalItems, ...dependencies]);

  useEffect(() => {
    if (autoFetch) {
      fetchData();
    }
  }, [fetchData, autoFetch]);

  return {
    data,
    loading,
    error,
    pagination,
    refetch: fetchData,
  };
};

export const useClientPagination = <T>(data: T[], config: PaginationConfig = {}) => {
  const pagination = usePagination(config);
  const { setTotalItems } = pagination;

  // Update total items when data changes. Safely include setTotalItems in dependencies.
  useEffect(() => {
    setTotalItems(data.length);
  }, [data.length, setTotalItems]);

  const paginatedData = data.slice(pagination.startIndex, pagination.endIndex);

  return {
    paginatedData,
    pagination,
  };
};
