import { useState, useEffect, useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { Scale, Flame, TrendingDown, TrendingUp, Minus, Loader2 } from 'lucide-react';
import { userService, type BodyMetricPoint } from '../services/userService';
import { trainingService } from '../services/trainingService';

type Tab = 'weight' | 'calories';

const fmtDay = (d: Date) => `${d.getDate()}/${d.getMonth() + 1}`;

/** Tooltip tối, gọn. */
function ChartTip({ active, payload, unit }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg bg-black/85 backdrop-blur border border-white/15 px-2.5 py-1.5 text-xs">
      <span className="text-white font-bold">{payload[0].value}</span>
      <span className="text-neutral-400 ml-1">{unit}</span>
    </div>
  );
}

/**
 * Biểu đồ xu hướng Dashboard — 2 tab: Cân nặng & Calo đốt.
 * Tự fetch dữ liệu thật; hiển thị empty state thân thiện nếu chưa có.
 */
export default function TrendChart({ userId }: { userId: number }) {
  const [tab, setTab] = useState<Tab>('weight');
  const [loading, setLoading] = useState(true);
  const [weights, setWeights] = useState<BodyMetricPoint[]>([]);
  const [calLogs, setCalLogs] = useState<{ date: string; kcal: number }[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const [w, trainings] = await Promise.all([
        userService.getBodyMetricHistory(),
        trainingService.getUserTraining(userId).catch(() => [] as any[]),
      ]);
      let logs: any[] = [];
      try {
        const list = Array.isArray(trainings) ? trainings : [];
        const active = list.find((t: any) =>
          ['ACTIVE', 'active', 'IN_PROGRESS'].includes(t.status)) || list[0];
        const planId = active?.trainingPlanId || active?.id;
        if (planId) {
          const raw = await trainingService.getDailyLogsByPlan(Number(planId), userId);
          logs = (Array.isArray(raw) ? raw : []).filter(
            (l: any) => (l.status || '').toLowerCase() === 'completed' && l.caloriesBurned);
        }
      } catch { /* ignore */ }
      if (!alive) return;
      setWeights(w);
      setCalLogs(logs.map((l: any) => ({ date: l.trainingDate, kcal: Number(l.caloriesBurned) || 0 })));
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [userId]);

  // ── Series cân nặng (tối đa 12 mốc gần nhất) ──
  const weightData = useMemo(() =>
    weights.slice(-12).map(w => ({
      label: w.recordedAt ? fmtDay(new Date(w.recordedAt)) : '',
      value: Math.round((w.weightKg || 0) * 10) / 10,
    })), [weights]);

  // ── Series calo đốt (7 ngày gần nhất, cộng dồn theo ngày) ──
  const calData = useMemo(() => {
    const map = new Map<string, number>();
    calLogs.forEach(l => { if (l.date) map.set(l.date, (map.get(l.date) || 0) + l.kcal); });
    const days: { label: string; value: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      days.push({ label: fmtDay(d), value: Math.round(map.get(key) || 0) });
    }
    return days;
  }, [calLogs]);

  const weightDelta = weightData.length >= 2
    ? Math.round((weightData[weightData.length - 1].value - weightData[0].value) * 10) / 10
    : 0;
  const calTotal = calData.reduce((s, d) => s + d.value, 0);
  const calAvg = calTotal > 0 ? Math.round(calTotal / 7) : 0;

  const isWeight = tab === 'weight';
  const accent = isWeight ? '#3B82F6' : '#FB923C';
  const data = isWeight ? weightData : calData;
  const hasData = isWeight ? weightData.length >= 2 : calTotal > 0;

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-gradient-to-b from-white/[0.045] to-white/[0.015] p-5 shadow-[0_4px_24px_-10px_rgba(0,0,0,0.5)]">
      {/* Header + tabs */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <h3 className="font-grotesk font-bold italic uppercase text-white text-sm tracking-tight">Xu hướng</h3>
        <div className="flex gap-1 rounded-xl border border-white/[0.08] bg-white/[0.03] p-1">
          {([
            ['weight', 'Cân nặng', Scale],
            ['calories', 'Calo đốt', Flame],
          ] as [Tab, string, any][]).map(([key, label, Icon]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                tab === key ? 'bg-lime text-black' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary line */}
      {hasData && (
        <div className="flex items-center gap-2 mb-3 text-sm">
          {isWeight ? (
            <>
              <span className="font-grotesk font-bold text-2xl text-white">
                {weightData[weightData.length - 1].value}
                <span className="text-neutral-500 text-sm font-normal ml-1">kg</span>
              </span>
              <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${
                weightDelta < 0 ? 'text-lime bg-lime/10'
                  : weightDelta > 0 ? 'text-orange-400 bg-orange-400/10'
                  : 'text-neutral-400 bg-white/[0.05]'
              }`}>
                {weightDelta < 0 ? <TrendingDown className="w-3 h-3" />
                  : weightDelta > 0 ? <TrendingUp className="w-3 h-3" />
                  : <Minus className="w-3 h-3" />}
                {weightDelta > 0 ? '+' : ''}{weightDelta} kg
              </span>
            </>
          ) : (
            <>
              <span className="font-grotesk font-bold text-2xl text-white">
                {calTotal.toLocaleString('vi-VN')}
                <span className="text-neutral-500 text-sm font-normal ml-1">kcal / 7 ngày</span>
              </span>
              <span className="text-xs text-neutral-400">TB {calAvg}/ngày</span>
            </>
          )}
        </div>
      )}

      {/* Chart / states */}
      {loading ? (
        <div className="h-[160px] flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-lime animate-spin" />
        </div>
      ) : !hasData ? (
        <div className="h-[160px] flex flex-col items-center justify-center text-center px-4">
          {isWeight ? <Scale className="w-8 h-8 text-neutral-700 mb-3" /> : <Flame className="w-8 h-8 text-neutral-700 mb-3" />}
          <p className="text-neutral-400 text-sm font-medium">
            {isWeight ? 'Chưa đủ dữ liệu cân nặng' : 'Chưa có buổi tập nào tuần này'}
          </p>
          <p className="text-neutral-600 text-xs mt-1">
            {isWeight
              ? 'Cập nhật chỉ số cơ thể nhiều lần để thấy xu hướng.'
              : 'Hoàn thành buổi tập để theo dõi calo đốt mỗi ngày.'}
          </p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={data} margin={{ top: 5, right: 4, left: -22, bottom: 0 }}>
            <defs>
              <linearGradient id={`grad-${tab}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={accent} stopOpacity={0.35} />
                <stop offset="100%" stopColor={accent} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis
              dataKey="label" tick={{ fill: '#737373', fontSize: 10 }}
              axisLine={false} tickLine={false} interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: '#737373', fontSize: 10 }} axisLine={false} tickLine={false}
              width={42} domain={isWeight ? ['dataMin - 1', 'dataMax + 1'] : [0, 'auto']}
            />
            <Tooltip content={<ChartTip unit={isWeight ? 'kg' : 'kcal'} />} cursor={{ stroke: 'rgba(255,255,255,0.1)' }} />
            <Area
              type="monotone" dataKey="value" stroke={accent} strokeWidth={2.5}
              fill={`url(#grad-${tab})`} dot={{ r: 3, fill: accent, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: accent }} animationDuration={900}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
