import { isPaidSale, type Transaction } from '@/core/types/transaction.types';
import { businessDateKey, todayBusinessKey } from '@/shared/utils/businessDate';
import type { FundAccountType } from '@/core/types/fund.types';

/**
 * Payment Method Balance Tracking
 * Comprehensive tracking for Cash, Bank, and Bkash balances
 */

export interface FundMovementBalanceInput {
  fromAccount?: string;
  toAccount?: string;
  amount: number;
}

export interface MethodBreakdown {
  balance: number;
  sales: number;
  expenses: number;
}

export interface PaymentMethodBalances {
  cash: MethodBreakdown;
  bank: MethodBreakdown;
  bkash: MethodBreakdown;
  total: {
    balance: number;
    sales: number;
    expenses: number;
  };
}

function emptyBreakdown(): MethodBreakdown {
  return { balance: 0, sales: 0, expenses: 0 };
}

/** Net fund-movement delta per internal account (all-time). */
export function computeFundNetFlows(fundMovements: FundMovementBalanceInput[]) {
  const flows: Record<FundAccountType, number> = {
    cash: 0,
    bank: 0,
    bkash: 0,
    reserve: 0,
  };

  fundMovements.forEach((movement) => {
    const amount = Number(movement.amount);
    const from = movement.fromAccount;
    const to = movement.toAccount;

    if (from && from in flows) flows[from as FundAccountType] -= amount;
    if (to && to in flows) flows[to as FundAccountType] += amount;
  });

  return flows;
}

/**
 * Calculate comprehensive balances for all payment methods
 */
export function calculatePaymentMethodBalances(
  allTransactions: Transaction[],
  filteredTransactions?: Transaction[],
  fundMovements?: FundMovementBalanceInput[],
): PaymentMethodBalances {
  const filtered = filteredTransactions || allTransactions;

  const cash = emptyBreakdown();
  const bank = emptyBreakdown();
  const bkash = emptyBreakdown();

  const applyBalance = (method: Transaction['method'], delta: number) => {
    if (method === 'cash') cash.balance += delta;
    else if (method === 'bank') bank.balance += delta;
    else if (method === 'bkash') bkash.balance += delta;
  };

  allTransactions.forEach((t) => {
    const val = Number(t.amount);
    const method = t.method;

    if (isPaidSale(t)) applyBalance(method, val);
    else if (t.type === 'sale_adjustment') applyBalance(method, -val);
    else if (t.type === 'expense_product' || t.type === 'expense_fixed') applyBalance(method, -val);
  });

  filtered.forEach((t) => {
    const val = Number(t.amount);
    const method = t.method;

    if (method === 'cash') {
      if (isPaidSale(t)) cash.sales += val;
      else if (t.type === 'sale_adjustment') cash.sales -= val;
      else if (t.type === 'expense_product' || t.type === 'expense_fixed') cash.expenses += val;
    } else if (method === 'bank') {
      if (isPaidSale(t)) bank.sales += val;
      else if (t.type === 'sale_adjustment') bank.sales -= val;
      else if (t.type === 'expense_product' || t.type === 'expense_fixed') bank.expenses += val;
    } else if (method === 'bkash') {
      if (isPaidSale(t)) bkash.sales += val;
      else if (t.type === 'sale_adjustment') bkash.sales -= val;
      else if (t.type === 'expense_product' || t.type === 'expense_fixed') bkash.expenses += val;
    }
  });

  if (fundMovements?.length) {
    const fundFlows = computeFundNetFlows(fundMovements);
    cash.balance += fundFlows.cash;
    bank.balance += fundFlows.bank;
    bkash.balance += fundFlows.bkash;
  }

  return {
    cash: { ...cash, balance: Math.max(0, cash.balance) },
    bank: { ...bank, balance: Math.max(0, bank.balance) },
    bkash: { ...bkash, balance: Math.max(0, bkash.balance) },
    total: {
      balance: Math.max(0, cash.balance) + Math.max(0, bank.balance) + Math.max(0, bkash.balance),
      sales: cash.sales + bank.sales + bkash.sales,
      expenses: cash.expenses + bank.expenses + bkash.expenses,
    },
  };
}

/**
 * Calculate daily available cash (today only) — sales minus adjustments and expenses.
 */
export function calculateDailyAvailableCash(transactions: Transaction[]): number {
  const todayKey = todayBusinessKey();
  let dailyAvailableCash = 0;

  transactions.forEach((t) => {
    const val = Number(t.amount);
    if (businessDateKey(t.date) !== todayKey) return;

    if (isPaidSale(t)) dailyAvailableCash += val;
    else if (t.type === 'sale_adjustment') dailyAvailableCash -= val;
    else if (t.type === 'expense_product' || t.type === 'expense_fixed') dailyAvailableCash -= val;
  });

  return dailyAvailableCash;
}
