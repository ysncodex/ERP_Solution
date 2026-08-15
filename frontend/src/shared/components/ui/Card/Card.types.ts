import type { LucideIcon } from 'lucide-react';

export interface StatCardProps {
  title: string;
  value: string;
  subtext?: string;
  icon: LucideIcon;
  colorClass: string;
  bgClass: string;
  trend?: number;
}

export interface SimpleLineChartProps {
  data: number[];
}
