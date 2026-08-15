import 'dotenv/config';
import { prisma } from '../src/lib/prisma.js';
import { getCombinedAccountBalances } from '../src/modules/funds/funds.service.js';

const b = await getCombinedAccountBalances();
console.log('COMBINED', b.combined);
console.log('FUND_ADJ', b.fundAdjustments);
console.log('OPERATIONAL', b.operational);
console.log('TOTAL', b.totalLiquidity);

const sales = await prisma.transaction.groupBy({
  by: ['method'],
  where: {
    type: 'sale',
    OR: [{ receiptStatus: 'completed' }, { receiptStatus: null }],
  },
  _sum: { amount: true },
  _count: true,
});
const expenses = await prisma.transaction.groupBy({
  by: ['method'],
  where: { type: { in: ['expense_fixed', 'expense_product'] } },
  _sum: { amount: true },
  _count: true,
});
console.log('SALES_BY_METHOD', sales);
console.log('EXPENSES_BY_METHOD', expenses);
await prisma.$disconnect();
