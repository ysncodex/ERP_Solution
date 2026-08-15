/**
 * Shared UI Components - Main Export
 * Import all reusable components from here
 */

// Card components
export { StatCard } from './Card/StatCard';
export { SimpleLineChart } from './Card/SimpleLineChart';
export type { StatCardProps, SimpleLineChartProps } from './Card/Card.types';

// Button components
export { Button } from './Button/Button';
export type { ButtonProps } from './Button/Button.types';

// Loading components
export { LoadingSpinner } from './Loading/Spinner';
export { ButtonLoading } from './Loading/ButtonLoading';
export { PageLoader, SkeletonCard, SkeletonTable, SkeletonChart } from './Loading/Skeletons';

// Modal components
export { ManagerPasswordModal } from './Modal/ManagerPasswordModal';
export { EditTransactionModal } from './Modal/EditTransactionModal';
export { ManageListModal } from './Modal/ManageListModal';
export type {
	ManagerPasswordModalProps,
	EditTransactionModalProps,
	BaseModalProps,
	ManageListModalProps,
} from './Modal/Modal.types';

// Table components
export { EnhancedTable } from './Table/EnhancedTable';
export type { TableProps } from './Table/Table.types';
export {
  DataTableShell,
  DataTable,
  DataTableColGroup,
  DataTableHead,
  DataTableHeadRow,
  DataTableHeadCell,
  DataTableBody,
  DataTableRow,
  DataTableCell,
} from './Table/DataTable';
export type { DataTableAlign, DataTableRowVariant } from './Table/DataTable';

// Toast
export { ToastProvider } from './Toast/ToastProvider';

// Pagination
export { Pagination } from './Pagination/Pagination';
export type { PaginationProps } from './Pagination/Pagination';

// Export (re-export from central module)
export { ExportDropdown, ExportPreviewModal } from '@/shared/export';
