import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Dumbbell, Utensils, User, LogOut, Zap, Brain, History } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthContext } from '../context/AuthContext';
import LanguageSelector from './LanguageSelector';

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
      <nav className="hidden md:flex glass border-b border-white/5 px-10 py-5 sticky top-0 z-50 backdrop-blur-2xl">
        <div className="flex items-center gap-10 flex-1">
          <Link to="/dashboard" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-lime flex items-center justify-center shadow-[0_0_20px_rgba(204,255,0,0.3)] group-hover:scale-110 transition-transform">
              <Zap className="w-5 h-5 text-obsidian" fill="currentColor" />
            </div>
            <span className="font-grotesk font-bold text-white text-xl tracking-tight">Fitnit</span>
          </Link>

          <div className="flex items-center gap-3">
            {navItems.map(({ id, icon: Icon, label, path }) => (
              <Link
                key={id}
                to={path}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl transition-all ${
                  isActive(path) 
                    ? 'bg-lime/10 text-lime border border-lime/20' 
                    : 'text-neutral-500 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className={`w-4 h-4 ${id === 'coach' ? 'text-electric' : ''}`} />
                <span className="font-grotesk font-bold text-[10px] uppercase tracking-widest">{label}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-6">
          <LanguageSelector />
          <Link to="/dashboard/profile" className="flex items-center gap-3 group">
            <div className="text-right hidden lg:block">
              <div className="text-white text-xs font-bold font-grotesk uppercase tracking-wider">{userName}</div>
              <div className="text-neutral-500 text-[10px] font-medium uppercase tracking-[0.2em]">
                {t('nav.operatorId', { id: user?.id.toString().slice(0, 4) })}
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-lime to-emerald-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform border border-white/10">
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
            <span className="text-[9px] font-bold font-grotesk uppercase tracking-widest">{label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
