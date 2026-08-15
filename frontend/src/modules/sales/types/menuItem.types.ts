export type MenuCategory =
  | 'Add On'
  | 'Affogato'
  | 'Chicken'
  | 'Coffee'
  | 'Iced Coffee'
  | 'Milk Tea'
  | 'Mocktails'
  | 'Pasta'
  | 'Shakes'
  | 'Sides'
  | 'Waffle Menu';

export const ALL_CATEGORIES: MenuCategory[] = [
  'Add On',
  'Affogato',
  'Chicken',
  'Coffee',
  'Iced Coffee',
  'Milk Tea',
  'Mocktails',
  'Pasta',
  'Shakes',
  'Sides',
  'Waffle Menu',
];

export const CATEGORY_STYLES: Record<MenuCategory, { dot: string; text: string; badge: string }> = {
  Coffee: { dot: 'bg-amber-800', text: 'text-amber-800', badge: 'bg-amber-100 text-amber-800' },
  Mocktails: { dot: 'bg-blue-500', text: 'text-blue-600', badge: 'bg-blue-100 text-blue-700' },
  'Waffle Menu': {
    dot: 'bg-orange-500',
    text: 'text-orange-600',
    badge: 'bg-orange-100 text-orange-700',
  },
  Affogato: { dot: 'bg-slate-700', text: 'text-slate-700', badge: 'bg-slate-100 text-slate-700' },
  Chicken: { dot: 'bg-red-500', text: 'text-red-600', badge: 'bg-red-100 text-red-700' },
  'Milk Tea': {
    dot: 'bg-orange-400',
    text: 'text-orange-500',
    badge: 'bg-orange-50 text-orange-600',
  },
  Shakes: { dot: 'bg-purple-500', text: 'text-purple-600', badge: 'bg-purple-100 text-purple-700' },
  Pasta: { dot: 'bg-yellow-600', text: 'text-yellow-700', badge: 'bg-yellow-100 text-yellow-800' },
  'Add On': { dot: 'bg-gray-400', text: 'text-gray-500', badge: 'bg-gray-100 text-gray-600' },
  'Iced Coffee': { dot: 'bg-cyan-600', text: 'text-cyan-700', badge: 'bg-cyan-100 text-cyan-800' },
  Sides: { dot: 'bg-green-600', text: 'text-green-700', badge: 'bg-green-100 text-green-800' },
};

/** Virtual filter for Item List — not a menu category stored on items. */
export type ItemListFilter = MenuCategory | 'All' | 'Unavailable';

export const UNAVAILABLE_FILTER_STYLE = {
  dot: 'bg-red-500',
  text: 'text-red-600',
  badge: 'bg-red-100 text-red-700 border border-red-200',
} as const;

export interface MenuItem {
  id: string;
  name: string;
  category: MenuCategory;
  price: number;
  available: boolean;
  description?: string;
}

export interface OrderItem {
  menuItem: MenuItem;
  quantity: number;
  notes?: string;
  /** Complimentary — price charged as 0, still shown on tickets/receipts. */
  isGift?: boolean;
  giftReason?: string;
  /** Add-ons / Extras attached to this specific item. */
  addons?: MenuItem[];
}

export const TABLE_OPTIONS = [
  '— None —',
  'Table 1',
  'Table 2',
  'Table 3',
  'Bar Stool',
  'Couple Table',
] as const;

export type TableOption = (typeof TABLE_OPTIONS)[number];

export type DiscountType = 'flat' | 'percent';

export interface NewOrderData {
  id: string;
  orderNumber: string;
  items: OrderItem[];
  customerName: string;
  tableNumber: string;
  paymentMethod: 'cash' | 'bank' | 'bkash';
  channel: 'in_store' | 'takeaway' | 'delivery';
  subtotal: number;
  discount: number;
  /** How the discount was entered (flat amount vs percentage). */
  discountType?: DiscountType;
  /** Raw discount input value (amount for flat, percent for percentage). */
  discountValue?: number;
  /** Tax / VAT amount applied (0 when not applicable). */
  tax?: number;
  total: number;
  customerPaid: number;
  changeAmount: number;
  createdAt: string;
  cashierName: string;
  /** Gift stats (for reporting). */
  giftItemCount?: number;
  giftTotalValue?: number;
}
