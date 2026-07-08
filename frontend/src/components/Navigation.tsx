import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Dumbbell, Apple, User, LogOut, Brain } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import LanguageSelector from './LanguageSelector';
import ThemeToggle from './ThemeToggle';
import Logo from './Logo';

export default function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthContext();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const userName = user?.fullName || 'User';

  const navItems = [
    { id: 'home', icon: Home, label: t('nav.today'), path: '/dashboard' },
    { id: 'workout', icon: Dumbbell, label: t('nav.train'), path: '/dashboard/workout' },
    { id: 'diet', icon: Apple, label: t('nav.diet'), path: '/dashboard/diet' },
    { id: 'coach', icon: Brain, label: t('nav.coach'), path: '/dashboard/coach' },
    { id: 'profile', icon: User, label: t('nav.me'), path: '/dashboard/profile' },
  ];

  const isActive = (path: string) => {
    if (path === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname.startsWith(path);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <>
      {/* Desktop Top Navigation */}
      <nav className="hidden md:flex sticky top-0 z-50 border-b border-white/[0.06] bg-[#0a0a0c]/95 px-8 py-3.5 backdrop-blur-xl">
        <div className="flex items-center gap-8 flex-1">
          <Link to="/dashboard" className="flex items-center gap-3 group">
            <Logo dark size={52} wordmarkClass="text-2xl" className="group-hover:scale-105 transition-transform" />
          </Link>

          <div className="flex items-center gap-1.5 rounded-2xl border border-white/[0.06] bg-white/[0.035] p-1">
            {navItems.map(({ id, icon: Icon, label, path }) => (
              <Link
                key={id}
                to={path}
                className={`relative flex items-center gap-2 rounded-xl px-3 py-2 transition-all ${
                  isActive(path)
                    ? 'bg-white/[0.06] text-lime'
                    : 'text-neutral-500 hover:bg-white/[0.06] hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="font-grotesk font-bold text-[10px] uppercase tracking-widest">{label}</span>
                {isActive(path) && <span className="absolute inset-x-3 -bottom-1 h-0.5 rounded-full bg-current" />}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <LanguageSelector />
          <Link to="/dashboard/profile" className="flex items-center gap-3 group">
            <div className="text-right hidden lg:block">
              <div className="text-white text-xs font-bold font-grotesk uppercase tracking-wider">{userName}</div>
              <div className="text-neutral-500 text-[10px] font-medium uppercase tracking-[0.2em]">
                {t('nav.operatorId', { id: user?.id.toString().slice(0, 4) })}
              </div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-lime flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
              <span className="font-grotesk font-bold text-obsidian text-sm">{userName[0]?.toUpperCase()}</span>
            </div>
          </Link>
          <button
            onClick={handleLogout}
            aria-label={t('nav.logout')}
            title={t('nav.logout')}
            className="w-10 h-10 rounded-xl border border-white/5 bg-white/[0.03] text-neutral-500 hover:text-red-400 hover:border-red-400/20 transition-all flex items-center justify-center group"
          >
            <LogOut className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </nav>

      <div className="fixed inset-x-0 top-0 z-50 border-b border-black/[0.06] bg-[#F1F5F9]/94 px-3 py-2.5 backdrop-blur-xl dark:border-white/[0.06] dark:bg-[#0a0a0c]/94 md:hidden">
        <div className="mx-auto flex max-w-[430px] items-center justify-between gap-3">
          <Link to="/dashboard" className="flex min-w-0 items-center gap-2" aria-label="Viway dashboard">
            <Logo dark={theme === 'dark'} size={38} wordmarkClass="text-xl" />
          </Link>
          <div className="flex shrink-0 items-center gap-1.5">
            <ThemeToggle />
            <LanguageSelector />
            <Link
              to="/dashboard/profile"
              className="grid h-9 w-9 place-items-center rounded-xl bg-white text-sm font-bold text-[#111827] shadow-sm ring-1 ring-black/[0.06] dark:bg-white/[0.08] dark:text-white dark:ring-white/[0.08]"
              aria-label={t('nav.me')}
            >
              {userName[0]?.toUpperCase()}
            </Link>
            <button
              onClick={handleLogout}
              aria-label={t('nav.logout')}
              title={t('nav.logout')}
              className="grid h-9 w-9 place-items-center rounded-xl bg-white text-neutral-500 shadow-sm ring-1 ring-black/[0.06] transition hover:text-red-500 dark:bg-white/[0.08] dark:text-neutral-400 dark:ring-white/[0.08] dark:hover:text-red-300"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex min-h-[68px] items-stretch justify-around border-t border-black/[0.06] bg-[#F1F5F9]/96 px-1.5 pt-2 backdrop-blur-2xl bottom-nav-safe dark:border-white/5 dark:bg-[#0a0a0c]/94 md:hidden">
        {navItems.map(({ id, icon: Icon, label, path }) => {
          const active = isActive(path);
          return (
            <Link
              key={id}
              to={path}
              aria-current={active ? 'page' : undefined}
              className={`relative flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-1.5 transition-all ${
                active
                  ? 'text-[#0055CC] dark:text-lime'
                  : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-500 dark:hover:text-neutral-300'
              }`}
            >
              <span className={`grid h-8 w-8 place-items-center rounded-xl transition-colors ${active ? 'bg-white shadow-sm ring-1 ring-black/[0.05] dark:bg-white/[0.08] dark:ring-white/[0.08]' : ''}`}>
                <Icon className={`h-[21px] w-[21px] shrink-0 transition-transform ${active ? 'scale-105' : ''}`} />
              </span>
              <span className="w-full text-center text-[9.5px] font-semibold leading-none tracking-tight">{label}</span>
              {active && <span className="absolute top-0 h-0.5 w-7 rounded-full bg-current" />}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
