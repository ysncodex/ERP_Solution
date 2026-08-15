import { LoadingSpinner } from './Spinner';

const SKELETON_CHART_BAR_HEIGHTS = Array.from({ length: 10 }, () => `${Math.random() * 60 + 20}%`);

/**
 * PageLoader Component
 * Full-page loading indicator
 */
export function PageLoader() {
  return (
    <div className="flex items-center justify-center h-screen bg-slate-50">
      <div className="text-center">
        <LoadingSpinner size={48} className="mx-auto mb-4 text-amber-500" />
        <p className="text-slate-600 text-lg font-medium">Loading...</p>
      </div>
    </div>
  );
}

/**
 * SkeletonCard Component
 * Skeleton loader for cards
 */
export function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl p-6 border border-slate-200 animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="space-y-2">
          <div className="h-4 bg-slate-200 rounded w-24"></div>
          <div className="h-8 bg-slate-200 rounded w-32"></div>
        </div>
        <div className="w-12 h-12 bg-slate-200 rounded-lg"></div>
      </div>
      <div className="h-3 bg-slate-200 rounded w-20"></div>
    </div>
  );
}

/**
 * SkeletonTable Component
 * Skeleton loader for tables
 */
export function SkeletonTable({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="border-b border-slate-200 p-4 flex gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="flex-1 h-4 bg-slate-200 rounded animate-pulse"></div>
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="border-b border-slate-100 p-4 flex gap-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div key={colIndex} className="flex-1 h-4 bg-slate-100 rounded animate-pulse"></div>
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * SkeletonChart Component
 * Skeleton loader for charts
 */
export function SkeletonChart() {
  return (
    <div className="bg-white rounded-xl p-6 border border-slate-200 h-80 flex items-end gap-2 animate-pulse">
      {SKELETON_CHART_BAR_HEIGHTS.map((height, i) => (
        <div 
          key={i} 
          className="flex-1 bg-slate-200 rounded-t"
          style={{ height }}
        ></div>
      ))}
    </div>
  );
}
