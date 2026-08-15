/**
 * Payment-method / fund balance guards.
 * Combined balance = operational (sales − expenses) + fund-account adjustments.
 * Rule: cash, bank, bkash, and reserve must never go below zero.
 */

import { prisma } from '../../lib/prisma.js';
import { ApiError } from '../../utils/ApiError.js';
import type { FundAccountType, PaymentMethod } from '../../generated/prisma/enums.js';

export type SpendableMethod = Extract<FundAccountType, 'cash' | 'bank' | 'bkash' | 'reserve'>;

/** Floor every combined balance at 0 for API consumers. */
export function clampBalances<T extends Record<string, number>>(balances: T): T {
  const out = { ...balances };
  for (const key of Object.keys(out) as (keyof T)[]) {
    const n = Number(out[key]);
    out[key] = (Number.isFinite(n) ? Math.max(0, n) : 0) as T[keyof T];
  }
  return out;
}

/**
 * Compute raw combined balances (may be negative if historical data overspent).
 * Prefer getCombinedAccountBalances() for responses; use this for internal checks.
 */
export async function computeRawCombinedBalances(): Promise<Record<FundAccountType, number>> {
  const fundAccounts = await prisma.fundAccount.findMany();

  const aggregations = await prisma.transaction.groupBy({
    by: ['type', 'method', 'receiptStatus'],
    _sum: { amount: true },
    where: { method: { not: null } },
  });

  const operational: Record<FundAccountType, number> = {
    cash: 0,
    bank: 0,
    bkash: 0,
    reserve: 0,
  };

  for (const group of aggregations) {
    const amount = Number(group._sum.amount || 0);
    const method = group.method as FundAccountType;
    if (!(method in operational)) continue;

    if (group.type === 'sale') {
      if (group.receiptStatus === 'completed' || group.receiptStatus === null) {
        operational[method] += amount;
      }
    } else if (
      group.type === 'sale_adjustment' ||
      group.type === 'expense_product' ||
      group.type === 'expense_fixed'
    ) {
      operational[method] -= amount;
    }
  }

  const combined: Record<FundAccountType, number> = {
    cash: 0,
    bank: 0,
    bkash: 0,
    reserve: 0,
  };

  for (const account of fundAccounts) {
    combined[account.type] = operational[account.type] + Number(account.balance);
  }

  // Accounts with no FundAccount row still expose operational-only totals.
  for (const type of Object.keys(operational) as FundAccountType[]) {
    if (fundAccounts.every((a) => a.type !== type)) {
      combined[type] = operational[type];
    }
  }

  return combined;
}

const METHOD_LABEL: Record<string, string> = {
  cash: 'Cash',
  bank: 'Bank/Card',
  bkash: 'bKash',
  reserve: 'Reserve',
};

/**
 * Reject when the payment method cannot cover `amount`.
 * @param creditBack — amount already reserved on this method (e.g. expense being edited).
 */
export async function assertSufficientMethodBalance(
  method: PaymentMethod | FundAccountType,
  amount: number,
  creditBack = 0,
): Promise<void> {
  if (!method || amount <= 0) return;

  const combined = await computeRawCombinedBalances();
  const available = (combined[method as FundAccountType] ?? 0) + creditBack;
  if (available + 1e-9 < amount) {
    const label = METHOD_LABEL[method] ?? method;
    throw ApiError.badRequest(
      `Insufficient ${label} balance. Available ৳${Math.max(0, available).toLocaleString('en-IN')}, required ৳${amount.toLocaleString('en-IN')}.`,
    );
  }
}
