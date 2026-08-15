import type { Transaction } from '@/core/types';
import { isActiveTransactionType } from '@/core/types/transaction.types';

type PersistedERPState = {
  transactions: (Omit<Transaction, 'date'> & { date: string })[];
  itemNames: string[];
  suppliers: string[];
};

export function loadPersistedERPState(storageKey: string): {
  transactions?: Transaction[];
  itemNames?: string[];
  suppliers?: string[];
} | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<PersistedERPState>;

    const revivedTransactions: Transaction[] | undefined = Array.isArray(parsed.transactions)
      ? parsed.transactions
          .filter((t): t is PersistedERPState['transactions'][number] => {
            if (!t || typeof t !== 'object') return false;
            return typeof (t as { date?: unknown }).date === 'string';
          })
          .map((t) => ({
            ...t,
            date: new Date(t.date),
          }))
          .filter((t): t is Transaction => isActiveTransactionType(String(t.type)))
      : undefined;

    return {
      transactions: revivedTransactions,
      itemNames: Array.isArray(parsed.itemNames) ? parsed.itemNames : undefined,
      suppliers: Array.isArray(parsed.suppliers) ? parsed.suppliers : undefined,
    };
  } catch {
    return null;
  }
}

export function savePersistedERPState(
  storageKey: string,
  state: {
    transactions: Transaction[];
    itemNames: string[];
    suppliers: string[];
  }
) {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
  } catch {
    // Ignore quota/security errors
  }
}
