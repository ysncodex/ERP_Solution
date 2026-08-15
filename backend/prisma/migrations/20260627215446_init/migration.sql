-- CreateEnum
CREATE TYPE "Role" AS ENUM ('owner', 'manager', 'visitor');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('sale', 'sale_adjustment', 'expense_product', 'expense_fixed');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('cash', 'bank', 'bkash');

-- CreateEnum
CREATE TYPE "SalesChannel" AS ENUM ('in_store', 'foodpanda', 'foodi');

-- CreateEnum
CREATE TYPE "PosChannel" AS ENUM ('in_store', 'takeaway', 'delivery');

-- CreateEnum
CREATE TYPE "UnitType" AS ENUM ('kg', 'g', 'L', 'ml', 'pcs', 'box', 'pack');

-- CreateEnum
CREATE TYPE "ReceiptStatus" AS ENUM ('pending', 'completed', 'refunded', 'voided');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('flat', 'percent');

-- CreateEnum
CREATE TYPE "MenuCategory" AS ENUM ('Add On', 'Affogato', 'Chicken', 'Coffee', 'Iced Coffee', 'Milk Tea', 'Mocktails', 'Pasta', 'Shakes', 'Sides', 'Waffle Menu');

-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('purchase', 'pos_deduction', 'wastage', 'adjustment');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'visitor',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "category" TEXT,
    "channel" "SalesChannel",
    "description" TEXT NOT NULL DEFAULT '',
    "quantity" DECIMAL(12,3),
    "unit" "UnitType",
    "unitPrice" DECIMAL(12,2),
    "supplier" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "cashier" TEXT,
    "customerName" TEXT,
    "loyaltyMemberId" TEXT,
    "receiptLines" JSONB,
    "discountAmount" DECIMAL(12,2),
    "vatRatePercent" DECIMAL(5,2),
    "receiptStatus" "ReceiptStatus",
    "orderNumber" TEXT,
    "tableNumber" TEXT,
    "posChannel" "PosChannel",
    "giftItemCount" INTEGER,
    "giftTotalValue" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_items" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "MenuCategory" NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "menu_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "customerName" TEXT NOT NULL DEFAULT '',
    "tableNumber" TEXT NOT NULL DEFAULT '',
    "paymentMethod" "PaymentMethod" NOT NULL,
    "channel" "PosChannel" NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "discount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discountType" "DiscountType",
    "discountValue" DECIMAL(12,2),
    "tax" DECIMAL(12,2),
    "total" DECIMAL(12,2) NOT NULL,
    "customerPaid" DECIMAL(12,2) NOT NULL,
    "changeAmount" DECIMAL(12,2) NOT NULL,
    "cashierName" TEXT NOT NULL DEFAULT '',
    "giftItemCount" INTEGER,
    "giftTotalValue" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "saleTransactionId" TEXT,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "menuItemId" TEXT,
    "nameSnapshot" TEXT NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "notes" TEXT,
    "isGift" BOOLEAN NOT NULL DEFAULT false,
    "giftReason" TEXT,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_items" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "unit" "UnitType" NOT NULL,
    "parLevel" DECIMAL(12,3) NOT NULL,
    "unitCostBdt" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "type" "StockMovementType" NOT NULL,
    "qtySigned" DECIMAL(12,3) NOT NULL,
    "note" TEXT,
    "summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_lots" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "qty" DECIMAL(12,3) NOT NULL,
    "expiryDate" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_lots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "transactions_date_idx" ON "transactions"("date");

-- CreateIndex
CREATE INDEX "transactions_type_idx" ON "transactions"("type");

-- CreateIndex
CREATE INDEX "transactions_channel_idx" ON "transactions"("channel");

-- CreateIndex
CREATE INDEX "transactions_type_date_idx" ON "transactions"("type", "date");

-- CreateIndex
CREATE INDEX "menu_items_category_idx" ON "menu_items"("category");

-- CreateIndex
CREATE UNIQUE INDEX "orders_orderNumber_key" ON "orders"("orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "orders_saleTransactionId_key" ON "orders"("saleTransactionId");

-- CreateIndex
CREATE INDEX "orders_createdAt_idx" ON "orders"("createdAt");

-- CreateIndex
CREATE INDEX "order_items_orderId_idx" ON "order_items"("orderId");

-- CreateIndex
CREATE INDEX "order_items_menuItemId_idx" ON "order_items"("menuItemId");

-- CreateIndex
CREATE UNIQUE INDEX "stock_items_sku_key" ON "stock_items"("sku");

-- CreateIndex
CREATE INDEX "stock_movements_itemId_idx" ON "stock_movements"("itemId");

-- CreateIndex
CREATE INDEX "stock_movements_type_idx" ON "stock_movements"("type");

-- CreateIndex
CREATE INDEX "stock_lots_itemId_idx" ON "stock_lots"("itemId");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_saleTransactionId_fkey" FOREIGN KEY ("saleTransactionId") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "menu_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "stock_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_lots" ADD CONSTRAINT "stock_lots_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "stock_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
