// API Configuration Constants
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_URL,
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
};

// Date Format Constants
export const DATE_FORMATS = {
  DISPLAY: 'MMM DD, YYYY',
  API: 'YYYY-MM-DD',
  DATETIME: 'MMM DD, YYYY HH:mm',
};

// Payment Methods
export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank', label: 'Bank' },
  { value: 'bkash', label: 'bKash' },
] as const;

// Sales Channels
export const SALES_CHANNELS = [
  { value: 'in_store', label: 'In Store' },
  { value: 'foodpanda', label: 'Foodpanda' },
  { value: 'foodi', label: 'Foodi' },
] as const;

// Expense Categories
export const EXPENSE_CATEGORIES = {
  PRODUCT: ['Vegetables', 'Fruits', 'Dairy', 'Meat', 'Spices', 'Beverages', 'Packaging', 'Other'],
  FIXED: ['Rent', 'Salary', 'Utilities', 'Insurance', 'Maintenance', 'Other'],
};

// Unit Types
export const UNIT_TYPES = [
  { value: 'kg', label: 'KG' },
  { value: 'g', label: 'Gram' },
  { value: 'L', label: 'Liter' },
  { value: 'ml', label: 'ML' },
  { value: 'pcs', label: 'Pieces' },
  { value: 'box', label: 'Box' },
  { value: 'pack', label: 'Pack' },
] as const;

// Date Range Presets
export const DATE_RANGES = {
  TODAY: 'today',
  WEEK: 'week',
  MONTH: 'month',
  PREV_MONTH: 'prev_month',
  CUSTOM: 'custom',
  ALL: 'all',
} as const;

// Transaction Types
export const TRANSACTION_TYPES = {
  SALE: 'sale',
  SALE_ADJUSTMENT: 'sale_adjustment',
  EXPENSE_PRODUCT: 'expense_product',
  EXPENSE_FIXED: 'expense_fixed',
} as const;

// Currency
export const CURRENCY = '৳';

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  ORDER_HISTORY_PAGE_SIZE: 6,
  PAGE_SIZE_OPTIONS: [6, 10, 15, 25, 50],
  ORDER_HISTORY_PAGE_SIZE_OPTIONS: [6, 10, 15, 25, 50],
};

// Local Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'authToken',
  USER: 'user',
  THEME: 'theme',
  ERP_STATE: 'erp_state_v1',
  DATE_RANGE: 'dateRange',
  /** Last ERP business day seen — used to reset stale date filters at midnight Dhaka. */
  ERP_BUSINESS_DAY: 'erp_business_day_v1',
  /** Local POS hub: offline queue + integration audit log + sync failures */
  POS_SYNC_HUB: 'pos_sync_hub_v1',
  /** Ingredient ledger + par levels — separate key from core ERP transactions */
  INVENTORY_STOCK: 'inventory_stock_v1',
};
