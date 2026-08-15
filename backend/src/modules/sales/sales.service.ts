import { prisma } from '../../lib/prisma.js';
import { ApiError } from '../../utils/ApiError.js';
import { resolveTransactionDate } from '../../utils/businessDate.js';
import { dateRangeWhere, paginate } from '../../utils/query.js';
import type { SaleCreateInput, SaleUpdateInput } from './sales.schema.js';

const SALE_TYPES = ['sale', 'sale_adjustment'] as const;

type ReceiptLineInput = NonNullable<SaleCreateInput['receiptLines']>[number];
type OrderItemInput = NonNullable<SaleCreateInput['orderItems']>[number];

function stripGiftSuffix(name: string): string {
  return name.replace(/ \(Gift\)$/, '');
}

function resolveOrderLines(data: SaleCreateInput): OrderItemInput[] {
  if (data.orderItems?.length) return data.orderItems;

  if (!data.receiptLines?.length) return [];

  return data.receiptLines.map((line: ReceiptLineInput) => ({
    menuItemId: line.menuItemId,
    name: stripGiftSuffix(line.name),
    unitPrice: line.unitPrice,
    quantity: line.qty,
    isGift: line.isGift,
    giftReason: line.giftReason,
  }));
}

function computeSubtotal(lines: OrderItemInput[]): number {
  return lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
}

function isPosOrder(data: SaleCreateInput): boolean {
  return Boolean(data.orderNumber && resolveOrderLines(data).length > 0);
}

function isPendingSale(data: Pick<SaleCreateInput, 'receiptStatus'>): boolean {
  return data.receiptStatus === 'pending';
}

function buildTransactionData(data: SaleCreateInput) {
  const pending = isPendingSale(data);

  return {
    type: 'sale' as const,
    method: pending ? undefined : data.paymentMethod,
    channel: data.channel,
    amount: data.amount,
    description: data.description ?? '',
    date: resolveTransactionDate(data.date),
    orderNumber: data.orderNumber,
    // Any sale that isn't explicitly "pending" is completed — including Quick Record
    // Sale entries that have no orderNumber. Previously only POS orders (with
    // orderNumber) got receiptStatus='completed'; quick sales were saved as NULL
    // and excluded from /api/funds/balances cash drawer totals.
    receiptStatus: data.receiptStatus ?? (pending ? undefined : ('completed' as const)),
    posChannel: data.posChannel,
    customerName: data.customerName,
    tableNumber: data.tableNumber,
    category: data.category,
    quantity: data.quantity,
    discountAmount: data.discountAmount,
    giftItemCount: data.giftItemCount,
    giftTotalValue: data.giftTotalValue,
    cashier: data.cashier,
    receiptLines: data.receiptLines ?? undefined,
  };
}

function buildOrderData(data: SaleCreateInput, lines: OrderItemInput[], saleTransactionId: string) {
  const pending = isPendingSale(data);
  const subtotal = data.subtotal ?? computeSubtotal(lines);
  const discount = data.discountAmount ?? 0;

  return {
    orderNumber: data.orderNumber!,
    customerName: data.customerName ?? '',
    tableNumber: data.tableNumber ?? '',
    paymentMethod: pending ? undefined : data.paymentMethod,
    channel: data.posChannel ?? ('in_store' as const),
    subtotal,
    discount,
    discountType: data.discountType,
    discountValue: data.discountValue,
    tax: data.tax,
    total: data.amount,
    customerPaid: pending ? 0 : (data.customerPaid ?? data.amount),
    changeAmount: pending ? 0 : (data.changeAmount ?? 0),
    cashierName: data.cashier ?? '',
    giftItemCount: data.giftItemCount,
    giftTotalValue: data.giftTotalValue,
    createdAt: resolveTransactionDate(data.date),
    saleTransactionId,
    items: {
      create: lines.map((line) => ({
        menuItemId: line.menuItemId,
        nameSnapshot: line.name,
        unitPrice: line.unitPrice,
        quantity: line.quantity,
        notes: line.notes,
        isGift: line.isGift ?? false,
        giftReason: line.giftReason,
      })),
    },
  };
}

function buildLinkedOrderUpdate(data: SaleUpdateInput) {
  const patch: Record<string, unknown> = {};

  if (data.paymentMethod !== undefined) patch.paymentMethod = data.paymentMethod;
  if (data.posChannel !== undefined) patch.channel = data.posChannel;
  if (data.customerName !== undefined) patch.customerName = data.customerName;
  if (data.tableNumber !== undefined) patch.tableNumber = data.tableNumber;
  if (data.amount !== undefined) patch.total = data.amount;
  if (data.subtotal !== undefined) patch.subtotal = data.subtotal;
  if (data.discountAmount !== undefined) patch.discount = data.discountAmount;
  if (data.discountType !== undefined) patch.discountType = data.discountType;
  if (data.discountValue !== undefined) patch.discountValue = data.discountValue;
  if (data.tax !== undefined) patch.tax = data.tax;
  if (data.customerPaid !== undefined) patch.customerPaid = data.customerPaid;
  if (data.changeAmount !== undefined) patch.changeAmount = data.changeAmount;
  if (data.cashier !== undefined) patch.cashierName = data.cashier;
  if (data.giftItemCount !== undefined) patch.giftItemCount = data.giftItemCount;
  if (data.giftTotalValue !== undefined) patch.giftTotalValue = data.giftTotalValue;
  if (data.date !== undefined) patch.createdAt = resolveTransactionDate(data.date);
  if (data.orderNumber !== undefined) patch.orderNumber = data.orderNumber;

  return patch;
}

/** Create sale + optional POS order without interactive transactions (Neon-safe). */
export async function createSaleRecord(data: SaleCreateInput) {
  const orderLines = resolveOrderLines(data);

  if (!isPosOrder(data)) {
    return prisma.transaction.create({ data: buildTransactionData(data) });
  }

  const sale = await prisma.transaction.create({ data: buildTransactionData(data) });

  try {
    await prisma.order.create({
      data: buildOrderData(data, orderLines, sale.id),
    });
  } catch (err) {
    await prisma.order.deleteMany({ where: { saleTransactionId: sale.id } }).catch(() => {});
    await prisma.transaction.delete({ where: { id: sale.id } }).catch(() => {});
    throw err;
  }

  return prisma.transaction.findUniqueOrThrow({
    where: { id: sale.id },
    include: { order: true },
  });
}

export async function listSaleRecords(query: {
  channel?: SaleCreateInput['channel'];
  receiptStatus?: SaleCreateInput['receiptStatus'];
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}) {
  const { skip, take } = paginate(query.page, query.limit);

  return prisma.transaction.findMany({
    where: {
      type: { in: [...SALE_TYPES] },
      ...(query.channel ? { channel: query.channel } : {}),
      ...(query.receiptStatus ? { receiptStatus: query.receiptStatus } : {}),
      ...dateRangeWhere(query.startDate, query.endDate),
    },
    // List payloads stay lean (no Order join) so login/refresh stays fast.
    // Single-sale get/update still include the linked order for edit/receipt UI.
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    skip,
    take,
  });
}

export async function getSaleRecord(id: string) {
  const sale = await prisma.transaction.findUnique({
    where: { id },
    include: { order: true },
  });
  if (!sale || !SALE_TYPES.includes(sale.type as (typeof SALE_TYPES)[number])) {
    throw ApiError.notFound('Sale not found');
  }
  return sale;
}

export async function updateSaleRecord(id: string, data: SaleUpdateInput) {
  const existing = await prisma.transaction.findUnique({
    where: { id },
    include: { order: true },
  });
  if (!existing) throw ApiError.notFound('Sale not found');

  const completingPayment =
    data.receiptStatus === 'completed' &&
    existing.receiptStatus === 'pending' &&
    data.paymentMethod !== undefined;

  await prisma.transaction.update({
    where: { id },
    data: {
      ...(data.channel !== undefined ? { channel: data.channel } : {}),
      ...(data.paymentMethod !== undefined ? { method: data.paymentMethod } : {}),
      ...(completingPayment && data.paymentMethod ? { method: data.paymentMethod } : {}),
      ...(data.amount !== undefined ? { amount: data.amount } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.date !== undefined ? { date: resolveTransactionDate(data.date) } : {}),
      ...(data.orderNumber !== undefined ? { orderNumber: data.orderNumber } : {}),
      ...(data.receiptStatus !== undefined ? { receiptStatus: data.receiptStatus } : {}),
      ...(data.posChannel !== undefined ? { posChannel: data.posChannel } : {}),
      ...(data.customerName !== undefined ? { customerName: data.customerName } : {}),
      ...(data.tableNumber !== undefined ? { tableNumber: data.tableNumber } : {}),
      ...(data.category !== undefined ? { category: data.category } : {}),
      ...(data.quantity !== undefined ? { quantity: data.quantity } : {}),
      ...(data.discountAmount !== undefined ? { discountAmount: data.discountAmount } : {}),
      ...(data.giftItemCount !== undefined ? { giftItemCount: data.giftItemCount } : {}),
      ...(data.giftTotalValue !== undefined ? { giftTotalValue: data.giftTotalValue } : {}),
      ...(data.cashier !== undefined ? { cashier: data.cashier } : {}),
      ...(data.receiptLines !== undefined ? { receiptLines: data.receiptLines } : {}),
    },
  });

  const orderPatch = buildLinkedOrderUpdate(data);
  if (existing.order && Object.keys(orderPatch).length > 0) {
    await prisma.order.update({
      where: { id: existing.order.id },
      data: orderPatch,
    });
  }

  return prisma.transaction.findUniqueOrThrow({
    where: { id },
    include: { order: true },
  });
}

export async function deleteSaleRecord(id: string) {
  const existing = await prisma.transaction.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('Sale not found');

  await prisma.order.deleteMany({ where: { saleTransactionId: id } });
  await prisma.transaction.delete({ where: { id } });
}

export async function saleStatsRecords(query: { startDate?: string; endDate?: string }) {
  const where = {
    type: 'sale' as const,
    receiptStatus: 'completed' as const,
    ...dateRangeWhere(query.startDate, query.endDate),
  };

  const [byMethod, byChannel] = await Promise.all([
    prisma.transaction.groupBy({ by: ['method'], where, _sum: { amount: true } }),
    prisma.transaction.groupBy({ by: ['channel'], where, _sum: { amount: true } }),
  ]);

  return { byMethod, byChannel };
}

export async function recentSaleRecords(limit: number) {
  return prisma.transaction.findMany({
    where: { type: 'sale' },
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    take: limit,
  });
}
