import type { Request, Response } from 'express';
import { prisma } from '../../lib/prisma.js';
import { businessMonthEndKey } from '../../utils/businessDate.js';
import { dateRangeWhere } from '../../utils/query.js';
import { serializeTransaction } from '../../utils/serialize.js';
import {
  dailyQuerySchema,
  exportQuerySchema,
  monthlyQuerySchema,
  rangeQuerySchema,
} from './reports.schema.js';

type Range = ReturnType<typeof dateRangeWhere>;

async function salesByMethod(range: Range) {
  const rows = await prisma.transaction.groupBy({
    by: ['method'],
    where: { type: 'sale', ...range },
    _sum: { amount: true },
  });
  const get = (m: string) => Number(rows.find((r) => r.method === m)?._sum.amount ?? 0);
  return { cash: get('cash'), bank: get('bank'), bkash: get('bkash') };
}

async function salesByChannel(range: Range) {
  const rows = await prisma.transaction.groupBy({
    by: ['channel'],
    where: { type: 'sale', ...range },
    _sum: { amount: true },
  });
  const get = (c: string) => Number(rows.find((r) => r.channel === c)?._sum.amount ?? 0);
  return { in_store: get('in_store'), foodpanda: get('foodpanda'), foodi: get('foodi') };
}

async function expenseTotals(range: Range) {
  const rows = await prisma.transaction.groupBy({
    by: ['type'],
    where: { type: { in: ['expense_product', 'expense_fixed'] }, ...range },
    _sum: { amount: true },
  });
  const get = (t: string) => Number(rows.find((r) => r.type === t)?._sum.amount ?? 0);
  return { productCosts: get('expense_product'), fixedCosts: get('expense_fixed') };
}

async function totalSales(range: Range) {
  const agg = await prisma.transaction.aggregate({
    where: { type: 'sale', ...range },
    _sum: { amount: true },
  });
  return Number(agg._sum.amount ?? 0);
}

const margin = (profit: number, revenue: number) =>
  revenue > 0 ? Number(((profit / revenue) * 100).toFixed(2)) : 0;

export async function dailyReport(req: Request, res: Response) {
  const { date } = dailyQuerySchema.parse(req.query);
  const range = dateRangeWhere(date, date);

  const [sales, methods, expenses] = await Promise.all([
    totalSales(range),
    salesByMethod(range),
    expenseTotals(range),
  ]);
  const totalExpenses = expenses.productCosts + expenses.fixedCosts;

  res.json({
    date,
    totalSales: sales,
    totalExpenses,
    profit: sales - totalExpenses,
    salesBreakdown: methods,
    expensesBreakdown: expenses,
  });
}

export async function monthlyReport(req: Request, res: Response) {
  const { month } = monthlyQuerySchema.parse(req.query);
  const range = dateRangeWhere(`${month}-01`, businessMonthEndKey(month));

  const [sales, channels, expenses, byCategory] = await Promise.all([
    totalSales(range),
    salesByChannel(range),
    expenseTotals(range),
    prisma.transaction.groupBy({
      by: ['category'],
      where: { type: { in: ['expense_product', 'expense_fixed'] }, ...range },
      _sum: { amount: true },
    }),
  ]);

  const totalExpenses = expenses.productCosts + expenses.fixedCosts;
  const profit = sales - totalExpenses;

  const topExpenses = byCategory
    .map((r) => ({ category: r.category ?? 'Uncategorized', amount: Number(r._sum.amount ?? 0) }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  res.json({
    month,
    totalSales: sales,
    totalExpenses,
    profit,
    profitMargin: margin(profit, sales),
    salesByChannel: channels,
    topExpenses,
  });
}

export async function profitLossReport(req: Request, res: Response) {
  const { startDate, endDate } = rangeQuerySchema.parse(req.query);
  const range = dateRangeWhere(startDate, endDate);

  const [revenue, channels, expenses] = await Promise.all([
    totalSales(range),
    salesByChannel(range),
    expenseTotals(range),
  ]);

  const totalExpenses = expenses.productCosts + expenses.fixedCosts;
  const grossProfit = revenue - totalExpenses;

  res.json({
    period: `${startDate} → ${endDate}`,
    revenue,
    totalExpenses,
    grossProfit,
    profitMargin: margin(grossProfit, revenue),
    breakdown: {
      sales: {
        inStore: channels.in_store,
        foodpanda: channels.foodpanda,
        foodi: channels.foodi,
      },
      expenses: {
        productCosts: expenses.productCosts,
        fixedCosts: expenses.fixedCosts,
        other: 0,
      },
    },
  });
}

export async function customReport(req: Request, res: Response) {
  const { startDate, endDate } = rangeQuerySchema.parse(req.query);
  const range = dateRangeWhere(startDate, endDate);

  const [sales, methods, channels, expenses] = await Promise.all([
    totalSales(range),
    salesByMethod(range),
    salesByChannel(range),
    expenseTotals(range),
  ]);
  const totalExpenses = expenses.productCosts + expenses.fixedCosts;

  res.json({
    period: `${startDate} → ${endDate}`,
    totalSales: sales,
    totalExpenses,
    profit: sales - totalExpenses,
    salesByMethod: methods,
    salesByChannel: channels,
    expensesBreakdown: expenses,
  });
}

const csvCell = (v: unknown) => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export async function exportReport(req: Request, res: Response) {
  const q = exportQuerySchema.parse(req.query);
  const rows = await prisma.transaction.findMany({
    where: dateRangeWhere(q.startDate, q.endDate),
    orderBy: { date: 'desc' },
  });

  const data = rows.map(serializeTransaction);
  const headers = [
    'id',
    'date',
    'type',
    'category',
    'channel',
    'method',
    'description',
    'amount',
  ];
  const lines = [
    headers.join(','),
    ...data.map((t) =>
      [t.id, t.date, t.type, t.category, t.channel, t.method, t.description, t.amount]
        .map(csvCell)
        .join(','),
    ),
  ];

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="report-${q.type}-${Date.now()}.csv"`,
  );
  res.send(lines.join('\n'));
}
