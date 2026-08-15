import { useState, useMemo, useCallback, useEffect, memo } from 'react';
import {
  Search,
  X,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  Printer,
  CheckCircle2,
  Coffee,
  Banknote,
  Smartphone,
  Landmark,
  UtensilsCrossed,
  User,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  ReceiptText,
  Store,
  Package2,
  Bike,
  AlertCircle,
  Tag,
  Gift,
  Loader2,
  Send,
  WifiOff,
} from 'lucide-react';
import { toast } from 'sonner';
import { menuService } from '@/core/api/services';
import { useCanMutate } from '@/shared/hooks';
import { useERP } from '@/core/context/useERP';
import { notifyReadOnlyBlocked } from '@/shared/utils';
import { clearLegacyPosStorage } from '../utils/posStorageMigration';
import {
  ALL_CATEGORIES,
  CATEGORY_STYLES,
  TABLE_OPTIONS,
  type MenuItem,
  type MenuCategory,
  type OrderItem,
  type NewOrderData,
  type DiscountType,
} from '../types/menuItem.types';
import { RECEIPT_CSS, buildCustomerReceiptHTML, buildKitchenChitHTML } from '../utils/receiptPrint';
import { printOrderAsync } from '../utils/posPrintService';
import {
  NO_TABLE,
  computeOrderTotals,
  buildDraftOrder,
  orderToTransaction,
} from '../utils/orderUtils';
import { PaymentPanel } from '../components/PaymentPanel';
import { getOfflineQueueCount, isPosOnline, persistPosOrder } from '../utils/posOfflineQueue';

// ─── Constants ────────────────────────────────────────────────────────────────

const CHANNEL_LABELS: Record<string, string> = {
  in_store: 'Dine In',
  takeaway: 'Takeaway',
  delivery: 'Delivery',
};

const ITEMS_PER_PAGE = 12;

// ─── Category Dot ─────────────────────────────────────────────────────────────

function CategoryDot({ category }: { category: MenuCategory }) {
  const s = CATEGORY_STYLES[category];
  return (
    <span className="flex items-center gap-1">
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />
      <span className={`text-[9px] font-bold uppercase tracking-wide ${s.text}`}>{category}</span>
    </span>
  );
}

// ─── Product Card (horizontal) ────────────────────────────────────────────────

const OrderProductCard = memo(function OrderProductCard({
  item,
  qty,
  onAdd,
}: {
  item: MenuItem;
  qty: number;
  onAdd: (i: MenuItem) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onAdd(item)}
      className={`w-full flex items-center gap-3 text-left bg-white rounded-xl border px-3 py-2.5 transition-all duration-150 select-none group relative
        ${
          qty > 0
            ? 'border-amber-400 ring-2 ring-amber-100 shadow-sm'
            : 'border-slate-200 hover:border-amber-300 hover:shadow-sm'
        }`}
    >
      {qty > 0 && (
        <span className="absolute -top-2 -left-2 min-w-5 h-5 px-1 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center z-10 shadow">
          {qty}
        </span>
      )}

      <div className="flex-1 min-w-0">
        <CategoryDot category={item.category} />
        <p className="text-[13px] font-bold text-slate-800 mt-1 leading-snug truncate">
          {item.name}
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span className="text-sm font-bold text-slate-800 tabular-nums">৳{item.price}</span>
        <span
          className={`w-7 h-7 rounded-full border flex items-center justify-center transition-all
          ${
            qty > 0
              ? 'bg-amber-500 border-amber-500 text-white'
              : 'border-slate-200 text-slate-400 group-hover:border-amber-400 group-hover:text-amber-500'
          }`}
        >
          <Plus size={14} />
        </span>
      </div>
    </button>
  );
});

// ─── Cart Item Row ────────────────────────────────────────────────────────────

const CartItemRow = memo(function CartItemRow({
  orderItem,
  onIncrement,
  onDecrement,
  onRemove,
  onToggleGift,
  onAddAddon,
  onRemoveAddon,
}: {
  orderItem: OrderItem;
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove: () => void;
  onToggleGift: () => void;
  onAddAddon: () => void;
  onRemoveAddon: (idx: number) => void;
}) {
  const { menuItem: item, quantity, isGift, addons } = orderItem;

  // Isolate the base calculation for clear display
  const baseTotal = isGift ? 0 : item.price * quantity;

  return (
    <div
      className={`flex flex-col gap-1 py-2.5 border-b border-slate-100 last:border-0 group ${isGift ? 'bg-emerald-50/50 -mx-1 px-1 rounded-lg' : ''}`}
    >
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-[13px] font-semibold text-slate-800 leading-snug truncate">
              {item.name}
            </p>
            {isGift && (
              <span className="text-[9px] font-bold uppercase tracking-wide text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded shrink-0">
                Gift
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400">
            {isGift ? `Was ৳${item.price} · now free` : `৳${item.price} base`}
          </p>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onAddAddon}
            title="Add Extra"
            className="p-1.5 rounded-lg border border-slate-200 text-slate-400 opacity-0 group-hover:opacity-100 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-500 transition-all"
          >
            <Plus size={12} />
          </button>
          <button
            type="button"
            onClick={onToggleGift}
            title={isGift ? 'Remove gift' : 'Mark as gift'}
            className={`p-1.5 rounded-lg border transition-all ${
              isGift
                ? 'border-emerald-400 bg-emerald-100 text-emerald-600'
                : 'border-slate-200 text-slate-400 opacity-0 group-hover:opacity-100 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-500'
            }`}
          >
            <Gift size={12} />
          </button>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 ml-1">
          <button
            onClick={onDecrement}
            className="w-6 h-6 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:border-red-300 hover:text-red-500 hover:bg-red-50 transition-all"
          >
            <Minus size={11} />
          </button>
          <span className="text-sm font-bold text-slate-800 w-5 text-center">{quantity}</span>
          <button
            onClick={onIncrement}
            className="w-6 h-6 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:border-amber-400 hover:text-amber-500 hover:bg-amber-50 transition-all"
          >
            <Plus size={11} />
          </button>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[13px] font-bold text-slate-800 w-14 text-right tabular-nums">
            {isGift ? 'FREE' : `৳${baseTotal}`}
          </span>
          <button
            onClick={onRemove}
            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-slate-300 hover:text-red-400 transition-all"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Render Addons visually broken out with correct multiplying math */}
      {addons && addons.length > 0 && (
        <div className="flex flex-col gap-0.5 mt-1 ml-1 pl-2 border-l-2 border-amber-200">
          {addons.map((addon, idx) => (
            <div key={idx} className="flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1">
                <Tag size={10} className="text-amber-400" /> {addon.name}
              </span>
              <div className="flex items-center gap-2">
                <span className="font-semibold">+ ৳{isGift ? 0 : addon.price * quantity}</span>
                <button
                  onClick={() => onRemoveAddon(idx)}
                  className="text-slate-300 hover:text-red-400 p-0.5 rounded"
                >
                  <X size={10} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

// ─── Receipt / Chit preview ───────────────────────────────────────────────────

function ReceiptPreview({ html }: { html: string }) {
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}

// ─── Add-on Selection Modal ───────────────────────────────────────────────────

function AddonSelectionModal({
  isOpen,
  catalog,
  onClose,
  onSelect,
}: {
  isOpen: boolean;
  catalog: MenuItem[];
  onClose: () => void;
  onSelect: (item: MenuItem) => void;
}) {
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  // FIX: Filter strictly by 'Add On' category first, then by the search term.
  const filtered = catalog.filter(
    (c) => c.category === 'Add On' && c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-slate-50 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]">
        <div className="bg-white p-4 border-b flex items-center justify-between shrink-0">
          <h3 className="font-bold text-slate-800">Select Add-on / Extra</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg">
            <X size={18} />
          </button>
        </div>
        <div className="p-4 bg-white border-b shrink-0">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search extras..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 text-sm transition-all"
            />
          </div>
        </div>
        <div className="p-4 flex-1 overflow-y-auto custom-scrollbar">
          {filtered.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {filtered.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelect(item);
                    setSearch(''); // Clear search on selection for next time
                  }}
                  className="flex items-center justify-between p-3 rounded-xl border bg-white hover:border-amber-400 hover:shadow-sm transition-all text-left"
                >
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-bold text-slate-800 truncate">{item.name}</p>
                  </div>
                  <span className="text-xs font-bold text-amber-600 whitespace-nowrap shrink-0">
                    + ৳{item.price}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-32 text-slate-400">
              <p className="text-sm font-semibold text-slate-500">No Add-ons found</p>
              <p className="text-xs text-slate-400 mt-1">Check your menu categories</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Order Completion Modal ───────────────────────────────────────────────────

function OrderCompletionModal({
  order,
  onClose,
  onPrintAndComplete,
  onSubmitPending,
}: {
  order: NewOrderData;
  onClose: () => void;
  onPrintAndComplete: (order: NewOrderData, kind: 'customer' | 'both') => Promise<void>;
  onSubmitPending: (order: NewOrderData) => void;
}) {
  const [activeTab, setActiveTab] = useState<'payment' | 'customer' | 'kitchen'>('payment');
  const [customerPaidStr, setCustomerPaidStr] = useState(
    order.paymentMethod === 'cash' ? '' : String(order.total)
  );
  const [printing, setPrinting] = useState<'customer' | 'kitchen' | 'both' | null>(null);

  const paid = parseFloat(customerPaidStr) || 0;
  const change = Math.max(0, paid - order.total);
  const paymentOk = paid >= order.total;

  const enrichedOrder: NewOrderData = useMemo(
    () => ({
      ...order,
      customerPaid: paid,
      changeAmount: change,
    }),
    [order, paid, change]
  );

  const customerHTML = useMemo(() => buildCustomerReceiptHTML(enrichedOrder), [enrichedOrder]);
  const kitchenHTML = useMemo(() => buildKitchenChitHTML(enrichedOrder), [enrichedOrder]);

  const handlePrintAndComplete = async (kind: 'customer' | 'both') => {
    if (!paymentOk) {
      toast.error(`Customer must pay at least ৳${order.total}`);
      return;
    }
    setPrinting(kind);
    try {
      // Execute concurrently to optimize speed
      const printPromise = printOrderAsync(enrichedOrder, kind);
      const completePromise = onPrintAndComplete(enrichedOrder, kind);

      const [ok] = await Promise.all([printPromise, completePromise]);
      if (!ok) {
        toast.error('Pop-up blocked — allow pop-ups and retry');
      }
    } finally {
      setPrinting(null);
    }
  };

  const handlePrintPending = async (kind: 'customer' | 'kitchen') => {
    setPrinting(kind);
    try {
      const ok = await printOrderAsync(enrichedOrder, kind);
      if (!ok) {
        toast.error('Pop-up blocked — allow pop-ups and retry');
      }
      onSubmitPending(enrichedOrder);
    } finally {
      setPrinting(null);
    }
  };

  const handlePrimaryPrint = () => {
    if (activeTab === 'payment') void handlePrintAndComplete('customer');
    else if (activeTab === 'kitchen') void handlePrintPending('kitchen');
    else void handlePrintPending('customer');
  };

  const primaryLabel =
    activeTab === 'payment'
      ? 'Print Receipt & Complete'
      : activeTab === 'kitchen'
        ? 'Print for Kitchen'
        : 'Print for Customer';

  const primaryPrinting =
    activeTab === 'payment' ? printing === 'customer' : printing === activeTab;

  const primaryDisabled = printing !== null || (activeTab === 'payment' && !paymentOk);

  const footerHint =
    activeTab === 'payment'
      ? 'Print & Complete sends customer + kitchen tickets and marks the order paid. Save Pending keeps it open for later.'
      : activeTab === 'kitchen'
        ? 'Sends kitchen chit to printer and saves order as pending — collect payment later.'
        : 'Prints customer receipt and saves order as pending — collect payment later.';

  const tabs = [
    { id: 'payment' as const, label: 'Payment', Icon: Banknote },
    { id: 'customer' as const, label: 'Receipt', Icon: ReceiptText },
    { id: 'kitchen' as const, label: 'Kitchen', Icon: UtensilsCrossed },
  ];

  const hasTable = order.tableNumber && order.tableNumber !== NO_TABLE;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/55 backdrop-blur-sm">
      <style>{RECEIPT_CSS}</style>
      <div className="bg-slate-50 rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-md max-h-[95vh] sm:max-h-[92vh] flex flex-col overflow-hidden border border-slate-200/80">
        <div className="relative bg-gradient-to-br from-emerald-600 via-emerald-700 to-slate-900 px-5 pt-5 pb-5 text-white shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
          >
            <X size={16} />
          </button>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 bg-white/15 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <ReceiptText size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold leading-tight">Review Order</h2>
              <p className="text-xs text-emerald-100/90 font-medium">{order.orderNumber}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              {
                label: 'Items',
                value: String(order.items.reduce((s, o) => s + o.quantity, 0)),
              },
              { label: 'Bill', value: `৳${order.total}` },
              {
                label: hasTable ? 'Table' : 'Channel',
                value: hasTable ? order.tableNumber : CHANNEL_LABELS[order.channel],
              },
            ].map((s) => (
              <div
                key={s.label}
                className="bg-white/10 backdrop-blur-sm rounded-xl px-2 py-2 text-center border border-white/10"
              >
                <p className="text-[9px] opacity-80 uppercase tracking-wider">{s.label}</p>
                <p className="text-sm font-bold leading-snug truncate tabular-nums">{s.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex bg-white border-b border-slate-200 shrink-0 px-1 pt-1">
          {tabs.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`flex-1 py-3 text-xs font-bold flex items-center justify-center gap-1.5 rounded-t-xl transition-all ${
                activeTab === id
                  ? 'bg-slate-50 text-emerald-700 shadow-sm border border-b-0 border-slate-200 -mb-px'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/80">
          {activeTab === 'payment' && (
            <div className="p-4">
              <PaymentPanel
                billTotal={order.total}
                paymentMethod={order.paymentMethod}
                customerPaidStr={customerPaidStr}
                onPaidChange={setCustomerPaidStr}
                channelLabel={CHANNEL_LABELS[order.channel]}
                discountAmount={order.discount > 0 ? order.discount : undefined}
              />
            </div>
          )}
          {activeTab === 'customer' && (
            <div className="p-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm mx-auto max-w-[300px]">
                <ReceiptPreview html={customerHTML} />
              </div>
            </div>
          )}
          {activeTab === 'kitchen' && (
            <div className="p-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm mx-auto max-w-[260px]">
                <ReceiptPreview html={kitchenHTML} />
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-200 shrink-0 space-y-2.5 bg-white">
          {activeTab !== 'payment' && (
            <button
              type="button"
              disabled={primaryDisabled}
              onClick={handlePrimaryPrint}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-sm transition-colors disabled:opacity-50 shadow-lg shadow-emerald-200/40"
            >
              {primaryPrinting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Printer size={16} />
              )}
              {primaryLabel}
            </button>
          )}
          {activeTab === 'payment' ? (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={printing !== null || !paymentOk}
                onClick={() => void handlePrintAndComplete('both')}
                className="flex items-center justify-center gap-1.5 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-sm transition-colors disabled:opacity-50 shadow-lg shadow-emerald-200/40"
              >
                {printing === 'both' ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Printer size={13} />
                )}
                Print & Complete
              </button>
              <button
                type="button"
                disabled={printing !== null}
                onClick={() => onSubmitPending(order)}
                className="flex items-center justify-center gap-1.5 py-3.5 bg-slate-800 hover:bg-slate-900 text-white rounded-2xl font-bold text-sm transition-colors disabled:opacity-50"
              >
                <Send size={13} />
                Save Pending
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={printing !== null}
              onClick={() => onSubmitPending(order)}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50"
            >
              <Send size={13} />
              Submit Without Print
            </button>
          )}
          <p className="text-[10px] text-center text-slate-400 leading-relaxed px-2">
            {footerHint}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function NewOrder() {
  const canMutate = useCanMutate();
  const { refreshTransactions, refreshFundBalances, ingestPostedSale } = useERP();

  const [catalog, setCatalog] = useState<MenuItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<MenuCategory | 'All'>('All');

  const [customerName, setCustomerName] = useState('');
  const [tableNumber, setTableNumber] = useState<string>(NO_TABLE);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank' | 'bkash'>('cash');
  const [channel, setChannel] = useState<'in_store' | 'takeaway' | 'delivery'>('in_store');

  const [discountType, setDiscountType] = useState<DiscountType>('flat');
  const [discountStr, setDiscountStr] = useState('');

  const [draftOrder, setDraftOrder] = useState<NewOrderData | null>(null);
  const [addonTargetId, setAddonTargetId] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(() => isPosOnline());
  const [offlineQueueCount, setOfflineQueueCount] = useState(() => getOfflineQueueCount());

  const [mobileView, setMobileView] = useState<'menu' | 'cart'>('menu');
  const [currentPage, setCurrentPage] = useState(1);
  const [isDesktopView, setIsDesktopView] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches
  );

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const handleChange = (e: MediaQueryListEvent) => setIsDesktopView(e.matches);
    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    clearLegacyPosStorage();
    menuService
      .getAll({ available: true })
      .then(setCatalog)
      .catch(() => toast.error('Failed to load menu from server'))
      .finally(() => setCatalogLoading(false));
  }, []);

  useEffect(() => {
    const refresh = () => {
      setIsOnline(isPosOnline());
      setOfflineQueueCount(getOfflineQueueCount());
    };
    window.addEventListener('online', refresh);
    window.addEventListener('offline', refresh);
    return () => {
      window.removeEventListener('online', refresh);
      window.removeEventListener('offline', refresh);
    };
  }, []);

  const filteredCatalog = useMemo(() => {
    let items = catalog;
    if (selectedCategory !== 'All') items = items.filter((i) => i.category === selectedCategory);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (i) => i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q)
      );
    }
    return items;
  }, [catalog, selectedCategory, searchQuery]);

  const [paginationResetKey, setPaginationResetKey] = useState({ searchQuery, selectedCategory });
  if (
    paginationResetKey.searchQuery !== searchQuery ||
    paginationResetKey.selectedCategory !== selectedCategory
  ) {
    setPaginationResetKey({ searchQuery, selectedCategory });
    setCurrentPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(filteredCatalog.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);

  const paginatedCatalog = useMemo(
    () => filteredCatalog.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE),
    [filteredCatalog, safePage]
  );

  const productsToShow = isDesktopView ? filteredCatalog : paginatedCatalog;

  const getQty = useCallback(
    (id: string) => orderItems.find((o) => o.menuItem.id === id)?.quantity ?? 0,
    [orderItems]
  );

  const addItem = useCallback((item: MenuItem) => {
    setOrderItems((prev) => {
      const ex = prev.find((o) => o.menuItem.id === item.id);
      if (ex)
        return prev.map((o) =>
          o.menuItem.id === item.id ? { ...o, quantity: o.quantity + 1 } : o
        );
      return [...prev, { menuItem: item, quantity: 1, addons: [] }];
    });
  }, []);

  const increment = useCallback((id: string) => {
    setOrderItems((prev) =>
      prev.map((o) => (o.menuItem.id === id ? { ...o, quantity: o.quantity + 1 } : o))
    );
  }, []);

  const decrement = useCallback((id: string) => {
    setOrderItems((prev) => {
      const oi = prev.find((o) => o.menuItem.id === id);
      if (!oi) return prev;
      if (oi.quantity === 1) return prev.filter((o) => o.menuItem.id !== id);
      return prev.map((o) => (o.menuItem.id === id ? { ...o, quantity: o.quantity - 1 } : o));
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setOrderItems((prev) => prev.filter((o) => o.menuItem.id !== id));
  }, []);

  const toggleGift = useCallback((id: string) => {
    setOrderItems((prev) =>
      prev.map((o) => (o.menuItem.id === id ? { ...o, isGift: !o.isGift } : o))
    );
  }, []);

  const handleAddAddon = useCallback(
    (addon: MenuItem) => {
      if (!addonTargetId) return;
      setOrderItems((prev) =>
        prev.map((o) => {
          if (o.menuItem.id === addonTargetId) {
            return { ...o, addons: [...(o.addons || []), addon] };
          }
          return o;
        })
      );
      setAddonTargetId(null);
    },
    [addonTargetId]
  );

  const handleRemoveAddon = useCallback((itemId: string, addonIdx: number) => {
    setOrderItems((prev) =>
      prev.map((o) => {
        if (o.menuItem.id === itemId && o.addons) {
          const newAddons = [...o.addons];
          newAddons.splice(addonIdx, 1);
          return { ...o, addons: newAddons };
        }
        return o;
      })
    );
  }, []);

  const clearCart = useCallback(() => setOrderItems([]), []);

  const discountValue = parseFloat(discountStr) || 0;
  const { subtotal, discount, total, totalItems } = useMemo(
    () => computeOrderTotals(orderItems, discountType, discountValue),
    [orderItems, discountType, discountValue]
  );

  // ── Validation ──
  // Re-enabled Table Selection for both Dine-In and Takeaway seamlessly
  const needsTable = channel === 'in_store' || channel === 'takeaway';
  const tableMissing = needsTable && (!tableNumber || tableNumber === NO_TABLE);
  const canComplete = orderItems.length > 0 && !tableMissing;

  const resetPos = useCallback(() => {
    setDraftOrder(null);
    setOrderItems([]);
    setCustomerName('');
    setTableNumber(NO_TABLE);
    setDiscountStr('');
    setDiscountType('flat');
    setPaymentMethod('cash');
    setChannel('in_store');
    setMobileView('menu');
  }, []);

  const saveOrder = useCallback(
    async (order: NewOrderData, status: 'completed' | 'pending'): Promise<'posted' | 'queued'> => {
      const result = await persistPosOrder(order, status);
      if (result === 'queued') {
        setOfflineQueueCount(getOfflineQueueCount());
      } else {
        // Instant Manager/Owner dashboard updates (no full-page reload needed).
        ingestPostedSale({
          ...orderToTransaction(order, status),
          id: `sale-${order.orderNumber}`,
          date: order.createdAt ? new Date(order.createdAt) : new Date(),
        });
        void refreshFundBalances();
        void refreshTransactions({ silent: true });
      }
      return result;
    },
    [refreshTransactions, refreshFundBalances, ingestPostedSale]
  );

  const orderSavedMessage = useCallback(
    (order: NewOrderData, status: 'completed' | 'pending', result: 'posted' | 'queued') => {
      if (result === 'queued') {
        return `Order ${order.orderNumber} saved offline — sync from POS Sync when online`;
      }
      if (status === 'completed') {
        return `Order ${order.orderNumber} completed · ৳${order.total}`;
      }
      return `Order ${order.orderNumber} saved as pending`;
    },
    []
  );

  const handleOpenCompletion = useCallback(() => {
    if (!canMutate) {
      notifyReadOnlyBlocked();
      return;
    }
    if (orderItems.length === 0) {
      toast.error('Add at least one item to the order');
      return;
    }
    if (needsTable && (!tableNumber || tableNumber === NO_TABLE)) {
      toast.error(`Select a table to complete a ${CHANNEL_LABELS[channel]} order`);
      return;
    }
    setDraftOrder(
      buildDraftOrder({
        items: orderItems,
        customerName,
        tableNumber,
        paymentMethod,
        channel,
        discountType,
        discountValue,
      })
    );
  }, [
    canMutate,
    orderItems,
    customerName,
    tableNumber,
    paymentMethod,
    channel,
    discountType,
    discountValue,
    needsTable,
  ]);

  const handlePrintAndComplete = useCallback(
    async (order: NewOrderData, kind: 'customer' | 'both') => {
      const result = await saveOrder(order, 'completed');
      toast.success(orderSavedMessage(order, 'completed', result), {
        description:
          result === 'queued' ? `${getOfflineQueueCount()} receipt(s) waiting to sync` : undefined,
      });
      resetPos();
      void kind;
    },
    [saveOrder, resetPos, orderSavedMessage]
  );

  const handleSubmitPending = useCallback(
    async (order: NewOrderData) => {
      const result = await saveOrder(order, 'pending');
      toast.success(orderSavedMessage(order, 'pending', result), {
        description:
          result === 'queued' ? `${getOfflineQueueCount()} receipt(s) waiting to sync` : undefined,
      });
      resetPos();
    },
    [saveOrder, resetPos, orderSavedMessage]
  );

  const showMobileCartBar = mobileView === 'menu' && totalItems > 0;

  return (
    <div className="flex flex-col gap-3 min-h-0 lg:h-[calc(100dvh-140px)] lg:min-h-[600px]">
      {!isOnline && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900 shrink-0"
        >
          <WifiOff size={16} className="shrink-0 text-amber-700" />
          <span>
            <strong>Offline mode</strong> — orders are saved locally and upload from{' '}
            <strong>POS Sync</strong> when Wi-Fi returns.
            {offlineQueueCount > 0 && (
              <span className="ml-1 font-semibold">({offlineQueueCount} waiting)</span>
            )}
          </span>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0">
        {/* ── LEFT: Product Browser (60%) ── */}
        <div
          className={`flex-[3] min-w-0 flex-col gap-3 overflow-hidden min-h-[280px] lg:min-h-0 ${
            mobileView === 'menu' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          <div className="shrink-0">
            <h1 className="text-xl font-bold text-slate-800">Order Item List</h1>
            <p className="text-xs text-slate-500">
              {catalogLoading ? 'Loading menu from server…' : 'Select items to add to the order'}
            </p>
          </div>

          <div className="relative shrink-0">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products by name..."
              className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5 shrink-0">
            <button
              onClick={() => setSelectedCategory('All')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                selectedCategory === 'All'
                  ? 'bg-amber-400 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              All
            </button>
            {ALL_CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat;
              const style = CATEGORY_STYLES[cat];
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                    isActive
                      ? style.badge
                      : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
            {filteredCatalog.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-2 pb-4">
                {productsToShow.map((item) => (
                  <OrderProductCard
                    key={item.id}
                    item={item}
                    qty={getQty(item.id)}
                    onAdd={addItem}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-40 text-center">
                <Package2 size={36} className="text-slate-300 mb-2" />
                <p className="text-sm font-semibold text-slate-500">No items found</p>
              </div>
            )}
          </div>

          {!isDesktopView && filteredCatalog.length > ITEMS_PER_PAGE && (
            <div className="shrink-0 flex items-center justify-between gap-2 pt-1 pb-1">
              <button
                type="button"
                onClick={() => setCurrentPage(Math.max(1, safePage - 1))}
                disabled={safePage === 1}
                className="flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:border-slate-300 transition-all"
              >
                <ChevronLeft size={14} /> Prev
              </button>
              <span className="text-xs font-medium text-slate-500 tabular-nums">
                Page {safePage} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage(Math.min(totalPages, safePage + 1))}
                disabled={safePage === totalPages}
                className="flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:border-slate-300 transition-all"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>

        {/* ── RIGHT: Order Cart (40%) ── */}
        <div
          className={`w-full lg:flex-[2] lg:min-w-[280px] xl:min-w-[320px] shrink-0 bg-white rounded-2xl border border-slate-200 shadow-sm flex-col overflow-hidden min-h-[360px] max-h-[70dvh] lg:max-h-none lg:min-h-0 ${
            mobileView === 'cart' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMobileView('menu')}
                className="lg:hidden -ml-1.5 p-1.5 rounded-lg text-slate-500 hover:bg-slate-200/60 transition-colors"
                aria-label="Back to menu"
              >
                <ArrowLeft size={16} />
              </button>
              <ShoppingCart size={16} className="text-slate-600" />
              <span className="font-bold text-slate-800 text-sm">Current Order</span>
              {totalItems > 0 && (
                <span className="bg-amber-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </div>
            {orderItems.length > 0 && (
              <button
                onClick={clearCart}
                className="text-xs text-red-400 hover:text-red-500 font-semibold flex items-center gap-1 transition-colors"
              >
                <Trash2 size={11} /> Clear
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar px-4">
            {orderItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <ShoppingCart size={38} className="text-slate-200 mb-3" />
                <p className="text-sm font-semibold text-slate-400">Cart is empty</p>
                <p className="text-xs text-slate-300 mt-1">Tap products to add them</p>
              </div>
            ) : (
              orderItems.map((oi) => (
                <CartItemRow
                  key={oi.menuItem.id}
                  orderItem={oi}
                  onIncrement={() => increment(oi.menuItem.id)}
                  onDecrement={() => decrement(oi.menuItem.id)}
                  onRemove={() => removeItem(oi.menuItem.id)}
                  onToggleGift={() => toggleGift(oi.menuItem.id)}
                  onAddAddon={() => setAddonTargetId(oi.menuItem.id)}
                  onRemoveAddon={(idx) => handleRemoveAddon(oi.menuItem.id, idx)}
                />
              ))
            )}
          </div>

          <div className="border-t border-slate-100 p-3.5 space-y-3 shrink-0">
            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  { val: 'in_store', label: 'Dine In', Icon: Store },
                  { val: 'takeaway', label: 'Takeaway', Icon: Coffee },
                  { val: 'delivery', label: 'Delivery', Icon: Bike },
                ] as const
              ).map(({ val, label, Icon }) => (
                <button
                  key={val}
                  onClick={() => setChannel(val)}
                  className={`flex flex-col items-center gap-0.5 py-2 rounded-xl border text-[11px] font-semibold transition-all ${
                    channel === val
                      ? 'border-amber-400 bg-amber-50 text-amber-700'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  <Icon size={14} />
                  {label}
                </button>
              ))}
            </div>

            <div className={needsTable ? 'grid grid-cols-2 gap-2' : ''}>
              <div className="relative">
                <User
                  size={12}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Customer (optional)"
                  className="w-full pl-7 pr-2 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all"
                />
              </div>

              {needsTable && (
                <div className="relative">
                  <ChevronDown
                    size={12}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  />
                  <select
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    className={`w-full pl-2.5 pr-7 py-2 rounded-xl border text-xs outline-none transition-all appearance-none bg-white ${
                      tableMissing
                        ? 'border-red-300 text-red-600 focus:border-red-400 focus:ring-2 focus:ring-red-100'
                        : 'border-slate-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100'
                    }`}
                  >
                    <option value={NO_TABLE}>Select table *</option>
                    {TABLE_OPTIONS.filter((opt) => opt !== NO_TABLE).map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {tableMissing && (
              <p className="flex items-center gap-1 text-[11px] text-red-500 font-medium -mt-1">
                <AlertCircle size={11} /> Table selection is required for {CHANNEL_LABELS[channel]}
              </p>
            )}

            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  { val: 'cash', label: 'Cash', Icon: Banknote },
                  { val: 'bkash', label: 'bKash', Icon: Smartphone },
                  { val: 'bank', label: 'Card', Icon: Landmark },
                ] as const
              ).map(({ val, label, Icon }) => (
                <button
                  key={val}
                  onClick={() => setPaymentMethod(val)}
                  className={`flex items-center justify-center gap-1 py-2 rounded-xl border text-[11px] font-semibold transition-all ${
                    paymentMethod === val
                      ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  <Icon size={12} />
                  {label}
                </button>
              ))}
            </div>

            <div className="flex items-stretch gap-2">
              <div className="flex rounded-xl border border-slate-200 overflow-hidden shrink-0">
                {(
                  [
                    { val: 'flat', label: '৳' },
                    { val: 'percent', label: '%' },
                  ] as const
                ).map(({ val, label }) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setDiscountType(val)}
                    className={`w-9 text-sm font-bold transition-all ${
                      discountType === val
                        ? 'bg-amber-500 text-white'
                        : 'bg-white text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="relative flex-1">
                <Tag
                  size={12}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <input
                  type="number"
                  min="0"
                  max={discountType === 'percent' ? 100 : undefined}
                  value={discountStr}
                  onChange={(e) => setDiscountStr(e.target.value)}
                  placeholder={discountType === 'percent' ? 'Discount %' : 'Discount amount'}
                  className="w-full pl-7 pr-3 py-2 rounded-xl border border-slate-200 text-xs outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all"
                />
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 space-y-1.5">
              <div className="flex justify-between text-xs text-slate-500">
                <span>
                  Subtotal ({totalItems} item{totalItems !== 1 ? 's' : ''})
                </span>
                <span className="tabular-nums">৳{subtotal}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-xs text-emerald-600 font-medium">
                  <span>
                    Discount
                    {discountType === 'percent' && discountValue > 0
                      ? ` (${Math.min(discountValue, 100)}%)`
                      : ''}
                  </span>
                  <span className="tabular-nums">−৳{discount}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-slate-800 border-t border-slate-200 pt-1.5">
                <span>Total</span>
                <span className="tabular-nums">৳{total}</span>
              </div>
            </div>

            <button
              onClick={handleOpenCompletion}
              disabled={!canComplete || !canMutate}
              className={`w-full py-3.5 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all ${
                canComplete && canMutate
                  ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg shadow-emerald-200/60 active:scale-[0.98]'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              <CheckCircle2 size={18} />
              {canMutate ? 'Complete Order' : 'Preview Only'}
            </button>
            {!canMutate && (
              <p className="text-[11px] text-center text-slate-400 mt-2 leading-relaxed">
                You can build a cart to explore the flow. Sign in as Owner or Manager to complete
                orders.
              </p>
            )}
          </div>
        </div>

        {showMobileCartBar && (
          <button
            type="button"
            onClick={() => setMobileView('cart')}
            className="lg:hidden fixed bottom-4 left-4 right-4 z-40 flex items-center justify-between gap-3 bg-slate-900 text-white rounded-2xl px-4 py-3.5 shadow-2xl shadow-slate-900/30 active:scale-[0.98] transition-transform"
          >
            <span className="flex items-center gap-2.5">
              <span className="relative shrink-0">
                <ShoppingCart size={18} />
                <span className="absolute -top-2 -right-2 bg-amber-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {totalItems}
                </span>
              </span>
              <span className="text-sm font-semibold">View Cart</span>
            </span>
            <span className="text-sm font-bold tabular-nums">৳{total}</span>
          </button>
        )}

        {draftOrder && (
          <OrderCompletionModal
            order={draftOrder}
            onClose={() => setDraftOrder(null)}
            onPrintAndComplete={handlePrintAndComplete}
            onSubmitPending={handleSubmitPending}
          />
        )}

        {/* Render our new Add-on Selection Modal safely */}
        <AddonSelectionModal
          isOpen={!!addonTargetId}
          catalog={catalog}
          onClose={() => setAddonTargetId(null)}
          onSelect={handleAddAddon}
        />
      </div>
    </div>
  );
}
