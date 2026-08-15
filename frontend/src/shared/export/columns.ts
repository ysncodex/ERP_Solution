import type { DailyRecord, Transaction } from '@/core/types';
import type { ColDef } from './types';

export function fmtExportDate(d: Date | string) {
  return new Date(d).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function fmtTxDate(d: Date | string | number) {
  return new Date(d).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/** Standard transaction columns used by expense / cost / report pages. */
export const TRANSACTION_COLUMNS: ColDef<Transaction>[] = [
  { header: 'Date', accessor: (t) => fmtTxDate(t.date), width: 14 },
  {
    header: 'Type',
    accessor: (t) => t.type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    width: 20,
  },
  { header: 'Description', accessor: 'description', width: 36 },
  { header: 'Amount (BDT)', accessor: (t) => t.amount, width: 16 },
  { header: 'Method', accessor: (t) => (t.method ?? '-').replace(/_/g, ' '), width: 12 },
  { header: 'Channel', accessor: (t) => (t.channel ?? '-').replace(/_/g, ' '), width: 14 },
  { header: 'Category', accessor: (t) => t.category ?? '-', width: 18 },
  { header: 'Qty', accessor: (t) => t.quantity ?? '-', width: 8 },
  { header: 'Supplier', accessor: (t) => t.supplier ?? '-', width: 18 },
];

/** Alias — same columns, clearer name on finance pages. */
export const TRANSACTION_EXPORT_COLUMNS = TRANSACTION_COLUMNS;

/** Daily record summary columns (All Records page). */
export const DAILY_RECORD_EXPORT_COLUMNS: ColDef<DailyRecord>[] = [
  { header: 'Date', accessor: (r) => fmtExportDate(r.date), width: 14 },
  { header: 'Total Sales (BDT)', accessor: 'totalSales', width: 16 },
  { header: 'Cash (BDT)', accessor: 'cashSales', width: 14 },
  { header: 'bKash (BDT)', accessor: 'bkashSales', width: 14 },
  { header: 'Bank (BDT)', accessor: 'bankSales', width: 14 },
  { header: 'Expenses (BDT)', accessor: 'dailyCosts', width: 14 },
  { header: 'Net Flow (BDT)', accessor: 'dailyAvail', width: 14 },
];
