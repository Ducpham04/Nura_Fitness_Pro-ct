import { useEffect, useState } from 'react';
import {
  LogOut, User, Target, Award, Flame, Dumbbell,
  TrendingUp, Scale, Loader2, ChevronRight,
  Edit3, Check, Star, Zap,
  Activity,
} from 'lucide-react';
import { useAuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { userService } from '../services/userService';
import { useDashboard } from '../hooks/useDashboard';

const GOAL_LABELS: Record<string, string> = {
  weight_loss: 'Giảm mỡ',
  muscle_gain: 'Tăng cơ',
  maintenance: 'Duy trì',
  endurance: 'Sức bền',
  strength: 'Sức mạnh',
};

const LEVEL_LABELS: Record<string, string> = {
  beginner: 'Người mới',
  intermediate: 'Trung cấp',
  advanced: 'Nâng cao',
};

function StatCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string | number; sub?: string;
  icon: any; color: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 flex flex-col items-center gap-1 text-center">
      <Icon className={`w-4 h-4 ${color} mb-1`} />
      <div className="font-grotesk font-bold text-lg text-white leading-none">{value}</div>
      {sub && <div className="text-neutral-600 text-[11px]">{sub}</div>}
      <div className="text-neutral-500 text-[10px] uppercase tracking-wider mt-0.5">{label}</div>
    </div>
  );
}

function InfoRow({ label, value, editable = false }: { label: string; value: string | number; editable?: boolean }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-white/[0.04] last:border-0">
      <span className="text-neutral-500 text-sm">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-white text-sm font-semibold">{value || '—'}</span>
        {editable && <Edit3 className="w-3 h-3 text-neutral-700" />}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { user, logout } = useAuthContext();
  const navigate = useNavigate();
  const { data: dashData } = useDashboard();
  const [bodyProfile, setBodyProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    Promise.all([
      userService.getBodyProfile(),
    ]).then(([body]) => {
      setBodyProfile(body);
    }).catch(console.error).finally(() => setLoading(false));
  }, [user?.id]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-lime animate-spin" />
      </div>
    );
  }

  const userName = user?.fullName || user?.email?.split('@')[0] || 'User';
  const initial = userName[0]?.toUpperCase() || 'U';
  const level = dashData?.userSummary?.level || 1;
  const streak = dashData?.userSummary?.streakDays || 0;
  const exp = dashData?.userSummary?.currentExp || 0;
  const nextExp = dashData?.userSummary?.nextLevelExp || 100;
  const workoutsWeek = dashData?.stats?.workoutsThisWeek || 0;
  const caloriesBurned = dashData?.stats?.caloriesBurned || 0;
  const completedToday = dashData?.stats?.completedWorkoutsToday || 0;
  const goalLabel = GOAL_LABELS[bodyProfile?.goal || ''] || bodyProfile?.goal || '—';
  const levelLabel = LEVEL_LABELS[bodyProfile?.experienceLevel || ''] || bodyProfile?.experienceLevel || '—';

  return (
    <div className="max-w-2xl mx-auto space-y-4 py-4 animate-fade-in">

      {/* ── Hero card ── */}
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-6">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-lime to-emerald-500 flex items-center justify-center shadow-lg border border-white/10">
              <span className="font-grotesk font-bold text-obsidian text-2xl">{initial}</span>
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-lg bg-lime flex items-center justify-center border-2 border-[#0f1014]">
              <Zap className="w-2.5 h-2.5 text-black" fill="currentColor" />
            </div>
          </div>

          {/* Name + level */}
          <div className="flex-1 min-w-0">
            <h2 className="font-grotesk font-bold italic uppercase text-xl text-white truncate leading-none tracking-tight">{userName}</h2>
            <p className="text-neutral-500 text-xs truncate mt-0.5">{user?.email}</p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-lime/15 text-lime border border-lime/25">
                Lv.{level} · {levelLabel}
              </span>
              {streak > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-400/10 text-orange-400 border border-orange-400/20">
                  🔥 {streak} ngày streak
                </span>
              )}
            </div>
          </div>
        </div>

        {/* XP bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-[10px] text-neutral-600 mb-1">
            <span>EXP</span>
            <span>{exp} / {nextExp}</span>
          </div>
          <div className="h-1.5 bg-white/[0.07] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-lime to-emerald-400 rounded-full transition-all duration-700"
              style={{ width: `${nextExp ? Math.min(100, (exp / nextExp) * 100) : 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-4 gap-2">
        <StatCard label="Tuần này" value={workoutsWeek} sub="buổi" icon={TrendingUp} color="text-lime" />
        <StatCard label="Hôm nay" value={completedToday} sub="hoàn thành" icon={Check} color="text-blue-400" />
        <StatCard label="Kcal đốt" value={caloriesBurned} sub="kcal" icon={Flame} color="text-orange-400" />
        <StatCard label="Mục tiêu" value={goalLabel} icon={Target} color="text-purple-400" />
      </div>

      {/* ── Body info ── */}
      {bodyProfile && (
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <User className="w-4 h-4 text-neutral-500" />
              Thông số cơ thể
            </h3>
            <Link
              to="/dashboard/profile/edit"
              className="text-[10px] text-neutral-500 hover:text-lime transition-colors flex items-center gap-1"
            >
              <Edit3 className="w-3 h-3" /> Chỉnh sửa
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: 'Cân nặng', value: bodyProfile.weight ? `${bodyProfile.weight} kg` : '—', icon: Scale },
              { label: 'Chiều cao', value: bodyProfile.height ? `${bodyProfile.height} cm` : '—', icon: Activity },
              { label: 'BMI', value: bodyProfile.bmi ? bodyProfile.bmi.toFixed(1) : '—', icon: TrendingUp },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-3 text-center">
                <Icon className="w-3.5 h-3.5 text-neutral-600 mx-auto mb-1.5" />
                <div className="font-grotesk font-bold text-sm text-white">{value}</div>
                <div className="text-neutral-600 text-[11px] uppercase tracking-wider mt-0.5">{label}</div>
              </div>
            ))}
          </div>
          <div className="space-y-0 divide-y divide-white/[0.04]">
            <InfoRow label="Tuổi" value={bodyProfile.age ? `${bodyProfile.age} tuổi` : '—'} />
            <InfoRow label="Giới tính" value={bodyProfile.gender === 'MALE' ? 'Nam' : bodyProfile.gender === 'FEMALE' ? 'Nữ' : '—'} />
            <InfoRow label="Mục tiêu" value={goalLabel} />
            <InfoRow label="Trình độ" value={levelLabel} />
            {bodyProfile.injuryNotes && (
              <InfoRow label="Chấn thương" value={bodyProfile.injuryNotes} />
            )}
          </div>
        </div>
      )}

      {/* ── Quick actions ── */}
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] overflow-hidden">
        <div className="px-5 py-3.5 border-b border-white/[0.04]">
          <h3 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Điều hướng nhanh</h3>
        </div>
        {[
          { label: 'Lịch sử tập luyện', sub: 'Xem nhật ký', icon: Dumbbell, to: '/dashboard/logbook', color: 'text-lime' },
          { label: 'Kế hoạch dinh dưỡng', sub: 'Thực đơn & calories', icon: Flame, to: '/dashboard/diet', color: 'text-orange-400' },
          { label: 'Thử thách', sub: 'Huy hiệu & phần thưởng', icon: Award, to: '/dashboard/challenges', color: 'text-yellow-400' },
          { label: 'AI Coach', sub: 'Gợi ý cá nhân', icon: Star, to: '/dashboard/coach', color: 'text-blue-400' },
        ].map(({ label, sub, icon: Icon, to, color }) => (
          <Link
            key={label}
            to={to}
            className="flex items-center gap-3 px-5 py-3.5 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.04] transition-colors group"
          >
            <div className={`w-8 h-8 rounded-xl bg-white/[0.05] flex items-center justify-center shrink-0`}>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold">{label}</p>
              <p className="text-neutral-600 text-xs">{sub}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-neutral-700 group-hover:text-white transition-colors shrink-0" />
          </Link>
        ))}
      </div>

      {/* ── Logout ── */}
      <button
        onClick={handleLogout}
        className="w-full rounded-2xl border border-red-500/15 bg-red-500/[0.04] px-5 py-3.5 flex items-center justify-center gap-2 text-red-400 hover:bg-red-500/[0.08] transition-colors text-sm font-semibold"
      >
        <LogOut className="w-4 h-4" />
        Đăng xuất
      </button>
    </div>
  );
}
