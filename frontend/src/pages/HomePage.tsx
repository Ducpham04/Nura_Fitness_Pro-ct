import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Dumbbell, Brain,
  ChevronRight, Check, Award,
  Beef, Apple,
  Flame, Zap, Scale,
  Target, Droplets, Activity, Wheat,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useDashboard } from '../hooks/useDashboard';
import { useAuthContext } from '../context/AuthContext';
import SetupWizard from '../components/SetupWizard';
import BodyCheckInModal from '../components/BodyCheckInModal';
import { nutritionService } from '../services/nutritionService';
import { userService } from '../services/userService';
import { trainingService } from '../services/trainingService';
import { computeBodyMetrics, type BodyMetrics } from '../lib/bodyMetrics';
import { containerStagger, fadeScale } from '../lib/motion';

function pct(v: number, goal: number) { return goal ? Math.min(100, Math.round((v / goal) * 100)) : 0; }

type WorkoutItem = {
  id?: string | number;
  name: string;
  done?: boolean;
  sets?: string;
  muscle?: string;
  imageUrl?: string;
  estimatedCalories?: number;
};

type ConfettiDetail = {
  calories?: number;
  spent?: number;
  budget?: number;
};

// Skeleton khớp layout Dashboard — hiển thị khi đang tải để giảm cảm giác "trống",
// mượt hơn spinner trơ. Chỉ là placeholder, không có logic.
function SkBlock({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-white/[0.05] ${className}`} />;
}
function HomeSkeleton() {
  return (
    <div className="mx-auto max-w-[460px] space-y-5 pb-24 sm:px-2">
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
  // ── Mục tiêu + phân tích thể trạng thật (từ onboarding) ──
  const [bodyMetrics, setBodyMetrics] = useState<BodyMetrics | null>(null);
  const [activePlanInfo, setActivePlanInfo] = useState<{ startDate?: string; totalWeeks?: number; weekNumber?: number } | null>(null);
  const { user } = useAuthContext();
  const { data, isLoading, error, refresh } = useDashboard();
  const navigate = useNavigate();

  const dashboardStats = data?.stats || {
    caloriesConsumed: 0, caloriesGoal: 2000,
    proteinConsumed: 0, proteinGoal: 150,
    carbsConsumed: 0, carbsGoal: 250,
    fatConsumed: 0, fatGoal: 70,
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
    sleepHours: 0, sleepGoal: 8, hrv: 0, restingHR: 0, energyLevel: 0, recommendation: 'Rest',
  };

  const todayWorkouts = (data?.todayWorkouts || []) as WorkoutItem[];

  const stats = {
    ...dashboardStats,
    budgetLimit: aiBudgetTotal ?? dashboardStats.budgetLimit,
    spentToday: aiSpent ? aiSpent : (dashboardStats.budgetLimit - dashboardStats.budgetRemaining),
    caloriesConsumed: aiCaloriesIn ?? dashboardStats.caloriesConsumed,
  };

  const userName = userSummary.fullName;
  const aiSuggestion = data?.aiSuggestion;

  // Ngân sách chỉ có ý nghĩa khi đã thiết lập (có kế hoạch ăn / có chi tiêu / đã chỉnh)
  // → tránh hiển thị 80k mặc định cho user chưa setup.
  const hour = new Date().getHours();
  const greeting = hour < 11 ? 'Chào buổi sáng' : hour < 14 ? 'Chào buổi trưa' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';

  const weeklyWorkoutPct = pct(stats.workoutsThisWeek, stats.workoutsWeeklyGoal || 6);
  const proteinPct = pct(stats.proteinConsumed, stats.proteinGoal);
  const carbsPct = pct(stats.carbsConsumed, stats.carbsGoal);
  const fatPct = pct(stats.fatConsumed, stats.fatGoal);
  const calorieIntakePct = pct(stats.caloriesConsumed, stats.caloriesGoal);
  const healthScore = Math.min(98, Math.round((weeklyWorkoutPct + proteinPct + calorieIntakePct) / 3));
  const healthLabel = healthScore >= 80 ? 'Rất tốt' : healthScore >= 60 ? 'Khá' : healthScore >= 40 ? 'Trung bình' : 'Cần cải thiện';

  // ── Dữ liệu tuần THẬT từ backend ──
  const weeklyTrend = data?.weeklyTrend ?? [];
  const mealsLogged = data?.mealsLogged ?? null;
  const achievements = data?.achievements ?? [];
  const weeklyGoals = data?.weeklyGoals ?? [];
  const hasTrendData = weeklyTrend.some(p => p.calories > 0);
  const trendMax = Math.max(...weeklyTrend.map(p => p.calories), 1);

  // Có hoạt động nào chưa? → quyết định lời chào hero (tránh khen khi user chưa làm gì)
  const hasAnyActivity = (stats.workoutsThisWeek || 0) > 0 || (stats.completedWorkoutsToday || 0) > 0
    || Number(stats.caloriesConsumed || 0) > 0 || (userSummary.streakDays || 0) > 0
    || (mealsLogged?.total || 0) > 0;
  const heroTitle = !hasAnyActivity
    ? 'Chào mừng đến với Viway!'
    : healthScore >= 70 ? 'Tuần này bạn giữ nhịp rất tốt'
      : healthScore >= 40 ? 'Tuần này bạn đang tiến bộ'
        : 'Cùng bắt đầu tuần mới nào';
  const heroSubtitle = !hasAnyActivity
    ? 'Tạo kế hoạch tập & ăn để bắt đầu theo dõi hành trình của bạn.'
    : healthScore >= 70 ? 'Bạn duy trì thói quen đều đặn và đạt nhiều tiến bộ. Hãy tiếp tục phát huy nhé!'
      : healthScore >= 40 ? 'Bạn đang đi đúng hướng — giữ nhịp thêm vài buổi nữa nhé!'
        : 'Hôm nay là thời điểm tốt để bắt đầu. Hoàn thành một việc nhỏ thôi!';

  // ── Mục tiêu / Hành trình: tiến độ + timeline THẬT ──
  const planProgress = Math.max(0, Math.min(100, Math.round(stats.activePlanProgress || 0)));
  const goalLabel = bodyMetrics?.goalShort ?? 'Chưa đặt mục tiêu';
  const planTimeline = (() => {
    const { startDate, totalWeeks, weekNumber } = activePlanInfo || {};
    if (!startDate || !totalWeeks) return null;
    const end = new Date(startDate).getTime() + totalWeeks * 7 * 86400000;
    const remainingDays = Math.max(0, Math.ceil((end - Date.now()) / 86400000));
    return { remainingDays, weekNumber: weekNumber || 1, totalWeeks };
  })();

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<ConfettiDetail>).detail;
      setGoalReached(true);
      setTimeout(() => setGoalReached(false), 4000);
      if (detail) {
        if (typeof detail.calories === 'number') setAiCaloriesIn(detail.calories);
        if (typeof detail.spent === 'number') setAiSpent(detail.spent);
        if (typeof detail.budget === 'number') setAiBudgetTotal(detail.budget);
      }
    };
    window.addEventListener('trigger-confetti', handler);
    return () => window.removeEventListener('trigger-confetti', handler);
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

  // Phân tích thể trạng thật + thông tin kế hoạch (cho card Mục tiêu)
  useEffect(() => {
    if (!user?.id) return;
    let mounted = true;
    (async () => {
      try {
        const [body, health, trainings] = await Promise.all([
          userService.getBodyProfile(),
          userService.getHealthProfile(),
          trainingService.getUserTraining(user.id),
        ]);
        if (!mounted) return;
        if (body?.weight && body?.height && body?.age) {
          setBodyMetrics(computeBodyMetrics({
            weight: body.weight,
            height: body.height,
            age: body.age,
            gender: body.gender,
            goal: body.goal,
            // activityLevel lấy từ HealthProfile (onboarding), fallback moderate
            activityLevel: (health?.dailyActivityLevel as string) || 'moderate',
          }));
        }
        const list = Array.isArray(trainings) ? trainings : [];
        const active = list.find((t: any) => ['ACTIVE', 'active', 'IN_PROGRESS'].includes(t.status)) || list[0];
        if (active) {
          setActivePlanInfo({
            startDate: active.startDate,
            totalWeeks: active.totalWeeks,
            weekNumber: active.weekNumber,
          });
        }
      } catch { /* ignore */ }
    })();
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
      className="mx-auto w-full max-w-[460px] space-y-5 pb-24 sm:px-2">
      <Confetti active={goalReached} />

      <motion.section variants={fadeScale}
        className="mx-auto w-full overflow-hidden bg-[#f7fbfa] p-0 text-[#111827] min-[460px]:rounded-[28px] min-[460px]:p-3 min-[460px]:shadow-[0_28px_90px_-46px_rgba(20,96,86,0.45)]">
        <div className="relative overflow-hidden bg-slate-900 text-white shadow-[0_22px_50px_-30px_rgba(15,23,42,0.6)] min-[460px]:rounded-[22px]">
          <img src="/images/viway-report-training-daylight.png" alt="Người dùng Viway sau một tuần tập luyện" className="h-[360px] w-full object-cover object-[58%_center] min-[390px]:h-[376px]" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/82 via-slate-950/36 to-transparent" />
          <div className="absolute left-4 top-5 max-w-[210px]">
            <p className="mb-2 text-xs font-bold text-teal-300">{greeting}, {userName}</p>
            <h2 className="font-grotesk text-[28px] font-black leading-[1.03] tracking-[-0.02em]">{heroTitle}</h2>
            <div className="mt-3 h-1.5 w-12 rounded-full bg-teal-400" />
            <p className="mt-3 text-[13px] leading-5 text-white/92">
              {heroSubtitle}
            </p>
          </div>
          <div className="absolute bottom-4 left-3 right-3 grid grid-cols-[1fr_0.86fr] items-end gap-2">
            <div className="rounded-[18px] border border-white/35 bg-white/16 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] backdrop-blur-md">
              <div className="flex items-center gap-2.5">
                <div className="relative grid h-[70px] w-[70px] shrink-0 place-items-center rounded-full bg-black/25"
                  style={{ background: `conic-gradient(#2dd4bf ${healthScore * 3.6}deg, rgba(255,255,255,0.22) 0deg)` }}>
                  <div className="grid h-[54px] w-[54px] place-items-center rounded-full bg-slate-900/70">
                    <div className="text-center">
                      <p className="font-grotesk text-[24px] font-black leading-none">{healthScore}</p>
                      <p className="text-[11px] text-white/80">/100</p>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-white/90">Điểm sức khỏe</p>
                  <p className="mt-1 text-sm font-semibold text-teal-300">{healthLabel}</p>
                </div>
              </div>
            </div>
            <div className="self-end rounded-[16px] border border-white/30 bg-slate-900/35 p-2.5 backdrop-blur-md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-white/88">Chuỗi duy trì</p>
                  <p className="mt-1 font-grotesk text-lg font-black">{userSummary.streakDays} ngày</p>
                  {recovery.energyLevel ? <p className="mt-1 text-[10px] text-white/75">Năng lượng {recovery.energyLevel}/5</p> : null}
                </div>
                <div className="grid h-9 w-9 place-items-center rounded-full bg-teal-400 text-white">
                  <Flame className="h-[18px] w-[18px]" />
                </div>
              </div>
              <div className="mt-3 grid grid-cols-7 gap-1">
                {Array.from({ length: 7 }, (_, i) => (
                  <span key={i} className={`h-1.5 rounded-full ${i < Math.min(6, stats.workoutsThisWeek) ? 'bg-teal-400' : 'bg-white/25'}`} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {isSetupIncomplete && (
          <div className="mt-4 rounded-[20px] border border-teal-100 bg-white p-4 shadow-[0_14px_34px_rgba(15,23,42,0.06)]">
            <div className="flex items-start gap-2.5">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-600">
                <Brain className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-grotesk text-base font-black text-slate-950">Bắt đầu hành trình của bạn</h3>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  Trang này theo dõi tập luyện, dinh dưỡng và tiến độ mỗi ngày. Tạo kế hoạch để bắt đầu — AI sẽ cá nhân hoá theo thể trạng &amp; mục tiêu của bạn.
                </p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              <button onClick={() => navigate('/dashboard/workout')}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-teal-600 px-3 py-2.5 text-sm font-bold text-white transition-colors hover:bg-teal-700">
                <Dumbbell className="h-4 w-4" /> Tạo lịch tập
              </button>
              <button onClick={() => navigate('/dashboard/diet')}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-orange-500 px-3 py-2.5 text-sm font-bold text-white transition-colors hover:bg-orange-600">
                <Apple className="h-4 w-4" /> Tạo lịch ăn
              </button>
            </div>
            <button onClick={() => setShowSetupWizard(true)}
              className="mt-2 w-full rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-bold text-teal-800 transition-colors hover:bg-teal-100">
              ⚡ Thiết lập nhanh cả hai bằng AI
            </button>
          </div>
        )}

        <div className="mt-4 grid grid-cols-3 border-b border-slate-200 text-center text-[15px] font-semibold text-slate-500">
          <span className="border-b-[3px] border-teal-500 pb-3.5 text-teal-700">Tổng quan</span>
          <Link to="/dashboard/workout" className="pb-3.5 hover:text-teal-700">Tập luyện</Link>
          <Link to="/dashboard/diet" className="pb-3.5 hover:text-teal-700">Dinh dưỡng</Link>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2.5">
          {[
            { title: 'Buổi tập', value: `${stats.workoutsThisWeek}/${stats.workoutsWeeklyGoal || 6}`, note: `${weeklyWorkoutPct}% mục tiêu`, icon: Dumbbell, tone: 'text-teal-600', bg: 'bg-teal-50' },
            { title: 'Protein', value: `${proteinPct}%`, note: proteinPct >= 100 ? 'Đạt mục tiêu' : 'Thấp hơn mục tiêu', icon: Beef, tone: 'text-orange-500', bg: 'bg-orange-50' },
            { title: 'Kcal đốt', value: (stats.caloriesBurned || 0).toLocaleString('vi-VN'), note: 'Kcal', icon: Flame, tone: 'text-teal-600', bg: 'bg-teal-50' },
            { title: 'Kcal nạp', value: (stats.caloriesConsumed || 0).toLocaleString('vi-VN'), note: 'Kcal', icon: Apple, tone: 'text-teal-600', bg: 'bg-teal-50' },
          ].map(({ title, value, note, icon: Icon, tone, bg }) => (
            <div key={title} className="min-w-0 rounded-[16px] bg-white p-3 shadow-[0_12px_26px_rgba(15,23,42,0.07)]">
              <div className={`grid h-10 w-10 place-items-center rounded-[13px] ${bg} ${tone}`}>
                <Icon className="h-[18px] w-[18px]" />
              </div>
              <p className="mt-3 truncate text-[12px] font-semibold text-slate-700">{title}</p>
              <p className={`mt-1 font-grotesk text-[22px] font-black leading-none tracking-[-0.03em] ${tone}`}>{value}</p>
              <p className="mt-1 text-[10px] font-medium leading-3 text-slate-500">{note}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-3 rounded-[18px] border border-orange-200 bg-orange-50 px-3.5 py-3.5">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-orange-100 text-orange-500">
            <Brain className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-grotesk text-base font-black text-slate-950">Điểm cần chú ý</h3>
            <p className="mt-1 text-[13px] leading-5 text-slate-700">
              {aiSuggestion || 'Lượng protein của bạn thấp hơn mục tiêu trung bình 12%. Hãy bổ sung thêm để hỗ trợ phục hồi và phát triển cơ bắp.'}
            </p>
          </div>
          <ChevronRight className="h-5 w-5 shrink-0 text-slate-500" />
        </div>

        <div className="mt-4 rounded-[20px] bg-white p-4 shadow-[0_14px_34px_rgba(15,23,42,0.06)]">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-grotesk text-lg font-black text-slate-950">Xu hướng tuần</h3>
            <span className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600">Calo đốt</span>
          </div>
          {hasTrendData ? (
            <div className="flex h-[150px] items-end justify-between gap-2 px-1">
              {weeklyTrend.map((p, i) => {
                const h = Math.round((p.calories / trendMax) * 100);
                const isToday = i === weeklyTrend.length - 1;
                return (
                  <div key={p.date} className="flex flex-1 flex-col items-center gap-1.5">
                    <span className="text-[10px] font-bold text-slate-500">{p.calories > 0 ? p.calories.toLocaleString('vi-VN') : ''}</span>
                    <div className="flex w-full flex-1 items-end">
                      <div
                        className={`w-full rounded-t-lg ${isToday ? 'bg-teal-500' : 'bg-teal-200'}`}
                        style={{ height: `${Math.max(4, h)}%` }}
                      />
                    </div>
                    <span className={`text-[11px] ${isToday ? 'font-bold text-teal-700' : 'text-slate-500'}`}>{p.label}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
              <Flame className="mb-2 h-6 w-6 text-slate-300" />
              <p className="text-sm font-semibold text-slate-600">Chưa đủ dữ liệu</p>
              <p className="mt-1 text-xs text-slate-400">Hoàn thành bài tập mỗi ngày để xem biểu đồ calo đốt theo tuần.</p>
            </div>
          )}
        </div>

        <div className="mt-4 rounded-[20px] bg-white p-4 shadow-[0_14px_34px_rgba(15,23,42,0.06)]">
          <div className="grid grid-cols-[72px_1fr_86px] items-center gap-3">
            <div className="grid h-[72px] w-[72px] shrink-0 place-items-center rounded-full"
              style={{ background: `conic-gradient(#2dd4bf ${planProgress * 3.6}deg, #e5e7eb 0deg)` }}>
              <div className="grid h-[58px] w-[58px] place-items-center rounded-full bg-white font-grotesk text-xl font-black text-slate-950">
                {planProgress}%
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-grotesk text-base font-black text-slate-950">Hành trình của bạn</h3>
              <p className="text-xs leading-4 text-slate-500">Tiến độ mục tiêu: <span className="font-semibold text-teal-700">{goalLabel}</span></p>
              <p className="mt-2 text-sm font-semibold text-slate-950">
                {planProgress >= 100 ? 'Bạn đã hoàn thành kế hoạch!' : planProgress > 0 ? 'Bạn đang đi đúng hướng!' : 'Bắt đầu buổi tập đầu tiên nhé!'}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {planTimeline
                  ? `Tuần ${planTimeline.weekNumber}/${planTimeline.totalWeeks} · còn ~${planTimeline.remainingDays} ngày`
                  : 'Tạo kế hoạch tập để theo dõi mốc thời gian'}
              </p>
              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-200">
                <div className="h-full rounded-full bg-teal-500" style={{ width: `${planProgress}%` }} />
              </div>
            </div>
            <Link to="/dashboard/logbook" className="relative block overflow-hidden rounded-2xl">
              <img src="/images/viway-hero-training-bright.png" alt="Ảnh tiến độ tập luyện" className="h-[86px] w-[86px] object-cover" />
              <span className="absolute inset-y-0 right-2 my-auto grid h-8 w-8 place-items-center rounded-full bg-white text-xl text-slate-900 shadow-md">›</span>
            </Link>
          </div>
        </div>

        {/* ── Phân tích thể trạng (từ hồ sơ onboarding) ── */}
        {bodyMetrics && (
          <div className="mt-4 rounded-[20px] bg-white p-4 shadow-[0_14px_34px_rgba(15,23,42,0.06)]">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-xl bg-teal-50 text-teal-700">
                  <Activity className="h-4 w-4" />
                </div>
                <h3 className="font-grotesk text-base font-black text-slate-950">Phân tích thể trạng</h3>
              </div>
              <span className="rounded-full px-2.5 py-1 text-[11px] font-bold"
                style={{ color: bodyMetrics.zone.hex, backgroundColor: `${bodyMetrics.zone.hex}1a` }}>
                {bodyMetrics.zone.label}
              </span>
            </div>

            {/* BMI + định hướng calo */}
            <div className="grid grid-cols-[auto_1fr] items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="text-center">
                <p className="font-grotesk text-3xl font-black leading-none" style={{ color: bodyMetrics.zone.hex }}>
                  {bodyMetrics.bmi.toFixed(1)}
                </p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">BMI</p>
              </div>
              <p className="text-xs leading-relaxed text-slate-600">{bodyMetrics.zone.note}</p>
            </div>

            {/* Chỉ số dinh dưỡng mục tiêu */}
            <div className="mt-3 grid grid-cols-3 gap-3">
              {[
                { Icon: Flame, label: 'TDEE', value: bodyMetrics.tdee.toLocaleString('vi-VN'), sub: 'tiêu hao/ngày', tone: 'text-orange-600 bg-orange-50' },
                { Icon: Target, label: 'Mục tiêu', value: bodyMetrics.target.toLocaleString('vi-VN'), sub: 'kcal ăn/ngày', tone: 'text-teal-700 bg-teal-50' },
                { Icon: Beef, label: 'Protein', value: `${bodyMetrics.protG}g`, sub: 'mỗi ngày', tone: 'text-rose-600 bg-rose-50' },
              ].map(({ Icon, label, value, sub, tone }) => (
                <div key={label} className="rounded-2xl border border-slate-100 p-3">
                  <div className={`mb-2 grid h-7 w-7 place-items-center rounded-lg ${tone}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
                  <p className="mt-0.5 font-grotesk text-lg font-black text-slate-950">{value}</p>
                  <p className="text-[10px] text-slate-500">{sub}</p>
                </div>
              ))}
            </div>

            {/* Macro chi tiết */}
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-semibold">
              <span className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2 py-1 text-rose-600"><Beef className="h-3 w-3" /> Đạm {bodyMetrics.protG}g</span>
              <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 text-amber-600"><Wheat className="h-3 w-3" /> Tinh bột {bodyMetrics.carbG}g</span>
              <span className="inline-flex items-center gap-1 rounded-lg bg-yellow-50 px-2 py-1 text-yellow-700"><Droplets className="h-3 w-3" /> Béo {bodyMetrics.fatG}g</span>
              <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-slate-600"><Scale className="h-3 w-3" /> Mỡ ~{bodyMetrics.bodyFat}%</span>
            </div>

            {/* Định hướng thời gian */}
            <div className="mt-3 flex items-start gap-2.5 rounded-2xl border border-teal-100 bg-[linear-gradient(135deg,#f0fdfa,#ffffff_70%)] p-3">
              <Target className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" />
              <div>
                <p className="text-[11px] font-bold text-teal-700">{bodyMetrics.dirLabel}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{bodyMetrics.timelineText}</p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-[20px] bg-white p-4 shadow-[0_14px_34px_rgba(15,23,42,0.06)]">
            <h3 className="font-grotesk text-base font-black text-slate-950">Dinh dưỡng tuần này</h3>
            {[
              ['Protein', proteinPct, 'bg-orange-500'],
              ['Carb', carbsPct, 'bg-teal-400'],
              ['Chất béo', fatPct, 'bg-teal-400'],
            ].map(([label, value, color]) => (
              <div key={label as string} className="mt-3 grid grid-cols-[52px_1fr_34px] items-center gap-2 text-[11px]">
                <span className="truncate text-slate-600">{label}</span>
                <span className="h-1.5 overflow-hidden rounded-full bg-slate-200">
                  <span className={`block h-full rounded-full ${color}`} style={{ width: `${Math.min(100, Number(value))}%` }} />
                </span>
                <span className={`text-right font-bold ${Number(value) < 90 ? 'text-orange-500' : 'text-teal-600'}`}>{value}%</span>
              </div>
            ))}
          </div>

          <div className="rounded-[20px] bg-white p-4 shadow-[0_14px_34px_rgba(15,23,42,0.06)]">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-grotesk text-base font-black text-slate-950">Bữa ăn đã ghi</h3>
                <p className="mt-2 font-grotesk text-2xl font-black text-teal-700">{mealsLogged?.total ?? 0}<span className="text-slate-400">/{mealsLogged?.goal ?? 21}</span></p>
              </div>
              <span className="text-xs font-bold text-teal-600">{pct(mealsLogged?.total ?? 0, mealsLogged?.goal ?? 21)}%</span>
            </div>
            <div className="mt-4 grid grid-cols-4 gap-1.5 text-center text-[10px] font-semibold text-slate-700">
              {(mealsLogged?.byType ?? [
                { type: 'Sáng', done: 0, goal: 7 },
                { type: 'Trưa', done: 0, goal: 7 },
                { type: 'Tối', done: 0, goal: 7 },
                { type: 'Bữa phụ', done: 0, goal: 7 },
              ]).map(({ type, done, goal }) => (
                <div key={type}>
                  <div className="mx-auto mb-1.5 grid h-9 w-9 place-items-center rounded-xl bg-teal-50 text-teal-600">
                    <Apple className="h-4 w-4" />
                  </div>
                  <p className="truncate">{type}</p>
                  <p className="mt-0.5 text-sm font-black text-slate-950">{done}/{goal}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-[20px] bg-white p-4 shadow-[0_14px_34px_rgba(15,23,42,0.06)]">
            <h3 className="font-grotesk text-base font-black text-slate-950">Mục tiêu tuần này</h3>
            {weeklyGoals.length === 0 ? (
              <div className="mt-3 flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-8 text-center">
                <Target className="mb-1.5 h-5 w-5 text-slate-300" />
                <p className="text-xs font-semibold text-slate-500">Chưa có mục tiêu</p>
              </div>
            ) : (
              weeklyGoals.map((g) => (
                <div key={g.label} className="mt-3 flex items-center gap-2 text-[12px] leading-4 text-slate-700">
                  {g.done
                    ? <Check className="h-4 w-4 shrink-0 text-teal-600" />
                    : <span className="h-4 w-4 shrink-0 rounded-full border border-slate-300" />}
                  <span className={`flex-1 ${g.done ? 'text-slate-400 line-through' : ''}`}>{g.label}</span>
                  <span className="shrink-0 font-bold text-slate-500">{g.progress}</span>
                </div>
              ))
            )}
          </div>

          <div className="rounded-[20px] bg-white p-4 shadow-[0_14px_34px_rgba(15,23,42,0.06)]">
            <h3 className="font-grotesk text-base font-black text-slate-950">Thành tựu tuần này</h3>
            {achievements.length === 0 ? (
              <div className="mt-3 flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-8 text-center">
                <Check className="mb-1.5 h-5 w-5 text-slate-300" />
                <p className="text-xs font-semibold text-slate-500">Chưa có thành tựu</p>
                <p className="mt-1 text-[10px] text-slate-400">Tập luyện và ghi bữa ăn để mở khoá</p>
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                {achievements.map((a) => {
                  const Icon = a.icon === 'flame' ? Flame : a.icon === 'meal' ? Apple : a.icon === 'check' ? Check : Award;
                  const color = a.icon === 'flame' ? 'bg-orange-50 text-orange-500'
                    : a.icon === 'meal' ? 'bg-green-50 text-green-600'
                    : a.icon === 'check' ? 'bg-teal-50 text-teal-600'
                    : 'bg-emerald-50 text-emerald-600';
                  return (
                    <div key={a.title} className="rounded-xl bg-slate-50 p-2">
                      <div className={`mx-auto grid h-9 w-9 place-items-center rounded-xl ${color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <p className="mt-2 text-[11px] font-black leading-3 text-slate-950">{a.title}</p>
                      <p className="mt-1 text-[9px] leading-3 text-slate-500">{a.desc}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {(metric.days === null || metric.days >= 7) && (
          <div className="mt-4 grid gap-3">
            {(metric.days === null || metric.days >= 7) && (
              <button onClick={() => setShowCheckIn(true)}
                className="flex items-center gap-3 rounded-[18px] border border-sky-200 bg-sky-50 px-4 py-3.5 text-left text-sky-800 hover:bg-sky-100">
                <Scale className="h-5 w-5 shrink-0" />
                <span>
                  <span className="block font-bold">Cập nhật thể trạng tuần này</span>
                  <span className="text-sm text-sky-700">{metric.days === null ? 'Ghi lần đo đầu tiên để bắt đầu theo dõi.' : `Đã ${metric.days} ngày kể từ lần đo gần nhất.`}</span>
                </span>
              </button>
            )}
          </div>
        )}

        {hasAnyActivity && (
          <div className="mt-5 flex items-center justify-center gap-2 rounded-[18px] bg-teal-50 px-4 py-3.5 text-center text-[13px] font-medium text-teal-800">
            <Zap className="h-4 w-4" />
            Cảm ơn bạn đã nỗ lực! Hãy tiếp tục duy trì thói quen tuyệt vời này nhé!
          </div>
        )}
      </motion.section>

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
