import { useEffect, useState } from 'react';
import {
  LogOut, User, Target, Award, Flame, Dumbbell,
  TrendingUp, Scale, Loader2, ChevronRight,
  Edit3, Check, Star, Zap,
  Activity, Sparkles, ArrowUpRight,
  Settings, Lock, Mail, Save, ShieldAlert, Trash2, X,
  Gift, Copy, CheckCheck, Camera, Share2, RefreshCw, Repeat2,
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
          {/* Avatar — clickable upload */}
          <div className="relative shrink-0 group cursor-pointer"
            onMouseEnter={() => setAvatarHover(true)}
            onMouseLeave={() => setAvatarHover(false)}>
            <label htmlFor="avatar-upload" className="cursor-pointer block">
              <div className="w-16 h-16 rounded-2xl overflow-hidden border border-white/10 shadow-lg">
                {avatarUrl
                  ? <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                  : <div className="w-full h-full bg-gradient-to-br from-lime to-emerald-500 flex items-center justify-center">
                      <span className="font-grotesk font-bold text-obsidian text-2xl">{initial}</span>
                    </div>
                }
              </div>
              {/* Hover overlay */}
              <div className={`absolute inset-0 rounded-2xl bg-black/50 flex items-center justify-center transition-opacity ${avatarHover ? 'opacity-100' : 'opacity-0'}`}>
                <Camera className="w-5 h-5 text-white" />
              </div>
            </label>
            <input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
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

          {/* Quick share button */}
          {referralInfo && (
            <button
              onClick={handleCopyReferralLink}
              className="shrink-0 flex flex-col items-center gap-1 px-3 py-2 rounded-xl bg-lime/10 border border-lime/25 text-lime hover:bg-lime/20 transition-colors"
              title="Sao chép link mời bạn"
            >
              {refCopied
                ? <CheckCheck className="w-4 h-4" />
                : <Share2 className="w-4 h-4" />}
              <span className="text-[9px] font-bold">{refCopied ? 'Đã copy!' : 'Mời bạn'}</span>
            </button>
          )}
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

      {/* ── Referral banner (compact) — mời bạn nhận thưởng ── */}
      {referralInfo && (
        <div className="rounded-2xl border border-lime/20 bg-gradient-to-r from-lime/[0.06] to-emerald-500/[0.04] p-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-lime/15 flex items-center justify-center shrink-0">
              <Gift className="w-4 h-4 text-lime" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white leading-snug">
                Mời bạn • nhận thưởng lớn
              </p>
              <p className="text-[11px] text-neutral-500 mt-0.5">
                {referralInfo.plusUnlocked
                  ? 'Mời 20 bạn → PRO không giới hạn'
                  : referralInfo.referralCount > 0
                  ? `Đã mời ${referralInfo.referralCount} bạn · Còn ${referralInfo.referralsUntilPlus} nữa → PLUS miễn phí`
                  : 'Mời 5 bạn → PLUS · Mời 20 bạn → PRO miễn phí'}
              </p>
            </div>
            <button
              onClick={handleCopyReferralLink}
              className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-lime text-black text-[11px] font-bold hover:bg-lime/90 transition-colors"
            >
              {refCopied ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {refCopied ? 'Đã copy' : 'Copy link'}
            </button>
          </div>
        </div>
      )}

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

      {/* ── AI Package ── */}
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-lime" />
            Gói AI
          </h3>
          {usage && usage.packageCode !== 'PRO' && (
            <button
              onClick={() => setUpgradeModalOpen(true)}
              className="flex items-center gap-1 text-[10px] text-lime hover:text-lime/80 transition-colors font-semibold"
            >
              <ArrowUpRight className="w-3 h-3" /> Nâng cấp
            </button>
          )}
        </div>

        {usageLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 text-neutral-600 animate-spin" />
          </div>
        ) : usage ? (
          <div className="space-y-3">
            {/* Package badge */}
            <div className="flex items-center gap-3">
              <div className={`px-3 py-1 rounded-full text-xs font-bold border ${
                usage.packageCode === 'PRO'
                  ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                  : usage.packageCode === 'PLUS'
                  ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                  : 'bg-zinc-700/50 text-zinc-400 border-zinc-600/50'
              }`}>
                {usage.packageCode === 'PRO' ? '⚡ PRO' : usage.packageCode === 'PLUS' ? '✦ PLUS' : '○ FREE'}
              </div>
              {usage.packageExpiresAt && (
                <span className="text-[11px] text-neutral-600">
                  Hết hạn {new Date(usage.packageExpiresAt).toLocaleDateString('vi-VN')}
                </span>
              )}
            </div>

            {/* Credits bar */}
            <div>
              <div className="flex items-center justify-between text-[11px] text-neutral-500 mb-1.5">
                <span>Lượt AI đã dùng</span>
                <span className="font-semibold text-white">
                  {usage.used} / {usage.isUnlimited ? '∞' : usage.quota}
                </span>
              </div>
              {!usage.isUnlimited && (
                <div className="h-1.5 bg-white/[0.07] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      usage.used / usage.quota > 0.8
                        ? 'bg-red-400'
                        : usage.used / usage.quota > 0.5
                        ? 'bg-yellow-400'
                        : 'bg-lime'
                    }`}
                    style={{ width: `${Math.min(100, (usage.used / usage.quota) * 100)}%` }}
                  />
                </div>
              )}
              {usage.isUnlimited && (
                <div className="h-1.5 bg-lime/20 rounded-full overflow-hidden">
                  <div className="h-full w-full bg-lime rounded-full" />
                </div>
              )}
              {usage.resetAt && (
                <p className="text-[10px] text-neutral-700 mt-1">
                  Reset vào {new Date(usage.resetAt).toLocaleDateString('vi-VN')}
                </p>
              )}
            </div>

            {/* Swap limits */}
            {(usage.exerciseSwapLimit !== undefined) && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                {[
                  { label: 'Đổi bài tập', used: usage.exerciseSwapUsed, limit: usage.exerciseSwapLimit, icon: Repeat2, color: 'text-blue-400' },
                  { label: 'Đổi món ăn', used: usage.mealSwapUsed, limit: usage.mealSwapLimit, icon: RefreshCw, color: 'text-orange-400' },
                ].map(({ label, used: su, limit, icon: Icon, color }) => {
                  const isUnlim = limit === -1;
                  const pct = isUnlim ? 100 : limit > 0 ? Math.min(100, (su / limit) * 100) : 0;
                  const remaining = isUnlim ? -1 : Math.max(0, limit - su);
                  return (
                    <div key={label} className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Icon className={`w-3 h-3 ${color}`} />
                        <span className="text-[10px] text-neutral-500 font-semibold">{label}</span>
                      </div>
                      <div className={`font-grotesk font-bold text-base ${remaining === 0 && !isUnlim ? 'text-red-400' : 'text-white'}`}>
                        {isUnlim ? '∞' : remaining}
                        <span className="text-neutral-600 text-[10px] font-normal ml-1">
                          {isUnlim ? 'lượt' : `/ ${limit} lượt`}
                        </span>
                      </div>
                      <div className="h-1 mt-1.5 bg-white/[0.06] rounded-full overflow-hidden">
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
                  className="flex-1 py-2.5 rounded-xl border border-white/10 bg-white/[0.04] text-white text-xs font-bold hover:bg-white/[0.07] transition-colors flex items-center justify-center gap-2"
                >
                  <Zap className="w-3.5 h-3.5 text-lime" fill="currentColor" />
                  Mua gói PLUS / PRO
                </button>
                <button
                  onClick={handleCopyReferralLink}
                  className="flex-1 py-2.5 rounded-xl border border-lime/25 bg-lime/5 text-lime text-xs font-bold hover:bg-lime/10 transition-colors flex items-center justify-center gap-2"
                >
                  {refCopied ? <CheckCheck className="w-3.5 h-3.5" /> : <Gift className="w-3.5 h-3.5" />}
                  {refCopied ? 'Đã copy link' : 'Mời bạn → nhận PLUS'}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 py-3">
            <p className="text-neutral-400 text-sm text-center">Không thể tải thông tin gói AI.</p>
            <button
              onClick={refreshUsage}
              className="text-xs text-lime hover:text-lime/80 font-semibold flex items-center gap-1 transition-colors"
            >
              <RefreshCw className="w-3 h-3" /> Thử lại
            </button>
          </div>
        )}
      </div>

      {/* ── Referral / Mời bạn ── */}
      {referralInfo && (
        <div className="rounded-2xl border border-lime/20 bg-lime/[0.03] p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Gift className="w-4 h-4 text-lime" />
            <h3 className="text-sm font-bold text-white">Mời bạn bè — nhận gói miễn phí</h3>
          </div>

          {/* Referral link */}
          <div>
            <p className="text-[11px] text-neutral-500 mb-2">
              Bạn bè đăng ký qua link → họ nhận <strong className="text-neutral-300">+25 credit</strong>. Bạn tích lũy lượt mời và nhận gói khi đạt mốc.
            </p>
            <div className="flex gap-2 items-center">
              <div className="flex-1 px-3 py-2 rounded-xl bg-white/[0.05] border border-white/10 text-xs text-neutral-300 truncate font-mono">
                {window.location.origin}/register?ref={referralInfo.referralCode}
              </div>
              <button
                onClick={handleCopyReferralLink}
                className="p-2 rounded-xl bg-lime/10 border border-lime/25 text-lime hover:bg-lime/20 transition-colors flex-shrink-0"
                title="Sao chép link"
              >
                {refCopied ? <CheckCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Stats row */}
          <div className="flex gap-3">
            <div className="flex-1 text-center py-2 rounded-xl bg-white/[0.04] border border-white/[0.07]">
              <div className="text-xl font-black text-lime">{referralInfo.referralCount}</div>
              <div className="text-[10px] text-neutral-500 mt-0.5">Đã mời</div>
            </div>
            <div className="flex-1 text-center py-2 rounded-xl bg-white/[0.04] border border-white/[0.07]">
              <div className="text-xl font-black text-lime">{referralInfo.referralsUntilPlus > 0 ? referralInfo.referralsUntilPlus : referralInfo.referralsUntilPro}</div>
              <div className="text-[10px] text-neutral-500 mt-0.5">{referralInfo.referralsUntilPlus > 0 ? 'Còn đến PLUS' : 'Còn đến PRO'}</div>
            </div>
          </div>

          {/* Milestone progress */}
          <div className="space-y-2.5">
            {/* PLUS milestone */}
            <div className={`rounded-xl p-3 border ${referralInfo.plusUnlocked ? 'border-lime/40 bg-lime/10' : 'border-white/[0.07] bg-white/[0.03]'}`}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  {referralInfo.plusUnlocked
                    ? <CheckCheck className="w-3.5 h-3.5 text-lime" />
                    : <Zap className="w-3.5 h-3.5 text-blue-400" />}
                  <span className="text-xs font-bold text-white">✦ PLUS — 200 credit/tháng</span>
                </div>
                <span className={`text-[10px] font-semibold ${referralInfo.plusUnlocked ? 'text-lime' : 'text-neutral-500'}`}>
                  {referralInfo.plusUnlocked ? 'Đã đạt!' : `${referralInfo.referralCount}/5`}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-white/[0.07] overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${referralInfo.plusUnlocked ? 'bg-lime' : 'bg-blue-400/70'}`}
                  style={{ width: `${Math.min(100, (referralInfo.referralCount / 5) * 100)}%` }}
                />
              </div>
              {!referralInfo.plusUnlocked && (
                <p className="text-[10px] text-neutral-600 mt-1">Còn {referralInfo.referralsUntilPlus} người nữa</p>
              )}
            </div>

            {/* PRO milestone */}
            <div className={`rounded-xl p-3 border ${referralInfo.proUnlocked ? 'border-violet-500/40 bg-violet-500/10' : 'border-white/[0.07] bg-white/[0.03]'}`}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  {referralInfo.proUnlocked
                    ? <CheckCheck className="w-3.5 h-3.5 text-violet-400" />
                    : <Zap className="w-3.5 h-3.5 text-violet-400" />}
                  <span className="text-xs font-bold text-white">⚡ PRO — Không giới hạn</span>
                </div>
                <span className={`text-[10px] font-semibold ${referralInfo.proUnlocked ? 'text-violet-400' : 'text-neutral-500'}`}>
                  {referralInfo.proUnlocked ? 'Đã đạt!' : `${referralInfo.referralCount}/20`}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-white/[0.07] overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${referralInfo.proUnlocked ? 'bg-violet-400' : 'bg-violet-500/50'}`}
                  style={{ width: `${Math.min(100, (referralInfo.referralCount / 20) * 100)}%` }}
                />
              </div>
              {!referralInfo.proUnlocked && (
                <p className="text-[10px] text-neutral-600 mt-1">Còn {referralInfo.referralsUntilPro} người nữa</p>
              )}
            </div>
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

      {/* ── Cài đặt tài khoản ── */}
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] overflow-hidden">
        <button
          onClick={() => setShowAccount(v => !v)}
          className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-white/[0.04] transition-colors"
        >
          <div className="w-8 h-8 rounded-xl bg-white/[0.05] flex items-center justify-center shrink-0">
            <Settings className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-white text-sm font-semibold">Cài đặt tài khoản</p>
            <p className="text-neutral-600 text-xs">Đổi thông tin, mật khẩu, vô hiệu hoá tài khoản</p>
          </div>
          <ChevronRight className={`w-4 h-4 text-neutral-700 transition-transform ${showAccount ? 'rotate-90' : ''}`} />
        </button>

        {showAccount && (
          <div className="px-5 pb-5 pt-1 space-y-6 border-t border-white/[0.04]">
            {/* Thông tin cơ bản */}
            <div className="space-y-3 pt-4">
              <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
                <User className="w-3.5 h-3.5" /> Thông tin cơ bản
              </h4>
              <div>
                <label className="text-[11px] text-neutral-500 mb-1 block">Tên hiển thị</label>
                <input
                  value={pName}
                  onChange={e => setPName(e.target.value)}
                  className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] px-3 py-2.5 text-sm text-white outline-none focus:border-lime/40"
                  placeholder="Tên của bạn"
                />
              </div>
              <div>
                <label className="text-[11px] text-neutral-500 mb-1 block flex items-center gap-1">
                  <Mail className="w-3 h-3" /> Email
                </label>
                <input
                  value={pEmail}
                  onChange={e => setPEmail(e.target.value)}
                  type="email"
                  className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] px-3 py-2.5 text-sm text-white outline-none focus:border-lime/40"
                  placeholder="email@example.com"
                />
                <p className="text-[10px] text-neutral-600 mt-1">Đổi email sẽ yêu cầu đăng nhập lại.</p>
              </div>
              {profileMsg && (
                <p className={`text-xs ${profileMsg.ok ? 'text-lime' : 'text-red-400'}`}>{profileMsg.text}</p>
              )}
              <button
                onClick={handleSaveProfile}
                disabled={profileBusy}
                className="w-full py-2.5 rounded-xl bg-lime/10 border border-lime/25 text-lime text-xs font-bold hover:bg-lime/15 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {profileBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Lưu thông tin
              </button>
            </div>

            {/* Đổi mật khẩu */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
                <Lock className="w-3.5 h-3.5" /> Đổi mật khẩu
              </h4>
              <input
                value={curPw}
                onChange={e => setCurPw(e.target.value)}
                type="password"
                autoComplete="current-password"
                className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] px-3 py-2.5 text-sm text-white outline-none focus:border-lime/40"
                placeholder="Mật khẩu hiện tại"
              />
              <input
                value={newPw}
                onChange={e => setNewPw(e.target.value)}
                type="password"
                autoComplete="new-password"
                className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] px-3 py-2.5 text-sm text-white outline-none focus:border-lime/40"
                placeholder="Mật khẩu mới (tối thiểu 6 ký tự)"
              />
              <input
                value={confirmPw}
                onChange={e => setConfirmPw(e.target.value)}
                type="password"
                autoComplete="new-password"
                className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] px-3 py-2.5 text-sm text-white outline-none focus:border-lime/40"
                placeholder="Xác nhận mật khẩu mới"
              />
              {pwMsg && (
                <p className={`text-xs ${pwMsg.ok ? 'text-lime' : 'text-red-400'}`}>{pwMsg.text}</p>
              )}
              <button
                onClick={handleChangePassword}
                disabled={pwBusy || !curPw || !newPw}
                className="w-full py-2.5 rounded-xl bg-white/[0.05] border border-white/10 text-white text-xs font-bold hover:bg-white/[0.08] transition-colors flex items-center justify-center gap-2 disabled:opacity-40"
              >
                {pwBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                Cập nhật mật khẩu
              </button>
            </div>

            {/* Vùng nguy hiểm */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-red-400/80 uppercase tracking-wider flex items-center gap-2">
                <ShieldAlert className="w-3.5 h-3.5" /> Vùng nguy hiểm
              </h4>
              {!deactivateConfirm ? (
                <button
                  onClick={() => setDeactivateConfirm(true)}
                  className="w-full py-2.5 rounded-xl bg-red-500/[0.06] border border-red-500/20 text-red-400 text-xs font-bold hover:bg-red-500/[0.12] transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Vô hiệu hoá tài khoản
                </button>
              ) : (
                <div className="rounded-xl border border-red-500/25 bg-red-500/[0.06] p-3 space-y-2">
                  <p className="text-xs text-red-300">
                    Tài khoản sẽ bị vô hiệu hoá và bạn sẽ bị đăng xuất. Dữ liệu được giữ lại; liên hệ hỗ trợ để khôi phục.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleDeactivate}
                      disabled={deactivateBusy}
                      className="flex-1 py-2 rounded-lg bg-red-500/80 text-white text-xs font-bold hover:bg-red-500 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {deactivateBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                      Xác nhận
                    </button>
                    <button
                      onClick={() => setDeactivateConfirm(false)}
                      className="flex-1 py-2 rounded-lg bg-white/[0.05] border border-white/10 text-neutral-300 text-xs font-bold hover:bg-white/[0.08] transition-colors flex items-center justify-center gap-1.5"
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
        className="w-full rounded-2xl border border-red-500/15 bg-red-500/[0.04] px-5 py-3.5 flex items-center justify-center gap-2 text-red-400 hover:bg-red-500/[0.08] transition-colors text-sm font-semibold"
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
