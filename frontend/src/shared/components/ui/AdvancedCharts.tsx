import { memo, useMemo } from 'react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';

const formatCurrency = (value: unknown) => {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return String(value ?? '');
  return `${n.toLocaleString()} ৳`;
};

function ComparisonLegendInline() {
  return (
    <div className="mt-3 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-500">
      <div className="flex items-center gap-2">
        <span className="inline-block h-0.5 w-6 rounded-full bg-indigo-500" />
        <span className="font-semibold text-slate-600">Current Period</span>
      </div>
      <div className="flex items-center gap-2">
        <span
          className="inline-block h-0.5 w-6 rounded-full bg-slate-400"
          style={{
            backgroundImage:
              'repeating-linear-gradient(90deg, #94a3b8 0 8px, transparent 8px 14px)',
          }}
        />
        <span className="font-semibold text-slate-600">Previous Period</span>
      </div>
    </div>
  );
}

// Enhanced Bar Chart
interface BarChartData {
  name: string;
  value: number;
  color?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export const EnhancedBarChart = memo(function EnhancedBarChart({
  data,
  title,
}: {
  data: BarChartData[];
  title?: string;
}) {
  return (
    <div className="w-full h-64">
      {title && <h4 className="text-sm font-bold text-slate-700 mb-4">{title}</h4>}
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} />
          <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
            }}
          />
          <Bar dataKey="value" fill="#6366f1" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});

// Enhanced Pie Chart
const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6'];

export const EnhancedPieChart = memo(function EnhancedPieChart({
  data,
  title,
}: {
  data: BarChartData[];
  title?: string;
}) {
  return (
    <div className="w-full h-64">
      {title && <h4 className="text-sm font-bold text-slate-700 mb-4">{title}</h4>}
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            label={({ name, percent }: any) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
});

// Enhanced Area Chart
interface AreaChartData {
  name: string;
  value: number;
  compare?: number;
}

export const EnhancedAreaChart = memo(function EnhancedAreaChart({
  data,
  title,
}: {
  data: AreaChartData[];
  title?: string;
}) {
  return (
    <div className="w-full h-64">
      {title && <h4 className="text-sm font-bold text-slate-700 mb-4">{title}</h4>}
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} />
          <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
            }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#6366f1"
            fillOpacity={1}
            fill="url(#colorValue)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
});

// Custom tooltip for the Comparison Chart
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ComparisonTooltip({ active, payload, label }: any) {
  if (!active || !payload || payload.length === 0) return null;
  const current: number = payload.find((p: { dataKey: string }) => p.dataKey === 'value')?.value ?? 0;
  const previous: number = payload.find((p: { dataKey: string }) => p.dataKey === 'compare')?.value ?? 0;
  const diff = current - previous;
  const pct = previous > 0 ? ((diff / previous) * 100).toFixed(1) : null;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-xl p-3 text-xs min-w-[160px]">
      <p className="font-bold text-slate-700 mb-2">{label}</p>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-slate-500">
            <span className="inline-block w-2 h-2 rounded-full bg-indigo-500" />
            This period
          </span>
          <span className="font-bold text-slate-800">{formatCurrency(current)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-slate-400">
            <span className="inline-block w-2 h-2 rounded-full bg-slate-400" />
            Prior period
          </span>
          <span className="font-semibold text-slate-500">{formatCurrency(previous)}</span>
        </div>
        {pct !== null && (
          <div className={`flex items-center justify-between border-t border-slate-100 pt-1.5 font-bold ${diff >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
            <span>Change</span>
            <span>{diff >= 0 ? '↑' : '↓'} {Math.abs(Number(pct))}%</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Comparison Line Chart (Current vs Previous Period)
export const ComparisonChart = memo(function ComparisonChart({
  data,
  title,
}: {
  data: AreaChartData[];
  title?: string;
}) {
  return (
    <div className="w-full">
      {title && <h4 className="text-sm font-bold text-slate-700 mb-4">{title}</h4>}

      <div className="w-full h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
            <CartesianGrid stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fill: '#64748b', fontSize: 12 }}
              axisLine={{ stroke: '#e2e8f0' }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#64748b', fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => (typeof v === 'number' ? v.toLocaleString() : String(v))}
              width={44}
            />
            <Tooltip
              content={<ComparisonTooltip />}
              cursor={{ stroke: '#6366f1', strokeWidth: 1, strokeDasharray: '4 4', strokeOpacity: 0.6 }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#6366f1"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }}
              name="Current Period"
              isAnimationActive
              animationDuration={450}
              strokeLinecap="round"
            />
            <Line
              type="monotone"
              dataKey="compare"
              stroke="#94a3b8"
              strokeWidth={2}
              strokeDasharray="6 6"
              dot={false}
              activeDot={{ r: 4, fill: '#94a3b8', strokeWidth: 2, stroke: '#fff' }}
              name="Previous Period"
              isAnimationActive
              animationDuration={450}
              strokeLinecap="round"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <ComparisonLegendInline />
    </div>
  );
});

// Mini Sparkline Chart for Stat Cards
export const SparklineChart = memo(function SparklineChart({ data }: { data: number[] }) {
  const chartData = useMemo(() => data.map((value, index) => ({ value, index })), [data]);

  return (
    <div className="w-full h-12">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="sparkGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke="#10b981"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#sparkGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
});

// Trend Indicator Component
interface TrendIndicatorProps {
  value: number;
  previousValue: number;
  label?: string;
}

export const TrendIndicator = memo(function TrendIndicator({
  value,
  previousValue,
  label = 'vs last period',
}: TrendIndicatorProps) {
  const change = previousValue > 0 ? ((value - previousValue) / previousValue) * 100 : 0;
  const isPositive = change >= 0;

  return (
    <div
      className={`flex items-center gap-1.5 text-xs font-bold ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}
    >
      {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
      <span>
        {isPositive ? '+' : ''}
        {change.toFixed(1)}%
      </span>
      {label && <span className="text-slate-400 font-normal">{label}</span>}
    </div>
  );
});

// Enhanced Stat Card with Sparkline
interface StatCardWithSparklineProps {
  title: string;
  value: string;
  subtext: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: any;
  colorClass: string;
  bgClass: string;
  trend?: { current: number; previous: number };
  sparklineData?: number[];
}

export const StatCardWithSparkline = memo(function StatCardWithSparkline({
  title,
  value,
  subtext,
  icon: Icon,
  colorClass,
  bgClass,
  trend,
  sparklineData,
}: StatCardWithSparklineProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm font-bold text-slate-500 uppercase tracking-wide">{title}</p>
          <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{value}</h3>
          <p className="text-xs text-slate-400 mt-1">{subtext}</p>
          {trend && (
            <div className="mt-2">
              <TrendIndicator value={trend.current} previousValue={trend.previous} />
            </div>
          )}
        </div>
        <div className={`p-3 rounded-xl ${bgClass}`}>
          <Icon className={colorClass} size={24} />
        </div>
      </div>
      {sparklineData && sparklineData.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          <SparklineChart data={sparklineData} />
        </div>
      )}
    </div>
  );
});
