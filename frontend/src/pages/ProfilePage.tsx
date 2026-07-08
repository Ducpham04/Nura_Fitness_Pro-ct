import { useEffect, useState } from 'react';
import {
  LogOut, User, Target, Award, Flame, Dumbbell,
  TrendingUp, Scale, Loader2, ChevronRight,
  Edit3, Check, Star, Zap,
  Sparkles, ArrowUpRight,
  Settings, Lock, Mail, Save, ShieldAlert, Trash2, X,
  Gift, Copy, CheckCheck, Camera, Share2, RefreshCw, Repeat2,
  Calendar, Ruler, Percent, Trophy, Crown, Apple,
} from 'lucide-react';
import { useAuthContext } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { userService } from '../services/userService';
import { useDashboard } from '../hooks/useDashboard';
import { useAiUsage } from '../hooks/useAiUsage';
import { AiUpgradeModal } from '../components/AiUpgradeModal';

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

// Tile chỉ số cơ thể (mockup: Cân nặng / Chiều cao / Body fat / BMI)
function MetricTile({ label, value, delta, icon: Icon, tint }: {
  label: string; value: string; delta?: string; icon: any; tint: string;
}) {
  return (
    <div className="rounded-[16px] bg-white p-3 shadow-[0_10px_24px_rgba(15,23,42,0.05)] border border-slate-100">
      <span className={`grid h-8 w-8 place-items-center rounded-[10px] ${tint} mb-2`}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="font-grotesk font-bold text-lg text-slate-900 leading-none">{value}</div>
      <div className="text-slate-500 text-[11px] mt-1">{label}</div>
      {delta && <div className="text-teal-600 text-[10px] font-semibold mt-0.5">{delta}</div>}
    </div>
  );
}

// Tile thành tựu (mockup: Kiên trì / Đốt cháy / Nâng level / Ăn uống tốt)
function AchievementTile({ label, sub, icon: Icon, tint, active = true }: {
  label: string; sub: string; icon: any; tint: string; active?: boolean;
}) {
  return (
    <div className={`rounded-[16px] p-3 text-center border ${active ? 'bg-white border-slate-100 shadow-[0_10px_24px_rgba(15,23,42,0.05)]' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
      <span className={`mx-auto grid h-11 w-11 place-items-center rounded-full ${tint} mb-2`}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="text-[12px] font-bold text-slate-800 leading-tight">{label}</div>
      <div className="text-slate-400 text-[10px] mt-0.5 leading-tight">{sub}</div>
    </div>
  );
}

export default function ProfilePage() {
  const { user, logout } = useAuthContext();
  const navigate = useNavigate();
  const { data: dashData } = useDashboard();
  const [bodyProfile, setBodyProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const { usage, packages: aiPackages, loading: usageLoading, refresh: refreshUsage } = useAiUsage(user?.id ?? null);

  // ── Cài đặt tài khoản ──
  const [showAccount, setShowAccount] = useState(false);
  const [pName, setPName] = useState(user?.fullName ?? '');
  const [pEmail, setPEmail] = useState(user?.email ?? '');
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [curPw, setCurPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [deactivateConfirm, setDeactivateConfirm] = useState(false);
  const [deactivateBusy, setDeactivateBusy] = useState(false);

  // ── Avatar upload ──
  const [avatarUrl, setAvatarUrl] = useState<string | null>(() =>
    localStorage.getItem(`avatar_${user?.id}`) ?? null
  );
  const [avatarHover, setAvatarHover] = useState(false);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert('Ảnh tối đa 2MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target?.result as string;
      setAvatarUrl(url);
      localStorage.setItem(`avatar_${user?.id}`, url);
    };
    reader.readAsDataURL(file);
  };

  // ── Referral ──
  const [referralInfo, setReferralInfo] = useState<{
    referralCode: string; referralCount: number; creditsEarned: number;
    currentPackage: string; referralsUntilPlus: number; referralsUntilPro: number;
    plusUnlocked: boolean; proUnlocked: boolean;
  } | null>(null);
  const [refCopied, setRefCopied] = useState(false);

  const handleSaveProfile = async () => {
    setProfileBusy(true);
    setProfileMsg(null);
    const emailChanged = pEmail.trim().toLowerCase() !== (user?.email ?? '').toLowerCase();
    const res = await userService.updateMyProfile({ fullName: pName.trim(), email: pEmail.trim() });
    setProfileBusy(false);
    if (res.ok) {
      if (emailChanged) {
        setProfileMsg({ ok: true, text: 'Đổi email thành công. Vui lòng đăng nhập lại…' });
        setTimeout(() => { logout(); navigate('/login'); }, 1600);
      } else {
        setProfileMsg({ ok: true, text: res.message || 'Đã lưu' });
      }
    } else {
      setProfileMsg({ ok: false, text: res.message || 'Lưu thất bại' });
    }
  };

  const handleChangePassword = async () => {
    setPwMsg(null);
    if (newPw.length < 6) { setPwMsg({ ok: false, text: 'Mật khẩu mới tối thiểu 6 ký tự' }); return; }
    if (newPw !== confirmPw) { setPwMsg({ ok: false, text: 'Xác nhận mật khẩu không khớp' }); return; }
    setPwBusy(true);
    const res = await userService.changePassword(curPw, newPw);
    setPwBusy(false);
    if (res.ok) {
      setPwMsg({ ok: true, text: res.message || 'Đổi mật khẩu thành công' });
      setCurPw(''); setNewPw(''); setConfirmPw('');
    } else {
      setPwMsg({ ok: false, text: res.message || 'Đổi mật khẩu thất bại' });
    }
  };

  const handleDeactivate = async () => {
    setDeactivateBusy(true);
    const res = await userService.deactivateMyAccount();
    setDeactivateBusy(false);
    if (res.ok) { logout(); navigate('/login'); }
    else { setProfileMsg({ ok: false, text: res.message || 'Thao tác thất bại' }); setDeactivateConfirm(false); }
  };

  useEffect(() => {
    if (!user?.id) return;
    userService.getBodyProfile()
      .then(body => setBodyProfile(body))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    userService.getReferralInfo()
      .then(refInfo => { if (refInfo) setReferralInfo(refInfo); })
      .catch(console.error);
  }, [user?.id]);

  const handleCopyReferralLink = () => {
    if (!referralInfo?.referralCode) return;
    const link = `${window.location.origin}/register?ref=${referralInfo.referralCode}`;
    navigator.clipboard.writeText(link).then(() => {
      setRefCopied(true);
      setTimeout(() => setRefCopied(false), 2000);
    });
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
      </div>
    );
  }

  const userName = user?.fullName || user?.email?.split('@')[0] || 'User';
  const initial = userName[0]?.toUpperCase() || 'U';
  const level = dashData?.userSummary?.level || 1;
  const streak = dashData?.userSummary?.streakDays || 0;
  const exp = dashData?.userSummary?.currentExp || 0;
  const nextExp = dashData?.userSummary?.nextLevelExp || 100;
  const caloriesBurned = dashData?.stats?.caloriesBurned || 0;
  const completedToday = dashData?.stats?.completedWorkoutsToday || 0;
  const goalLabel = GOAL_LABELS[bodyProfile?.goal || ''] || bodyProfile?.goal || '—';
  const levelLabel = LEVEL_LABELS[bodyProfile?.experienceLevel || ''] || bodyProfile?.experienceLevel || '—';
  const isPro = usage?.packageCode === 'PRO' || usage?.packageCode === 'PLUS';
  // Tổng ngày hoạt động: dùng số thật nếu BE có, không thì fallback streak
  const totalActiveDays = (dashData?.userSummary as any)?.totalActiveDays ?? (dashData?.stats as any)?.totalActiveDays ?? streak;
  // Thành viên từ: từ createdAt nếu có
  const createdAt = (user as any)?.createdAt as string | undefined;
  const memberSince = createdAt
    ? new Date(createdAt).toLocaleDateString('vi-VN', { month: '2-digit', year: 'numeric' })
    : null;
  const bodyFat = bodyProfile?.bodyFat ?? bodyProfile?.bodyFatPercentage;

  return (
    <div className="mx-auto w-full max-w-[460px] lg:max-w-3xl space-y-4 pb-24 pt-1 sm:px-2 text-[#111827]">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-1">
        <h1 className="font-grotesk text-[22px] font-bold tracking-tight text-slate-900">Hồ sơ</h1>
        <button
          onClick={() => setShowAccount(v => !v)}
          className="grid h-9 w-9 place-items-center rounded-full bg-white text-slate-500 shadow-[0_6px_16px_rgba(15,23,42,0.06)] hover:text-teal-600 transition-colors"
          title="Cài đặt tài khoản"
        >
          <Settings className="h-[18px] w-[18px]" />
        </button>
      </div>

      {/* ── Profile card ── */}
      <div className="rounded-[20px] bg-white p-4 shadow-[0_14px_34px_rgba(15,23,42,0.06)]">
        <div className="flex items-center gap-3.5">
          {/* Avatar — clickable upload */}
          <div className="relative shrink-0 group cursor-pointer"
            onMouseEnter={() => setAvatarHover(true)}
            onMouseLeave={() => setAvatarHover(false)}>
            <label htmlFor="avatar-upload" className="cursor-pointer block">
              <div className="w-[60px] h-[60px] rounded-2xl overflow-hidden ring-1 ring-slate-200 shadow-sm">
                {avatarUrl
                  ? <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                  : <div className="w-full h-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center">
                      <span className="font-grotesk font-bold text-white text-2xl">{initial}</span>
                    </div>
                }
              </div>
              <div className={`absolute inset-0 rounded-2xl bg-black/45 flex items-center justify-center transition-opacity ${avatarHover ? 'opacity-100' : 'opacity-0'}`}>
                <Camera className="w-5 h-5 text-white" />
              </div>
            </label>
            <input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-lg bg-teal-500 flex items-center justify-center ring-2 ring-white">
              <Zap className="w-2.5 h-2.5 text-white" fill="currentColor" />
            </div>
          </div>

          {/* Name + level + badges */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-grotesk font-bold text-lg text-slate-900 truncate leading-tight">{userName}</h2>
              <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                Lv.{level}
              </span>
              {isPro && (
                <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200">
                  <Crown className="w-3 h-3" /> {usage?.packageCode}
                </span>
              )}
            </div>
            <p className="text-slate-500 text-[13px] mt-1 truncate">
              Mục tiêu: <span className="font-semibold text-slate-700">{goalLabel}{levelLabel !== '—' ? ` · ${levelLabel}` : ''}</span>
            </p>
            {memberSince && (
              <p className="text-slate-400 text-[11px] mt-0.5">Thành viên từ {memberSince}</p>
            )}
          </div>

          {referralInfo && (
            <button
              onClick={handleCopyReferralLink}
              className="shrink-0 flex flex-col items-center gap-1 px-2.5 py-2 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 hover:bg-teal-100 transition-colors"
              title="Sao chép link mời bạn"
            >
              {refCopied ? <CheckCheck className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
              <span className="text-[9px] font-bold">{refCopied ? 'Đã copy!' : 'Mời bạn'}</span>
            </button>
          )}
        </div>

        {/* XP bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
            <span className="font-semibold tracking-wide">EXP</span>
            <span>{exp} / {nextExp}</span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full transition-all duration-700"
              style={{ width: `${nextExp ? Math.min(100, (exp / nextExp) * 100) : 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── 2 stat lớn: chuỗi duy trì + tổng ngày hoạt động ── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-[16px] bg-white p-4 shadow-[0_12px_26px_rgba(15,23,42,0.06)] flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-[12px] bg-orange-50 text-orange-500">
            <Flame className="h-5 w-5" />
          </span>
          <div>
            <div className="font-grotesk font-bold text-xl text-slate-900 leading-none">{streak}</div>
            <div className="text-slate-500 text-[11px] mt-1">Chuỗi duy trì · ngày</div>
          </div>
        </div>
        <div className="rounded-[16px] bg-white p-4 shadow-[0_12px_26px_rgba(15,23,42,0.06)] flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-[12px] bg-teal-50 text-teal-600">
            <Calendar className="h-5 w-5" />
          </span>
          <div>
            <div className="font-grotesk font-bold text-xl text-slate-900 leading-none">{totalActiveDays}</div>
            <div className="text-slate-500 text-[11px] mt-1">Tổng ngày hoạt động</div>
          </div>
        </div>
      </div>

      {/* ── Chỉ số cơ thể ── */}
      {bodyProfile && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-bold text-slate-900">Chỉ số cơ thể</h3>
            <Link
              to="/dashboard/profile/edit"
              className="text-[11px] text-slate-400 hover:text-teal-600 transition-colors flex items-center gap-1"
            >
              <Edit3 className="w-3 h-3" /> Cập nhật
            </Link>
          </div>
          <div className="grid grid-cols-4 gap-2.5">
            <MetricTile label="Cân nặng" value={bodyProfile.weight ? `${bodyProfile.weight}` : '—'} icon={Scale} tint="bg-teal-50 text-teal-600" />
            <MetricTile label="Chiều cao" value={bodyProfile.height ? `${bodyProfile.height}` : '—'} icon={Ruler} tint="bg-blue-50 text-blue-500" />
            <MetricTile label="Tỷ lệ mỡ" value={bodyFat != null ? `${Math.round(bodyFat)}%` : '—'} icon={Percent} tint="bg-orange-50 text-orange-500" />
            <MetricTile label="BMI" value={bodyProfile.bmi ? bodyProfile.bmi.toFixed(1) : '—'} icon={TrendingUp} tint="bg-indigo-50 text-indigo-500" />
          </div>
        </div>
      )}

      {/* ── Mục tiêu hiện tại ── */}
      <div className="rounded-[20px] bg-white p-4 shadow-[0_14px_34px_rgba(15,23,42,0.06)]">
        <div className="flex items-center gap-2 mb-3">
          <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-teal-50 text-teal-600">
            <Target className="h-4 w-4" />
          </span>
          <h3 className="text-sm font-bold text-slate-900">Mục tiêu hiện tại</h3>
        </div>
        <p className="text-[15px] font-bold text-slate-800">{goalLabel}</p>
        <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 mb-1.5">
          <span>Tiến độ EXP cấp độ</span>
          <span className="font-semibold text-teal-600">Lv.{level} → {level + 1}</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full transition-all duration-700"
            style={{ width: `${nextExp ? Math.min(100, (exp / nextExp) * 100) : 0}%` }}
          />
        </div>
      </div>

      {/* ── Thành tựu ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-bold text-slate-900">Thành tựu</h3>
          <Link to="/dashboard/challenges" className="text-[11px] text-slate-400 hover:text-teal-600 transition-colors flex items-center gap-1">
            Xem tất cả <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="grid grid-cols-4 gap-2.5">
          <AchievementTile label="Kiên trì" sub={`${streak} ngày`} icon={Flame} tint="bg-orange-50 text-orange-500" active={streak > 0} />
          <AchievementTile label="Đốt cháy" sub={`${caloriesBurned} kcal`} icon={Zap} tint="bg-teal-50 text-teal-600" active={caloriesBurned > 0} />
          <AchievementTile label="Nâng level" sub={`Lv.${level}`} icon={Trophy} tint="bg-indigo-50 text-indigo-500" active={level > 1} />
          <AchievementTile label="Ăn uống tốt" sub="Dinh dưỡng" icon={Apple} tint="bg-emerald-50 text-emerald-500" active={completedToday > 0} />
        </div>
      </div>

      {/* ── CTA chỉnh sửa hồ sơ ── */}
      <Link
        to="/dashboard/profile/edit"
        className="flex w-full items-center justify-center gap-2 rounded-[16px] bg-teal-600 px-5 py-3.5 text-sm font-bold text-white shadow-[0_14px_30px_-10px_rgba(13,148,136,0.6)] hover:bg-teal-700 transition-colors"
      >
        <Edit3 className="w-4 h-4" /> Chỉnh sửa hồ sơ
      </Link>

      {/* ── AI Package ── */}
      <div className="rounded-[20px] bg-white p-4 shadow-[0_14px_34px_rgba(15,23,42,0.06)]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-teal-600" />
            Gói AI
          </h3>
          {usage && usage.packageCode !== 'PRO' && (
            <button
              onClick={() => setUpgradeModalOpen(true)}
              className="flex items-center gap-1 text-[11px] text-teal-600 hover:text-teal-700 transition-colors font-semibold"
            >
              <ArrowUpRight className="w-3 h-3" /> Nâng cấp
            </button>
          )}
        </div>

        {usageLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 text-slate-300 animate-spin" />
          </div>
        ) : usage ? (
          <div className="space-y-3">
            {/* Package badge */}
            <div className="flex items-center gap-3">
              <div className={`px-3 py-1 rounded-full text-xs font-bold border ${
                usage.packageCode === 'PRO'
                  ? 'bg-violet-50 text-violet-600 border-violet-200'
                  : usage.packageCode === 'PLUS'
                  ? 'bg-blue-50 text-blue-600 border-blue-200'
                  : 'bg-slate-100 text-slate-500 border-slate-200'
              }`}>
                {usage.packageCode === 'PRO' ? '⚡ PRO' : usage.packageCode === 'PLUS' ? '✦ PLUS' : '○ FREE'}
              </div>
              {usage.packageExpiresAt && (
                <span className="text-[11px] text-slate-400">
                  Hết hạn {new Date(usage.packageExpiresAt).toLocaleDateString('vi-VN')}
                </span>
              )}
            </div>

            {/* Credits bar */}
            <div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1.5">
                <span>Lượt AI đã dùng</span>
                <span className="font-semibold text-slate-800">
                  {usage.used} / {usage.isUnlimited ? '∞' : usage.quota}
                </span>
              </div>
              {!usage.isUnlimited && (
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      usage.used / usage.quota > 0.8
                        ? 'bg-red-400'
                        : usage.used / usage.quota > 0.5
                        ? 'bg-amber-400'
                        : 'bg-teal-500'
                    }`}
                    style={{ width: `${Math.min(100, (usage.used / usage.quota) * 100)}%` }}
                  />
                </div>
              )}
              {usage.isUnlimited && (
                <div className="h-1.5 bg-teal-100 rounded-full overflow-hidden">
                  <div className="h-full w-full bg-teal-500 rounded-full" />
                </div>
              )}
              {usage.resetAt && (
                <p className="text-[10px] text-slate-400 mt-1">
                  Reset vào {new Date(usage.resetAt).toLocaleDateString('vi-VN')}
                </p>
              )}
            </div>

            {/* Swap limits */}
            {(usage.exerciseSwapLimit !== undefined) && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                {[
                  { label: 'Đổi bài tập', used: usage.exerciseSwapUsed, limit: usage.exerciseSwapLimit, icon: Repeat2, color: 'text-blue-500' },
                  { label: 'Đổi món ăn', used: usage.mealSwapUsed, limit: usage.mealSwapLimit, icon: RefreshCw, color: 'text-orange-500' },
                ].map(({ label, used: su, limit, icon: Icon, color }) => {
                  const isUnlim = limit === -1;
                  const pct = isUnlim ? 100 : limit > 0 ? Math.min(100, (su / limit) * 100) : 0;
                  const remaining = isUnlim ? -1 : Math.max(0, limit - su);
                  return (
                    <div key={label} className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Icon className={`w-3 h-3 ${color}`} />
                        <span className="text-[10px] text-slate-500 font-semibold">{label}</span>
                      </div>
                      <div className={`font-grotesk font-bold text-base ${remaining === 0 && !isUnlim ? 'text-red-500' : 'text-slate-900'}`}>
                        {isUnlim ? '∞' : remaining}
                        <span className="text-slate-400 text-[10px] font-normal ml-1">
                          {isUnlim ? 'lượt' : `/ ${limit} lượt`}
                        </span>
                      </div>
                      <div className="h-1 mt-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${pct > 80 ? 'bg-red-400' : color.replace('text-', 'bg-')}`}
                          style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Upgrade CTA nếu đang dùng FREE */}
            {usage.packageCode === 'FREE' && (
              <div className="flex gap-2 mt-1">
                <button
                  onClick={() => setUpgradeModalOpen(true)}
                  className="flex-1 py-2.5 rounded-xl bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Zap className="w-3.5 h-3.5" fill="currentColor" />
                  Mua gói PLUS / PRO
                </button>
                <button
                  onClick={handleCopyReferralLink}
                  className="flex-1 py-2.5 rounded-xl border border-teal-200 bg-teal-50 text-teal-700 text-xs font-bold hover:bg-teal-100 transition-colors flex items-center justify-center gap-2"
                >
                  {refCopied ? <CheckCheck className="w-3.5 h-3.5" /> : <Gift className="w-3.5 h-3.5" />}
                  {refCopied ? 'Đã copy link' : 'Mời bạn → nhận PLUS'}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-3">
            <p className="text-slate-500 text-sm text-center">Không thể tải thông tin gói AI.</p>
            <button
              onClick={refreshUsage}
              className="text-xs text-teal-600 hover:text-teal-700 font-semibold flex items-center gap-1 transition-colors"
            >
              <RefreshCw className="w-3 h-3" /> Thử lại
            </button>
          </div>
        )}
      </div>

      {/* ── Referral / Mời bạn ── */}
      {referralInfo && (
        <div className="rounded-[20px] bg-white p-4 shadow-[0_14px_34px_rgba(15,23,42,0.06)] border border-teal-100 space-y-4">
          <div className="flex items-center gap-2">
            <Gift className="w-4 h-4 text-teal-600" />
            <h3 className="text-sm font-bold text-slate-900">Mời bạn bè — nhận gói miễn phí</h3>
          </div>

          {/* Referral link */}
          <div>
            <p className="text-[11px] text-slate-500 mb-2">
              Bạn bè đăng ký qua link → họ nhận <strong className="text-slate-700">+25 credit</strong>. Bạn tích lũy lượt mời và nhận gói khi đạt mốc.
            </p>
            <div className="flex gap-2 items-center">
              <div className="flex-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 truncate font-mono">
                {window.location.origin}/register?ref={referralInfo.referralCode}
              </div>
              <button
                onClick={handleCopyReferralLink}
                className="p-2 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 hover:bg-teal-100 transition-colors flex-shrink-0"
                title="Sao chép link"
              >
                {refCopied ? <CheckCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Stats row */}
          <div className="flex gap-3">
            <div className="flex-1 text-center py-2 rounded-xl bg-slate-50 border border-slate-100">
              <div className="text-xl font-black text-teal-600">{referralInfo.referralCount}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">Đã mời</div>
            </div>
            <div className="flex-1 text-center py-2 rounded-xl bg-slate-50 border border-slate-100">
              <div className="text-xl font-black text-teal-600">{referralInfo.referralsUntilPlus > 0 ? referralInfo.referralsUntilPlus : referralInfo.referralsUntilPro}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">{referralInfo.referralsUntilPlus > 0 ? 'Còn đến PLUS' : 'Còn đến PRO'}</div>
            </div>
          </div>

          {/* Milestone progress */}
          <div className="space-y-2.5">
            {/* PLUS milestone */}
            <div className={`rounded-xl p-3 border ${referralInfo.plusUnlocked ? 'border-teal-300 bg-teal-50' : 'border-slate-100 bg-slate-50'}`}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  {referralInfo.plusUnlocked
                    ? <CheckCheck className="w-3.5 h-3.5 text-teal-600" />
                    : <Zap className="w-3.5 h-3.5 text-blue-500" />}
                  <span className="text-xs font-bold text-slate-800">✦ PLUS — 200 credit/tháng</span>
                </div>
                <span className={`text-[10px] font-semibold ${referralInfo.plusUnlocked ? 'text-teal-600' : 'text-slate-500'}`}>
                  {referralInfo.plusUnlocked ? 'Đã đạt!' : `${referralInfo.referralCount}/5`}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${referralInfo.plusUnlocked ? 'bg-teal-500' : 'bg-blue-400'}`}
                  style={{ width: `${Math.min(100, (referralInfo.referralCount / 5) * 100)}%` }}
                />
              </div>
              {!referralInfo.plusUnlocked && (
                <p className="text-[10px] text-slate-400 mt-1">Còn {referralInfo.referralsUntilPlus} người nữa</p>
              )}
            </div>

            {/* PRO milestone */}
            <div className={`rounded-xl p-3 border ${referralInfo.proUnlocked ? 'border-violet-300 bg-violet-50' : 'border-slate-100 bg-slate-50'}`}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  {referralInfo.proUnlocked
                    ? <CheckCheck className="w-3.5 h-3.5 text-violet-500" />
                    : <Zap className="w-3.5 h-3.5 text-violet-500" />}
                  <span className="text-xs font-bold text-slate-800">⚡ PRO — Không giới hạn</span>
                </div>
                <span className={`text-[10px] font-semibold ${referralInfo.proUnlocked ? 'text-violet-500' : 'text-slate-500'}`}>
                  {referralInfo.proUnlocked ? 'Đã đạt!' : `${referralInfo.referralCount}/20`}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${referralInfo.proUnlocked ? 'bg-violet-500' : 'bg-violet-400'}`}
                  style={{ width: `${Math.min(100, (referralInfo.referralCount / 20) * 100)}%` }}
                />
              </div>
              {!referralInfo.proUnlocked && (
                <p className="text-[10px] text-slate-400 mt-1">Còn {referralInfo.referralsUntilPro} người nữa</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Điều hướng nhanh (list links) ── */}
      <div className="rounded-[20px] bg-white shadow-[0_14px_34px_rgba(15,23,42,0.06)] overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Điều hướng nhanh</h3>
        </div>
        {[
          { label: 'Lịch sử tiến trình', sub: 'Nhật ký tập luyện', icon: Dumbbell, to: '/dashboard/logbook', tint: 'bg-teal-50 text-teal-600' },
          { label: 'Kế hoạch dinh dưỡng', sub: 'Thực đơn & calories', icon: Flame, to: '/dashboard/diet', tint: 'bg-orange-50 text-orange-500' },
          { label: 'Thử thách', sub: 'Huy hiệu & phần thưởng', icon: Award, to: '/dashboard/challenges', tint: 'bg-amber-50 text-amber-500' },
          { label: 'AI Coach', sub: 'Gợi ý cá nhân', icon: Star, to: '/dashboard/coach', tint: 'bg-blue-50 text-blue-500' },
        ].map(({ label, sub, icon: Icon, to, tint }) => (
          <Link
            key={label}
            to={to}
            className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors group"
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${tint}`}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-slate-800 text-sm font-semibold">{label}</p>
              <p className="text-slate-400 text-xs">{sub}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors shrink-0" />
          </Link>
        ))}
      </div>

      {/* ── Cài đặt tài khoản ── */}
      <div className="rounded-[20px] bg-white shadow-[0_14px_34px_rgba(15,23,42,0.06)] overflow-hidden">
        <button
          onClick={() => setShowAccount(v => !v)}
          className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition-colors"
        >
          <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
            <Settings className="w-4 h-4 text-slate-500" />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-slate-800 text-sm font-semibold">Cài đặt tài khoản</p>
            <p className="text-slate-400 text-xs">Đổi thông tin, mật khẩu, vô hiệu hoá tài khoản</p>
          </div>
          <ChevronRight className={`w-4 h-4 text-slate-300 transition-transform ${showAccount ? 'rotate-90' : ''}`} />
        </button>

        {showAccount && (
          <div className="px-4 pb-5 pt-1 space-y-6 border-t border-slate-100">
            {/* Thông tin cơ bản */}
            <div className="space-y-3 pt-4">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <User className="w-3.5 h-3.5" /> Thông tin cơ bản
              </h4>
              <div>
                <label className="text-[11px] text-slate-500 mb-1 block">Tên hiển thị</label>
                <input
                  value={pName}
                  onChange={e => setPName(e.target.value)}
                  className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-teal-400"
                  placeholder="Tên của bạn"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-500 mb-1 block flex items-center gap-1">
                  <Mail className="w-3 h-3" /> Email
                </label>
                <input
                  value={pEmail}
                  onChange={e => setPEmail(e.target.value)}
                  type="email"
                  className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-teal-400"
                  placeholder="email@example.com"
                />
                <p className="text-[10px] text-slate-400 mt-1">Đổi email sẽ yêu cầu đăng nhập lại.</p>
              </div>
              {profileMsg && (
                <p className={`text-xs ${profileMsg.ok ? 'text-teal-600' : 'text-red-500'}`}>{profileMsg.text}</p>
              )}
              <button
                onClick={handleSaveProfile}
                disabled={profileBusy}
                className="w-full py-2.5 rounded-xl bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {profileBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Lưu thông tin
              </button>
            </div>

            {/* Đổi mật khẩu */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <Lock className="w-3.5 h-3.5" /> Đổi mật khẩu
              </h4>
              <input
                value={curPw}
                onChange={e => setCurPw(e.target.value)}
                type="password"
                autoComplete="current-password"
                className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-teal-400"
                placeholder="Mật khẩu hiện tại"
              />
              <input
                value={newPw}
                onChange={e => setNewPw(e.target.value)}
                type="password"
                autoComplete="new-password"
                className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-teal-400"
                placeholder="Mật khẩu mới (tối thiểu 6 ký tự)"
              />
              <input
                value={confirmPw}
                onChange={e => setConfirmPw(e.target.value)}
                type="password"
                autoComplete="new-password"
                className="w-full rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-teal-400"
                placeholder="Xác nhận mật khẩu mới"
              />
              {pwMsg && (
                <p className={`text-xs ${pwMsg.ok ? 'text-teal-600' : 'text-red-500'}`}>{pwMsg.text}</p>
              )}
              <button
                onClick={handleChangePassword}
                disabled={pwBusy || !curPw || !newPw}
                className="w-full py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-40"
              >
                {pwBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                Cập nhật mật khẩu
              </button>
            </div>

            {/* Vùng nguy hiểm */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-red-500 uppercase tracking-wider flex items-center gap-2">
                <ShieldAlert className="w-3.5 h-3.5" /> Vùng nguy hiểm
              </h4>
              {!deactivateConfirm ? (
                <button
                  onClick={() => setDeactivateConfirm(true)}
                  className="w-full py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-500 text-xs font-bold hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Vô hiệu hoá tài khoản
                </button>
              ) : (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 space-y-2">
                  <p className="text-xs text-red-500">
                    Tài khoản sẽ bị vô hiệu hoá và bạn sẽ bị đăng xuất. Dữ liệu được giữ lại; liên hệ hỗ trợ để khôi phục.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleDeactivate}
                      disabled={deactivateBusy}
                      className="flex-1 py-2 rounded-lg bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {deactivateBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      Xác nhận
                    </button>
                    <button
                      onClick={() => setDeactivateConfirm(false)}
                      className="flex-1 py-2 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-200 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <X className="w-3.5 h-3.5" /> Huỷ
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Logout ── */}
      <button
        onClick={handleLogout}
        className="w-full rounded-[16px] border border-red-200 bg-red-50 px-5 py-3.5 flex items-center justify-center gap-2 text-red-500 hover:bg-red-100 transition-colors text-sm font-semibold"
      >
        <LogOut className="w-4 h-4" />
        Đăng xuất
      </button>

      {/* ── Modals ── */}
      <AiUpgradeModal
        isOpen={upgradeModalOpen}
        userId={user?.id ?? 0}
        usage={usage ?? null}
        packages={aiPackages}
        onClose={() => setUpgradeModalOpen(false)}
        onUpgradeSuccess={() => { refreshUsage(); setUpgradeModalOpen(false); }}
      />
    </div>
  );
}
