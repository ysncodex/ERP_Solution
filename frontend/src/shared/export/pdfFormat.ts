/** ASCII-safe currency for PDF (Helvetica cannot render ৳). */
export function pdfCurrency(amount: number): string {
  return `BDT ${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function pdfPct(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function pdfNumber(value: number, decimals = 2): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
