export type FundAccountType = 'cash' | 'bank' | 'bkash' | 'reserve';

export type FundMovementType = 'transfer' | 'add' | 'withdraw' | 'opening';

export interface FundMovement {
  id: string;
  code?: string;
  movementType: FundMovementType;
  fromAccount?: FundAccountType;
  toAccount?: FundAccountType;
  fromAccountId?: string;
  toAccountId?: string;
  amount: number;
  date: Date;
  notes: string;
  createdBy?: { id: string; name: string };
  createdAt: Date;
  updatedAt: Date;
}

export interface FundMovementCreateData {
  movementType: FundMovementType;
  fromAccount?: FundAccountType;
  toAccount?: FundAccountType;
  amount: number;
  date: string;
  notes?: string;
}

export interface FundAccountBalance {
  type: FundAccountType;
  label: string;
  fundAdjustment: number;
  operationalBalance: number;
  balance: number;
}

export interface FundBalances {
  accounts: FundAccountBalance[];
  operational: Record<FundAccountType, number>;
  fundAdjustments: Record<FundAccountType, number>;
  combined: Record<FundAccountType, number>;
  totalLiquidity: number;
}
