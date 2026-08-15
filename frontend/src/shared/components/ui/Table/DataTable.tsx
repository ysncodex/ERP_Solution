import type { ReactNode, TdHTMLAttributes, ThHTMLAttributes, HTMLAttributes } from 'react';

export type DataTableAlign = 'left' | 'center' | 'right';

const alignClass: Record<DataTableAlign, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

/** Outer shell — rounded card + horizontal scroll on small screens. */
export function DataTableShell({ children }: { children: ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

export function DataTable({
  children,
  minWidth = 760,
}: {
  children: ReactNode;
  minWidth?: number;
}) {
  return (
    <table
      className="w-full table-fixed border-collapse"
      style={{ minWidth }}
    >
      {children}
    </table>
  );
}

export function DataTableColGroup({ widths }: { widths: string[] }) {
  return (
    <colgroup>
      {widths.map((w, i) => (
        <col key={i} style={{ width: w }} />
      ))}
    </colgroup>
  );
}

export function DataTableHead({ children }: { children: ReactNode }) {
  return (
    <thead className="bg-slate-50 border-b border-slate-200">
      {children}
    </thead>
  );
}

export function DataTableHeadRow({ children }: { children: ReactNode }) {
  return <tr>{children}</tr>;
}

export function DataTableHeadCell({
  children,
  align = 'left',
  className = '',
  ...props
}: ThHTMLAttributes<HTMLTableCellElement> & { align?: DataTableAlign }) {
  return (
    <th
      scope="col"
      className={`px-3 py-2.5 sm:px-4 sm:py-3 text-[10px] sm:text-[11px] font-bold uppercase tracking-wide text-slate-500 whitespace-nowrap ${alignClass[align]} ${className}`}
      {...props}
    >
      {children}
    </th>
  );
}

export function DataTableBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-slate-100">{children}</tbody>;
}

export type DataTableRowVariant = 'default' | 'selected' | 'top';

const rowVariantClass: Record<DataTableRowVariant, string> = {
  default: 'hover:bg-slate-50/80',
  selected: 'bg-amber-50/80 hover:bg-amber-50',
  top: 'bg-gradient-to-r from-violet-50/90 via-white to-amber-50/40 hover:from-violet-50 hover:to-amber-50/60',
};

export function DataTableRow({
  children,
  variant = 'default',
  onClick,
  className = '',
  ...props
}: HTMLAttributes<HTMLTableRowElement> & {
  variant?: DataTableRowVariant;
}) {
  const v: DataTableRowVariant = variant ?? 'default';
  const borderAccent =
    v === 'selected'
      ? 'border-l-[3px] border-l-amber-400'
      : v === 'top'
        ? 'border-l-[3px] border-l-violet-500'
        : 'border-l-[3px] border-l-transparent';

  return (
    <tr
      onClick={onClick}
      className={`transition-colors cursor-pointer ${borderAccent} ${rowVariantClass[v]} ${className}`}
      {...props}
    >
      {children}
    </tr>
  );
}

export function DataTableCell({
  children,
  align = 'left',
  className = '',
  ...props
}: TdHTMLAttributes<HTMLTableCellElement> & { align?: DataTableAlign }) {
  return (
    <td
      className={`px-3 py-2.5 sm:px-4 sm:py-3 align-middle text-xs sm:text-sm ${alignClass[align]} ${className}`}
      {...props}
    >
      {children}
    </td>
  );
}
