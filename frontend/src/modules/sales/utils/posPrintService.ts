/**
 * Centralized POS printing service — Rangta thermal printer profiles.
 *
 * Browser limitations (Chrome / Edge):
 * • Cannot auto-select a physical printer without the system default being set.
 * • Cannot bypass the print dialog in a normal web app (kiosk mode / extensions differ).
 * • Paper size depends on the Windows driver — set Rangta to 80 mm roll once.
 * • Use portrait in the print dialog; avoid custom @page widths (causes 90° rotation).
 *
 * Recommended one-time setup:
 * 1. Set your Rangta (RP326, RP850, etc.) as default receipt printer.
 * 2. Driver paper: 80 mm × continuous, margins None, Portrait.
 * 3. Allow pop-ups for this site.
 */

import type { NewOrderData } from '../types/menuItem.types';
import {
  RECEIPT_CSS,
  RECEIPT_THERMAL_PRINT_CSS,
  buildCustomerReceiptHTML,
  buildKitchenChitHTML,
} from './receiptPrint';

export type PrinterProfileId = 'rangta-80' | 'rangta-58' | 'generic-80';

export interface PrinterProfile {
  id: PrinterProfileId;
  label: string;
  widthMm: number;
  /** Typical Rangta models using this width. */
  models: string[];
}

export const PRINTER_PROFILES: Record<PrinterProfileId, PrinterProfile> = {
  'rangta-80': {
    id: 'rangta-80',
    label: 'Rangta 80 mm (Receipt)',
    widthMm: 80,
    models: ['RP326', 'RP850', 'RP80VI', 'RP80USE', 'RP400'],
  },
  'rangta-58': {
    id: 'rangta-58',
    label: 'Rangta 58 mm (Kitchen)',
    widthMm: 58,
    models: ['RP58VI', 'RP58USE', 'RP326-58'],
  },
  'generic-80': {
    id: 'generic-80',
    label: 'Generic 80 mm Thermal',
    widthMm: 80,
    models: ['Other ESC/POS 80mm'],
  },
};

export interface PosPrintConfig {
  customerProfile: PrinterProfileId;
  kitchenProfile: PrinterProfileId;
  /** Close print popup after dialog (recommended). */
  autoCloseWindow: boolean;
}

const STORAGE_KEY = 'bb_pos_print_config_v1';

const DEFAULT_CONFIG: PosPrintConfig = {
  customerProfile: 'rangta-80',
  kitchenProfile: 'rangta-58',
  autoCloseWindow: true,
};

export function loadPrintConfig(): PosPrintConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_CONFIG };
}

export function savePrintConfig(config: PosPrintConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

function esc(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** 96 dpi CSS pixels — used for screen preview in the print popup. */
function rollWidthPx(widthMm: number): number {
  return Math.round(widthMm * 3.7795275591);
}

/** 
 * Print CSS tuned for Rangta roll printers — portrait, minimal margins, no A4 waste.
 *
 * Do NOT use `@page { size: 80mm auto }` — Chrome/Edge often treat that as landscape
 * on thermal drivers, which prints the receipt rotated 90° on the roll.
 */
export function buildPrintPageCss(widthMm: number): string {
  const widthPx = rollWidthPx(widthMm);
  return `
@page {
  margin: 0;
  size: portrait;
}
@media print {
  @page {
    margin: 0;
    size: portrait;
  }
  html, body {
    width: ${widthMm}mm !important;
    max-width: ${widthMm}mm !important;
    min-width: ${widthMm}mm !important;
    margin: 0 !important;
    padding: 2mm !important;
    background: #fff !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .print-page {
    width: 100% !important;
    page-break-inside: avoid;
  }
  .page-break {
    page-break-after: always;
  }
}
  html, body {
    margin: 0;
    padding: 0;
    background: #fff;
    width: ${widthPx}px;
    max-width: ${widthPx}px;
    color: #000;
}
body {
  padding: 6px;
}
.print-page { width: 100%; }
.page-break { page-break-after: always; }
`.trim();
}

export type PrintKind = 'customer' | 'kitchen' | 'both';

function profileWidth(id: PrinterProfileId): number {
  return PRINTER_PROFILES[id].widthMm;
}

/**
 * Opens print dialog and resolves when it closes.
 * Returns false if pop-up blocked.
 */
export function printOrderAsync(
  order: NewOrderData,
  kind: PrintKind,
  config: PosPrintConfig = loadPrintConfig(),
): Promise<boolean> {
  return new Promise((resolve) => {
    const customerW = profileWidth(config.customerProfile);
    const kitchenW = profileWidth(config.kitchenProfile);

    let title: string;
    let bodyHTML: string;
    let pageCss: string;
    let viewportW: number;

    if (kind === 'customer') {
      title = `Receipt · ${order.orderNumber}`;
      bodyHTML = `<div class="print-page">${buildCustomerReceiptHTML(order)}</div>`;
      pageCss = buildPrintPageCss(customerW);
      viewportW = customerW;
    } else if (kind === 'kitchen') {
      title = `Kitchen · ${order.orderNumber}`;
      bodyHTML = `<div class="print-page">${buildKitchenChitHTML(order)}</div>`;
      pageCss = buildPrintPageCss(kitchenW);
      viewportW = kitchenW;
    } else {
      title = `Order · ${order.orderNumber}`;
      bodyHTML =
        `<div class="print-page page-break">${buildCustomerReceiptHTML(order)}</div>` +
        `<div class="print-page">${buildKitchenChitHTML(order)}</div>`;
      pageCss = buildPrintPageCss(customerW);
      viewportW = customerW;
    }

    const popupW = rollWidthPx(viewportW) + 24;
    const win = window.open('', '_blank', `width=${popupW},height=800,scrollbars=yes`);
    if (!win) {
      resolve(false);
      return;
    }

    win.document.open();
    win.document.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=${rollWidthPx(viewportW)}, initial-scale=1" />
<title>${esc(title)}</title>
<style>${pageCss}\n${RECEIPT_CSS}\n${RECEIPT_THERMAL_PRINT_CSS}</style>
</head>
<body>${bodyHTML}</body>
</html>`);
    win.document.close();

    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      if (config.autoCloseWindow) {
        try {
          win.close();
        } catch {
          /* ignore */
        }
      }
      resolve(ok);
    };

    win.onafterprint = () => finish(true);

    const trigger = () => {
      win.focus();
      // Let layout settle so thermal drivers get crisp, fully-rendered text.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTimeout(() => win.print(), 200);
        });
      });
    };

    if (win.document.readyState === 'complete') {
      setTimeout(trigger, 100);
    } else {
      win.onload = () => setTimeout(trigger, 100);
    }

    // Fallback if onafterprint never fires (some drivers)
    setTimeout(() => finish(true), 120_000);
  });
}

/** @deprecated Use printOrderAsync — sync wrapper kept for compatibility. */
export function printOrder(order: NewOrderData, kind: PrintKind): boolean {
  void printOrderAsync(order, kind);
  return true;
}

/** Browser / Rangta setup notes shown in POS settings or docs. */
export const PRINT_SETUP_NOTES = [
  'Set your Rangta printer as the Windows default (or pick it once in the print dialog).',
  'Paper size: 80 mm roll, continuous height, Portrait orientation.',
  'Margins: None or Minimum in the browser print dialog.',
  'Scale: 100% — do not shrink or fit to page.',
  'Allow pop-ups for this site so receipts can print.',
  'Chrome and Edge use the same print engine — behavior is identical when settings match.',
] as const;
