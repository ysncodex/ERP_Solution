import type { StatCardProps } from './Card.types';

export function StatCard({
  title,
  value,
  subtext,
  icon: Icon,
  colorClass,
  bgClass,
  trend,
}: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col h-full transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 overflow-hidden">
      <div className="p-5 flex flex-col h-full gap-3">
        {/* Top row: title + icon */}
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-tight pr-2">
            {title}
          </p>
          <div className={`p-2.5 rounded-xl shrink-0 ${bgClass}`}>
            <Icon size={18} strokeWidth={2.5} className={colorClass} />
          </div>
        </div>

        {/* Value — always dark so it's easy to read; color is on icon + trend only */}
        <h3 className="text-2xl font-extrabold text-slate-800 tracking-tight leading-none break-words">
          {value}
        </h3>

        {/* Bottom row: subtext + trend badge */}
        <div className="mt-auto flex items-center justify-between gap-2">
          {subtext && (
            <p className="text-xs text-slate-400 leading-snug">{subtext}</p>
          )}
          {trend !== undefined && (
            <span
              className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ${
                trend >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
              }`}
            >
              {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
