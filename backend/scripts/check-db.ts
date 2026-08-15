import { prisma } from '../src/lib/prisma.js';
import { SEED_MENU } from '../prisma/seed/menuData.js';

async function main() {
  const menuCount = await prisma.menuItem.count();
  const orderCount = await prisma.order.count();
  const orderItemCount = await prisma.orderItem.count();
  const txCount = await prisma.transaction.count({ where: { type: 'sale' } });

  const seedIds = new Set(SEED_MENU.map((m) => m.id));
  const inDb = await prisma.menuItem.findMany({ select: { id: true, name: true } });
  const dbIds = new Set(inDb.map((m) => m.id));

  const missing = SEED_MENU.filter((m) => !dbIds.has(m.id));
  const extra = inDb.filter((m) => !seedIds.has(m.id));

  const url = process.env.DATABASE_URL ?? '';
  const host = url.replace(/:[^:@]+@/, ':***@').split('?')[0];

  console.log(JSON.stringify({
    databaseHost: host,
    menuCount,
    orderCount,
    orderItemCount,
    saleTransactionCount: txCount,
    seedExpected: SEED_MENU.length,
    missingCount: missing.length,
    extraCount: extra.length,
    missingNames: missing.map((m) => m.name),
    extraNames: extra.map((m) => m.name),
  }, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
