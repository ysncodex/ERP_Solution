/**
 * Payment Method Type Definitions
 */

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
