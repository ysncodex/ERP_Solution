import { z } from 'zod';

const fundAccountTypeSchema = z.enum(['cash', 'bank', 'bkash', 'reserve']);
const fundMovementTypeSchema = z.enum(['transfer', 'add', 'withdraw', 'opening']);

/** React Hook Form sends "" for hidden selects; treat as omitted. */
const optionalFundAccountSchema = z.preprocess(
  (value) => (value === '' || value === null || value === undefined ? undefined : value),
  fundAccountTypeSchema.optional(),
);

export const fundMovementCreateSchema = z
  .object({
    movementType: fundMovementTypeSchema,
    fromAccount: optionalFundAccountSchema,
    toAccount: optionalFundAccountSchema,
    amount: z.number().positive('Amount must be greater than 0'),
    date: z.string().min(1, 'Date is required'),
    notes: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.movementType === 'transfer') {
      if (!data.fromAccount) {
        ctx.addIssue({ code: 'custom', message: 'From account is required', path: ['fromAccount'] });
      }
      if (!data.toAccount) {
        ctx.addIssue({ code: 'custom', message: 'To account is required', path: ['toAccount'] });
      }
      if (data.fromAccount && data.toAccount && data.fromAccount === data.toAccount) {
        ctx.addIssue({
          code: 'custom',
          message: 'Cannot transfer to the same account',
          path: ['toAccount'],
        });
      }
    }

    if ((data.movementType === 'add' || data.movementType === 'opening') && !data.toAccount) {
      ctx.addIssue({ code: 'custom', message: 'To account is required', path: ['toAccount'] });
    }

    if (data.movementType === 'withdraw' && !data.fromAccount) {
      ctx.addIssue({ code: 'custom', message: 'From account is required', path: ['fromAccount'] });
    }
  });

export const fundMovementsListQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  movementType: fundMovementTypeSchema.optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
});

export type FundMovementCreateInput = z.infer<typeof fundMovementCreateSchema>;
