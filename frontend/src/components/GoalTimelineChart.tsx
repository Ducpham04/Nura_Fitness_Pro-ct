import { useState, useEffect, useMemo } from 'react';
import {
  AreaChart, Area,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine,
} from 'recharts';
import {
  Target, Clock, Loader2,
  Scale, CheckCircle2, Flame, Dumbbell, Zap,
} from 'lucide-react';
import ProgressRing from './ProgressRing';
import { userService, type BodyMetricPoint } from '../services/userService';
import { trainingService } from '../services/trainingService';

// ─── Helpers ────────────────────────────────────────────────────────────────

const round1 = (n: number) => Math.round(n * 10) / 10;
const fmtShort = (d: Date) => `${d.getDate()}/${d.getMonth() + 1}`;
const fmtFull = (d: Date) =>
  d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
const DAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

const toLocalDate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/** Trả về mảng 7 ngày (T2→CN) của tuần thứ `offset` dùng local date (tránh UTC offset) */
function getWeekDates(offset = 0): string[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dow = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1) + offset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return toLocalDate(d);
  });
}

function linReg(pts: { x: number; y: number }[]) {
  const n = pts.length;
  if (n < 2) return null;
  const sx = pts.reduce((s, p) => s + p.x, 0);
  const sy = pts.reduce((s, p) => s + p.y, 0);
  const sxy = pts.reduce((s, p) => s + p.x * p.y, 0);
  const sx2 = pts.reduce((s, p) => s + p.x * p.x, 0);
  const den = n * sx2 - sx * sx;
  if (den === 0) return null;
  const slope = (n * sxy - sx * sy) / den;
  const intercept = (sy - slope * sx) / n;
  return { slope, intercept };
}

function calcGoalWeight(profile: any): number | null {
  const height = Number(profile?.heightCm ?? profile?.height ?? 0);
  const weight = Number(profile?.weightKg ?? profile?.weight ?? 0);
  const bodyFat = Number(profile?.bodyFatPercent ?? 0);
  const gender = (profile?.gender ?? '').toLowerCase();
  const goal = (profile?.primaryGoal ?? '').toLowerCase();
  if (!height || !weight) return null;
  if (bodyFat > 0) {
    const targetFat = gender.includes('f') ? 22 : 15;
    const lean = weight * (1 - bodyFat / 100);
    const rec = round1(lean / (1 - targetFat / 100));
    if (rec > 0 && rec < weight) return rec;
  }
  const isBulk = goal.includes('build') || goal.includes('muscle');
  const hm = height / 100;
  return round1((isBulk ? 23 : 22) * hm * hm);
}

// ─── Motivational message ───────────────────────────────────────────────────

function motivation(pct: number, planned: number, hasPlan = false) {
  if (planned === 0 && !hasPlan) return { text: 'Chưa có kế hoạch tập tuần này', color: 'text-neutral-400', emoji: '📋' };
  if (pct === 100) return { text: 'Xuất sắc! Hoàn thành 100% kế hoạch tuần này', color: 'text-lime', emoji: '🏆' };
  if (pct >= 80) return { text: 'Đang đúng hướng! Duy trì đà này nhé', color: 'text-lime', emoji: '💪' };
  if (pct >= 60) return { text: 'Gần đạt rồi! Cố thêm buổi nữa là xong', color: 'text-yellow-400', emoji: '🔥' };
  if (pct > 0) return { text: 'Đã tập được rồi! Tiếp tục duy trì nhé', color: 'text-orange-400', emoji: '⚡' };
  return { text: 'Bắt đầu buổi tập đầu tiên của tuần nào!', color: 'text-neutral-400', emoji: '🎯' };
}

// ─── Tooltip ────────────────────────────────────────────────────────────────

function ChartTip({ active, payload, label, unit }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl bg-black/90 backdrop-blur border border-white/15 px-3 py-2 text-xs min-w-[100px]">
      <div className="text-neutral-400 mb-1">{label}</div>
      <span className="font-bold text-white">{payload[0].value}</span>
      <span className="text-neutral-400 ml-1">{unit}</span>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function GoalTimelineChart({ userId }: { userId: number }) {
  const [loading, setLoading] = useState(true);
  const [weights, setWeights] = useState<BodyMetricPoint[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [activePlan, setActivePlan] = useState<any>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      setLoading(true);
      const [w, prof, trainings] = await Promise.all([
        userService.getBodyMetricHistory(),
        userService.getHealthProfile(),
        trainingService.getUserTraining(userId).catch(() => [] as any[]),
      ]);

      let dailyLogs: any[] = [];
      const list = Array.isArray(trainings) ? trainings : [];
      const active = list.find((t: any) =>
        ['ACTIVE', 'active', 'IN_PROGRESS'].includes(t.status)) || list[0];

      if (active) {
        const planId = active.trainingPlanId || active.id;
        if (planId) {
          dailyLogs = await trainingService
            .getDailyLogsByPlan(Number(planId), userId)
            .catch(() => []);
          // Lấy workoutsPerWeek từ plan nếu UserTraining không trả về
          if (!active.workoutsPerWeek) {
            const planRes = await trainingService.getTrainingPlans({ limit: 100 }).catch(() => ({ data: [] }));
            const plans = (planRes as any)?.data ?? [];
            const plan = Array.isArray(plans) ? plans.find((p: any) => p.id == planId) : null;
            if (plan?.workoutsPerWeek) active.workoutsPerWeek = plan.workoutsPerWeek;
          }
        }
      }

      if (!alive) return;
      setWeights(w);
      setProfile(prof?.data ?? prof);
      setActivePlan(active || null);
      setLogs(Array.isArray(dailyLogs) ? dailyLogs : []);
      setLoading(false);
    };
    load();
    const onUpdate = () => load();
    window.addEventListener('body-metric-updated', onUpdate);
    window.addEventListener('training-log-updated', onUpdate);
    return () => {
      alive = false;
      window.removeEventListener('body-metric-updated', onUpdate);
      window.removeEventListener('training-log-updated', onUpdate);
    };
  }, [userId]);

  const data = useMemo(() => {
    const primaryGoal = (profile?.primaryGoal ?? '').toLowerCase();
    const goalWeight = Number(profile?.goalWeightKg ?? 0) || calcGoalWeight(profile) || null;
    const plannedPerWeek = Number(activePlan?.workoutsPerWeek ?? 0);
    const today = new Date().toISOString().split('T')[0];

    // ── Completed log dates set ──
    const completedDates = new Set(
      logs
        .filter((l: any) => ['completed', 'COMPLETED'].includes(l.status ?? ''))
        .map((l: any) => (l.trainingDate ?? '').split('T')[0])
    );

    // ── Tuần này (7 ngày T2→CN) ──
    const thisWeekDates = getWeekDates(0);
    const weekDots = thisWeekDates.map((date, i) => {
      const isPast = date <= today;
      const done = completedDates.has(date);
      return { label: DAY_LABELS[i], date, done, isPast };
    });
    const doneThisWeek = weekDots.filter(d => d.done).length;
    const pastDaysThisWeek = weekDots.filter(d => d.isPast).length;
    const weekPct = plannedPerWeek > 0
      ? Math.round((doneThisWeek / plannedPerWeek) * 100)
      : pastDaysThisWeek > 0 ? Math.round((doneThisWeek / pastDaysThisWeek) * 100) : 0;

    // ── 4 tuần gần nhất (bar chart) ──
    const fourWeeks = Array.from({ length: 4 }, (_, i) => {
      const dates = getWeekDates(i - 3);
      const done = dates.filter(d => completedDates.has(d)).length;
      const pct = plannedPerWeek > 0
        ? Math.min(100, Math.round((done / plannedPerWeek) * 100))
        : done > 0 ? Math.min(100, Math.round((done / 5) * 100)) : 0;
      const weekLabel = `T${fmtShort(new Date(dates[0]))}`;
      return { label: weekLabel, pct, done };
    });

    // ── Goal-specific metric ──
    const isWeightGoal = primaryGoal.includes('lose') || primaryGoal.includes('fat') || primaryGoal.includes('weight') || primaryGoal === '';
    const isMuscle = primaryGoal.includes('build') || primaryGoal.includes('muscle');
    const isEndurance = primaryGoal.includes('endurance') || primaryGoal.includes('event') || primaryGoal.includes('bền');

    let goalChart: { label: string; value: number }[] = [];
    let goalUnit = '';
    let goalChartColor = '#3B82F6';
    let projectedDate: Date | null = null;
    let projectedWeeks: number | null = null;

    if (isWeightGoal && weights.length >= 2 && goalWeight) {
      // Weight trend + projection
      goalUnit = 'kg';
      goalChartColor = '#3B82F6';
      goalChart = weights.slice(-10).map(w => ({
        label: fmtShort(new Date(w.recordedAt!)),
        value: round1(w.weightKg!),
      }));
      const base = new Date(weights[0].recordedAt!);
      base.setHours(0, 0, 0, 0);
      const ms = 86_400_000;
      const pts = weights.map(w => ({
        x: Math.round((new Date(w.recordedAt!).getTime() - base.getTime()) / ms),
        y: w.weightKg!,
      }));
      const reg = linReg(pts);
      if (reg && reg.slope < 0) {
        const lastX = pts[pts.length - 1].x;
        const daysUntil = (goalWeight - reg.intercept) / reg.slope;
        if (daysUntil > lastX) {
          projectedDate = new Date(base.getTime() + daysUntil * ms);
          projectedWeeks = Math.ceil((daysUntil - lastX) / 7);
        }
      }
    } else if (isMuscle) {
      // Weekly volume (sets completed)
      goalUnit = 'sets';
      goalChartColor = '#A855F7';
      goalChart = Array.from({ length: 6 }, (_, i) => {
        const dates = new Set(getWeekDates(i - 5));
        const sets = logs
          .filter((l: any) => dates.has((l.trainingDate ?? '').split('T')[0])
            && ['completed', 'COMPLETED'].includes(l.status ?? ''))
          .reduce((s: number, l: any) => s + (Number(l.setsCompleted) || 0), 0);
        return { label: `T${6 - i}`, value: sets };
      });
    } else if (isEndurance) {
      // Weekly calories burned
      goalUnit = 'kcal';
      goalChartColor = '#FB923C';
      goalChart = Array.from({ length: 6 }, (_, i) => {
        const dates = new Set(getWeekDates(i - 5));
        const kcal = logs
          .filter((l: any) => dates.has((l.trainingDate ?? '').split('T')[0]))
          .reduce((s: number, l: any) => s + (Number(l.caloriesBurned) || 0), 0);
        return { label: `T${6 - i}`, value: kcal };
      });
    } else {
      // Default: weekly workout count (maintain)
      goalUnit = 'buổi';
      goalChartColor = '#22D3EE';
      goalChart = fourWeeks.map(w => ({ label: w.label, value: w.done }));
    }

    const msg = motivation(weekPct, plannedPerWeek, !!activePlan);
    const currentWeight = weights.length ? weights[weights.length - 1].weightKg! : null;
    const noPlan = !activePlan;
    const hasAnyActivity = completedDates.size > 0;

    return {
      weekDots, doneThisWeek, plannedPerWeek, weekPct, fourWeeks,
      goalChart, goalUnit, goalChartColor, goalWeight, currentWeight,
      projectedDate, projectedWeeks, msg,
      isWeightGoal, isMuscle, isEndurance, primaryGoal,
      noPlan, hasAnyActivity,
    };
  }, [weights, profile, logs, activePlan]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/[0.07] bg-gradient-to-b from-white/[0.045] to-white/[0.015] p-5 h-[260px] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-lime animate-spin" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-gradient-to-b from-white/[0.045] to-white/[0.015] p-5 shadow-[0_4px_24px_-10px_rgba(0,0,0,0.5)] space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center gap-2">
        <Target className="w-4 h-4 text-lime" />
        <h3 className="font-grotesk font-bold italic uppercase text-white text-sm tracking-tight">
          Lộ trình luyện tập
        </h3>
      </div>

      {/* ── Empty: chưa có kế hoạch ── */}
      {data.noPlan ? (
        <div className="flex flex-col items-center justify-center text-center py-6 gap-3">
          <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
            <Dumbbell className="w-7 h-7 text-neutral-600" />
          </div>
          <div>
            <p className="text-white text-sm font-semibold">Chưa có kế hoạch luyện tập</p>
            <p className="text-neutral-500 text-xs mt-1 max-w-[220px]">
              Tạo kế hoạch tập để theo dõi tiến độ và nhận dự báo đạt mục tiêu.
            </p>
          </div>
          <div className="rounded-xl bg-lime/5 border border-lime/20 px-4 py-2 text-xs text-lime font-medium">
            Vào tab Luyện tập → Tạo kế hoạch
          </div>
        </div>

      ) : !data.hasAnyActivity ? (
        /* ── Empty: có kế hoạch nhưng chưa tập buổi nào ── */
        <>
          <div className="flex flex-col items-center justify-center text-center py-4 gap-3">
            <div className="w-14 h-14 rounded-2xl bg-lime/[0.07] border border-lime/20 flex items-center justify-center">
              <Zap className="w-7 h-7 text-lime" />
            </div>
            <div>
              <p className="text-white text-sm font-semibold">Kế hoạch đã sẵn sàng!</p>
              <p className="text-neutral-500 text-xs mt-1 max-w-[240px]">
                Hoàn thành buổi tập đầu tiên để bắt đầu theo dõi tiến độ của bạn.
              </p>
            </div>
          </div>

          {/* Vẫn hiện lịch tuần để user biết hôm nào cần tập */}
          <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-4 space-y-3">
            <p className="text-neutral-400 text-xs font-medium uppercase tracking-wide">Tuần này — {data.plannedPerWeek} buổi theo kế hoạch</p>
            <div className="flex gap-1.5">
              {data.weekDots.map(({ label, isPast }) => (
                <div key={label} className="flex flex-col items-center gap-1 flex-1">
                  <div className={`w-full h-7 rounded-lg flex items-center justify-center text-xs font-bold border ${
                    isPast
                      ? 'bg-white/[0.03] border-white/[0.08] text-neutral-600'
                      : 'bg-lime/[0.06] border-lime/20 text-lime/60'
                  }`}>
                    –
                  </div>
                  <span className="text-neutral-600 text-[10px]">{label}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-neutral-500">Bắt đầu tập để các ô này chuyển sang ✓ xanh</p>
          </div>
        </>

      ) : (
        /* ── Có dữ liệu — hiển thị đầy đủ ── */
        <>
          {/* ── Tuần này ── */}
          <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-4 space-y-3">
            <p className="text-neutral-400 text-xs font-medium uppercase tracking-wide">Tuần này</p>

            <div className="flex items-center gap-4">
              <div className="relative flex-shrink-0">
                <ProgressRing
                  progress={data.weekPct}
                  size={72}
                  strokeWidth={6}
                  color={data.weekPct >= 80 ? '#CCFF00' : data.weekPct >= 60 ? '#FACC15' : '#FB923C'}
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-grotesk font-bold text-white text-sm leading-none">{data.doneThisWeek}</span>
                  <span className="text-neutral-500 text-[10px] leading-none mt-0.5">/{data.plannedPerWeek || '?'}</span>
                </div>
              </div>

              <div className="flex-1">
                <div className="flex gap-1.5">
                  {data.weekDots.map(({ label, done, isPast }) => (
                    <div key={label} className="flex flex-col items-center gap-1 flex-1">
                      <div className={`w-full h-7 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${
                        done
                          ? 'bg-lime text-black'
                          : isPast
                            ? 'bg-white/[0.05] text-neutral-500 border border-white/[0.08]'
                            : 'bg-white/[0.02] text-neutral-700 border border-white/[0.04]'
                      }`}>
                        {done ? '✓' : isPast ? '✕' : '·'}
                      </div>
                      <span className="text-neutral-600 text-[10px]">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className={`flex items-center gap-2 text-xs font-medium ${data.msg.color}`}>
              <span>{data.msg.emoji}</span>
              <span>{data.msg.text}</span>
            </div>
          </div>

          {/* ── 4 tuần gần nhất ── */}
          <div className="space-y-2">
            <p className="text-neutral-400 text-xs font-medium uppercase tracking-wide">Tiến độ 4 tuần</p>
            <div className="flex items-end gap-2 h-16">
              {data.fourWeeks.map(({ label, pct }, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full rounded-t-md transition-all duration-700"
                    style={{
                      height: `${Math.max(4, (pct / 100) * 52)}px`,
                      background: i === 3
                        ? (pct >= 80 ? '#CCFF00' : pct >= 60 ? '#FACC15' : '#FB923C')
                        : 'rgba(255,255,255,0.12)',
                    }} />
                  <span className="text-neutral-600 text-[10px]">{label}</span>
                  <span className={`text-[10px] font-bold ${i === 3 ? 'text-white' : 'text-neutral-500'}`}>{pct}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Goal-specific chart ── */}
          {data.goalChart.some(d => d.value > 0) && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {data.isWeightGoal && <Scale className="w-3.5 h-3.5 text-blue-400" />}
                {data.isMuscle && <Dumbbell className="w-3.5 h-3.5 text-purple-400" />}
                {data.isEndurance && <Flame className="w-3.5 h-3.5 text-orange-400" />}
                {!data.isWeightGoal && !data.isMuscle && !data.isEndurance && <Zap className="w-3.5 h-3.5 text-cyan-400" />}
                <p className="text-neutral-400 text-xs font-medium uppercase tracking-wide">
                  {data.isWeightGoal ? 'Cân nặng' : data.isMuscle ? 'Khối lượng tập' : data.isEndurance ? 'Calo đốt / tuần' : 'Buổi hoàn thành'}
                </p>
              </div>
              <ResponsiveContainer width="100%" height={100}>
                <AreaChart data={data.goalChart} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                  <defs>
                    <linearGradient id="goalGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={data.goalChartColor} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={data.goalChartColor} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: '#525252', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#525252', fontSize: 10 }} axisLine={false} tickLine={false}
                    domain={data.isWeightGoal ? ['dataMin - 1', 'dataMax + 1'] : [0, 'auto']} />
                  <Tooltip content={<ChartTip unit={data.goalUnit} />} cursor={{ stroke: 'rgba(255,255,255,0.06)' }} />
                  {data.isWeightGoal && data.goalWeight && (
                    <ReferenceLine y={data.goalWeight} stroke="#CCFF00" strokeDasharray="5 3" strokeWidth={1.5}
                      label={{ value: `${data.goalWeight}kg`, position: 'insideTopRight', fill: '#CCFF00', fontSize: 10 }} />
                  )}
                  <Area type="monotone" dataKey="value"
                    stroke={data.goalChartColor} strokeWidth={2} fill="url(#goalGrad)"
                    dot={{ r: 2.5, fill: data.goalChartColor, strokeWidth: 0 }}
                    activeDot={{ r: 4 }} animationDuration={800} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* ── Dự báo ── */}
          {data.projectedDate ? (
            <div className="rounded-xl bg-lime/5 border border-lime/20 px-4 py-3 flex items-start gap-3">
              <Clock className="w-4 h-4 text-lime flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-neutral-300">
                  Với tốc độ hiện tại, bạn ước tính đạt mục tiêu{' '}
                  {data.goalWeight && <span className="text-lime font-bold">{data.goalWeight} kg</span>}
                  {' '}vào <span className="text-lime font-bold">{fmtFull(data.projectedDate)}</span>
                </p>
                {data.projectedWeeks && (
                  <p className="text-neutral-500 text-xs mt-0.5">~{data.projectedWeeks} tuần nữa</p>
                )}
              </div>
            </div>
          ) : data.goalWeight && data.currentWeight && data.currentWeight <= data.goalWeight ? (
            <div className="rounded-xl bg-lime/5 border border-lime/20 px-4 py-3 flex items-center gap-3">
              <CheckCircle2 className="w-4 h-4 text-lime" />
              <p className="text-xs text-lime font-bold">Bạn đã đạt mục tiêu cân nặng! Tiếp tục duy trì nhé 💪</p>
            </div>
          ) : null}
        </>
      )}

    </div>
  );
}
