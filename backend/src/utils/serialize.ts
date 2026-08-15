import type { Order, Transaction } from '../generated/prisma/client.js';

/** Convert a Prisma Decimal (or null) to a plain number the frontend can use. */
export function toNum(value: unknown): number | undefined {
  if (value === null || value === undefined) return undefined;
  return Number(value);
}

/**
 * Map a Prisma Transaction row to the shape the frontend `Transaction` type
 * expects: Decimals → numbers, Date → ISO string, nulls dropped. `receiptLines`
 * is stored as JSON and passed through untouched.
 */
export function serializeTransaction(t: Transaction) {
  return {
    id: t.id,
    type: t.type,
    amount: Number(t.amount),
    method: t.method ?? undefined,
    category: t.category ?? undefined,
    channel: t.channel ?? undefined,
    description: t.description,
    quantity: toNum(t.quantity),
    unit: t.unit ?? undefined,
    unitPrice: toNum(t.unitPrice),
    supplier: t.supplier ?? undefined,
    date: t.date.toISOString(),
    createdAt: t.createdAt.toISOString(),
    cashier: t.cashier ?? undefined,
    customerName: t.customerName ?? undefined,
    loyaltyMemberId: t.loyaltyMemberId ?? undefined,
    receiptLines: t.receiptLines ?? undefined,
    discountAmount: toNum(t.discountAmount),
    vatRatePercent: toNum(t.vatRatePercent),
    receiptStatus: t.receiptStatus ?? undefined,
    orderNumber: t.orderNumber ?? undefined,
    tableNumber: t.tableNumber ?? undefined,
    posChannel: t.posChannel ?? undefined,
    giftItemCount: t.giftItemCount ?? undefined,
    giftTotalValue: toNum(t.giftTotalValue),
  };
}

/** Sale row with optional linked POS order — merges payment totals for edit/receipt UI. */
export function serializeSaleTransaction(t: Transaction & { order?: Order | null }) {
  const base = serializeTransaction(t);
  const o = t.order;
  if (!o) return base;

  return {
    ...base,
    subtotal: Number(o.subtotal),
    customerPaid: Number(o.customerPaid),
    changeAmount: Number(o.changeAmount),
    tax: toNum(o.tax),
    discountType: o.discountType ?? undefined,
    discountValue: toNum(o.discountValue),
    discountAmount: base.discountAmount ?? Number(o.discount),
  };
}
