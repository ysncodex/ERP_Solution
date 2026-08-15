import type { SimpleLineChartProps } from './Card.types';

/**
 * SimpleLineChart Component
 * Displays a simple line chart for trend visualization
 */
export function SimpleLineChart({ data }: SimpleLineChartProps) {
  if (data.length < 2) {
    return (
      <div className="h-32 flex items-center justify-center text-slate-300 text-xs">
        Not enough data for trend
      </div>
    );
  }
  
  const max = Math.max(...data, 1);
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - (val / max) * 100;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="h-32 w-full relative">
      <svg 
        viewBox="0 0 100 100" 
        preserveAspectRatio="none" 
        className="w-full h-full overflow-visible"
      >
        <polyline
          fill="none"
          stroke="#10B981"
          strokeWidth="2"
          points={points}
          vectorEffect="non-scaling-stroke"
        />
        {data.map((val, i) => {
          const x = (i / (data.length - 1)) * 100;
          const y = 100 - (val / max) * 100;
          return (
            <circle 
              key={i} 
              cx={x} 
              cy={y} 
              r="3" 
              className="fill-emerald-600" 
              vectorEffect="non-scaling-stroke" 
            />
          );
        })}
      </svg>
    </div>
  );
}
