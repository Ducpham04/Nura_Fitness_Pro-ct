import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Dumbbell, Utensils, User, Route, LogOut, Bell } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthContext } from '../context/AuthContext';
import Logo from './Logo';

const NAV_ITEMS = (t: (k: string) => string) => [
  { id: 'home',    icon: Home,     label: t('nav.home'),    path: '/dashboard' },
  { id: 'journey', icon: Route,    label: t('nav.journey'), path: '/dashboard/journey' },
  { id: 'workout', icon: Dumbbell, label: t('nav.workout'), path: '/dashboard/workout' },
  { id: 'diet',    icon: Utensils, label: t('nav.diet'),    path: '/dashboard/diet' },
  { id: 'profile', icon: User,     label: t('nav.profile'), path: '/dashboard/profile' },
];

export default function Navigation() {
  const location  = useLocation();
  const navigate  = useNavigate();
  const { user, logout } = useAuthContext();
  const { t }     = useTranslation();

  const navItems  = NAV_ITEMS(t);
  const userName  = user?.fullName || 'U';

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
      {/* ── Desktop top bar ── */}
      <header className="hidden md:flex items-center justify-between px-6 py-3 bg-[#070b16]/80 backdrop-blur-xl border-b border-white/8 sticky top-0 z-50 shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
        {/* Logo */}
        <Link to="/dashboard" className="flex items-center gap-2 shrink-0">
          <Logo size={44} wordmarkClass="text-xl" dark />
        </Link>

        {/* Nav tabs */}
        <nav className="flex items-center gap-1 bg-white/5 border border-white/8 rounded-2xl p-1">
          {navItems.map(({ id, icon: Icon, label, path }) => (
            <Link
              key={id}
              to={path}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold font-grotesk uppercase tracking-widest transition-all ${
                isActive(path)
                  ? 'bg-[#CCFF00] text-[#0a0f1c] shadow-[0_0_18px_rgba(204,255,0,0.35)]'
                  : 'text-[#94a3b8] hover:text-white hover:bg-white/8'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        {/* Right: notification + avatar + logout */}
        <div className="flex items-center gap-3">
          <button className="w-9 h-9 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center text-[#94a3b8] hover:bg-white/10 hover:text-white transition-colors">
            <Bell className="w-4 h-4" />
          </button>

          <Link to="/dashboard/profile" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#22c55e] to-[#3b82f6] flex items-center justify-center shadow-[0_4px_14px_rgba(59,130,246,0.4)]">
              <span className="text-white font-grotesk font-bold text-sm">
                {userName[0]?.toUpperCase()}
              </span>
            </div>
            <div className="hidden lg:block text-right">
              <div className="text-xs font-bold text-white truncate max-w-[120px]">{userName}</div>
              <div className="text-[10px] text-[#64748b]">Cấp {user?.id ? 1 : '—'}</div>
            </div>
          </Link>

          <button
            onClick={handleLogout}
            title={t('nav.logout')}
            className="w-9 h-9 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center text-[#94a3b8] hover:bg-red-500/15 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ── Mobile bottom nav ── */}
      <nav className="vw-bottom-nav md:hidden">
        {navItems.map(({ id, icon: Icon, label, path }) => (
          <Link
            key={id}
            to={path}
            className={`vw-nav-item ${isActive(path) ? 'active' : ''}`}
          >
            <Icon className="vw-nav-icon" />
            <span className="truncate w-full text-center">{label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
