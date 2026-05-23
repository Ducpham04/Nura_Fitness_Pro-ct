import { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation';
import { useAuthContext } from '../context/AuthContext';
import { userService } from '../services/userService';
import { useTranslation } from 'react-i18next';

export default function DashboardLayout() {
  const { user } = useAuthContext();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkUserSetup() {
      if (!user) return;
      if (user.role === 'ADMIN') {
        setChecking(false);
        return;
      }
      try {
        const profile = await userService.getBodyProfile();
        if (!profile) {
          console.error('No user profile found or network error, redirecting to onboarding');
          navigate('/onboarding');
          return;
        }
        setChecking(false);
      } catch (e) {
        console.error('Error checking profile, redirecting to onboarding:', e);
        navigate('/onboarding');
      }
    }
    checkUserSetup();
  }, [user, navigate]);

  if (checking) {
    return (
      <div className="flex h-screen bg-obsidian items-center justify-center">
        <div className="text-center space-y-6">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 border-4 border-lime/20 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-lime rounded-full border-t-transparent animate-spin"></div>
          </div>
          <p className="text-neutral-500 font-bold font-grotesk uppercase tracking-widest text-xs animate-pulse">{t('dashboard.syncingProfile')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-obsidian font-inter overflow-hidden flex-col">
      <Navigation />
      <main className="flex-1 overflow-y-auto px-6 pb-32 pt-16 md:py-8">
        <Outlet />
      </main>
    </div>
  );
}
