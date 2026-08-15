import type { ERPStats, Transaction } from '@/core/types';
import type { FundMovement } from '@/core/types/fund.types';
import { isPaidSale } from '@/core/types/transaction.types';
import {
  calculateDailyAvailableCash,
  calculatePaymentMethodBalances,
  computeFundNetFlows,
} from '@/shared/utils/calculations';

/**
 * Authoritative account balances computed server-side (GET /api/funds/balances).
 * When supplied, these override the client-derived balances — which is essential
 * because the client only holds a capped window of the ledger (recent rows), so
 * summing it would understate true all-time balances for a busy shop.
 */
export interface AuthoritativeBalances {
  cash: number;
  bank: number;
  bkash: number;
  reserve: number;
  totalLiquidity: number;
}

export function computeStats(
  transactions: Transaction[],
  filteredTransactions: Transaction[],
  fundMovements: FundMovement[] = [],
  authoritativeBalances?: AuthoritativeBalances,
): ERPStats {
  let totalSales = 0;
  let foodpandaSales = 0;
  let foodiSales = 0;

  let totalExpenses = 0;
  let totalProductCost = 0;
  let totalFixedCost = 0;

  const expenseCategories: Record<string, number> = {};
  const productUsage: Record<string, { qty: number; unit: string; cost: number; count: number }> = {};
  const fixedCostAgg: Record<string, number> = {};

  const paymentMethods = calculatePaymentMethodBalances(
    transactions,
    filteredTransactions,
    fundMovements,
  );

  const fundFlows = computeFundNetFlows(fundMovements);
  const dailyAvailableCash = calculateDailyAvailableCash(transactions);

  // Prefer authoritative server balances for the *balance* figures (the period
  // sales/expense breakdowns above stay client-derived from the current window).
  // Total Liquid Assets MUST equal Cash + Bank + bKash + Reserve.
  let reserveBalance = Math.max(0, fundFlows.reserve);
  if (authoritativeBalances) {
    paymentMethods.cash.balance = Math.max(0, Number(authoritativeBalances.cash) || 0);
    paymentMethods.bank.balance = Math.max(0, Number(authoritativeBalances.bank) || 0);
    paymentMethods.bkash.balance = Math.max(0, Number(authoritativeBalances.bkash) || 0);
    reserveBalance = Math.max(0, Number(authoritativeBalances.reserve) || 0);
    paymentMethods.total.balance =
      paymentMethods.cash.balance +
      paymentMethods.bank.balance +
      paymentMethods.bkash.balance +
      reserveBalance;
  }

  const totalLiquidity =
    paymentMethods.cash.balance +
    paymentMethods.bank.balance +
    paymentMethods.bkash.balance +
    reserveBalance;
  const cashInHand = paymentMethods.cash.balance;

  let netCashInRange = 0;
  filteredTransactions.forEach((t) => {
    const val = Number(t.amount);
    if (isPaidSale(t)) netCashInRange += val;
    else if (t.type === 'sale_adjustment') netCashInRange -= val;
    else if (t.type === 'expense_product' || t.type === 'expense_fixed') netCashInRange -= val;
  });

  filteredTransactions.forEach((t) => {
    const val = Number(t.amount);

    if (isPaidSale(t)) {
      totalSales += val;
      if (t.channel === 'foodpanda') foodpandaSales += val;
      if (t.channel === 'foodi') foodiSales += val;
    } else if (t.type === 'sale_adjustment') {
      totalSales -= val;
      if (t.channel === 'foodpanda') foodpandaSales -= val;
      if (t.channel === 'foodi') foodiSales -= val;
    }

    if (t.type === 'expense_product' || t.type === 'expense_fixed') {
      totalExpenses += val;
      if (t.type === 'expense_product') {
        totalProductCost += val;

        const itemName = t.description || 'Unknown Item';
        if (!productUsage[itemName]) {
          productUsage[itemName] = { qty: 0, unit: t.unit || 'pcs', cost: 0, count: 0 };
        }
        productUsage[itemName].qty += t.quantity || 0;
        productUsage[itemName].cost += val;
        productUsage[itemName].count += 1;
      }
      if (t.type === 'expense_fixed') {
        totalFixedCost += val;
        const key = t.category || t.description || 'Misc';
        fixedCostAgg[key] = (fixedCostAgg[key] || 0) + val;
      }

      const cat = t.category || (t.type === 'expense_product' ? 'Product' : 'Fixed');
      expenseCategories[cat] = (expenseCategories[cat] || 0) + val;
    }
  });

  const recentSales = filteredTransactions
    .filter((t) => t.type === 'sale')
    .slice(0, 10)
    .reverse()
    .map((t, index) => ({
      name: `Day ${index + 1}`,
      value: t.amount,
    }));

  const topProducts = Object.entries(productUsage)
    .map(([name, data]) => ({ name, cost: data.cost, qty: data.qty, unit: data.unit }))
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 5);

  const topFixed = Object.entries(fixedCostAgg)
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  return {
    totalSales,
    foodpandaSales,
    foodiSales,
    cashInHand,
    totalLiquidity,
    cashBalance: paymentMethods.cash.balance,
    bankBalance: paymentMethods.bank.balance,
    bkashBalance: paymentMethods.bkash.balance,
    reserveBalance,
    totalBalance: paymentMethods.total.balance,
    cashSales: paymentMethods.cash.sales,
    bankSales: paymentMethods.bank.sales,
    bkashSales: paymentMethods.bkash.sales,
    bankReceived: paymentMethods.bank.sales,
    bkashReceived: paymentMethods.bkash.sales,
    cashExpenses: paymentMethods.cash.expenses,
    bankExpenses: paymentMethods.bank.expenses,
    bkashExpenses: paymentMethods.bkash.expenses,
    totalExpenses,
    totalProductCost,
    totalFixedCost,
    dailyAvailableCash,
    netCashInRange,
    profit: totalSales - totalExpenses,
    grossProfit: totalSales - totalProductCost,
    expenseCategories,
    productUsage,
    recentSales,
    topProducts,
    topFixed,
    paymentMethods,
  };
}
