/**
 * Offline POS queue — New Order writes here when the browser is offline.
 * POS Sync flushes the queue into the backend when connectivity returns.
 */

import type { ReceiptStatus } from '@/core/types';
import type { NewOrderData } from '../types/menuItem.types';
import { salesService } from '@/core/api/services';
import { orderToSalePayload } from './orderUtils';
import {
  loadPosSyncHub,
  savePosSyncHub,
  type PendingOfflineInvoice,
} from './posSyncHub.storage';
import { generateId, blockReadOnlyMutation } from '@/shared/utils';
import { orderToTransaction } from './orderUtils';

export type PosPersistResult = 'posted' | 'queued';

export function isPosOnline(): boolean {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine;
}

export function getOfflineQueueCount(): number {
  return loadPosSyncHub().pendingQueue.length;
}

/** Queue a completed/pending order locally until POS Sync uploads it. */
export function enqueueOfflineOrder(
  order: NewOrderData,
  status: ReceiptStatus,
): PendingOfflineInvoice {
  if (blockReadOnlyMutation(false)) {
    return {
      id: 'blocked',
      invoiceNo: order.orderNumber,
      capturedAtISO: order.createdAt,
      amount: order.total,
      channel: 'in_store',
      method: order.paymentMethod,
      description: `Order ${order.orderNumber}`,
    };
  }
  const tx = orderToTransaction(order, status);
  const row: PendingOfflineInvoice = {
    id: generateId(),
    invoiceNo: order.orderNumber,
    capturedAtISO: order.createdAt,
    amount: order.total,
    channel: tx.channel ?? 'in_store',
    method: order.paymentMethod,
    description: tx.description ?? `Order ${order.orderNumber}`,
    transactionPayload: tx,
  };

  const hub = loadPosSyncHub();
  savePosSyncHub({
    ...hub,
    pendingQueue: [row, ...hub.pendingQueue],
  });

  return row;
}

/** Post to backend when online; otherwise buffer in the offline queue. */
export async function persistPosOrder(
  order: NewOrderData,
  status: ReceiptStatus,
): Promise<PosPersistResult> {
  if (blockReadOnlyMutation(false)) return 'posted';
  if (isPosOnline()) {
    await salesService.create(orderToSalePayload(order, status));
    return 'posted';
  }

  enqueueOfflineOrder(order, status);
  return 'queued';
}

/** Restore a queued invoice into the backend (used by POS Sync flush). */
export async function ingestPendingInvoice(row: PendingOfflineInvoice): Promise<void> {
  if (row.transactionPayload) {
    const tx = row.transactionPayload;
    await salesService.create({
      channel: tx.channel ?? 'in_store',
      paymentMethod: tx.method,
      amount: tx.amount,
      description: tx.description,
      date: row.capturedAtISO,
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
    });
    return;
  }

  await salesService.create({
    channel: row.channel,
    paymentMethod: row.method,
    amount: row.amount,
    description: `${row.description} (${row.invoiceNo})`,
    date: row.capturedAtISO,
  });
}
