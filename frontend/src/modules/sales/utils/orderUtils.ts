/**
 * Order helpers — totals, draft building, ERP transaction mapping.
 */

import { generateId } from '@/shared/utils';
import { todayBusinessParts } from '@/shared/utils/businessDate';
import type { ReceiptStatus, Transaction } from '@/core/types';
import type { DiscountType, NewOrderData, OrderItem } from '../types/menuItem.types';

export const NO_TABLE = '— None —';

export function resolveOrderTimestamp(tx: Pick<Transaction, 'date' | 'createdAt'>): string {
  const dateMs = new Date(tx.date).getTime();
  if (!tx.createdAt) return new Date(dateMs).toISOString();

  const d = new Date(tx.date);
  const isLegacyNoon = d.getUTCHours() === 12 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0;
  if (isLegacyNoon) return new Date(tx.createdAt).toISOString();
  return new Date(dateMs).toISOString();
}

export function lineUnitPrice(item: OrderItem): number {
  if (item.isGift) return 0;
  const addonsTotal = item.addons?.reduce((sum, a) => sum + a.price, 0) || 0;
  return item.menuItem.price + addonsTotal;
}

export function lineTotal(item: OrderItem): number {
  return lineUnitPrice(item) * item.quantity;
}

export function computeGiftStats(items: OrderItem[]) {
  let giftItemCount = 0;
  let giftTotalValue = 0;
  for (const oi of items) {
    if (oi.isGift) {
      giftItemCount += oi.quantity;
      giftTotalValue += oi.menuItem.price * oi.quantity;
    }
  }
  return { giftItemCount, giftTotalValue };
}

export function computeOrderTotals(
  items: OrderItem[],
  discountType: DiscountType,
  discountValue: number
) {
  const subtotal = items.reduce((s, oi) => s + lineTotal(oi), 0);
  let discount = 0;
  if (subtotal > 0 && discountValue > 0) {
    const raw =
      discountType === 'percent'
        ? Math.round((subtotal * Math.min(discountValue, 100)) / 100)
        : discountValue;
    discount = Math.min(raw, subtotal);
  }
  const total = subtotal - discount;
  const totalItems = items.reduce((s, oi) => s + oi.quantity, 0);
  const { giftItemCount, giftTotalValue } = computeGiftStats(items);
  return { subtotal, discount, total, totalItems, giftItemCount, giftTotalValue };
}

export function formatOrderNumber(): string {
  const { year, month, day } = todayBusinessParts();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `BB-${year}${pad(month)}${pad(day)}-${Math.floor(1000 + Math.random() * 9000)}`;
}

export interface BuildDraftParams {
  items: OrderItem[];
  customerName: string;
  tableNumber: string;
  paymentMethod: 'cash' | 'bank' | 'bkash';
  channel: 'in_store' | 'takeaway' | 'delivery';
  discountType: DiscountType;
  discountValue: number;
}

export function buildDraftOrder(params: BuildDraftParams): NewOrderData {
  const { subtotal, discount, total, giftItemCount, giftTotalValue } = computeOrderTotals(
    params.items,
    params.discountType,
    params.discountValue
  );
  const needsTable = params.channel === 'in_store' || params.channel === 'takeaway';
  const now = new Date().toISOString();

  return {
    id: generateId(),
    orderNumber: formatOrderNumber(),
    items: params.items,
    customerName: params.customerName.trim(),
    tableNumber: needsTable ? params.tableNumber : NO_TABLE,
    paymentMethod: params.paymentMethod,
    channel: params.channel,
    subtotal,
    discount,
    discountType: params.discountValue > 0 ? params.discountType : undefined,
    discountValue: params.discountValue > 0 ? params.discountValue : undefined,
    tax: 0,
    total,
    customerPaid: 0,
    changeAmount: 0,
    createdAt: now,
    cashierName: '',
    giftItemCount,
    giftTotalValue,
  };
}

function mapPosChannelToErp(channel: NewOrderData['channel']) {
  if (channel === 'delivery') return 'foodi' as const;
  return 'in_store' as const;
}

export function orderToTransaction(
  order: NewOrderData,
  status: ReceiptStatus
): Omit<Transaction, 'id' | 'date'> {
  const totalItems = order.items.reduce((s, oi) => s + oi.quantity, 0);
  const { giftItemCount, giftTotalValue } = computeGiftStats(order.items);

  return {
    type: 'sale',
    amount: order.total,
    description:
      order.items.length === 1
        ? order.items[0].menuItem.name
        : `Order ${order.orderNumber} (${totalItems} items)`,
    ...(status === 'completed' ? { method: order.paymentMethod } : {}),
    channel: mapPosChannelToErp(order.channel),
    customerName: order.customerName || undefined,
    category: order.items[0]?.menuItem.category,
    quantity: totalItems,
    discountAmount: order.discount > 0 ? order.discount : undefined,

    // Flatten addons here so database sees correct math and separate records
    receiptLines: order.items.flatMap((oi) => {
      const lines = [
        {
          name: oi.isGift ? `${oi.menuItem.name} (Gift)` : oi.menuItem.name,
          qty: oi.quantity,
          unitPrice: oi.isGift ? 0 : oi.menuItem.price,
          menuItemId: oi.menuItem.id,
          isGift: oi.isGift,
          giftReason: oi.giftReason,
          originalUnitPrice: oi.isGift ? oi.menuItem.price : undefined,
        },
      ];

      if (oi.addons && oi.addons.length > 0) {
        oi.addons.forEach((a) => {
          lines.push({
            name: `+ ${a.name}`,
            qty: oi.quantity,
            unitPrice: oi.isGift ? 0 : a.price,
            menuItemId: a.id,
            isGift: oi.isGift,
            giftReason: oi.giftReason, // Added to fix TS error
            originalUnitPrice: oi.isGift ? a.price : undefined,
          });
        });
      }

      return lines;
    }),
    receiptStatus: status,
    orderNumber: order.orderNumber,
    tableNumber: order.tableNumber !== NO_TABLE ? order.tableNumber : undefined,
    posChannel: order.channel,
    giftItemCount: giftItemCount > 0 ? giftItemCount : undefined,
    giftTotalValue: giftTotalValue > 0 ? giftTotalValue : undefined,
  };
}

export function orderToSalePayload(
  order: NewOrderData,
  status: ReceiptStatus
): import('@/core/api/services').SaleCreateData {
  const tx = orderToTransaction(order, status);
  const isPending = status === 'pending';

  return {
    channel: tx.channel ?? 'in_store',
    ...(isPending ? {} : { paymentMethod: order.paymentMethod }),
    amount: tx.amount,
    description: tx.description,
    date: order.createdAt,
    orderNumber: tx.orderNumber,
    receiptStatus: tx.receiptStatus,
    posChannel: tx.posChannel,
    customerName: tx.customerName,
    tableNumber: tx.tableNumber,
    category: tx.category,
    quantity: tx.quantity,
    discountAmount: tx.discountAmount,
    giftItemCount: tx.giftItemCount,
    giftTotalValue: tx.giftTotalValue,
    cashier: tx.cashier,
    receiptLines: tx.receiptLines,
    subtotal: order.subtotal,
    customerPaid: isPending ? 0 : order.customerPaid,
    changeAmount: isPending ? 0 : order.changeAmount,
    discountType: order.discountType,
    discountValue: order.discountValue,
    tax: order.tax,

    // Flatten addons here as well to sync up DB perfectly
    orderItems: order.items.flatMap((oi) => {
      const items = [
        {
          menuItemId: oi.menuItem.id,
          name: oi.menuItem.name,
          unitPrice: oi.isGift ? 0 : oi.menuItem.price,
          quantity: oi.quantity,
          notes: oi.notes,
          isGift: oi.isGift,
          giftReason: oi.giftReason,
        },
      ];

      if (oi.addons && oi.addons.length > 0) {
        oi.addons.forEach((a) => {
          items.push({
            menuItemId: a.id,
            name: `+ ${a.name}`,
            unitPrice: oi.isGift ? 0 : a.price,
            quantity: oi.quantity,
            notes: undefined, // Added to fix TS error
            isGift: oi.isGift,
            giftReason: oi.giftReason, // Added to fix TS error
          });
        });
      }

      return items;
    }),
  };
}

export function transactionToSaleUpdate(
  tx: Transaction,
  payment?: { customerPaid?: number; changeAmount?: number }
): import('@/core/api/services').SaleUpdateData {
  return {
    channel: tx.channel,
    ...(tx.method ? { paymentMethod: tx.method } : {}),
    amount: tx.amount,
    description: tx.description,
    date: new Date(tx.date).toISOString(),
    orderNumber: tx.orderNumber,
    receiptStatus: tx.receiptStatus,
    posChannel: tx.posChannel,
    customerName: tx.customerName,
    tableNumber: tx.tableNumber,
    category: tx.category,
    quantity: tx.quantity,
    discountAmount: tx.discountAmount,
    giftItemCount: tx.giftItemCount,
    giftTotalValue: tx.giftTotalValue,
    cashier: tx.cashier,
    receiptLines: tx.receiptLines,
    customerPaid: payment?.customerPaid,
    changeAmount: payment?.changeAmount,
  };
}

export function transactionToOrder(tx: Transaction): NewOrderData | null {
  if (!tx.receiptLines?.length || !tx.orderNumber) return null;

  const items: OrderItem[] = tx.receiptLines.map((line) => ({
    menuItem: {
      id: line.menuItemId ?? `hist-${line.name}`,
      name: line.name.replace(/ \(Gift\)$/, ''),
      category: 'Coffee',
      price: line.originalUnitPrice ?? line.unitPrice,
      available: true,
    },
    quantity: line.qty,
    isGift: line.isGift,
    giftReason: line.giftReason,
    addons: [],
  }));

  return {
    id: tx.id,
    orderNumber: tx.orderNumber,
    items,
    customerName: tx.customerName ?? '',
    tableNumber: tx.tableNumber ?? NO_TABLE,
    paymentMethod: tx.method ?? 'cash',
    channel: tx.posChannel ?? 'in_store',
    subtotal:
      tx.subtotal ??
      tx.receiptLines.reduce((s, l) => s + l.qty * l.unitPrice, 0) + (tx.discountAmount ?? 0),
    discount: tx.discountAmount ?? 0,
    discountType: tx.discountType,
    discountValue: tx.discountValue,
    tax: tx.tax ?? 0,
    total: tx.amount,
    customerPaid: tx.customerPaid ?? (tx.receiptStatus === 'pending' ? 0 : tx.amount),
    changeAmount: tx.changeAmount ?? 0,
    createdAt: resolveOrderTimestamp(tx),
    cashierName: tx.cashier ?? '',
    giftItemCount: tx.giftItemCount,
    giftTotalValue: tx.giftTotalValue,
  };
}
