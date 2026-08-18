import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Coffee, Lock, ArrowRight, Eye, EyeOff, Crown, ShieldCheck, ChartColumn, Receipt, Package, ScanEye } from 'lucide-react';
import { ButtonLoading } from '@/shared/components/ui';
import {
  isAuthenticated,
  formatLoginSuccessMessage,
  loginAs,
  loginSchema,
  validateRolePassword,
  ROLE_HOME_PATH,
  ROLE_DESCRIPTIONS,
  getStoredUser,
  type LoginFormData,
  type StaticUserRole,
} from '@/shared/utils';
import { authService } from '@/core/api/services';
import { waitForApi } from '@/core/api/client';
import loginBg from '@/assets/img/login.jpg';

const LOGIN_PARTICLES = Array.from({ length: 20 }, (_, id) => ({
  id,
  left: `${Math.random() * 100}%`,
  top: `${Math.random() * 100}%`,
  animationDelay: `${Math.random() * 5}s`,
  animationDuration: `${15 + Math.random() * 10}s`,
}));

type SignInRole = Exclude<StaticUserRole, 'visitor'>;

const SIGN_IN_ROLES: {
  role: SignInRole;
  label: string;
  icon: typeof Crown;
  accent: string;
  activeClass: string;
}[] = [
  {
    role: 'owner',
    label: 'Owner',
    icon: Crown,
    accent: 'text-amber-600',
    activeClass: 'border-amber-500 bg-amber-50 text-amber-800 shadow-sm',
  },
  {
    role: 'manager',
    label: 'Manager',
    icon: ShieldCheck,
    accent: 'text-emerald-600',
    activeClass: 'border-emerald-500 bg-emerald-50 text-emerald-800 shadow-sm',
  },
];

const HIGHLIGHTS = [
  { icon: Receipt, label: 'POS & orders' },
  { icon: ChartColumn, label: 'Live reports' },
  { icon: Package, label: 'Costs & funds' },
] as const;

export default function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [signInRole, setSignInRole] = useState<SignInRole>('owner');

  useEffect(() => {
    try {
      const user = getStoredUser();
      if (isAuthenticated() && user) navigate(ROLE_HOME_PATH[user.role]);
    } catch {
      // ignore
    }
  }, [navigate]);

  const {
    register,
    handleSubmit: handleFormSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { password: '' },
  });

  const roleLabel = signInRole === 'owner' ? 'Owner' : 'Manager';

  const enterAsVisitor = async () => {
    await waitForApi();
    const res = await authService.loginAsVisitor();
    toast.success(formatLoginSuccessMessage(res.user.name));
    navigate(ROLE_HOME_PATH.visitor);
  };

  const handleVisitorExplore = async () => {
    setLoading(true);
    try {
      await enterAsVisitor();
    } catch (err) {
      const axiosErr = err as { response?: { status?: number } };
      const status = axiosErr.response?.status;

      if (!axiosErr.response) {
        if (!import.meta.env.PROD) {
          try {
            const user = loginAs('visitor');
            toast.success(formatLoginSuccessMessage(user.name));
          } catch {
            // ignore storage errors
          }
          navigate(ROLE_HOME_PATH.visitor);
          return;
        }
        toast.error('Cannot reach the server. Wait a few seconds and try again.');
        return;
      }

      if (status === 429) {
        toast.error('Too many visitor sessions. Please wait a moment and try again.');
      } else {
        toast.error('Visitor access is not available right now. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (data: LoginFormData) => {
    setLoading(true);

    try {
      await waitForApi();
      const res = await authService.login({ role: signInRole, password: data.password });
      toast.success(formatLoginSuccessMessage(res.user.name));
      navigate(ROLE_HOME_PATH[signInRole]);
    } catch (err) {
      const axiosErr = err as { response?: { status?: number } };
      const status = axiosErr.response?.status;

      if (!axiosErr.response) {
        if (!import.meta.env.PROD && validateRolePassword(signInRole, data.password)) {
          try {
            const user = loginAs(signInRole);
            toast.success(formatLoginSuccessMessage(user.name));
          } catch {
            // ignore storage errors
          }
          navigate(ROLE_HOME_PATH[signInRole]);
          return;
        }
        toast.error('Cannot reach the server. Wait a few seconds and try again.');
      } else if (status === 429) {
        toast.error('Too many attempts. Please wait a moment and try again.');
      } else if (status === 401 || status === 400) {
        toast.error(`Wrong password for ${roleLabel}`);
      } else {
        toast.error('Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-dvh w-full bg-slate-900 flex items-center justify-center p-2 sm:p-4 font-sans relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-black">
        <div
          className="absolute inset-0 opacity-30 bg-cover bg-center animate-slow-zoom"
          style={{ backgroundImage: `url(${loginBg})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/50 to-transparent" />

        <div className="absolute inset-0 overflow-hidden">
          {LOGIN_PARTICLES.map((p) => (
            <div
              key={p.id}
              className="absolute w-2 h-2 bg-amber-500/20 rounded-full animate-float"
              style={{
                left: p.left,
                top: p.top,
                animationDelay: p.animationDelay,
                animationDuration: p.animationDuration,
              }}
            />
          ))}
        </div>
      </div>

      <div className="bg-white w-full max-w-4xl h-full md:h-auto rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row md:min-h-[650px] relative z-10 animate-fade-in-up">
        <div className="shrink-0 md:w-1/2 bg-gradient-to-br from-slate-800 to-black relative flex flex-col items-center justify-center md:items-stretch md:justify-between p-4 sm:p-6 md:p-12 text-white overflow-hidden">
          <div
            className="absolute inset-0 opacity-20 bg-cover bg-center transition-transform duration-700 hover:scale-110"
            style={{ backgroundImage: `url(${loginBg})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />

          <div className="relative z-10 flex items-center gap-3 md:block">
            <div className="w-9 h-9 md:w-12 md:h-12 bg-amber-500 rounded-xl flex items-center justify-center shrink-0 mb-0 md:mb-6 shadow-lg shadow-amber-500/20 animate-pulse-slow">
              <Coffee size={20} className="text-white md:hidden" />
              <Coffee size={28} className="text-white hidden md:block" />
            </div>
            <h1 className="text-xl sm:text-2xl md:text-4xl font-bold tracking-tight mb-0 md:mb-4 animate-slide-in-left">
              ERP_Solutions <span className="text-amber-500">Pro</span>
            </h1>
            <p className="hidden md:block text-slate-300 text-sm sm:text-base md:text-lg leading-relaxed animate-slide-in-left animation-delay-200">
              Streamline your coffee shop operations with our all-in-one management dashboard.
            </p>
          </div>

          <div className="hidden md:block relative z-10 space-y-4 animate-slide-in-left animation-delay-400">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
              <p className="text-xs font-bold uppercase tracking-widest text-amber-400 mb-3">
                What you can manage
              </p>
              <ul className="space-y-2.5">
                {HIGHLIGHTS.map(({ icon: Icon, label }) => (
                  <li key={label} className="flex items-center gap-2.5 text-sm text-slate-300">
                    <span className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                      <Icon size={15} className="text-amber-400" />
                    </span>
                    {label}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-400">
              <div className="w-8 h-px bg-slate-600" />
              <span>Owner, Manager &amp; Visitor access</span>
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 md:w-1/2 bg-white px-4 py-3 sm:px-8 sm:py-6 md:p-12 flex flex-col justify-center relative overflow-y-auto">
          <div className="max-w-sm mx-auto w-full">
            <h2 className="text-lg sm:text-2xl md:text-3xl font-bold text-slate-900 mb-0.5 sm:mb-2">
              Welcome back
            </h2>
            <p className="text-xs sm:text-sm md:text-base text-slate-500 mb-3 sm:mb-6">
              Sign in to work, or explore the full product as a visitor.
            </p>

            <div className="grid grid-cols-2 gap-2 mb-3 sm:mb-6">
              {SIGN_IN_ROLES.map(({ role, label, icon: Icon, activeClass }) => {
                const isActive = signInRole === role;
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setSignInRole(role)}
                    className={`flex flex-col items-start gap-1 sm:gap-1.5 p-2 sm:p-3 rounded-xl border-2 transition-all text-left ${
                      isActive
                        ? activeClass
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <Icon size={16} className={isActive ? undefined : 'text-slate-400'} />
                    <span className="text-xs sm:text-sm font-bold">{label}</span>
                    <span className="hidden sm:block text-[10px] leading-snug opacity-80 line-clamp-2">
                      {ROLE_DESCRIPTIONS[role]}
                    </span>
                  </button>
                );
              })}
            </div>

            <form onSubmit={handleFormSubmit(handleLogin)} className="space-y-3 sm:space-y-5">
              <div>
                <div className="flex justify-between items-center mb-1 sm:mb-2">
                  <label className="block text-[10px] sm:text-xs font-bold text-slate-900 uppercase tracking-wide">
                    {signInRole === 'owner' ? 'Owner' : 'Manager'} Password
                  </label>
                </div>
                <div className="relative group">
                  <Lock
                    className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-amber-500 transition-colors"
                    size={18}
                  />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    {...register('password')}
                    className={`w-full pl-10 sm:pl-12 pr-10 sm:pr-12 py-2.5 sm:py-3.5 bg-slate-50 border ${
                      errors.password ? 'border-red-400' : 'border-slate-200'
                    } rounded-xl outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium text-sm sm:text-base text-slate-700`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-amber-500 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-[10px] sm:text-xs text-red-600 mt-1">
                    {errors.password.message}
                  </p>
                )}
              </div>

              <ButtonLoading
                type="submit"
                loading={isSubmitting || loading}
                className="w-full py-2.5 sm:py-3.5 bg-slate-900 text-white rounded-xl font-bold text-sm sm:text-base hover:bg-slate-800 hover:shadow-2xl hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-300 ease-in-out shadow-xl shadow-slate-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Sign In as {signInRole === 'owner' ? 'Owner' : 'Manager'} <ArrowRight size={18} />
              </ButtonLoading>
            </form>

            <div className="mt-4 sm:mt-6 flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-400">
                or
              </span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            <button
              type="button"
              onClick={() => void handleVisitorExplore()}
              disabled={isSubmitting || loading}
              className="mt-3 sm:mt-4 w-full rounded-xl border-2 border-sky-200 bg-sky-50 px-3 py-2.5 sm:py-3.5 text-left transition-all hover:border-sky-400 hover:bg-sky-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="flex items-center gap-2 text-sm sm:text-base font-bold text-sky-800">
                <ScanEye size={18} className="shrink-0" />
                Explore as Visitor
              </span>
              <span className="mt-0.5 block text-[10px] sm:text-xs leading-snug text-sky-700/80">
                {ROLE_DESCRIPTIONS.visitor}
              </span>
            </button>

            <p className="mt-4 sm:mt-8 text-center text-[10px] sm:text-sm text-slate-500">
              Need an account?
              <a className="text-amber-600 font-bold ml-1 hover:underline">Contact: +880 1624-269321</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
