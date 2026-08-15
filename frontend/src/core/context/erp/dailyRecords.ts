import type { DailyRecord, Transaction } from '@/core/types';
import { isPaidSale } from '@/core/types/transaction.types';
import { businessDateKey } from '@/shared/utils/businessDate';

type MutableDailyRecord = Omit<DailyRecord, 'totalSales' | 'dailyAvail'> & {
  totalSales: number;
  dailyAvail: number;
};

export function computeDailyRecords(filteredTransactions: Transaction[]): DailyRecord[] {
  const records: Record<string, MutableDailyRecord> = {};

  filteredTransactions.forEach((t) => {
    const dateKey = businessDateKey(t.date);
    if (!dateKey) return;

    if (!records[dateKey]) {
      records[dateKey] = {
        date: t.date,
        cashSales: 0,
        bkashSales: 0,
        bankSales: 0,
        cashCosts: 0,
        bankCosts: 0,
        bkashCosts: 0,
        dailyCosts: 0,
        totalSales: 0,
        dailyAvail: 0,
      };
    }

    const val = Number(t.amount);
    const rec = records[dateKey];

    if (isPaidSale(t) && t.method) {
      if (t.method === 'cash') rec.cashSales += val;
      if (t.method === 'bkash') rec.bkashSales += val;
      if (t.method === 'bank') rec.bankSales += val;
    } else if (t.type === 'sale_adjustment' && t.method) {
      if (t.method === 'cash') rec.cashSales -= val;
      if (t.method === 'bkash') rec.bkashSales -= val;
      if (t.method === 'bank') rec.bankSales -= val;
    }

    if (t.type === 'expense_product' || t.type === 'expense_fixed') {
      rec.dailyCosts += val;
      if (t.method === 'cash') rec.cashCosts += val;
      if (t.method === 'bank') rec.bankCosts += val;
      if (t.method === 'bkash') rec.bkashCosts += val;
    }
  });

  return Object.values(records)
    .map((rec) => {
      rec.totalSales = rec.cashSales + rec.bkashSales + rec.bankSales;
      rec.dailyAvail = rec.totalSales - rec.dailyCosts;
      return rec as DailyRecord;
    })
    .sort((a, b) => b.date.getTime() - a.date.getTime());
}
