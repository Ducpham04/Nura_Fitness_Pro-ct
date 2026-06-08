import { useState, useEffect, lazy, Suspense } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Dumbbell, Brain,
  ChevronRight, Check, ShoppingCart,
  Wallet, Moon, Beef, Wheat, Apple,
  Star, Flame, Play, History, Target, TrendingUp, Zap, Compass, X, Scale,
} from 'lucide-react';
import { motion } from 'framer-motion';
import ProgressRing from '../components/ProgressRing';
import { useDashboard } from '../hooks/useDashboard';
import { useAuthContext } from '../context/AuthContext';
import SetupWizard from '../components/SetupWizard';
import BodyCheckInModal from '../components/BodyCheckInModal';
import { nutritionService } from '../services/nutritionService';
import { userService } from '../services/userService';
import { CountUp, containerStagger, fadeUp, fadeScale, premiumEase } from '../lib/motion';
// Lazy-load để tách recharts (~140kb) khỏi bundle chính
const MacroRadial = lazy(() => import('../components/MacroRadial'));
const TrendChart = lazy(() => import('../components/TrendChart'));
const GoalTimelineChart = lazy(() => import('../components/GoalTimelineChart'));

function pct(v: number, goal: number) { return goal ? Math.min(100, Math.round((v / goal) * 100)) : 0; }

function Confetti({ active }: { active: boolean }) {
  if (!active) return null;
  const pieces = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    color: i % 3 === 0 ? '#CCFF00' : i % 3 === 1 ? '#007AFF' : '#ffffff',
    delay: Math.random() * 1.5,
    duration: 2 + Math.random() * 1,
  }));
  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {pieces.map(p => (
        <div key={p.id} className="confetti-piece" style={{
          left: `${p.left}%`, top: '-10px',
          backgroundColor: p.color,
          animationDelay: `${p.delay}s`,
          animationDuration: `${p.duration}s`,
        }} />
      ))}
    </div>
  );
}

function MacroBar({ label, consumed, goal, unit, color, icon: Icon }: {
  label: string; consumed: number; goal: number; unit: string; color: string; icon: any;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon className="w-3.5 h-3.5" style={{ color }} />
          <span className="text-neutral-400 text-xs font-medium">{label}</span>
        </div>
        <span className="text-white text-xs font-bold">
          {consumed}<span className="text-neutral-600 font-normal">/{goal}{unit}</span>
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct(consumed, goal)}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

export default function HomePage() {
  const [goalReached, setGoalReached] = useState(false);
  const [aiCaloriesIn, setAiCaloriesIn] = useState<number | null>(null);
  const [aiSpent, setAiSpent] = useState<number | null>(null);
  const [aiBudgetTotal, setAiBudgetTotal] = useState<number | null>(null);
  const [showSetupWizard, setShowSetupWizard] = useState(false);
  const [hasActiveMealPlan, setHasActiveMealPlan] = useState(false);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [metric, setMetric] = useState<{ days: number | null; previousWeight?: number }>({ days: null });
  const { user } = useAuthContext();
  const [guideDismissed, setGuideDismissed] = useState(() => {
    try { return localStorage.getItem('home_guide_dismissed') === '1'; } catch { return false; }
  });
  const dismissGuide = () => {
    setGuideDismissed(true);
    try { localStorage.setItem('home_guide_dismissed', '1'); } catch { /* ignore */ }
  };
  const { data, isLoading, error, refresh, updateStats } = useDashboard();
  const navigate = useNavigate();

  const dashboardStats = data?.stats || {
    caloriesConsumed: 0, caloriesGoal: 2000,
    proteinConsumed: 0, proteinGoal: 150,
    carbsConsumed: 0, carbsGoal: 250,
    fatConsumed: 0, fatGoal: 70,
    waterConsumed: 0, waterGoal: 2.5,
    budgetRemaining: 80000, budgetLimit: 80000,
    caloriesBurned: 0,
  };

  const userSummary = data?.userSummary || {
    fullName: user?.fullName || 'Bạn',
    level: 1, currentExp: 0, nextLevelExp: 100, streakDays: 0,
  };

  const recovery = data?.recovery || {
    sleepHours: 0, sleepGoal: 8, hrv: 0, restingHR: 0, energyLevel: 3, recommendation: 'Rest',
  };

  const budgetBreakdown = data?.budgetBreakdown || [];
  const todayWorkouts = data?.todayWorkouts || [];
  const recentActivities = data?.recentActivities || [];

  const stats = {
    ...dashboardStats,
    budgetLimit: aiBudgetTotal ?? dashboardStats.budgetLimit,
    spentToday: aiSpent ? aiSpent : (dashboardStats.budgetLimit - dashboardStats.budgetRemaining),
    caloriesConsumed: aiCaloriesIn ?? dashboardStats.caloriesConsumed,
  };

  const remainingBudget = stats.budgetLimit - stats.spentToday;
  const budgetPercent = pct(stats.spentToday, stats.budgetLimit);
  const userName = userSummary.fullName;
  const aiSuggestion = data?.aiSuggestion;

  // Ngân sách chỉ có ý nghĩa khi đã thiết lập (có kế hoạch ăn / có chi tiêu / đã chỉnh)
  // → tránh hiển thị 80k mặc định cho user chưa setup.
  const budgetConfigured = hasActiveMealPlan || budgetBreakdown.length > 0 || aiBudgetTotal != null;
  // Giấc ngủ chỉ hiển thị khi thực sự có dữ liệu, không bịa "0h/8h".
  const sleepLogged = recovery.sleepHours > 0;
  // Có dữ liệu phục hồi thật (sau khi check-in buổi tập) hay chưa.
  const hasRecoveryData = !!recovery.recommendation || recovery.energyLevel > 0 || sleepLogged;

  const hour = new Date().getHours();
  const greeting = hour < 11 ? 'Chào buổi sáng' : hour < 14 ? 'Chào buổi trưa' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';

  const rcm = recovery.recommendation.toLowerCase();
  const recoveryLabel = !hasRecoveryData ? 'Chưa có dữ liệu'
    : rcm === 'rest' ? 'Nên nghỉ ngơi'
    : rcm === 'light' ? 'Tập nhẹ thôi'
    : 'Sẵn sàng 100%';
  const recoveryColor = !hasRecoveryData ? 'text-neutral-500'
    : rcm === 'rest' ? 'text-orange-400'
    : rcm === 'light' ? 'text-blue-400'
    : 'text-lime';

  useEffect(() => {
    const handler = (e: any) => {
      setGoalReached(true);
      setTimeout(() => setGoalReached(false), 4000);
      if (e.detail) {
        setAiCaloriesIn(e.detail.calories);
        setAiSpent(e.detail.spent);
        if (e.detail.budget) setAiBudgetTotal(e.detail.budget);
      }
    };
    window.addEventListener('trigger-confetti', handler as any);
    return () => window.removeEventListener('trigger-confetti', handler as any);
  }, []);

  // Không dùng optimistic update cho caloriesBurned vì gây lệch với DB.
  // useDashboard đã tự refresh sau workout-completed event.

  useEffect(() => {
    let mounted = true;
    const check = async () => {
      if (!user?.id) { setHasActiveMealPlan(false); return; }
      const response = await nutritionService.getActivePlan(user.id);
      if (!mounted) return;
      setHasActiveMealPlan(!!(response.success && response.data));
    };
    check();
    return () => { mounted = false; };
  }, [user?.id]);

  // Lần đo thể trạng gần nhất → nhắc check-in + prefill cân nặng cho modal
  useEffect(() => {
    if (!user?.id) return;
    let mounted = true;
    const load = async () => {
      const hist = await userService.getBodyMetricHistory();
      if (!mounted) return;
      if (hist.length === 0) { setMetric({ days: null }); return; }
      const last = hist[hist.length - 1];
      const days = last.recordedAt
        ? Math.floor((Date.now() - new Date(last.recordedAt).getTime()) / 86400000)
        : null;
      setMetric({ days, previousWeight: last.weightKg });
    };
    load();
    const onUpdate = () => load();
    window.addEventListener('body-metric-updated', onUpdate);
    return () => { mounted = false; window.removeEventListener('body-metric-updated', onUpdate); };
  }, [user?.id]);

  const isSetupIncomplete = !hasActiveMealPlan && (!data || stats.budgetLimit === 80000 || todayWorkouts.length === 0);

  if (isLoading) return (
    <div className="flex h-full items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-lime border-t-transparent rounded-full animate-spin" />
        <span className="text-neutral-500 text-sm">Đang tải...</span>
      </div>
    </div>
  );

  if (error) return (
    <div className="flex h-full items-center justify-center">
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-8 text-center max-w-sm">
        <p className="text-red-400 font-semibold mb-2">Lỗi kết nối</p>
        <p className="text-neutral-500 text-sm mb-4">{error}</p>
        <button onClick={() => window.location.reload()} className="btn-lime px-5 py-2.5 text-sm font-bold">Thử lại</button>
      </div>
    </div>
  );

  return (
    <motion.div variants={containerStagger} initial="hidden" animate="show"
      className="max-w-6xl mx-auto space-y-5 pb-24">
      <Confetti active={goalReached} />

      {/* ── Hero kiểu Nike: ảnh vận động viên + chữ italic in hoa ── */}
      <motion.div variants={fadeScale}
        className="relative overflow-hidden rounded-3xl min-h-[280px] sm:min-h-[320px] flex flex-col justify-end shadow-[0_12px_50px_-16px_rgba(0,0,0,0.8)]">
        {/* Ảnh nền vận động viên */}
        <motion.img
          src="https://images.unsplash.com/photo-1549060279-7e168fcee0c2?auto=format&fit=crop&w=1600&q=80"
          alt=""
          initial={{ scale: 1.12 }} animate={{ scale: 1 }}
          transition={{ duration: 1.4, ease: premiumEase }}
          className="absolute inset-0 w-full h-full object-cover object-center" />
        {/* Scrim đậm kiểu editorial */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/75 to-black/25" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/40 to-transparent" />
        {/* Gạch accent lime dọc — chi tiết Nike */}
        <div className="absolute left-0 top-8 bottom-8 w-1 bg-lime rounded-full" />

        {/* Badge Lv + streak góc phải trên */}
        <div className="absolute top-4 right-4 flex gap-2 z-10">
          <span className="flex items-center gap-1.5 rounded-full bg-black/50 backdrop-blur-sm border border-white/15 px-3 py-1.5">
            <Star className="w-3.5 h-3.5 text-lime" fill="currentColor" />
            <span className="text-white text-xs font-bold">Lv.{userSummary.level}</span>
          </span>
          <span className="flex items-center gap-1.5 rounded-full bg-black/50 backdrop-blur-sm border border-white/15 px-3 py-1.5">
            <Flame className="w-3.5 h-3.5 text-orange-400" fill="currentColor" />
            <span className="text-white text-xs font-bold">{userSummary.streakDays}</span>
          </span>
        </div>

        {/* Nội dung editorial — góc dưới trái */}
        <div className="relative z-10 p-6 sm:p-8 pl-7 sm:pl-9">
          <p className="text-white/55 text-[10px] font-bold uppercase tracking-[0.28em] mb-2.5">
            {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <h1 className="font-grotesk font-bold italic uppercase text-white leading-[0.88] tracking-tight text-4xl sm:text-[3.25rem]">
            {greeting}<br />
            <span className="text-lime">{userName}</span>
          </h1>
          <p className="text-white/75 text-sm sm:text-base mt-3.5 max-w-md font-semibold uppercase tracking-wide">
            {userSummary.streakDays > 0
              ? `Chuỗi ${userSummary.streakDays} ngày. Đừng dừng lại.`
              : 'Hôm nay là ngày của bạn.'}
          </p>
          <div className="flex flex-wrap gap-3 mt-6">
            <Link to="/dashboard/workout"
              className="rounded-full bg-lime text-black px-6 py-3 text-xs font-black uppercase tracking-wider flex items-center gap-2 hover:bg-white transition-colors active:scale-95">
              <Play className="w-4 h-4" fill="currentColor" /> Bắt đầu tập
            </Link>
            <Link to="/dashboard/diet"
              className="rounded-full border-2 border-white/30 text-white px-6 py-3 text-xs font-black uppercase tracking-wider flex items-center gap-2 hover:bg-white hover:text-black hover:border-white transition-all active:scale-95">
              <Apple className="w-4 h-4" /> Ghi bữa ăn
            </Link>
          </div>
        </div>
      </motion.div>

      {/* ── Hướng dẫn bắt đầu cho user mới ── */}
      {!guideDismissed && userSummary.streakDays === 0 && stats.caloriesBurned === 0 && (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h3 className="font-grotesk font-bold text-white text-base flex items-center gap-2">
                <Compass className="w-4 h-4 text-lime" /> Bắt đầu từ đây
              </h3>
              <p className="text-neutral-500 text-xs mt-0.5">3 bước đầu tiên để làm quen với Fitnit</p>
            </div>
            <button onClick={dismissGuide} className="text-neutral-600 hover:text-white transition-colors text-xs shrink-0 inline-flex items-center gap-1">
              Đã hiểu <X className="w-3 h-3" />
            </button>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            {[
              { n: '1', icon: Dumbbell, title: 'Xem buổi tập', desc: 'AI đã tạo lịch tập theo mục tiêu của bạn', to: '/dashboard/workout', color: 'text-lime' },
              { n: '2', icon: Apple, title: 'Khám phá thực đơn', desc: 'Thực đơn gợi ý theo ngân sách bạn đặt', to: '/dashboard/diet', color: 'text-orange-400' },
              { n: '3', icon: TrendingUp, title: 'Ghi lại tiến độ', desc: 'Hoàn thành buổi tập & ghi bữa ăn để theo dõi', to: '/dashboard/workout', color: 'text-blue-400' },
            ].map(({ n, icon: Icon, title, desc, to, color }) => (
              <Link key={n} to={to} className="group rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 hover:border-white/15 hover:bg-white/[0.04] transition-all">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-5 h-5 rounded-full bg-white/[0.08] flex items-center justify-center text-[10px] font-bold text-neutral-400">{n}</span>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <p className="text-white text-sm font-semibold group-hover:text-lime transition-colors">{title}</p>
                <p className="text-neutral-500 text-xs mt-1 leading-relaxed">{desc}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Setup notification ── */}
      {isSetupIncomplete && (
        <div className="rounded-2xl border border-lime/20 bg-lime/[0.05] px-4 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-lime/10 border border-lime/20 flex items-center justify-center shrink-0">
              <Brain className="w-4 h-4 text-lime" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">Thiết lập trải nghiệm AI</p>
              <p className="text-neutral-400 text-xs mt-0.5">Hoàn thiện ngân sách & kho thực phẩm để AI hoạt động chính xác nhất.</p>
            </div>
          </div>
          <button onClick={() => setShowSetupWizard(true)} className="btn-lime shrink-0 px-4 py-2 text-xs font-bold uppercase tracking-wider">
            Thiết lập
          </button>
        </div>
      )}

      {/* ── Nhắc check-in thể trạng (≥7 ngày hoặc chưa đo) ── */}
      {(metric.days === null || metric.days >= 7) && (
        <motion.div variants={fadeUp}
          className="rounded-2xl border border-blue-400/20 bg-blue-400/[0.05] px-4 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-400/10 border border-blue-400/20 flex items-center justify-center shrink-0">
              <Scale className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">Cập nhật thể trạng tuần này</p>
              <p className="text-neutral-400 text-xs mt-0.5">
                {metric.days === null
                  ? 'Ghi lần đo đầu tiên để bắt đầu theo dõi xu hướng.'
                  : `Đã ${metric.days} ngày kể từ lần đo gần nhất — đo lại để cập nhật tiến độ.`}
              </p>
            </div>
          </div>
          <button onClick={() => setShowCheckIn(true)}
            className="shrink-0 rounded-xl bg-blue-400/15 border border-blue-400/30 px-4 py-2 text-xs font-bold text-blue-300 hover:bg-blue-400/25 transition-all">
            Cập nhật
          </button>
        </motion.div>
      )}

      {/* ── 3 stats cards ── */}
      <motion.div variants={fadeUp} className="grid sm:grid-cols-3 gap-4">

        {/* Calories — 2 layout: có data / chưa log ăn */}
        <div className="rounded-2xl border border-white/[0.07] bg-gradient-to-b from-white/[0.045] to-white/[0.015] p-5 flex flex-col gap-4 shadow-[0_4px_24px_-10px_rgba(0,0,0,0.5)] transition-all duration-300 hover:-translate-y-1 hover:border-white/[0.14] hover:shadow-[0_16px_44px_-14px_rgba(0,0,0,0.65)]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Năng lượng</span>
            <Flame className="w-4 h-4 text-orange-400" />
          </div>

          {stats.caloriesConsumed > 0 ? (
            /* Đã log ăn → hiện ring + macros */
            <>
              <div className="flex items-center gap-4">
                <ProgressRing progress={pct(stats.caloriesConsumed, stats.caloriesGoal)} size={56} strokeWidth={5} />
                <div>
                  <div className="font-grotesk font-bold text-2xl text-white leading-none"><CountUp value={Math.round(stats.caloriesConsumed)} /></div>
                  <div className="text-neutral-500 text-xs mt-1">/ {Math.round(stats.caloriesGoal)} kcal ăn vào</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-white/[0.05] p-2.5 text-center">
                  <div className="text-lime font-bold text-sm">{Math.max(0, Math.round(stats.caloriesGoal - stats.caloriesConsumed))}</div>
                  <div className="text-neutral-600 text-[10px] uppercase tracking-wider mt-0.5">Còn lại</div>
                </div>
                <div className="rounded-xl bg-white/[0.05] p-2.5 text-center">
                  <div className="text-orange-400 font-bold text-sm">{stats.caloriesBurned}</div>
                  <div className="text-neutral-600 text-[10px] uppercase tracking-wider mt-0.5">Đã đốt</div>
                </div>
              </div>
            </>
          ) : (
            /* Chưa log ăn → focus vào calories đốt + mục tiêu */
            <>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-grotesk font-bold text-3xl leading-none">
                    <CountUp value={stats.caloriesBurned} className="text-orange-400" />
                  </div>
                  <div className="text-neutral-500 text-xs mt-1">kcal đã đốt hôm nay</div>
                </div>
                <div className="text-right">
                  <div className="text-neutral-400 font-grotesk font-bold text-lg leading-none">{Math.round(stats.caloriesGoal)}</div>
                  <div className="text-neutral-600 text-xs mt-1">mục tiêu/ngày</div>
                </div>
              </div>
              <Link
                to="/dashboard/diet"
                className="w-full rounded-xl border border-dashed border-white/[0.1] bg-white/[0.02] px-4 py-2.5 text-center hover:border-lime/30 hover:bg-lime/[0.03] transition-all group"
              >
                <p className="text-neutral-500 text-xs group-hover:text-lime transition-colors">
                  + Ghi lại bữa ăn hôm nay
                </p>
              </Link>
            </>
          )}
        </div>

        {/* Budget */}
        <div className="rounded-2xl border border-white/[0.07] bg-gradient-to-b from-white/[0.045] to-white/[0.015] p-5 flex flex-col gap-4 shadow-[0_4px_24px_-10px_rgba(0,0,0,0.5)] transition-all duration-300 hover:-translate-y-1 hover:border-white/[0.14] hover:shadow-[0_16px_44px_-14px_rgba(0,0,0,0.65)]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Ngân sách hôm nay</span>
            <Wallet className="w-4 h-4 text-blue-400" />
          </div>

          {budgetConfigured ? (
            <>
              <div>
                <div className="font-grotesk font-bold text-3xl text-white leading-none"><CountUp value={remainingBudget / 1000} suffix="k" /></div>
                <div className="text-neutral-500 text-xs mt-1">VND còn lại</div>
              </div>
              <div>
                <div className="flex items-center justify-between text-[10px] text-neutral-600 mb-1.5">
                  <span>Đã chi: {(stats.spentToday / 1000).toFixed(0)}k</span>
                  <span>{100 - budgetPercent}% còn</span>
                </div>
                <div className="h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
                  <div className="h-full bg-blue-400 rounded-full transition-all duration-700" style={{ width: `${100 - budgetPercent}%` }} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {budgetBreakdown.slice(0, 2).map((item: any, i: number) => (
                  <div key={i} className="rounded-xl bg-white/[0.05] p-2.5">
                    <div className="font-bold text-sm" style={{ color: item.color }}>{(item.amount / 1000).toFixed(0)}k</div>
                    <div className="text-neutral-600 text-[10px] uppercase tracking-wider mt-0.5 truncate">{item.category}</div>
                  </div>
                ))}
                {budgetBreakdown.length === 0 && (
                  <div className="col-span-2 text-neutral-600 text-xs text-center py-1">Chưa có dữ liệu chi tiêu</div>
                )}
              </div>
            </>
          ) : (
            /* Chưa thiết lập ngân sách → CTA, không hiện số mặc định */
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 py-2">
              <p className="text-neutral-400 text-xs leading-relaxed">
                Chưa thiết lập ngân sách. Đặt mức chi tiêu để AI lên thực đơn phù hợp túi tiền.
              </p>
              <button
                onClick={() => setShowSetupWizard(true)}
                className="rounded-xl border border-blue-400/30 bg-blue-400/[0.08] px-4 py-2 text-xs font-bold text-blue-300 hover:bg-blue-400/[0.14] transition-all"
              >
                Thiết lập ngân sách
              </button>
            </div>
          )}
        </div>

        {/* Recovery */}
        <div className="rounded-2xl border border-white/[0.07] bg-gradient-to-b from-white/[0.045] to-white/[0.015] p-5 flex flex-col gap-4 shadow-[0_4px_24px_-10px_rgba(0,0,0,0.5)] transition-all duration-300 hover:-translate-y-1 hover:border-white/[0.14] hover:shadow-[0_16px_44px_-14px_rgba(0,0,0,0.65)]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Phục hồi</span>
            <span className={`text-[10px] font-bold px-2 py-1 rounded-lg bg-white/[0.06] ${recoveryColor}`}>
              {recoveryLabel}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Moon className="w-7 h-7 text-blue-400 shrink-0" />
            <div className="flex-1">
              {sleepLogged ? (
                <>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-neutral-400">Giấc ngủ</span>
                    <span className="text-white font-semibold">{recovery.sleepHours}h / {recovery.sleepGoal}h</span>
                  </div>
                  <div className="h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
                    <div className="h-full bg-blue-400 rounded-full" style={{ width: `${pct(recovery.sleepHours, recovery.sleepGoal)}%` }} />
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-neutral-400">Giấc ngủ</span>
                    <span className="text-neutral-600">Chưa có dữ liệu</span>
                  </div>
                  <div className="h-1.5 bg-white/[0.06] rounded-full" />
                </>
              )}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'HRV', value: recovery.hrv || '—' },
              { label: 'RHR', value: recovery.restingHR || '—' },
              { label: 'Năng lượng', value: recovery.energyLevel ? `${recovery.energyLevel}/5` : '—' },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl bg-white/[0.05] p-2.5 text-center">
                <div className="text-white font-bold text-xs">{value}</div>
                <div className="text-neutral-600 text-[11px] uppercase tracking-wider mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── AI Coach + Quick actions ── */}
      <motion.div variants={fadeUp} className="grid gap-4 lg:grid-cols-[1fr_260px]">
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-blue-400/10 border border-blue-400/20 flex items-center justify-center shrink-0">
              <Brain className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-sm">AI Coach gợi ý hôm nay</h3>
              <p className="text-neutral-500 text-xs">Phân tích dựa trên chỉ số của bạn</p>
            </div>
          </div>
          <div className="rounded-xl bg-white/[0.04] border border-white/[0.05] p-4 mb-4">
            <p className="text-neutral-300 text-sm leading-relaxed">
              {aiSuggestion || `Chào ${userName}, hãy chia sẻ hôm nay bạn thấy thế nào hoặc thực đơn bạn mong muốn để tôi có thể đưa ra gợi ý phù hợp nhất!`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/dashboard/coach" className="btn-lime px-5 py-2.5 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Brain className="w-3.5 h-3.5" /> Chat với Coach
            </Link>
            <Link
              to="/dashboard/diet"
              className="rounded-xl border border-white/[0.07] bg-white/[0.04] px-5 py-2.5 text-xs font-semibold text-neutral-300 hover:text-white transition-colors"
            >
              Tạo thực đơn
            </Link>
          </div>
        </div>

        {/* Quick actions 2×2 */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Tập luyện', icon: Dumbbell, path: '/dashboard/workout', color: 'text-lime' },
            { label: 'AI Coach', icon: Brain, path: '/dashboard/coach', color: 'text-blue-400' },
            { label: 'Dinh dưỡng', icon: ShoppingCart, path: '/dashboard/diet', color: 'text-lime' },
            { label: 'Nhật ký', icon: History, path: '/dashboard/logbook', color: 'text-orange-400' },
          ].map(action => (
            <Link
              key={action.label}
              to={action.path}
              className="rounded-2xl border border-white/[0.07] bg-white/[0.04] p-4 flex flex-col items-center justify-center gap-2 hover:bg-white/[0.07] transition-colors"
            >
              <action.icon className={`w-5 h-5 ${action.color}`} />
              <span className="text-white text-xs font-semibold">{action.label}</span>
            </Link>
          ))}
        </div>
      </motion.div>

      {/* ── Tiến độ tập luyện tuần này ── */}
      <motion.div variants={fadeUp} className="grid sm:grid-cols-2 gap-4">

        {/* Weekly workout progress */}
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-lime" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Tuần này</span>
            </div>
            <span className="text-white font-grotesk font-bold text-sm">
              {stats.workoutsThisWeek} <span className="text-neutral-500 font-normal">/ {stats.workoutsWeeklyGoal} buổi</span>
            </span>
          </div>
          <div className="flex gap-1 mb-3">
            {Array.from({ length: stats.workoutsWeeklyGoal || 5 }).map((_, i) => (
              <div key={i} className={`flex-1 h-2 rounded-full ${
                i < stats.workoutsThisWeek ? 'bg-lime shadow-[0_0_6px_rgba(204,255,0,0.4)]' : 'bg-white/[0.07]'
              }`} />
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-white/[0.05] p-2.5 text-center">
              <div className="text-lime font-bold text-sm">{stats.completedWorkoutsToday}</div>
              <div className="text-neutral-600 text-[11px] uppercase tracking-wider mt-0.5">Hôm nay</div>
            </div>
            <div className="rounded-xl bg-white/[0.05] p-2.5 text-center">
              <div className="text-orange-400 font-bold text-sm">{stats.caloriesBurned}</div>
              <div className="text-neutral-600 text-[11px] uppercase tracking-wider mt-0.5">kcal đốt</div>
            </div>
            <div className="rounded-xl bg-white/[0.05] p-2.5 text-center">
              <div className="text-blue-400 font-bold text-sm">{userSummary.streakDays}</div>
              <div className="text-neutral-600 text-[11px] uppercase tracking-wider mt-0.5">streak</div>
            </div>
          </div>
        </div>

        {/* Active plan progress */}
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-electric" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Plan hiện tại</span>
            </div>
            <span className="text-white font-grotesk font-bold text-sm">{stats.activePlanProgress}%</span>
          </div>
          <div className="h-2 bg-white/[0.07] rounded-full overflow-hidden mb-3">
            <div
              className="h-full rounded-full bg-gradient-to-r from-electric to-lime transition-all duration-700"
              style={{ width: `${stats.activePlanProgress}%` }}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-white/[0.05] p-2.5">
              <div className="text-white font-bold text-sm">{stats.scheduledWorkoutsToday}</div>
              <div className="text-neutral-600 text-[11px] uppercase tracking-wider mt-0.5">Bài hôm nay</div>
            </div>
            <div className="rounded-xl bg-white/[0.05] p-2.5">
              <div className={`font-bold text-sm ${
                stats.completedWorkoutsToday >= stats.scheduledWorkoutsToday && stats.scheduledWorkoutsToday > 0
                  ? 'text-lime' : 'text-neutral-300'
              }`}>
                {stats.completedWorkoutsToday}/{stats.scheduledWorkoutsToday}
              </div>
              <div className="text-neutral-600 text-[11px] uppercase tracking-wider mt-0.5">Hoàn thành</div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Biểu đồ xu hướng (cân nặng / calo đốt) ── */}
      {user?.id && (
        <motion.div variants={fadeUp}>
          <Suspense fallback={
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] h-[260px] flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-lime border-t-transparent rounded-full animate-spin" />
            </div>
          }>
            <TrendChart userId={user.id} />
          </Suspense>
        </motion.div>
      )}

      {user?.id && (
        <motion.div variants={fadeUp}>
          <Suspense fallback={
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] h-[260px] flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-lime border-t-transparent rounded-full animate-spin" />
            </div>
          }>
            <GoalTimelineChart userId={user.id} />
          </Suspense>
        </motion.div>
      )}

      {/* ── Macros (biểu đồ vòng) ── */}
      <motion.div variants={fadeUp} className="rounded-2xl border border-white/[0.07] bg-gradient-to-b from-white/[0.045] to-white/[0.015] p-5 shadow-[0_4px_24px_-10px_rgba(0,0,0,0.5)]">
        <h3 className="font-grotesk font-bold italic uppercase text-white text-sm tracking-tight mb-4">Dinh dưỡng hôm nay</h3>
        <Suspense fallback={<div className="h-[150px] flex items-center justify-center"><div className="w-6 h-6 border-2 border-lime border-t-transparent rounded-full animate-spin" /></div>}>
        <MacroRadial
          protein={{ label: 'Protein', consumed: stats.proteinConsumed, goal: stats.proteinGoal, color: '#FF3B30' }}
          carbs={{ label: 'Carbs', consumed: stats.carbsConsumed, goal: stats.carbsGoal, color: '#CCFF00' }}
          fat={{ label: 'Fat', consumed: stats.fatConsumed, goal: stats.fatGoal, color: '#007AFF' }}
          caloriesConsumed={stats.caloriesConsumed}
          caloriesGoal={stats.caloriesGoal}
        />
        </Suspense>
      </motion.div>

      {/* ── Today's training ── */}
      <motion.div variants={fadeUp} className="rounded-2xl border border-white/[0.07] bg-gradient-to-b from-white/[0.045] to-white/[0.015] overflow-hidden shadow-[0_4px_24px_-10px_rgba(0,0,0,0.5)]">
        <div className="px-5 py-4 border-b border-white/[0.05] flex items-center justify-between">
          <h3 className="font-semibold text-white text-sm">Bài tập hôm nay</h3>
          <Link to="/dashboard/workout" className="text-lime text-xs font-bold flex items-center gap-1 hover:underline">
            Xem tất cả <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {todayWorkouts.length === 0 ? (
          <div className="p-8 text-center">
            <Dumbbell className="w-8 h-8 text-neutral-700 mx-auto mb-3" />
            <p className="text-neutral-400 text-sm">Chưa có bài tập nào hôm nay</p>
            <Link to="/dashboard/workout" className="mt-3 inline-flex items-center gap-1 text-lime text-xs font-bold hover:underline">
              Bắt đầu training plan <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {todayWorkouts.map((ex: any) => (
              <div key={ex.id} className="px-5 py-3.5 flex items-center gap-3">
                {/* Ảnh hoặc icon */}
                <div className={`w-10 h-10 rounded-xl overflow-hidden shrink-0 ${ex.done ? 'opacity-50' : ''}`}>
                  {ex.imageUrl ? (
                    <img src={ex.imageUrl} alt={ex.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className={`w-full h-full flex items-center justify-center ${ex.done ? 'bg-lime/10' : 'bg-white/[0.06]'}`}>
                      {ex.done ? <Check className="w-4 h-4 text-lime" /> : <Dumbbell className="w-4 h-4 text-neutral-500" />}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold truncate ${ex.done ? 'text-neutral-500 line-through' : 'text-white'}`}>
                    {ex.name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-neutral-600 text-xs">{ex.sets}</span>
                    {ex.muscle && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-lime/10 text-lime/70 border border-lime/20 inline-flex items-center gap-1">
                        <Dumbbell className="w-2.5 h-2.5" /> {ex.muscle}
                      </span>
                    )}
                    {ex.estimatedCalories && (
                      <span className="text-[10px] text-orange-400 inline-flex items-center gap-1"><Flame className="w-2.5 h-2.5" /> {ex.estimatedCalories} kcal</span>
                    )}
                  </div>
                </div>
                {ex.done ? (
                  <div className="shrink-0 w-7 h-7 rounded-lg bg-lime/15 flex items-center justify-center">
                    <Check className="w-3.5 h-3.5 text-lime" />
                  </div>
                ) : (
                  <Link
                    to="/dashboard/workout"
                    className="shrink-0 w-8 h-8 rounded-xl bg-lime/10 border border-lime/20 flex items-center justify-center hover:bg-lime/20 transition-colors"
                  >
                    <Play className="w-3.5 h-3.5 text-lime" fill="currentColor" />
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* ── Recent activities ── */}
      {recentActivities.length > 0 && (
        <motion.div variants={fadeUp} className="rounded-2xl border border-white/[0.07] bg-gradient-to-b from-white/[0.045] to-white/[0.015] overflow-hidden shadow-[0_4px_24px_-10px_rgba(0,0,0,0.5)]">
          <div className="px-5 py-4 border-b border-white/[0.05] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-lime" />
              <h3 className="font-semibold text-white text-sm">Hoạt động gần đây</h3>
            </div>
            <Link to="/dashboard/logbook" className="text-lime text-xs font-bold flex items-center gap-1 hover:underline">
              Xem nhật ký <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {recentActivities.slice(0, 4).map((activity: any, i: number) => (
              <div key={i} className="px-5 py-3 flex items-center gap-3">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs ${
                  activity.type === 'workout' ? 'bg-lime/10 text-lime' :
                  activity.type === 'meal' ? 'bg-orange-400/10 text-orange-400' :
                  'bg-blue-400/10 text-blue-400'
                }`}>
                  {activity.type === 'workout' ? <Dumbbell className="w-3.5 h-3.5" /> :
                   activity.type === 'meal' ? <Beef className="w-3.5 h-3.5" /> :
                   <TrendingUp className="w-3.5 h-3.5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-xs font-semibold truncate">{activity.title}</p>
                  <p className="text-neutral-600 text-[10px]">{activity.value}</p>
                </div>
                <span className="text-neutral-700 text-[10px] shrink-0">{activity.date}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {showCheckIn && (
        <BodyCheckInModal
          previousWeight={metric.previousWeight}
          onClose={() => setShowCheckIn(false)}
          onSaved={() => refresh()}
        />
      )}

      {showSetupWizard && user && (
        <SetupWizard
          userId={user.id}
          userName={user.fullName}
          onComplete={(targetTab?: string) => {
            setShowSetupWizard(false);
            if (targetTab === 'diet') navigate('/dashboard/diet');
            else if (targetTab === 'workout') navigate('/dashboard/workout');
            else window.location.reload();
          }}
        />
      )}
    </motion.div>
  );
}
