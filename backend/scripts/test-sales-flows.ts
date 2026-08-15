/**
 * Smoke-test POS sale flows against the live DATABASE_URL.
 * Run: npx tsx scripts/test-sales-flows.ts
 */
import { createSaleRecord, updateSaleRecord, deleteSaleRecord } from '../src/modules/sales/sales.service.js';
import { prisma } from '../src/lib/prisma.js';

async function main() {
  console.log('→ Testing pending order (no payment method)...');
  const pending = await createSaleRecord({
    channel: 'in_store',
    amount: 250,
    description: 'Test pending order',
    date: new Date().toISOString(),
    orderNumber: `TEST-PENDING-${Date.now()}`,
    receiptStatus: 'pending',
    posChannel: 'in_store',
    receiptLines: [{ name: 'Americano', qty: 1, unitPrice: 250, menuItemId: 'menu-default-0-americano' }],
    orderItems: [{ name: 'Americano', unitPrice: 250, quantity: 1, menuItemId: 'menu-default-0-americano' }],
  });

  const pendingTx = await prisma.transaction.findUnique({ where: { id: pending.id }, include: { order: true } });
  if (pendingTx?.method !== null || pendingTx?.order?.paymentMethod !== null) {
    throw new Error('Pending order should not have payment method set');
  }
  console.log('✔ Pending order saved without payment method');

  console.log('→ Completing payment (bkash, change)...');
  await updateSaleRecord(pending.id, {
    receiptStatus: 'completed',
    paymentMethod: 'bkash',
    customerPaid: 300,
    changeAmount: 50,
  });

  const paid = await prisma.transaction.findUnique({ where: { id: pending.id }, include: { order: true } });
  if (paid?.method !== 'bkash' || paid?.order?.paymentMethod !== 'bkash') {
    throw new Error('Payment method not synced');
  }
  if (Number(paid?.order?.customerPaid) !== 300 || Number(paid?.order?.changeAmount) !== 50) {
    throw new Error('Customer paid / change not synced to orders table');
  }
  console.log('✔ Payment completion synced transaction + order');

  console.log('→ Testing gift order (zero total)...');
  const gift = await createSaleRecord({
    channel: 'in_store',
    paymentMethod: 'cash',
    amount: 0,
    description: 'Gift order test',
    date: new Date().toISOString(),
    orderNumber: `TEST-GIFT-${Date.now()}`,
    receiptStatus: 'completed',
    posChannel: 'in_store',
    giftItemCount: 1,
    giftTotalValue: 150,
    receiptLines: [{
      name: 'Espresso (Gift)',
      qty: 1,
      unitPrice: 0,
      isGift: true,
      originalUnitPrice: 150,
      menuItemId: 'menu-default-2-espresso-single',
    }],
    orderItems: [{
      name: 'Espresso (Single)',
      unitPrice: 0,
      quantity: 1,
      isGift: true,
      menuItemId: 'menu-default-2-espresso-single',
    }],
  });

  const giftOrder = await prisma.order.findFirst({ where: { saleTransactionId: gift.id }, include: { items: true } });
  if (!giftOrder || giftOrder.items.length !== 1 || !giftOrder.items[0]?.isGift) {
    throw new Error('Gift order items not saved');
  }
  console.log('✔ Gift order saved');

  await deleteSaleRecord(pending.id);
  await deleteSaleRecord(gift.id);
  console.log('✔ Cleanup done');
}

main()
  .catch((err) => {
    console.error('Test failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
