import { MenuCategory } from '../../src/generated/prisma/enums.js';
import type { SeedMenuCategory } from './menuData.js';

/** Map frontend category labels to Prisma enum members. */
export const SEED_CATEGORY: Record<SeedMenuCategory, MenuCategory> = {
  'Add On': MenuCategory.AddOn,
  Affogato: MenuCategory.Affogato,
  Chicken: MenuCategory.Chicken,
  Coffee: MenuCategory.Coffee,
  'Iced Coffee': MenuCategory.IcedCoffee,
  'Milk Tea': MenuCategory.MilkTea,
  Mocktails: MenuCategory.Mocktails,
  Pasta: MenuCategory.Pasta,
  Shakes: MenuCategory.Shakes,
  Sides: MenuCategory.Sides,
  'Waffle Menu': MenuCategory.WaffleMenu,
};
