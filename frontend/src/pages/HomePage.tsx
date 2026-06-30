import { useState, useEffect, lazy, Suspense } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Dumbbell, Brain,
  ChevronRight, Check, ShoppingCart,
  Wallet, Moon, Beef, Apple,
  Flame, Play, History, Target, TrendingUp, Zap, Compass, X, Scale,
} from 'lucide-react';
import { motion } from 'framer-motion';
import ProgressRing from '../components/ProgressRing';
import { useDashboard } from '../hooks/useDashboard';
import { useAuthContext } from '../context/AuthContext';
import SetupWizard from '../components/SetupWizard';
import DailyGoals from '../components/DailyGoals';
import BodyCheckInModal from '../components/BodyCheckInModal';
import { nutritionService } from '../services/nutritionService';
import { userService } from '../services/userService';
import { CountUp, containerStagger, fadeUp, fadeScale, premiumEase } from '../lib/motion';
// Lazy-load để tách recharts (~140kb) khỏi bundle chính
const MacroRadial = lazy(() => import('../components/MacroRadial'));
const TrendChart = lazy(() => import('../components/TrendChart'));
const GoalTimelineChart = lazy(() => import('../components/GoalTimelineChart'));

function pct(v: number, goal: number) { return goal ? Math.min(100, Math.round((v / goal) * 100)) : 0; }

// Skeleton khớp layout Dashboard — hiển thị khi đang tải để giảm cảm giác "trống",
// mượt hơn spinner trơ. Chỉ là placeholder, không có logic.
function SkBlock({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-white/[0.05] ${className}`} />;
}
function HomeSkeleton() {
  return (
    <div className="max-w-6xl mx-auto space-y-5 pb-24">
      {/* hero */}
      <SkBlock className="h-[280px] sm:h-[320px] rounded-3xl" />
      {/* 3 stat cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        {[0, 1, 2].map(i => (
          <div key={i} className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <SkBlock className="h-3 w-20 rounded" />
              <SkBlock className="h-4 w-4 rounded" />
            </div>
            <SkBlock className="h-10 w-2/3 rounded-xl" />
            <div className="grid grid-cols-2 gap-2">
              <SkBlock className="h-12 rounded-xl" />
              <SkBlock className="h-12 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
      {/* AI coach + quick actions */}
      <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
        <SkBlock className="h-40" />
        <div className="grid grid-cols-2 gap-2">
          {[0, 1, 2, 3].map(i => <SkBlock key={i} className="h-[72px]" />)}
        </div>
      </div>
      {/* weekly + plan */}
      <div className="grid sm:grid-cols-2 gap-4">
        <SkBlock className="h-44" />
        <SkBlock className="h-44" />
      </div>
    </div>
  );
}

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
  // Cho phép mở lại hướng dẫn bất cứ lúc nào (kể cả sau khi đã tắt)
  const [guideOpen, setGuideOpen] = useState(false);
  const dismissGuide = () => {
    setGuideDismissed(true);
    setGuideOpen(false);
    try { localStorage.setItem('home_guide_dismissed', '1'); } catch { /* ignore */ }
  };
  const reopenGuide = () => setGuideOpen(true);
  const { data, isLoading, error, refresh } = useDashboard();
  const navigate = useNavigate();

  const dashboardStats = data?.stats || {
    caloriesConsumed: 0, caloriesGoal: 2000,
    proteinConsumed: 0, proteinGoal: 150,
    carbsConsumed: 0, carbsGoal: 250,
    fatConsumed: 0, fatGoal: 70,
    waterConsumed: 0, waterGoal: 2.5,
    budgetRemaining: 80000, budgetLimit: 80000,
    caloriesBurned: 0,
    // ── Tập luyện (thiếu trong default trước đây → render undefined/NaN khi data.stats null) ──
    completedWorkoutsToday: 0, scheduledWorkoutsToday: 0,
    workoutsThisWeek: 0, workoutsWeeklyGoal: 5,
    activePlanProgress: 0,
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
  const nextWorkout = todayWorkouts.find((workout: any) => !workout.done) || todayWorkouts[0];
  const todayCompletion = stats.scheduledWorkoutsToday
    ? pct(stats.completedWorkoutsToday, stats.scheduledWorkoutsToday)
    : 0;
  const primaryTask = nextWorkout
    ? nextWorkout.name
    : hasActiveMealPlan
      ? 'Ghi bữa ăn đầu tiên'
      : 'Thiết lập AI coach';

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

  if (isLoading) return <HomeSkeleton />;

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

      {/* ── Daily cockpit ── */}
      <motion.div variants={fadeScale}
        className="relative overflow-hidden rounded-[2rem] border border-white/[0.08] bg-[#0e1012] p-2 shadow-[0_24px_70px_-28px_rgba(0,0,0,0.85)]">
        <div className="relative overflow-hidden rounded-[1.55rem] bg-[#090a0b]">
          <motion.img
            src="/images/viway-hero-training.jpg"
            alt=""
            initial={{ scale: 1.08 }} animate={{ scale: 1 }}
            transition={{ duration: 1.2, ease: premiumEase }}
            className="absolute inset-0 h-full w-full object-cover object-center opacity-[0.32]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#08090a] via-[#08090a]/92 to-[#08090a]/48" />
          <div className="absolute inset-0 grid-overlay opacity-60" />

          <div className="relative z-10 grid gap-4 sm:gap-6 p-4 sm:p-7 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="flex min-h-0 sm:min-h-[330px] flex-col justify-between">
              <div>
                <div className="mb-4 sm:mb-6 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-lime/25 bg-lime/[0.08] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-lime">
                    {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </span>
                  <span className="rounded-full border border-white/[0.09] bg-white/[0.04] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-400">
                    Lv.{userSummary.level} · {userSummary.streakDays} streak
                  </span>
                </div>
                <h1 className="font-grotesk text-3xl font-bold leading-[0.98] tracking-tight text-white sm:text-5xl">
                  {greeting},<br />
                  <span className="text-lime">{userName}</span>
                </h1>
                <p className="mt-3 sm:mt-5 max-w-lg text-sm leading-relaxed text-neutral-300 sm:text-base">
                  Ưu tiên hôm nay: <span className="font-semibold text-white">{primaryTask}</span>. Theo dõi tư thế, bữa ăn và phục hồi trong một luồng duy nhất.
                </p>
              </div>

              <div className="mt-5 sm:mt-8 flex flex-col gap-3 sm:flex-row">
                <Link to={nextWorkout ? '/dashboard/workout' : hasActiveMealPlan ? '/dashboard/diet' : '/dashboard/coach'}
                  className="btn-lime group inline-flex items-center justify-center gap-3 px-6 py-3 text-xs font-black uppercase tracking-wider active:scale-[0.98]">
                  {nextWorkout ? 'Bắt đầu buổi tập' : hasActiveMealPlan ? 'Ghi bữa ăn' : 'Thiết lập coach'}
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black/10 transition-transform group-hover:translate-x-1">
                    <Play className="h-3.5 w-3.5" fill="currentColor" />
                  </span>
                </Link>
                <Link to="/dashboard/coach"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/[0.12] bg-white/[0.04] px-6 py-3 text-xs font-bold uppercase tracking-wider text-neutral-300 transition-all hover:border-white/25 hover:text-white active:scale-[0.98]">
                  <Brain className="h-4 w-4 text-blue-200" /> Hỏi AI coach
                </Link>
              </div>
            </div>

            <div className="grid content-between gap-3">
              <div className="rounded-2xl border border-white/[0.08] bg-[#101217]/88 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-500">giao thức hôm nay</p>
                    <h2 className="mt-1 font-grotesk text-xl font-bold text-white">{primaryTask}</h2>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-lime/10 text-lime">
                    <Dumbbell className="h-5 w-5" />
                  </div>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/[0.08]">
                  <div className="h-full rounded-full bg-lime transition-all duration-700" style={{ width: `${todayCompletion}%` }} />
                </div>
                <div className="mt-2 flex justify-between text-[11px] text-neutral-500">
                  <span>{stats.completedWorkoutsToday}/{stats.scheduledWorkoutsToday || 1} bài hôm nay</span>
                  <span>{todayCompletion}%</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Calo đốt', value: stats.caloriesBurned || 0, suffix: '', tone: 'text-orange-300' },
                  { label: 'Ngân sách', value: budgetConfigured ? Math.max(0, Math.round(remainingBudget / 1000)) : 0, suffix: budgetConfigured ? 'k' : '—', tone: 'text-blue-200' },
                  { label: 'Phục hồi', value: recovery.energyLevel || 0, suffix: recovery.energyLevel ? '/5' : '—', tone: recoveryColor },
                ].map(item => (
                  <div key={item.label} className="rounded-2xl border border-white/[0.07] bg-white/[0.045] p-3">
                    <div className={`font-grotesk text-2xl font-bold leading-none ${item.tone}`}>
                      {item.suffix === '—' ? '—' : <><CountUp value={item.value} />{item.suffix}</>}
                    </div>
                    <div className="mt-2 text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-500">{item.label}</div>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-lime/15 bg-lime/[0.06] p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-lime">AI cue</span>
                  <Brain className="h-4 w-4 text-lime" />
                </div>
                <p className="text-sm leading-relaxed text-lime/80">
                  {aiSuggestion || 'Nếu năng lượng thấp, giữ bài tập chính và giảm 1 set phụ. Ưu tiên protein trong bữa kế tiếp.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Bảng mục tiêu hôm nay (lớp gắn kết: avatar tiến hóa + vòng mục tiêu) ── */}
      <motion.div variants={fadeUp}>
        <DailyGoals
          level={userSummary.level}
          currentExp={userSummary.currentExp}
          nextLevelExp={userSummary.nextLevelExp}
          streakDays={userSummary.streakDays}
          completedWorkoutsToday={stats.completedWorkoutsToday}
          scheduledWorkoutsToday={stats.scheduledWorkoutsToday}
          workoutsThisWeek={stats.workoutsThisWeek}
          workoutsWeeklyGoal={stats.workoutsWeeklyGoal}
          caloriesConsumed={stats.caloriesConsumed}
          caloriesGoal={stats.caloriesGoal}
        />
      </motion.div>

      {/* ── Hướng dẫn bắt đầu cho user mới ──
          Hiện rộng hơn cho người mới (còn Lv.1 & streak < 5 ngày), và LUÔN có
          lối mở lại — tắt rồi vẫn bấm "Xem lại hướng dẫn" được bất cứ lúc nào. */}
      {(guideOpen || (!guideDismissed && userSummary.level <= 1 && userSummary.streakDays < 5)) ? (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h3 className="font-grotesk font-bold text-white text-base flex items-center gap-2">
                <Compass className="w-4 h-4 text-lime" /> Bắt đầu từ đây
              </h3>
              <p className="text-neutral-500 text-xs mt-0.5">3 bước đầu tiên để làm quen với Viway</p>
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
      ) : (
        /* Đã tắt / không còn là người mới → vẫn cho mở lại hướng dẫn */
        <button
          onClick={reopenGuide}
          className="w-full rounded-2xl border border-white/[0.06] bg-white/[0.02] px-5 py-3 flex items-center justify-between gap-3 hover:border-white/15 hover:bg-white/[0.04] transition-all group"
        >
          <span className="flex items-center gap-2 text-neutral-400 text-sm group-hover:text-white transition-colors">
            <Compass className="w-4 h-4 text-lime" /> Xem lại hướng dẫn bắt đầu
          </span>
          <ChevronRight className="w-4 h-4 text-neutral-600 group-hover:text-lime transition-colors" />
        </button>
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

      {/* ── 2 stats cards (đã bỏ card Phục hồi HRV/RHR — metric chết) ── */}
      <motion.div variants={fadeUp} className="grid sm:grid-cols-2 gap-4">

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
                  <div className="text-neutral-600 text-xs mt-1">kcal cần nạp/ngày</div>
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
                {/* Ảnh hoặc icon — icon luôn nằm dưới làm fallback; ảnh đè lên,
                    nếu URL lỗi (404) onError ẩn ảnh để lộ icon (không còn ảnh vỡ). */}
                <div className={`relative w-10 h-10 rounded-xl overflow-hidden shrink-0 ${ex.done ? 'opacity-50' : ''}`}>
                  <div className={`absolute inset-0 flex items-center justify-center ${ex.done ? 'bg-lime/10' : 'bg-white/[0.06]'}`}>
                    {ex.done ? <Check className="w-4 h-4 text-lime" /> : <Dumbbell className="w-4 h-4 text-neutral-500" />}
                  </div>
                  {ex.imageUrl && (
                    <img
                      src={ex.imageUrl}
                      alt={ex.name}
                      className="relative w-full h-full object-cover"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
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
