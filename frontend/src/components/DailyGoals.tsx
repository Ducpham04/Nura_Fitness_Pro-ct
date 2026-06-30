import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Dumbbell, Flame, ChevronRight } from 'lucide-react';

/**
 * "Bảng mục tiêu hôm nay" — lớp gắn kết chính của Home.
 * Avatar tiến hóa theo level + vòng mục tiêu đóng dần (Tập / Dinh dưỡng) + động viên.
 * CHỈ dùng tính năng & data app thực sự có (không thêm tính năng mới).
 */

const STAGES = ['Người mới', 'Khởi động', 'Cân đối', 'Săn chắc', 'Khỏe mạnh', 'Vận động viên'];

function stageFromLevel(level: number) {
  return Math.max(1, Math.min(6, level)); // 1..6
}

// Avatar cơ thể tiến hóa — vai rộng dần + sáng dần theo giai đoạn (1..6).
function Avatar({ stage }: { stage: number }) {
  const w = [6, 7, 9, 10.5, 12, 13.5][stage - 1];
  const strong = stage >= 5;
  const fill = strong ? '#CCFF00' : '#e2e8f0';
  const op = strong ? 1 : [0.4, 0.55, 0.78, 0.92, 1, 1][stage - 1];
  return (
    <svg viewBox="0 0 40 72" width="56" height="100" role="img" aria-label={`Giai đoạn ${stage}: ${STAGES[stage - 1]}`}>
      {stage >= 6 && <ellipse cx="20" cy="38" rx="17" ry="31" fill="#CCFF00" opacity="0.12" />}
      <circle cx="20" cy="9" r="5.5" fill={fill} opacity={op} />
      <path d={`M${20 - w} 19 Q20 15 ${20 + w} 19 L23.5 44 L16.5 44 Z`} fill={fill} opacity={op} />
      <rect x="15.4" y="43" width="3.5" height="24" rx="1.6" fill={fill} opacity={op} />
      <rect x="21.1" y="43" width="3.5" height="24" rx="1.6" fill={fill} opacity={op} />
    </svg>
  );
}

// Vòng tiến độ nhỏ (SVG) cho mỗi mục tiêu.
function Ring({ pct, color, icon: Icon }: { pct: number; color: string; icon: typeof Dumbbell }) {
  const r = 22, c = 2 * Math.PI * r;
  const off = c - (Math.min(100, pct) / 100) * c;
  return (
    <div className="relative w-[54px] h-[54px] shrink-0">
      <svg viewBox="0 0 54 54" className="w-full h-full -rotate-90">
        <circle cx="27" cy="27" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
        <circle cx="27" cy="27" r={r} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={off} style={{ transition: 'stroke-dashoffset 0.7s ease' }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
    </div>
  );
}

interface Props {
  level: number;
  currentExp: number;
  nextLevelExp: number;
  streakDays: number;
  completedWorkoutsToday: number;
  scheduledWorkoutsToday: number;
  workoutsThisWeek: number;
  workoutsWeeklyGoal: number;
  caloriesConsumed: number;
  caloriesGoal: number;
}

export default function DailyGoals({
  level, currentExp, nextLevelExp, streakDays,
  completedWorkoutsToday, scheduledWorkoutsToday,
  workoutsThisWeek, workoutsWeeklyGoal,
  caloriesConsumed, caloriesGoal,
}: Props) {
  const [celebrated, setCelebrated] = useState(false);

  // ── Tính tiến độ từng mục tiêu (data thật) ──
  // Tập: ưu tiên bài hôm nay; nếu chưa có lịch hôm nay thì theo tuần.
  const workoutPct = scheduledWorkoutsToday > 0
    ? Math.round((completedWorkoutsToday / scheduledWorkoutsToday) * 100)
    : workoutsWeeklyGoal > 0
      ? Math.round((workoutsThisWeek / workoutsWeeklyGoal) * 100)
      : 0;
  const nutritionPct = caloriesGoal > 0 ? Math.round((caloriesConsumed / caloriesGoal) * 100) : 0;

  const overall = Math.min(100, Math.round((Math.min(100, workoutPct) + Math.min(100, nutritionPct)) / 2));
  const expPct = nextLevelExp > 0 ? Math.min(100, Math.round((currentExp / nextLevelExp) * 100)) : 0;
  const stage = stageFromLevel(level);

  // Ăn mừng khi đóng đủ vòng (dùng confetti Home đã lắng nghe sẵn).
  useEffect(() => {
    if (overall >= 100 && !celebrated) {
      setCelebrated(true);
      try { window.dispatchEvent(new CustomEvent('trigger-confetti')); } catch { /* ignore */ }
    }
  }, [overall, celebrated]);

  const cheer = overall >= 100
    ? 'Tuyệt vời! Bạn đã đóng đủ mọi mục tiêu hôm nay 🎉'
    : overall >= 50
      ? 'Sắp xong rồi — cố nốt để giữ streak!'
      : overall > 0
        ? 'Đang đi đúng hướng, tiếp tục nhé!'
        : 'Bắt đầu ngày mới — hoàn thành mục tiêu đầu tiên nào!';

  const goals = [
    { key: 'workout', label: 'Tập luyện', pct: workoutPct, color: '#CCFF00', icon: Dumbbell,
      sub: scheduledWorkoutsToday > 0 ? `${completedWorkoutsToday}/${scheduledWorkoutsToday} bài` : `${workoutsThisWeek}/${workoutsWeeklyGoal} buổi tuần`,
      to: '/dashboard/workout' },
    { key: 'nutrition', label: 'Dinh dưỡng', pct: nutritionPct, color: '#fb923c', icon: Flame,
      sub: `${Math.round(caloriesConsumed)}/${Math.round(caloriesGoal)} kcal`, to: '/dashboard/diet' },
  ];

  return (
    <div className="rounded-3xl border border-white/[0.08] bg-gradient-to-b from-white/[0.05] to-white/[0.02] p-5 shadow-[0_8px_40px_-16px_rgba(0,0,0,0.7)]">
      {/* ── Avatar + cấp độ ── */}
      <div className="flex items-center gap-4">
        <div className="shrink-0 rounded-2xl bg-black/30 border border-white/[0.06] px-2 pt-1">
          <Avatar stage={stage} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-500">Hành trình của bạn</p>
              <h3 className="font-grotesk font-bold text-white text-lg leading-tight">Cấp {level} · {STAGES[stage - 1]}</h3>
            </div>
            <span className="shrink-0 text-[11px] font-bold text-orange-300 bg-orange-400/10 border border-orange-400/20 rounded-lg px-2 py-1">
              🔥 {streakDays} ngày
            </span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-white/[0.08] overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-electric to-lime transition-all duration-700" style={{ width: `${expPct}%` }} />
          </div>
          <p className="mt-1.5 text-[11px] text-neutral-500">
            {currentExp}/{nextLevelExp} EXP — còn {Math.max(0, nextLevelExp - currentExp)} nữa lên <span className="text-lime/80">{STAGES[Math.min(5, stage)]}</span>
          </p>
        </div>
      </div>

      {/* ── Mục tiêu hôm nay ── */}
      <div className="mt-5 flex items-center justify-between">
        <p className="text-sm font-semibold text-white">Mục tiêu hôm nay</p>
        <span className="text-sm font-grotesk font-bold" style={{ color: overall >= 100 ? '#CCFF00' : '#fff' }}>{overall}%</span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        {goals.map(g => (
          <Link key={g.key} to={g.to}
            className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3 hover:bg-white/[0.05] transition-colors">
            <Ring pct={g.pct} color={g.color} icon={g.icon} />
            <div className="min-w-0">
              <p className="text-white text-sm font-semibold truncate">{g.label}</p>
              <p className="text-neutral-500 text-[11px] truncate">{g.sub}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* ── Câu động viên tổng ── */}
      <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-lime/[0.06] border border-lime/15 px-4 py-3">
        <p className="text-sm text-lime/90 leading-snug">{cheer}</p>
        <ChevronRight className="w-4 h-4 text-lime/60 shrink-0" />
      </div>
    </div>
  );
}
