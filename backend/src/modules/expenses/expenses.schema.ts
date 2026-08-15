import { z } from 'zod';

export const expenseCreateSchema = z.object({
  type: z.enum(['expense_product', 'expense_fixed']),
  category: z.string().min(1, 'Category is required'),
  item: z.string().optional(),
  supplier: z.string().optional(),
  quantity: z.number().positive().optional(),
  unit: z.enum(['kg', 'g', 'L', 'ml', 'pcs', 'box', 'pack']).optional(),
  unitPrice: z.number().nonnegative().optional(),
  amount: z.number().positive('Amount must be greater than 0'),
  paymentMethod: z.enum(['cash', 'bank', 'bkash']),
  description: z.string().optional(),
  date: z.string().min(1, 'Date is required'),
});

export const expenseUpdateSchema = expenseCreateSchema.partial();

export const expensesListQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  type: z.enum(['expense_product', 'expense_fixed']).optional(),
  category: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
});

export const statsQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type ExpenseCreateInput = z.infer<typeof expenseCreateSchema>;
export type ExpenseUpdateInput = z.infer<typeof expenseUpdateSchema>;
