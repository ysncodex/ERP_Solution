/** Column descriptor for typed exports. */
export interface ColDef<T> {
  header: string;
  accessor: keyof T | ((row: T) => string | number | null | undefined);
  format?: (raw: string | number | null | undefined, row: T) => string | number;
  width?: number;
}

/** Configuration passed to file generators. */
export interface ExportConfig<T> {
  columns: ColDef<T>[];
  sheetName?: string;
  title?: string;
  subtitle?: string;
  summaryRows?: Array<[string, string | number]>;
}

export type ExportFormat = 'pdf' | 'csv' | 'xlsx';

export interface ExportBlobResult {
  blob: Blob;
  filename: string;
  rows: number;
  format: ExportFormat;
}

/** Per-page config for ExportDropdown. */
export interface PageExportConfig<T = unknown> {
  filenameBase: string;
  title: string;
  subtitle?: string;
  columns: ColDef<T>[];
  getData: () => T[];
  sheetName?: string;
  orientation?: 'portrait' | 'landscape';
  summaryRows?: Array<[string, string | number]>;
  formats?: ExportFormat[];
  /** Custom builder for all formats (e.g. structured report export). */
  buildExport?: (format: ExportFormat) => Promise<ExportBlobResult>;
  /** Custom preview table when buildExport is used. */
  getPreview?: () => { headers: string[]; rows: string[][]; rowCount: number };
  /** @deprecated Prefer buildExport — PDF-only custom builder. */
  buildPdf?: () => Promise<ExportBlobResult>;
}

/** Preview state shown in ExportPreviewModal. */
export interface ExportPreviewPayload {
  format: ExportFormat;
  filename: string;
  title: string;
  subtitle?: string;
  rowCount: number;
  blob: Blob;
  pdfObjectUrl?: string;
  headers: string[];
  rows: string[][];
  truncated: boolean;
}
