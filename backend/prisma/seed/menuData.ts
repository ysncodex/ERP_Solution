/**
 * ERP_Solutions demo Products List — sample cafe catalog for demos / new clients.
 * Stable slug ids keep POS seed sales in sync across re-seeds.
 */

export type SeedMenuCategory =
  | 'Add On'
  | 'Affogato'
  | 'Chicken'
  | 'Coffee'
  | 'Iced Coffee'
  | 'Milk Tea'
  | 'Mocktails'
  | 'Pasta'
  | 'Shakes'
  | 'Sides'
  | 'Waffle Menu';

export interface SeedMenuItem {
  id: string;
  name: string;
  category: SeedMenuCategory;
  price: number;
  available: boolean;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Clean sample menu (not a live client catalog). */
const RAW: Omit<SeedMenuItem, 'id'>[] = [
  // Coffee
  { name: 'Espresso', category: 'Coffee', price: 80, available: true },
  { name: 'Double Espresso', category: 'Coffee', price: 120, available: true },
  { name: 'Americano', category: 'Coffee', price: 150, available: true },
  { name: 'Cappuccino', category: 'Coffee', price: 200, available: true },
  { name: 'Cafe Latte', category: 'Coffee', price: 220, available: true },
  { name: 'Flat White', category: 'Coffee', price: 230, available: true },
  { name: 'Mocha', category: 'Coffee', price: 240, available: true },
  { name: 'Caramel Latte', category: 'Coffee', price: 260, available: true },
  { name: 'Hazelnut Latte', category: 'Coffee', price: 260, available: true },
  { name: 'Hot Chocolate', category: 'Coffee', price: 180, available: true },

  // Iced Coffee
  { name: 'Iced Americano', category: 'Iced Coffee', price: 180, available: true },
  { name: 'Iced Latte', category: 'Iced Coffee', price: 240, available: true },
  { name: 'Iced Mocha', category: 'Iced Coffee', price: 260, available: true },
  { name: 'Iced Caramel Latte', category: 'Iced Coffee', price: 280, available: true },
  { name: 'Cold Brew', category: 'Iced Coffee', price: 250, available: true },
  { name: 'Spanish Latte', category: 'Iced Coffee', price: 290, available: true },

  // Milk Tea
  { name: 'Classic Milk Tea', category: 'Milk Tea', price: 180, available: true },
  { name: 'Brown Sugar Milk Tea', category: 'Milk Tea', price: 220, available: true },
  { name: 'Thai Milk Tea', category: 'Milk Tea', price: 200, available: true },
  { name: 'Matcha Milk Tea', category: 'Milk Tea', price: 240, available: true },
  { name: 'Taro Milk Tea', category: 'Milk Tea', price: 230, available: true },
  { name: 'Milk Tea with Boba', category: 'Milk Tea', price: 250, available: true },

  // Mocktails
  { name: 'Fresh Lemonade', category: 'Mocktails', price: 120, available: true },
  { name: 'Mint Lemonade', category: 'Mocktails', price: 140, available: true },
  { name: 'Virgin Mojito', category: 'Mocktails', price: 160, available: true },
  { name: 'Blue Lagoon', category: 'Mocktails', price: 170, available: true },
  { name: 'Mango Cooler', category: 'Mocktails', price: 180, available: true },
  { name: 'Orange Fizz', category: 'Mocktails', price: 150, available: true },

  // Affogato
  { name: 'Classic Affogato', category: 'Affogato', price: 200, available: true },
  { name: 'Chocolate Affogato', category: 'Affogato', price: 220, available: true },
  { name: 'Caramel Affogato', category: 'Affogato', price: 230, available: true },

  // Shakes
  { name: 'Vanilla Shake', category: 'Shakes', price: 180, available: true },
  { name: 'Chocolate Shake', category: 'Shakes', price: 200, available: true },
  { name: 'Strawberry Shake', category: 'Shakes', price: 200, available: true },
  { name: 'Mango Shake', category: 'Shakes', price: 210, available: true },
  { name: 'Oreo Shake', category: 'Shakes', price: 240, available: true },
  { name: 'KitKat Shake', category: 'Shakes', price: 250, available: true },

  // Waffle Menu
  { name: 'Plain Waffle', category: 'Waffle Menu', price: 140, available: true },
  { name: 'Chocolate Waffle', category: 'Waffle Menu', price: 180, available: true },
  { name: 'Nutella Waffle', category: 'Waffle Menu', price: 200, available: true },
  { name: 'Strawberry Waffle', category: 'Waffle Menu', price: 220, available: true },
  { name: 'Banana Waffle', category: 'Waffle Menu', price: 210, available: true },
  { name: 'Ice Cream Waffle', category: 'Waffle Menu', price: 250, available: true },

  // Chicken / savory
  { name: 'Chicken Sandwich', category: 'Chicken', price: 260, available: true },
  { name: 'Club Sandwich', category: 'Chicken', price: 280, available: true },
  { name: 'Chicken Wrap', category: 'Chicken', price: 240, available: true },
  { name: 'Egg Cheese Sandwich', category: 'Chicken', price: 180, available: true },

  // Pasta
  { name: 'Alfredo Pasta', category: 'Pasta', price: 320, available: true },
  { name: 'Chicken Alfredo Pasta', category: 'Pasta', price: 380, available: true },
  { name: 'Arrabbiata Pasta', category: 'Pasta', price: 300, available: true },
  { name: 'Pesto Pasta', category: 'Pasta', price: 340, available: true },

  // Sides
  { name: 'French Fries', category: 'Sides', price: 120, available: true },
  { name: 'Peri Peri Fries', category: 'Sides', price: 140, available: true },
  { name: 'Potato Wedges', category: 'Sides', price: 150, available: true },
  { name: 'Garlic Bread', category: 'Sides', price: 100, available: true },

  // Add On
  { name: 'Extra Shot', category: 'Add On', price: 40, available: true },
  { name: 'Extra Boba', category: 'Add On', price: 50, available: true },
  { name: 'Whipped Cream', category: 'Add On', price: 40, available: true },
  { name: 'Ice Cream Scoop', category: 'Add On', price: 60, available: true },
  { name: 'Extra Sauce', category: 'Add On', price: 30, available: true },
];

export const SEED_MENU: SeedMenuItem[] = RAW.map((item, index) => ({
  ...item,
  id: `${slugify(item.category)}-${slugify(item.name)}-${index + 1}`,
}));
