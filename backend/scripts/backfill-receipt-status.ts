/**
 * Backfill: set receiptStatus='completed' on legacy quick/manual sales saved as NULL.
 *
 * Root cause: quick sales (no orderNumber) were stored with receiptStatus NULL.
 * The UI counted them in sales totals but /api/funds/balances excluded them.
 *
 *   npx tsx scripts/backfill-receipt-status.ts           # dry run
 *   npx tsx scripts/backfill-receipt-status.ts --apply   # apply fix
 */
import { prisma } from '../src/lib/prisma.js';

async function main() {
  const apply = process.argv.includes('--apply');

  const affected = await prisma.transaction.findMany({
    where: { type: 'sale', receiptStatus: null, method: { not: null } },
    select: { id: true, method: true, amount: true, date: true, description: true, orderNumber: true },
    orderBy: { date: 'asc' },
  });

  if (affected.length === 0) {
    console.log('✔ No sale rows with NULL receiptStatus found.');
    return;
  }

  const byMethod: Record<string, { count: number; total: number }> = {};
  for (const row of affected) {
    const key = row.method ?? 'unknown';
    byMethod[key] ??= { count: 0, total: 0 };
    byMethod[key].count += 1;
    byMethod[key].total += Number(row.amount);
  }

  console.log(`Found ${affected.length} sale row(s) with receiptStatus = NULL:\n`);
  for (const [method, { count, total }] of Object.entries(byMethod)) {
    console.log(`  ${method.padEnd(8)} → ${count} row(s), ৳${total.toLocaleString()}`);
  }

  const firstWeek = affected.filter((r) => {
    const d = r.date;
    return d.getFullYear() === 2026 && d.getMonth() === 6 && d.getDate() <= 7;
  });
  if (firstWeek.length > 0) {
    const fwTotal = firstWeek.reduce((s, r) => s + Number(r.amount), 0);
    console.log(`\nFirst week Jul 2026 subset: ${firstWeek.length} row(s), ৳${fwTotal.toLocaleString()}`);
  }

  if (!apply) {
    console.log('\nDry run — re-run with --apply to update these rows.');
    return;
  }

  const result = await prisma.transaction.updateMany({
    where: { type: 'sale', receiptStatus: null, method: { not: null } },
    data: { receiptStatus: 'completed' },
  });
  console.log(`\n✔ Updated ${result.count} row(s) to receiptStatus = 'completed'.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
