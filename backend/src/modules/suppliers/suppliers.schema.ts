import { z } from 'zod';
import { normalizeCatalogName } from '../../utils/normalizeName.js';

export const supplierCreateSchema = z.object({
  name: z.string().min(1, 'Supplier name is required').max(200).transform(normalizeCatalogName),
  phone: z.string().min(1, 'Contact number is required').max(50),
  email: z
    .string()
    .email('Invalid email address')
    .optional()
    .or(z.literal(''))
    .transform((v) => v || undefined),
  address: z.string().min(1, 'Address is required').max(500),
  notes: z.string().max(1000).optional().or(z.literal('')).transform((v) => v || undefined),
});

export const supplierUpdateSchema = supplierCreateSchema.partial();

export type SupplierCreateInput = z.infer<typeof supplierCreateSchema>;
export type SupplierUpdateInput = z.infer<typeof supplierUpdateSchema>;
