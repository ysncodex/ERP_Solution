/**
 * POS Sync hub — offline queue, delivery API hooks, sync errors, connectivity.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { sleep, generateId, blockReadOnlyMutation } from '@/shared/utils';
import {
  formatLastSuccessfulSyncPhrase,
  loadPosSyncHub,
  pushIntegrationLog,
  savePosSyncHub,
  type DeliveryIntegrationKey,
  type PendingOfflineInvoice,
  type PosSyncHubState,
  type SyncFailureLogEntry,
} from '@/modules/sales/utils/posSyncHub.storage';
import { INTEGRATION_UI } from '@/modules/sales/utils/posSync.constants';

function getNavigatorOnline(): boolean {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine;
}

type IngestPendingSale = (row: PendingOfflineInvoice) => void | Promise<void>;

export function usePosSyncHub(ingestPendingSale: IngestPendingSale) {
  const [hub, setHub] = useState<PosSyncHubState>(() => loadPosSyncHub());
  const [isOnline, setIsOnline] = useState(() => getNavigatorOnline());
  const [isFlushingPending, setIsFlushingPending] = useState(false);
  const [flushProgress, setFlushProgress] = useState(0);

  const flushingRef = useRef(false);
  const hubRef = useRef(hub);
  hubRef.current = hub;
  const prevOnlineRef = useRef(isOnline);

  useEffect(() => {
    savePosSyncHub(hub);
  }, [hub]);

  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  useEffect(() => {
    setHub((prev) => {
      if (prev.lastSuccessfulSyncISO != null) return prev;
      if (!getNavigatorOnline()) return prev;
      return { ...prev, lastSuccessfulSyncISO: new Date().toISOString() };
    });
  }, []);

  const flushPendingQueue = useCallback(async () => {
    if (blockReadOnlyMutation(false)) return;
    if (!getNavigatorOnline()) {
      toast.error('You are offline. Receipts stay on this device until Wi-Fi returns.');
      return;
    }
    if (flushingRef.current) return;

    const batch = [...hubRef.current.pendingQueue];
    const initialIds = new Set(batch.map((b) => b.id));

    if (batch.length === 0) {
      toast.message('Queue is empty — nothing to upload.');
      setHub((prev) => ({
        ...prev,
        lastSuccessfulSyncISO: new Date().toISOString(),
      }));
      return;
    }

    flushingRef.current = true;
    setIsFlushingPending(true);
    setFlushProgress(4);

    const newFailures: SyncFailureLogEntry[] = [];
    const total = batch.length;
    let attempted = 0;
    let successCount = 0;
    let queue = [...batch];

    try {
      while (queue.length > 0) {
        if (!getNavigatorOnline()) {
          toast.warning('Upload paused — connection lost.');
          break;
        }

        const item = queue[0];
        queue = queue.slice(1);
        attempted += 1;
        setFlushProgress(Math.min(96, Math.round((attempted / total) * 100)));

        await sleep(40 + Math.min(120, attempted * 3));

        if (item.simulatedFailureReason) {
          newFailures.push({
            id: generateId(),
            createdAtISO: new Date().toISOString(),
            orderLabel: item.invoiceNo,
            message: `Upload failed for ${item.invoiceNo}: ${item.simulatedFailureReason}.`,
            resolved: false,
            retryCount: 0,
            payload: item,
          });
          continue;
        }

        await ingestPendingSale(item);
        successCount += 1;
      }

      const finishedBatch = queue.length === 0;
      setFlushProgress(100);

      setHub((prev) => ({
        ...prev,
        pendingQueue: [...prev.pendingQueue.filter((p) => !initialIds.has(p.id)), ...queue],
        errors: [...prev.errors, ...newFailures],
        lastSuccessfulSyncISO: new Date().toISOString(),
      }));

      if (newFailures.length > 0) {
        toast.error(
          `${newFailures.length} receipt${newFailures.length > 1 ? 's' : ''} moved to the error log.`,
        );
      }
      if (successCount > 0 && finishedBatch) {
        toast.success(
          `Uploaded ${successCount} receipt${successCount === 1 ? '' : 's'} to Daily Sales.`,
        );
      } else if (successCount > 0) {
        toast.success(
          `Uploaded ${successCount} receipt${successCount === 1 ? '' : 's'} before connection dropped.`,
        );
      }
    } finally {
      flushingRef.current = false;
      setIsFlushingPending(false);
      window.setTimeout(() => setFlushProgress(0), 700);
    }
  }, [ingestPendingSale]);

  /** Delivery partners — API not wired yet; notify staff to connect credentials. */
  const requestPartnerConnection = useCallback((key: DeliveryIntegrationKey) => {
    if (blockReadOnlyMutation()) return;
    if (!getNavigatorOnline()) {
      toast.error('Internet required to connect delivery apps.');
      return;
    }

    const ui = INTEGRATION_UI[key];
    toast.info(`Connect API ${ui.title}`, {
      description: `${ui.title} is not linked yet. Ask your administrator to add API keys in settings.`,
      duration: 6000,
    });

    setHub((prev) =>
      pushIntegrationLog(prev, {
        integration: key,
        message: `Connect API ${ui.title} — credentials required before orders can import.`,
        atISO: new Date().toISOString(),
      }),
    );
  }, []);

  useEffect(() => {
    if (isOnline) {
      const resumed = prevOnlineRef.current === false;
      prevOnlineRef.current = true;
      if (resumed && hubRef.current.pendingQueue.length > 0 && !flushingRef.current) {
        toast.info('Back online — uploading queued receipts…');
        void flushPendingQueue();
      }
    } else {
      prevOnlineRef.current = false;
    }
  }, [isOnline, flushPendingQueue]);

  const retrySyncError = useCallback(
    (entry: SyncFailureLogEntry) => {
      if (!entry.payload) {
        toast.error('Cannot retry this receipt — edit the order in New Order first.');
        return;
      }
      const replay: PendingOfflineInvoice = {
        ...entry.payload,
        id: generateId(),
        simulatedFailureReason: undefined,
      };
      setHub((prev) => ({
        ...prev,
        errors: prev.errors.filter((e) => e.id !== entry.id),
        pendingQueue: [replay, ...prev.pendingQueue],
      }));
      toast.success(`${entry.orderLabel} added back to the upload queue.`);
      window.setTimeout(() => void flushPendingQueue(), 140);
    },
    [flushPendingQueue],
  );

  const resolveSyncError = useCallback((id: string) => {
    setHub((prev) => ({
      ...prev,
      errors: prev.errors.map((e) => (e.id === id ? { ...e, resolved: true } : e)),
    }));
    toast.success('Issue marked as resolved.');
  }, []);

  return {
    hub,
    isOnline,
    isFlushingPending,
    flushProgress,
    flushPendingQueue,
    requestPartnerConnection,
    retrySyncError,
    resolveSyncError,
    lastSyncPhrase: formatLastSuccessfulSyncPhrase(hub.lastSuccessfulSyncISO),
    unresolvedErrors: hub.errors.filter((e) => !e.resolved),
  };
}
