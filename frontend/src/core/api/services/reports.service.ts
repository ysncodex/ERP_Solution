import { api } from '../client';

// Type definitions for reports
export interface DailyReport {
  date: string;
  totalSales: number;
  totalExpenses: number;
  profit: number;
  salesBreakdown: {
    cash: number;
    bank: number;
    bkash: number;
  };
  expensesBreakdown: {
    productCosts: number;
    fixedCosts: number;
  };
}

export interface MonthlyReport {
  month: string;
  totalSales: number;
  totalExpenses: number;
  profit: number;
  profitMargin: number;
  salesByChannel: {
    in_store: number;
    foodpanda: number;
    foodi: number;
  };
  topExpenses: Array<{
    category: string;
    amount: number;
  }>;
}

export interface ProfitLossReport {
  period: string;
  revenue: number;
  totalExpenses: number;
  grossProfit: number;
  profitMargin: number;
  breakdown: {
    sales: {
      inStore: number;
      foodpanda: number;
      foodi: number;
    };
    expenses: {
      productCosts: number;
      fixedCosts: number;
      other: number;
    };
  };
}

// Reports Service
export const reportsService = {
  // Get daily report
  getDailyReport: async (date: string): Promise<DailyReport> => {
    return api.get<DailyReport>('/reports/daily', { date });
  },

  // Get monthly report
  getMonthlyReport: async (month: string): Promise<MonthlyReport> => {
    return api.get<MonthlyReport>('/reports/monthly', { month });
  },

  // Get profit & loss report
  getProfitLossReport: async (params: { 
    startDate: string; 
    endDate: string;
  }): Promise<ProfitLossReport> => {
    return api.get<ProfitLossReport>('/reports/profit-loss', params);
  },

  // Get custom date range report
  getCustomReport: async (params: { 
    startDate: string; 
    endDate: string;
  }): Promise<unknown> => {
    return api.get('/reports/custom', params);
  },

  // Export report to PDF/Excel
  exportReport: async (params: { 
    type: 'daily' | 'monthly' | 'custom';
    format: 'pdf' | 'excel';
    startDate?: string;
    endDate?: string;
  }): Promise<Blob> => {
    return api.get('/reports/export', { ...params, responseType: 'blob' });
  },
};
