/**
 * Financial Report export — single source for PDF, CSV, and XLSX.
 * All formats share the same sections, values, and layout as the Reports UI.
 */

import type { ERPStats } from '@/core/types';
import type { ExportBlobResult, ExportFormat } from './types';
import { buildExportFilename } from './generators';
import { pdfCurrency, pdfPct } from './pdfFormat';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ReportsChannelData {
  inStore: { revenue: number; share: number };
  foodpanda: { revenue: number; share: number };
  foodi: { revenue: number; share: number };
}

export interface ReportsTrendRow {
  date: string;
  sales: number;
  expenses: number;
}

/** Input from the Reports page — same data shown on screen. */
export interface ReportsExportInput {
  stats: ERPStats;
  periodLabel: string;
  profitMargin: number;
  grossMargin: number;
  expenseRatio: string;
  channels: ReportsChannelData;
  trendData: ReportsTrendRow[];
}

/** @deprecated Use ReportsExportInput */
export type ReportsPdfInput = ReportsExportInput;

export interface ReportSection {
  id: string;
  title: string;
  subtitle: string;
  headers: string[];
  rows: string[][];
}

export interface ReportDocument {
  title: string;
  periodLabel: string;
  generatedAt: string;
  sections: ReportSection[];
}

// ─── Brand (PDF) ──────────────────────────────────────────────────────────────

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

const REPORT_FILENAME_BASE = 'financial_report';

// ─── Shared document builder ───────────────────────────────────────────────────

function pctOf(total: number, part: number) {
  return total > 0 ? ((part / total) * 100).toFixed(1) : '0.0';
}

/** Builds the canonical report structure used by PDF, CSV, and XLSX. */
export function buildReportDocument(input: ReportsExportInput): ReportDocument {
  const { stats, profitMargin, grossMargin, expenseRatio, channels, trendData } = input;
  const profitLabel = stats.profit >= 0 ? 'Net Profit' : 'Net Loss';

  const summary: ReportSection = {
    id: 'summary',
    title: 'Summary',
    subtitle: 'Key figures for the selected period',
    headers: ['Metric', 'Value'],
    rows: [
      ['Total Revenue', pdfCurrency(stats.totalSales)],
      ['Total Expenses', pdfCurrency(stats.totalExpenses)],
      [
        profitLabel,
        `${stats.profit >= 0 ? '+' : '-'}${pdfCurrency(Math.abs(stats.profit))}`,
      ],
      ['Profit Margin', pdfPct(profitMargin)],
      ['Gross Margin', pdfPct(grossMargin)],
      ['Expense Ratio', `${expenseRatio}%`],
    ],
  };

  const plRows: string[][] = [
    ['Total Sales', pdfCurrency(stats.totalSales), '100%'],
    [
      '(-) Variable Costs (COGS)',
      `(${pdfCurrency(stats.totalProductCost)})`,
      `(${pctOf(stats.totalSales, stats.totalProductCost)}%)`,
    ],
  ];
  for (const item of stats.topProducts) {
    plRows.push([item.name, pdfCurrency(item.cost), '']);
  }
  plRows.push(
    [
      'Gross Profit',
      pdfCurrency(stats.grossProfit),
      `${pctOf(stats.totalSales, stats.grossProfit)}%`,
    ],
    [
      '(-) Fixed Costs (OpEx)',
      `(${pdfCurrency(stats.totalFixedCost)})`,
      `(${pctOf(stats.totalSales, stats.totalFixedCost)}%)`,
    ],
  );
  for (const item of stats.topFixed) {
    plRows.push([item.name, pdfCurrency(item.amount), '']);
  }
  plRows.push([
    profitLabel,
    pdfCurrency(Math.abs(stats.profit)),
    `${pctOf(stats.totalSales, Math.abs(stats.profit))}%`,
  ]);

  const profitLoss: ReportSection = {
    id: 'profit-loss',
    title: 'Profit & Loss',
    subtitle: 'How revenue flows to net profit',
    headers: ['Line Item', 'Amount', 'Share'],
    rows: plRows,
  };

  const salesChannels: ReportSection = {
    id: 'channels',
    title: 'Sales Channels',
    subtitle: 'Where revenue comes from',
    headers: ['Channel', 'Revenue', 'Share'],
    rows: [
      ['In-Store', pdfCurrency(channels.inStore.revenue), `${channels.inStore.share.toFixed(0)}%`],
      ['Foodpanda', pdfCurrency(channels.foodpanda.revenue), `${channels.foodpanda.share.toFixed(0)}%`],
      ['Foodi', pdfCurrency(channels.foodi.revenue), `${channels.foodi.share.toFixed(0)}%`],
    ],
  };

  const sections: ReportSection[] = [summary, profitLoss, salesChannels];

  if (trendData.length > 0) {
    sections.push({
      id: 'daily-trend',
      title: 'Daily Trend',
      subtitle: 'Last 7 days — revenue, expenses, and net',
      headers: ['Date', 'Revenue', 'Expenses', 'Daily Net'],
      rows: trendData.map((day) => {
        const net = day.sales - day.expenses;
        return [
          day.date,
          pdfCurrency(day.sales),
          pdfCurrency(day.expenses),
          `${net >= 0 ? '+' : ''}${pdfCurrency(Math.abs(net))}`,
        ];
      }),
    });
  }

  return {
    title: 'Financial Report',
    periodLabel: input.periodLabel,
    generatedAt: new Date().toLocaleDateString('en-GB'),
    sections,
  };
}

/** Flat preview matrix for ExportPreviewModal (CSV / XLSX / PDF). */
export function getReportPreviewMatrix(input: ReportsExportInput) {
  const doc = buildReportDocument(input);
  const maxCols = Math.max(...doc.sections.map((s) => s.headers.length), 1);
  const headers = ['Section', ...Array.from({ length: maxCols }, (_, i) => `Column ${i + 1}`)];
  headers.splice(1, maxCols, ...(doc.sections.find((s) => s.headers.length === maxCols)?.headers ?? doc.sections[0].headers));

  const rows: string[][] = [];
  for (const section of doc.sections) {
    for (const row of section.rows) {
      rows.push([section.title, ...row, ...Array(maxCols - row.length).fill('')]);
    }
  }

  return { headers, rows, rowCount: rows.length };
}

function escapeCsvCell(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function documentToSheetRows(doc: ReportDocument): string[][] {
  const aoa: string[][] = [
    [`${BRAND.name} — ${doc.title}`],
    [`Period: ${doc.periodLabel}`],
    [`Generated: ${doc.generatedAt}`],
    [],
  ];

  for (const section of doc.sections) {
    aoa.push([section.title, section.subtitle]);
    aoa.push(section.headers);
    for (const row of section.rows) aoa.push(row);
    aoa.push([]);
  }

  return aoa;
}

function documentToCsv(doc: ReportDocument): string {
  return documentToSheetRows(doc)
    .map((row) => row.map((cell) => escapeCsvCell(cell)).join(','))
    .join('\r\n');
}

// ─── PDF ──────────────────────────────────────────────────────────────────────

async function getPdf() {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  return { jsPDF, autoTable };
}

type JsPDFInstance = InstanceType<Awaited<ReturnType<typeof getPdf>>['jsPDF']>;
type AutoTable = Awaited<ReturnType<typeof getPdf>>['autoTable'];

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

const twoColTable = {
  theme: 'grid' as const,
  margin: { top: 22, left: 14, right: 14, bottom: 14 },
  styles: { fontSize: 9, cellPadding: 3.5, overflow: 'linebreak' as const, font: 'helvetica' },
  headStyles: {
    fillColor: BRAND.accent,
    textColor: BRAND.white,
    fontStyle: 'bold' as const,
    halign: 'center' as const,
  },
  alternateRowStyles: { fillColor: BRAND.rowAlt },
  tableLineColor: BRAND.border,
  tableLineWidth: 0.2,
} as const;

function sectionTitle(doc: JsPDFInstance, title: string, subtitle: string, y: number) {
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...BRAND.primary);
  doc.text(title, 14, y);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...BRAND.slate600);
  doc.text(subtitle, 14, y + 4.5);
  doc.setTextColor(...BRAND.ink);
}

function renderSectionTable(
  doc: JsPDFInstance,
  autoTable: AutoTable,
  section: ReportSection,
  startY: number,
  stats: ERPStats,
) {
  const profitLabel = stats.profit >= 0 ? 'Net Profit' : 'Net Loss';
  const colCount = section.headers.length;

  const columnStyles: Record<number, { halign?: 'left' | 'right' | 'center'; cellWidth?: number; fontStyle?: 'bold' | 'normal' }> = {
    0: { fontStyle: 'bold', cellWidth: colCount === 2 ? 80 : 95 },
  };
  for (let i = 1; i < colCount; i++) {
    columnStyles[i] = { halign: 'right', cellWidth: colCount === 2 ? 70 : 45 };
  }

  autoTable(doc, {
    ...twoColTable,
    head: [section.headers],
    body: section.rows,
    startY,
    columnStyles,
    didParseCell: (data) => {
      if (data.section !== 'body' || section.id !== 'profit-loss') return;
      const row = data.row.raw as string[];
      const label = String(row[0] ?? '');
      const isSubItem = stats.topProducts.some((p) => p.name === label) ||
        stats.topFixed.some((f) => f.name === label);
      if (isSubItem) {
        data.cell.styles.fontStyle = 'normal';
        data.cell.styles.textColor = BRAND.slate600;
      }
      if (label === profitLabel) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = stats.profit >= 0 ? [236, 253, 245] : [255, 241, 242];
      }
      if (label === 'Gross Profit') {
        data.cell.styles.fillColor = BRAND.rowAlt;
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });
}

async function createReportPdfDoc(doc: ReportDocument, stats: ERPStats): Promise<JsPDFInstance> {
  const { jsPDF, autoTable } = await getPdf();
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  type LastTable = { lastAutoTable: { finalY: number } };
  const lastY = () => (pdf as unknown as LastTable).lastAutoTable?.finalY ?? 40;

  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...BRAND.primary);
  pdf.text(doc.title, 14, 26);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...BRAND.slate600);
  pdf.text(doc.periodLabel, 14, 32);
  pdf.setDrawColor(...BRAND.accent);
  pdf.setLineWidth(0.5);
  pdf.line(14, 35, 196, 35);
  pdf.setTextColor(...BRAND.ink);

  let y = 42;
  for (let i = 0; i < doc.sections.length; i++) {
    const section = doc.sections[i];
    if (i === 0) {
      sectionTitle(pdf, section.title, section.subtitle, y);
      renderSectionTable(pdf, autoTable, section, y + 8, stats);
    } else {
      y = lastY() + 10;
      if (y > 240) {
        pdf.addPage();
        y = 28;
      }
      sectionTitle(pdf, section.title, section.subtitle, y);
      renderSectionTable(pdf, autoTable, section, y + 8, stats);
    }
  }

  applyBrandPages(pdf, doc.title);
  return pdf;
}

// ─── CSV / XLSX ───────────────────────────────────────────────────────────────

async function getXlsx() {
  const mod = await import('xlsx');
  return (mod as unknown as { default?: typeof mod }).default ?? mod;
}

async function buildReportCsvBlob(input: ReportsExportInput): Promise<ExportBlobResult> {
  const doc = buildReportDocument(input);
  const csv = documentToCsv(doc);
  return {
    blob: new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }),
    filename: buildExportFilename(REPORT_FILENAME_BASE, 'csv'),
    rows: getReportPreviewMatrix(input).rowCount,
    format: 'csv',
  };
}

async function buildReportXlsxBlob(input: ReportsExportInput): Promise<ExportBlobResult> {
  const XLSX = await getXlsx();
  const doc = buildReportDocument(input);
  const aoa = documentToSheetRows(doc);

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const colWidths = aoa.reduce<number[]>((widths, row) => {
    row.forEach((cell, i) => {
      widths[i] = Math.min(Math.max(widths[i] ?? 10, String(cell).length + 2), 48);
    });
    return widths;
  }, []);
  ws['!cols'] = colWidths.map((w) => ({ wch: w }));

  const wb = XLSX.utils.book_new();
  wb.Props = {
    Title: doc.title,
    Subject: doc.periodLabel,
    Author: BRAND.name,
    CreatedDate: new Date(),
  };
  XLSX.utils.book_append_sheet(wb, ws, 'Financial Report');

  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  return {
    blob: new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    filename: buildExportFilename(REPORT_FILENAME_BASE, 'xlsx'),
    rows: getReportPreviewMatrix(input).rowCount,
    format: 'xlsx',
  };
}

async function buildReportPdfBlob(input: ReportsExportInput): Promise<ExportBlobResult> {
  const doc = buildReportDocument(input);
  const pdf = await createReportPdfDoc(doc, input.stats);
  return {
    blob: pdf.output('blob') as Blob,
    filename: buildExportFilename(REPORT_FILENAME_BASE, 'pdf'),
    rows: getReportPreviewMatrix(input).rowCount,
    format: 'pdf',
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Build report export for any format — PDF, CSV, or XLSX. */
export async function buildReportExportBlob(
  format: ExportFormat,
  input: ReportsExportInput,
): Promise<ExportBlobResult> {
  switch (format) {
    case 'pdf':
      return buildReportPdfBlob(input);
    case 'csv':
      return buildReportCsvBlob(input);
    case 'xlsx':
      return buildReportXlsxBlob(input);
  }
}

/** @deprecated Use buildReportExportBlob('pdf', input) */
export async function buildReportsPDFBlob(input: ReportsExportInput): Promise<ExportBlobResult> {
  return buildReportExportBlob('pdf', input);
}

/** Ready-made PageExportConfig for the Reports page toolbar. */
export function createReportExportConfig(input: ReportsExportInput) {
  const preview = () => getReportPreviewMatrix(input);
  return {
    filenameBase: REPORT_FILENAME_BASE,
    title: 'Financial Report',
    subtitle: input.periodLabel,
    columns: [],
    getData: () => [] as never[],
    buildExport: (format: ExportFormat) => buildReportExportBlob(format, input),
    getPreview: preview,
  };
}
