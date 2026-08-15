/**
 * POS Sync — labels, channel config, and in-app help copy.
 * Keeps display strings out of the page component for easier updates.
 */

import {
  AlertTriangle,
  Banknote,
  Bike,
  Cloud,
  Landmark,
  ShoppingBag,
  Smartphone,
  Store,
  Utensils,
  Wifi,
  type LucideIcon,
} from 'lucide-react';
import type { DateRange, PaymentMethod, SalesChannel } from '@/core/types';
import type { DeliveryIntegrationKey } from './posSyncHub.storage';

export const SYNC_SALES_CHANNELS: SalesChannel[] = ['in_store', 'foodpanda', 'foodi'];

export const CHANNEL_DISPLAY: Record<
  SalesChannel,
  { label: string; icon: LucideIcon; badgeClass: string }
> = {
  in_store: {
    label: 'In-Store',
    icon: Store,
    badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  },
  foodpanda: {
    label: 'Foodpanda',
    icon: ShoppingBag,
    badgeClass: 'bg-orange-50 text-orange-700 border border-orange-200',
  },
  foodi: {
    label: 'Foodi',
    icon: Utensils,
    badgeClass: 'bg-violet-50 text-violet-700 border border-violet-200',
  },
};

export const METHOD_DISPLAY: Record<
  PaymentMethod,
  { label: string; icon: LucideIcon; color: string }
> = {
  cash: { label: 'Cash', icon: Banknote, color: 'text-emerald-600' },
  bkash: { label: 'bKash', icon: Smartphone, color: 'text-pink-600' },
  bank: { label: 'Bank', icon: Landmark, color: 'text-blue-600' },
};

export const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  sale: 'Sale',
  sale_adjustment: 'Adjustment',
};

export const DELIVERY_INTEGRATIONS: DeliveryIntegrationKey[] = ['foodpanda', 'foodi', 'pathao'];

export const INTEGRATION_UI: Record<
  DeliveryIntegrationKey,
  {
    title: string;
    subtitle: string;
    icon: LucideIcon;
    ledgerChannel: SalesChannel;
    descriptionPrefix: string;
  }
> = {
  foodpanda: {
    title: 'Foodpanda',
    subtitle: 'Connect your Foodpanda store',
    icon: ShoppingBag,
    ledgerChannel: 'foodpanda',
    descriptionPrefix: 'Foodpanda',
  },
  foodi: {
    title: 'Foodi',
    subtitle: 'Connect your Foodi store',
    icon: Utensils,
    ledgerChannel: 'foodi',
    descriptionPrefix: 'Foodi',
  },
  pathao: {
    title: 'Pathao Food',
    subtitle: 'Connect Pathao Food delivery',
    icon: Bike,
    ledgerChannel: 'foodi',
    descriptionPrefix: 'Pathao Food',
  },
};

/** Plain-language steps shown at the top of the POS Sync page. */
export const POS_SYNC_QUICK_GUIDE = [
  {
    step: 1,
    title: 'Take orders',
    body: 'Ring sales in New Order. When online they save to Daily Sales right away.',
    icon: Store,
  },
  {
    step: 2,
    title: 'Upload offline sales',
    body: 'If Wi-Fi drops, completed orders wait in the queue. Tap Upload when you reconnect.',
    icon: Wifi,
  },
  {
    step: 3,
    title: 'Link delivery apps',
    body: 'Connect Foodpanda, Foodi, or Pathao so delivery orders flow into your sales.',
    icon: Cloud,
  },
  {
    step: 4,
    title: 'Review sales',
    body: 'Browse uploaded sales below. Fix upload errors with manager approval.',
    icon: AlertTriangle,
  },
] as const;

export function formatSyncPeriodLabel(
  customDateRange: { from: Date | null; to: Date | null },
  dateRange: DateRange,
): string {
  if (customDateRange.from && customDateRange.to) {
    const fmt = (d: Date) =>
      d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${fmt(customDateRange.from)} – ${fmt(customDateRange.to)}`;
  }
  const labels: Record<DateRange, string> = {
    today: 'Today',
    week: 'This week',
    month: 'This month',
    prev_month: 'Previous month',
    custom: 'Custom period',
    all: 'All time',
  };
  return labels[dateRange] ?? 'Current period';
}
