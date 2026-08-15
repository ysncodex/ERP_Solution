import { useState, useEffect, useMemo, useCallback, forwardRef } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  ShoppingBag,
  Package,
  Plus,
  X,
  Pencil,
  Trash2,
  Users,
  ChevronDown,
  ChevronUp,
  Banknote,
  Smartphone,
  Landmark,
  Search,
  Hash,
  TrendingDown,
  type LucideIcon,
} from 'lucide-react';
import { useERP } from '@/core/context/useERP';
import {
  ManagerPasswordModal,
  EditTransactionModal,
  ManageListModal,
  ButtonLoading,
  Pagination,
} from '@/shared/components/ui';
import { useClientPagination, useCanMutate } from '@/shared/hooks';
import {
  productCostSchema,
  type ProductCostFormData,
  handleError,
  formatCurrency,
  formatDate,
  getStoredUser,
} from '@/shared/utils';
import { ExportDropdown, TRANSACTION_EXPORT_COLUMNS } from '@/shared/export';
import type { Transaction } from '@/core/types';
import RangeCalendar from '@/shared/components/ui/Calendar/CustomCalendar';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseLocalDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
}

// ─── Constants ────────────────────────────────────────────────────────────────

const UNIT_OPTIONS = [
  { value: 'pcs', label: 'Pcs' },
  { value: 'kg', label: 'Kg' },
  { value: 'g', label: 'g' },
  { value: 'L', label: 'L' },
  { value: 'ml', label: 'ml' },
  { value: 'box', label: 'Box' },
  { value: 'pack', label: 'Pack' },
] as const;

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank', label: 'Bank' },
  { value: 'bkash', label: 'bKash' },
] as const;

const METHOD_CONFIG: Record<
  string,
  { label: string; icon: LucideIcon; color: string; bg: string; border: string }
> = {
  cash: {
    label: 'Cash',
    icon: Banknote,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-100',
  },
  bank: {
    label: 'Bank',
    icon: Landmark,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-100',
  },
  bkash: {
    label: 'bKash',
    icon: Smartphone,
    color: 'text-pink-600',
    bg: 'bg-pink-50',
    border: 'border-pink-100',
  },
};

type MethodFilterValue = 'all' | 'cash' | 'bank' | 'bkash';

// ─── Sub-components ───────────────────────────────────────────────────────────

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="text-xs text-red-600 mt-1" role="alert">
      {message}
    </p>
  );
}

interface SelectWithChevronProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  hasError?: boolean;
}

const SelectWithChevron = forwardRef<HTMLSelectElement, SelectWithChevronProps>(
  ({ hasError, className = '', children, ...props }, ref) => (
    <div className="relative">
      <select
        {...props}
        ref={ref}
        className={`w-full h-11 pl-3 sm:pl-4 pr-9 border ${
          hasError ? 'border-red-400' : 'border-slate-200'
        } rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 appearance-none text-sm cursor-pointer ${className}`}
      >
        {children}
      </select>
      <ChevronDown
        size={16}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 z-10"
      />
    </div>
  )
);
SelectWithChevron.displayName = 'SelectWithChevron';

interface InlineAddFieldProps {
  value: string;
  onChange: (value: string) => void;
  onAdd: () => void | Promise<void>;
  onCancel: () => void;
  placeholder: string;
  loading?: boolean;
}

function InlineAddField({
  value,
  onChange,
  onAdd,
  onCancel,
  placeholder,
  loading,
}: InlineAddFieldProps) {
  const handleAdd = () => {
    void Promise.resolve(onAdd());
  };

  return (
    <div className="flex gap-2">
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        disabled={loading}
        className="flex-1 h-11 px-3 sm:px-4 bg-indigo-50 border border-indigo-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm disabled:opacity-60 min-w-0"
        autoFocus
      />
      <button
        type="button"
        onClick={handleAdd}
        disabled={loading || !value.trim()}
        className="h-11 px-3 sm:px-4 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors flex items-center justify-center disabled:opacity-60 shrink-0 text-sm sm:text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
      >
        {loading ? '...' : 'Add'}
      </button>
      <button
        type="button"
        onClick={onCancel}
        disabled={loading}
        className="h-11 px-3 border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 transition-colors flex items-center justify-center disabled:opacity-60 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
      >
        <X size={16} />
      </button>
    </div>
  );
}

interface InlineSupplierAddProps {
  name: string;
  phone: string;
  address: string;
  email: string;
  onNameChange: (v: string) => void;
  onPhoneChange: (v: string) => void;
  onAddressChange: (v: string) => void;
  onEmailChange: (v: string) => void;
  onAdd: () => void | Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

function InlineSupplierAdd({
  name,
  phone,
  address,
  email,
  onNameChange,
  onPhoneChange,
  onAddressChange,
  onEmailChange,
  onAdd,
  onCancel,
  loading,
}: InlineSupplierAddProps) {
  const canSubmit = name.trim() && phone.trim() && address.trim();

  return (
    <div className="space-y-2 rounded-xl border border-indigo-200 bg-indigo-50/50 p-3">
      <input
        type="text"
        placeholder="Supplier name *"
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        disabled={loading}
        className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input
          type="text"
          placeholder="Contact number *"
          value={phone}
          onChange={(e) => onPhoneChange(e.target.value)}
          disabled={loading}
          className="h-10 px-3 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <input
          type="email"
          placeholder="Email (optional)"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          disabled={loading}
          className="h-10 px-3 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
      <input
        type="text"
        placeholder="Address *"
        value={address}
        onChange={(e) => onAddressChange(e.target.value)}
        disabled={loading}
        className="w-full h-10 px-3 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
      />
      <div className="flex gap-2 justify-end pt-1">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="h-9 px-3 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => void Promise.resolve(onAdd())}
          disabled={loading || !canSubmit}
          className="h-9 px-4 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
        >
          {loading ? 'Adding…' : 'Add Supplier'}
        </button>
      </div>
    </div>
  );
}

interface MiniStatProps {
  label: string;
  value: string;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  valueColor?: string;
}

function MiniStat({
  label,
  value,
  icon: Icon,
  iconColor,
  iconBg,
  valueColor = 'text-slate-800',
}: MiniStatProps) {
  return (
    <div className="flex items-center gap-2.5 sm:gap-3 p-3 sm:p-3.5 bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
      <div className={`p-2 sm:p-2.5 rounded-lg sm:rounded-xl shrink-0 ${iconBg}`}>
        <Icon size={16} strokeWidth={2.5} className={iconColor} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1 truncate">
          {label}
        </p>
        <p
          className={`text-sm sm:text-base font-extrabold tabular-nums tracking-tight leading-none truncate ${valueColor}`}
          title={value}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function MethodBadge({ method }: { method: string }) {
  const cfg = METHOD_CONFIG[method];
  if (!cfg)
    return <span className="text-xs text-slate-500 capitalize whitespace-nowrap">{method}</span>;
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded-md whitespace-nowrap ${cfg.bg} ${cfg.color}`}
    >
      <Icon size={12} />
      {cfg.label}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ProductCosts() {
  const canMutate = useCanMutate();
  const isOwner = getStoredUser()?.role === 'owner'; // Added Owner Check

  const {
    stats,
    filteredTransactions,
    addTransaction,
    deleteTransaction,
    updateTransaction,
    productCostItems,
    suppliers,
    addProductCostItem,
    addSupplier,
    renameProductCostItem,
    deleteProductCostItem,
    renameSupplier,
    deleteSupplier,
    setCustomDateRange,
    customDateRange,
  } = useERP();

  const supplierNames = useMemo(() => suppliers.map((s) => s.name), [suppliers]);
  const productItemNames = useMemo(() => productCostItems.map((i) => i.name), [productCostItems]);

  const [costDate, setCostDate] = useState(todayISO);
  const [newItemName, setNewItemName] = useState('');
  const [newSupplier, setNewSupplier] = useState('');
  const [newSupplierPhone, setNewSupplierPhone] = useState('');
  const [newSupplierAddress, setNewSupplierAddress] = useState('');
  const [newSupplierEmail, setNewSupplierEmail] = useState('');

  const [addingItem, setAddingItem] = useState(false);
  const [addingSupplier, setAddingSupplier] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [manageItemOpen, setManageItemOpen] = useState(false);
  const [manageSupplierOpen, setManageSupplierOpen] = useState(false);

  // Mobile Form Toggle State
  const [showMobileForm, setShowMobileForm] = useState(false);

  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void | Promise<void>) | null>(null);
  const [passwordModalTitle, setPasswordModalTitle] = useState('');
  const [passwordModalRole, setPasswordModalRole] = useState<'owner' | 'manager'>('owner');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Table filters
  const [historySearch, setHistorySearch] = useState('');
  const [historyMethodFilter, setHistoryMethodFilter] = useState<MethodFilterValue>('all');

  const {
    register,
    handleSubmit: handleFormSubmit,
    formState: { errors, isSubmitting },
    reset,
    control,
    setValue,
  } = useForm<ProductCostFormData>({
    resolver: zodResolver(productCostSchema),
    defaultValues: {
      item: '',
      cost: '',
      method: 'cash',
      quantity: '',
      unit: 'pcs',
      unitPrice: '',
      supplier: '',
    },
  });

  // Watch quantity and total cost to auto-calculate unit price
  const quantity = useWatch({ control, name: 'quantity' });
  const cost = useWatch({ control, name: 'cost' });

  // Auto-calculate unit price from total cost ÷ qty
  useEffect(() => {
    const qty = parseFloat(quantity || '0');
    const totalCost = parseFloat(cost || '0');
    if (!isNaN(qty) && !isNaN(totalCost) && qty > 0 && totalCost > 0) {
      setValue('unitPrice', (totalCost / qty).toFixed(2), { shouldValidate: true });
    } else {
      setValue('unitPrice', '');
    }
  }, [quantity, cost, setValue]);

  // ── Derived data ─────────────────────────────────────────────────────────

  const productExpenses = useMemo(
    () => filteredTransactions.filter((t) => t.type === 'expense_product'),
    [filteredTransactions]
  );

  const productUsageArray = useMemo(
    () => Object.entries(stats.productUsage).map(([name, data]) => ({ name, ...data })),
    [stats.productUsage]
  );

  const topItemsBySpend = useMemo(
    () => [...productUsageArray].sort((a, b) => b.cost - a.cost).slice(0, 6),
    [productUsageArray]
  );

  const productByMethod = useMemo(() => {
    const b = { cash: 0, bank: 0, bkash: 0 };
    productExpenses.forEach((t) => {
      const method = t.method ?? 'cash';
      if (method in b) b[method as keyof typeof b] += t.amount;
    });
    return b;
  }, [productExpenses]);

  const uniqueSuppliers = useMemo(
    () => new Set(productExpenses.filter((t) => t.supplier).map((t) => t.supplier)).size,
    [productExpenses]
  );

  const hasHistoryFilters = historySearch !== '' || historyMethodFilter !== 'all';

  const filteredProductExpenses = useMemo(() => {
    return productExpenses.filter((t) => {
      if (
        historySearch &&
        !t.description.toLowerCase().includes(historySearch.toLowerCase()) &&
        !(t.supplier ?? '').toLowerCase().includes(historySearch.toLowerCase())
      )
        return false;
      if (historyMethodFilter !== 'all' && t.method !== historyMethodFilter) return false;
      return true;
    });
  }, [productExpenses, historySearch, historyMethodFilter]);

  const filteredHistoryTotal = useMemo(
    () => filteredProductExpenses.reduce((s, t) => s + t.amount, 0),
    [filteredProductExpenses]
  );

  const { paginatedData: paginatedExpenses, pagination } = useClientPagination(
    filteredProductExpenses,
    { initialPageSize: 10, pageSizeOptions: [5, 10, 20] }
  );

  const { paginatedData: paginatedUsage, pagination: usagePagination } = useClientPagination(
    productUsageArray,
    { initialPageSize: 10, pageSizeOptions: [5, 10, 20] }
  );

  const exportConfig = useMemo(
    () => ({
      filenameBase: 'product_costs',
      title: 'Product Costs',
      subtitle: 'Variable inventory and ingredient purchases',
      columns: TRANSACTION_EXPORT_COLUMNS,
      sheetName: 'Product Costs',
      getData: () => filteredProductExpenses,
      summaryRows: filteredProductExpenses.length
        ? ([['TOTAL (৳)', filteredHistoryTotal]] as Array<[string, string | number]>)
        : undefined,
    }),
    [filteredProductExpenses, filteredHistoryTotal]
  );

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleSubmit = useCallback(
    async (data: ProductCostFormData) => {
      try {
        addTransaction({
          type: 'expense_product',
          category: 'Product',
          amount: Number(data.cost),
          method: data.method,
          description: data.item || 'Product Purchase',
          quantity: data.quantity ? Number(data.quantity) : undefined,
          unit: data.quantity ? data.unit : undefined,
          unitPrice: data.unitPrice ? Number(data.unitPrice) : undefined,
          supplier: data.supplier,
          date: parseLocalDate(costDate),
        });
        toast.success('Product cost added successfully!');
        reset();
        setCostDate(todayISO());

        // Auto-close form on mobile after success to show history
        if (window.innerWidth < 1024) setShowMobileForm(false);
      } catch (error) {
        handleError(error, {
          action: 'add_product_cost',
          severity: 'high',
          metadata: { item: data.item, cost: data.cost },
        });
      }
    },
    [addTransaction, reset, costDate]
  );

  const handleManagerDelete = useCallback(
    (id: string) => {
      setPasswordModalTitle('Delete Transaction');
      setPasswordModalRole('owner');
      setPendingAction(() => async () => {
        try {
          await deleteTransaction(id);
          toast.success('Transaction deleted successfully');
        } catch (error) {
          handleError(error, {
            action: 'delete_product_cost',
            severity: 'high',
            metadata: { transactionId: id },
          });
        }
      });
      setPasswordModalOpen(true);
    },
    [deleteTransaction]
  );

  const handleManagerEdit = useCallback((transaction: Transaction) => {
    setPasswordModalTitle('Edit Transaction');
    setPasswordModalRole('owner');
    setPendingAction(() => () => {
      setEditingTransaction(transaction);
      setEditModalOpen(true);
    });
    setPasswordModalOpen(true);
  }, []);

  const handleSaveEdit = useCallback(
    (updated: Transaction) => {
      try {
        updateTransaction(updated);
        toast.success('Transaction updated successfully');
      } catch (error) {
        handleError(error, {
          action: 'update_product_cost',
          severity: 'high',
          metadata: { transactionId: updated.id },
        });
      }
    },
    [updateTransaction]
  );

  const handleAddItemName = useCallback(async () => {
    const trimmed = newItemName.trim();
    if (!trimmed) {
      toast.error('Enter an item name');
      return;
    }
    setAddingItem(true);
    try {
      await addProductCostItem(trimmed);
      setValue('item', trimmed);
      setNewItemName('');
      setShowAddItem(false);
      toast.success('Item added');
    } catch (error) {
      handleError(error, {
        action: 'add_item_name',
        severity: 'medium',
        metadata: { itemName: trimmed },
      });
      toast.error('Could not save item — check you are logged in as owner/manager');
    } finally {
      setAddingItem(false);
    }
  }, [newItemName, addProductCostItem, setValue]);

  const handleAddSupplier = useCallback(async () => {
    const name = newSupplier.trim();
    const phone = newSupplierPhone.trim();
    const address = newSupplierAddress.trim();
    if (!name || !phone || !address) {
      toast.error('Name, contact, and address are required');
      return;
    }
    setAddingSupplier(true);
    try {
      await addSupplier({
        name,
        phone,
        address,
        email: newSupplierEmail.trim() || undefined,
      });
      setValue('supplier', name);
      setNewSupplier('');
      setNewSupplierPhone('');
      setNewSupplierAddress('');
      setNewSupplierEmail('');
      setShowAddSupplier(false);
      toast.success('Supplier added');
    } catch (error) {
      handleError(error, {
        action: 'add_supplier',
        severity: 'medium',
        metadata: { supplier: name },
      });
      toast.error('Could not save supplier — contact and address are required');
    } finally {
      setAddingSupplier(false);
    }
  }, [newSupplier, newSupplierPhone, newSupplierAddress, newSupplierEmail, addSupplier, setValue]);

  const handleCancelAddItem = useCallback(() => {
    setShowAddItem(false);
    setNewItemName('');
  }, []);

  const handleCancelAddSupplier = useCallback(() => {
    setShowAddSupplier(false);
    setNewSupplier('');
    setNewSupplierPhone('');
    setNewSupplierAddress('');
    setNewSupplierEmail('');
  }, []);

  const handlePasswordModalClose = useCallback(() => {
    setPasswordModalOpen(false);
    setPendingAction(null);
  }, []);

  const handlePasswordModalConfirm = useCallback(() => {
    pendingAction?.();
  }, [pendingAction]);

  const handleEditModalClose = useCallback(() => {
    setEditModalOpen(false);
    setEditingTransaction(null);
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 sm:gap-6 animate-in fade-in zoom-in-95 duration-300 pb-20 sm:pb-0">
      {/* ── Modals ── */}
      <ManagerPasswordModal
        isOpen={passwordModalOpen}
        onClose={handlePasswordModalClose}
        onConfirm={handlePasswordModalConfirm}
        title={passwordModalTitle}
        requiredRole={passwordModalRole}
      />
      <EditTransactionModal
        isOpen={editModalOpen}
        onClose={handleEditModalClose}
        transaction={editingTransaction}
        onSave={handleSaveEdit}
        itemNames={productItemNames}
        suppliers={supplierNames}
      />
      <ManageListModal
        isOpen={manageItemOpen}
        onClose={() => setManageItemOpen(false)}
        title="Manage Item Names"
        items={productItemNames}
        emptyText="No item names saved yet."
        onRename={renameProductCostItem}
        onDelete={deleteProductCostItem}
      />
      <ManageListModal
        isOpen={manageSupplierOpen}
        onClose={() => setManageSupplierOpen(false)}
        title="Manage Suppliers"
        items={supplierNames}
        emptyText="No suppliers saved yet."
        onRename={renameSupplier}
        onDelete={deleteSupplier}
      />

      {/* ── Add Form Panel (Left Col Desktop / Expandable Top Mobile) ── */}
      <div className="bg-white/90 backdrop-blur p-4 sm:p-5 lg:p-6 rounded-2xl shadow-sm border border-slate-200 h-fit lg:sticky lg:top-28 transition-all">
        {/* Panel header / Mobile Toggle */}
        <div
          className={`flex items-start justify-between gap-3 cursor-pointer lg:cursor-default ${
            showMobileForm
              ? 'mb-5 pb-5 border-b border-slate-100'
              : 'mb-0 pb-0 border-transparent lg:mb-5 lg:pb-5 lg:border-slate-100 border-b'
          }`}
          onClick={() => window.innerWidth < 1024 && setShowMobileForm(!showMobileForm)}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-orange-50 border border-orange-100 text-orange-600 shrink-0">
              <ShoppingBag size={20} className="sm:w-5 sm:h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-800 leading-tight">
                Variable Costs
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                Record ingredient &amp; packaging
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {stats.totalProductCost > 0 && (
              <div className="text-right bg-orange-50 border border-orange-100 rounded-xl px-2.5 sm:px-3 py-1.5 sm:py-2">
                <p className="hidden sm:block text-[10px] font-bold text-orange-400 uppercase tracking-widest leading-none mb-1">
                  Period
                </p>
                <p className="text-xs sm:text-sm font-extrabold text-orange-700 tabular-nums">
                  {formatCurrency(stats.totalProductCost)}
                </p>
              </div>
            )}
            {/* Mobile Toggle Caret */}
            <div className="lg:hidden p-2 rounded-lg bg-slate-50 text-slate-500 flex items-center justify-center border border-slate-100">
              {showMobileForm ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </div>
        </div>

        {/* Form Body - Hidden on Mobile unless Toggled */}
        <div
          className={`lg:block ${showMobileForm ? 'block animate-in slide-in-from-top-2 fade-in duration-200' : 'hidden'}`}
        >
          {canMutate && (
            <form onSubmit={handleFormSubmit(handleSubmit)} className="space-y-4 sm:space-y-5">
              {/* Item Name */}
              <div>
                <div className="flex justify-between items-center gap-3 mb-2">
                  <label
                    htmlFor="item"
                    className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide"
                  >
                    Item Name / Description
                  </label>
                  <div className="flex items-center gap-1.5">
                    {/* Only Owner can edit/delete stored descriptions */}
                    {isOwner && (
                      <button
                        type="button"
                        onClick={() => setManageItemOpen(true)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                        title="Manage item names"
                      >
                        <Pencil size={14} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowAddItem(!showAddItem)}
                      className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-indigo-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                    >
                      <Plus size={12} /> Add New
                    </button>
                  </div>
                </div>
                {showAddItem ? (
                  <InlineAddField
                    value={newItemName}
                    onChange={setNewItemName}
                    onAdd={handleAddItemName}
                    onCancel={handleCancelAddItem}
                    placeholder="New item name..."
                    loading={addingItem}
                  />
                ) : (
                  <>
                    <SelectWithChevron
                      id="item"
                      {...register('item')}
                      hasError={!!errors.item}
                      className="bg-slate-50"
                    >
                      <option value="">Select or type item name...</option>
                      {productCostItems.map((item) => (
                        <option key={item.id} value={item.name}>
                          {item.name}
                        </option>
                      ))}
                    </SelectWithChevron>
                    {productCostItems.length === 0 && (
                      <p className="text-[11px] text-slate-500 mt-2">
                        No item names saved yet — click "Add New".
                      </p>
                    )}
                    <FieldError message={errors.item?.message} />
                  </>
                )}
              </div>

              {/* Supplier */}
              <div>
                <div className="flex justify-between items-center gap-3 mb-2">
                  <label
                    htmlFor="supplier"
                    className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide flex items-center gap-1.5"
                  >
                    <Users size={12} /> Supplier
                  </label>
                  <div className="flex items-center gap-1.5">
                    {/* Only Owner can edit/delete stored suppliers */}
                    {isOwner && (
                      <button
                        type="button"
                        onClick={() => setManageSupplierOpen(true)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                        title="Manage suppliers"
                      >
                        <Pencil size={14} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowAddSupplier(!showAddSupplier)}
                      className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-indigo-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                    >
                      <Plus size={12} /> Add New
                    </button>
                  </div>
                </div>
                {showAddSupplier ? (
                  <InlineSupplierAdd
                    name={newSupplier}
                    phone={newSupplierPhone}
                    address={newSupplierAddress}
                    email={newSupplierEmail}
                    onNameChange={setNewSupplier}
                    onPhoneChange={setNewSupplierPhone}
                    onAddressChange={setNewSupplierAddress}
                    onEmailChange={setNewSupplierEmail}
                    onAdd={handleAddSupplier}
                    onCancel={handleCancelAddSupplier}
                    loading={addingSupplier}
                  />
                ) : (
                  <>
                    <SelectWithChevron
                      id="supplier"
                      {...register('supplier')}
                      hasError={!!errors.supplier}
                      className="bg-slate-50"
                    >
                      <option value="">Select supplier...</option>
                      {suppliers.map((sup) => (
                        <option key={sup.id} value={sup.name}>
                          {sup.name}
                        </option>
                      ))}
                    </SelectWithChevron>
                    {suppliers.length === 0 && (
                      <p className="text-[11px] text-slate-500 mt-2">
                        No suppliers saved yet — click "Add New".
                      </p>
                    )}
                    <FieldError message={errors.supplier?.message} />
                  </>
                )}
              </div>

              {/* Math / Calculation Section Grouping */}
              <div className="bg-slate-50/50 p-3.5 rounded-xl border border-slate-100 space-y-4">
                {/* Total Cost - Moved to top for intuitive entry */}
                <div>
                  <label
                    htmlFor="cost"
                    className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide mb-2 block"
                  >
                    Total Amount Paid (৳)
                  </label>
                  <input
                    id="cost"
                    step="any"
                    placeholder="0.00"
                    {...register('cost')}
                    className={`w-full h-11 px-3 sm:px-4 bg-white border ${
                      errors.cost ? 'border-red-400' : 'border-indigo-300'
                    } rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800 text-sm`}
                  />
                  <p className="text-[10px] sm:text-[11px] text-slate-500 mt-2 leading-relaxed">
                    Type the total amount on the receipt. Unit price calculates automatically.
                  </p>
                  <FieldError message={errors.cost?.message} />
                </div>

                {/* Qty / Unit / Unit Price */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="col-span-1 sm:col-span-1">
                    <label
                      htmlFor="quantity"
                      className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide mb-2 block"
                    >
                      Qty
                    </label>
                    <input
                      id="quantity"
                      step="any"
                      placeholder="0.00"
                      {...register('quantity')}
                      className={`w-full h-11 px-3 sm:px-4 bg-white border ${
                        errors.quantity ? 'border-red-400' : 'border-slate-200'
                      } rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm`}
                    />
                    <FieldError message={errors.quantity?.message} />
                  </div>
                  <div className="col-span-1 sm:col-span-1">
                    <label
                      htmlFor="unit"
                      className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide mb-2 block"
                    >
                      Unit
                    </label>
                    <SelectWithChevron id="unit" {...register('unit')} className="bg-white">
                      {UNIT_OPTIONS.map(({ value, label }) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </SelectWithChevron>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <label
                      htmlFor="unitPrice"
                      className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wide mb-2 block"
                    >
                      Unit Price (Auto)
                    </label>
                    <input
                      id="unitPrice"
                      type="number"
                      step="any"
                      placeholder="0.00"
                      readOnly
                      {...register('unitPrice')}
                      className={`w-full h-11 px-3 sm:px-4 bg-emerald-50/50 border ${
                        errors.unitPrice ? 'border-red-400' : 'border-emerald-200'
                      } rounded-xl outline-none text-emerald-700 font-bold text-sm cursor-not-allowed`}
                    />
                    <FieldError message={errors.unitPrice?.message} />
                  </div>
                </div>
              </div>

              {/* Payment Method + Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="method"
                    className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide mb-2 block"
                  >
                    Paid Via
                  </label>
                  <SelectWithChevron id="method" {...register('method')} className="bg-slate-50">
                    {PAYMENT_METHODS.map(({ value, label }) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </SelectWithChevron>
                </div>
                <div>
                  <label
                    htmlFor="cost-date"
                    className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide mb-2 block"
                  >
                    Purchase Date
                  </label>
                  <input
                    id="cost-date"
                    type="date"
                    value={costDate}
                    max={todayISO()}
                    onChange={(e) => setCostDate(e.target.value)}
                    className="w-full h-11 px-2.5 sm:px-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm cursor-pointer"
                  />
                </div>
              </div>

              <ButtonLoading
                loading={isSubmitting}
                type="submit"
                className="w-full min-h-[48px] px-4 py-3.5 text-white rounded-xl font-bold shadow-md mt-2 bg-slate-800 hover:bg-slate-900 flex items-center justify-center whitespace-nowrap transition-transform active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
              >
                Save Cost
              </ButtonLoading>
            </form>
          )}
        </div>
      </div>

      {/* ── Right Panel ──────────────────────────────────────────────────── */}
      <div className="lg:col-span-2 space-y-4 sm:space-y-5">
        {/* ── Summary Card ─────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="p-4 md:p-6 bg-gradient-to-r from-orange-50 via-white to-slate-50 border-b border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 sm:mb-5">
              <div className="flex items-center gap-3">
                <div className="p-2 sm:p-2.5 bg-orange-100 rounded-lg sm:rounded-xl text-orange-600 shadow-sm shrink-0">
                  <Package size={20} className="sm:w-5 sm:h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-800 leading-tight">
                    Variable Cost Summary
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                    Ingredient &amp; packaging spend overview
                  </p>
                </div>
              </div>
              <div className="shrink-0 bg-orange-600 text-white px-4 py-2.5 sm:py-3 rounded-xl shadow-sm sm:shadow-md sm:shadow-orange-200 w-full sm:w-auto text-center sm:text-right">
                <p className="text-[10px] sm:text-xs font-bold text-orange-200 uppercase tracking-widest leading-none mb-1">
                  Total
                </p>
                <p className="text-xl sm:text-2xl font-extrabold tabular-nums">
                  {formatCurrency(stats.totalProductCost)}
                </p>
              </div>
            </div>

            {/* Mini stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
              <MiniStat
                label="Purchases"
                value={productExpenses.length.toString()}
                icon={TrendingDown}
                iconColor="text-orange-600"
                iconBg="bg-orange-100"
              />
              <MiniStat
                label="Unique Items"
                value={productUsageArray.length.toString()}
                icon={Hash}
                iconColor="text-indigo-600"
                iconBg="bg-indigo-100"
              />
              <div className="col-span-2 sm:col-span-1">
                <MiniStat
                  label="Suppliers"
                  value={uniqueSuppliers.toString()}
                  icon={Users}
                  iconColor="text-sky-600"
                  iconBg="bg-sky-100"
                />
              </div>
            </div>
          </div>

          <div className="p-4 md:p-6 space-y-5">
            {/* Top items by spend */}
            {topItemsBySpend.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                  Top Items by Spend
                </h4>
                <div className="space-y-3">
                  {topItemsBySpend.map((item) => {
                    const pct =
                      topItemsBySpend[0]?.cost > 0
                        ? Math.round((item.cost / topItemsBySpend[0].cost) * 100)
                        : 0;
                    const sharePct =
                      stats.totalProductCost > 0
                        ? Math.round((item.cost / stats.totalProductCost) * 100)
                        : 0;
                    return (
                      <div key={item.name}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2 min-w-0 pr-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />
                            <span className="text-xs sm:text-sm font-semibold text-slate-700 truncate">
                              {item.name}
                            </span>
                            <span className="text-[9px] sm:text-[10px] text-slate-400 shrink-0 hidden sm:inline-block tabular-nums">
                              {item.qty} {item.unit}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
                            <span className="text-xs sm:text-sm font-extrabold text-orange-700 tabular-nums">
                              {formatCurrency(item.cost)}
                            </span>
                            <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 w-6 sm:w-7 text-right tabular-nums">
                              {sharePct}%
                            </span>
                          </div>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Payment method split */}
            {productExpenses.length > 0 && (
              <>
                {topItemsBySpend.length > 0 && <div className="border-t border-slate-100" />}
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                    Payment Methods
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {(
                      Object.entries(METHOD_CONFIG) as [string, (typeof METHOD_CONFIG)[string]][]
                    ).map(([key, cfg]) => {
                      const amount = productByMethod[key as keyof typeof productByMethod];
                      const pct =
                        stats.totalProductCost > 0
                          ? Math.round((amount / stats.totalProductCost) * 100)
                          : 0;
                      const Icon = cfg.icon;
                      return (
                        <div
                          key={key}
                          className={`p-3.5 sm:p-4 rounded-xl border ${cfg.border} ${cfg.bg} flex flex-col gap-2`}
                        >
                          <div className="flex items-center justify-between sm:justify-start gap-2">
                            <div className="flex items-center gap-2">
                              <Icon size={14} className={cfg.color} />
                              <span className={`text-xs font-bold ${cfg.color}`}>{cfg.label}</span>
                            </div>
                            <span className="sm:hidden text-sm font-extrabold text-slate-800 tabular-nums">
                              {formatCurrency(amount)}
                            </span>
                          </div>

                          <p className="hidden sm:block text-base font-extrabold text-slate-800 tabular-nums mt-1">
                            {formatCurrency(amount)}
                          </p>

                          <div className="flex items-center gap-2 mt-1 sm:mt-0">
                            <div className="flex-1 h-1.5 bg-white/60 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  key === 'cash'
                                    ? 'bg-emerald-400'
                                    : key === 'bank'
                                      ? 'bg-blue-400'
                                      : 'bg-pink-400'
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-bold text-slate-500 w-6 text-right tabular-nums">
                              {pct}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* Empty fallback */}
            {productUsageArray.length === 0 && (
              <div className="py-8 text-center text-slate-400 text-sm">
                No product usage recorded for this period.
              </div>
            )}
          </div>

          {/* Product usage breakdown table */}
          {productUsageArray.length > 0 && (
            <>
              <div className="border-t border-slate-100" />
              <div className="px-4 sm:px-5 md:px-6 py-3.5 bg-slate-50/50">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Full Item Breakdown
                </h4>
              </div>
              <div className="overflow-x-auto overflow-y-auto max-h-72 w-full scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
                <table className="w-full text-left min-w-[500px]">
                  <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 sm:px-5 py-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider w-1/2">
                        Item Name
                      </th>
                      <th className="px-4 py-3 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Total Qty
                      </th>
                      <th className="px-4 py-3 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Total Cost
                      </th>
                      <th className="px-4 sm:px-5 py-3 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Avg Price
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedUsage.map((item) => (
                      <tr key={item.name} className="hover:bg-orange-50/30 transition-colors">
                        <td className="px-4 sm:px-5 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 whitespace-nowrap">
                          {item.name}
                        </td>
                        <td className="px-4 py-2.5 text-right text-xs text-slate-700 font-bold whitespace-nowrap tabular-nums">
                          {item.qty}{' '}
                          <span className="text-[10px] text-slate-400 font-normal uppercase ml-0.5">
                            {item.unit}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right text-xs sm:text-sm font-extrabold text-orange-600 whitespace-nowrap tabular-nums">
                          {formatCurrency(item.cost)}
                        </td>
                        <td className="px-4 sm:px-5 py-2.5 text-right text-[11px] sm:text-xs text-slate-500 whitespace-nowrap tabular-nums">
                          {(item.cost / (item.qty || 1)).toFixed(1)} / {item.unit}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {productUsageArray.length > 0 && (
                <div className="px-4 sm:px-5 py-3 border-t border-slate-200 bg-slate-50 flex justify-center sm:justify-start">
                  <Pagination pagination={usagePagination} showPageInfo={false} />
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Cost History Log ─────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Table header */}
          <div className="px-4 md:px-6 py-4 bg-slate-50/60 border-b border-slate-200">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="font-bold text-slate-700 text-sm">Cost History Log</h3>
                <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                  Detailed purchase records
                </p>
              </div>
              <div className="w-full sm:w-auto">
                <RangeCalendar
                  value={customDateRange}
                  onRangeChange={setCustomDateRange}
                  align="right"
                />
              </div>
            </div>

            {/* Filter bar - Refactored for Mobile */}
            <div className="flex flex-col space-y-3">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                {/* Search */}
                <div className="relative w-full sm:max-w-xs">
                  <Search
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  />
                  <input
                    type="text"
                    placeholder="Search item or supplier…"
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    className="w-full pl-9 pr-9 py-2.5 sm:py-2 text-xs sm:text-sm rounded-xl border border-slate-200 bg-white text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-300 transition-colors"
                  />
                  {historySearch && (
                    <button
                      type="button"
                      onClick={() => setHistorySearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-200"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Actions (Clear + Export) */}
                <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                  {hasHistoryFilters && (
                    <button
                      type="button"
                      onClick={() => {
                        setHistorySearch('');
                        setHistoryMethodFilter('all');
                      }}
                      className="text-[11px] sm:text-xs font-semibold text-slate-500 hover:text-slate-700 underline underline-offset-2 transition-colors"
                    >
                      Clear filters
                    </button>
                  )}
                  <div className="shrink-0">
                    <ExportDropdown
                      config={exportConfig}
                      disabled={filteredProductExpenses.length === 0}
                    />
                  </div>
                </div>
              </div>

              {/* Method filter pills (Horizontal Scroll) */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 -mx-4 px-4 sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {(['all', 'cash', 'bank', 'bkash'] as const).map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setHistoryMethodFilter(val)}
                    className={`px-3 sm:px-2.5 py-1.5 sm:py-1 text-[11px] font-bold rounded-md transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 ${
                      historyMethodFilter === val
                        ? 'bg-slate-800 text-white shadow-sm'
                        : 'bg-white border border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {val === 'all'
                      ? 'All Methods'
                      : val === 'bkash'
                        ? 'bKash'
                        : val.charAt(0).toUpperCase() + val.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {hasHistoryFilters && (
              <p className="text-[11px] text-slate-500 mt-3 pt-3 border-t border-slate-200/60">
                Showing{' '}
                <span className="font-bold text-slate-700 tabular-nums">
                  {filteredProductExpenses.length}
                </span>{' '}
                of{' '}
                <span className="font-bold text-slate-700 tabular-nums">
                  {productExpenses.length}
                </span>{' '}
                records
              </p>
            )}
          </div>

          {/* Table */}
          <div className="overflow-x-auto overflow-y-auto max-h-[600px] w-full scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100 hover:scrollbar-thumb-slate-400">
            <table className="w-full text-left min-w-[750px]">
              <thead className="bg-slate-50 border-b-2 border-slate-200 sticky top-0 z-10">
                <tr>
                  <th className="px-4 sm:px-5 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider w-[13%]">
                    Date
                  </th>
                  <th className="px-4 sm:px-5 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider w-[22%]">
                    Item
                  </th>
                  <th className="px-4 sm:px-5 py-3.5 text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider w-[11%]">
                    Qty
                  </th>
                  <th className="px-4 sm:px-5 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider w-[16%]">
                    Supplier
                  </th>
                  <th className="px-4 sm:px-5 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider w-[13%]">
                    Via
                  </th>
                  <th className="px-4 sm:px-5 py-3.5 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider w-[13%]">
                    Cost
                  </th>
                  {/* Actions Header only renders for Owners */}
                  {isOwner && (
                    <th className="px-4 sm:px-5 py-3.5 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider w-[12%]">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedExpenses.length > 0 ? (
                  paginatedExpenses.map((t) => (
                    <tr key={t.id} className="hover:bg-orange-50/40 transition-colors group">
                      <td className="px-4 sm:px-5 py-3 sm:py-3.5 text-xs font-medium text-slate-600 whitespace-nowrap tabular-nums">
                        {formatDate(t.date)}
                      </td>
                      <td className="px-4 sm:px-5 py-3 sm:py-3.5 max-w-[180px]">
                        <span className="text-xs sm:text-sm font-semibold text-slate-700 block truncate">
                          {t.description}
                        </span>
                      </td>
                      <td className="px-4 sm:px-5 py-3 sm:py-3.5 text-center">
                        {t.quantity ? (
                          <span className="text-xs font-bold text-slate-700 whitespace-nowrap tabular-nums">
                            {t.quantity}{' '}
                            <span className="text-[10px] text-slate-400 font-normal uppercase">
                              {t.unit}
                            </span>
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-4 sm:px-5 py-3 sm:py-3.5">
                        {t.supplier ? (
                          <span className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-md px-2 py-0.5 text-[11px] font-medium text-slate-600 whitespace-nowrap">
                            {t.supplier}
                          </span>
                        ) : (
                          <span className="text-slate-300 text-sm">—</span>
                        )}
                      </td>
                      <td className="px-4 sm:px-5 py-3 sm:py-3.5">
                        <MethodBadge method={t.method ?? 'cash'} />
                      </td>
                      <td className="px-4 sm:px-5 py-3 sm:py-3.5 text-right">
                        <span className="text-sm font-extrabold text-orange-600 tabular-nums whitespace-nowrap">
                          -{formatCurrency(t.amount)}
                        </span>
                      </td>
                      {/* Edit/Delete Actions only render for Owners */}
                      {isOwner && (
                        <td className="px-4 sm:px-5 py-3 sm:py-3.5 text-right">
                          <div className="flex gap-1.5 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity justify-end">
                            <button
                              onClick={() => handleManagerEdit(t)}
                              className="p-2 sm:p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 bg-slate-50 lg:bg-transparent rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                              title="Edit (Owner Only)"
                              aria-label={`Edit transaction: ${t.description}`}
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => handleManagerDelete(t.id)}
                              className="p-2 sm:p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 bg-slate-50 lg:bg-transparent rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                              title="Delete (Owner Only)"
                              aria-label={`Delete transaction: ${t.description}`}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr>
                    {/* Shift colSpan dynamically based on role */}
                    <td colSpan={isOwner ? 7 : 6} className="px-4 py-16 sm:py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <Package size={28} className="text-slate-300" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-600">No records found</p>
                          <p className="text-xs text-slate-400 mt-1 max-w-[200px] mx-auto leading-relaxed">
                            {hasHistoryFilters
                              ? 'Try adjusting your filters'
                              : 'No cost records for the selected period'}
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          {filteredProductExpenses.length > 0 && (
            <div className="px-4 sm:px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex flex-col md:flex-row items-center justify-between gap-4">
              <p className="text-xs text-slate-500 w-full text-center md:text-left">
                <span className="font-bold text-slate-700 tabular-nums">
                  {filteredProductExpenses.length}
                </span>{' '}
                record{filteredProductExpenses.length !== 1 ? 's' : ''} ·{' '}
                <span className="font-bold text-orange-600 whitespace-nowrap tabular-nums">
                  {formatCurrency(filteredHistoryTotal)}
                </span>{' '}
                total
              </p>
              <div className="w-full md:w-auto">
                <Pagination pagination={pagination} showPageInfo={false} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
