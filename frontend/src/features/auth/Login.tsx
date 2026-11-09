import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  ArrowLeft,
  ChartColumn,
  ChevronRight,
  Blocks,
  Crown,
  Eye,
  EyeOff,
  Lock,
  Package,
  Play,
  Receipt,
  ShieldCheck,
  TrendingUp,
  Truck,
  User,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { ButtonLoading } from '@/shared/components/ui';
import {
  isAuthenticated,
  formatLoginSuccessMessage,
  loginAs,
  loginSchema,
  validateRolePassword,
  ROLE_HOME_PATH,
  getStoredUser,
  type LoginFormData,
  type StaticUserRole,
} from '@/shared/utils';
import { authService } from '@/core/api/services';
import { waitForApi } from '@/core/api/client';

/* -------------------------------------------------------------------------- */
/*  Config                                                                    */
/* -------------------------------------------------------------------------- */

type AppRole = Exclude<StaticUserRole, 'visitor'>; // 'owner' | 'manager'
type View = 'home' | 'demo' | 'signin';
type Direction = 'fwd' | 'back';

/**
 * Set VITE_ENABLE_DEMO=false in the production build to hide the demo entirely.
 * The login then opens straight on the sign-in form.
 */
const DEMO_ENABLED = import.meta.env.VITE_ENABLE_DEMO !== 'false';

const ROLES: Record<AppRole, { label: string; icon: LucideIcon; blurb: string }> = {
  owner: {
    label: 'Owner',
    icon: Crown,
    blurb: 'The full picture: money, costs and performance.',
  },
  manager: {
    label: 'Manager',
    icon: ShieldCheck,
    blurb: 'The shop floor: orders, costs and the daily numbers.',
  },
};

const ROLE_ORDER: AppRole[] = ['owner', 'manager'];

type Kpi = { label: string; value: string; delta?: string; good?: boolean };

type ModuleDef = {
  id: string;
  name: string;
  short: string;
  icon: LucideIcon;
  /** Roles that can open this module. Adjust to match your real permissions. */
  roles: AppRole[];
  summary: string;
  kpis: Kpi[];
  chartTitle: string;
  series: number[];
  table: { head: string[]; rows: string[][] };
};

/** Sample figures only. Edit freely: this is the storefront for your product. */
const MODULES: ModuleDef[] = [
  {
    id: 'pos',
    name: 'POS and orders',
    short: 'POS',
    icon: Receipt,
    roles: ['owner', 'manager'],
    summary: 'Take orders at the counter, at the table or for delivery.',
    kpis: [
      { label: 'Orders today', value: '42', delta: '+12%', good: true },
      { label: 'Average ticket', value: '৳386', delta: '+3%', good: true },
      { label: 'Open tables', value: '5' },
    ],
    chartTitle: 'Orders per day',
    series: [31, 38, 34, 47, 44, 58, 42],
    table: {
      head: ['Order', 'Channel', 'Method', 'Total'],
      rows: [
        ['#1042', 'In-store', 'bKash', '৳640'],
        ['#1041', 'Delivery', 'Cash', '৳1,120'],
        ['#1040', 'Takeaway', 'Bank', '৳385'],
      ],
    },
  },
  {
    id: 'sales',
    name: 'Sales',
    short: 'Sales',
    icon: TrendingUp,
    roles: ['owner', 'manager'],
    summary: 'See what you sold, by channel and by payment method.',
    kpis: [
      { label: 'Today', value: '৳16,240', delta: '+9%', good: true },
      { label: 'This month', value: '৳412,800', delta: '+14%', good: true },
      { label: 'In-store share', value: '71%' },
    ],
    chartTitle: 'Sales per day',
    series: [11, 13, 12, 15, 17, 21, 16],
    table: {
      head: ['When', 'Channel', 'Method', 'Amount'],
      rows: [
        ['Today', 'In-store', 'Cash', '৳9,870'],
        ['Today', 'Foodpanda', 'Bank', '৳4,120'],
        ['Today', 'Foodi', 'bKash', '৳2,250'],
      ],
    },
  },
  {
    id: 'costs',
    name: 'Costs and expenses',
    short: 'Costs',
    icon: Package,
    roles: ['owner', 'manager'],
    summary: 'Record rent, salaries, bills and ingredient purchases.',
    kpis: [
      { label: 'Fixed costs', value: '৳57,100' },
      { label: 'Ingredients', value: '৳38,420', delta: '-4%', good: true },
      { label: 'Suppliers', value: '6' },
    ],
    chartTitle: 'Spending per day',
    series: [9, 4, 12, 6, 15, 5, 8],
    table: {
      head: ['Item', 'Type', 'Paid from', 'Amount'],
      rows: [
        ['Shop rent', 'Fixed', 'Bank', '৳22,000'],
        ['Coffee beans', 'Ingredient', 'Cash', '৳5,800'],
        ['Fresh milk', 'Ingredient', 'bKash', '৳1,900'],
      ],
    },
  },
  {
    id: 'funds',
    name: 'Funds',
    short: 'Funds',
    icon: Wallet,
    roles: ['owner'],
    summary: 'Move money between cash, bank, bKash and your reserve.',
    kpis: [
      { label: 'Cash drawer', value: '৳33,000' },
      { label: 'Bank', value: '৳112,000', delta: '+6%', good: true },
      { label: 'bKash', value: '৳7,000' },
    ],
    chartTitle: 'Total balance',
    series: [150, 154, 149, 158, 161, 166, 172],
    table: {
      head: ['When', 'Movement', 'Account', 'Amount'],
      rows: [
        ['Yesterday', 'Transfer', 'Bank to cash', '৳8,000'],
        ['3 days ago', 'Top-up', 'Bank', '৳20,000'],
        ['5 days ago', 'Settlement', 'bKash to bank', '৳5,000'],
      ],
    },
  },
  {
    id: 'reports',
    name: 'Reports',
    short: 'Reports',
    icon: ChartColumn,
    roles: ['owner'],
    summary: 'Profit and loss for any period, straight from your records.',
    kpis: [
      { label: 'Net profit', value: '৳86,300', delta: '+11%', good: true },
      { label: 'Margin', value: '21%', delta: '+2 pts', good: true },
      { label: 'Best day', value: 'Friday' },
    ],
    chartTitle: 'Profit per day',
    series: [2.1, 2.6, 2.3, 3.4, 3.9, 5.2, 3.8],
    table: {
      head: ['Period', 'Sales', 'Costs', 'Profit'],
      rows: [
        ['This week', '৳96,400', '৳71,200', '৳25,200'],
        ['Last week', '৳88,900', '৳68,300', '৳20,600'],
        ['This month', '৳412,800', '৳326,500', '৳86,300'],
      ],
    },
  },
  {
    id: 'menu',
    name: 'Menu and suppliers',
    short: 'Menu',
    icon: Truck,
    roles: ['owner', 'manager'],
    summary: 'Keep prices, availability and supplier details in one place.',
    kpis: [
      { label: 'Categories', value: '11' },
      { label: 'Active items', value: '48' },
      { label: 'Suppliers', value: '6' },
    ],
    chartTitle: 'Items sold per day',
    series: [96, 110, 102, 131, 128, 158, 120],
    table: {
      head: ['Item', 'Category', 'Price', 'Status'],
      rows: [
        ['Caramel latte', 'Coffee', '৳260', 'Available'],
        ['Mango shake', 'Shakes', '৳220', 'Available'],
        ['Chicken pasta', 'Pasta', '৳420', 'Sold out'],
      ],
    },
  },
];

const ASSURANCES = [
  {
    icon: ShieldCheck,
    title: 'Role-based access',
    text: 'Owners and managers see different things.',
  },
  { icon: Receipt, title: 'Always in sync', text: 'Every sale updates your ledger.' },
  { icon: Wallet, title: 'Cash, bank and bKash', text: 'Tracked as separate accounts.' },
];

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

type HttpErr = { response?: { status?: number } };
const statusOf = (err: unknown) => (err as HttpErr).response?.status;
const hasResponse = (err: unknown) => Boolean((err as HttpErr).response);

function initialView(): View {
  if (!DEMO_ENABLED) return 'signin';
  if (typeof window === 'undefined') return 'home';
  const hash = window.location.hash.replace('#', '');
  return hash === 'demo' || hash === 'signin' ? hash : 'home';
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60 focus-visible:ring-offset-2';

/* -------------------------------------------------------------------------- */
/*  Left side: a small ERP window that navigates itself                       */
/* -------------------------------------------------------------------------- */

function Chart({ series }: { series: number[] }) {
  const w = 300;
  const h = 80;
  const pad = 6;
  const max = Math.max(...series);
  const min = Math.min(...series);
  const span = max - min || 1;
  const pts = series.map((v, i) => {
    const x = (i / (series.length - 1)) * w;
    const y = pad + (1 - (v - min) / span) * (h - pad * 2);
    return [x, y] as const;
  });
  const line = pts
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(' ');
  const area = `${line} L${w},${h} L0,${h} Z`;
  const [lx, ly] = pts[pts.length - 1]!;

  return (
    <div>
      <div className="relative h-24">
        <svg
          viewBox={`0 0 ${w} ${h}`}
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
          aria-hidden
        >
          {[0.25, 0.5, 0.75].map((g) => (
            <line
              key={g}
              x1="0"
              x2={w}
              y1={h * g}
              y2={h * g}
              stroke="#e4e4e7"
              strokeWidth="1"
              strokeDasharray="3 4"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          <path d={area} fill="#f59e0b" fillOpacity="0.12" />
          <path
            d={line}
            fill="none"
            stroke="#d97706"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <span
          className="absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-amber-600"
          style={{ left: `${(lx / w) * 100}%`, top: `${(ly / h) * 100}%` }}
          aria-hidden
        />
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] text-zinc-400" aria-hidden>
        {WEEKDAYS.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
    </div>
  );
}

function ErpWindow({
  activeId,
  onSelect,
  onPause,
  highlightRole,
}: {
  activeId: string;
  onSelect: (id: string) => void;
  onPause: (paused: boolean) => void;
  highlightRole: AppRole | null;
}) {
  const active = MODULES.find((m) => m.id === activeId) ?? MODULES[0]!;
  const Icon = active.icon;
  const locked = highlightRole !== null && !active.roles.includes(highlightRole);

  return (
    <div
      className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-[0_28px_56px_-32px_rgba(24,24,27,0.35)]"
      onMouseEnter={() => onPause(true)}
      onMouseLeave={() => onPause(false)}
      onFocus={() => onPause(true)}
      onBlur={() => onPause(false)}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between gap-4 border-b border-zinc-200 px-5 py-3 text-sm">
        <p className="min-w-0 truncate text-zinc-500">
          ERP_Solutions Pro <span className="px-1 text-zinc-300">/</span>
          <span className="font-medium text-zinc-900">{active.name}</span>
        </p>
        <div className="flex shrink-0 items-center gap-3">
          <span className="rounded-md bg-zinc-100 px-2 py-1 text-xs text-zinc-500">
            Last 7 days
          </span>
          <span className="text-xs text-zinc-400">
            {highlightRole
              ? `Viewing as ${ROLES[highlightRole].label.toLowerCase()}`
              : 'Sample data'}
          </span>
          <span className="grid h-7 w-7 place-items-center rounded-full bg-zinc-900 text-xs font-medium text-white">
            {highlightRole ? ROLES[highlightRole].label[0] : <User size={13} />}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-[12rem_minmax(0,1fr)]">
        {/* Sidebar */}
        <nav aria-label="Modules" className="border-r border-zinc-200 bg-zinc-50 p-2">
          {MODULES.map((m) => {
            const ItemIcon = m.icon;
            const isActive = m.id === activeId;
            const isLocked = highlightRole !== null && !m.roles.includes(highlightRole);
            return (
              <button
                key={m.id}
                type="button"
                aria-current={isActive ? 'true' : undefined}
                onClick={() => onSelect(m.id)}
                className={`relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${FOCUS_RING} ${
                  isActive
                    ? 'bg-white font-medium text-zinc-900 ring-1 ring-zinc-200'
                    : 'text-zinc-500 hover:bg-white/70 hover:text-zinc-900'
                } ${isLocked ? 'opacity-50' : ''}`}
              >
                {isActive && (
                  <span
                    className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-amber-500"
                    aria-hidden
                  />
                )}
                <ItemIcon size={16} className={isActive ? 'text-amber-600' : 'text-zinc-400'} />
                <span className="flex-1 truncate">{m.name}</span>
                {isLocked && (
                  <Lock size={12} className="text-zinc-400" aria-label="Not in this view" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Content */}
        <div key={active.id} className="lg-fade min-w-0 p-6">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-zinc-100 text-zinc-700">
              <Icon size={18} />
            </span>
            <div className="min-w-0">
              <h3 className="text-base font-semibold tracking-tight text-zinc-900">
                {active.name}
              </h3>
              <p className="text-sm text-zinc-500">{active.summary}</p>
            </div>
          </div>

          {locked && highlightRole && (
            <p className="mt-4 rounded-lg bg-zinc-100 px-3 py-2 text-sm text-zinc-600">
              This module is not part of the {ROLES[highlightRole].label.toLowerCase()} view.
            </p>
          )}

          <div className={locked ? 'opacity-40' : undefined}>
            <dl className="mt-6 grid grid-cols-3 divide-x divide-zinc-200">
              {active.kpis.map((k, i) => (
                <div key={k.label} className={i === 0 ? 'pr-4' : 'px-4'}>
                  <dt className="text-xs text-zinc-500">{k.label}</dt>
                  <dd className="mt-1 text-lg font-semibold tabular-nums tracking-tight text-zinc-900">
                    {k.value}
                  </dd>
                  {k.delta && (
                    <p
                      className={`text-xs tabular-nums ${k.good ? 'text-emerald-600' : 'text-rose-600'}`}
                    >
                      {k.delta}
                    </p>
                  )}
                </div>
              ))}
            </dl>

            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between text-xs text-zinc-500">
                <span>{active.chartTitle}</span>
                <span className="text-zinc-400">Last 7 days</span>
              </div>
              <Chart series={active.series} />
            </div>

            <div className="mt-6 overflow-x-auto [@media(max-height:880px)]:hidden">
              <table className="w-full min-w-[20rem] text-left text-xs">
                <thead>
                  <tr className="text-zinc-400">
                    {active.table.head.map((h, i) => (
                      <th
                        key={h}
                        className={`pb-2 font-normal ${i === active.table.head.length - 1 ? 'text-right' : ''}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="text-zinc-600">
                  {active.table.rows.map((row) => (
                    <tr key={row.join('|')} className="border-t border-zinc-100">
                      {row.map((cell, i) => (
                        <td
                          key={`${cell}-${i}`}
                          className={`whitespace-nowrap py-2 ${i === 0 ? 'font-medium text-zinc-900' : ''} ${
                            i === row.length - 1
                              ? 'text-right font-medium tabular-nums text-zinc-900'
                              : ''
                          }`}
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

export default function LoginPage() {
  const navigate = useNavigate();

  const [view, setView] = useState<View>(initialView);
  const [dir, setDir] = useState<Direction>('fwd');
  const [signInRole, setSignInRole] = useState<AppRole>('owner');
  const [hoverRole, setHoverRole] = useState<AppRole | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState<AppRole | null>(null);
  const [activeModule, setActiveModule] = useState<string>(MODULES[0]!.id);
  const [paused, setPaused] = useState(false);

  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRun = useRef(true);

  const {
    register,
    handleSubmit,
    setFocus,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { password: '' },
  });

  const busy = loading || isSubmitting || demoLoading !== null;
  const role = ROLES[signInRole];
  const highlightRole: AppRole | null =
    view === 'demo' ? hoverRole : view === 'signin' ? signInRole : null;

  // Already signed in: go straight to the right home page.
  useEffect(() => {
    try {
      const user = getStoredUser();
      if (isAuthenticated() && user) navigate(ROLE_HOME_PATH[user.role]);
    } catch {
      /* ignore storage errors */
    }
  }, [navigate]);

  // The window on the left tours the modules by itself until someone touches it.
  useEffect(() => {
    if (paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => {
      setActiveModule((current) => {
        const i = MODULES.findIndex((m) => m.id === current);
        return MODULES[(i + 1) % MODULES.length]!.id;
      });
    }, 5000);
    return () => window.clearInterval(timer);
  }, [paused]);

  // Move keyboard focus into the new section when the view changes.
  useEffect(() => {
    if (view === 'signin') setFocus('password');
    else if (!firstRun.current) headingRef.current?.focus();
    firstRun.current = false;
  }, [view, setFocus]);

  const go = (next: View, direction: Direction = 'fwd') => {
    if (busy) return;
    setDir(direction);
    setView(next);
    setHoverRole(null);
    try {
      const base = window.location.pathname + window.location.search;
      window.history.replaceState(null, '', next === 'home' ? base : `${base}#${next}`);
    } catch {
      /* ignore */
    }
  };

  const selectSignInRole = (r: AppRole) => {
    setSignInRole(r);
    reset({ password: '' });
    setTimeout(() => setFocus('password'), 0);
  };

  /* ----------------------------- Sign in ---------------------------------- */

  const handleLogin = async (data: LoginFormData) => {
    setLoading(true);
    try {
      await waitForApi();
      const res = await authService.login({ role: signInRole, password: data.password });
      toast.success(formatLoginSuccessMessage(res.user.name));
      navigate(ROLE_HOME_PATH[signInRole]);
    } catch (err) {
      const status = statusOf(err);

      if (!hasResponse(err)) {
        // Offline in development: allow the local static password.
        if (!import.meta.env.PROD && validateRolePassword(signInRole, data.password)) {
          try {
            const user = loginAs(signInRole);
            toast.success(formatLoginSuccessMessage(user.name));
          } catch {
            /* ignore storage errors */
          }
          navigate(ROLE_HOME_PATH[signInRole]);
          return;
        }
        toast.error('Cannot reach the server. Wait a few seconds and try again.');
      } else if (status === 429) {
        toast.error('Too many attempts. Wait a moment and try again.');
      } else if (status === 401 || status === 400) {
        toast.error(`Wrong ${role.label.toLowerCase()} password. Check it and try again.`);
      } else {
        toast.error('Sign in failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  /* ------------------------------- Demo ----------------------------------- */

  const handleDemo = async (demoRole: AppRole) => {
    setDemoLoading(demoRole);
    try {
      await waitForApi();
      const res = await authService.loginAsDemo(demoRole);
      toast.success(formatLoginSuccessMessage(res.user.name));
      navigate(ROLE_HOME_PATH[demoRole]);
    } catch (err) {
      const status = statusOf(err);

      if (!hasResponse(err)) {
        if (!import.meta.env.PROD) {
          // Dev-only fallback so the flow can be tested without the API.
          try {
            const user = loginAs(demoRole);
            toast.success(formatLoginSuccessMessage(user.name));
          } catch {
            /* ignore storage errors */
          }
          navigate(ROLE_HOME_PATH[demoRole]);
          return;
        }
        toast.error('Cannot reach the server. Wait a few seconds and try again.');
      } else if (status === 429) {
        toast.error('Too many demo sessions. Wait a moment and try again.');
      } else {
        toast.error('The demo is not available right now. Please try again.');
      }
    } finally {
      setDemoLoading(null);
    }
  };

  /* ------------------------------- View ----------------------------------- */

  const heading = 'text-3xl font-semibold tracking-tight text-zinc-900 outline-none';
  const backButton = `mb-8 inline-flex items-center gap-1.5 rounded text-sm text-zinc-500 hover:text-zinc-900 ${FOCUS_RING}`;

  return (
    <div className="min-h-dvh bg-white font-sans text-zinc-900 lg:grid lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
      <style>{`
        @keyframes lg-in-fwd { from { opacity: 0; transform: translateX(16px); } to { opacity: 1; transform: none; } }
        @keyframes lg-in-back { from { opacity: 0; transform: translateX(-16px); } to { opacity: 1; transform: none; } }
        @keyframes lg-fade { from { opacity: 0; } to { opacity: 1; } }
        .lg-in-fwd { animation: lg-in-fwd .28s cubic-bezier(.2,.7,.2,1) both; }
        .lg-in-back { animation: lg-in-back .28s cubic-bezier(.2,.7,.2,1) both; }
        .lg-fade { animation: lg-fade .35s ease-out both; }
        @media (prefers-reduced-motion: reduce) {
          .lg-in-fwd, .lg-in-back, .lg-fade { animation: none; }
        }
      `}</style>

      {/* ------------------------------ Left: product ------------------------------ */}
      <section className="hidden h-dvh flex-col justify-start gap-10 overflow-y-auto border-r border-zinc-200 bg-zinc-100 p-10 lg:sticky lg:top-0 lg:flex xl:px-14">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-amber-500 text-white">
            <Blocks size={18} />
          </span>
          <span className="text-base font-semibold tracking-tight">ERP_Solutions Pro</span>
        </div>

        <div>
          <h1 className="max-w-xl text-4xl font-semibold leading-tight tracking-tight text-zinc-900 [@media(max-height:820px)]:text-3xl">
            Run every part of your shop from one place.
          </h1>
          <p className="mt-3 max-w-lg text-base leading-relaxed text-zinc-600">
            Sales, costs, funds and reports stay in sync, so you always know where the business
            stands.
          </p>

          <div className="mt-6 max-w-3xl">
            <ErpWindow
              activeId={activeModule}
              onSelect={setActiveModule}
              onPause={setPaused}
              highlightRole={highlightRole}
            />
          </div>
        </div>

        <ul className="mt-auto grid max-w-3xl grid-cols-3 gap-6 border-t border-zinc-200 pt-6 [@media(max-height:960px)]:hidden">
          {ASSURANCES.map(({ icon: AIcon, title, text }) => (
            <li key={title}>
              <AIcon size={16} className="text-amber-600" />
              <p className="mt-2 text-sm font-medium text-zinc-900">{title}</p>
              <p className="mt-0.5 text-sm text-zinc-500">{text}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* ------------------------------ Right: gate ------------------------------ */}
      <main className="flex min-h-dvh flex-col px-6 py-8 sm:px-12 lg:px-14 xl:px-20">
        {/* Mobile header */}
        <header className="lg:hidden">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-amber-500 text-white">
              <Blocks size={18} />
            </span>
            <span className="text-base font-semibold tracking-tight">ERP_Solutions Pro</span>
          </div>
          <ul className="-mx-6 mt-5 flex gap-2 overflow-x-auto px-6 pb-1 [scrollbar-width:none]">
            {MODULES.map(({ id, name, icon: ChipIcon }) => (
              <li
                key={id}
                className="flex shrink-0 items-center gap-1.5 rounded-full border border-zinc-200 px-3 py-1.5 text-xs text-zinc-600"
              >
                <ChipIcon size={13} className="text-zinc-400" />
                {name}
              </li>
            ))}
          </ul>
        </header>

        <div className="m-auto w-full max-w-md py-10">
          <div key={view} className={dir === 'fwd' ? 'lg-in-fwd' : 'lg-in-back'}>
            {/* ------------------------------- Home -------------------------------- */}
            {view === 'home' && (
              <>
                <h2 ref={headingRef} tabIndex={-1} className={heading}>
                  {greeting()}
                </h2>
                <p className="mt-2 text-zinc-500">
                  Take a look around with sample data, or sign in to your own shop.
                </p>

                <div className="mt-8 space-y-3">
                  <button
                    type="button"
                    onClick={() => go('demo')}
                    className={`group flex w-full items-center gap-4 rounded-xl bg-zinc-900 p-5 text-left text-white transition-colors hover:bg-zinc-800 ${FOCUS_RING}`}
                  >
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-white/10">
                      <Play size={18} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="font-medium">Open the live demo</span>
                        <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs font-medium text-zinc-900">
                          Start here
                        </span>
                      </span>
                      <span className="mt-0.5 block text-sm text-zinc-400">
                        Owner and manager views with sample data
                      </span>
                    </span>
                    <ChevronRight
                      size={18}
                      className="text-zinc-500 transition-transform group-hover:translate-x-0.5"
                    />
                  </button>

                  <button
                    type="button"
                    onClick={() => go('signin')}
                    className={`group flex w-full items-center gap-4 rounded-xl border border-zinc-200 p-5 text-left transition-colors hover:border-zinc-300 hover:bg-zinc-50 ${FOCUS_RING}`}
                  >
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-zinc-100 text-zinc-700">
                      <Lock size={18} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium text-zinc-900">Sign in</span>
                      <span className="mt-0.5 block text-sm text-zinc-500">
                        For owners and managers of a live shop
                      </span>
                    </span>
                    <ChevronRight
                      size={18}
                      className="text-zinc-400 transition-transform group-hover:translate-x-0.5"
                    />
                  </button>
                </div>

                <p className="mt-4 text-sm text-zinc-500">
                  The demo is read-only, so nothing you do there is saved.
                </p>
              </>
            )}

            {/* ------------------------------- Demo -------------------------------- */}
            {view === 'demo' && (
              <>
                <button
                  type="button"
                  onClick={() => go('home', 'back')}
                  disabled={busy}
                  className={backButton}
                >
                  <ArrowLeft size={16} />
                  Back
                </button>

                <h2 ref={headingRef} tabIndex={-1} className={heading}>
                  Choose a view
                </h2>
                <p className="mt-2 text-zinc-500">
                  Each role sees a different side of the same shop. Hover over one to preview its
                  modules.
                </p>

                <div className="mt-8 divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200">
                  {ROLE_ORDER.map((r) => {
                    const cfg = ROLES[r];
                    const RoleIcon = cfg.icon;
                    const isLoading = demoLoading === r;
                    const modules = MODULES.filter((m) => m.roles.includes(r));
                    return (
                      <button
                        key={r}
                        type="button"
                        disabled={busy}
                        onClick={() => void handleDemo(r)}
                        onMouseEnter={() => setHoverRole(r)}
                        onMouseLeave={() => setHoverRole(null)}
                        onFocus={() => setHoverRole(r)}
                        onBlur={() => setHoverRole(null)}
                        className="group relative block w-full bg-white p-5 text-left transition-colors hover:bg-zinc-50 focus-visible:bg-zinc-50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <span
                          className="absolute inset-y-0 left-0 w-0.5 bg-amber-500 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                          aria-hidden
                        />
                        <span className="flex items-start gap-4">
                          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-zinc-100 text-zinc-700">
                            <RoleIcon size={18} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block font-medium text-zinc-900">
                              {isLoading
                                ? 'Preparing the demo…'
                                : `Open the ${cfg.label.toLowerCase()} demo`}
                            </span>
                            <span className="mt-0.5 block text-sm text-zinc-500">{cfg.blurb}</span>
                          </span>
                          <ChevronRight
                            size={18}
                            className={`mt-3 text-zinc-400 transition-transform group-hover:translate-x-0.5 ${
                              isLoading ? 'animate-pulse' : ''
                            }`}
                          />
                        </span>
                        <span className="mt-4 flex flex-wrap gap-1.5 pl-[3.75rem]">
                          {modules.map(({ id, short, icon: ChipIcon }) => (
                            <span
                              key={id}
                              className="inline-flex items-center gap-1.5 rounded-md bg-zinc-100 px-2 py-1 text-xs text-zinc-600"
                            >
                              <ChipIcon size={12} className="text-zinc-400" />
                              {short}
                            </span>
                          ))}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <p className="mt-4 text-sm text-zinc-500">
                  Includes about three months of sample sales, costs and fund movements. Nothing you
                  do here is saved.
                </p>

                <p className="mt-8 text-sm text-zinc-500">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => go('signin')}
                    disabled={busy}
                    className={`rounded font-medium text-zinc-900 underline underline-offset-4 ${FOCUS_RING}`}
                  >
                    Sign in
                  </button>
                </p>
              </>
            )}

            {/* ------------------------------ Sign in ------------------------------ */}
            {view === 'signin' && (
              <>
                {DEMO_ENABLED && (
                  <button
                    type="button"
                    onClick={() => go('home', 'back')}
                    disabled={busy}
                    className={backButton}
                  >
                    <ArrowLeft size={16} />
                    Back
                  </button>
                )}

                <h2 ref={headingRef} tabIndex={-1} className={heading}>
                  Sign in
                </h2>
                <p className="mt-2 text-zinc-500">Choose your role and enter your password.</p>

                <div
                  role="radiogroup"
                  aria-label="Role"
                  className="mt-8 grid grid-cols-2 gap-1 rounded-xl bg-zinc-100 p-1"
                >
                  {ROLE_ORDER.map((r) => {
                    const cfg = ROLES[r];
                    const RoleIcon = cfg.icon;
                    const selected = signInRole === r;
                    return (
                      <button
                        key={r}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        disabled={busy}
                        onClick={() => selectSignInRole(r)}
                        className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-colors ${FOCUS_RING} ${
                          selected
                            ? 'bg-white text-zinc-900 ring-1 ring-zinc-200'
                            : 'text-zinc-500 hover:text-zinc-900'
                        }`}
                      >
                        <RoleIcon size={15} className={selected ? 'text-amber-600' : undefined} />
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>

                <form onSubmit={handleSubmit(handleLogin)} className="mt-6 space-y-5" noValidate>
                  <div>
                    <label
                      htmlFor="password"
                      className="mb-1.5 block text-sm font-medium text-zinc-800"
                    >
                      {role.label} password
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        aria-invalid={Boolean(errors.password)}
                        aria-describedby={errors.password ? 'password-error' : undefined}
                        {...register('password', { onBlur: () => setCapsLock(false) })}
                        onKeyUp={(e) => setCapsLock(e.getModifierState('CapsLock'))}
                        className={`w-full rounded-xl border bg-white py-3 pl-4 pr-12 text-base text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-900 focus:ring-2 focus:ring-amber-500/40 ${
                          errors.password ? 'border-red-400' : 'border-zinc-300'
                        }`}
                        placeholder="Enter your password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className={`absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-zinc-400 hover:text-zinc-900 ${FOCUS_RING}`}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {capsLock && !errors.password && (
                      <p className="mt-1.5 text-sm text-amber-700">Caps Lock is on.</p>
                    )}
                    {errors.password && (
                      <p id="password-error" role="alert" className="mt-1.5 text-sm text-red-600">
                        {errors.password.message}
                      </p>
                    )}
                  </div>

                  <ButtonLoading
                    type="submit"
                    loading={isSubmitting || loading}
                    disabled={demoLoading !== null}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 py-3 text-base font-medium text-white transition-colors hover:bg-zinc-800 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Sign in as {role.label.toLowerCase()}
                  </ButtonLoading>
                </form>

                {DEMO_ENABLED && (
                  <p className="mt-8 text-sm text-zinc-500">
                    Just looking?{' '}
                    <button
                      type="button"
                      onClick={() => go('demo')}
                      disabled={busy}
                      className={`rounded font-medium text-zinc-900 underline underline-offset-4 ${FOCUS_RING}`}
                    >
                      Open the live demo
                    </button>
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-zinc-200 pt-5 text-sm text-zinc-500">
          <p>
            Need an account?{' '}
            <a
              href="tel:+8801624269321"
              className={`rounded font-medium text-zinc-900 underline underline-offset-4 ${FOCUS_RING}`}
            >
              Call +880 1624-269321
            </a>
          </p>
          <p>© {new Date().getFullYear()} ERP_Solutions Pro</p>
        </footer>
      </main>
    </div>
  );
}
