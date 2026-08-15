/**
 * Demo dataset for ERP_Solutions — June, July, and August 2026.
 *
 * Batched inserts (createMany) so seeding stays fast on remote Postgres (Neon).
 * Stable `demo-*` / `ORD-DEMO-*` ids make re-seeding idempotent.
 */

import type { PrismaClient, Prisma } from '../../src/generated/prisma/client.js';
import { parseBusinessDate } from '../../src/utils/businessDate.js';
import { SEED_MENU } from './menuData.js';

type PaymentMethod = 'cash' | 'bank' | 'bkash';
type SalesChannel = 'in_store' | 'foodpanda' | 'foodi';
type PosChannel = 'in_store' | 'takeaway' | 'delivery';
type UnitType = 'kg' | 'g' | 'L' | 'ml' | 'pcs' | 'box' | 'pack';

const DEMO_PREFIX = 'demo-';
const START = '2026-06-01';
const END = '2026-08-15';
const BATCH = 100;

const CASHIERS = ['Owner', 'Manager', 'Ayesha', 'Rahim', 'Nusrat'] as const;
const CUSTOMERS = [
  'Walk-in',
  'Karim H.',
  'Sadia R.',
  'Tanvir A.',
  'Maya C.',
  'Farhan I.',
  'Nabila S.',
  'Imran K.',
] as const;

const SUPPLIERS = [
  { id: `${DEMO_PREFIX}sup-dairy`, name: 'Fresh Dairy BD', phone: '01711000001', address: 'Mirpur, Dhaka' },
  { id: `${DEMO_PREFIX}sup-coffee`, name: 'Bean Traders', phone: '01711000002', address: 'Tejgaon, Dhaka' },
  { id: `${DEMO_PREFIX}sup-pack`, name: 'Cup & Pack Ltd', phone: '01711000003', address: 'Motijheel, Dhaka' },
  { id: `${DEMO_PREFIX}sup-produce`, name: 'Green Valley Produce', phone: '01711000004', address: 'Kawran Bazar, Dhaka' },
  { id: `${DEMO_PREFIX}sup-bakery`, name: 'Sweet Crumb Bakery', phone: '01711000005', address: 'Dhanmondi, Dhaka' },
  { id: `${DEMO_PREFIX}sup-chicken`, name: 'City Poultry Supply', phone: '01711000006', address: 'Mohakhali, Dhaka' },
] as const;

const FIXED_ITEMS = [
  { id: `${DEMO_PREFIX}fci-rent`, name: 'Shop Rent' },
  { id: `${DEMO_PREFIX}fci-electric`, name: 'Electricity Bill' },
  { id: `${DEMO_PREFIX}fci-internet`, name: 'Internet & Wi-Fi' },
  { id: `${DEMO_PREFIX}fci-salary`, name: 'Staff Salary' },
  { id: `${DEMO_PREFIX}fci-gas`, name: 'Gas Bill' },
  { id: `${DEMO_PREFIX}fci-cleaning`, name: 'Cleaning Service' },
] as const;

const PRODUCT_ITEMS: { id: string; name: string; unit: UnitType; unitPrice: number; supplierId: string }[] = [
  { id: `${DEMO_PREFIX}pci-milk`, name: 'Fresh Milk', unit: 'L', unitPrice: 95, supplierId: SUPPLIERS[0].id },
  { id: `${DEMO_PREFIX}pci-beans`, name: 'Coffee Beans', unit: 'kg', unitPrice: 1450, supplierId: SUPPLIERS[1].id },
  { id: `${DEMO_PREFIX}pci-cups`, name: 'Paper Cups', unit: 'pack', unitPrice: 320, supplierId: SUPPLIERS[2].id },
  { id: `${DEMO_PREFIX}pci-boba`, name: 'Tapioca Pearls', unit: 'kg', unitPrice: 480, supplierId: SUPPLIERS[3].id },
  { id: `${DEMO_PREFIX}pci-syrup`, name: 'Flavored Syrup', unit: 'L', unitPrice: 650, supplierId: SUPPLIERS[1].id },
  { id: `${DEMO_PREFIX}pci-cream`, name: 'Whipping Cream', unit: 'L', unitPrice: 420, supplierId: SUPPLIERS[0].id },
  { id: `${DEMO_PREFIX}pci-waffle`, name: 'Waffle Mix', unit: 'kg', unitPrice: 380, supplierId: SUPPLIERS[4].id },
  { id: `${DEMO_PREFIX}pci-chicken`, name: 'Chicken Fillet', unit: 'kg', unitPrice: 520, supplierId: SUPPLIERS[5].id },
  { id: `${DEMO_PREFIX}pci-mango`, name: 'Mango Pulp', unit: 'kg', unitPrice: 210, supplierId: SUPPLIERS[3].id },
  { id: `${DEMO_PREFIX}pci-straw`, name: 'Straws & Lids', unit: 'box', unitPrice: 280, supplierId: SUPPLIERS[2].id },
];

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, list: readonly T[]): T {
  return list[Math.floor(rng() * list.length)]!;
}

function eachDay(from: string, to: string): string[] {
  const out: string[] = [];
  const [fy, fm, fd] = from.split('-').map(Number);
  const end = parseBusinessDate(to).getTime();
  let cur = Date.UTC(fy, fm - 1, fd, 12, 0, 0, 0);
  while (cur <= end) {
    out.push(new Date(cur).toISOString().slice(0, 10));
    cur += 24 * 60 * 60 * 1000;
  }
  return out;
}

function weekday(key: string): number {
  return parseBusinessDate(key).getUTCDay();
}

function pad(n: number, width = 4): string {
  return String(n).padStart(width, '0');
}

async function createManyBatched<T extends object>(
  rows: T[],
  insert: (chunk: T[]) => Promise<unknown>,
) {
  for (let i = 0; i < rows.length; i += BATCH) {
    await insert(rows.slice(i, i + BATCH));
  }
}

/** Wipe previous demo rows (safe to re-run seed). */
export async function clearDemoData(prisma: PrismaClient) {
  await prisma.orderItem.deleteMany({
    where: { order: { OR: [{ id: { startsWith: DEMO_PREFIX } }, { orderNumber: { startsWith: 'ORD-DEMO-' } }] } },
  });
  await prisma.order.deleteMany({
    where: { OR: [{ id: { startsWith: DEMO_PREFIX } }, { orderNumber: { startsWith: 'ORD-DEMO-' } }] },
  });
  await prisma.productCostRecord.deleteMany({ where: { id: { startsWith: DEMO_PREFIX } } });
  await prisma.fixedCostRecord.deleteMany({ where: { id: { startsWith: DEMO_PREFIX } } });
  await prisma.transaction.deleteMany({ where: { id: { startsWith: DEMO_PREFIX } } });
  await prisma.fundMovement.deleteMany({ where: { id: { startsWith: DEMO_PREFIX } } });
  await prisma.productCostItem.deleteMany({ where: { id: { startsWith: DEMO_PREFIX } } });
  await prisma.fixedCostItem.deleteMany({ where: { id: { startsWith: DEMO_PREFIX } } });
  await prisma.supplier.deleteMany({ where: { id: { startsWith: DEMO_PREFIX } } });
}

export async function seedDemoData(prisma: PrismaClient) {
  const rng = mulberry32(20260815);
  const days = eachDay(START, END);
  const menu = SEED_MENU.filter((m) => m.available);
  if (menu.length === 0) throw new Error('SEED_MENU is empty — seed menu first');

  console.log('  … clearing previous demo rows');
  await clearDemoData(prisma);

  // ── Catalogs ──────────────────────────────────────────────────────────────
  await prisma.supplier.createMany({ data: [...SUPPLIERS], skipDuplicates: true });
  await prisma.fixedCostItem.createMany({ data: [...FIXED_ITEMS], skipDuplicates: true });
  await prisma.productCostItem.createMany({
    data: PRODUCT_ITEMS.map(({ id, name }) => ({ id, name })),
    skipDuplicates: true,
  });

  const fundDefs = [
    { id: 'fac_cash', type: 'cash' as const, label: 'Cash Drawer' },
    { id: 'fac_bank', type: 'bank' as const, label: 'Bank Account' },
    { id: 'fac_bkash', type: 'bkash' as const, label: 'bKash' },
    { id: 'fac_reserve', type: 'reserve' as const, label: 'Reserve Fund' },
  ];
  for (const a of fundDefs) {
    await prisma.fundAccount.upsert({
      where: { type: a.type },
      update: { label: a.label },
      create: { id: a.id, type: a.type, label: a.label, balance: 0 },
    });
  }
  const funds = await prisma.fundAccount.findMany();
  const fundByType = Object.fromEntries(funds.map((f) => [f.type, f])) as Record<
    string,
    (typeof funds)[number]
  >;
  const owner = await prisma.user.findFirst({ where: { role: 'owner' } });

  const balances: Record<string, number> = { cash: 0, bank: 0, bkash: 0, reserve: 0 };
  // Modest cafe-scale openings — sales fund most expenses; keep end balances realistic.
  const fundRows: Prisma.FundMovementCreateManyInput[] = [
    { id: `${DEMO_PREFIX}fnd-open-cash`, movementType: 'opening', toAccountId: fundByType.cash!.id, amount: 20000, transactionDate: parseBusinessDate('2026-06-01'), notes: 'Opening cash float — June', createdById: owner?.id },
    { id: `${DEMO_PREFIX}fnd-open-bank`, movementType: 'opening', toAccountId: fundByType.bank!.id, amount: 95000, transactionDate: parseBusinessDate('2026-06-01'), notes: 'Opening bank balance — June', createdById: owner?.id },
    { id: `${DEMO_PREFIX}fnd-open-bkash`, movementType: 'opening', toAccountId: fundByType.bkash!.id, amount: 12000, transactionDate: parseBusinessDate('2026-06-01'), notes: 'Opening bKash wallet — June', createdById: owner?.id },
    { id: `${DEMO_PREFIX}fnd-open-reserve`, movementType: 'opening', toAccountId: fundByType.reserve!.id, amount: 25000, transactionDate: parseBusinessDate('2026-06-01'), notes: 'Emergency reserve — June', createdById: owner?.id },
    { id: `${DEMO_PREFIX}fnd-add-jul`, movementType: 'add', toAccountId: fundByType.bank!.id, amount: 20000, transactionDate: parseBusinessDate('2026-07-05'), notes: 'Owner capital top-up — July', createdById: owner?.id },
    { id: `${DEMO_PREFIX}fnd-xfer-jul`, movementType: 'transfer', fromAccountId: fundByType.bank!.id, toAccountId: fundByType.cash!.id, amount: 8000, transactionDate: parseBusinessDate('2026-07-12'), notes: 'Bank → cash float refill', createdById: owner?.id },
    { id: `${DEMO_PREFIX}fnd-xfer-aug`, movementType: 'transfer', fromAccountId: fundByType.bkash!.id, toAccountId: fundByType.bank!.id, amount: 5000, transactionDate: parseBusinessDate('2026-08-03'), notes: 'Settle bKash to bank', createdById: owner?.id },
    { id: `${DEMO_PREFIX}fnd-add-aug`, movementType: 'add', toAccountId: fundByType.cash!.id, amount: 5000, transactionDate: parseBusinessDate('2026-08-10'), notes: 'Weekend cash float boost', createdById: owner?.id },
    { id: `${DEMO_PREFIX}fnd-wd-aug`, movementType: 'withdraw', fromAccountId: fundByType.reserve!.id, amount: 3000, transactionDate: parseBusinessDate('2026-08-14'), notes: 'Equipment maintenance withdraw', createdById: owner?.id },
  ];
  balances.cash = 20000 + 8000 + 5000;
  balances.bank = 95000 + 20000 - 8000 + 5000;
  balances.bkash = 12000 - 5000;
  balances.reserve = 25000 - 3000;

  await prisma.fundMovement.createMany({ data: fundRows });

  /** Spendable = fund openings + sales − expenses (kept ≥ 0 per method). */
  const spendable: Record<PaymentMethod, number> = {
    cash: balances.cash,
    bank: balances.bank,
    bkash: balances.bkash,
  };

  function creditSale(method: PaymentMethod, amount: number) {
    spendable[method] += amount;
  }

  function chargeMethod(preferred: PaymentMethod, amount: number): PaymentMethod | null {
    const order: PaymentMethod[] = [preferred, 'bank', 'cash', 'bkash'];
    const seen = new Set<PaymentMethod>();
    for (const m of order) {
      if (seen.has(m)) continue;
      seen.add(m);
      if (spendable[m] + 1e-9 >= amount) {
        spendable[m] -= amount;
        return m;
      }
    }
    return null;
  }

  // ── Sales + orders FIRST (credit each method, then expenses spend from that pool) ─
  const saleTxns: Prisma.TransactionCreateManyInput[] = [];
  const orders: Prisma.OrderCreateManyInput[] = [];
  const orderItems: Prisma.OrderItemCreateManyInput[] = [];
  let saleCount = 0;
  let orderSeq = 1;

  for (const day of days) {
    const dow = weekday(day);
    const isWeekend = dow === 5 || dow === 6;
    // Slightly leaner volume so liquidity stays cafe-realistic
    let ordersToday = isWeekend ? 5 + Math.floor(rng() * 4) : 3 + Math.floor(rng() * 3);
    if (day === END) ordersToday = Math.max(ordersToday, 8);

    for (let o = 0; o < ordersToday; o++) {
      saleCount += 1;
      const lineCount = 1 + Math.floor(rng() * 3);
      const lines: {
        menuItemId: string;
        name: string;
        qty: number;
        unitPrice: number;
        isGift?: boolean;
      }[] = [];

      for (let L = 0; L < lineCount; L++) {
        const item = pick(rng, menu);
        lines.push({
          menuItemId: item.id,
          name: item.name,
          qty: 1 + Math.floor(rng() * 2),
          unitPrice: item.price,
        });
      }
      if (rng() < 0.06) {
        const gift = pick(rng, menu);
        lines.push({
          menuItemId: gift.id,
          name: `${gift.name} (Gift)`,
          qty: 1,
          unitPrice: gift.price,
          isGift: true,
        });
      }

      const subtotal = lines.reduce((sum, l) => sum + (l.isGift ? 0 : l.unitPrice * l.qty), 0);
      const giftTotalValue = lines.reduce(
        (sum, l) => sum + (l.isGift ? l.unitPrice * l.qty : 0),
        0,
      );
      const giftItemCount = lines.reduce((sum, l) => sum + (l.isGift ? l.qty : 0), 0);
      let discount = 0;
      if (rng() < 0.15 && subtotal > 200) {
        discount = Math.round(subtotal * (0.05 + rng() * 0.08));
      }
      const total = Math.max(0, subtotal - discount);
      // Spread methods so Bank can cover rent/salary from sales + opening
      const method: PaymentMethod = pick(rng, ['cash', 'cash', 'bkash', 'bank', 'bank'] as const);
      const salesChannel: SalesChannel =
        rng() < 0.7 ? 'in_store' : rng() < 0.5 ? 'foodpanda' : 'foodi';
      const posChannel: PosChannel =
        salesChannel !== 'in_store'
          ? 'delivery'
          : rng() < 0.75
            ? 'in_store'
            : rng() < 0.5
              ? 'takeaway'
              : 'delivery';

      const orderNumber = `ORD-DEMO-${pad(orderSeq++, 5)}`;
      const txnId = `${DEMO_PREFIX}txn-sale-${pad(saleCount)}`;
      const orderId = `${DEMO_PREFIX}ord-${pad(saleCount)}`;
      const cashier = pick(rng, CASHIERS);
      const customer = pick(rng, CUSTOMERS);
      const tableNumber =
        posChannel === 'in_store' && rng() < 0.6 ? String(1 + Math.floor(rng() * 12)) : '';
      const hourUtc = 3 + Math.floor(rng() * 12);
      const minute = Math.floor(rng() * 60);
      const [y, m, d] = day.split('-').map(Number);
      const createdAt = new Date(Date.UTC(y, m - 1, d, hourUtc, minute, Math.floor(rng() * 60)));
      const businessDate = parseBusinessDate(day);
      const receiptLines = lines.map((l) => ({
        menuItemId: l.menuItemId,
        name: l.name,
        qty: l.qty,
        unitPrice: l.unitPrice,
        isGift: l.isGift ?? false,
        giftReason: l.isGift ? 'Promo gift' : undefined,
      }));

      creditSale(method, total);

      saleTxns.push({
        id: txnId,
        type: 'sale',
        amount: total,
        method,
        channel: salesChannel,
        description: `POS ${orderNumber}`,
        date: businessDate,
        cashier,
        customerName: customer,
        receiptLines,
        discountAmount: discount || null,
        receiptStatus: 'completed',
        orderNumber,
        tableNumber: tableNumber || null,
        posChannel,
        giftItemCount: giftItemCount || null,
        giftTotalValue: giftTotalValue || null,
      });

      orders.push({
        id: orderId,
        orderNumber,
        customerName: customer,
        tableNumber,
        paymentMethod: method,
        channel: posChannel,
        subtotal,
        discount,
        total,
        customerPaid: total,
        changeAmount: 0,
        cashierName: cashier,
        giftItemCount: giftItemCount || null,
        giftTotalValue: giftTotalValue || null,
        createdAt,
        saleTransactionId: txnId,
      });

      for (const l of lines) {
        orderItems.push({
          orderId,
          menuItemId: l.menuItemId,
          nameSnapshot: l.name.replace(/ \(Gift\)$/, ''),
          unitPrice: l.unitPrice,
          quantity: l.qty,
          isGift: l.isGift ?? false,
          giftReason: l.isGift ? 'Promo gift' : undefined,
        });
      }
    }
  }

  // ── Fixed costs (realistic cafe amounts; paid only when balance allows) ───
  const fixedSchedule: { date: string; itemId: string; amount: number; method: PaymentMethod }[] = [
    { date: '2026-06-01', itemId: FIXED_ITEMS[0].id, amount: 22000, method: 'bank' },
    { date: '2026-06-01', itemId: FIXED_ITEMS[3].id, amount: 28000, method: 'bank' },
    { date: '2026-06-08', itemId: FIXED_ITEMS[1].id, amount: 4500, method: 'bkash' },
    { date: '2026-06-08', itemId: FIXED_ITEMS[2].id, amount: 1500, method: 'bkash' },
    { date: '2026-06-15', itemId: FIXED_ITEMS[4].id, amount: 1800, method: 'cash' },
    { date: '2026-06-20', itemId: FIXED_ITEMS[5].id, amount: 1200, method: 'cash' },
    { date: '2026-07-01', itemId: FIXED_ITEMS[0].id, amount: 22000, method: 'bank' },
    { date: '2026-07-01', itemId: FIXED_ITEMS[3].id, amount: 28000, method: 'bank' },
    { date: '2026-07-07', itemId: FIXED_ITEMS[1].id, amount: 4800, method: 'bkash' },
    { date: '2026-07-07', itemId: FIXED_ITEMS[2].id, amount: 1500, method: 'bkash' },
    { date: '2026-07-16', itemId: FIXED_ITEMS[4].id, amount: 1900, method: 'cash' },
    { date: '2026-07-22', itemId: FIXED_ITEMS[5].id, amount: 1200, method: 'cash' },
    { date: '2026-08-01', itemId: FIXED_ITEMS[0].id, amount: 22000, method: 'bank' },
    { date: '2026-08-01', itemId: FIXED_ITEMS[3].id, amount: 28000, method: 'bank' },
    { date: '2026-08-06', itemId: FIXED_ITEMS[1].id, amount: 4600, method: 'bkash' },
    { date: '2026-08-06', itemId: FIXED_ITEMS[2].id, amount: 1500, method: 'bkash' },
    { date: '2026-08-12', itemId: FIXED_ITEMS[4].id, amount: 1800, method: 'cash' },
  ];

  const fixedTxns: Prisma.TransactionCreateManyInput[] = [];
  const fixedRecs: Prisma.FixedCostRecordCreateManyInput[] = [];
  let fixedIdx = 0;
  for (const row of fixedSchedule) {
    const method = chargeMethod(row.method, row.amount);
    if (!method) continue;
    fixedIdx += 1;
    const item = FIXED_ITEMS.find((f) => f.id === row.itemId)!;
    const txnId = `${DEMO_PREFIX}txn-fx-${pad(fixedIdx)}`;
    const date = parseBusinessDate(row.date);
    fixedTxns.push({
      id: txnId,
      type: 'expense_fixed',
      amount: row.amount,
      method,
      category: item.name,
      description: `${item.name} — ${row.date.slice(0, 7)}`,
      date,
    });
    fixedRecs.push({
      id: `${DEMO_PREFIX}fcr-${pad(fixedIdx)}`,
      transactionId: txnId,
      fixedCostItemId: item.id,
      nameSnapshot: item.name,
      description: `${item.name} — ${row.date.slice(0, 7)}`,
      amount: row.amount,
      paymentMethod: method,
      date,
    });
  }

  // ── Product costs (1–2 buys on restock days; capped by available balance) ─
  const productTxns: Prisma.TransactionCreateManyInput[] = [];
  const productRecs: Prisma.ProductCostRecordCreateManyInput[] = [];
  let pci = 0;
  for (const day of days) {
    const dow = weekday(day);
    if (dow !== 1 && dow !== 4 && !day.endsWith('-01')) continue;
    const buys = 1 + Math.floor(rng() * 2);
    for (let b = 0; b < buys; b++) {
      const item = pick(rng, PRODUCT_ITEMS);
      const qty = Number((1 + rng() * 4).toFixed(dow === 1 ? 0 : 1));
      const unitPrice = Math.round(item.unitPrice * (0.92 + rng() * 0.12));
      const amount = Math.round(qty * unitPrice);
      const preferred: PaymentMethod = pick(rng, ['cash', 'bank', 'bkash'] as const);
      const method = chargeMethod(preferred, amount);
      if (!method) continue;
      pci += 1;
      const supplier = SUPPLIERS.find((s) => s.id === item.supplierId)!;
      const txnId = `${DEMO_PREFIX}txn-pc-${pad(pci)}`;
      const date = parseBusinessDate(day);
      productTxns.push({
        id: txnId,
        type: 'expense_product',
        amount,
        method,
        category: item.name,
        description: `Purchase ${item.name}`,
        quantity: qty,
        unit: item.unit,
        unitPrice,
        supplier: supplier.name,
        date,
      });
      productRecs.push({
        id: `${DEMO_PREFIX}pcr-${pad(pci)}`,
        transactionId: txnId,
        productCostItemId: item.id,
        supplierId: supplier.id,
        nameSnapshot: item.name,
        supplierSnapshot: supplier.name,
        quantity: qty,
        unit: item.unit,
        unitPrice,
        amount,
        paymentMethod: method,
        date,
      });
    }
  }

  console.log(
    `  … liquidity targets after seed ≈ cash ৳${Math.round(spendable.cash)}, bank ৳${Math.round(spendable.bank)}, bkash ৳${Math.round(spendable.bkash)}`,
  );
  console.log(
    `  … inserting ${fixedTxns.length + productTxns.length + saleTxns.length} transactions, ${orders.length} orders…`,
  );

  await createManyBatched(saleTxns, (data) => prisma.transaction.createMany({ data }));
  await createManyBatched(orders, (data) => prisma.order.createMany({ data }));
  await createManyBatched(orderItems, (data) => prisma.orderItem.createMany({ data }));
  await createManyBatched(fixedTxns, (data) => prisma.transaction.createMany({ data }));
  await createManyBatched(fixedRecs, (data) => prisma.fixedCostRecord.createMany({ data }));
  await createManyBatched(productTxns, (data) => prisma.transaction.createMany({ data }));
  await createManyBatched(productRecs, (data) => prisma.productCostRecord.createMany({ data }));

  for (const type of Object.keys(balances)) {
    const acc = fundByType[type];
    if (!acc) continue;
    await prisma.fundAccount.update({
      where: { id: acc.id },
      data: { balance: balances[type] ?? 0 },
    });
  }

  return {
    days: days.length,
    sales: saleCount,
    productCosts: productRecs.length,
    fixedCosts: fixedRecs.length,
    fundMoves: fundRows.length,
    suppliers: SUPPLIERS.length,
    range: `${START} → ${END}`,
    liquidity: { ...spendable },
  };
}
