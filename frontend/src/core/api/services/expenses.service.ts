import { api } from '../client';
import type { Transaction } from '@/core/types';

// Type definitions for expenses
export interface ExpenseCreateData {
  type: 'expense_product' | 'expense_fixed';
  category: string;
  item: string;
  supplier?: string;
  quantity?: number;
  unit?: string;
  unitPrice?: number;
  amount: number;
  paymentMethod: 'cash' | 'bank' | 'bkash';
  description?: string;
  date: string;
}

export interface ExpenseStats {
  totalExpenses: number;
  productCosts: number;
  fixedCosts: number;
  expensesByCategory: Record<string, number>;
}

// Expenses Service
export const expensesService = {
  // Get all expenses
  getAll: async (params?: { 
    startDate?: string; 
    endDate?: string;
    type?: string;
    category?: string;
    page?: number;
    limit?: number;
  }): Promise<Transaction[]> => {
    const rows = await api.get<(Transaction & { date: string })[]>('/expenses', params);
    return rows.map((t) => ({ ...t, date: new Date(t.date) }));
  },

  // Get expense by ID
  getById: async (id: string): Promise<Transaction> => {
    return api.get<Transaction>(`/expenses/${id}`);
  },

  // Create new expense
  create: async (data: ExpenseCreateData): Promise<Transaction> => {
    return api.post<Transaction>('/expenses', data);
  },

  // Update expense
  update: async (id: string, data: Partial<ExpenseCreateData>): Promise<Transaction> => {
    return api.put<Transaction>(`/expenses/${id}`, data);
  },

  // Delete expense
  delete: async (id: string): Promise<void> => {
    return api.delete<void>(`/expenses/${id}`);
  },

  // Get expense statistics
  getStats: async (params?: { 
    startDate?: string; 
    endDate?: string;
  }): Promise<ExpenseStats> => {
    return api.get<ExpenseStats>('/expenses/stats', params);
  },

  // Get product costs
  getProductCosts: async (params?: { 
    startDate?: string; 
    endDate?: string;
  }): Promise<Transaction[]> => {
    return api.get<Transaction[]>('/expenses/product-costs', params);
  },

  // Get fixed costs
  getFixedCosts: async (params?: { 
    startDate?: string; 
    endDate?: string;
  }): Promise<Transaction[]> => {
    return api.get<Transaction[]>('/expenses/fixed-costs', params);
  },
};
