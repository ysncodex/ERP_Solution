import type { Request, Response } from 'express';
import { serializeTransaction } from '../../utils/serialize.js';
import {
  expenseCreateSchema,
  expensesListQuerySchema,
  expenseUpdateSchema,
  statsQuerySchema,
} from './expenses.schema.js';
import {
  createExpenseRecord,
  deleteExpenseRecord,
  expenseStatsRecords,
  getExpenseRecord,
  listExpenseRecords,
  listExpensesByType,
  updateExpenseRecord,
} from './expenses.service.js';

export async function listExpenses(req: Request, res: Response) {
  const q = expensesListQuerySchema.parse(req.query);
  const rows = await listExpenseRecords(q);
  res.json(rows.map(serializeTransaction));
}

export async function getExpense(req: Request, res: Response) {
  const id = String(req.params.id);
  const expense = await getExpenseRecord(id);
  res.json(serializeTransaction(expense));
}

export async function createExpense(req: Request, res: Response) {
  const data = expenseCreateSchema.parse(req.body);
  const expense = await createExpenseRecord(data);
  res.status(201).json(serializeTransaction(expense));
}

export async function updateExpense(req: Request, res: Response) {
  const id = String(req.params.id);
  const data = expenseUpdateSchema.parse(req.body);
  const updated = await updateExpenseRecord(id, data);
  res.json(serializeTransaction(updated));
}

export async function deleteExpense(req: Request, res: Response) {
  const id = String(req.params.id);
  await deleteExpenseRecord(id);
  res.status(204).send();
}

export async function expenseStats(req: Request, res: Response) {
  const q = statsQuerySchema.parse(req.query);
  const { byType, byCategory } = await expenseStatsRecords(q);

  const sumForType = (t: 'expense_product' | 'expense_fixed') =>
    Number(byType.find((r) => r.type === t)?._sum.amount ?? 0);

  const productCosts = sumForType('expense_product');
  const fixedCosts = sumForType('expense_fixed');

  const expensesByCategory: Record<string, number> = {};
  for (const row of byCategory) {
    expensesByCategory[row.category ?? 'Uncategorized'] = Number(row._sum.amount ?? 0);
  }

  res.json({
    totalExpenses: productCosts + fixedCosts,
    productCosts,
    fixedCosts,
    expensesByCategory,
  });
}

export async function productCosts(req: Request, res: Response) {
  const q = statsQuerySchema.parse(req.query);
  const rows = await listExpensesByType('expense_product', q);
  res.json(rows.map(serializeTransaction));
}

export async function fixedCosts(req: Request, res: Response) {
  const q = statsQuerySchema.parse(req.query);
  const rows = await listExpensesByType('expense_fixed', q);
  res.json(rows.map(serializeTransaction));
}
