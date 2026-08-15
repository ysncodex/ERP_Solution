import { z } from 'zod';

const menuCategories = [
  'Add On',
  'Affogato',
  'Chicken',
  'Coffee',
  'Iced Coffee',
  'Milk Tea',
  'Mocktails',
  'Pasta',
  'Shakes',
  'Sides',
  'Waffle Menu',
] as const;

export const menuItemCreateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  category: z.enum(menuCategories),
  price: z.coerce.number().positive('Price must be greater than 0'),
  available: z.boolean().default(true),
  description: z.string().optional(),
});

// FIX: Explicitly map the update schema WITHOUT .default(true)
// so Zod doesn't accidentally reset unavailable items back to true on edits.
export const menuItemUpdateSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  category: z.enum(menuCategories).optional(),
  price: z.coerce.number().positive().optional(),
  available: z.boolean().optional(),
  description: z.string().optional(),
});

export const menuListQuerySchema = z.object({
  category: z.enum(menuCategories).optional(),
  // FIX: Robustly handles both boolean and string representations
  // ensuring the New Order page filters unavailable items perfectly.
  available: z.preprocess((val) => {
    if (val === 'true' || val === true) return true;
    if (val === 'false' || val === false) return false;
    return undefined;
  }, z.boolean().optional()),
  search: z.string().optional(),
});

export type MenuItemCreateInput = z.infer<typeof menuItemCreateSchema>;
