import React, { useEffect, useState } from 'react';
import { Settings, LogOut, User, Target, DollarSign, Award, ChevronRight, Shield, Zap, Loader2 } from 'lucide-react';
import AnalyticsView from '../components/AnalyticsView';
import { useAuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { userService } from '../services/userService';

export default function ProfilePage() {
  const { user, logout } = useAuthContext();
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) return;
      try {
        const data = await userService.getFullProfile(user.id);
        setProfileData(data);
      } catch (error) {
        console.error('Failed to fetch profile:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user?.id]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-electric animate-spin" />
      </div>
    );
  }

  const userName = user?.fullName || 'User';
  const stats = profileData?.stats || {};
  const activity = profileData?.activity || {};

  return (
    <div className="max-w-4xl mx-auto py-8 px-6 space-y-10 animate-fade-in">
      {/* Profile Header */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-lime/20 to-electric/20 rounded-[3rem] blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
        <div className="relative glass rounded-[3rem] p-10 border border-white/5 overflow-hidden">
          <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-lime to-emerald-500 flex items-center justify-center shadow-2xl">
                <span className="font-grotesk font-bold text-obsidian text-4xl">{userName[0]?.toUpperCase()}</span>
              </div>
              <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-obsidian border-4 border-obsidian flex items-center justify-center">
                <Shield className="w-4 h-4 text-lime" fill="currentColor" />
              </div>
            </div>
            <div className="text-center md:text-left flex-1">
              <div className="flex flex-col md:flex-row md:items-center gap-3 mb-2">
                <h2 className="font-grotesk font-bold text-4xl text-white tracking-tight">{userName}</h2>
                <div className="bg-lime/10 px-3 py-1 rounded-full border border-lime/20 flex items-center gap-2 self-center md:self-auto">
                  <Zap className="w-3.5 h-3.5 text-lime" fill="currentColor" />
                  <span className="text-lime text-[10px] font-bold uppercase tracking-[0.2em]">Level {user?.level || 1} Operator</span>
                </div>
              </div>
              <p className="text-neutral-500 font-medium text-lg">Bio-interface active since {new Date(user?.createdAt || Date.now()).getFullYear()}</p>
            </div>
            <div className="grid grid-cols-3 gap-6">
              {[
                { icon: Target, label: 'Goal', value: profileData?.goal?.title || 'Active' },
                { icon: DollarSign, label: 'Credits', value: (user?.budgetPerDay ? `${user.budgetPerDay / 1000}k` : '80k') },
                { icon: Award, label: 'Score', value: stats.aiScore || '0' },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="text-center">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-3 border border-white/5 group-hover:border-lime/20 transition-colors">
                    <Icon className="w-6 h-6 text-lime" />
                  </div>
                  <div className="text-neutral-500 text-[10px] font-bold uppercase tracking-widest mb-1">{label}</div>
                  <div className="text-white text-sm font-grotesk font-bold tracking-wider">{value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Settings Grid */}
      <div className="grid md:grid-cols-2 gap-8">
        {/* Account Info */}
        <div className="glass rounded-[2.5rem] p-8 border border-white/5">
          <h3 className="font-grotesk font-bold text-white text-xl mb-8 flex items-center gap-3">
            <User className="w-5 h-5 text-electric" />
            Biological Data
          </h3>
          <div className="space-y-2">
            {[
              { label: 'Identity', value: userName },
              { label: 'Neural Link', value: user?.email || 'unlinked' },
              { label: 'Daily Credits', value: `${user?.budgetPerDay?.toLocaleString() || '80,000'} VND` },
              { label: 'Objective', value: profileData?.goal?.title || 'Building Protocol' },
              { label: 'Total Energy', value: `${activity.totalCaloriesBurned || 0} kcal` },
              { label: 'Missions', value: `${stats.challengesCompleted || 0} units` },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between p-4 rounded-2xl hover:bg-white/5 transition-colors group cursor-pointer border border-transparent hover:border-white/5">
                <span className="text-neutral-500 text-sm font-medium">{label}</span>
                <div className="flex items-center gap-3">
                  <span className="text-white text-sm font-bold font-grotesk tracking-wide">{value}</span>
                  <ChevronRight className="w-4 h-4 text-neutral-600 group-hover:text-white transition-colors" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System Progress */}
        <div className="glass rounded-[2.5rem] p-8 border border-white/5 flex flex-col">
          <h3 className="font-grotesk font-bold text-white text-xl mb-8 flex items-center gap-3">
            <Settings className="w-5 h-5 text-lime" />
            System Metrics
          </h3>
          <div className="flex-1 flex flex-col justify-center">
            <AnalyticsView userName={userName} />
          </div>
        </div>
      </div>

      {/* Logout Button */}
      <button 
        onClick={handleLogout} 
        className="w-full bg-red-500/5 hover:bg-red-500/10 rounded-[2rem] p-6 border border-red-500/10 text-red-400 hover:text-red-300 transition-all flex items-center justify-center gap-3 font-grotesk font-bold uppercase tracking-[0.3em] group"
      >
        <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
        Terminate Session
      </button>
    </div>
  );
}
