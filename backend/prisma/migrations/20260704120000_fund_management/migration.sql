-- Fund Management: dedicated accounts + movement ledger

-- ── Enums ────────────────────────────────────────────────────────────────────
CREATE TYPE "FundAccountType" AS ENUM ('cash', 'bank', 'bkash', 'reserve');
CREATE TYPE "FundMovementType" AS ENUM ('transfer', 'add', 'withdraw', 'opening');

-- ── Reference code sequence ──────────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS "fund_movement_code_seq";

-- ── Fund accounts (materialized balances) ──────────────────────────────────
CREATE TABLE "fund_accounts" (
    "id" TEXT NOT NULL,
    "type" "FundAccountType" NOT NULL,
    "label" TEXT NOT NULL,
    "balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fund_accounts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "fund_accounts_type_key" ON "fund_accounts"("type");

-- Seed the four internal accounts with zero balance
INSERT INTO "fund_accounts" ("id", "type", "label", "balance", "createdAt", "updatedAt") VALUES
  ('fac_cash',    'cash',    'Cash Drawer',   0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('fac_bank',    'bank',    'Bank Account',  0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('fac_bkash',   'bkash',   'bKash Wallet',  0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('fac_reserve', 'reserve', 'Reserve Fund',  0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- ── Fund movements (transaction ledger) ──────────────────────────────────────
CREATE TABLE "fund_movements" (
    "id" TEXT NOT NULL,
    "code" TEXT DEFAULT ('FND-'::text || lpad((nextval('fund_movement_code_seq'::regclass))::text, 6, '0'::text)),
    "movement_type" "FundMovementType" NOT NULL,
    "from_account_id" TEXT,
    "to_account_id" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "transaction_date" TIMESTAMP(3) NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fund_movements_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "fund_movements_code_key" ON "fund_movements"("code");
CREATE INDEX "fund_movements_transaction_date_idx" ON "fund_movements"("transaction_date");
CREATE INDEX "fund_movements_movement_type_idx" ON "fund_movements"("movement_type");

ALTER TABLE "fund_movements" ADD CONSTRAINT "fund_movements_from_account_id_fkey"
  FOREIGN KEY ("from_account_id") REFERENCES "fund_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "fund_movements" ADD CONSTRAINT "fund_movements_to_account_id_fkey"
  FOREIGN KEY ("to_account_id") REFERENCES "fund_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "fund_movements" ADD CONSTRAINT "fund_movements_created_by_fkey"
  FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
