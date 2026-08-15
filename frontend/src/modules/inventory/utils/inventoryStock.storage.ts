import { STORAGE_KEYS } from '@/shared/utils/constants';
import type {
  InventoryPersistedState,
  StockItem,
  StockLot,
  StockMovement,
} from '../types/stock.types';

export function getInventoryStorageKey(): string {
  return STORAGE_KEYS.INVENTORY_STOCK;
}

/** Empty inventory — users add stock items through the app. */
export function createEmptyInventoryState(): InventoryPersistedState {
  return { items: [], movements: [], lots: [] };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object';
}

function reviveMovement(raw: unknown): StockMovement | null {
  if (!isRecord(raw)) return null;
  const id = raw.id,
    itemId = raw.itemId,
    type = raw.type,
    qtySigned = raw.qtySigned,
    createdAtISO = raw.createdAtISO;
  if (
    typeof id !== 'string' ||
    typeof itemId !== 'string' ||
    typeof qtySigned !== 'number' ||
    typeof createdAtISO !== 'string'
  )
    return null;
  const t = type as StockMovement['type'];
  if (!['purchase', 'pos_deduction', 'wastage', 'adjustment'].includes(t)) return null;
  return {
    id,
    itemId,
    type: t,
    qtySigned,
    createdAtISO,
    ...(typeof raw.note === 'string' ? { note: raw.note } : {}),
    ...(typeof raw.summary === 'string' ? { summary: raw.summary } : {}),
  };
}

function reviveItem(raw: unknown): StockItem | null {
  if (!isRecord(raw)) return null;
  const { id, sku, name, category, unit, parLevel, unitCostBdt } = raw;
  if (
    typeof id !== 'string' ||
    typeof sku !== 'string' ||
    typeof name !== 'string' ||
    typeof category !== 'string' ||
    typeof unit !== 'string' ||
    typeof parLevel !== 'number' ||
    typeof unitCostBdt !== 'number'
  )
    return null;
  const u = unit as StockItem['unit'];
  const allowed = ['kg', 'g', 'L', 'ml', 'pcs', 'box', 'pack'];
  if (!allowed.includes(u)) return null;
  return { id, sku, name, category, unit: u, parLevel, unitCostBdt };
}

function reviveLot(raw: unknown): StockLot | null {
  if (!isRecord(raw)) return null;
  const id = raw.id,
    itemId = raw.itemId,
    qty = raw.qty;
  if (typeof id !== 'string' || typeof itemId !== 'string' || typeof qty !== 'number') return null;
  const exp = raw.expiryDate;
  const expiryDate = exp === null || typeof exp === 'string' ? exp : null;
  return { id, itemId, qty, expiryDate };
}

/** Sum ledger qty for one SKU */
export function sumMovementQty(movements: StockMovement[], itemId: string): number {
  return movements.reduce((acc, m) => (m.itemId === itemId ? acc + m.qtySigned : acc), 0);
}

/** FEFO: reduce dated lots closest to expiry (null/expired ambient lots last before null far) */
export function deductFifoLots(lots: StockLot[], itemId: string, deductQty: number): StockLot[] {
  if (deductQty <= 0) return lots;
  const others = lots.filter((l) => l.itemId !== itemId);
  const mine = lots.filter((l) => l.itemId === itemId);
  mine.sort((a, b) => {
    const ad = parseYmdLocal(a.expiryDate);
    const bd = parseYmdLocal(b.expiryDate);
    const aNull = !ad ? 2 : Number.isFinite(ad!.getTime()) ? 0 : 2;
    const bNull = !bd ? 2 : Number.isFinite(bd!.getTime()) ? 0 : 2;
    if (aNull !== bNull) return bNull - aNull;
    if (!ad || !bd) return 0;
    return ad.getTime() - bd.getTime();
  });

  let left = deductQty;
  const adjusted: StockLot[] = [];
  for (const l of mine) {
    if (left <= 1e-9) {
      adjusted.push(l);
      continue;
    }
    const take = Math.min(l.qty, left);
    const rest = Math.round((l.qty - take) * 10000) / 10000;
    left -= take;
    if (rest > 1e-6) adjusted.push({ ...l, qty: rest });
  }
  return [...others, ...adjusted];
}

function parseYmdLocal(ymd: string | null): Date | null {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Lots with expiry hitting within [today, today+withinDays], qty > epsilon */
export function countExpiringSnapshot(
  lots: StockLot[],
  withinDays: number,
): { skuCount: number; lotCount: number; qtyTotalApprox: number } {
  const start = stripTime(new Date());
  const end = new Date(start);
  end.setDate(end.getDate() + withinDays);
  const sku = new Set<string>();
  let lotCount = 0;
  let qty = 0;
  for (const l of lots) {
    const d = parseYmdLocal(l.expiryDate);
    if (!d || l.qty <= 1e-6) continue;
    const t = stripTime(d);
    if (t >= start && t <= end) {
      sku.add(l.itemId);
      lotCount++;
      qty += l.qty;
    }
  }
  return { skuCount: sku.size, lotCount, qtyTotalApprox: Math.round(qty * 100) / 100 };
}

function stripTime(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function loadInventoryState(storageKey?: string): InventoryPersistedState {
  const key = storageKey ?? getInventoryStorageKey();
  if (typeof window === 'undefined') return createEmptyInventoryState();
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return createEmptyInventoryState();
    const parsed = JSON.parse(raw) as Partial<InventoryPersistedState>;
    const itemsRaw = parsed.items,
      mvRaw = parsed.movements,
      lotsRaw = parsed.lots;

    const items = Array.isArray(itemsRaw)
      ? (itemsRaw.map(reviveItem).filter(Boolean) as StockItem[])
      : [];
    const movements = Array.isArray(mvRaw)
      ? (mvRaw.map(reviveMovement).filter(Boolean) as StockMovement[])
      : [];
    const lotsLots = Array.isArray(lotsRaw)
      ? (lotsRaw.map(reviveLot).filter(Boolean) as StockLot[])
      : [];

    return { items, movements: movements.slice(0, 500), lots: lotsLots.slice(0, 200) };
  } catch {
    return createEmptyInventoryState();
  }
}

export function saveInventoryState(
  state: InventoryPersistedState,
  storageKey?: string,
): void {
  const key = storageKey ?? getInventoryStorageKey();
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(state));
  } catch {
    // ignore quota
  }
}
