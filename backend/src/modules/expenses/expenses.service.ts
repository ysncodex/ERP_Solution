import { Prisma } from '../../generated/prisma/client.js';
import { prisma } from '../../lib/prisma.js';
import { ApiError } from '../../utils/ApiError.js';
import { parseBusinessDate } from '../../utils/businessDate.js';
import { normalizeCatalogName } from '../../utils/normalizeName.js';
import { dateRangeWhere, paginate } from '../../utils/query.js';
import { assertSufficientMethodBalance } from '../funds/balanceGuard.js';
import {
  ensureFixedCostItem,
  ensureProductCostItem,
} from './catalog.service.js';
import type { ExpenseCreateInput, ExpenseUpdateInput } from './expenses.schema.js';

const EXPENSE_TYPES = ['expense_product', 'expense_fixed'] as const;

function itemLabel(data: ExpenseCreateInput): string {
  return normalizeCatalogName(data.item ?? data.description ?? 'Expense');
}

async function createFixedCostRecord(
  transactionId: string,
  data: ExpenseCreateInput,
  businessDate: Date,
) {
  const label = itemLabel(data);
  const catalogItem = await ensureFixedCostItem(label);

  await prisma.fixedCostRecord.create({
    data: {
      transactionId,
      fixedCostItemId: catalogItem.id,
      nameSnapshot: label,
      description: data.description ?? label,
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      date: businessDate,
    },
  });
}

async function createProductCostRecord(
  transactionId: string,
  data: ExpenseCreateInput,
  businessDate: Date,
) {
  const label = itemLabel(data);
  const catalogItem = await ensureProductCostItem(label);

  let supplierId: string | undefined;
  let supplierSnapshot: string | undefined;
  if (data.supplier) {
    const normalized = normalizeCatalogName(data.supplier);
    const supplier = await prisma.supplier.findFirst({
      where: { name: { equals: normalized, mode: 'insensitive' } },
    });
    if (supplier) {
      supplierId = supplier.id;
      supplierSnapshot = supplier.name;
    } else {
      supplierSnapshot = normalized;
    }
  }

  await prisma.productCostRecord.create({
    data: {
      transactionId,
      productCostItemId: catalogItem.id,
      supplierId,
      nameSnapshot: label,
      supplierSnapshot,
      quantity: data.quantity,
      unit: data.unit,
      unitPrice: data.unitPrice,
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      date: businessDate,
    },
  });
}

async function syncFixedCostRecord(transactionId: string, data: ExpenseUpdateInput) {
  const existing = await prisma.fixedCostRecord.findUnique({ where: { transactionId } });
  if (!existing) return;

  const label =
    data.item !== undefined || data.description !== undefined
      ? normalizeCatalogName(data.item ?? data.description ?? existing.nameSnapshot)
      : undefined;

  let fixedCostItemId = existing.fixedCostItemId;
  if (label) {
    const catalogItem = await ensureFixedCostItem(label);
    fixedCostItemId = catalogItem.id;
  }

  await prisma.fixedCostRecord.update({
    where: { transactionId },
    data: {
      ...(label ? { nameSnapshot: label, description: data.description ?? label } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(fixedCostItemId !== undefined ? { fixedCostItemId } : {}),
      ...(data.amount !== undefined ? { amount: data.amount } : {}),
      ...(data.paymentMethod !== undefined ? { paymentMethod: data.paymentMethod } : {}),
      ...(data.date !== undefined ? { date: parseBusinessDate(data.date) } : {}),
    },
  });
}

async function syncProductCostRecord(transactionId: string, data: ExpenseUpdateInput) {
  const existing = await prisma.productCostRecord.findUnique({ where: { transactionId } });
  if (!existing) return;

  const label =
    data.item !== undefined || data.description !== undefined
      ? normalizeCatalogName(data.item ?? data.description ?? existing.nameSnapshot)
      : undefined;

  let productCostItemId = existing.productCostItemId;
  if (label) {
    const catalogItem = await ensureProductCostItem(label);
    productCostItemId = catalogItem.id;
  }

  let supplierId = existing.supplierId;
  let supplierSnapshot = existing.supplierSnapshot;
  if (data.supplier !== undefined) {
    if (data.supplier) {
      const normalized = normalizeCatalogName(data.supplier);
      const supplier = await prisma.supplier.findFirst({
        where: { name: { equals: normalized, mode: 'insensitive' } },
      });
      supplierId = supplier?.id ?? null;
      supplierSnapshot = supplier?.name ?? normalized;
    } else {
      supplierId = null;
      supplierSnapshot = null;
    }
  }

  await prisma.productCostRecord.update({
    where: { transactionId },
    data: {
      ...(label ? { nameSnapshot: label } : {}),
      ...(productCostItemId !== undefined ? { productCostItemId } : {}),
      ...(data.supplier !== undefined ? { supplierId, supplierSnapshot } : {}),
      ...(data.quantity !== undefined ? { quantity: data.quantity } : {}),
      ...(data.unit !== undefined ? { unit: data.unit } : {}),
      ...(data.unitPrice !== undefined ? { unitPrice: data.unitPrice } : {}),
      ...(data.amount !== undefined ? { amount: data.amount } : {}),
      ...(data.paymentMethod !== undefined ? { paymentMethod: data.paymentMethod } : {}),
      ...(data.date !== undefined ? { date: parseBusinessDate(data.date) } : {}),
    },
  });
}

export async function createExpenseRecord(data: ExpenseCreateInput) {
  const businessDate = parseBusinessDate(data.date);
  const label = itemLabel(data);

  await assertSufficientMethodBalance(data.paymentMethod, data.amount);

  const expense = await prisma.transaction.create({
    data: {
      type: data.type,
      method: data.paymentMethod,
      category: data.category,
      description: data.description ?? label,
      supplier: data.supplier,
      quantity: data.quantity,
      unit: data.unit,
      unitPrice: data.unitPrice,
      amount: data.amount,
      date: businessDate,
    },
  });

  try {
    if (data.type === 'expense_fixed') {
      await createFixedCostRecord(expense.id, data, businessDate);
    } else {
      await createProductCostRecord(expense.id, data, businessDate);
    }
  } catch (err) {
    await prisma.fixedCostRecord.deleteMany({ where: { transactionId: expense.id } }).catch(() => {});
    await prisma.productCostRecord.deleteMany({ where: { transactionId: expense.id } }).catch(() => {});
    await prisma.transaction.delete({ where: { id: expense.id } }).catch(() => {});
    throw err;
  }

  return expense;
}

export async function updateExpenseRecord(id: string, data: ExpenseUpdateInput) {
  const existing = await prisma.transaction.findUnique({ where: { id } });
  if (!existing || !EXPENSE_TYPES.includes(existing.type as (typeof EXPENSE_TYPES)[number])) {
    throw ApiError.notFound('Expense not found');
  }

  const nextMethod = data.paymentMethod ?? existing.method;
  const nextAmount = data.amount !== undefined ? data.amount : Number(existing.amount);

  if (nextMethod) {
    const sameMethod = nextMethod === existing.method;
    const creditBack = sameMethod ? Number(existing.amount) : 0;
    await assertSufficientMethodBalance(nextMethod, nextAmount, creditBack);
  }

  const updated = await prisma.transaction.update({
    where: { id },
    data: {
      ...(data.type !== undefined ? { type: data.type } : {}),
      ...(data.paymentMethod !== undefined ? { method: data.paymentMethod } : {}),
      ...(data.category !== undefined ? { category: data.category } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.item !== undefined && data.description === undefined
        ? { description: data.item }
        : {}),
      ...(data.supplier !== undefined ? { supplier: data.supplier } : {}),
      ...(data.quantity !== undefined ? { quantity: data.quantity } : {}),
      ...(data.unit !== undefined ? { unit: data.unit } : {}),
      ...(data.unitPrice !== undefined ? { unitPrice: data.unitPrice } : {}),
      ...(data.amount !== undefined ? { amount: data.amount } : {}),
      ...(data.date !== undefined ? { date: parseBusinessDate(data.date) } : {}),
    },
  });

  if (existing.type === 'expense_fixed') {
    await syncFixedCostRecord(id, data);
  } else if (existing.type === 'expense_product') {
    await syncProductCostRecord(id, data);
  }

  return updated;
}

export async function deleteExpenseRecord(id: string) {
  const existing = await prisma.transaction.findUnique({ where: { id } });
  if (!existing || !EXPENSE_TYPES.includes(existing.type as (typeof EXPENSE_TYPES)[number])) {
    throw ApiError.notFound('Expense not found');
  }

  try {
    await prisma.fixedCostRecord.deleteMany({ where: { transactionId: id } });
    await prisma.productCostRecord.deleteMany({ where: { transactionId: id } });
    await prisma.transaction.delete({ where: { id } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        throw ApiError.notFound('Expense not found');
      }
      if (error.code === 'P2003') {
        throw ApiError.conflict('Expense cannot be deleted because related records still depend on it');
      }
    }
    throw error;
  }
}

export async function listExpenseRecords(query: {
  type?: ExpenseCreateInput['type'];
  category?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}) {
  const { skip, take } = paginate(query.page, query.limit);

  return prisma.transaction.findMany({
    where: {
      type: query.type ?? { in: [...EXPENSE_TYPES] },
      ...(query.category ? { category: query.category } : {}),
      ...dateRangeWhere(query.startDate, query.endDate),
    },
    orderBy: { date: 'desc' },
    skip,
    take,
  });
}

export async function getExpenseRecord(id: string) {
  const expense = await prisma.transaction.findUnique({ where: { id } });
  if (!expense || !EXPENSE_TYPES.includes(expense.type as (typeof EXPENSE_TYPES)[number])) {
    throw ApiError.notFound('Expense not found');
  }
  return expense;
}

export async function expenseStatsRecords(query: { startDate?: string; endDate?: string }) {
  const range = dateRangeWhere(query.startDate, query.endDate);

  const [byType, byCategory] = await Promise.all([
    prisma.transaction.groupBy({
      by: ['type'],
      where: { type: { in: [...EXPENSE_TYPES] }, ...range },
      _sum: { amount: true },
    }),
    prisma.transaction.groupBy({
      by: ['category'],
      where: { type: { in: [...EXPENSE_TYPES] }, ...range },
      _sum: { amount: true },
    }),
  ]);

  return { byType, byCategory };
}

export async function listExpensesByType(
  type: (typeof EXPENSE_TYPES)[number],
  query: { startDate?: string; endDate?: string },
) {
  return prisma.transaction.findMany({
    where: { type, ...dateRangeWhere(query.startDate, query.endDate) },
    orderBy: { date: 'desc' },
  });
}

/** Backfill detail tables from existing expense transactions. */
export async function backfillExpenseRecords() {
  const expenses = await prisma.transaction.findMany({
    where: { type: { in: [...EXPENSE_TYPES] } },
  });

  let count = 0;
  for (const tx of expenses) {
    if (!tx.method) continue;
    const payload: ExpenseCreateInput = {
      type: tx.type as ExpenseCreateInput['type'],
      category: tx.category ?? (tx.type === 'expense_product' ? 'Product' : 'Fixed'),
      item: tx.description,
      description: tx.description,
      supplier: tx.supplier ?? undefined,
      quantity: tx.quantity ? Number(tx.quantity) : undefined,
      unit: tx.unit ?? undefined,
      unitPrice: tx.unitPrice ? Number(tx.unitPrice) : undefined,
      amount: Number(tx.amount),
      paymentMethod: tx.method ?? 'cash',
      date: tx.date.toISOString(),
    };

    if (tx.type === 'expense_fixed') {
      const exists = await prisma.fixedCostRecord.findUnique({ where: { transactionId: tx.id } });
      if (!exists) {
        await createFixedCostRecord(tx.id, payload, tx.date);
        count++;
      }
    } else {
      const exists = await prisma.productCostRecord.findUnique({ where: { transactionId: tx.id } });
      if (!exists) {
        await createProductCostRecord(tx.id, payload, tx.date);
        count++;
      }
    }
  }

  return count;
}
