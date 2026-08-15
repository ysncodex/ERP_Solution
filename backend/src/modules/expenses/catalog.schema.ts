import { z } from 'zod';

export const catalogNameSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
});

export const catalogRenameSchema = catalogNameSchema;

export type CatalogNameInput = z.infer<typeof catalogNameSchema>;
