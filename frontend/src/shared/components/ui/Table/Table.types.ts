import type { ColumnDef } from '@tanstack/react-table';

export interface TableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  searchPlaceholder?: string;
  /** When set, table rows receive pointer styling and activate this handler on row click */
  onRowClick?: (row: T) => void;
}
