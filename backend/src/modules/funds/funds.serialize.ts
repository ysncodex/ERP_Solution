import type { FundAccount, FundMovement, User } from '../../generated/prisma/client.js';

type FundMovementWithRelations = FundMovement & {
  fromAccount?: FundAccount | null;
  toAccount?: FundAccount | null;
  createdBy?: Pick<User, 'id' | 'name'> | null;
};

export function serializeFundMovement(movement: FundMovementWithRelations) {
  return {
    id: movement.id,
    code: movement.code ?? undefined,
    movementType: movement.movementType,
    fromAccount: movement.fromAccount?.type ?? undefined,
    toAccount: movement.toAccount?.type ?? undefined,
    fromAccountId: movement.fromAccountId ?? undefined,
    toAccountId: movement.toAccountId ?? undefined,
    amount: Number(movement.amount),
    date: movement.transactionDate.toISOString(),
    notes: movement.notes,
    createdBy: movement.createdBy
      ? { id: movement.createdBy.id, name: movement.createdBy.name }
      : undefined,
    createdAt: movement.createdAt.toISOString(),
    updatedAt: movement.updatedAt.toISOString(),
  };
}

export function serializeFundAccount(account: FundAccount) {
  return {
    id: account.id,
    type: account.type,
    label: account.label,
    balance: Number(account.balance),
    updatedAt: account.updatedAt.toISOString(),
  };
}
