import { useEffect, useMemo, useRef } from 'react';
import { ArrowLeftRight } from 'lucide-react';
import type { PaymentMethod } from '@/core/types';

const PAYMENT_LABELS: Record<string, string> = {
  cash: 'Cash',
  bank: 'Card / Bank',
  bkash: 'bKash',
};

const QUICK_DENOMS = [200, 500, 1000] as const;

function isCashMethod(method: PaymentMethod): boolean {
  return method === 'cash';
}

export interface PaymentPanelProps {
  billTotal: number;
  paymentMethod: PaymentMethod;
  customerPaidStr: string;
  onPaidChange: (value: string) => void;
  channelLabel?: string;
  discountAmount?: number;
}

export function PaymentPanel({
  billTotal,
  paymentMethod,
  customerPaidStr,
  onPaidChange,
  channelLabel,
  discountAmount,
}: PaymentPanelProps) {
  const isCash = isCashMethod(paymentMethod);
  const inputRef = useRef<HTMLInputElement>(null);
  const paid = parseFloat(customerPaidStr) || 0;
  const change = Math.max(0, paid - billTotal);
  const insufficient = isCash && paid > 0 && paid < billTotal;
  const billRounded = Math.round(billTotal);

  const quickButtons = useMemo(() => {
    const buttons: { key: string; label: string; value: number }[] = [
      { key: 'all', label: 'All', value: billRounded },
      { key: 'exact', label: String(billRounded), value: billRounded },
    ];
    for (const denom of QUICK_DENOMS) {
      buttons.push({ key: String(denom), label: String(denom), value: denom });
    }
    return buttons;
  }, [billRounded]);

  useEffect(() => {
    if (!isCash) {
      const exact = String(billRounded);
      if (customerPaidStr !== exact) onPaidChange(exact);
    }
  }, [isCash, billRounded, customerPaidStr, onPaidChange]);

  // Cash: focus + select the field on mount so the cashier can type immediately.
  useEffect(() => {
    if (!isCash) return;
    const id = window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 50);
    return () => window.clearTimeout(id);
  }, [isCash]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 p-5 text-white text-center shadow-lg">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-300 mb-1">
          Total Bill
        </p>
        <p className="text-4xl font-black tracking-tight tabular-nums">৳{billRounded}</p>
        {discountAmount != null && discountAmount > 0 && (
          <p className="text-xs text-slate-300 mt-1">Includes ৳{discountAmount} discount</p>
        )}
        <p className="text-xs text-slate-400 mt-2 font-medium">
          {PAYMENT_LABELS[paymentMethod]}
          {channelLabel ? ` · ${channelLabel}` : ''}
        </p>
      </div>

      {isCash && (
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 mb-2">
            Quick Amount
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
            {quickButtons.map(({ key, label, value }) => {
              const active = paid === value;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onPaidChange(String(value))}
                  className={`py-2.5 rounded-xl text-xs font-bold border transition-all tabular-nums ${
                    active
                      ? 'bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-200/50'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-emerald-300 hover:bg-emerald-50'
                  }`}
                >
                  {key === 'all' ? 'All' : `৳${label}`}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <label className="block text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 mb-1.5">
          Customer Paid
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-slate-400">
            ৳
          </span>
          <input
            ref={inputRef}
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            autoFocus={isCash}
            readOnly={!isCash}
            value={customerPaidStr}
            onChange={(e) => isCash && onPaidChange(e.target.value)}
            placeholder="0"
            className={`w-full pl-10 pr-4 py-3.5 rounded-xl border text-xl font-bold outline-none transition-colors tabular-nums ${
              !isCash
                ? 'border-slate-200 bg-slate-100 text-slate-600 cursor-not-allowed'
                : insufficient
                  ? 'border-red-300 bg-red-50 text-red-700 focus:ring-2 focus:ring-red-100'
                  : paid >= billTotal
                    ? 'border-red-300 bg-emerald-50 text-red-800 focus:ring-2 focus:ring-emerald-100'
                    : 'border-slate-200 bg-white focus:border-red-400 focus:ring-2 focus:ring-emerald-100'
            }`}
          />
        </div>
        {isCash && insufficient && (
          <p className="text-xs text-red-500 mt-1.5 font-medium tabular-nums">
            Short by ৳{Math.ceil(billTotal - paid)}
          </p>
        )}
        {!isCash && (
          <p className="text-xs text-slate-500 mt-1.5">
            Exact bill amount for {PAYMENT_LABELS[paymentMethod]} payments
          </p>
        )}
      </div>

      {isCash && paid >= billTotal && paid > 0 && (
        <div
          className={`rounded-2xl p-4 flex items-center gap-3 ${
            change === 0
              ? 'bg-emerald-50 border border-emerald-200'
              : 'bg-sky-50 border border-sky-200'
          }`}
        >
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
              change === 0 ? 'bg-emerald-100' : 'bg-sky-100'
            }`}
          >
            <ArrowLeftRight
              size={20}
              className={change === 0 ? 'text-emerald-600' : 'text-sky-600'}
            />
          </div>
          <div>
            <p
              className={`text-[10px] font-bold uppercase tracking-wide ${
                change === 0 ? 'text-emerald-600' : 'text-sky-600'
              }`}
            >
              {change === 0 ? 'Exact Payment' : 'Change to Return'}
            </p>
            <p
              className={`text-2xl font-black leading-none tabular-nums ${
                change === 0 ? 'text-emerald-700' : 'text-sky-700'
              }`}
            >
              {change === 0 ? 'No Change' : `৳${change}`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export { PAYMENT_LABELS as PAYMENT_METHOD_LABELS };
