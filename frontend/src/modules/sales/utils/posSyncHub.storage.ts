/**
 * Persisted POS sync hub — offline queue, integration audit trail, sync errors.
 */

import type { PaymentMethod, SalesChannel, Transaction } from '@/core/types';
import { STORAGE_KEYS } from '@/shared/utils/constants';
import { generateId } from '@/shared/utils/helpers';

export type DeliveryIntegrationKey = 'foodpanda' | 'foodi' | 'pathao';

export interface PendingOfflineInvoice {
  id: string;
  invoiceNo: string;
  capturedAtISO: string;
  amount: number;
  channel: SalesChannel;
  method: PaymentMethod;
  description: string;
  /** Full sale row — restored on sync so line items and order metadata survive offline. */
  transactionPayload?: Omit<Transaction, 'id' | 'date'>;
  /** Next upload surfaces this ERP-style validation error once (staff training scenarios). */
  simulatedFailureReason?: string;
}

export interface IntegrationActivityLogEntry {
  id: string;
  atISO: string;
  integration: DeliveryIntegrationKey;
  message: string;
}

export interface SyncFailureLogEntry {
  id: string;
  createdAtISO: string;
  orderLabel: string;
  message: string;
  resolved: boolean;
  retryCount: number;
  payload: PendingOfflineInvoice | null;
}

export interface PosSyncHubState {
  lastSuccessfulSyncISO: string | null;
  pendingQueue: PendingOfflineInvoice[];
  integrationLogs: IntegrationActivityLogEntry[];
  errors: SyncFailureLogEntry[];
}

const DEFAULT_STATE: PosSyncHubState = {
  lastSuccessfulSyncISO: null,
  pendingQueue: [],
  integrationLogs: [],
  errors: [],
};

export function formatLastSuccessfulSyncPhrase(iso: string | null): string {
  if (!iso) {
    return 'Last successful sync not recorded yet — upload pending receipts or pull partner orders while online.';
  }
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  let dayPart: string;
  if (d.toDateString() === today.toDateString()) dayPart = 'Today';
  else if (d.toDateString() === yesterday.toDateString()) dayPart = 'Yesterday';
  else
    dayPart = d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  const timePart = d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return `Last successful sync: ${dayPart}, ${timePart}.`;
}

export function loadPosSyncHub(): PosSyncHubState {
  if (typeof window === 'undefined') return { ...DEFAULT_STATE };
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.POS_SYNC_HUB);
    if (!raw) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(raw) as Partial<PosSyncHubState>;
    return {
      lastSuccessfulSyncISO:
        typeof parsed.lastSuccessfulSyncISO === 'string' ? parsed.lastSuccessfulSyncISO : null,
      pendingQueue: Array.isArray(parsed.pendingQueue) ? parsed.pendingQueue : [],
      integrationLogs: Array.isArray(parsed.integrationLogs) ? parsed.integrationLogs : [],
      errors: Array.isArray(parsed.errors) ? parsed.errors : [],
    };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function savePosSyncHub(state: PosSyncHubState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.POS_SYNC_HUB, JSON.stringify(state));
  } catch {
    // ignore quota errors
  }
}

function appendLog(
  logs: IntegrationActivityLogEntry[],
  entry: Omit<IntegrationActivityLogEntry, 'id'>,
  maxEntries = 100,
): IntegrationActivityLogEntry[] {
  return [{ ...entry, id: generateId() }, ...logs].slice(0, maxEntries);
}

export function pushIntegrationLog(
  hub: PosSyncHubState,
  entry: Omit<IntegrationActivityLogEntry, 'id'>,
): PosSyncHubState {
  return { ...hub, integrationLogs: appendLog(hub.integrationLogs, entry) };
}
