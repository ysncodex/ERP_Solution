-- Allow null payment method on pending POS orders (payment collected later).
ALTER TABLE "transactions" ALTER COLUMN "method" DROP NOT NULL;
ALTER TABLE "orders" ALTER COLUMN "paymentMethod" DROP NOT NULL;
