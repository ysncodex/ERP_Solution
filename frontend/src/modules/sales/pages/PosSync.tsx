/**

 * POS Sync — monitor sales upload, offline queue, delivery imports, and posted ledger.

 */



import { useState, useMemo, useCallback } from 'react';

import { useNavigate } from 'react-router-dom';

import { toast } from 'sonner';

import { ArrowRightLeft } from 'lucide-react';

import { useERP } from '@/core/context/useERP';

import { EditTransactionModal, ManagerPasswordModal } from '@/shared/components/ui';

import { useClientPagination, useCanMutate } from '@/shared/hooks';

import type { Transaction, SalesChannel } from '@/core/types';

import type { PendingOfflineInvoice, SyncFailureLogEntry } from '@/modules/sales/utils/posSyncHub.storage';

import { ingestPendingInvoice } from '@/modules/sales/utils/posOfflineQueue';

import { formatSyncPeriodLabel } from '@/modules/sales/utils/posSync.constants';

import { usePosSyncHub } from '@/modules/sales/hooks/usePosSyncHub';

import {

  PosSyncConnectionBar,

  PosSyncErrorLog,

  PosSyncIntegrations,

  PosSyncOfflineQueue,

  PosSyncQuickGuide,

  PosSyncTransactionLog,

} from '@/modules/sales/components/posSync/PosSyncPanels';



type ManagerAction =

  | { kind: 'retry_sync_error'; data: SyncFailureLogEntry }

  | { kind: 'resolve_sync_error'; data: { id: string } }

  | { kind: 'delete_tx'; data: Transaction }

  | { kind: 'authorize_edit_tx'; data: Transaction };



export default function PosSync() {

  const canMutate = useCanMutate();
  const navigate = useNavigate();

  const {

    filteredTransactions,

    deleteTransaction,

    updateTransaction,

    itemNames,

    suppliers,

    customDateRange,

    setCustomDateRange,

    dateRange,

  } = useERP();



  const periodLabel = useMemo(

    () => formatSyncPeriodLabel(customDateRange, dateRange),

    [customDateRange, dateRange],

  );



  const ingestPendingSale = useCallback(
    (row: PendingOfflineInvoice) => ingestPendingInvoice(row),
    [],
  );



  const {

    hub,

    isOnline,

    isFlushingPending,

    flushProgress,

    flushPendingQueue,

    requestPartnerConnection,

    retrySyncError,

    resolveSyncError,

    lastSyncPhrase,

    unresolvedErrors,

  } = usePosSyncHub(ingestPendingSale);



  const handleAddOfflineReceipt = useCallback(() => {

    toast.message('Open New Order to ring a sale. It saves here automatically when offline.');

    navigate('/dashboard/new-order');

  }, [navigate]);



  /* ─── Posted sales table filters ─────────────────────────────────────────── */



  const [searchQuery, setSearchQuery] = useState('');

  const [channelFilter, setChannelFilter] = useState<SalesChannel | 'all'>('all');

  const [typeFilter, setTypeFilter] = useState<'all' | 'sale' | 'sale_adjustment'>('all');

  const [editTarget, setEditTarget] = useState<Transaction | null>(null);



  const dayTransactions = useMemo(

    () =>

      filteredTransactions.filter((t) => t.type === 'sale' || t.type === 'sale_adjustment'),

    [filteredTransactions],

  );



  const filteredTxnRows = useMemo(() => {

    const q = searchQuery.toLowerCase();

    return dayTransactions.filter((t) => {

      const okSearch =

        !q ||

        (t.description?.toLowerCase().includes(q) ?? false) ||

        String(t.amount).includes(q) ||

        t.id.toLowerCase().includes(q);

      const okCh = channelFilter === 'all' || t.channel === channelFilter;

      const okTy = typeFilter === 'all' || t.type === typeFilter;

      return okSearch && okCh && okTy;

    });

  }, [dayTransactions, searchQuery, channelFilter, typeFilter]);



  const { paginatedData, pagination } = useClientPagination(filteredTxnRows, {

    initialPageSize: 10,

  });



  const resetTxnFilters = useCallback(() => {

    setSearchQuery('');

    setChannelFilter('all');

    setTypeFilter('all');

  }, []);



  const handleEditSave = useCallback(

    (updated: Transaction) => {

      updateTransaction(updated);

      toast.success('Sale updated.');

      setEditTarget(null);

    },

    [updateTransaction],

  );



  /* ─── Manager password gate ──────────────────────────────────────────────── */



  const [pendingPw, setPendingPw] = useState<ManagerAction | null>(null);

  const [showPwModal, setShowPwModal] = useState(false);



  const openPassword = useCallback((action: ManagerAction) => {

    setPendingPw(action);

    setShowPwModal(true);

  }, []);



  const passwordTitle = useMemo(() => {

    if (!pendingPw) return 'Manager approval required';

    switch (pendingPw.kind) {

      case 'retry_sync_error':

        return 'Retry upload';

      case 'resolve_sync_error':

        return 'Mark issue resolved';

      case 'delete_tx':

        return 'Delete sale';

      case 'authorize_edit_tx':

        return 'Edit sale';

      default:

        return 'Manager approval required';

    }

  }, [pendingPw]);



  const handlePasswordConfirm = useCallback(() => {

    if (!pendingPw) return;



    switch (pendingPw.kind) {

      case 'retry_sync_error':

        retrySyncError(pendingPw.data);

        break;

      case 'resolve_sync_error':

        resolveSyncError(pendingPw.data.id);

        break;

      case 'delete_tx':

        void deleteTransaction(pendingPw.data.id)
          .then(() => {
            toast.success('Sale deleted.');
          })
          .catch(() => {
            toast.error('Failed to delete sale.');
          });


        break;

      case 'authorize_edit_tx':

        setEditTarget(pendingPw.data);

        break;

      default:

        break;

    }



    setPendingPw(null);

    setShowPwModal(false);

  }, [pendingPw, deleteTransaction, retrySyncError, resolveSyncError]);



  return (

    <div className="space-y-4 sm:space-y-6 min-w-0">

      <header className="flex items-start gap-3 min-w-0">

        <div className="bg-indigo-100 p-3 rounded-xl shrink-0">

          <ArrowRightLeft size={22} className="text-indigo-600" />

        </div>

        <div className="min-w-0">

          <h1 className="text-lg sm:text-xl font-extrabold text-slate-800 leading-tight">POS Sync</h1>

          <p className="text-xs text-slate-500 mt-1 max-w-xl leading-relaxed">

            Upload offline receipts, connect delivery apps, and review sales in Daily Sales.

          </p>

        </div>

      </header>



      <PosSyncQuickGuide />



      <PosSyncConnectionBar

        isOnline={isOnline}

        pendingCount={hub.pendingQueue.length}

        lastSyncPhrase={lastSyncPhrase}

        isFlushingPending={isFlushingPending}

        onSync={() => void flushPendingQueue()}

        readOnly={!canMutate}

      />



      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 min-w-0">

        <PosSyncOfflineQueue

          pendingCount={hub.pendingQueue.length}

          isOnline={isOnline}

          isFlushingPending={isFlushingPending}

          flushProgress={flushProgress}

          onAddOfflineReceipt={handleAddOfflineReceipt}

          readOnly={!canMutate}

        />

        <PosSyncIntegrations

          isOnline={isOnline}

          integrationLogs={hub.integrationLogs}

          onConnectPartner={requestPartnerConnection}

          readOnly={!canMutate}

        />

      </div>



      <PosSyncTransactionLog

        periodLabel={periodLabel}

        searchQuery={searchQuery}

        channelFilter={channelFilter}

        typeFilter={typeFilter}

        onSearchChange={setSearchQuery}

        onChannelChange={setChannelFilter}

        onTypeChange={setTypeFilter}

        onResetFilters={resetTxnFilters}

        onDateRangeChange={setCustomDateRange}

        customDateRange={customDateRange}

        dayTransactionCount={dayTransactions.length}

        filteredCount={filteredTxnRows.length}

        rows={paginatedData}

        pagination={pagination}

        onEdit={(tx) => openPassword({ kind: 'authorize_edit_tx', data: tx })}

        onDelete={(tx) => openPassword({ kind: 'delete_tx', data: tx })}

        readOnly={!canMutate}

      />



      <PosSyncErrorLog

        errors={hub.errors}

        openCount={unresolvedErrors.length}

        isOnline={isOnline}

        onRetry={(entry) => openPassword({ kind: 'retry_sync_error', data: entry })}

        onResolve={(id) => openPassword({ kind: 'resolve_sync_error', data: { id } })}

        readOnly={!canMutate}

      />



      <ManagerPasswordModal

        isOpen={showPwModal}

        onClose={() => {

          setShowPwModal(false);

          setPendingPw(null);

        }}

        onConfirm={handlePasswordConfirm}

        title={passwordTitle}

        requiredRole="owner"

      />



      <EditTransactionModal

        isOpen={editTarget !== null}

        onClose={() => setEditTarget(null)}

        transaction={editTarget!}

        onSave={handleEditSave}

        itemNames={itemNames}

        suppliers={suppliers.map((s) => s.name)}

      />

    </div>

  );

}


