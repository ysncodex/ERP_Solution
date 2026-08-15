import { useState } from 'react';
import { X, Download, Printer, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { ExportPreviewPayload } from './types';
import { downloadBlob, printPdfBlob, EXPORT_FORMAT_LABELS } from './workflow';

const FORMAT_META = {
  pdf: {
    icon: Download,
    color: 'text-rose-600',
    bg: 'bg-rose-50',
    badge: 'bg-rose-100 text-rose-700',
  },
  csv: {
    icon: FileText,
    color: 'text-sky-600',
    bg: 'bg-sky-50',
    badge: 'bg-sky-100 text-sky-700',
  },
  xlsx: {
    icon: FileSpreadsheet,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    badge: 'bg-emerald-100 text-emerald-700',
  },
} as const;

interface ExportPreviewModalProps {
  preview: ExportPreviewPayload;
  onClose: () => void;
}

export function ExportPreviewModal({ preview, onClose }: ExportPreviewModalProps) {
  const [busy, setBusy] = useState<'download' | 'print' | null>(null);
  const meta = FORMAT_META[preview.format];
  const Icon = meta.icon;

  const handleDownload = () => {
    setBusy('download');
    try {
      downloadBlob(preview.blob, preview.filename);
      toast.success(`Downloaded ${preview.filename}`);
      onClose();
    } catch {
      toast.error('Download failed');
    } finally {
      setBusy(null);
    }
  };

  const handlePrint = () => {
    if (preview.format !== 'pdf') return;
    setBusy('print');
    try {
      printPdfBlob(preview.blob);
    } catch {
      toast.error('Print failed');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`p-2.5 rounded-xl shrink-0 ${meta.bg}`}>
              <Icon size={18} className={meta.color} />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-slate-800 truncate">{preview.title}</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {preview.subtitle ?? 'Export preview'} · {preview.rowCount.toLocaleString()} rows
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${meta.badge}`}>
              {EXPORT_FORMAT_LABELS[preview.format]}
            </span>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="Close preview"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center gap-2 shrink-0">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">File</span>
          <code className="text-xs font-mono text-slate-700 bg-white border border-slate-200 px-2.5 py-1 rounded-lg truncate">
            {preview.filename}
          </code>
          {preview.truncated && (
            <span className="ml-auto text-[10px] text-amber-600 font-semibold">
              Table shows first 50 of {preview.rowCount} rows
            </span>
          )}
        </div>

        <div className="flex-1 overflow-hidden min-h-0">
          {preview.format === 'pdf' && preview.pdfObjectUrl ? (
            <iframe
              title="PDF export preview"
              src={preview.pdfObjectUrl}
              className="w-full h-full min-h-[420px] bg-slate-100"
            />
          ) : (
            <div className="overflow-auto h-full max-h-[55vh] p-4">
              <table className="w-full text-left min-w-[640px] border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase w-8">#</th>
                    {preview.headers.map((col) => (
                      <th
                        key={col}
                        className="px-3 py-2 text-[10px] font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {preview.rows.map((row, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                      <td className="px-3 py-2 text-[10px] text-slate-400 font-mono">{i + 1}</td>
                      {row.map((cell, j) => (
                        <td
                          key={j}
                          className="px-3 py-2 text-xs text-slate-700 whitespace-nowrap tabular-nums"
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
          <p className="text-xs text-slate-400 hidden sm:block">
            Review the export, then download{preview.format === 'pdf' ? ' or print' : ''}.
          </p>
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-50"
            >
              Cancel
            </button>
            {preview.format === 'pdf' && (
              <button
                onClick={handlePrint}
                disabled={busy !== null}
                className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
              >
                {busy === 'print' ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Printer size={15} />
                )}
                Print
              </button>
            )}
            <button
              onClick={handleDownload}
              disabled={busy !== null}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold disabled:opacity-50"
            >
              {busy === 'download' ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Download size={15} />
              )}
              Download
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
