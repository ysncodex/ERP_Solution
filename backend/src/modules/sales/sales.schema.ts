import { z } from 'zod';

export const receiptLineSchema = z.object({
  name: z.string(),
  qty: z.number().int().positive(),
  unitPrice: z.number().min(0),
  menuItemId: z.string().optional(),
  isGift: z.boolean().optional(),
  giftReason: z.string().optional(),
  originalUnitPrice: z.number().optional(),
});

export const orderItemSchema = z.object({
  menuItemId: z.string().optional(),
  name: z.string(),
  unitPrice: z.number().min(0),
  quantity: z.number().int().positive(),
  notes: z.string().optional(),
  isGift: z.boolean().optional(),
  giftReason: z.string().optional(),
});

const saleBaseSchema = z.object({
  channel: z.enum(['in_store', 'foodpanda', 'foodi']),
  paymentMethod: z.enum(['cash', 'bank', 'bkash']).optional(),
  amount: z.number().min(0),
  description: z.string().optional(),
  date: z.string().min(1, 'Date is required'),
  orderNumber: z.string().optional(),
  receiptStatus: z.enum(['pending', 'completed', 'refunded', 'voided']).optional(),
  posChannel: z.enum(['in_store', 'takeaway', 'delivery']).optional(),
  customerName: z.string().optional(),
  tableNumber: z.string().optional(),
  category: z.string().optional(),
  quantity: z.number().optional(),
  discountAmount: z.number().optional(),
  giftItemCount: z.number().optional(),
  giftTotalValue: z.number().optional(),
  cashier: z.string().optional(),
  receiptLines: z.array(receiptLineSchema).optional(),
  subtotal: z.number().optional(),
  customerPaid: z.number().optional(),
  changeAmount: z.number().optional(),
  discountType: z.enum(['flat', 'percent']).optional(),
  discountValue: z.number().optional(),
  tax: z.number().optional(),
  orderItems: z.array(orderItemSchema).optional(),
});

export const saleCreateSchema = saleBaseSchema.superRefine((data, ctx) => {
  const isPending = data.receiptStatus === 'pending';

  if (!isPending && !data.paymentMethod) {
    ctx.addIssue({
      code: 'custom',
      message: 'Payment method is required for completed sales',
      path: ['paymentMethod'],
    });
  }

  if (!isPending && data.amount <= 0 && !data.orderNumber) {
    ctx.addIssue({
      code: 'custom',
      message: 'Amount must be greater than 0',
      path: ['amount'],
    });
  }
});

export const saleUpdateSchema = saleBaseSchema.partial().extend({
  receiptStatus: z.enum(['pending', 'completed', 'refunded', 'voided']).optional(),
});

export const salesListQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  channel: z.enum(['in_store', 'foodpanda', 'foodi']).optional(),
  receiptStatus: z.enum(['pending', 'completed', 'refunded', 'voided']).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
});

export const statsQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type SaleCreateInput = z.infer<typeof saleCreateSchema>;
export type SaleUpdateInput = z.infer<typeof saleUpdateSchema>;
