import { z } from 'zod';

export const dailyQuerySchema = z.object({
  date: z.string().min(1, 'date is required (YYYY-MM-DD)'),
});

export const monthlyQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, 'month must be in YYYY-MM format'),
});

export const rangeQuerySchema = z.object({
  startDate: z.string().min(1, 'startDate is required'),
  endDate: z.string().min(1, 'endDate is required'),
});

export const exportQuerySchema = z.object({
  type: z.enum(['daily', 'monthly', 'custom']).default('custom'),
  format: z.enum(['pdf', 'excel', 'csv']).default('csv'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});
