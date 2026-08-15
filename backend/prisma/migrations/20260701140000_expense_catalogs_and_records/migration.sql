-- Expense catalogs, detail records, and suppliers

CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "fixed_cost_items" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fixed_cost_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "product_cost_items" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_cost_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "fixed_cost_records" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "fixedCostItemId" TEXT,
    "nameSnapshot" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "amount" DECIMAL(12,2) NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fixed_cost_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "product_cost_records" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "productCostItemId" TEXT,
    "supplierId" TEXT,
    "nameSnapshot" TEXT NOT NULL,
    "supplierSnapshot" TEXT,
    "quantity" DECIMAL(12,3),
    "unit" "UnitType",
    "unitPrice" DECIMAL(12,2),
    "amount" DECIMAL(12,2) NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_cost_records_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "suppliers_name_key" ON "suppliers"("name");
CREATE UNIQUE INDEX "fixed_cost_items_name_key" ON "fixed_cost_items"("name");
CREATE UNIQUE INDEX "product_cost_items_name_key" ON "product_cost_items"("name");
CREATE UNIQUE INDEX "fixed_cost_records_transactionId_key" ON "fixed_cost_records"("transactionId");
CREATE UNIQUE INDEX "product_cost_records_transactionId_key" ON "product_cost_records"("transactionId");
CREATE INDEX "fixed_cost_records_date_idx" ON "fixed_cost_records"("date");
CREATE INDEX "fixed_cost_records_fixedCostItemId_idx" ON "fixed_cost_records"("fixedCostItemId");
CREATE INDEX "product_cost_records_date_idx" ON "product_cost_records"("date");
CREATE INDEX "product_cost_records_productCostItemId_idx" ON "product_cost_records"("productCostItemId");
CREATE INDEX "product_cost_records_supplierId_idx" ON "product_cost_records"("supplierId");

ALTER TABLE "fixed_cost_records" ADD CONSTRAINT "fixed_cost_records_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "fixed_cost_records" ADD CONSTRAINT "fixed_cost_records_fixedCostItemId_fkey" FOREIGN KEY ("fixedCostItemId") REFERENCES "fixed_cost_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "product_cost_records" ADD CONSTRAINT "product_cost_records_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_cost_records" ADD CONSTRAINT "product_cost_records_productCostItemId_fkey" FOREIGN KEY ("productCostItemId") REFERENCES "product_cost_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "product_cost_records" ADD CONSTRAINT "product_cost_records_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
