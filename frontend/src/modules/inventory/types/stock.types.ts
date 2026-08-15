import type { UnitType } from '@/core/types';

export type StockMovementType = 'purchase' | 'pos_deduction' | 'wastage' | 'adjustment';

export interface StockItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: UnitType;
  parLevel: number;
  /** Last known unit valuation (BDT) for shelf-value estimates */
  unitCostBdt: number;
}

export interface StockMovement {
  id: string;
  itemId: string;
  type: StockMovementType;
  /** Positive adds stock; negative consumes */
  qtySigned: number;
  note?: string;
  summary?: string;
  createdAtISO: string;
}

/** Optional batch layer for expiry — quantities may sum to ≤ ledger qty on hand */
export interface StockLot {
  id: string;
  itemId: string;
  qty: number;
  /** yyyy-mm-dd; null = ambient / unknown expiry */
  expiryDate: string | null;
}

export interface InventoryPersistedState {
  items: StockItem[];
  movements: StockMovement[];
  lots: StockLot[];
}

export type StockHealthStatus = 'healthy' | 'low' | 'critical' | 'out';
