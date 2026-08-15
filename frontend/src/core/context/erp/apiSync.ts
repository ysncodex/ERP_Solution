/**
 * Map ERP Transaction records ↔ backend sales/expenses API payloads.
 */
import type { Transaction } from '@/core/types';
import type { SaleCreateData, SaleUpdateData } from '@/core/api/services/sales.service';
import type { ExpenseCreateData } from '@/core/api/services/expenses.service';
import { parseBusinessDate, resolveTransactionDate } from '@/shared/utils/businessDate';

function toIsoDate(date: Date | string | undefined): string {
  if (!date) return resolveTransactionDate(new Date()).toISOString();
  return resolveTransactionDate(date).toISOString();
}

export function parseApiTransaction(t: Transaction & { date: string | Date; createdAt?: string | Date }): Transaction {
  const date =
    t.date instanceof Date
      ? t.date
      : /^\d{4}-\d{2}-\d{2}$/.test(String(t.date).trim())
        ? parseBusinessDate(t.date)
        : new Date(t.date);

  const createdAt =
    t.createdAt === undefined
      ? undefined
      : t.createdAt instanceof Date
        ? t.createdAt
        : new Date(t.createdAt);

  return { ...t, date, createdAt };
}

export function isSaleType(type: string): boolean {
  return type === 'sale' || type === 'sale_adjustment';
}

export function isExpenseType(type: string): boolean {
  return type === 'expense_product' || type === 'expense_fixed';
}

/** Simple sale row (Dashboard Quick Sale) → POST /sales */
export function transactionToSaleCreate(
  data: Omit<Transaction, 'id' | 'date'> & { date?: Date },
): SaleCreateData {
  if (!data.method) {
    throw new Error('Payment method is required for completed sales');
  }

  return {
    channel: data.channel ?? 'in_store',
    paymentMethod: data.method,
    amount: data.amount,
    description: data.description,
    date: toIsoDate(data.date),
    orderNumber: data.orderNumber,
    receiptStatus: data.receiptStatus,
    posChannel: data.posChannel,
    customerName: data.customerName,
    tableNumber: data.tableNumber,
    category: data.category,
    quantity: data.quantity,
    discountAmount: data.discountAmount,
    giftItemCount: data.giftItemCount,
    giftTotalValue: data.giftTotalValue,
    cashier: data.cashier,
    receiptLines: data.receiptLines,
  };
}

export function transactionToSaleUpdate(tx: Transaction): SaleUpdateData {
  return {
    channel: tx.channel,
    ...(tx.method ? { paymentMethod: tx.method } : {}),
    amount: tx.amount,
    description: tx.description,
    date: toIsoDate(tx.date),
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
    subtotal: tx.subtotal,
    customerPaid: tx.customerPaid,
    changeAmount: tx.changeAmount,
    discountType: tx.discountType,
    discountValue: tx.discountValue,
    tax: tx.tax,
  };
}

/** Expense row → POST /expenses */
export function transactionToExpenseCreate(
  data: Omit<Transaction, 'id' | 'date'> & { date?: Date },
): ExpenseCreateData {
  const type = data.type as 'expense_product' | 'expense_fixed';
  if (!data.method) {
    throw new Error('Payment method is required for expenses');
  }

  return {
    type,
    category:
      data.category ?? (type === 'expense_product' ? 'Product' : 'Fixed'),
    item: data.description,
    supplier: data.supplier,
    quantity: data.quantity,
    unit: data.unit,
    unitPrice: data.unitPrice,
    amount: data.amount,
    paymentMethod: data.method,
    description: data.description,
    date: toIsoDate(data.date),
  };
}

export function transactionToExpenseUpdate(tx: Transaction): Partial<ExpenseCreateData> {
  return transactionToExpenseCreate(tx);
}
