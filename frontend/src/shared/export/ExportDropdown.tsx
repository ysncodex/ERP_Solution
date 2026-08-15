/**
 * ExportDropdown — ERP-standard export control for any page.
 *
 * • Single dropdown labelled "Export"
 * • PDF / CSV / XLSX listed vertically
 * • Selecting a format immediately opens the preview modal
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { handleError } from '@/shared/utils';
import type { ExportFormat, PageExportConfig, ExportPreviewPayload } from './types';
import {
  prepareExportPreview,
  revokeExportPreview,
  DEFAULT_EXPORT_FORMATS,
  EXPORT_FORMAT_LABELS,
} from './workflow';
import { ExportPreviewModal } from './ExportPreviewModal';

interface ExportDropdownProps<T> {
  config: PageExportConfig<T>;
  disabled?: boolean;
  className?: string;
}

export function ExportDropdown<T>({ config, disabled, className = '' }: ExportDropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<ExportFormat | null>(null);
  const [preview, setPreview] = useState<ExportPreviewPayload | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const formats = config.formats ?? DEFAULT_EXPORT_FORMATS;

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const closePreview = useCallback(() => {
    revokeExportPreview(preview);
    setPreview(null);
  }, [preview]);

  const handleSelectFormat = async (format: ExportFormat) => {
    setOpen(false);
    const data = config.getData();
    const hasCustomExport = Boolean(config.buildExport || config.buildPdf);
    if (data.length === 0 && !hasCustomExport) {
      toast.error('No data to export for this period');
      return;
    }

    setLoading(format);
    try {
      const payload = await prepareExportPreview(format, config);
      setPreview(payload);
    } catch (err) {
      handleError(err, { action: `export_preview_${format}`, severity: 'medium' });
    } finally {
      setLoading(null);
    }
  };

  return (
    <>
      {preview && <ExportPreviewModal preview={preview} onClose={closePreview} />}

      <div className={`relative ${className}`} ref={ref}>
        <button
          type="button"
          onClick={() => !disabled && !loading && setOpen((v) => !v)}
          disabled={disabled || loading !== null}
          className="flex items-center gap-2 min-w-[120px] px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          {loading ? (
            <Loader2 size={15} className="animate-spin text-slate-400" />
          ) : (
            <span className="flex-1 text-left">Export</span>
          )}
          <ChevronDown
            size={14}
            className={`text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </button>

        {open && (
          <div
            role="listbox"
            className="absolute right-0 top-full mt-1 w-full min-w-[140px] bg-white border border-slate-200 rounded-lg shadow-lg z-50 py-1 overflow-hidden"
          >
            {formats.map((format) => (
              <button
                key={format}
                type="button"
                role="option"
                onClick={() => handleSelectFormat(format)}
                className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 border-b border-slate-50 last:border-0 transition-colors"
              >
                {EXPORT_FORMAT_LABELS[format]}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
