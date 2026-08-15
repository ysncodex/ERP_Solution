import { api } from '../client';
import type {
  FundBalances,
  FundMovement,
  FundMovementCreateData,
} from '@/core/types/fund.types';

type ApiFundMovement = Omit<FundMovement, 'date' | 'createdAt' | 'updatedAt'> & {
  date: string;
  createdAt: string;
  updatedAt: string;
};

function parseFundMovement(row: ApiFundMovement): FundMovement {
  return {
    ...row,
    date: new Date(row.date),
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  };
}

export const fundsService = {
  getAll: async (params?: {
    startDate?: string;
    endDate?: string;
    movementType?: string;
  }): Promise<FundMovement[]> => {
    const rows = await api.get<ApiFundMovement[]>('/funds', params);
    return rows.map(parseFundMovement);
  },

  getById: async (id: string): Promise<FundMovement> => {
    const row = await api.get<ApiFundMovement>(`/funds/${id}`);
    return parseFundMovement(row);
  },

  create: async (data: FundMovementCreateData): Promise<FundMovement> => {
    const row = await api.post<ApiFundMovement>('/funds', data);
    return parseFundMovement(row);
  },

  delete: async (id: string): Promise<void> => {
    return api.delete<void>(`/funds/${id}`);
  },

  getBalances: async (): Promise<FundBalances> => {
    return api.get<FundBalances>('/funds/balances');
  },
};
