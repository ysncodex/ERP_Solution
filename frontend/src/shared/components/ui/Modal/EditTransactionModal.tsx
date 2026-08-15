import { useState, useCallback, useMemo } from 'react';
import { Pencil, X } from 'lucide-react';
import type { EditTransactionModalProps } from './Modal.types';
import type {
  Transaction,
  UnitType,
  PaymentMethod,
  SalesChannel,
  ReceiptStatus,
} from '@/core/types';
import { TABLE_OPTIONS } from '@/modules/sales/types/menuItem.types';
import { NO_TABLE } from '@/modules/sales/utils/orderUtils';

type SaleEditState = Partial<Transaction> & {
  subtotal?: number;
  tax?: number;
  discountType?: 'flat' | 'percent';
  discountValue?: number;
  customerPaid?: number;
  changeAmount?: number;
  receiptStatus?: ReceiptStatus;
  posChannel?: 'in_store' | 'takeaway' | 'delivery';
  orderNumber?: string;
  tableNumber?: string;
  cashier?: string;
};

function buildInitialEditState(transaction: Transaction): SaleEditState {
  const baseState: SaleEditState = { ...transaction };
  if (transaction.type === 'sale') {
    baseState.orderNumber = transaction.orderNumber ?? '';
    baseState.receiptStatus = transaction.receiptStatus ?? 'completed';
    baseState.posChannel = transaction.posChannel ?? 'in_store';
    baseState.customerName = transaction.customerName ?? '';
    baseState.tableNumber = transaction.tableNumber || NO_TABLE;
    baseState.cashier = transaction.cashier ?? '';
    baseState.subtotal = transaction.subtotal ?? transaction.amount;
    baseState.tax = transaction.tax ?? 0;
    baseState.discountType = transaction.discountType ?? 'flat';
    baseState.discountValue =
      transaction.discountValue ?? transaction.discountAmount ?? 0;
    baseState.customerPaid =
      transaction.customerPaid ?? (transaction.receiptStatus === 'pending' ? 0 : transaction.amount);
    baseState.changeAmount = transaction.changeAmount ?? 0;
  }
  return baseState;
}

function isCashMethod(method?: PaymentMethod): boolean {
  return !method || method === 'cash';
}

function EditTransactionModalContent({
  onClose,
  transaction,
  onSave,
  itemNames,
  suppliers,
}: Omit<EditTransactionModalProps, 'isOpen'> & { transaction: Transaction }) {
  const [editData, setEditData] = useState<SaleEditState>(() => buildInitialEditState(transaction));

  const update = useCallback((field: string, value: unknown) => {
    setEditData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const paymentMethodValue = (editData.method ?? 'cash') as PaymentMethod;
  const isCash = isCashMethod(paymentMethodValue);
  const billAmount = Number(editData.amount ?? 0);

  const handlePaymentMethodChange = useCallback(
    (method: PaymentMethod) => {
      setEditData((prev) => {
        const amount = Number(prev.amount ?? 0);
        if (method === 'cash') {
          return { ...prev, method };
        }
        return {
          ...prev,
          method,
          customerPaid: amount,
          changeAmount: 0,
        };
      });
    },
    [],
  );

  const handleSave = useCallback(() => {
    const amount = Number(editData.amount ?? 0);
    const method = (editData.method ?? 'cash') as PaymentMethod;
    const payload: SaleEditState = { ...editData };

    if (method !== 'cash') {
      payload.customerPaid = amount;
      payload.changeAmount = 0;
    } else if (payload.customerPaid != null && payload.changeAmount == null) {
      payload.changeAmount = Math.max(0, payload.customerPaid - amount);
    }

    if (payload.tableNumber === NO_TABLE) {
      payload.tableNumber = '';
    }

    onSave({ ...transaction, ...payload } as Transaction);
    onClose();
  }, [transaction, editData, onSave, onClose]);

  const isSale = transaction.type === 'sale';
  const isAmountValid = billAmount > 0;
  const salesChannelValue = (editData.channel ?? 'in_store') as SalesChannel;
  const posChannelValue = (editData.posChannel ?? 'in_store') as SaleEditState['posChannel'];
  const receiptStatusValue = (editData.receiptStatus ?? 'completed') as ReceiptStatus;
  const showTableSelect = posChannelValue === 'in_store';

  const receiptLineTotal = useMemo(() => {
    if (!editData.receiptLines?.length) return 0;
    return editData.receiptLines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
  }, [editData.receiptLines]);

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full max-w-2xl p-4 sm:p-6 animate-in zoom-in-95 duration-200 max-h-[92dvh] sm:max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 p-3 rounded-xl text-indigo-600">
              <Pencil size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">
                Edit {isSale ? 'Order' : 'Transaction'}
              </h3>
              <p className="text-xs text-slate-500">
                {isSale && editData.orderNumber
                  ? `Order ${editData.orderNumber}`
                  : 'Update details and save securely.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5">
          {isSale && editData.receiptLines && editData.receiptLines.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500 mb-3">
                Order Items ({editData.receiptLines.length})
              </p>
              <ul className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                {editData.receiptLines.map((line, i) => (
                  <li
                    key={`${line.name}-${i}`}
                    className="flex items-center justify-between gap-2 text-sm bg-white rounded-lg px-3 py-2 border border-slate-100"
                  >
                    <div className="min-w-0">
                      <span className="font-semibold text-slate-800 truncate block">
                        {line.name}
                        {line.isGift && (
                          <span className="ml-1.5 text-[10px] font-bold text-emerald-600 uppercase">
                            Gift
                          </span>
                        )}
                      </span>
                      <span className="text-xs text-slate-500">
                        {line.qty} × ৳{line.unitPrice}
                      </span>
                    </div>
                    <span className="font-bold text-slate-800 tabular-nums shrink-0">
                      {line.isGift ? 'FREE' : `৳${line.qty * line.unitPrice}`}
                    </span>
                  </li>
                ))}
              </ul>
              {receiptLineTotal > 0 && (
                <p className="text-xs text-slate-500 mt-2 text-right tabular-nums">
                  Lines subtotal: ৳{receiptLineTotal}
                </p>
              )}
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500 mb-3">
              Core details
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                  Total Amount (৳)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editData.amount ?? ''}
                  onChange={(e) => {
                    const amount = Number(e.target.value);
                    setEditData((prev) => {
                      const method = (prev.method ?? 'cash') as PaymentMethod;
                      if (method !== 'cash') {
                        return { ...prev, amount, customerPaid: amount, changeAmount: 0 };
                      }
                      return { ...prev, amount };
                    });
                  }}
                  className="w-full p-3 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {!isAmountValid && editData.amount !== undefined && (
                  <p className="text-xs text-rose-500 mt-1">Amount must be greater than zero</p>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                  Description
                </label>
                <input
                  type="text"
                  list="edit-items"
                  value={editData.description ?? ''}
                  onChange={(e) => update('description', e.target.value)}
                  className="w-full p-3 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <datalist id="edit-items">
                  {itemNames.map((item) => (
                    <option key={item} value={item} />
                  ))}
                </datalist>
              </div>
            </div>
          </div>

          {isSale ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">
                Sales / payment info
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                    Receipt Status
                  </label>
                  <select
                    value={receiptStatusValue}
                    onChange={(e) => update('receiptStatus', e.target.value as ReceiptStatus)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="completed">Completed</option>
                    <option value="refunded">Refunded</option>
                    <option value="voided">Voided</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                    Order Number
                  </label>
                  <input
                    type="text"
                    value={editData.orderNumber ?? ''}
                    onChange={(e) => update('orderNumber', e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethodValue}
                    onChange={(e) =>
                      handlePaymentMethodChange(e.target.value as PaymentMethod)
                    }
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="cash">Cash</option>
                    <option value="bank">Card / Bank</option>
                    <option value="bkash">bKash</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                    Sales Channel
                  </label>
                  <select
                    value={salesChannelValue}
                    onChange={(e) => update('channel', e.target.value as SalesChannel)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="in_store">In-Store</option>
                    <option value="foodpanda">Foodpanda</option>
                    <option value="foodi">Foodi</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                    POS Channel
                  </label>
                  <select
                    value={posChannelValue ?? 'in_store'}
                    onChange={(e) =>
                      update('posChannel', e.target.value as SaleEditState['posChannel'])
                    }
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="in_store">Dine In</option>
                    <option value="takeaway">Takeaway</option>
                    <option value="delivery">Delivery</option>
                  </select>
                </div>
                {isCash ? (
                  <>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                        Customer Paid (৳)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editData.customerPaid ?? ''}
                        onChange={(e) => {
                          const paid = Number(e.target.value);
                          update('customerPaid', paid);
                          update('changeAmount', Math.max(0, paid - billAmount));
                        }}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                        Change Amount (৳)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        readOnly
                        value={editData.changeAmount ?? Math.max(0, (editData.customerPaid ?? 0) - billAmount)}
                        className="w-full p-3 bg-slate-100 border border-slate-200 rounded-lg text-slate-600 cursor-not-allowed"
                      />
                    </div>
                  </>
                ) : (
                  <div className="md:col-span-2 rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5 text-xs text-slate-600">
                    Card and bKash payments use the exact bill amount — no cash change applies.
                  </div>
                )}
              </div>
            </div>
          ) : null}

          <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">
              Customer & billing details
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {isSale ? (
                <>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                      Customer Name
                    </label>
                    <input
                      type="text"
                      value={editData.customerName ?? ''}
                      onChange={(e) => update('customerName', e.target.value)}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  {showTableSelect ? (
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                        Table Number
                      </label>
                      <select
                        value={editData.tableNumber ?? NO_TABLE}
                        onChange={(e) => update('tableNumber', e.target.value)}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        {TABLE_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                        Table Number
                      </label>
                      <input
                        type="text"
                        value="N/A (not dine-in)"
                        readOnly
                        className="w-full p-3 bg-slate-100 border border-slate-200 rounded-lg text-slate-500 cursor-not-allowed"
                      />
                    </div>
                  )}
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                      Cashier
                    </label>
                    <input
                      type="text"
                      value={editData.cashier ?? ''}
                      onChange={(e) => update('cashier', e.target.value)}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </>
              ) : null}

              {transaction?.type === 'expense_product' ? (
                <>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                      Supplier
                    </label>
                    <input
                      type="text"
                      list="edit-suppliers"
                      value={editData.supplier ?? ''}
                      onChange={(e) => update('supplier', e.target.value)}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <datalist id="edit-suppliers">
                      {suppliers.map((sup) => (
                        <option key={sup} value={sup} />
                      ))}
                    </datalist>
                  </div>
                  <div className="grid grid-cols-2 gap-3 md:col-span-2">
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                        Quantity
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editData.quantity ?? ''}
                        onChange={(e) => update('quantity', Number(e.target.value))}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                        Unit
                      </label>
                      <select
                        value={editData.unit ?? 'pcs'}
                        onChange={(e) => update('unit', e.target.value as UnitType)}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="pcs">Pcs</option>
                        <option value="kg">Kg</option>
                        <option value="g">g</option>
                        <option value="L">L</option>
                        <option value="ml">ml</option>
                        <option value="box">Box</option>
                        <option value="pack">Pack</option>
                      </select>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </div>

          {isSale ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">
                Pricing controls
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                    Subtotal (৳)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editData.subtotal ?? ''}
                    onChange={(e) => update('subtotal', Number(e.target.value))}
                    className="w-full p-3 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                    Tax / VAT (৳)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editData.tax ?? ''}
                    onChange={(e) => update('tax', Number(e.target.value))}
                    className="w-full p-3 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                    Discount Type
                  </label>
                  <select
                    value={editData.discountType ?? 'flat'}
                    onChange={(e) => update('discountType', e.target.value as 'flat' | 'percent')}
                    className="w-full p-3 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="flat">Flat amount</option>
                    <option value="percent">Percentage</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">
                    Discount Value
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editData.discountValue ?? ''}
                    onChange={(e) => update('discountValue', Number(e.target.value))}
                    className="w-full p-3 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
          ) : null}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!isAmountValid}
              className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function EditTransactionModal(props: EditTransactionModalProps) {
  const { isOpen, transaction, ...restProps } = props;

  if (!isOpen || !transaction) return null;

  return (
    <EditTransactionModalContent
      key={`${transaction.id ?? 'transaction'}-${transaction.type}-${String(transaction.customerPaid)}`}
      transaction={transaction}
      {...restProps}
    />
  );
}
