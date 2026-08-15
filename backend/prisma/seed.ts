import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import bcrypt from 'bcrypt';
import { prisma } from '../src/lib/prisma.js';
import { backfillExpenseRecords } from '../src/modules/expenses/expenses.service.js';
import { SEED_MENU } from './seed/menuData.js';
import { SEED_CATEGORY } from './seed/categoryMap.js';
import { seedDemoData } from './seed/demoData.js';

function requireSeedPassword(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `Missing ${name} in .env — set owner/manager passwords before running npm run db:seed`,
    );
  }
  return value;
}

const USERS = [
  { name: 'Owner', role: 'owner' as const, password: requireSeedPassword('OWNER_PASSWORD') },
  { name: 'Manager', role: 'manager' as const, password: requireSeedPassword('MANAGER_PASSWORD') },
];

function logDatabaseTarget() {
  const url = process.env.DATABASE_URL ?? '';
  const host = url.replace(/:[^:@]+@/, ':***@').split('?')[0];
  console.log(`→ Seeding database: ${host || '(DATABASE_URL not set)'}`);
}

async function seedUsers() {
  for (const u of USERS) {
    const passwordHash = await bcrypt.hash(u.password, 12);
    await prisma.user.upsert({
      where: { role: u.role },
      update: { name: u.name, passwordHash },
      create: { name: u.name, role: u.role, passwordHash },
    });
    console.log(`✔ Seeded ${u.role}`);
  }

  const visitorHash = await bcrypt.hash(randomBytes(32).toString('hex'), 12);
  await prisma.user.upsert({
    where: { role: 'visitor' },
    update: { name: 'Visitor' },
    create: { name: 'Visitor', role: 'visitor', passwordHash: visitorHash },
  });
  console.log('✔ Seeded visitor (passwordless, read-only)');
}

async function seedMenu() {
  const seedIds = SEED_MENU.map((item) => item.id);

  for (const item of SEED_MENU) {
    await prisma.menuItem.upsert({
      where: { id: item.id },
      update: {
        name: item.name,
        category: SEED_CATEGORY[item.category],
        price: item.price,
        available: item.available,
      },
      create: {
        id: item.id,
        name: item.name,
        category: SEED_CATEGORY[item.category],
        price: item.price,
        available: item.available,
      },
    });
  }

  const removed = await prisma.menuItem.deleteMany({
    where: { id: { notIn: seedIds } },
  });

  console.log(`✔ Seeded ${SEED_MENU.length} menu items (${removed.count} stale rows removed)`);
}

/** Remove old demo orders that were previously inserted by seed (order-seed-* ids). */
async function removeLegacyDemoOrders() {
  const demoSales = await prisma.transaction.findMany({
    where: { id: { startsWith: 'order-seed-' } },
    select: { id: true },
  });

  if (demoSales.length === 0) return;

  const ids = demoSales.map((s) => s.id);
  await prisma.order.deleteMany({ where: { saleTransactionId: { in: ids } } });
  await prisma.transaction.deleteMany({ where: { id: { in: ids } } });
  console.log(`✔ Removed ${ids.length} legacy demo order(s)`);
}

/** Backfill orders for real sale transactions that have orderNumber but no linked Order row. */
async function backfillOrphanSales() {
  const candidates = await prisma.transaction.findMany({
    where: {
      type: 'sale',
      orderNumber: { not: null },
      order: null,
    },
  });

  const orphans = candidates.filter((sale) => {
    const lines = sale.receiptLines;
    return Array.isArray(lines) && lines.length > 0;
  });

  if (orphans.length === 0) return;

  for (const sale of orphans) {
    const lines = (sale.receiptLines as Array<{
      name: string;
      qty: number;
      unitPrice: number;
      menuItemId?: string;
      isGift?: boolean;
      giftReason?: string;
    }>) ?? [];

    if (!sale.orderNumber || lines.length === 0) continue;

    const subtotal = lines.reduce((sum, line) => sum + line.unitPrice * line.qty, 0);

    await prisma.order.create({
      data: {
        orderNumber: sale.orderNumber,
        customerName: sale.customerName ?? '',
        tableNumber: sale.tableNumber ?? '',
        paymentMethod: sale.method,
        channel: sale.posChannel ?? 'in_store',
        subtotal,
        discount: Number(sale.discountAmount ?? 0),
        total: Number(sale.amount),
        customerPaid: Number(sale.amount),
        changeAmount: 0,
        cashierName: sale.cashier ?? '',
        giftItemCount: sale.giftItemCount,
        giftTotalValue: sale.giftTotalValue,
        createdAt: sale.date,
        saleTransactionId: sale.id,
        items: {
          create: lines.map((line) => ({
            menuItemId: line.menuItemId,
            nameSnapshot: line.name.replace(/ \(Gift\)$/, ''),
            unitPrice: line.unitPrice,
            quantity: line.qty,
            isGift: line.isGift ?? false,
            giftReason: line.giftReason,
          })),
        },
      },
    });
  }

  console.log(`✔ Backfilled ${orphans.length} sale(s) into orders + order_items`);
}

async function main() {
  logDatabaseTarget();
  await seedUsers();
  await seedMenu();
  await removeLegacyDemoOrders();

  const demo = await seedDemoData(prisma);
  console.log(
    `✔ Demo data ${demo.range}: ${demo.sales} sales, ${demo.productCosts} product costs, ${demo.fixedCosts} fixed costs, ${demo.fundMoves} fund moves (${demo.days} days)`,
  );
  if (demo.liquidity) {
    console.log(
      `✔ Method balances ≈ cash ৳${Math.round(demo.liquidity.cash)}, bank ৳${Math.round(demo.liquidity.bank)}, bkash ৳${Math.round(demo.liquidity.bkash)}`,
    );
  }

  await backfillOrphanSales();
  const expenseRecords = await backfillExpenseRecords();
  if (expenseRecords > 0) {
    console.log(`✔ Backfilled ${expenseRecords} expense record(s) into detail tables`);
  }
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
