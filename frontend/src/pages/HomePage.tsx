import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Check,
  ChevronRight,
  Circle,
  Droplets,
  Dumbbell,
  Flame,
  MapPin,
  MessageSquare,
  Play,
  Target,
  Trophy,
  Utensils,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useDashboard } from '../hooks/useDashboard';
import { useAuthContext } from '../context/AuthContext';
import { userService, type UserBodyProfile } from '../services/userService';
import { apiClient } from '../services/apiClient';
import { containerStagger, fadeUp } from '../lib/motion';
import {
  STAGES,
  stageStatus,
  journeyProgress,
  currentStageIndex,
} from '../lib/journey';

function pct(value: number, goal: number) {
  return goal > 0 ? Math.min(100, Math.max(0, Math.round((value / goal) * 100))) : 0;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('vi-VN').format(Math.round(value));
}

function shortName(fullName?: string) {
  return (fullName || 'Bạn').trim().split(/\s+/).slice(-1)[0] || 'Bạn';
}

function greeting() {
  const h = new Date().getHours();
  if (h < 11) return 'Chào buổi sáng';
  if (h < 14) return 'Chào buổi trưa';
  if (h < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
}

function goalInfo(name?: string): { label: string; desc: string; color: string } {
  const g = (name || '').toLowerCase();
  if (/lose|loss|weight_loss|weight loss|fat|giảm|mỡ/.test(g))  return { label: 'Giảm mỡ',       color: '#f97316', desc: 'Đốt mỡ thừa, lấy lại vóc dáng tự tin.' };
  if (/muscle|muscle_gain|cơ|hypertrophy|gain|build/.test(g))    return { label: 'Tăng cơ',       color: '#CCFF00', desc: 'Cơ rắn chắc, thân hình thon gọn hơn mỗi tuần.' };
  if (/endurance|cardio|stamina|bền/.test(g))                    return { label: 'Sức bền',       color: '#ef4444', desc: 'Tim khoẻ hơn, vận động lâu mà ít mệt.' };
  if (/flexib|mobility|dẻo|linh hoạt/.test(g))                  return { label: 'Dẻo dai',       color: '#a855f7', desc: 'Khớp linh hoạt, giảm đau và nguy cơ chấn thương.' };
  if (/athletic|performance|thể thao|hiệu suất/.test(g))        return { label: 'Thể thao',      color: '#f59e0b', desc: 'Nhanh hơn, bùng nổ hơn — đỉnh cao phong độ.' };
  if (/strength|sức mạnh|power/.test(g))                        return { label: 'Sức mạnh',      color: '#22d3ee', desc: 'Nâng nặng hơn mỗi tuần, mạnh mẽ thật sự.' };
  if (/general|fitness|maintain|maintenance|duy trì|tổng/.test(g)) return { label: 'Thể lực chung', color: '#6366f1', desc: 'Khoẻ, dẻo, bền — bền vững lâu dài.' };
  return { label: 'Thể hình & sức khoẻ', color: '#CCFF00', desc: 'Mỗi buổi tập đưa bạn tiến gần hơn tới phiên bản tốt nhất.' };
}

// Animations are defined in index.css as global @keyframes

const FLOWER_POS = [[56,112],[144,108],[100,40],[74,64],[126,62]] as const;
const LEAF_POS   = [[64,124,20],[82,104,35],[118,100,-15],[136,118,10],[88,72,25],[112,70,-20],[100,48,5]] as const;
const DROP_POS   = [[44,130],[156,124],[100,30]] as const;

// HealthTree: cây phản ánh 3 trạng thái hôm nay + sức sống từ journey progress
// - workoutDone / anyWorkoutDone: phân biệt "hoàn thành" vs "đang làm"
// - mealLogged / anyWater: tương tự cho ăn và nước
// - progress: 0-100, làm tán cây xanh hơn theo hành trình tổng
function HealthTree({
  workoutDone, anyWorkoutDone, mealLogged, waterMet, anyWater, streak, progress,
}: {
  workoutDone: boolean; anyWorkoutDone: boolean;
  mealLogged: boolean; waterMet: boolean; anyWater: boolean;
  streak: number; progress: number;
}) {
  const angles6 = [0, 60, 120, 180, 240, 300];

  // Canopy màu xanh đậm hơn khi journey progress cao hơn
  const vitality = Math.max(0.12, Math.min(1, progress / 100));
  const c1 = `rgb(${Math.round(11 + vitality * 18)},${Math.round(48 + vitality * 40)},${Math.round(21 + vitality * 18)})`;
  const c2 = `rgb(${Math.round(14 + vitality * 20)},${Math.round(61 + vitality * 48)},${Math.round(27 + vitality * 22)})`;
  const c3 = `rgb(${Math.round(18 + vitality * 22)},${Math.round(76 + vitality * 54)},${Math.round(34 + vitality * 26)})`;
  const c4 = `rgb(${Math.round(23 + vitality * 18)},${Math.round(92 + vitality * 46)},${Math.round(42 + vitality * 22)})`;
  const c5 = `rgb(${Math.round(26 + vitality * 16)},${Math.round(107 + vitality * 40)},${Math.round(48 + vitality * 20)})`;

  return (
    <svg viewBox="0 0 200 220" className="h-full w-full" preserveAspectRatio="xMidYMid meet">
      <defs>
        <radialGradient id="halo" cx="50%" cy="55%" r="50%">
          <stop offset="0%" stopColor="#22c55e" stopOpacity={streak > 0 ? '0.32' : String(0.06 + vitality * 0.12)} />
          <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="trunk" cx="35%" cy="40%" r="65%">
          <stop offset="0%" stopColor="#78350f" />
          <stop offset="100%" stopColor="#3d1702" />
        </radialGradient>
        <filter id="fg" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="2.5" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      <ellipse cx="100" cy="135" rx="80" ry="74" fill="url(#halo)" />
      <ellipse cx="100" cy="215" rx="36" ry="6" fill="#000" opacity="0.28" />

      {/* Toàn bộ tán + thân cây lắc theo animation treeSway (định nghĩa trong index.css) */}
      <g style={{ transformBox: 'fill-box', transformOrigin: '50% 100%', animation: 'treeSway 5s ease-in-out infinite' }}>
        <path d="M87 214 L92 176 L90 152 L100 132 L110 152 L108 176 L113 214 Z" fill="url(#trunk)" />
        <path d="M100 132 L103 155 L102 180 L101 214" stroke="#92400e" strokeWidth="1.5" fill="none" opacity="0.5" />
        <path d="M91 196 Q 74 208 56 214" stroke="#3d1702" strokeWidth="3.5" fill="none" strokeLinecap="round" />
        <path d="M109 200 Q 126 211 144 214" stroke="#3d1702" strokeWidth="3.5" fill="none" strokeLinecap="round" />

        {/* Tán cây — màu xanh thay đổi theo vitality */}
        <ellipse cx="100" cy="152" rx="54" ry="18" fill={c1} />
        <ellipse cx="68"  cy="140" rx="30" ry="19" fill={c1} />
        <ellipse cx="132" cy="137" rx="28" ry="18" fill={c1} />
        <ellipse cx="100" cy="120" rx="50" ry="28" fill={c2} />
        <ellipse cx="74"  cy="112" rx="36" ry="24" fill={c2} />
        <ellipse cx="126" cy="110" rx="34" ry="23" fill={c2} />
        <ellipse cx="100" cy="90"  rx="42" ry="27" fill={c3} />
        <ellipse cx="78"  cy="82"  rx="30" ry="22" fill={c3} />
        <ellipse cx="122" cy="81"  rx="28" ry="21" fill={c3} />
        <ellipse cx="100" cy="64"  rx="28" ry="22" fill={c4} />
        <circle  cx="100" cy="48"  r="18"           fill={c5} />

        {/* LÁ — phần thưởng bữa ăn: sáng khi xong, mờ nhẹ khi chưa (vẫn animate) */}
        {LEAF_POS.map(([cx, cy, rot], i) => (
          <ellipse key={`l${i}`} cx={cx} cy={cy} rx="8" ry="5"
            transform={`rotate(${rot},${cx},${cy})`}
            fill={mealLogged ? '#4ade80' : '#2a6b3a'}
            style={{
              animation: `${mealLogged ? 'leafPulse' : 'leafDim'} ${2 + i * 0.3}s ease-in-out infinite`,
              animationDelay: `${i * 0.18}s`,
              filter: mealLogged ? 'drop-shadow(0 0 4px rgba(74,222,128,0.75))' : 'none',
            }}
          />
        ))}

        {/* HOA — phần thưởng bài tập: sáng nếu xong hết, mờ nhẹ nếu đang làm, tối nếu chưa bắt đầu */}
        {FLOWER_POS.map(([fx, fy], i) => (
          <g key={`f${i}`} style={{
            animation: `${workoutDone ? 'flowerGlow' : 'flowerDim'} ${1.8 + i * 0.25}s ease-in-out infinite`,
            animationDelay: `${i * 0.15}s`,
            filter: workoutDone ? 'url(#fg)' : 'none',
          }}>
            {angles6.map(a => {
              const r = a * Math.PI / 180;
              const px = fx + Math.cos(r) * 5, py = fy + Math.sin(r) * 5;
              return (
                <ellipse key={a} cx={px} cy={py} rx="3.5" ry="2"
                  transform={`rotate(${a},${px},${py})`}
                  fill={workoutDone ? '#CCFF00' : anyWorkoutDone ? '#7aab00' : '#2a3510'}
                  opacity={workoutDone ? 0.95 : anyWorkoutDone ? 0.55 : 0.28}
                />
              );
            })}
            <circle cx={fx} cy={fy} r="2.5"
              fill={workoutDone ? '#f0ffb0' : anyWorkoutDone ? '#c8e85a' : '#1e2a0a'} />
          </g>
        ))}

        {/* GIỌT NƯỚC — phần thưởng uống nước */}
        {DROP_POS.map(([dx, dy], i) => (
          <path key={`d${i}`}
            d={`M${dx},${dy-8} C${dx-5},${dy-2} ${dx-5},${dy+3} ${dx},${dy+7} C${dx+5},${dy+3} ${dx+5},${dy-2} ${dx},${dy-8}Z`}
            fill={waterMet ? '#38bdf8' : anyWater ? '#1a7aa0' : '#0c2233'}
            style={{
              animation: `${waterMet || anyWater ? 'dropFloat' : 'dropDim'} ${2.2 + i * 0.4}s ease-in-out infinite`,
              animationDelay: `${i * 0.3}s`,
              filter: waterMet ? 'drop-shadow(0 0 5px rgba(56,189,248,0.8))' : anyWater ? 'drop-shadow(0 0 3px rgba(56,189,248,0.4))' : 'none',
            }}
          />
        ))}
      </g>
    </svg>
  );
}

// ── Mascot: tiny animated character at top-right corner ──
function Mascot({ aiInsight }: { aiInsight?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (open && ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open]);

  return (
    <div ref={ref} className="fixed top-[72px] right-3 z-50 flex flex-col items-end gap-2 md:top-20 md:right-5">
      {/* AI insight bubble */}
      {open && aiInsight && (
        <div className="mb-1 w-64 rounded-2xl border border-violet-500/30 bg-[#0c1322]/95 p-3 text-xs leading-relaxed text-[#e2e8f0] shadow-[0_8px_32px_rgba(0,0,0,0.6)] backdrop-blur-xl">
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-violet-300">AI Coach gợi ý</span>
          {aiInsight}
        </div>
      )}
      {/* mascot SVG */}
      <button
        onClick={() => aiInsight && setOpen(v => !v)}
        className={`transition-transform ${aiInsight ? 'cursor-pointer hover:scale-110 active:scale-95' : 'cursor-default'}`}
        title={aiInsight ? 'Xem gợi ý AI Coach' : undefined}
        aria-label="Mascot AI Coach"
      >
        <svg
          viewBox="0 0 52 72"
          width="52"
          height="72"
          style={{ animation: 'mascotBob 2.4s ease-in-out infinite', filter: 'drop-shadow(0 4px 12px rgba(204,255,0,0.35))' }}
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* antenna */}
          <line x1="26" y1="6" x2="26" y2="13" stroke="#CCFF00" strokeWidth="2" strokeLinecap="round" />
          <circle cx="26" cy="4" r="3" fill="#CCFF00" />

          {/* head */}
          <rect x="10" y="12" width="32" height="26" rx="10" fill="#CCFF00" />

          {/* eyes */}
          <g style={{ transformOrigin: '18px 24px', animation: 'mascotBlink 4s ease-in-out infinite' }}>
            <circle cx="18" cy="24" r="3.5" fill="#0a0f1c" />
          </g>
          <circle cx="18" cy="24" r="1.2" fill="#fff" />
          <g style={{ transformOrigin: '34px 24px', animation: 'mascotBlink 4s ease-in-out infinite', animationDelay: '0.1s' }}>
            <circle cx="34" cy="24" r="3.5" fill="#0a0f1c" />
          </g>
          <circle cx="34" cy="24" r="1.2" fill="#fff" />

          {/* smile */}
          <path d="M 18 31 Q 26 37 34 31" stroke="#0a0f1c" strokeWidth="2" fill="none" strokeLinecap="round" />

          {/* body */}
          <rect x="13" y="38" width="26" height="18" rx="8" fill="#b8f000" />

          {/* left arm (static) */}
          <rect x="3" y="40" width="10" height="7" rx="3.5" fill="#CCFF00" />

          {/* right arm (waving) */}
          <g style={{ transformOrigin: '39px 43px', animation: 'mascotWave 1.8s ease-in-out infinite' }}>
            <rect x="39" y="40" width="10" height="7" rx="3.5" fill="#CCFF00" />
          </g>

          {/* legs */}
          <rect x="16" y="54" width="8" height="12" rx="4" fill="#b8f000" />
          <rect x="28" y="54" width="8" height="12" rx="4" fill="#b8f000" />

          {/* sneakers */}
          <rect x="13" y="63" width="14" height="6" rx="3" fill="#0a0f1c" />
          <rect x="25" y="63" width="14" height="6" rx="3" fill="#0a0f1c" />
        </svg>
      </button>
    </div>
  );
}

function HomeSkeleton() {
  return (
    <div className="mx-auto w-full max-w-2xl animate-pulse space-y-4 pb-24">
      <div className="h-14 rounded-3xl bg-white/[0.05]" />
      <div className="h-52 rounded-3xl bg-white/[0.05]" />
      <div className="grid grid-cols-3 gap-3">
        <div className="h-24 rounded-2xl bg-white/[0.05]" />
        <div className="h-24 rounded-2xl bg-white/[0.05]" />
        <div className="h-24 rounded-2xl bg-white/[0.05]" />
      </div>
      <div className="h-40 rounded-3xl bg-white/[0.05]" />
    </div>
  );
}

export default function HomePage() {
  const { user } = useAuthContext();
  const { data, isLoading, error, refresh } = useDashboard();
  const [profile, setProfile] = useState<UserBodyProfile | null>(null);
  const [waterToast, setWaterToast] = useState<{ msg: string; ok: boolean } | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    let mounted = true;
    userService.getBodyProfile()
      .then(p => { if (mounted) setProfile(p); })
      .catch(() => {});
    return () => { mounted = false; };
  }, [user?.id]);

  // visibilitychange đã được xử lý bên trong useDashboard hook với debounce 30s
  // Không cần thêm listener riêng ở đây nữa

  async function handleLogWater() {
    try {
      await apiClient.post('/daily-nutrition/log-water', { liters: 0.25 });
      setWaterToast({ msg: '+0.25L nước 💧 đã ghi!', ok: true });
      refresh();
    } catch {
      setWaterToast({ msg: 'Không ghi được, thử lại', ok: false });
    }
    setTimeout(() => setWaterToast(null), 2500);
  }

  if (isLoading) return <HomeSkeleton />;

  if (error) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md items-center justify-center px-4">
        <div className="w-full rounded-3xl border border-red-500/25 bg-red-500/10 p-7 text-center backdrop-blur-sm">
          <p className="font-grotesk text-lg font-bold text-white">Không tải được dữ liệu</p>
          <p className="mt-2 text-sm text-[#94a3b8]">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-5 rounded-2xl bg-gradient-to-r from-[#22c55e] to-[#3b82f6] px-5 py-3 text-sm font-bold text-white transition hover:opacity-90"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  const summary = data?.userSummary;
  const stats = data?.stats;
  const todayWorkouts = data?.todayWorkouts || [];

  const name = shortName(summary?.fullName || user?.fullName);
  const streak = summary?.streakDays || 0;
  const goal = goalInfo(profile?.goal);

  const progress = journeyProgress(stats);
  const curIdx = currentStageIndex(progress);
  const currentStage = curIdx >= 0 ? STAGES[curIdx] : STAGES[STAGES.length - 1];
  const nextStage = curIdx >= 0 && curIdx < STAGES.length - 1 ? STAGES[curIdx + 1] : null;

  const caloriesConsumed = stats?.caloriesConsumed || 0;
  const caloriesGoal = stats?.caloriesGoal || 0;
  const caloriesBurned = stats?.caloriesBurned || 0;
  const waterConsumed = Number(stats?.waterConsumed || 0);
  const waterGoal = stats?.waterGoal || 2;
  const proteinConsumed = Math.round(stats?.proteinConsumed || 0);
  const proteinGoal = Math.round(stats?.proteinGoal || 0);

  const nextWorkout = todayWorkouts.find(w => !w.done);
  const workoutDone = todayWorkouts.length > 0 && !nextWorkout;
  const anyWorkoutDone = todayWorkouts.some(w => w.done);
  const proteinMet = proteinGoal > 0 && proteinConsumed >= proteinGoal;
  const waterMet = waterConsumed >= waterGoal;
  const anyWater = waterConsumed > 0;
  const mealLogged = caloriesConsumed > 0;

  const primaryAction = nextWorkout
    ? { label: 'Bắt đầu buổi tập', sub: nextWorkout.name, reward: '+1 🌸', to: '/dashboard/workout', state: 'go' as const }
    : workoutDone
      ? { label: 'Đã xong buổi tập hôm nay', sub: 'Tuyệt vời — giữ phong độ nhé!', reward: '', to: '/dashboard/workout', state: 'done' as const }
      : { label: 'Tạo lịch tập của bạn', sub: 'Để AI thiết kế buổi tập phù hợp mục tiêu', reward: '', to: '/dashboard/workout', state: 'empty' as const };

  const priorities = [
    {
      done: workoutDone,
      title: 'Hoàn thành buổi tập',
      sub: nextWorkout ? nextWorkout.name : workoutDone ? 'Tất cả đã xong 🎉' : 'Chưa có lịch tập',
      value: todayWorkouts.length ? `${todayWorkouts.filter(w => w.done).length}/${todayWorkouts.length} bài` : '',
      reward: '🌸',
      to: '/dashboard/workout',
    },
    {
      done: proteinMet,
      title: proteinGoal > 0 ? `Nạp Protein ≥ ${proteinGoal}g` : 'Theo dõi Protein',
      sub: 'Mục tiêu dinh dưỡng',
      value: proteinGoal > 0 ? `${proteinConsumed} / ${proteinGoal}g` : '',
      reward: '🍃',
      to: '/dashboard/diet',
    },
    {
      done: waterMet,
      title: `Uống đủ nước ${waterGoal}L`,
      sub: 'Giữ cơ thể đủ nước',
      value: `${waterConsumed} / ${waterGoal}L`,
      reward: '💧',
      to: '/dashboard/diet',
    },
  ];

  const tasksTotal = priorities.length;
  const tasksDone = priorities.filter(p => p.done).length;
  const tasksLeft = tasksTotal - tasksDone;
  const hour = new Date().getHours();

  const greetSubtitle =
    tasksLeft === 0
      ? `Bạn đã hoàn thành cả ${tasksTotal} nhiệm vụ hôm nay 🎉`
      : tasksDone > 0
        ? `Bạn còn ${tasksLeft} nhiệm vụ hôm nay — giữ nhịp nhé.`
        : hour < 11
          ? 'Hôm nay bắt đầu nhẹ thôi, nhưng đừng bỏ nhịp.'
          : hour < 18
            ? 'Hôm nay không cần hoàn hảo. Chỉ cần giữ nhịp.'
            : 'Khép ngày nhẹ nhàng — hoàn thành nốt vài việc nhỏ.';

  const focusText =
    primaryAction.state === 'go'
      ? `Hoàn thành "${primaryAction.sub}" để giữ nhịp ${goal.label}.`
      : primaryAction.state === 'done'
        ? 'Buổi tập hôm nay đã xong — ghi bữa ăn & uống đủ nước để khép ngày.'
        : 'Tạo lịch tập đầu tiên để mở hành trình của bạn.';

  const aiInsight = data?.aiSuggestion?.trim();

  return (
    <>
      {/* Water log toast */}
      {waterToast && (
        <div className={`fixed left-1/2 top-20 z-[60] -translate-x-1/2 rounded-2xl px-4 py-2.5 text-sm font-bold shadow-lg transition-all ${
          waterToast.ok ? 'bg-sky-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {waterToast.msg}
        </div>
      )}

      {/* Mascot — AI Coach vẫy tay ở góc trên */}
      <Mascot aiInsight={aiInsight} />

      <motion.div
        variants={containerStagger}
        initial="hidden"
        animate="show"
        className="mx-auto w-full max-w-2xl space-y-4 pb-28 lg:pb-10"
      >
        {/* ── Greeting ── */}
        <motion.header variants={fadeUp} className="pt-1 pr-14">
          <h1 className="font-grotesk text-3xl font-bold leading-tight text-white">
            {greeting()}, {name} <span className="text-[#CCFF00]">👋</span>
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold">
            <span className="text-[#94a3b8]">
              {progress > 0
                ? `Giai đoạn ${curIdx >= 0 ? curIdx + 1 : 4}/4 · ${currentStage.title} · ${progress}% kế hoạch`
                : streak > 0
                  ? `${streak} ngày kỷ luật · ${currentStage.title}`
                  : 'Bắt đầu hành trình của bạn'}
            </span>
            <span className="text-[#3a4358]">·</span>
            <span style={{ color: goal.color }}>Mục tiêu: {goal.label}</span>
          </p>
          <p className="mt-1.5 text-sm text-[#94a3b8]">{greetSubtitle}</p>
        </motion.header>

        {/* ── Trọng tâm hôm nay ── */}
        <motion.section variants={fadeUp}>
          <Link
            to={primaryAction.to}
            className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 transition hover:border-white/20 active:scale-[0.99]"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/8 text-[#94a3b8]">
              <Target className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-bold uppercase tracking-wide text-[#64748b]">Trọng tâm hôm nay</span>
              <span className="block truncate text-sm font-semibold text-white">{focusText}</span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-white/20" />
          </Link>
        </motion.section>

        {/* ── HERO: Living Journey Card ── */}
        <motion.section variants={fadeUp}>
          <div className="group relative overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-br from-[#0c1322] to-[#0a0f1c] p-5 shadow-[0_24px_60px_-28px_rgba(0,122,255,0.55)]">
            <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[#007AFF]/25 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 left-10 h-56 w-56 rounded-full bg-[#CCFF00]/12 blur-3xl" />

            <div className="relative z-10 grid grid-cols-[1fr_130px] gap-3 sm:grid-cols-[1fr_180px] sm:gap-4">
              <div className="flex min-w-0 flex-col py-1">
                <div
                  className="inline-flex w-fit items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wide"
                  style={{ color: goal.color, borderColor: `${goal.color}55`, background: `${goal.color}1a` }}
                >
                  <Target className="h-3.5 w-3.5" />
                  Mục tiêu: {goal.label}
                </div>

                <h2 className="mt-3 font-grotesk text-[20px] font-bold leading-snug text-white sm:text-[23px]">
                  {goal.desc}
                </h2>

                <div className="mt-4">
                  <div className="mb-1.5 flex items-baseline justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-[#94a3b8]">
                      Nhịp hôm nay
                    </span>
                    <span className="font-grotesk text-base font-bold text-white">
                      <span className="text-[#CCFF00]">{tasksDone}</span>/{tasksTotal} nhiệm vụ
                    </span>
                  </div>

                  <div className="h-2.5 overflow-hidden rounded-full bg-white/8">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-[#22c55e] to-[#CCFF00]"
                      initial={{ width: 0 }}
                      animate={{ width: `${tasksTotal > 0 ? (tasksDone / tasksTotal) * 100 : 0}%` }}
                      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                    />
                  </div>

                  <p className="mt-1.5 line-clamp-1 text-[11px] font-medium text-[#64748b]">
                    Hành trình {progress}% · {nextStage ? `Chặng kế: ${nextStage.title}` : progress >= 100 ? 'Đã chinh phục 🎉' : 'Chặng cuối'}
                  </p>
                </div>
              </div>

              {/* Cây hành trình sức khỏe */}
              <div className="relative flex min-h-[250px] flex-col items-center justify-center gap-2">
                <div className="pointer-events-none absolute h-40 w-40 rounded-full bg-[#22c55e]/10 blur-2xl sm:h-48 sm:w-48" />
                <div className="relative h-[210px] w-[148px] sm:h-[228px] sm:w-[175px]">
                  <HealthTree
                    workoutDone={workoutDone}
                    anyWorkoutDone={anyWorkoutDone}
                    mealLogged={mealLogged}
                    waterMet={waterMet}
                    anyWater={anyWater}
                    streak={streak}
                    progress={progress}
                  />
                </div>
                <div className="relative z-10 flex gap-3 text-[11px] font-bold">
                  <span className={workoutDone ? 'text-[#CCFF00]' : anyWorkoutDone ? 'text-[#7aab00]' : 'text-white/25'}>🌸 Tập</span>
                  <span className={mealLogged  ? 'text-[#4ade80]' : 'text-white/25'}>🍃 Ăn</span>
                  <span className={waterMet    ? 'text-[#38bdf8]' : anyWater ? 'text-[#1a7aa0]' : 'text-white/25'}>💧 Nước</span>
                </div>
              </div>
            </div>

            {/* Hành động chính hôm nay */}
            <div className="relative z-10 mt-4 flex items-stretch gap-2.5 border-t border-white/10 pt-4">
              <Link
                to={primaryAction.to}
                className={`group/cta flex min-w-0 flex-1 items-center gap-3 rounded-2xl px-4 py-3 font-bold transition active:scale-[0.99] ${
                  primaryAction.state === 'done'
                    ? 'bg-white/[0.06] text-white'
                    : 'bg-[#CCFF00] text-[#0a0f1c] shadow-[0_0_22px_rgba(204,255,0,0.4)] hover:brightness-105'
                }`}
              >
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                  primaryAction.state === 'done' ? 'bg-[#22c55e]/20 text-[#22c55e]' : 'bg-[#0a0f1c]/15 text-[#0a0f1c]'
                }`}>
                  {primaryAction.state === 'done' ? <Check className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                </span>
                <span className="min-w-0 flex-1 text-left">
                  <span className="block truncate text-[15px] leading-tight">{primaryAction.label}</span>
                  <span className={`block truncate text-[11px] font-medium ${primaryAction.state === 'done' ? 'text-[#94a3b8]' : 'text-[#0a0f1c]/70'}`}>
                    {primaryAction.sub}{primaryAction.reward ? ` · Nhận ${primaryAction.reward}` : ''}
                  </span>
                </span>
                <ChevronRight className="h-5 w-5 shrink-0 transition group-hover/cta:translate-x-0.5" />
              </Link>

              <Link
                to="/dashboard/journey"
                title="Xem hành trình"
                className="flex shrink-0 flex-col items-center justify-center gap-0.5 rounded-2xl border border-white/10 bg-white/[0.04] px-3 text-[#94a3b8] transition hover:border-white/25 hover:text-white"
              >
                <MapPin className="h-4 w-4" />
                <span className="text-[10px] font-bold">Hành trình</span>
              </Link>
            </div>
          </div>
        </motion.section>

        {/* ── Tổng quan hôm nay ── */}
        <motion.section variants={fadeUp}>
          <div className="mb-2.5 flex items-center justify-between px-1">
            <h2 className="font-grotesk text-lg font-bold text-white">Tổng quan hôm nay</h2>
            <Link to="/dashboard/logbook" className="inline-flex items-center gap-0.5 text-sm font-bold text-[#64748b] transition-colors hover:text-white">
              Chi tiết <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: Flame,    color: 'text-orange-400', bg: 'bg-orange-500/15', label: 'Năng lượng nạp',
                value: formatNumber(caloriesConsumed), zero: caloriesConsumed === 0,
                unit: caloriesGoal > 0 ? `/ ${formatNumber(caloriesGoal)} kcal` : 'kcal',
                bar: caloriesGoal > 0 ? { p: pct(caloriesConsumed, caloriesGoal), c: 'bg-orange-400' } : null,
                note: caloriesConsumed === 0 ? 'Ghi bữa ăn đầu tiên' : caloriesGoal > 0 ? (caloriesConsumed >= caloriesGoal ? 'Đã đạt mục tiêu ✓' : `Còn ${formatNumber(caloriesGoal - caloriesConsumed)} kcal`) : null,
                ok: caloriesGoal > 0 && caloriesConsumed >= caloriesGoal },
              { icon: Dumbbell, color: 'text-blue-400', bg: 'bg-blue-500/15', label: 'Đốt hôm nay',
                value: formatNumber(caloriesBurned), zero: caloriesBurned === 0, unit: 'kcal', bar: null,
                note: caloriesBurned > 0 ? 'Tiếp tục vận động 🔥' : 'Hoàn thành buổi tập', ok: false },
              { icon: Droplets, color: 'text-sky-400', bg: 'bg-sky-500/15', label: 'Cấp nước',
                value: String(waterConsumed), zero: waterConsumed === 0, unit: `/ ${waterGoal} lít`,
                bar: { p: pct(waterConsumed, waterGoal), c: 'bg-sky-400' },
                note: waterConsumed === 0 ? 'Uống ly nước đầu tiên' : waterConsumed >= waterGoal ? 'Đủ nước ✓' : `Còn ${Math.max(0, +(waterGoal - waterConsumed).toFixed(1))} lít`,
                ok: waterConsumed >= waterGoal },
              { icon: Trophy,   color: 'text-amber-400', bg: 'bg-amber-500/15', label: 'Chuỗi kỷ luật',
                value: String(streak), zero: streak === 0, unit: 'ngày', bar: null,
                note: streak > 0 ? 'Đừng để đứt chuỗi!' : 'Bắt đầu chuỗi hôm nay', ok: streak > 0 },
            ].map(({ icon: Icon, color, bg, label, value, zero, unit, bar, note, ok }) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-sm transition hover:border-white/20">
                <div className="flex items-center gap-2">
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${bg}`}>
                    <Icon className={`h-4 w-4 ${color}`} />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs font-semibold text-[#94a3b8]">{label}</span>
                </div>
                <p className={`mt-3 font-grotesk text-[26px] font-bold leading-none ${zero ? 'text-[#475569]' : 'text-white'}`}>{value}</p>
                <p className="mt-1.5 truncate text-[11px] font-medium text-[#64748b]">{unit}</p>
                {bar && (
                  <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/8">
                    <div className={`h-full rounded-full ${bar.c}`} style={{ width: `${bar.p}%` }} />
                  </div>
                )}
                {note && (
                  <p className={`mt-2 truncate text-[11px] font-bold ${ok ? 'text-[#22c55e]' : zero ? 'text-[#94a3b8]' : 'text-[#cbd5e1]'}`}>{note}</p>
                )}
              </div>
            ))}
          </div>
        </motion.section>

        {/* ── Nhiệm vụ hôm nay ── */}
        <motion.section variants={fadeUp} className="rounded-3xl border border-white/10 bg-white/[0.04] p-2 backdrop-blur-sm">
          <div className="flex items-center justify-between px-3 pb-1 pt-2">
            <h2 className="font-grotesk text-lg font-bold text-white">Nhiệm vụ hôm nay</h2>
            <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] font-bold text-white/60">
              {priorities.filter(p => p.done).length}/{priorities.length} hoàn thành
            </span>
          </div>
          <div className="divide-y divide-white/[0.06]">
            {priorities.map(item => (
              <Link key={item.title} to={item.to} className="flex items-center gap-3 px-3 py-3 transition hover:bg-white/[0.04] active:scale-[0.99]">
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${
                  item.done ? 'border-[#CCFF00] bg-[#CCFF00] text-[#0a0f1c]' : 'border-white/20 text-[#64748b]'
                }`}>
                  {item.done ? <Check className="h-4 w-4" /> : <Circle className="h-3.5 w-3.5" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-bold text-white">{item.title}</span>
                  <span className="block truncate text-xs text-[#64748b]">{item.sub}</span>
                </span>
                {item.value && <span className="shrink-0 font-grotesk text-sm font-bold text-white/70">{item.value}</span>}
                {!item.done && (
                  <span className="shrink-0 rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] font-bold text-white/50">
                    +{item.reward}
                  </span>
                )}
                <ChevronRight className="h-4 w-4 shrink-0 text-[#475569]" />
              </Link>
            ))}
          </div>
        </motion.section>

        {/* ── Quick Log ── */}
        <motion.section variants={fadeUp}>
          <p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wide text-[#475569]">Ghi nhanh</p>
          <div className="flex gap-2">
            <Link to="/dashboard/diet"
              className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl border border-orange-500/20 bg-orange-500/[0.08] py-2.5 text-[12px] font-bold text-orange-400 transition hover:brightness-125 active:scale-[0.97]"
            >
              <Utensils className="h-3.5 w-3.5" />
              + Bữa ăn
            </Link>

            <button
              onClick={handleLogWater}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl border border-sky-500/20 bg-sky-500/[0.08] py-2.5 text-[12px] font-bold text-sky-400 transition hover:brightness-125 active:scale-[0.97]"
            >
              <Droplets className="h-3.5 w-3.5" />
              + Nước (0.25L)
            </button>

            <Link to="/dashboard/coach"
              className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl border border-violet-500/20 bg-violet-500/[0.08] py-2.5 text-[12px] font-bold text-violet-400 transition hover:brightness-125 active:scale-[0.97]"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              + Cảm nhận
            </Link>
          </div>
        </motion.section>

      </motion.div>
    </>
  );
}
