import { MenuCategory } from '../generated/prisma/enums.js';

/** Frontend category label → Prisma enum member. */
const LABEL_TO_ENUM: Record<string, MenuCategory> = {
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

/** Prisma enum member → frontend category label. */
const ENUM_TO_LABEL: Record<MenuCategory, string> = {
  [MenuCategory.AddOn]: 'Add On',
  [MenuCategory.Affogato]: 'Affogato',
  [MenuCategory.Chicken]: 'Chicken',
  [MenuCategory.Coffee]: 'Coffee',
  [MenuCategory.IcedCoffee]: 'Iced Coffee',
  [MenuCategory.MilkTea]: 'Milk Tea',
  [MenuCategory.Mocktails]: 'Mocktails',
  [MenuCategory.Pasta]: 'Pasta',
  [MenuCategory.Shakes]: 'Shakes',
  [MenuCategory.Sides]: 'Sides',
  [MenuCategory.WaffleMenu]: 'Waffle Menu',
};

export function parseMenuCategory(value: string): MenuCategory {
  const cat = LABEL_TO_ENUM[value];
  if (!cat) throw new Error(`Invalid menu category: ${value}`);
  return cat;
}

export function serializeMenuCategory(value: MenuCategory): string {
  return ENUM_TO_LABEL[value] ?? value;
}
