import { useState, useMemo, useCallback } from 'react';

export interface PaginationConfig {
  initialPage?: number;
  initialPageSize?: number;
  pageSizeOptions?: number[];
}

export interface PaginationState {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface PaginationActions {
  goToPage: (page: number) => void;
  goToNextPage: () => void;
  goToPreviousPage: () => void;
  goToFirstPage: () => void;
  goToLastPage: () => void;
  setPageSize: (size: number) => void;
  setTotalItems: (total: number) => void;
  reset: () => void;
}

export interface UsePaginationReturn extends PaginationState, PaginationActions {
  canGoNext: boolean;
  canGoPrevious: boolean;
  startIndex: number;
  endIndex: number;
  pageSizeOptions: number[];
}

/**
 * Global pagination hook
 * Manages pagination state and provides actions to navigate pages
 * 
 * @example
 * ```tsx
 * const pagination = usePagination({ initialPageSize: 20 });
 * 
 * // Use with data
 * const paginatedData = data.slice(pagination.startIndex, pagination.endIndex);
 * 
 * // Or set total items from API response
 * pagination.setTotalItems(response.total);
 * ```
 */
export const usePagination = (config: PaginationConfig = {}): UsePaginationReturn => {
  const {
    initialPage = 1,
    initialPageSize = 10,
    pageSizeOptions = [5, 10, 20, 50, 100],
  } = config;

  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [totalItems, setTotalItems] = useState(0);

  // Check if showing all items (pageSize equals or exceeds totalItems)
  const isShowingAll = pageSize >= totalItems && totalItems > 0;

  // Calculate total pages
  const totalPages = useMemo(() => {
    if (isShowingAll || totalItems === 0) return 1;
    return Math.ceil(totalItems / pageSize);
  }, [totalItems, pageSize, isShowingAll]);

  // Calculate start and end indices for array slicing
  const startIndex = useMemo(() => {
    if (isShowingAll) return 0;
    return (currentPage - 1) * pageSize;
  }, [currentPage, pageSize, isShowingAll]);

  const endIndex = useMemo(() => {
    if (isShowingAll) return totalItems;
    return Math.min(startIndex + pageSize, totalItems);
  }, [startIndex, pageSize, totalItems, isShowingAll]);

  // Navigation flags
  const canGoNext = currentPage < totalPages;
  const canGoPrevious = currentPage > 1;

  // Navigation actions
  const goToPage = useCallback((page: number) => {
    const targetPage = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(targetPage);
  }, [totalPages]);

  const goToNextPage = useCallback(() => {
    if (canGoNext) {
      setCurrentPage(prev => prev + 1);
    }
  }, [canGoNext]);

  const goToPreviousPage = useCallback(() => {
    if (canGoPrevious) {
      setCurrentPage(prev => prev - 1);
    }
  }, [canGoPrevious]);

  const goToFirstPage = useCallback(() => {
    setCurrentPage(1);
  }, []);

  const goToLastPage = useCallback(() => {
    setCurrentPage(totalPages);
  }, [totalPages]);

  const handleSetPageSize = useCallback((size: number) => {
    setPageSize(size);
    // Reset to first page when changing page size
    setCurrentPage(1);
  }, []);

  const reset = useCallback(() => {
    setCurrentPage(initialPage);
    setPageSize(initialPageSize);
    setTotalItems(0);
  }, [initialPage, initialPageSize]);

  return {
    // State
    currentPage,
    pageSize,
    totalItems,
    totalPages,
    
    // Actions
    goToPage,
    goToNextPage,
    goToPreviousPage,
    goToFirstPage,
    goToLastPage,
    setPageSize: handleSetPageSize,
    setTotalItems,
    reset,
    
    // Computed
    canGoNext,
    canGoPrevious,
    startIndex,
    endIndex,
    pageSizeOptions,
  };
};
