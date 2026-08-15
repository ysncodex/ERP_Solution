import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import type { UsePaginationReturn } from '@/hooks/usePagination';

export interface PaginationProps {
  pagination: UsePaginationReturn;
  showPageSizeSelector?: boolean;
  showPageInfo?: boolean;
  className?: string;
}

/**
 * Reusable Pagination Component
 * Works with the usePagination hook
 */
export const Pagination = ({
  pagination,
  showPageSizeSelector = true,
  showPageInfo = true,
  className = '',
}: PaginationProps) => {
  const {
    currentPage,
    totalPages,
    pageSize,
    totalItems,
    canGoNext,
    canGoPrevious,
    goToFirstPage,
    goToPreviousPage,
    goToNextPage,
    goToLastPage,
    goToPage,
    setPageSize,
    pageSizeOptions,
    startIndex,
    endIndex,
  } = pagination;

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxPagesToShow = 5;

    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);

      if (currentPage <= 3) {
        end = Math.min(4, totalPages - 1);
      } else if (currentPage >= totalPages - 2) {
        start = Math.max(2, totalPages - 3);
      }

      if (start > 2) pages.push('...');
      for (let i = start; i <= end; i++) pages.push(i);
      if (end < totalPages - 1) pages.push('...');
      if (totalPages > 1) pages.push(totalPages);
    }
    return pages;
  };

  const pageNumbers = getPageNumbers();

  // If there are no items, hide the pagination to keep the UI clean
  if (totalItems === 0) return null;

  return (
    <div
      className={`flex flex-col md:flex-row items-center justify-between gap-4 py-2 w-full ${className}`}
    >
      {/* ── Page Info ── */}
      {showPageInfo && (
        <div className="text-sm text-slate-500 font-medium whitespace-nowrap text-center md:text-left order-2 md:order-1 w-full md:w-auto">
          Showing{' '}
          <span className="font-bold text-slate-800">{totalItems > 0 ? startIndex + 1 : 0}</span> to{' '}
          <span className="font-bold text-slate-800">{endIndex}</span> of{' '}
          <span className="font-bold text-slate-800">{totalItems}</span> entries
        </div>
      )}

      {/* ── Controls Group (Wraps elegantly on mobile) ── */}
      <div className="flex flex-wrap items-center justify-center md:justify-end gap-x-6 gap-y-3 order-1 md:order-2 w-full md:w-auto">
        {/* ── Page Size Selector ── */}
        {showPageSizeSelector && (
          <div className="flex items-center gap-2.5 shrink-0">
            <label
              htmlFor="pageSize"
              className="text-sm font-medium text-slate-500 whitespace-nowrap"
            >
              Rows per page:
            </label>
            <div className="relative">
              <select
                id="pageSize"
                value={pageSize >= totalItems && totalItems > 0 ? 'all' : pageSize}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === 'all') {
                    setPageSize(totalItems || 999999);
                  } else {
                    setPageSize(Number(value));
                  }
                }}
                className="appearance-none pl-3 pr-8 py-1.5 bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-700 rounded-xl outline-none hover:bg-slate-100 hover:border-slate-300 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all cursor-pointer"
              >
                {pageSizeOptions.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
                <option value="all">All</option>
              </select>
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <ChevronDown size={14} />
              </div>
            </div>
          </div>
        )}

        {/* ── Pagination Controls ── */}
        <nav
          className="flex items-center gap-1 p-1 bg-slate-50/50 border border-slate-100 rounded-2xl shrink-0"
          aria-label="Pagination"
        >
          {/* First Page */}
          <button
            onClick={goToFirstPage}
            disabled={!canGoPrevious}
            className="flex items-center justify-center w-9 h-9 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-white hover:shadow-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:shadow-none transition-all"
            aria-label="First page"
          >
            <ChevronsLeft size={18} />
          </button>

          {/* Previous Page */}
          <button
            onClick={goToPreviousPage}
            disabled={!canGoPrevious}
            className="flex items-center justify-center w-9 h-9 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-white hover:shadow-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:shadow-none transition-all"
            aria-label="Previous page"
          >
            <ChevronLeft size={18} />
          </button>

          {/* Page Numbers (Desktop) */}
          <div className="hidden sm:flex items-center gap-1 mx-1">
            {pageNumbers.map((pageNum, idx) => {
              if (pageNum === '...') {
                return (
                  <span
                    key={`ellipsis-${idx}`}
                    className="flex items-center justify-center w-9 h-9 text-slate-400 tracking-widest"
                  >
                    ...
                  </span>
                );
              }

              const isActive = pageNum === currentPage;
              return (
                <button
                  key={pageNum}
                  onClick={() => goToPage(pageNum as number)}
                  className={`flex items-center justify-center w-9 h-9 text-sm font-bold rounded-xl transition-all ${
                    isActive
                      ? 'bg-amber-500 text-white shadow-md shadow-amber-200/50'
                      : 'text-slate-600 hover:bg-white hover:shadow-sm'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          {/* Current Page (Mobile Pill) */}
          <div className="sm:hidden flex items-center justify-center px-4 py-1.5 mx-1 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 shadow-sm whitespace-nowrap">
            {currentPage} <span className="text-slate-400 font-medium mx-1.5">/</span> {totalPages}
          </div>

          {/* Next Page */}
          <button
            onClick={goToNextPage}
            disabled={!canGoNext}
            className="flex items-center justify-center w-9 h-9 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-white hover:shadow-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:shadow-none transition-all"
            aria-label="Next page"
          >
            <ChevronRight size={18} />
          </button>

          {/* Last Page */}
          <button
            onClick={goToLastPage}
            disabled={!canGoNext}
            className="flex items-center justify-center w-9 h-9 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-white hover:shadow-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:shadow-none transition-all"
            aria-label="Last page"
          >
            <ChevronsRight size={18} />
          </button>
        </nav>
      </div>
    </div>
  );
};

// Internal ChevronDown icon component
function ChevronDown({ size, className }: { size: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
