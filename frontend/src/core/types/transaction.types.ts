/**
 * Transaction Type Definitions
 * Core types for all transaction-related operations
 */

export type TransactionType =
  | 'sale'
  | 'sale_adjustment'
  | 'expense_product'
  | 'expense_fixed';
export type PaymentMethod = 'cash' | 'bank' | 'bkash';
export type SalesChannel = 'in_store' | 'foodpanda' | 'foodi';
export type UnitType = 'kg' | 'g' | 'L' | 'ml' | 'pcs' | 'box' | 'pack';

/** Till / POS receipt lifecycle (sale rows only). */
export type ReceiptStatus = 'pending' | 'completed' | 'refunded' | 'voided';

export interface ReceiptLine {
  name: string;
  qty: number;
  unitPrice: number;
  menuItemId?: string;
  /** Complimentary item — charged at 0 but tracked for reporting. */
  isGift?: boolean;
  giftReason?: string;
  /** Original unit price before gift (for gift-value reporting). */
  originalUnitPrice?: number;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  method?: PaymentMethod;
  /** Expense/product grouping label when provided by API or forms */
  category?: string;
  channel?: SalesChannel;
  description: string;
  quantity?: number;
  unit?: UnitType;
  unitPrice?: number;
  supplier?: string;
  date: Date;
  /** Row insert time from the API — used for legacy sort/receipt when date was UTC-noon. */
  createdAt?: Date;
  /** Staff member named on the printed receipt. */
  cashier?: string;
  /** Loyalty / walk-in customer label for the register. */
  customerName?: string;
  loyaltyMemberId?: string;
  /** Optional multi-line breakdown for thermal receipt itemization. */
  receiptLines?: ReceiptLine[];
  /** Bill-level discount in same currency as amount (before VAT in receipt math). */
  discountAmount?: number;
  /** VAT rate for receipt display; defaults to 5% in UI when omitted. */
  vatRatePercent?: number;
  /** Set when a refund or void is posted against this sale. */
  receiptStatus?: ReceiptStatus;
  /** POS order number (e.g. BB-20260627-1234). */
  orderNumber?: string;
  /** Table label for dine-in orders. */
  tableNumber?: string;
  /** POS channel before ERP mapping (takeaway / delivery / dine-in). */
  posChannel?: 'in_store' | 'takeaway' | 'delivery';
  /** Gift / complimentary item stats for management reports. */
  giftItemCount?: number;
  giftTotalValue?: number;
  /** From linked POS order (when present). */
  subtotal?: number;
  tax?: number;
  customerPaid?: number;
  changeAmount?: number;
  discountType?: 'flat' | 'percent';
  discountValue?: number;
}

export type TransactionFormData = Omit<Transaction, 'id' | 'date'>;

/** Legacy fund-management types stripped on load — not part of the active ERP model. */
export const LEGACY_FUND_TRANSACTION_TYPES = [
  'fund_in',
  'fund_out',
  'cash_to_fund',
  'cash_added',
  'fund_to_cash',
] as const;

export function isActiveTransactionType(type: string): type is TransactionType {
  return type === 'sale'
    || type === 'sale_adjustment'
    || type === 'expense_product'
    || type === 'expense_fixed';
}

/** Sale counted in revenue / cash balances (excludes pending & voided). */
export function isPaidSale(t: Transaction): boolean {
  if (t.type !== 'sale') return false;
  const status = t.receiptStatus ?? 'completed';
  return status === 'completed';
}
