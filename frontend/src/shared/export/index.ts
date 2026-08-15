/**
 * Export module — single entry point for all export functionality.
 *
 * Import everything from `@/shared/export`:
 *   types, column presets, blob generators, workflow helpers, UI components.
 */

// Types
export type {
  ColDef,
  ExportConfig,
  ExportFormat,
  ExportBlobResult,
  PageExportConfig,
  ExportPreviewPayload,
} from './types';

// Column presets
export {
  TRANSACTION_COLUMNS,
  TRANSACTION_EXPORT_COLUMNS,
  DAILY_RECORD_EXPORT_COLUMNS,
  fmtExportDate,
} from './columns';

// Generators
export {
  isoDate,
  buildExportFilename,
  buildPDFBlobGeneric,
  buildXlsxBlobGeneric,
  buildCsvBlobGeneric,
  buildDashboardPDFBlob,
} from './generators';

export {
  buildReportExportBlob,
  buildReportsPDFBlob,
  buildReportDocument,
  getReportPreviewMatrix,
  createReportExportConfig,
} from './reportExportFormats';

export type {
  ReportsExportInput,
  ReportsPdfInput,
  ReportsChannelData,
  ReportsTrendRow,
  ReportSection,
  ReportDocument,
} from './reportExportFormats';

export { pdfCurrency, pdfPct, pdfNumber } from './pdfFormat';

// Workflow & browser helpers
export {
  DEFAULT_EXPORT_FORMATS,
  EXPORT_FORMAT_LABELS,
  downloadBlob,
  printPdfBlob,
  toPreviewMatrix,
  prepareExportPreview,
  revokeExportPreview,
} from './workflow';

// UI components
export { ExportDropdown } from './ExportDropdown';
export { ExportPreviewModal } from './ExportPreviewModal';
