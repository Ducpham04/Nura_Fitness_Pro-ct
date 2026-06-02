import { useState, useEffect, useCallback } from 'react';
import {
  History, Dumbbell, Flame, ChevronRight, Calendar,
  TrendingUp, Check, Clock, Loader2, RefreshCw, Utensils,
} from 'lucide-react';
import { useAuthContext } from '../context/AuthContext';
import { trainingService } from '../services/trainingService';
import { Link } from 'react-router-dom';

type LogItem = {
  id: number;
  date: string;
  exerciseName: string;
  exerciseType?: string;
  sets?: number;
  reps?: number;
  caloriesBurned?: number;
  durationMinutes?: number;
  status: string;
};

function formatDate(dateStr: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return 'Hôm nay';
  if (d.toDateString() === yesterday.toDateString()) return 'Hôm qua';
  return d.toLocaleDateString('vi-VN', { weekday: 'short', day: 'numeric', month: 'numeric' });
}

function groupByDate(logs: LogItem[]) {
  const groups: Record<string, LogItem[]> = {};
  for (const log of logs) {
    const key = log.date;
    if (!groups[key]) groups[key] = [];
    groups[key].push(log);
  }
  return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
}

export default function LogbookPage() {
  const { user } = useAuthContext();
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'completed'>('all');

  const loadLogs = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      // Lấy active training để get plan ID
      const trainings = await trainingService.getUserTraining(user.id);
      const list = Array.isArray(trainings) ? trainings : [];
      const active = list.find((t: any) =>
        t.status === 'ACTIVE' || t.status === 'active' || t.status === 'IN_PROGRESS'
      ) || list[0];

      if (!active?.trainingPlanId && !active?.id) { setLoading(false); return; }
      const planId = active.trainingPlanId || active.id;

      const res = await trainingService.getDailyLogsByPlan(planId, user.id);
      const raw = Array.isArray(res) ? res : (res as any)?.data || [];

      const mapped: LogItem[] = raw
        .filter((l: any) => l.status && l.status !== 'PLANNED')
        .map((l: any) => ({
          id: l.dtlId || Math.random(),
          date: l.trainingDate || new Date().toISOString().split('T')[0],
          exerciseName: l.challengeName || l.challengeTitle || l.exerciseName || 'Bài tập',
          exerciseType: l.exerciseType,
          sets: l.setsCompleted || l.targetSets,
          reps: l.repsCompleted || l.targetReps,
          caloriesBurned: l.caloriesBurned,
          durationMinutes: l.actualDurationMinutes,
          status: (l.status || '').toLowerCase(),
        }))
        .sort((a: LogItem, b: LogItem) => b.date.localeCompare(a.date));

      setLogs(mapped);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const filtered = activeFilter === 'completed'
    ? logs.filter(l => l.status === 'completed')
    : logs;

  const completedLogs = logs.filter(l => l.status === 'completed');
  const totalKcal = completedLogs.reduce((s, l) => s + (l.caloriesBurned || 0), 0);
  const thisWeekLogs = completedLogs.filter(l => {
    const d = new Date(l.date);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return d >= weekAgo;
  });
  const grouped = groupByDate(filtered);

  return (
    <div className="max-w-3xl mx-auto space-y-5 py-4 animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-lime mb-1">
            <History className="w-3.5 h-3.5" /> Nhật ký
          </div>
          <h1 className="font-grotesk font-bold text-xl text-white">Lịch sử tập luyện</h1>
          <p className="text-neutral-500 text-xs mt-0.5">
            {completedLogs.length} buổi đã hoàn thành
          </p>
        </div>
        <button
          onClick={loadLogs}
          disabled={loading}
          className="w-9 h-9 rounded-xl border border-white/[0.08] bg-white/[0.03] text-neutral-400 hover:text-white flex items-center justify-center transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Tuần này', value: thisWeekLogs.length, sub: 'buổi', icon: TrendingUp, color: 'text-lime' },
          { label: 'Tổng buổi', value: completedLogs.length, sub: 'hoàn thành', icon: Check, color: 'text-blue-400' },
          { label: 'Calories đốt', value: totalKcal > 1000 ? `${(totalKcal/1000).toFixed(1)}k` : totalKcal, sub: 'kcal', icon: Flame, color: 'text-orange-400' },
        ].map(({ label, value, sub, icon: Icon, color }) => (
          <div key={label} className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 text-center">
            <Icon className={`w-4 h-4 ${color} mx-auto mb-2`} />
            <div className="font-grotesk font-bold text-xl text-white">{value}</div>
            <div className="text-neutral-600 text-[10px] uppercase tracking-wider mt-0.5">{label}</div>
            <div className="text-neutral-700 text-[9px]">{sub}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {(['all', 'completed'] as const).map(f => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${
              activeFilter === f
                ? 'bg-lime/15 border-lime/30 text-lime'
                : 'border-white/[0.08] text-neutral-500 hover:text-white bg-white/[0.03]'
            }`}
          >
            {f === 'all' ? 'Tất cả' : 'Đã hoàn thành'}
          </button>
        ))}
      </div>

      {/* Log list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 text-lime animate-spin" />
        </div>
      ) : grouped.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-12 text-center">
          <Dumbbell className="w-10 h-10 text-neutral-700 mx-auto mb-4" />
          <h3 className="text-white font-semibold mb-2">Chưa có nhật ký nào</h3>
          <p className="text-neutral-500 text-sm mb-6">Hoàn thành bài tập đầu tiên để bắt đầu ghi nhật ký.</p>
          <Link to="/dashboard/workout" className="btn-lime px-5 py-2.5 text-sm font-bold inline-flex items-center gap-2">
            <Dumbbell className="w-4 h-4" /> Bắt đầu tập
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(([date, items]) => (
            <div key={date}>
              {/* Date header */}
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-3.5 h-3.5 text-neutral-600" />
                <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                  {formatDate(date)}
                </span>
                <div className="flex-1 h-px bg-white/[0.05]" />
                <span className="text-[10px] text-neutral-700">
                  {items.filter(i => i.status === 'completed').length}/{items.length}
                </span>
              </div>

              {/* Log items */}
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] divide-y divide-white/[0.04] overflow-hidden">
                {items.map(log => (
                  <div key={log.id} className="flex items-center gap-3 px-4 py-3.5">
                    {/* Status icon */}
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      log.status === 'completed'
                        ? 'bg-lime/10 border border-lime/20'
                        : log.status === 'in_progress'
                        ? 'bg-blue-400/10 border border-blue-400/20'
                        : 'bg-white/[0.05] border border-white/[0.07]'
                    }`}>
                      {log.status === 'completed'
                        ? <Check className="w-4 h-4 text-lime" />
                        : <Dumbbell className="w-4 h-4 text-neutral-500" />}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate ${
                        log.status === 'completed' ? 'text-white' : 'text-neutral-500'
                      }`}>
                        {log.exerciseName}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {log.sets && log.reps && (
                          <span className="text-[10px] text-neutral-500 font-semibold">
                            {log.sets}×{log.reps}
                          </span>
                        )}
                        {log.durationMinutes && (
                          <span className="text-[10px] text-neutral-600 flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5" />{log.durationMinutes}min
                          </span>
                        )}
                        {log.exerciseType && (
                          <span className="text-[10px] text-neutral-700 capitalize">
                            {log.exerciseType.toLowerCase().replace('_', ' ')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Calories */}
                    {log.caloriesBurned ? (
                      <div className="text-right shrink-0">
                        <div className="text-orange-400 font-bold text-sm">{log.caloriesBurned}</div>
                        <div className="text-neutral-700 text-[9px]">kcal</div>
                      </div>
                    ) : (
                      <ChevronRight className="w-4 h-4 text-neutral-700 shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick navigation */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        <Link to="/dashboard/workout"
          className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 flex items-center gap-3 hover:bg-white/[0.06] transition-colors group"
        >
          <div className="w-9 h-9 rounded-xl bg-lime/10 border border-lime/20 flex items-center justify-center shrink-0">
            <Dumbbell className="w-4 h-4 text-lime" />
          </div>
          <div>
            <p className="text-white text-sm font-semibold group-hover:text-lime transition-colors">Tập luyện</p>
            <p className="text-neutral-600 text-xs">Bài hôm nay</p>
          </div>
          <ChevronRight className="w-4 h-4 text-neutral-700 ml-auto" />
        </Link>
        <Link to="/dashboard/diet"
          className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 flex items-center gap-3 hover:bg-white/[0.06] transition-colors group"
        >
          <div className="w-9 h-9 rounded-xl bg-orange-400/10 border border-orange-400/20 flex items-center justify-center shrink-0">
            <Utensils className="w-4 h-4 text-orange-400" />
          </div>
          <div>
            <p className="text-white text-sm font-semibold group-hover:text-orange-400 transition-colors">Dinh dưỡng</p>
            <p className="text-neutral-600 text-xs">Thực đơn hôm nay</p>
          </div>
          <ChevronRight className="w-4 h-4 text-neutral-700 ml-auto" />
        </Link>
      </div>
    </div>
  );
}
