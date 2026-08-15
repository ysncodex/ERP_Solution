import type { MenuItem } from '../generated/prisma/client.js';
import { serializeMenuCategory } from './menuCategory.js';

/** Map a Prisma MenuItem row to the frontend `MenuItem` shape. */
export function serializeMenuItem(item: MenuItem) {
  return {
    id: item.id,
    name: item.name,
    category: serializeMenuCategory(item.category),
    price: Number(item.price),
    available: item.available,
    description: item.description ?? undefined,
  };
}
