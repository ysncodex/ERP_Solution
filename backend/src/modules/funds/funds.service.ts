import { prisma } from '../../lib/prisma.js';
import { ApiError } from '../../utils/ApiError.js';
import { parseBusinessDate } from '../../utils/businessDate.js';
import { dateRangeWhere, paginate } from '../../utils/query.js';
import type { FundAccountType, FundMovementType } from '../../generated/prisma/enums.js';
import type { FundMovementCreateInput } from './funds.schema.js';
import {
  assertSufficientMethodBalance,
  clampBalances,
  computeRawCombinedBalances,
} from './balanceGuard.js';

const FUND_ACCOUNT_TYPES: FundAccountType[] = ['cash', 'bank', 'bkash', 'reserve'];

const ACCOUNT_LABELS: Record<FundAccountType, string> = {
  cash: 'Cash Drawer',
  bank: 'Bank Account',
  bkash: 'bKash Wallet',
  reserve: 'Reserve Fund',
};

const movementInclude = {
  fromAccount: true,
  toAccount: true,
  createdBy: { select: { id: true, name: true } },
} as const;

type DbClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

async function getAccountByType(type: FundAccountType, tx: DbClient = prisma) {
  const account = await tx.fundAccount.findUnique({ where: { type } });
  if (!account) {
    throw ApiError.notFound(`Fund account "${type}" is not configured`);
  }
  return account;
}

async function decrementAccountBalance(accountId: string, amount: number, tx: DbClient) {
  const account = await tx.fundAccount.findUnique({ where: { id: accountId } });
  if (!account) throw ApiError.notFound('Source account not found');

  const current = Number(account.balance);
  if (current + 1e-9 < amount) {
    throw ApiError.badRequest(
      `Insufficient ${account.label} fund balance. Available ৳${Math.max(0, current).toLocaleString('en-IN')}, required ৳${amount.toLocaleString('en-IN')}.`,
    );
  }

  await tx.fundAccount.update({
    where: { id: accountId },
    data: { balance: { decrement: amount } },
  });
}

async function incrementAccountBalance(accountId: string, amount: number, tx: DbClient) {
  await tx.fundAccount.update({
    where: { id: accountId },
    data: { balance: { increment: amount } },
  });
}

interface MovementAccounts {
  fromAccountId: string | null;
  toAccountId: string | null;
}

async function resolveMovementAccounts(
  data: FundMovementCreateInput,
  tx: DbClient,
): Promise<MovementAccounts> {
  switch (data.movementType) {
    case 'transfer': {
      const from = await getAccountByType(data.fromAccount!, tx);
      const to = await getAccountByType(data.toAccount!, tx);
      return { fromAccountId: from.id, toAccountId: to.id };
    }
    case 'add':
    case 'opening': {
      const to = await getAccountByType(data.toAccount!, tx);
      return { fromAccountId: null, toAccountId: to.id };
    }
    case 'withdraw': {
      const from = await getAccountByType(data.fromAccount!, tx);
      return { fromAccountId: from.id, toAccountId: null };
    }
    default:
      throw ApiError.badRequest('Unsupported movement type');
  }
}

async function applyMovementBalanceChanges(
  movementType: FundMovementType,
  accounts: MovementAccounts,
  amount: number,
  tx: DbClient,
  direction: 'forward' | 'reverse',
) {
  const sign = direction === 'forward' ? 1 : -1;

  if (movementType === 'transfer') {
    if (sign === 1) {
      await decrementAccountBalance(accounts.fromAccountId!, amount, tx);
      await incrementAccountBalance(accounts.toAccountId!, amount, tx);
    } else {
      await incrementAccountBalance(accounts.fromAccountId!, amount, tx);
      await decrementAccountBalance(accounts.toAccountId!, amount, tx);
    }
    return;
  }

  if (movementType === 'add' || movementType === 'opening') {
    if (sign === 1) {
      await incrementAccountBalance(accounts.toAccountId!, amount, tx);
    } else {
      await decrementAccountBalance(accounts.toAccountId!, amount, tx);
    }
    return;
  }

  if (movementType === 'withdraw') {
    if (sign === 1) {
      await decrementAccountBalance(accounts.fromAccountId!, amount, tx);
    } else {
      await incrementAccountBalance(accounts.fromAccountId!, amount, tx);
    }
  }
}

export async function createFundMovement(data: FundMovementCreateInput, createdById?: string) {
  const businessDate = parseBusinessDate(data.date);
  const amount = data.amount;

  if (data.movementType === 'withdraw' && data.fromAccount) {
    await assertSufficientMethodBalance(data.fromAccount, amount);
  }
  if (data.movementType === 'transfer' && data.fromAccount) {
    await assertSufficientMethodBalance(data.fromAccount, amount);
  }

  return prisma.$transaction(
    async (tx) => {
      const accounts = await resolveMovementAccounts(data, tx);
      await applyMovementBalanceChanges(data.movementType, accounts, amount, tx, 'forward');

      return tx.fundMovement.create({
        data: {
          movementType: data.movementType,
          fromAccountId: accounts.fromAccountId,
          toAccountId: accounts.toAccountId,
          amount,
          transactionDate: businessDate,
          notes: data.notes?.trim() ?? '',
          createdById: createdById ?? null,
        },
        include: movementInclude,
      });
    },
    {
      maxWait: 10000,
      timeout: 20000,
    },
  );
}

export async function deleteFundMovement(id: string) {
  const existing = await prisma.fundMovement.findUnique({
    where: { id },
    include: { fromAccount: true, toAccount: true },
  });
  if (!existing) throw ApiError.notFound('Fund movement not found');

  const amount = Number(existing.amount);
  const accounts: MovementAccounts = {
    fromAccountId: existing.fromAccountId,
    toAccountId: existing.toAccountId,
  };

  await prisma.$transaction(
    async (tx) => {
      await applyMovementBalanceChanges(existing.movementType, accounts, amount, tx, 'reverse');
      await tx.fundMovement.delete({ where: { id } });
    },
    {
      maxWait: 10000,
      timeout: 20000,
    },
  );
}

export async function listFundMovements(query: {
  startDate?: string;
  endDate?: string;
  movementType?: FundMovementCreateInput['movementType'];
  page?: number;
  limit?: number;
}) {
  const { skip, take } = paginate(query.page, query.limit);
  const dateFilter = dateRangeWhere(query.startDate, query.endDate);
  const transactionDateFilter = 'date' in dateFilter ? { transactionDate: dateFilter.date } : {};

  return prisma.fundMovement.findMany({
    where: {
      ...(query.movementType ? { movementType: query.movementType } : {}),
      ...transactionDateFilter,
    },
    orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }],
    skip,
    take,
    include: movementInclude,
  });
}

export async function getFundMovement(id: string) {
  const movement = await prisma.fundMovement.findUnique({
    where: { id },
    include: movementInclude,
  });
  if (!movement) throw ApiError.notFound('Fund movement not found');
  return movement;
}

export async function listFundAccounts() {
  return prisma.fundAccount.findMany({ orderBy: { type: 'asc' } });
}

/** Combined balances: operational (sales/expenses) + fund movement adjustments. */
export async function getCombinedAccountBalances() {
  const fundAccounts = await prisma.fundAccount.findMany();
  const raw = await computeRawCombinedBalances();
  const combined = clampBalances(raw);

  const operational: Record<FundAccountType, number> = {
    cash: 0,
    bank: 0,
    bkash: 0,
    reserve: 0,
  };
  const fundAdjustments: Record<FundAccountType, number> = {
    cash: 0,
    bank: 0,
    bkash: 0,
    reserve: 0,
  };
  for (const account of fundAccounts) {
    fundAdjustments[account.type] = Number(account.balance);
    operational[account.type] = raw[account.type] - Number(account.balance);
  }

  return {
    accounts: fundAccounts.map((a) => ({
      type: a.type,
      label: a.label,
      fundAdjustment: Number(a.balance),
      operationalBalance: operational[a.type],
      balance: combined[a.type],
    })),
    operational,
    fundAdjustments,
    combined,
    // Sum of every Live Account card (cash + bank + bKash + reserve).
    totalLiquidity: combined.cash + combined.bank + combined.bkash + combined.reserve,
  };
}

/** Ensure seed accounts exist (safe to call after migration). */
export async function ensureFundAccountsSeeded() {
  for (const type of FUND_ACCOUNT_TYPES) {
    await prisma.fundAccount.upsert({
      where: { type },
      create: { id: `fac_${type}`, type, label: ACCOUNT_LABELS[type] },
      update: {},
    });
  }
}
