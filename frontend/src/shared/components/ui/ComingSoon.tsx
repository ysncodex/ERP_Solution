import type { LucideIcon } from 'lucide-react';

type AccentColor = 'amber' | 'indigo' | 'emerald' | 'cyan' | 'violet';

const ACCENT: Record<AccentColor, { bg: string; icon: string; badge: string }> = {
  amber:   { bg: 'bg-amber-500/10',   icon: 'text-amber-400',   badge: 'bg-amber-500/15 text-amber-400 ring-amber-500/30' },
  indigo:  { bg: 'bg-indigo-500/10',  icon: 'text-indigo-400',  badge: 'bg-indigo-500/15 text-indigo-400 ring-indigo-500/30' },
  emerald: { bg: 'bg-emerald-500/10', icon: 'text-emerald-400', badge: 'bg-emerald-500/15 text-emerald-400 ring-emerald-500/30' },
  cyan:    { bg: 'bg-cyan-500/10',    icon: 'text-cyan-400',    badge: 'bg-cyan-500/15 text-cyan-400 ring-cyan-500/30' },
  violet:  { bg: 'bg-violet-500/10',  icon: 'text-violet-400',  badge: 'bg-violet-500/15 text-violet-400 ring-violet-500/30' },
};

interface ComingSoonProps {
  icon: LucideIcon;
  title: string;
  description: string;
  accentColor?: AccentColor;
}

export function ComingSoon({ icon: Icon, title, description, accentColor = 'amber' }: ComingSoonProps) {
  const a = ACCENT[accentColor];
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 text-center px-4">
      <div className={`${a.bg} p-5 rounded-2xl`}>
        <Icon size={40} className={a.icon} strokeWidth={1.5} />
      </div>
      <div className="space-y-1.5">
        <h2 className="text-2xl font-bold text-slate-700">{title}</h2>
        <p className="text-slate-400 text-sm max-w-xs">{description}</p>
      </div>
      <span className={`px-3 py-1 rounded-full text-xs font-semibold tracking-wide ring-1 ${a.badge}`}>
        Coming Soon
      </span>
    </div>
  );
}
