/**
 * File generators — PDF, CSV, XLSX blob builders with ERP_Solutions branding.
 */

import type { ERPStats } from '@/core/types';
import type { ColDef, ExportBlobResult, ExportConfig, ExportFormat } from './types';
import { pdfCurrency, pdfNumber } from './pdfFormat';

// ─── Brand ────────────────────────────────────────────────────────────────────

const BRAND = {
  name: 'ERP_Solutions',
  tagline: 'Financial Management System',
  primary: [30, 64, 175] as [number, number, number],
  accent: [59, 130, 246] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  rowAlt: [241, 245, 249] as [number, number, number],
  border: [203, 213, 225] as [number, number, number],
  ink: [15, 23, 42] as [number, number, number],
  muted: [100, 116, 139] as [number, number, number],
  slate600: [71, 85, 105] as [number, number, number],
};

// ─── Libraries ────────────────────────────────────────────────────────────────

async function getXlsx() {
  const mod = await import('xlsx');
  return (mod as unknown as { default?: typeof mod }).default ?? mod;
}

async function getPdf() {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  return { jsPDF, autoTable };
}

type JsPDFInstance = InstanceType<Awaited<ReturnType<typeof getPdf>>['jsPDF']>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const isoDate = () => new Date().toISOString().split('T')[0];

export function buildExportFilename(base: string, format: ExportFormat): string {
  return `${base}_${isoDate()}.${format === 'xlsx' ? 'xlsx' : format}`;
}

const bdt = pdfCurrency;

export function resolveCell<T>(col: ColDef<T>, row: T): string | number {
  const raw =
    typeof col.accessor === 'function'
      ? col.accessor(row)
      : (row[col.accessor] as unknown as string | number | null | undefined);
  return col.format ? col.format(raw, row) : (raw ?? '');
}

function toRowObjects<T>(data: T[], cols: ColDef<T>[]): Record<string, string | number>[] {
  return data.map((row) => {
    const obj: Record<string, string | number> = {};
    for (const col of cols) obj[col.header] = resolveCell(col, row);
    return obj;
  });
}

function calcColWidths<T>(
  cols: ColDef<T>[],
  rows: Record<string, string | number>[],
): number[] {
  return cols.map((col, i) => {
    if (col.width) return col.width;
    const dataMax = rows.reduce(
      (m, r) => Math.max(m, String(Object.values(r)[i] ?? '').length),
      0,
    );
    return Math.min(Math.max(col.header.length, dataMax) + 2, 42);
  });
}

function appendSummaryRows<T>(
  rows: Record<string, string | number>[],
  config: ExportConfig<T>,
) {
  if (!config.summaryRows?.length) return;
  rows.push({} as Record<string, string | number>);
  for (const [label, value] of config.summaryRows) {
    rows.push({
      [config.columns[0].header]: label,
      [config.columns[1]?.header ?? '']: value,
    });
  }
}

function applyBrandPages(doc: JsPDFInstance, docTitle: string) {
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const total = doc.getNumberOfPages();

  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setFillColor(...BRAND.primary);
    doc.rect(0, 0, W, 18, 'F');
    doc.setTextColor(...BRAND.white);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(BRAND.name, 14, 7);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(BRAND.tagline, 14, 12.5);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-GB')}`, W - 14, 12.5, {
      align: 'right',
    });
    doc.setDrawColor(...BRAND.border);
    doc.setLineWidth(0.3);
    doc.line(14, H - 10, W - 14, H - 10);
    doc.setFontSize(7.5);
    doc.setTextColor(...BRAND.muted);
    doc.text(`${BRAND.name} · ${docTitle}`, 14, H - 5);
    doc.text(`Page ${p} of ${total}`, W - 14, H - 5, { align: 'right' });
    doc.setTextColor(...BRAND.ink);
  }
}

function renderGenericPdfTable<T>(
  doc: JsPDFInstance,
  data: T[],
  config: ExportConfig<T>,
  autoTable: Awaited<ReturnType<typeof getPdf>>['autoTable'],
) {
  let curY = 24;
  if (config.title) {
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND.primary);
    doc.text(config.title, 14, curY);
    curY += 6;
  }
  if (config.subtitle) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...BRAND.slate600);
    doc.text(config.subtitle, 14, curY);
    curY += 5;
  }
  doc.setTextColor(...BRAND.ink);

  const headers = config.columns.map((c) => c.header);
  const body: string[][] = data.map((row) =>
    config.columns.map((col) => {
      const val = resolveCell(col, row);
      if (typeof val === 'number') return pdfNumber(val);
      return String(val ?? '');
    }),
  );
  if (config.summaryRows?.length) {
    body.push([]);
    for (const [label, value] of config.summaryRows) {
      body.push([label, typeof value === 'number' ? pdfNumber(value) : String(value)]);
    }
  }

  const columnStyles: Record<number, { halign: 'left' | 'right' | 'center' }> = {};
  config.columns.forEach((col, i) => {
    const sample = data[0] ? resolveCell(col, data[0]) : null;
    columnStyles[i] = { halign: typeof sample === 'number' ? 'right' : 'left' };
  });

  autoTable(doc, {
    head: [headers],
    body,
    startY: curY + 2,
    margin: { top: 22, left: 14, right: 14, bottom: 14 },
    styles: { fontSize: 8.5, cellPadding: 3, font: 'helvetica' },
    headStyles: {
      fillColor: BRAND.accent,
      textColor: BRAND.white,
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles,
    alternateRowStyles: { fillColor: BRAND.rowAlt },
    tableLineColor: BRAND.border,
    tableLineWidth: 0.2,
  });
}

async function createDashboardPdfDoc(
  stats: ERPStats,
  dateRange: string,
): Promise<JsPDFInstance> {
  const { jsPDF, autoTable } = await getPdf();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  type LastTable = { lastAutoTable: { finalY: number } };
  const lastY = () => (doc as unknown as LastTable).lastAutoTable?.finalY ?? 32;

  const tblDefaults = {
    margin: { top: 22, left: 14, right: 14, bottom: 14 },
    theme: 'grid' as const,
    styles: { fontSize: 9.5, cellPadding: 3.5 },
    columnStyles: {
      0: { fontStyle: 'bold' as const, cellWidth: 72 },
      1: { halign: 'right' as const },
    },
  };

  const inStoreSales = stats.totalSales - stats.foodpandaSales - stats.foodiSales;
  const profitMargin =
    stats.totalSales > 0 ? `${((stats.profit / stats.totalSales) * 100).toFixed(1)}%` : '0%';

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND.primary);
  doc.text('Financial Dashboard Report', 14, 26);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...BRAND.slate600);
  doc.text(`Period: ${dateRange}`, 14, 33);
  doc.setDrawColor(...BRAND.accent);
  doc.setLineWidth(0.5);
  doc.line(14, 36, 197, 36);
  doc.setTextColor(...BRAND.ink);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND.primary);
  doc.text('Revenue & Profitability', 14, 43);
  doc.setTextColor(...BRAND.ink);

  autoTable(doc, {
    ...tblDefaults,
    body: [
      ['Total Revenue', bdt(stats.totalSales)],
      ['  In-Store Sales', bdt(inStoreSales)],
      ['  Foodpanda Sales', bdt(stats.foodpandaSales)],
      ['  Foodi Sales', bdt(stats.foodiSales)],
      ['Total Expenses', bdt(stats.totalExpenses)],
      ['  Product Costs', bdt(stats.totalProductCost)],
      ['  Fixed Costs', bdt(stats.totalFixedCost)],
      ['Gross Profit', bdt(stats.grossProfit)],
      ['Net Profit', bdt(stats.profit)],
      ['Profit Margin', profitMargin],
    ],
    startY: 47,
  });

  doc.addPage();
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND.primary);
  doc.text('Liquidity & Payment Balances', 14, 26);
  doc.setTextColor(...BRAND.ink);

  autoTable(doc, {
    ...tblDefaults,
    body: [
      ['Cash Balance', bdt(stats.cashBalance)],
      ['Bank Balance', bdt(stats.bankBalance)],
      ['bKash Balance', bdt(stats.bkashBalance)],
      ['Total Balance', bdt(stats.totalBalance)],
      ['Cash In Hand', bdt(stats.cashInHand)],
      ['Daily Available Cash', bdt(stats.dailyAvailableCash)],
    ],
    startY: 30,
  });

  doc.addPage();

  if (stats.topProducts?.length) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND.primary);
    doc.text('Top Product Costs', 14, 26);
    doc.setTextColor(...BRAND.ink);

    autoTable(doc, {
      head: [['Product', 'Qty / Unit', 'Total Cost']],
      body: stats.topProducts.slice(0, 15).map((p) => [p.name, `${p.qty} ${p.unit}`, bdt(p.cost)]),
      startY: 30,
      margin: { top: 22, left: 14, right: 14, bottom: 14 },
      styles: { fontSize: 8.5, cellPadding: 3 },
      headStyles: { fillColor: BRAND.accent, textColor: BRAND.white, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: BRAND.rowAlt },
      tableLineColor: BRAND.border,
      tableLineWidth: 0.2,
    });
  }

  if (stats.topFixed?.length) {
    const fixedY = lastY() + 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND.primary);
    doc.text('Top Fixed Costs', 14, fixedY);
    doc.setTextColor(...BRAND.ink);

    autoTable(doc, {
      head: [['Description', 'Amount']],
      body: stats.topFixed.slice(0, 12).map((f) => [f.name, bdt(f.amount)]),
      startY: fixedY + 4,
      margin: { top: 22, left: 14, right: 14, bottom: 14 },
      styles: { fontSize: 8.5, cellPadding: 3 },
      headStyles: { fillColor: BRAND.accent, textColor: BRAND.white, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: BRAND.rowAlt },
      tableLineColor: BRAND.border,
      tableLineWidth: 0.2,
    });
  }

  applyBrandPages(doc, 'Financial Dashboard Report');
  return doc;
}

// ─── Public blob builders ─────────────────────────────────────────────────────

export async function buildPDFBlobGeneric<T>(
  data: T[],
  config: ExportConfig<T>,
  filename = 'export',
  orientation: 'portrait' | 'landscape' = 'portrait',
): Promise<ExportBlobResult> {
  const { jsPDF, autoTable } = await getPdf();
  const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' });
  renderGenericPdfTable(doc, data, config, autoTable);
  applyBrandPages(doc, config.title ?? filename);

  const outFile = buildExportFilename(filename, 'pdf');
  return {
    blob: doc.output('blob') as Blob,
    filename: outFile,
    rows: data.length,
    format: 'pdf',
  };
}

export async function buildXlsxBlobGeneric<T>(
  data: T[],
  config: ExportConfig<T>,
  filename = 'export',
): Promise<ExportBlobResult> {
  const XLSX = await getXlsx();
  const rows = toRowObjects(data, config.columns);
  appendSummaryRows(rows, config);

  const ws = XLSX.utils.json_to_sheet(rows);
  ws['!cols'] = calcColWidths(config.columns, rows).map((w) => ({ wch: w }));

  const wb = XLSX.utils.book_new();
  wb.Props = {
    Title: config.title ?? filename,
    Author: BRAND.name,
    CreatedDate: new Date(),
  };
  XLSX.utils.book_append_sheet(wb, ws, config.sheetName ?? 'Data');

  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  const outFile = buildExportFilename(filename, 'xlsx');
  return {
    blob: new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    filename: outFile,
    rows: data.length,
    format: 'xlsx',
  };
}

export async function buildCsvBlobGeneric<T>(
  data: T[],
  config: ExportConfig<T>,
  filename = 'export',
  delimiter: ',' | ';' | '\t' = ',',
): Promise<ExportBlobResult> {
  const XLSX = await getXlsx();
  const ws = XLSX.utils.json_to_sheet(toRowObjects(data, config.columns));
  const csv = XLSX.utils.sheet_to_csv(ws, { FS: delimiter });
  const outFile = buildExportFilename(filename, 'csv');
  return {
    blob: new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }),
    filename: outFile,
    rows: data.length,
    format: 'csv',
  };
}

export async function buildDashboardPDFBlob(
  stats: ERPStats,
  dateRange: string,
): Promise<ExportBlobResult> {
  const doc = await createDashboardPdfDoc(stats, dateRange);
  return {
    blob: doc.output('blob') as Blob,
    filename: buildExportFilename('dashboard_report', 'pdf'),
    rows: 1,
    format: 'pdf',
  };
}
