import type { Transaction } from '@/core/types';

/**
 * Profit Margin Calculation Functions
 */

export interface ProductProfitData {
  productName: string;
  category: string;
  totalRevenue: number;
  totalCost: number;
  grossProfit: number;
  profitMargin: number; // Percentage
  salesCount: number;
}

export interface ChannelProfitData {
  channel: string;
  totalRevenue: number;
  grossProfit: number;
  profitMargin: number;
  commissionRate: number;
  netRevenue: number;
}

/**
 * Calculate overall profit margin
 */
export function calculateOverallProfitMargin(totalSales: number, totalCosts: number): number {
  if (totalSales === 0) return 0;
  return ((totalSales - totalCosts) / totalSales) * 100;
}

/**
 * Calculate product-level profitability
 * Groups sales and matches with product costs from expense_product transactions
 */
export function calculateProductProfitability(transactions: Transaction[]): ProductProfitData[] {
  const productRevenue: Record<string, number> = {};
  const productCosts: Record<string, number> = {};
  const productSalesCount: Record<string, number> = {};
  const productCategories: Record<string, string> = {};

  transactions.forEach(t => {
      if (t.type === 'sale' || t.type === 'sale_adjustment') {
      const productName = t.description || 'General Sale';
      productRevenue[productName] = (productRevenue[productName] || 0) + t.amount;
      productSalesCount[productName] = (productSalesCount[productName] || 0) + 1;
      if (t.channel) {
        productCategories[productName] = t.channel;
      }
    } else if (t.type === 'expense_product') {
      const itemName = t.description || 'Unknown';
      productCosts[itemName] = (productCosts[itemName] || 0) + t.amount;
      if (t.channel) {
        productCategories[itemName] = t.channel;
      }
    }
  });

  const allProducts = new Set([...Object.keys(productRevenue), ...Object.keys(productCosts)]);
  
  return Array.from(allProducts)
    .map(productName => {
      const revenue = productRevenue[productName] || 0;
      const cost = productCosts[productName] || 0;
      const grossProfit = revenue - cost;
      const profitMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
      
      return {
        productName,
        category: productCategories[productName] || 'Other',
        totalRevenue: revenue,
        totalCost: cost,
        grossProfit,
        profitMargin,
        salesCount: productSalesCount[productName] || 0
      };
    })
    .filter(p => p.totalRevenue > 0 || p.totalCost > 0)
    .sort((a, b) => b.grossProfit - a.grossProfit);
}

/**
 * Calculate channel profitability (in_store, foodpanda, foodi)
 * Commission rates: Foodpanda 30%, Foodi 25%
 */
export function calculateChannelProfitability(transactions: Transaction[]): ChannelProfitData[] {
  const channelData: Record<string, { revenue: number; count: number }> = {};

  transactions.forEach(t => {
      if ((t.type === 'sale' || t.type === 'sale_adjustment') && t.channel) {
      if (!channelData[t.channel]) {
        channelData[t.channel] = { revenue: 0, count: 0 };
      }
      channelData[t.channel].revenue += t.amount;
      channelData[t.channel].count += 1;
    }
  });

  // Commission rates for delivery platforms
  const commissionRates: Record<string, number> = {
    'in_store': 0,
    'foodpanda': 30,
    'foodi': 25
  };

  return Object.entries(channelData).map(([channel, data]) => {
    const commissionRate = commissionRates[channel] || 0;
    const commissionAmount = (data.revenue * commissionRate) / 100;
    const netRevenue = data.revenue - commissionAmount;
    const grossProfit = netRevenue; // Simplified - actual should subtract COGS
    const profitMargin = data.revenue > 0 ? (grossProfit / data.revenue) * 100 : 0;

    return {
      channel,
      totalRevenue: data.revenue,
      grossProfit,
      profitMargin,
      commissionRate,
      netRevenue
    };
  }).sort((a, b) => b.totalRevenue - a.totalRevenue);
}

/**
 * Calculate category-level profitability
 */
export function calculateCategoryProfitability(
  productProfitData: ProductProfitData[]
): Array<{ category: string; totalRevenue: number; totalCost: number; grossProfit: number; profitMargin: number }> {
  const categoryMap: Record<string, { revenue: number; cost: number }> = {};

  productProfitData.forEach(p => {
    if (!categoryMap[p.category]) {
      categoryMap[p.category] = { revenue: 0, cost: 0 };
    }
    categoryMap[p.category].revenue += p.totalRevenue;
    categoryMap[p.category].cost += p.totalCost;
  });

  return Object.entries(categoryMap)
    .map(([category, data]) => ({
      category,
      totalRevenue: data.revenue,
      totalCost: data.cost,
      grossProfit: data.revenue - data.cost,
      profitMargin: data.revenue > 0 ? ((data.revenue - data.cost) / data.revenue) * 100 : 0
    }))
    .sort((a, b) => b.grossProfit - a.grossProfit);
}

