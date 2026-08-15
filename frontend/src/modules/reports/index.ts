/**
 * Reports module — cross-module analytics, exports, P&L
 *
 * Future additions:
 *   hooks/     → useReportFilter, useExportQueue
 *   types/     → ReportConfig, ExportFormat
 *   services/  → move src/core/api/services/reports.service.ts here
 *   components/ → ReportChart, ExportButton, ProfitLossTable
 */

export { default as Reports } from './pages/Reports';
