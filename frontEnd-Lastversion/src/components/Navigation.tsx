import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Dumbbell, Utensils, User, LogOut, Brain, History, Trophy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthContext } from '../context/AuthContext';
import LanguageSelector from './LanguageSelector';
import Logo from './Logo';

export default function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthContext();
  const { t } = useTranslation();
  const userName = user?.fullName || 'User';
  
  const navItems = [
    { id: 'home', icon: Home, label: t('nav.home'), path: '/dashboard' },
    { id: 'workout', icon: Dumbbell, label: t('nav.workout'), path: '/dashboard/workout' },
    { id: 'diet', icon: Utensils, label: t('nav.diet'), path: '/dashboard/diet' },
    { id: 'challenges', icon: Trophy, label: t('nav.challenges'), path: '/dashboard/challenges' },
    { id: 'coach', icon: Brain, label: t('nav.coach'), path: '/dashboard/coach' },
    { id: 'logbook', icon: History, label: t('nav.logbook'), path: '/dashboard/logbook' },
    { id: 'profile', icon: User, label: t('nav.profile'), path: '/dashboard/profile' },
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
      <nav className="hidden md:flex border-b border-white/[0.06] bg-[#0a0a0c]/92 px-8 py-3.5 sticky top-0 z-50 backdrop-blur-xl">
        <div className="flex items-center gap-8 flex-1">
          <Link to="/dashboard" className="flex items-center gap-3 group">
            <Logo size={40} wordmarkClass="text-xl" className="group-hover:scale-105 transition-transform" />
          </Link>

          <div className="flex items-center gap-1.5 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-1">
            {navItems.map(({ id, icon: Icon, label, path }) => (
              <Link
                key={id}
                to={path}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all ${
                  isActive(path) 
                    ? 'bg-lime text-obsidian shadow-[0_8px_24px_rgba(204,255,0,0.14)]' 
                    : 'text-neutral-500 hover:text-white hover:bg-white/[0.06]'
                }`}
              >
                <Icon className={`w-4 h-4 ${id === 'coach' && !isActive(path) ? 'text-electric' : ''}`} />
                <span className="font-grotesk font-bold text-[10px] uppercase tracking-widest">{label}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <LanguageSelector />
          <Link to="/dashboard/profile" className="flex items-center gap-3 group">
            <div className="text-right hidden lg:block">
              <div className="text-white text-xs font-bold font-grotesk uppercase tracking-wider">{userName}</div>
              <div className="text-neutral-500 text-[10px] font-medium uppercase tracking-[0.2em]">
                {t('nav.operatorId', { id: user?.id.toString().slice(0, 4) })}
              </div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-lime flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform border border-white/10">
              <span className="font-grotesk font-bold text-obsidian text-sm">{userName[0]?.toUpperCase()}</span>
            </div>
          </Link>
          <button
            onClick={handleLogout}
            aria-label={t('nav.logout')}
            title={t('nav.logout')}
            className="w-10 h-10 rounded-xl glass border border-white/5 text-neutral-500 hover:text-red-400 hover:border-red-400/20 transition-all flex items-center justify-center group"
          >
            <LogOut className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </nav>

      <div className="md:hidden fixed top-4 right-4 z-50">
        <LanguageSelector />
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 glass border-t border-white/5 flex items-center justify-around py-4 pb-8 px-4 z-50 backdrop-blur-2xl">
        {navItems.map(({ id, icon: Icon, label, path }) => (
          <Link
            key={id}
            to={path}
            className={`p-2.5 rounded-2xl transition-all flex flex-col items-center gap-1.5 ${
              isActive(path) ? 'text-lime' : 'text-neutral-500'
            }`}
          >
            <Icon className={`w-6 h-6 ${id === 'coach' ? 'text-electric' : ''}`} />
            <span className="text-[11px] font-bold font-grotesk uppercase tracking-widest">{label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
