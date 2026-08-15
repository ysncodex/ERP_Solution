import { api } from '../client';
import type { Transaction, ReceiptStatus, SalesChannel, PaymentMethod } from '@/core/types';
import type { ReceiptLine } from '@/core/types/transaction.types';

export interface SaleCreateData {
  channel: SalesChannel;
  paymentMethod?: PaymentMethod;
  amount: number;
  description?: string;
  date: string;
  // POS / order fields
  orderNumber?: string;
  receiptStatus?: ReceiptStatus;
  posChannel?: 'in_store' | 'takeaway' | 'delivery';
  customerName?: string;
  tableNumber?: string;
  category?: string;
  quantity?: number;
  discountAmount?: number;
  giftItemCount?: number;
  giftTotalValue?: number;
  cashier?: string;
  receiptLines?: ReceiptLine[];
  subtotal?: number;
  customerPaid?: number;
  changeAmount?: number;
  discountType?: 'flat' | 'percent';
  discountValue?: number;
  tax?: number;
  orderItems?: {
    menuItemId?: string;
    name: string;
    unitPrice: number;
    quantity: number;
    notes?: string;
    isGift?: boolean;
    giftReason?: string;
  }[];
}

export type SaleUpdateData = Partial<SaleCreateData>;

export interface SalesStats {
  totalSales: number;
  cashSales: number;
  bankSales: number;
  bkashSales: number;
  salesByChannel: {
    in_store: number;
    foodpanda: number;
    foodi: number;
  };
}

/** Normalize API date strings into Date objects for Transaction consumers. */
function parseTransaction(t: Transaction & { date: string | Date; createdAt?: string | Date }): Transaction {
  return {
    ...t,
    date: t.date instanceof Date ? t.date : new Date(t.date),
    createdAt:
      t.createdAt === undefined
        ? undefined
        : t.createdAt instanceof Date
          ? t.createdAt
          : new Date(t.createdAt),
  };
}

export const salesService = {
  getAll: async (params?: {
    startDate?: string;
    endDate?: string;
    channel?: string;
    receiptStatus?: ReceiptStatus;
    page?: number;
    limit?: number;
  }): Promise<Transaction[]> => {
    const rows = await api.get<(Transaction & { date: string })[]>('/sales', params);
    return rows.map(parseTransaction);
  },

  getById: async (id: string): Promise<Transaction> => {
    const row = await api.get<Transaction & { date: string }>(`/sales/${id}`);
    return parseTransaction(row);
  },

  create: async (data: SaleCreateData): Promise<Transaction> => {
    const row = await api.post<Transaction & { date: string }>('/sales', data);
    return parseTransaction(row);
  },

  update: async (id: string, data: SaleUpdateData): Promise<Transaction> => {
    const row = await api.put<Transaction & { date: string }>(`/sales/${id}`, data);
    return parseTransaction(row);
  },

  delete: async (id: string): Promise<void> => {
    return api.delete<void>(`/sales/${id}`);
  },

  getStats: async (params?: { startDate?: string; endDate?: string }): Promise<SalesStats> => {
    return api.get<SalesStats>('/sales/stats', params);
  },

  getRecent: async (limit: number = 10): Promise<Transaction[]> => {
    const rows = await api.get<(Transaction & { date: string })[]>('/sales/recent', { limit });
    return rows.map(parseTransaction);
  },
};
