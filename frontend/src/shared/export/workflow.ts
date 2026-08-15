/**
 * Export workflow — preview preparation, download, and print helpers.
 */

import type {
  ColDef,
  ExportConfig,
  ExportFormat,
  ExportPreviewPayload,
  PageExportConfig,
} from './types';
import {
  buildPDFBlobGeneric,
  buildXlsxBlobGeneric,
  buildCsvBlobGeneric,
  resolveCell,
} from './generators';

const PREVIEW_ROW_LIMIT = 50;

export const DEFAULT_EXPORT_FORMATS: ExportFormat[] = ['pdf', 'csv', 'xlsx'];

export const EXPORT_FORMAT_LABELS: Record<ExportFormat, string> = {
  pdf: 'PDF',
  csv: 'CSV',
  xlsx: 'XLSX',
};

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function printPdfBlob(blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:none';
  iframe.src = url;
  document.body.appendChild(iframe);
  iframe.onload = () => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    window.setTimeout(() => {
      document.body.removeChild(iframe);
      URL.revokeObjectURL(url);
    }, 60_000);
  };
}

export function toPreviewMatrix<T>(
  data: T[],
  columns: ColDef<T>[],
  limit = PREVIEW_ROW_LIMIT,
): { headers: string[]; rows: string[][] } {
  return {
    headers: columns.map((c) => c.header),
    rows: data.slice(0, limit).map((row) =>
      columns.map((col) => String(resolveCell(col, row))),
    ),
  };
}

export async function prepareExportPreview<T>(
  format: ExportFormat,
  config: PageExportConfig<T>,
): Promise<ExportPreviewPayload> {
  const data = config.getData();
  const exportConfig: ExportConfig<T> = {
    columns: config.columns,
    title: config.title,
    subtitle: config.subtitle,
    sheetName: config.sheetName,
    summaryRows: config.summaryRows,
  };

  const result = config.buildExport
    ? await config.buildExport(format)
    : format === 'pdf' && config.buildPdf
      ? await config.buildPdf()
      : format === 'pdf'
        ? await buildPDFBlobGeneric(
            data,
            exportConfig,
            config.filenameBase,
            config.orientation ?? 'landscape',
          )
        : format === 'xlsx'
          ? await buildXlsxBlobGeneric(data, exportConfig, config.filenameBase)
          : await buildCsvBlobGeneric(data, exportConfig, config.filenameBase);

  const preview = config.getPreview?.() ?? toPreviewMatrix(data, config.columns);
  const rowCount = config.getPreview?.()?.rowCount ?? data.length;
  const previewRows = preview.rows.slice(0, PREVIEW_ROW_LIMIT);

  return {
    format,
    filename: result.filename,
    title: config.title,
    subtitle: config.subtitle,
    rowCount,
    blob: result.blob,
    pdfObjectUrl: format === 'pdf' ? URL.createObjectURL(result.blob) : undefined,
    headers: preview.headers,
    rows: previewRows,
    truncated: rowCount > PREVIEW_ROW_LIMIT,
  };
}

export function revokeExportPreview(payload: ExportPreviewPayload | null) {
  if (payload?.pdfObjectUrl) URL.revokeObjectURL(payload.pdfObjectUrl);
}
