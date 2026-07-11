import { useState, useEffect, useCallback, useRef, memo } from 'react';
import {
  Play,
  X,
  Check,
  Volume2,
  VolumeX,
  Loader2,
  Dumbbell,
  Shield,
  Timer,
  Flame,
  Activity,
  Target,
  CalendarDays,
  RotateCcw,
  Video,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Moon,
  Lightbulb,
  ShieldAlert,
} from 'lucide-react';
import { useAuthContext } from '../context/AuthContext';
import { trainingService, type DailyTrainingLog, type PersonalizedWorkoutExercise } from '../services/trainingService';
import { userService, type BodyMetricPoint } from '../services/userService';
import { nutritionService, type DailyNutritionPoint } from '../services/nutritionService';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import CyberpunkWorkoutModal from './CyberpunkWorkoutModal';
import { AiUsageBadge } from './AiUsageBadge';
import { AiUpgradeModal } from './AiUpgradeModal';
import { useAiUsage } from '../hooks/useAiUsage';
import { useDashboard } from '../hooks/useDashboard';
import { Sparkles } from 'lucide-react';

interface TrainingExercise {
  id: number;
  name: string;
  sets: string;
  muscle: string;
  secondaryMuscles?: string[];   // parsed from comma-separated string
  videoUrl?: string;
  done: boolean;
  trainingPlanId?: number;
  dayNumber?: number;
  exerciseId?: number;
  targetSets?: number;
  targetReps?: number;
  restTime?: number;
  difficulty?: string;
  equipment?: string;
  exerciseType?: string;
  estimatedCalories?: number;
  imageUrl?: string;
  /** Ghi chú hướng dẫn (phase, goal, tempo). */
  notes?: string;
  /** Số tạ gợi ý, e.g. "~15kg dumbbell". Null = bodyweight. */
  recommendedWeight?: string;
  /** true = bài giữ tư thế (plank...) — targetReps là SỐ GIÂY giữ, không phải số lần. */
  timeBased?: boolean;
}

const mapPersonalizedExercise = (
  exercise: PersonalizedWorkoutExercise,
  trainingPlanId?: number,
  completedExerciseKeys = new Set<string>(),
  lang = 'en'
): TrainingExercise => {
  const targetSets = exercise.sets;
  const targetReps = exercise.reps;
  // Hiển thị tên tiếng Việt nếu ngôn ngữ là vi và có bản dịch
  const displayName = lang === 'vi' && exercise.exerciseNameVi
    ? exercise.exerciseNameVi
    : exercise.exerciseName;

  return {
    id: exercise.id,
    name: displayName,
    // Bài giữ tư thế: reps là số GIÂY — hiển thị "3x30 giây" (giữ 'x' ASCII để
    // các chỗ fallback parse split('x') vẫn hoạt động).
    sets: exercise.timeBased ? `${targetSets}x${targetReps} giây` : `${targetSets}x${targetReps}`,
    muscle: exercise.targetMuscle || exercise.exercise?.primaryMuscle || exercise.difficulty || 'Training',
    videoUrl: exercise.videoUrl || exercise.exercise?.videoUrl,
    done: completedExerciseKeys.has(`${exercise.dayNumber}:${exercise.exerciseId}`),
    trainingPlanId,
    dayNumber: exercise.dayNumber,
    exerciseId: exercise.exerciseId,
    targetSets: exercise.sets,
    targetReps: exercise.reps,
    restTime: exercise.restTime,
    difficulty: exercise.difficulty || exercise.exercise?.difficultyLevel,
    equipment: exercise.exercise?.requiredEquipment,
    exerciseType: exercise.exercise?.exerciseType,
    estimatedCalories: exercise.estimatedCalories,
    timeBased: exercise.timeBased,
    imageUrl: exercise.exercise?.imageUrl,
    secondaryMuscles: exercise.exercise?.secondaryMuscles
      ? exercise.exercise.secondaryMuscles.split(',').map(s => s.trim()).filter(Boolean)
      : undefined,
    notes: exercise.notes,
    recommendedWeight: exercise.recommendedWeight,
  };
};

const formatDuration = (seconds?: number) => {
  if (!seconds) return '60s';
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remain = seconds % 60;
  return remain ? `${minutes}m ${remain}s` : `${minutes}m`;
};

const formatDateKey = (date: Date) => date.toISOString().split('T')[0];

const formatShortDate = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getDate()}/${date.getMonth() + 1}`;
};

const sparklinePoints = (values: number[], width = 260, height = 88, pad = 10) => {
  if (!values.length) return '';
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  return values.map((value, index) => {
    const x = values.length === 1
      ? width / 2
      : pad + (index * (width - pad * 2)) / (values.length - 1);
    const y = height - pad - ((value - min) / span) * (height - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
};

const difficultyTone = (difficulty?: string) => {
  const value = (difficulty || '').toLowerCase();
  if (value.includes('hard') || value.includes('advanced')) return 'text-orange-600 bg-orange-50 border-orange-200';
  if (value.includes('medium') || value.includes('intermediate')) return 'text-blue-600 bg-blue-50 border-blue-200';
  return 'text-emerald-600 bg-emerald-50 border-emerald-200';
};

/** Convert SNAKE_CASE enum values to Title Case for display. */
const formatEnumLabel = (value?: string | null): string => {
  if (!value) return '';
  return value
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
};

/** Dịch tên nhóm cơ sang tiếng Việt */
const translateMuscle = (muscle: string): string => {
  const map: Record<string, string> = {
    'chest': 'Ngực', 'back': 'Lưng', 'shoulders': 'Vai', 'biceps': 'Tay trước (Biceps)',
    'triceps': 'Tay sau (Triceps)', 'core': 'Cơ bụng/lõi', 'quadriceps': 'Đùi trước',
    'hamstrings': 'Đùi sau', 'glutes': 'Mông', 'calves': 'Bắp chân',
    'full body': 'Toàn thân', 'obliques': 'Cơ chéo bụng', 'hip flexors': 'Cơ gấp hông',
    'lower back': 'Lưng dưới', 'upper back': 'Lưng trên', 'forearms': 'Cẳng tay',
    'rear delts': 'Vai sau', 'front deltoid': 'Vai trước', 'deltoid': 'Vai',
    'adductors': 'Cơ khép đùi', 'hip abductors': 'Cơ dạng hông', 'latissimus dorsi': 'Cơ lưng rộng',
    'thoracic spine': 'Cột sống ngực', 'mobility': 'Linh hoạt khớp',
  };
  return map[muscle.toLowerCase()] || muscle;
};

/** Dịch movement pattern sang tiếng Việt */
const translateMovement = (pattern?: string): { label: string; desc: string } => {
  const map: Record<string, { label: string; desc: string }> = {
    'PUSH':  { label: 'Đẩy',        desc: 'Vận động đẩy — kích hoạt ngực, vai, tay sau' },
    'PULL':  { label: 'Kéo',        desc: 'Vận động kéo — kích hoạt lưng, tay trước' },
    'SQUAT': { label: 'Ngồi xổm',   desc: 'Vận động squat — kích hoạt đùi, mông' },
    'HINGE': { label: 'Gập hông',   desc: 'Vận động gập hông — kích hoạt mông, đùi sau' },
    'LUNGE': { label: 'Bước chân',  desc: 'Vận động đơn chân — cân bằng & sức mạnh' },
    'CORE':  { label: 'Cơ lõi',     desc: 'Tăng cường ổn định cột sống và cơ bụng' },
    'CARDIO':{ label: 'Tim mạch',   desc: 'Tăng nhịp tim, đốt calo, sức bền' },
    'MOBILITY':{ label: 'Linh hoạt', desc: 'Cải thiện tầm vận động khớp và dẻo dai' },
    'LOWER_ACCESSORY': { label: 'Hỗ trợ chi dưới', desc: 'Tăng cường cơ vùng chân' },
  };
  const key = (pattern || '').toUpperCase();
  return map[key] || { label: formatEnumLabel(pattern), desc: '' };
};

/** Tên plan hiển thị thân thiện — ẩn tên kỹ thuật/khóa định danh "... - User {id}". */
const displayPlanName = (name?: string): string => {
  if (!name) return 'Kế hoạch tập cá nhân hóa';
  if (/neural protocol/i.test(name)) return 'Kế hoạch tập cá nhân hóa';
  const cleaned = name.replace(/\s*[-–]\s*User\s*\d+\s*$/i, '').trim();
  return cleaned || 'Kế hoạch tập cá nhân hóa';
};

/**
 * Trích YouTube video ID từ mọi dạng URL (embed / watch?v= / youtu.be).
 * Trả null nếu không phải link YouTube hợp lệ.
 */
const youtubeId = (url?: string): string | null => {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/(?:embed\/|watch\?v=)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : null;
};

/**
 * URL embed để dùng làm "ảnh động" minh họa động tác trong màn hình đang tập:
 * tự chạy, tắt tiếng, lặp lại, ẩn control — thay cho ảnh tĩnh.
 */
const loopingDemoEmbed = (url?: string): string | null => {
  const id = youtubeId(url);
  if (!id) return null;
  return `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&loop=1&playlist=${id}&controls=0&modestbranding=1&rel=0&playsinline=1&disablekb=1`;
};

/** Parse notes thô từ backend → { phase, benefit, tempo } */
const parseNotes = (notes?: string): { muscle: string; phase: string; benefit: string; tempo: string; raw: string } => {
  if (!notes) return { muscle: '', phase: '', benefit: '', tempo: '', raw: '' };
  const muscleMatch = notes.match(/^\[([^\]]+)\]/);
  const tempoMatch = notes.match(/Tempo:\s*([\S]+)/i);
  const phasePatterns = ['Foundation phase', 'Strength phase', 'Endurance phase', 'Hypertrophy phase', 'Power phase', 'Recovery phase'];
  const phase = phasePatterns.find(p => notes.includes(p)) || '';
  const noMuscle = notes.replace(/^\[[^\]]+\]\s*/, '');
  const noPhase = noMuscle.replace(phase + '.', '').replace(phase, '').trim();
  const noTempo = noPhase.replace(/Tempo:\s*[\S]+\.?/i, '').trim();
  const benefit = noTempo.replace(/^Trains\s+/i, '').replace(/\.\s*$/, '').trim();
  return {
    muscle: muscleMatch ? muscleMatch[1] : '',
    phase: phase.replace(' phase', ''),
    benefit,
    tempo: tempoMatch ? tempoMatch[1] : '',
    raw: notes,
  };
};

/** Hiển thị khi schedule rỗng — tự động thử regenerate nếu có plan ID */
function EmptySchedule({ activePlanId, onRetry, onCreatePlan }: { activePlanId?: number; onRetry: () => void; onCreatePlan: () => void }) {
  const [regenerating, setRegenerating] = useState(false);
  const [msg, setMsg] = useState('');

  const tryRegenerate = async () => {
    if (!activePlanId) { onRetry(); return; }
    setRegenerating(true);
    setMsg('Đang tạo lịch tập cá nhân...');
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('authToken') || '';
      const res = await fetch(`/api/user/training/${activePlanId}/regenerate-personalized`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data?.success) {
        setMsg('Đã tạo lịch tập! Đang tải...');
        setTimeout(onRetry, 800);
      } else {
        setMsg(data?.message || 'Không tạo được lịch. Thử lại sau.');
      }
    } catch {
      setMsg('Lỗi kết nối. Vui lòng thử lại.');
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <div className="rounded-2xl bg-white p-10 text-center shadow-[0_14px_34px_rgba(15,23,42,0.06)]">
      <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center mx-auto mb-4">
        <Dumbbell className="w-6 h-6 text-teal-600" />
      </div>
      <h3 className="font-grotesk font-bold text-slate-900 text-lg mb-2">Chưa có lịch tập</h3>
      <p className="text-slate-500 text-sm mb-6 max-w-md mx-auto">
        {activePlanId
          ? 'Plan của bạn đã được tạo nhưng lịch tập cá nhân chưa được sinh. Nhấn bên dưới để tạo.'
          : 'Bạn chưa có chương trình tập. Tạo kế hoạch AI cá nhân hóa theo mục tiêu, thể trạng & thiết bị của bạn để bắt đầu.'}
      </p>
      {msg && <p className="text-teal-600 text-xs mb-4 animate-pulse">{msg}</p>}
      <div className="flex flex-wrap gap-3 justify-center">
        {activePlanId ? (
          <button
            onClick={tryRegenerate}
            disabled={regenerating}
            className="bg-teal-600 text-white hover:bg-teal-700 transition-colors rounded-xl px-5 py-2.5 text-sm font-bold inline-flex items-center gap-2 disabled:opacity-60"
          >
            {regenerating
              ? <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Đang tạo...</>
              : <><RefreshCw className="w-4 h-4" />Tạo lịch tập ngay</>
            }
          </button>
        ) : (
          <button onClick={onCreatePlan} className="bg-teal-600 text-white hover:bg-teal-700 transition-colors rounded-xl px-5 py-2.5 text-sm font-bold inline-flex items-center gap-2">
            <Sparkles className="w-4 h-4" />Tạo kế hoạch AI
          </button>
        )}
        <button onClick={onRetry} className="px-5 py-2.5 text-sm border border-slate-200 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-50 inline-flex items-center gap-2 transition-colors">
          <RotateCcw className="w-4 h-4" />Tải lại
        </button>
      </div>
    </div>
  );
}

const planDurationDays = (plan: any, exercises: TrainingExercise[]) => {
  if (plan?.startDate && plan?.endDate) {
    const start = new Date(plan.startDate).getTime();
    const end = new Date(plan.endDate).getTime();
    if (!Number.isNaN(start) && !Number.isNaN(end) && end >= start) {
      return Math.floor((end - start) / 86400000) + 1;
    }
  }
  if (plan?.totalWeeks) return Number(plan.totalWeeks) * 7;
  return Math.max(...exercises.map(ex => ex.dayNumber || 1), 1);
};

interface SessionData {
  reps: number;
  caloriesBurned: number;
  avgRepTime: number;
}

function TrainingView() {
  const { user } = useAuthContext();
  const { i18n } = useTranslation();

  const [cameraActive, setCameraActive] = useState(false);
  const [sessionData, setSessionData] = useState<SessionData>({ reps: 0, caloriesBurned: 0, avgRepTime: 0 });
  const [scheduleExercises, setScheduleExercises] = useState<TrainingExercise[]>([]);
  const [selectedDay, setSelectedDay] = useState(1);
  const [loading, setLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [activeExercise, setActiveExercise] = useState<TrainingExercise | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [currentSet, setCurrentSet] = useState(0);
  const [sessionTime, setSessionTime] = useState(0);
  // Resting state — countdown sau mỗi set
  const [isResting, setIsResting] = useState(false);
  const [restCountdown, setRestCountdown] = useState(0);
  // Rep input per current set
  const [currentRepInput, setCurrentRepInput] = useState(0);
  // Đồng hồ đếm ngược cho bài giữ tư thế (plank...): đang giữ + số giây còn lại
  const [isHolding, setIsHolding] = useState(false);
  const [holdCountdown, setHoldCountdown] = useState(0);
  const [activePlan, setActivePlan] = useState<any>(null);
  const [generatingNextWeek, setGeneratingNextWeek] = useState(false);
  const [adaptingNextWeek, setAdaptingNextWeek] = useState(false);
  // Check-in sau buổi tập: độ mệt mỏi (1-5), độ khó RPE (1-10), giấc ngủ (giờ)
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [savingCheckIn, setSavingCheckIn] = useState(false);
  const [checkIn, setCheckIn] = useState<{ fatigue: number; rpe: number; sleep: string }>({ fatigue: 0, rpe: 0, sleep: '' });
  const [checkInError, setCheckInError] = useState<string | null>(null);
  const [adaptationNote, setAdaptationNote] = useState<string | null>(null);
  // Modal tạo kế hoạch AI (gộp từ tab "Kế Hoạch Tập" cũ)
  const [aiPlanModalOpen, setAiPlanModalOpen] = useState(false);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const { usage, packages, refresh: refreshUsage } = useAiUsage(user?.id ?? null);
  const { data: dashboardData } = useDashboard();
  // Thông tin cá nhân hóa hiển thị sau khi tạo plan (kiến thức + cảnh báo y khoa)
  const [planInsight, setPlanInsight] = useState<{ rationale: string; disclaimer: string; riskTier: string; notes: string[] } | null>(null);
  const [bodyMetrics, setBodyMetrics] = useState<BodyMetricPoint[]>([]);
  const [dailyNutrition, setDailyNutrition] = useState<DailyNutritionPoint[]>([]);
  // ── Tích luỹ toàn buổi (cộng dồn qua từng bài) + báo cáo tổng buổi ──
  const [sessionTotals, setSessionTotals] = useState<{ time: number; calories: number; reps: number; exercises: number }>({ time: 0, calories: 0, reps: 0, exercises: 0 });
  const [showSessionReport, setShowSessionReport] = useState(false);
  // Overlay chuyển bài nhẹ giữa các bài trong buổi
  const [transition, setTransition] = useState<{ type: 'next' | 'final'; nextName?: string } | null>(null);
  // Chống kích hoạt trùng khi bài vừa hoàn tất set cuối
  const completingRef = useRef(false);

  const loadTrainingSchedule = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const trainings = await trainingService.getUserTraining(user.id);
      const list = Array.isArray(trainings) ? trainings : [];
      // Ưu tiên kế hoạch active MỚI NHẤT (id lớn nhất) — khi tạo lại kế hoạch,
      // plan mới luôn thắng, đồng bộ với dashboard (findTop...OrderByUtIdDesc).
      const byNewest = (a: any, b: any) => (Number(b?.id) || 0) - (Number(a?.id) || 0);
      const activeTraining = [...list]
        .filter((t: any) => t.status === 'ACTIVE' || t.status === 'active' || t.status === 'IN_PROGRESS')
        .sort(byNewest)[0] || [...list].sort(byNewest)[0];
      setActivePlan(activeTraining);
      const planId = activeTraining?.trainingPlanId;
      const startDate = activeTraining?.startDate;
      const dayNumber = startDate
        ? Math.max(1, Math.floor((Date.now() - new Date(startDate).getTime()) / 86400000) + 1)
        : 1;

      if (!planId) {
        setScheduleExercises([]);
        setActiveExercise(null);
        return;
      }

      const [schedule, logs] = await Promise.all([
        trainingService.getPersonalizedSchedule(user.id),
        trainingService.getDailyLogsByPlan(Number(planId), user.id),
      ]);
      const completedExerciseKeys = new Set(
        logs
          .filter((log: DailyTrainingLog) => log.status === 'COMPLETED' || log.status === 'completed')
          .map((log: DailyTrainingLog) => `${log.dayNumber}:${log.exerciseId}`)
      );

      const source = schedule.length
        ? schedule
        : await trainingService.getTodayPersonalizedWorkout(dayNumber, user.id);
      const mapped = source
        .map(exercise => mapPersonalizedExercise(exercise, Number(planId), completedExerciseKeys, i18n.language))
        .sort((a, b) => (a.dayNumber || 0) - (b.dayNumber || 0) || a.id - b.id);

      setScheduleExercises(mapped);
      setSelectedDay(dayNumber);
      // Kế hoạch lặp theo chu kỳ: nếu hôm nay vượt số ngày có bài, ánh xạ về
      // ngày tương ứng trong chu kỳ (vd ngày 52 → ngày 22 khi plan có 30 ngày).
      const maxPlanDay = mapped.reduce((m, ex) => Math.max(m, ex.dayNumber || 1), 1);
      const contentDay = maxPlanDay > 0 ? ((dayNumber - 1) % maxPlanDay) + 1 : dayNumber;
      const dayExercises = mapped.filter(ex => ex.dayNumber === contentDay);
      setActiveExercise(dayExercises.find(ex => !ex.done) || dayExercises[0] || mapped.find(ex => !ex.done) || mapped[0] || null);
    } catch (error) {
      console.warn('[TrainingView] Failed to load training schedule:', error);
      setScheduleExercises([]);
      setActiveExercise(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadTrainingSchedule();
  }, [loadTrainingSchedule]);

  useEffect(() => {
    if (!user?.id) return;
    let alive = true;
    const loadBodyReport = async () => {
      const to = new Date();
      const from = new Date();
      from.setDate(to.getDate() - 6);
      const [metrics, nutrition] = await Promise.all([
        userService.getBodyMetricHistory(),
        nutritionService.getDailyNutrition(user.id, formatDateKey(from), formatDateKey(to)),
      ]);
      if (!alive) return;
      setBodyMetrics(metrics);
      setDailyNutrition(nutrition);
    };
    loadBodyReport();
    const onBodyMetricUpdated = () => loadBodyReport();
    window.addEventListener('body-metric-updated', onBodyMetricUpdated);
    return () => {
      alive = false;
      window.removeEventListener('body-metric-updated', onBodyMetricUpdated);
    };
  }, [user?.id]);

  // Sau khi tạo kế hoạch AI mới → đóng modal, sinh personalization nếu cần, tải lại lịch
  const handleAiPlanSuccess = async (data: any) => {
    setAiPlanModalOpen(false);
    // Bắt thông tin cá nhân hóa từ phản hồi để hiển thị "kiến thức" + cảnh báo y khoa
    const notes: string[] = Array.isArray(data?.programTemplate?.adaptation_notes)
      ? data.programTemplate.adaptation_notes : [];
    setPlanInsight({
      rationale: data?.prescriptionRationale || '',
      disclaimer: data?.requiresMedicalClearance ? (data?.medicalDisclaimer || '') : '',
      riskTier: data?.riskTier || '',
      notes,
    });
    if (data?.userTrainingId && !data?.personalized) {
      try {
        const token = localStorage.getItem('token') || localStorage.getItem('authToken') || '';
        await fetch(`/api/user/training/${data.userTrainingId}/regenerate-personalized`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        });
      } catch { /* loadTrainingSchedule sẽ tự retry */ }
    }
    await loadTrainingSchedule();
  };

  useEffect(() => {
    if (!cameraActive) return;
    const timerInterval = setInterval(() => setSessionTime(t => t + 1), 1000);
    return () => clearInterval(timerInterval);
  }, [cameraActive]);

  // ── Audio cue: beep khi xong set / đếm ngược / hết giờ nghỉ ──
  // Web Audio API (không cần file âm thanh), tôn trọng soundEnabled.
  const audioCtxRef = useRef<AudioContext | null>(null);
  const playCue = useCallback((kind: 'set' | 'tick' | 'rest-done') => {
    if (!soundEnabled) return;
    try {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return;
      if (!audioCtxRef.current) audioCtxRef.current = new Ctx();
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') void ctx.resume();
      const beep = (freq: number, at: number, dur: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        const t0 = ctx.currentTime + at;
        gain.gain.setValueAtTime(0.0001, t0);
        gain.gain.exponentialRampToValueAtTime(0.3, t0 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(t0); osc.stop(t0 + dur + 0.02);
      };
      if (kind === 'set') beep(660, 0, 0.18);                         // xong set: 1 beep
      else if (kind === 'tick') beep(440, 0, 0.08);                   // đếm ngược: tick nhẹ
      else { beep(523, 0, 0.12); beep(659, 0.14, 0.12); beep(784, 0.28, 0.24); } // hết nghỉ: 3 nốt lên
    } catch { /* ignore */ }
  }, [soundEnabled]);

  // Beep "hết giờ nghỉ" đúng lúc rest kết thúc (về 0 hoặc bấm bỏ qua)
  const wasRestingRef = useRef(false);
  useEffect(() => {
    if (wasRestingRef.current && !isResting) playCue('rest-done');
    wasRestingRef.current = isResting;
  }, [isResting, playCue]);

  // Rest countdown timer
  useEffect(() => {
    if (!isResting || restCountdown <= 0) return;
    if (restCountdown <= 3) playCue('tick'); // tick 3 giây cuối
    const t = setTimeout(() => {
      setRestCountdown(c => {
        if (c <= 1) { setIsResting(false); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearTimeout(t);
  }, [isResting, restCountdown, playCue]);

  // Hold countdown timer — bài giữ tư thế: đếm ngược số giây mục tiêu,
  // hết giờ thì beep và tự điền số giây đã giữ vào input của hiệp.
  useEffect(() => {
    if (!isHolding || holdCountdown <= 0) return;
    if (holdCountdown <= 3) playCue('tick');
    const t = setTimeout(() => {
      setHoldCountdown(c => {
        if (c <= 1) {
          setIsHolding(false);
          playCue('rest-done');
          setCurrentRepInput(activeExercise?.targetReps || 0);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearTimeout(t);
  }, [isHolding, holdCountdown, playCue, activeExercise]);

  const startSession = (ex: TrainingExercise, opts?: { keepTotals?: boolean }) => {
    setActiveExercise(ex);
    setCameraActive(true);
    setSessionData({ reps: 0, caloriesBurned: 0, avgRepTime: 0 });
    setSaveError(null);
    setCurrentSet(0);
    setSessionTime(0);
    setIsResting(false);
    setRestCountdown(0);
    setCurrentRepInput(ex.targetReps || 0);
    setIsHolding(false);
    setHoldCountdown(0);
    setTransition(null);
    completingRef.current = false;
    // Bắt đầu buổi mới (không phải auto-advance) → reset tích luỹ + ẩn báo cáo tổng
    if (!opts?.keepTotals) {
      setSessionTotals({ time: 0, calories: 0, reps: 0, exercises: 0 });
      setShowSessionReport(false);
    }
  };

  /**
   * Thoát session hoàn toàn — KHÔNG lưu, KHÔNG mark done.
   * Dùng cho nút X (thoát khi chưa làm gì).
   */
  const exitSessionOnly = () => {
    setCameraActive(false);
    setIsResting(false);
    setRestCountdown(0);
  };

  /**
   * Lưu tiến độ + đóng — chỉ gọi khi user đã hoàn thành ≥ 1 set.
   * Mark done nếu đã xong tất cả set (allSetsDone).
   */
  const endSession = async (markDone = false) => {
    setCameraActive(false);
    setIsResting(false);
    setRestCountdown(0);

    // Không lưu gì nếu chưa làm set nào
    if (currentSet === 0) return;
    if (!user || !activeExercise?.trainingPlanId || !activeExercise.dayNumber || !activeExercise.exerciseId) return;

    // Hoàn thành bài → hỏi check-in (mệt mỏi/RPE/giấc ngủ) trước khi lưu.
    if (markDone) {
      setCheckIn({ fatigue: 0, rpe: 0, sleep: '' });
      setCheckInError(null);
      setShowCheckIn(true);
      return;
    }

    // Dừng giữa chừng (IN_PROGRESS) → lưu luôn, không cần check-in.
    await persistTrainingLog(false);
  };

  /**
   * Lưu training log lên backend. `extra` chứa dữ liệu check-in (fatigue/RPE/sleep)
   * khi user hoàn thành bài tập.
   */
  const persistTrainingLog = async (
    markDone: boolean,
    extra?: { fatigueLevel?: number; perceivedDifficulty?: number; sleepHours?: number }
  ): Promise<{ success: boolean; adaptationNote?: string | null; error?: string; code?: string }> => {
    if (!user || !activeExercise?.trainingPlanId || !activeExercise.dayNumber || !activeExercise.exerciseId)
      return { success: false };

    const response = await trainingService.saveTrainingLog(user.id, {
      trainingPlanId: activeExercise.trainingPlanId,
      dayNumber: activeExercise.dayNumber,
      exerciseId: activeExercise.exerciseId,
      status: markDone ? 'COMPLETED' : 'IN_PROGRESS',
      analysisData: {
        repsCompleted: sessionData.reps,
        setsCompleted: currentSet,
        actualDurationMinutes: Math.max(1, Math.round(sessionTime / 60)),
        caloriesBurned: (() => {
          const base = activeExercise.estimatedCalories || 0;
          const target = activeExercise.targetSets || parseInt(activeExercise.sets?.split('x')[0] || '3') || 3;
          return base > 0 ? Math.max(1, Math.round(base * Math.min(1, currentSet / target))) : 0;
        })(),
        ...(extra?.fatigueLevel ? { fatigueLevel: extra.fatigueLevel } : {}),
        ...(extra?.perceivedDifficulty ? { perceivedDifficulty: extra.perceivedDifficulty } : {}),
        ...(extra?.sleepHours != null ? { sleepHours: extra.sleepHours } : {}),
      },
    });

    if (!response.success) {
      const msg = response.error?.message || 'Không lưu được kết quả tập luyện.';
      setSaveError(msg);
      return { success: false, adaptationNote: null, error: msg, code: response.error?.code };
    }

    if (markDone) {
      setScheduleExercises(prev =>
        prev.map(ex => ex.id === activeExercise.id ? { ...ex, done: true } : ex)
      );
    }

    window.dispatchEvent(new CustomEvent('workout-completed', {
      detail: {
        exerciseId: activeExercise.exerciseId,
        setsCompleted: currentSet,
        repsCompleted: sessionData.reps,
        caloriesBurned: activeExercise.estimatedCalories || 0,
        durationMinutes: Math.max(1, Math.round(sessionTime / 60)),
        markDone,
      }
    }));
    return { success: true, adaptationNote: response.data?.adaptationNote ?? null };
  };

  /** Xác nhận check-in → lưu kèm dữ liệu phục hồi. */
  const submitCheckIn = async () => {
    setCheckInError(null);
    setSavingCheckIn(true);
    const sleepNum = parseFloat(checkIn.sleep);
    const result = await persistTrainingLog(true, {
      fatigueLevel: checkIn.fatigue || undefined,
      perceivedDifficulty: checkIn.rpe || undefined,
      sleepHours: !isNaN(sleepNum) && sleepNum > 0 ? sleepNum : undefined,
    });
    setSavingCheckIn(false);
    if (result.success) {
      setAdaptationNote(result.adaptationNote ?? null);
      setShowCheckIn(false);
      setShowSessionReport(false);
      setCameraActive(false);
      completingRef.current = false;
      loadTrainingSchedule();
    } else {
      setCheckInError(result.error || 'Không thể lưu. Vui lòng thử lại.');
    }
  };

  /** Đóng báo cáo tổng buổi — lưu bài cuối (nếu chưa) rồi về queue. */
  const closeSessionReport = async () => {
    setSavingCheckIn(true);
    const result = await persistTrainingLog(true);
    setSavingCheckIn(false);
    if (result.success) setAdaptationNote(result.adaptationNote ?? null);
    else toast(result.error || 'Chưa lưu được kết quả buổi tập.', { icon: '⚠️' });
    setShowSessionReport(false);
    setCameraActive(false);
    completingRef.current = false;
    loadTrainingSchedule();
  };

  /** Từ báo cáo tổng → mở check-in phục hồi (RPE/mệt mỏi/giấc ngủ) cho AI thích ứng. */
  const openSessionCheckIn = () => {
    setShowSessionReport(false);
    setCameraActive(false);
    setCheckIn({ fatigue: 0, rpe: 0, sleep: '' });
    setCheckInError(null);
    setShowCheckIn(true);
  };

  /**
   * Bài vừa xong set cuối → cộng dồn vào tổng buổi. Nếu còn bài trong ngày:
   * lưu bài (COMPLETED) + toast nhẹ + tự chuyển bài. Nếu là bài cuối: hiện báo cáo tổng buổi.
   */
  const handleExerciseComplete = async () => {
    if (!activeExercise) return;
    const thisCalories = activeExercise.estimatedCalories && activeExercise.estimatedCalories > 0
      ? Math.max(1, Math.round(activeExercise.estimatedCalories))
      : 0;
    const thisTime = sessionTime;
    const thisReps = sessionData.reps;
    const dayNum = activeExercise.dayNumber || 1;
    const dayExercises = scheduleExercises.filter(ex => (ex.dayNumber || 1) === dayNum);
    const nextEx = dayExercises.find(ex => ex.id !== activeExercise.id && !ex.done) || null;

    // Cộng dồn hiển thị (áp dụng cho cả bài cuối)
    setSessionTotals(t => ({
      time: t.time + thisTime,
      calories: t.calories + thisCalories,
      reps: t.reps + thisReps,
      exercises: t.exercises + 1,
    }));
    setIsResting(false);
    setRestCountdown(0);
    setTransition({ type: nextEx ? 'next' : 'final', nextName: nextEx?.name });

    if (nextEx) {
      // Lưu bài hiện tại rồi tự chuyển sang bài kế. Nếu lưu lỗi (vd hết lượt log/ngày)
      // vẫn chuyển bài để không kẹt buổi tập — chỉ cảnh báo nhẹ.
      const result = await persistTrainingLog(true);
      playCue('rest-done');
      if (result.success) {
        toast.success(`Hoàn thành! Chuyển sang: ${nextEx.name}`);
      } else {
        // Lấy message thật từ backend (vd hết lượt log/ngày) thay vì biến state stale
        const reason = result.code === 'QUOTA_EXCEEDED'
          ? (result.error || 'Hôm nay bạn đã hết lượt ghi log tập luyện.')
          : (result.error || 'Chưa lưu được kết quả bài này.');
        toast(`${reason} Vẫn chuyển sang bài tiếp — tiến độ buổi vẫn được cộng dồn.`, { icon: '⚠️' });
      }
      window.setTimeout(() => startSession(nextEx, { keepTotals: true }), 750);
    } else {
      // Bài cuối buổi → báo cáo tổng (lưu bài cuối khi đóng/đánh giá để tránh lưu trùng)
      playCue('rest-done');
      setTransition(null);
      setShowSessionReport(true);
      setCameraActive(false);
    }
  };

  // Khi set cuối của bài vừa xong → kích hoạt cộng dồn + chuyển bài (một lần).
  useEffect(() => {
    if (!cameraActive || !activeExercise) return;
    const targetSets = activeExercise.targetSets || parseInt(activeExercise.sets?.split('x')[0] || '3') || 3;
    if (currentSet < targetSets) return;
    if (completingRef.current) return;
    completingRef.current = true;
    void handleExerciseComplete();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSet, cameraActive, activeExercise]);

  /**
   * Làm lại bài đã hoàn thành — reset done state và mở lại session.
   */
  const replayExercise = (ex: TrainingExercise) => {
    setScheduleExercises(prev =>
      prev.map(e => e.id === ex.id ? { ...e, done: false } : e)
    );
    startSession({ ...ex, done: false });
  };

  const advanceSet = (repsThisSet: number, cue: 'set' | 'skip' = 'set') => {
    if (!activeExercise) return;
    if (cue === 'set') playCue('set');
    const targetSets = activeExercise.targetSets || 1;
    const nextSet = Math.min(targetSets, currentSet + 1);
    setCurrentSet(nextSet);
    setSessionData(prev => ({
      ...prev,
      reps: prev.reps + repsThisSet,
      avgRepTime: prev.reps + repsThisSet > 0 ? Math.round(sessionTime / Math.max(1, prev.reps + repsThisSet)) : 0,
    }));
    // Start rest timer if not last set
    if (nextSet < targetSets) {
      const restSec = activeExercise.restTime || 60;
      setRestCountdown(restSec);
      setIsResting(true);
    }
    // Reset rep input to target for next set
    setCurrentRepInput(activeExercise.targetReps || 0);
  };

  const completeSet = () => {
    if (!activeExercise) return;
    const repsThisSet = currentRepInput || activeExercise.targetReps || 0;
    advanceSet(repsThisSet, 'set');
  };

  const skipCurrentSet = () => {
    advanceSet(0, 'skip');
  };

  const requestWorkoutFullscreen = async () => {
    const target = document.getElementById('active-workout-stage');
    if (!target || !document.fullscreenEnabled) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await target.requestFullscreen();
      }
    } catch {
      toast.error('Không thể mở toàn màn hình trên thiết bị này');
    }
  };

  const generateNextWeek = async () => {
    if (!activePlan?.id) {
      toast.error('Không tìm thấy chương trình tập để sinh tuần tiếp theo');
      return;
    }
    setGeneratingNextWeek(true);
    try {
      const response = await trainingService.generateNextWorkoutWeek(Number(activePlan.id), user!.id);
      const msg = (response as any)?.message || response.error?.message;
      if (!response.success) {
        // Hết credit → mở modal nâng cấp
        if ((response as any)?.status === 429 || msg?.includes('hết lượt')) {
          setUpgradeModalOpen(true);
        } else {
          toast.error(msg || 'Không thể sinh tuần tiếp theo. Vui lòng thử lại.');
        }
        return;
      }
      toast.success('Đã sinh lịch tập tuần mới!');
      refreshUsage();
      await loadTrainingSchedule();
    } catch (error: any) {
      const errMsg = error?.response?.data?.message || error?.message || 'Không thể sinh tuần tiếp theo';
      toast.error(errMsg);
    } finally {
      setGeneratingNextWeek(false);
    }
  };

  const autoRegulateNextWeek = async () => {
    if (!user || !activePlan?.id) {
      toast.error('Không tìm thấy chương trình tập để AI thích ứng');
      return;
    }
    setAdaptingNextWeek(true);
    try {
      const response = await trainingService.autoRegulateNextWorkoutWeek(user.id, Number(activePlan.id));
      const msg = (response as any)?.message || response.error?.message;
      if (!response.success) {
        if ((response as any)?.status === 429 || msg?.includes('hết lượt')) {
          setUpgradeModalOpen(true);
        } else {
          toast.error(msg || 'AI thích ứng thất bại. Vui lòng thử lại.');
        }
        return;
      }
      // Trích xuất ghi chú thích ứng từ phản hồi AI để hiển thị banner
      const responseData = (response as any)?.data ?? {};
      const adaptation = responseData?.adaptation ?? {};
      const adaptNote = adaptation?.adaptation_summary
        || adaptation?.changes_made
        || adaptation?.rationale
        || adaptation?.reasoning
        || 'AI đã phân tích hiệu suất tuần vừa rồi và điều chỉnh cường độ, khối lượng cho tuần tới.';
      const noteText = typeof adaptNote === 'string'
        ? adaptNote
        : Array.isArray(adaptNote) ? adaptNote.join(' · ') : JSON.stringify(adaptNote);
      setAdaptationNote(noteText);
      refreshUsage();
      await loadTrainingSchedule();
    } catch (error: any) {
      const errMsg = error?.response?.data?.message || error?.message || 'AI thích ứng thất bại';
      toast.error(errMsg);
    } finally {
      setAdaptingNextWeek(false);
    }
  };

  if ((cameraActive || showSessionReport) && activeExercise) {
    const formatTime = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
    const targetSets   = activeExercise.targetSets || parseInt(activeExercise.sets.split('x')[0]) || 3;
    const targetReps   = activeExercise.targetReps || parseInt(activeExercise.sets.split('x')[1]) || 10;
    // Bài giữ tư thế: targetReps = SỐ GIÂY, UI dùng đồng hồ thay vì đếm rep
    const isHold       = !!activeExercise.timeBased;
    const allSetsDone  = currentSet >= targetSets;
    const restPct      = activeExercise.restTime ? Math.round((restCountdown / activeExercise.restTime) * 100) : 0;
    const exerciseName = i18n.language === 'vi' ? (activeExercise as any).nameVi || activeExercise.name : activeExercise.name;
    const parsed       = parseNotes(activeExercise.notes);
    const movement     = translateMovement(activeExercise.exerciseType);
    const allMuscles   = [activeExercise.muscle, ...(activeExercise.secondaryMuscles || [])].filter(Boolean);
    const activeDayExercises = scheduleExercises.filter(ex => (ex.dayNumber || 1) === (activeExercise.dayNumber || 1));
    const completedInDay = activeDayExercises.filter(ex => ex.done).length + (allSetsDone && !activeExercise.done ? 1 : 0);
    const exerciseNumber = Math.max(1, activeDayExercises.findIndex(ex => ex.id === activeExercise.id) + 1);
    const sessionCalories = (() => {
      const base = activeExercise.estimatedCalories || 0;
      return base > 0 ? Math.max(1, Math.round(base * Math.min(1, currentSet / targetSets))) : 0;
    })();
    const setProgress = Math.round((currentSet / Math.max(1, targetSets)) * 100);
    const reportScore = Math.min(100, Math.max(72, Math.round(78 + setProgress / 5)));
    const reportStreak = dashboardData?.userSummary?.streakDays ?? 0;
    // Cộng dồn toàn buổi: tổng tích luỹ + phần đang tập (khi chưa kết thúc bài)
    const runningTime = sessionTotals.time + (transition ? 0 : sessionTime);
    const runningCalories = sessionTotals.calories + (transition ? 0 : sessionCalories);

    if (showSessionReport) {
      return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#f7faf8] animate-fade-in dark:bg-[#080b10]">
          <div className="mx-auto flex min-h-full w-full max-w-[430px] lg:max-w-3xl flex-col px-4 pb-6 pt-4">
            <div className="mb-4 flex items-center justify-between">
              <button
                onClick={closeSessionReport}
                disabled={savingCheckIn}
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm dark:border-white/10 dark:bg-[#121821] dark:text-slate-100"
                title="Lưu và đóng báo cáo"
              >
                {savingCheckIn ? <Loader2 className="h-5 w-5 animate-spin" /> : <X className="h-5 w-5" />}
              </button>
              <div className="text-center">
                <h2 className="font-grotesk text-lg font-bold text-slate-950">Hoàn thành buổi tập</h2>
                <p className="mt-0.5 text-xs font-medium text-slate-600">{activePlan?.name ? displayPlanName(activePlan.name) : 'Kế hoạch tập cá nhân'}</p>
              </div>
              <div className="h-11 w-11" />
            </div>

            <div className="relative overflow-hidden rounded-[22px] border border-teal-100 bg-white dark:border-teal-400/20 dark:bg-[#121821]">
              <div className="relative h-64 overflow-hidden bg-slate-100 dark:bg-[#0d1118]">
                {activeExercise.imageUrl ? (
                  <img src={activeExercise.imageUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,#ccfbf1,#fff7ed)]">
                    <Dumbbell className="h-16 w-16 text-teal-700" />
                  </div>
                )}
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.22)_44%,rgba(255,255,255,0.96)_100%)] dark:bg-[linear-gradient(180deg,rgba(2,6,23,0.05)_0%,rgba(2,6,23,0.16)_44%,rgba(2,6,23,0.94)_100%)]" />
                {Array.from({ length: 16 }).map((_, index) => (
                  <span
                    key={index}
                    className={`absolute h-2 w-2 rounded-[2px] ${index % 3 === 0 ? 'bg-orange-400' : index % 3 === 1 ? 'bg-teal-500' : 'bg-slate-300'}`}
                    style={{
                      left: `${8 + (index * 17) % 82}%`,
                      top: `${14 + (index * 23) % 46}%`,
                      transform: `rotate(${index * 21}deg)`,
                    }}
                  />
                ))}
              </div>

              <div className="relative -mt-16 px-4 pb-4">
                <div className="rounded-[20px] border border-white/70 bg-white/82 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.12)] backdrop-blur-md dark:border-white/10 dark:bg-[#121821]/90">
                  <div className="flex items-center gap-3">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-700 shadow-sm">
                      <Check className="h-7 w-7 stroke-[3]" />
                    </div>
                    <div>
                      <h3 className="font-grotesk text-xl font-bold leading-tight text-slate-950">Bạn đã hoàn thành buổi tập!</h3>
                      <p className="mt-1 text-sm text-slate-600">Tổng kết {sessionTotals.exercises} bài trong buổi hôm nay.</p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-4 divide-x divide-slate-100 rounded-2xl border border-slate-100 bg-white dark:divide-white/10 dark:border-white/10 dark:bg-[#0d1118]">
                    {[
                      { Icon: Timer, label: 'Thời gian', value: formatTime(sessionTotals.time), sub: 'phút', tone: 'text-teal-700' },
                      { Icon: Flame, label: 'Calories', value: sessionTotals.calories, sub: 'kcal', tone: 'text-orange-600' },
                      { Icon: Dumbbell, label: 'Bài tập', value: `${sessionTotals.exercises}/${activeDayExercises.length}`, sub: 'bài', tone: 'text-teal-700' },
                      { Icon: Activity, label: 'Tổng rep', value: sessionTotals.reps, sub: 'lần', tone: 'text-blue-600' },
                    ].map(({ Icon, label, value, sub, tone }) => (
                      <div key={label} className="px-2 py-3 text-center">
                        <Icon className={`mx-auto mb-1 h-4 w-4 ${tone}`} />
                        <p className="text-[10px] font-medium text-slate-600">{label}</p>
                        <p className={`mt-1 font-grotesk text-lg font-bold ${tone}`}>{value}</p>
                        <p className="text-[10px] text-slate-600">{sub}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <section className="mt-4 rounded-[20px] border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#121821]">
              <h3 className="font-grotesk text-base font-bold text-slate-950">Báo cáo tuần đã cập nhật</h3>
              <div className="mt-3 grid grid-cols-2 divide-x divide-slate-100 rounded-2xl border border-slate-100 dark:divide-white/10 dark:border-white/10">
                <div className="p-4">
                  <p className="text-xs font-semibold text-slate-700">Điểm sức khỏe</p>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-teal-50">
                      <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 80 80">
                        <circle cx="40" cy="40" r="34" fill="none" stroke="#d1fae5" strokeWidth="8" />
                        <circle cx="40" cy="40" r="34" fill="none" stroke="#0f766e" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 34}`} strokeDashoffset={`${2 * Math.PI * 34 * (1 - reportScore / 100)}`} />
                      </svg>
                      <span className="font-grotesk text-2xl font-bold text-slate-950">{reportScore}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-slate-600">Tăng từ {Math.max(0, reportScore - 2)} → {reportScore}</p>
                      <p className="mt-1 font-grotesk text-lg font-bold text-teal-700">Rất tốt</p>
                      <p className="text-xs text-slate-600">so với tuần trước</p>
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold text-slate-700">Chuỗi duy trì</p>
                      <p className="mt-2 font-grotesk text-2xl font-bold text-slate-950">{reportStreak || 1} ngày</p>
                      <p className="text-xs font-semibold text-teal-700">+1 ngày</p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
                      <Flame className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="mt-4 flex gap-1">
                    {Array.from({ length: 14 }).map((_, index) => (
                      <div key={index} className={`h-2 flex-1 rounded-full ${index < Math.min(14, reportStreak || 1) ? 'bg-teal-600' : 'bg-slate-200'}`} />
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="mt-4">
              <p className="mb-2 text-sm font-bold text-slate-900">Bạn nhận được</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { Icon: Flame, value: '+1 ngày', label: 'duy trì', tone: 'text-orange-600 bg-orange-50 border-orange-100' },
                  { Icon: Flame, value: `+${sessionTotals.calories}`, label: 'kcal', tone: 'text-orange-600 bg-orange-50 border-orange-100' },
                  { Icon: Sparkles, value: '+25', label: 'điểm', tone: 'text-amber-600 bg-amber-50 border-amber-100' },
                ].map(({ Icon, value, label, tone }) => (
                  <div key={label} className={`rounded-2xl border p-3 text-center ${tone}`}>
                    <Icon className="mx-auto mb-1 h-5 w-5" />
                    <p className="font-grotesk text-lg font-bold">{value}</p>
                    <p className="text-xs font-medium text-slate-700">{label}</p>
                  </div>
                ))}
              </div>
            </section>

            <div className="mt-auto space-y-3 pt-5">
              <button
                onClick={openSessionCheckIn}
                disabled={savingCheckIn}
                className="flex min-h-13 w-full items-center justify-center gap-2 rounded-2xl bg-teal-700 px-5 py-4 font-grotesk text-base font-bold text-white transition hover:bg-teal-800 disabled:opacity-60"
              >
                Lưu & đánh giá phục hồi
                <ChevronRight className="h-5 w-5" />
              </button>
              <button
                onClick={closeSessionReport}
                disabled={savingCheckIn}
                className="min-h-12 w-full rounded-2xl border border-teal-600 bg-white px-5 py-3 font-grotesk text-sm font-bold text-teal-700 transition hover:bg-teal-50 disabled:opacity-60"
              >
                {savingCheckIn ? 'Đang lưu...' : 'Bỏ qua đánh giá & lưu buổi'}
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#f7faf8] animate-fade-in dark:bg-[#080b10]">
        {/* Overlay chuyển bài nhẹ giữa các bài trong buổi */}
        {transition && (
          <div className="fixed inset-0 z-[55] flex items-center justify-center bg-slate-900/45 backdrop-blur-sm animate-fade-in">
            <div className="mx-4 w-full max-w-xs rounded-3xl border border-teal-100 bg-white p-6 text-center shadow-2xl dark:border-teal-400/20 dark:bg-[#121821]">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-teal-50 text-teal-700">
                <Check className="h-7 w-7 stroke-[3]" />
              </div>
              <h3 className="font-grotesk text-lg font-bold text-slate-950">Hoàn thành bài tập!</h3>
              <p className="mt-1 text-sm text-slate-600">
                {transition.type === 'next' ? `Chuyển sang: ${transition.nextName}` : 'Đang tổng kết buổi tập…'}
              </p>
              <div className="mt-4 flex items-center justify-center gap-4 text-sm font-bold">
                <span className="inline-flex items-center gap-1 text-teal-700"><Timer className="h-4 w-4" />{formatTime(sessionTotals.time)}</span>
                <span className="inline-flex items-center gap-1 text-orange-600"><Flame className="h-4 w-4" />{sessionTotals.calories} kcal</span>
              </div>
            </div>
          </div>
        )}
        <div className="mx-auto flex min-h-full w-full max-w-[430px] lg:max-w-3xl flex-col px-4 pb-5 pt-4">
          <div className="mb-4 grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3">
            <button
              onClick={exitSessionOnly}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm dark:border-white/10 dark:bg-[#121821] dark:text-slate-100"
              title="Thoát bài tập"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0 text-center">
              <h2 className="truncate font-grotesk text-lg font-bold text-slate-950">Đang tập</h2>
              <p className="truncate text-xs font-medium text-slate-600">
                Buổi sáng · {activePlan?.name ? displayPlanName(activePlan.name) : 'Kế hoạch tập cá nhân'}
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-2xl border border-teal-100 bg-white px-3 py-2 text-teal-700 shadow-sm dark:border-teal-400/20 dark:bg-[#121821] dark:text-teal-300">
              <Timer className="h-4 w-4" />
              <span className="font-grotesk text-sm font-bold tabular-nums">{formatTime(sessionTime)}</span>
            </div>
          </div>

          <div id="active-workout-stage" className="relative overflow-hidden rounded-[22px] border border-slate-200 bg-slate-900 shadow-[0_16px_40px_rgba(15,23,42,0.18)]">
            <div className="relative aspect-[1.02] min-h-[330px]">
              {(() => {
                const demoUrl = loopingDemoEmbed(activeExercise.videoUrl);
                if (demoUrl) {
                  // Khung gần vuông + video 16:9 → phóng chiều rộng để "cover"
                  // (crop 2 bên) thay vì để viền đen. pointer-events-none để các
                  // lớp overlay đếm hiệp bên trên vẫn hoạt động bình thường.
                  return (
                    <div className="absolute inset-0 overflow-hidden bg-black">
                      <iframe
                        src={demoUrl}
                        title={exerciseName}
                        className="pointer-events-none absolute left-1/2 top-1/2 h-full w-[178%] -translate-x-1/2 -translate-y-1/2"
                        style={{ border: 0 }}
                        allow="autoplay; encrypted-media"
                        allowFullScreen
                      />
                    </div>
                  );
                }
                if (activeExercise.imageUrl) {
                  return <img src={activeExercise.imageUrl} alt={exerciseName} className="h-full w-full object-cover" />;
                }
                return (
                  <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,#0f766e,#f97316)]">
                    <Dumbbell className="h-16 w-16 text-white/80" />
                  </div>
                );
              })()}
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.05)_0%,rgba(2,6,23,0.16)_42%,rgba(2,6,23,0.82)_100%)]" />

              <div className="absolute left-4 top-4 rounded-full bg-teal-600 px-3 py-1.5 text-xs font-bold text-white shadow-lg">
                Đang tập
              </div>
              <div className="absolute right-4 top-4 flex flex-col gap-2">
                <button
                  onClick={() => setSoundEnabled(s => !s)}
                  title={soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-black/38 text-white backdrop-blur-md transition hover:bg-black/50"
                >
                  {soundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
                </button>
                <button
                  type="button"
                  onClick={requestWorkoutFullscreen}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-black/38 text-white backdrop-blur-md"
                  title="Toàn màn hình"
                >
                  <Video className="h-5 w-5" />
                </button>
              </div>

              <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                <div className="mb-3 inline-flex rounded-lg bg-teal-600 px-3 py-1 text-xs font-bold">Hiệp tập</div>
                <div className="flex items-end justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="font-grotesk text-2xl font-bold leading-tight text-balance">{exerciseName}</h3>
                    <p className="mt-1 text-sm font-medium text-white/82">
                      {allMuscles.slice(0, 3).map(translateMuscle).join(' · ') || movement.label}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-grotesk text-3xl font-bold tabular-nums">
                      {isHold && isHolding ? holdCountdown : currentRepInput} / {targetReps}
                    </p>
                    <p className="text-xs font-semibold text-white/78">{isHold ? 'Giây giữ' : 'Lần lặp'}</p>
                  </div>
                </div>
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/24">
                  <div className="h-full rounded-full bg-teal-400" style={{ width: `${Math.min(100, (currentRepInput / Math.max(1, targetReps)) * 100)}%` }} />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-[minmax(0,1fr)_132px] gap-3">
            <section className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#121821]">
              <div className="mb-4 flex items-center justify-between">
                <h4 className="font-grotesk text-base font-bold text-slate-950">Tiến độ buổi tập</h4>
                <span className="text-sm font-bold text-teal-700">{completedInDay} / {Math.max(1, activeDayExercises.length)} bài</span>
              </div>
              <div className="flex items-center gap-2">
                {Array.from({ length: Math.max(1, activeDayExercises.length) }).map((_, index) => {
                  const done = index < completedInDay;
                  const active = index + 1 === exerciseNumber;
                  let statusClass = 'bg-slate-200 text-slate-700';
                  if (active) statusClass = 'bg-teal-100 text-teal-800 ring-1 ring-teal-300';
                  if (done) statusClass = 'bg-teal-600 text-white';
                  return (
                    <div key={index} className="flex flex-1 items-center gap-1">
                      <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${statusClass}`}>
                        {done ? <Check className="h-3 w-3" /> : index + 1}
                      </div>
                      {index < activeDayExercises.length - 1 && (
                        <div className={`h-1 flex-1 rounded-full ${done ? 'bg-teal-500' : 'bg-slate-200'}`} />
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-200">
                <div className="h-full rounded-full bg-teal-500" style={{ width: `${Math.max(6, setProgress)}%` }} />
              </div>
              <p className="mt-3 text-sm font-semibold text-teal-700">{setProgress}% hoàn thành hiệp hiện tại</p>
              <div className="mt-4 space-y-2">
                {activeDayExercises.map((exercise, index) => {
                  const isCurrentExercise = exercise.id === activeExercise.id;
                  const isCompletedExercise = exercise.done || (isCurrentExercise && allSetsDone);
                  return (
                    <div
                      key={exercise.id}
                      className={`grid grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-2 rounded-xl border px-2.5 py-2 ${
                        isCurrentExercise
                          ? 'border-teal-200 bg-teal-50'
                          : isCompletedExercise
                            ? 'border-emerald-100 bg-emerald-50'
                            : 'border-slate-200 bg-slate-50'
                      }`}
                    >
                      <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${
                        isCompletedExercise
                          ? 'bg-emerald-600 text-white'
                          : isCurrentExercise
                            ? 'bg-teal-700 text-white'
                            : 'bg-white text-slate-700 ring-1 ring-slate-200'
                      }`}>
                        {isCompletedExercise ? <Check className="h-3 w-3" /> : index + 1}
                      </span>
                      <span className={`truncate text-xs font-bold ${
                        isCurrentExercise ? 'text-teal-950' : isCompletedExercise ? 'text-emerald-800' : 'text-slate-700'
                      }`}>
                        {exercise.name}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-600">{exercise.sets}</span>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="rounded-[20px] border border-slate-200 bg-white p-4 text-center shadow-sm dark:border-white/10 dark:bg-[#121821]">
              <h4 className="font-grotesk text-sm font-bold text-slate-950">Nghỉ giữa hiệp</h4>
              <div className="relative mx-auto mt-3 h-24 w-24">
                <svg className="h-full w-full -rotate-90" viewBox="0 0 96 96">
                  <circle cx="48" cy="48" r="39" fill="none" stroke="#e2e8f0" strokeWidth="8" />
                  <circle
                    cx="48"
                    cy="48"
                    r="39"
                    fill="none"
                    stroke="#0f766e"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 39}`}
                    strokeDashoffset={`${2 * Math.PI * 39 * (1 - (isResting ? restPct : 100) / 100)}`}
                    className="transition-all duration-700"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-grotesk text-2xl font-bold text-slate-950 tabular-nums">
                    {isResting
                      ? restCountdown >= 60
                        ? `${Math.floor(restCountdown / 60)}:${String(restCountdown % 60).padStart(2, '0')}`
                        : `00:${String(restCountdown).padStart(2, '0')}`
                      : formatDuration(activeExercise.restTime)}
                  </span>
                  <span className="text-[10px] font-medium text-slate-600">{isResting ? 'Đang nghỉ' : 'Thời gian nghỉ'}</span>
                </div>
              </div>
              {isResting && (
                <button onClick={() => setIsResting(false)} className="mt-3 text-xs font-bold text-teal-700">
                  Bỏ qua
                </button>
              )}
            </section>
          </div>

          <section className="mt-4 grid grid-cols-4 divide-x divide-slate-100 rounded-[20px] border border-slate-200 bg-white shadow-sm dark:divide-white/10 dark:border-white/10 dark:bg-[#121821]">
            <p className="col-span-4 -mb-1 px-3 pt-2 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">Tổng cả buổi (cộng dồn)</p>
            {[
              { Icon: Timer, label: 'Thời gian', value: formatTime(runningTime), sub: 'phút', tone: 'text-teal-700' },
              { Icon: Flame, label: 'Calories', value: runningCalories, sub: 'kcal', tone: 'text-orange-600' },
              { Icon: Dumbbell, label: 'Bài xong', value: `${sessionTotals.exercises}/${activeDayExercises.length}`, sub: 'bài', tone: 'text-teal-700' },
              { Icon: Dumbbell, label: 'Còn lại', value: Math.max(0, targetSets - currentSet), sub: 'hiệp', tone: 'text-slate-700' },
            ].map(({ Icon, label, value, sub, tone }) => (
              <div key={label} className="px-2 py-3 text-center">
                <Icon className={`mx-auto mb-1 h-5 w-5 ${tone}`} />
                <p className="text-[10px] font-medium text-slate-600">{label}</p>
                <p className="mt-1 font-grotesk text-xl font-bold text-slate-950">{value}</p>
                <p className="text-[10px] text-slate-600">{sub}</p>
              </div>
            ))}
          </section>

          <section className="mt-4 rounded-[20px] border border-teal-100 bg-[linear-gradient(135deg,#ecfdf5,#ffffff_58%,#fff7ed)] p-4 shadow-sm dark:border-teal-400/20 dark:bg-[linear-gradient(135deg,#0f2a28,#121821_58%,#1f1a12)]">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white text-teal-700 shadow-sm dark:bg-[#0d1118] dark:text-teal-300">
                <Activity className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-grotesk text-sm font-bold text-slate-950">Viway Coach</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-700">
                  {movement.desc || parsed.benefit || 'Giữ nhịp ổn định, kiểm soát biên độ và ưu tiên kỹ thuật sạch trong từng lần lặp.'}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {allMuscles.slice(0, 4).map(m => (
                    <span key={m} className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-teal-800 ring-1 ring-teal-100 dark:bg-[#0d1118] dark:text-teal-200 dark:ring-teal-400/20">
                      {translateMuscle(m)}
                    </span>
                  ))}
                  {activeExercise.recommendedWeight && (
                    <span className="rounded-full bg-orange-50 px-2 py-1 text-[10px] font-semibold text-orange-700 ring-1 ring-orange-100">
                      {activeExercise.recommendedWeight}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="mt-4 rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#121821]">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-600">Set {currentSet + 1}</p>
                <h4 className="font-grotesk text-lg font-bold text-slate-950">{isHold ? 'Thời gian giữ tư thế' : 'Số rep thực hiện'}</h4>
              </div>
              <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-700 ring-1 ring-teal-100">
                Mục tiêu {targetReps}{isHold ? ' giây' : ''}
              </span>
            </div>
            {isHold && isHolding ? (
              // Đang giữ tư thế: đồng hồ đếm ngược to, hết giờ tự điền số giây
              <div className="flex flex-col items-center gap-3">
                <p className="font-grotesk text-7xl font-bold leading-none tabular-nums text-teal-700">{holdCountdown}</p>
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-slate-500">giây còn lại — giữ vững!</p>
                <button
                  onClick={() => {
                    // Dừng sớm: ghi nhận số giây đã giữ được
                    setCurrentRepInput(Math.max(0, targetReps - holdCountdown));
                    setIsHolding(false);
                    setHoldCountdown(0);
                  }}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-700"
                >
                  Dừng sớm
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-center gap-5">
                  <button
                    onClick={() => setCurrentRepInput(r => Math.max(0, r - (isHold ? 5 : 1)))}
                    className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-2xl font-bold text-slate-900 transition active:scale-95"
                  >
                    -
                  </button>
                  <div className="min-w-24 text-center">
                    <p className="font-grotesk text-6xl font-bold leading-none text-slate-950">{currentRepInput}</p>
                    <p className="mt-1 text-xs font-bold uppercase tracking-[0.08em] text-slate-500">{isHold ? 'giây' : 'rep'}</p>
                  </div>
                  <button
                    onClick={() => setCurrentRepInput(r => r + (isHold ? 5 : 1))}
                    className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-2xl font-bold text-slate-900 transition active:scale-95"
                  >
                    +
                  </button>
                </div>
                <div className="mt-4 flex justify-center gap-2">
                  {(isHold ? [targetReps - 10, targetReps, targetReps + 10] : [targetReps - 2, targetReps, targetReps + 2]).filter(n => n > 0).map(n => (
                    <button
                      key={n}
                      onClick={() => setCurrentRepInput(n)}
                      className={`rounded-xl border px-4 py-2 text-xs font-bold ${
                        currentRepInput === n
                          ? 'border-teal-200 bg-teal-50 text-teal-700'
                          : 'border-slate-200 bg-slate-50 text-slate-700'
                      }`}
                    >
                      {n}{isHold ? 's' : ''}
                    </button>
                  ))}
                </div>
                {isHold && !isResting && (
                  <button
                    onClick={() => { setHoldCountdown(targetReps); setIsHolding(true); }}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-teal-200 bg-teal-50 py-3 text-sm font-bold text-teal-800 transition active:scale-[0.99]"
                  >
                    ⏱ Bấm giờ giữ {targetReps} giây
                  </button>
                )}
              </>
            )}
          </section>

          <div className="mt-auto grid grid-cols-[1fr_1fr_1.5fr] gap-3 pt-5">
            <button
              onClick={() => endSession(false)}
              disabled={currentSet === 0}
              className="flex min-h-14 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm font-bold text-slate-700 shadow-sm disabled:opacity-40"
            >
              <span className="text-lg leading-none">II</span>
              <span className="mt-1 text-xs">Dừng & lưu</span>
            </button>
            <button
              onClick={() => isResting ? setIsResting(false) : skipCurrentSet()}
              className="flex min-h-14 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm font-bold text-slate-700 shadow-sm"
            >
              <ChevronRight className="h-5 w-5" />
              <span className="mt-1 text-xs">{isResting ? 'Bỏ qua nghỉ' : 'Bỏ qua hiệp'}</span>
            </button>
            {!isResting ? (
              <button
                onClick={completeSet}
                className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-teal-700 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-teal-800"
              >
                <Check className="h-5 w-5" />
                Hoàn thành hiệp
              </button>
            ) : (
              <button
                onClick={() => setIsResting(false)}
                className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-teal-700 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-teal-800"
              >
                <Play className="h-5 w-5" fill="currentColor" />
                Bắt đầu hiệp
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const totalScheduleDays = planDurationDays(activePlan, scheduleExercises);
  // Số ngày thực sự có bài tập (để lặp chu kỳ khi ngày hiện tại vượt qua)
  const contentDays = scheduleExercises.reduce((m, ex) => Math.max(m, ex.dayNumber || 1), 1);
  const toContentDay = (planDay: number | null): number | null =>
    planDay != null && contentDays > 0 ? ((planDay - 1) % contentDays) + 1 : planDay;
  const visibleExercises = scheduleExercises.filter(ex => (ex.dayNumber || 1) === toContentDay(selectedDay));
  const completedCount = scheduleExercises.filter(ex => ex.done).length;
  const visibleCompletedCount = visibleExercises.filter(ex => ex.done).length;
  const progressPercent = scheduleExercises.length ? Math.round((completedCount / scheduleExercises.length) * 100) : 0;
  const visibleProgressPercent = visibleExercises.length ? Math.round((visibleCompletedCount / visibleExercises.length) * 100) : 0;
  const selectedDayIsRest = visibleExercises.length === 0;
  const nextExercise = visibleExercises.find(ex => !ex.done) || visibleExercises[0] || scheduleExercises.find(ex => !ex.done) || scheduleExercises[0] || null;
  const totalCalories = visibleExercises.reduce((sum, ex) => sum + (ex.estimatedCalories || 0), 0);
  // Cho phép sinh tuần tiếp theo bất cứ khi nào đang có kế hoạch active.
  // (Trước đây yêu cầu weekNumber < totalWeeks → plan có field tuần null như
  //  bản seed/plan cũ sẽ KHÔNG bao giờ hiện nút → user không thể tạo thêm lịch.)
  const canGenerateNextWeek = !!activePlan?.id;

  const totalWeeksCount = Math.max(1, Math.ceil(totalScheduleDays / 7));

  // Date helpers — map plan day number → real calendar date
  const VI_WEEKDAYS_FULL = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];

  const getDayDate = (dayNumber: number): Date | null => {
    const raw = activePlan?.startDate;
    if (!raw) return null;
    const start = new Date(raw);
    if (Number.isNaN(start.getTime())) return null;
    const d = new Date(start);
    d.setDate(d.getDate() + dayNumber - 1);
    return d;
  };

  const formatSelectedDayLabel = (dayNumber: number) => {
    const date = getDayDate(dayNumber);
    if (!date) return `Ngày ${dayNumber}`;
    const weekdayFull = VI_WEEKDAYS_FULL[date.getDay()];
    return `Ngày ${dayNumber} · ${weekdayFull}, ${date.getDate()} tháng ${date.getMonth() + 1}`;
  };

  // "Today" indicator: find which plan-day corresponds to today
  const getTodayDayNumber = (): number | null => {
    const raw = activePlan?.startDate;
    if (!raw) return null;
    const start = new Date(raw);
    if (Number.isNaN(start.getTime())) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    start.setHours(0, 0, 0, 0);
    const diff = Math.floor((today.getTime() - start.getTime()) / 86400000) + 1;
    if (diff >= 1 && diff <= totalScheduleDays) return diff;
    return null;
  };
  const todayDayNumber = getTodayDayNumber();
  // Hôm nay đã vượt số ngày có bài trong kế hoạch → gợi ý sinh thêm tuần mới.
  const reachedPlanEnd = scheduleExercises.length > 0
    && (todayDayNumber == null || todayDayNumber > contentDays);

  const dateToPlanDay = (date: Date): number | null => {
    const raw = activePlan?.startDate;
    if (!raw) return null;
    const start = new Date(raw);
    if (Number.isNaN(start.getTime())) return null;
    const localDate = new Date(date);
    localDate.setHours(0, 0, 0, 0);
    start.setHours(0, 0, 0, 0);
    const diff = Math.round((localDate.getTime() - start.getTime()) / 86400000) + 1;
    return diff >= 1 && diff <= totalScheduleDays ? diff : null;
  };

  const selectedDate = getDayDate(selectedDay) || new Date();
  const selectedMonthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
  const selectedMonthDays = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();
  const monthLeadEmpty = selectedMonthStart.getDay() === 0 ? 6 : selectedMonthStart.getDay() - 1;
  const monthCells = [
    ...Array.from({ length: monthLeadEmpty }, () => null),
    ...Array.from({ length: selectedMonthDays }, (_, index) => {
      const date = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), index + 1);
      const dayNumber = dateToPlanDay(date);
      const dayExercises = dayNumber
        ? scheduleExercises.filter(ex => (ex.dayNumber || 1) === toContentDay(dayNumber))
        : [];
      const dayDone = dayExercises.filter(ex => ex.done).length;
      return {
        date,
        dayNumber,
        dayExercises,
        dayDone,
        isToday: dayNumber != null && dayNumber === todayDayNumber,
        isSelected: dayNumber != null && dayNumber === selectedDay,
      };
    }),
  ];
  const selectedMonthLabel = selectedDate.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });
  const monthWorkoutDays = monthCells.filter(cell => cell && cell.dayExercises.length > 0).length;
  const monthCompletedDays = monthCells.filter(cell => cell && cell.dayExercises.length > 0 && cell.dayDone === cell.dayExercises.length).length;

  const jumpToDay = (day: number) => {
    setSelectedDay(day);
    const dayExercises = scheduleExercises.filter(ex => (ex.dayNumber || 1) === day);
    const firstInDay = dayExercises.find(ex => !ex.done) || dayExercises[0] || null;
    if (firstInDay) setActiveExercise(firstInDay);
  };

  const firstAvailableExercise = scheduleExercises.find(ex => !ex.done) || scheduleExercises[0] || null;
  const guidePrimaryLabel = !activePlan
    ? 'Tạo kế hoạch AI'
    : scheduleExercises.length === 0
      ? 'Sinh lịch tập'
      : selectedDayIsRest && firstAvailableExercise
        ? 'Xem ngày có bài'
        : nextExercise?.done
          ? 'Làm lại bài này'
          : 'Bắt đầu bài tiếp theo';
  const guidePrimaryAction = () => {
    if (!activePlan || scheduleExercises.length === 0) {
      setAiPlanModalOpen(true);
      return;
    }
    if (selectedDayIsRest && firstAvailableExercise?.dayNumber) {
      jumpToDay(firstAvailableExercise.dayNumber);
      return;
    }
    if (nextExercise) startSession(nextExercise);
  };
  const selectedDayMinutes = visibleExercises.reduce((sum, ex) => {
    const sets = ex.targetSets || parseInt(ex.sets?.split('x')[0] || '3') || 3;
    const reps = ex.targetReps || parseInt(ex.sets?.split('x')[1] || '10') || 10;
    const workSeconds = sets * reps * 4;
    const restSeconds = Math.max(0, sets - 1) * (ex.restTime || 60);
    return sum + Math.max(4, Math.round((workSeconds + restSeconds) / 60));
  }, 0);
  const selectedDayMuscles = Array.from(new Set(
    visibleExercises.map(ex => translateMuscle(ex.muscle || '')).filter(Boolean)
  ));
  const focusExercise = selectedDayIsRest ? firstAvailableExercise : nextExercise;
  const focusMuscle = focusExercise ? translateMuscle(focusExercise.muscle || '') : '';
  const readinessSummary = selectedDayIsRest
    ? 'Ngày phục hồi'
    : `${visibleExercises.length} bài · khoảng ${selectedDayMinutes || visibleExercises.length * 6} phút`;
  const planMuscleStats = Array.from(
    scheduleExercises.reduce((map, ex) => {
      const muscle = translateMuscle(ex.muscle || 'Toàn thân');
      map.set(muscle, (map.get(muscle) || 0) + 1);
      return map;
    }, new Map<string, number>())
  ).sort((a, b) => b[1] - a[1]);
  const topPlanMuscles = planMuscleStats.slice(0, 4);
  const trainingAdherence = monthWorkoutDays
    ? Math.round((monthCompletedDays / monthWorkoutDays) * 100)
    : 0;
  const totalTargetSets = scheduleExercises.reduce((sum, ex) => {
    const sets = ex.targetSets || parseInt(ex.sets?.split('x')[0] || '0') || 0;
    return sum + sets;
  }, 0);
  const totalTargetReps = scheduleExercises.reduce((sum, ex) => {
    const sets = ex.targetSets || parseInt(ex.sets?.split('x')[0] || '0') || 0;
    const reps = ex.targetReps || parseInt(ex.sets?.split('x')[1] || '0') || 0;
    return sum + sets * reps;
  }, 0);
  const planCompletion = Math.round(activePlan?.completionPercentage ?? progressPercent);
  const remainingPlanPercent = Math.max(0, 100 - planCompletion);
  const remainingExercises = Math.max(0, scheduleExercises.length - completedCount);
  const mainPlanMuscle = topPlanMuscles[0]?.[0] || 'Toàn thân';
  const canShowAiUsage = usage?.isUnlimited || typeof usage?.remaining === 'number';
  const recentWeights = bodyMetrics.slice(-8);
  const currentWeight = recentWeights.length ? recentWeights[recentWeights.length - 1].weightKg : undefined;
  const firstWeight = recentWeights.length ? recentWeights[0].weightKg : undefined;
  const weightDelta = currentWeight != null && firstWeight != null
    ? Math.round((currentWeight - firstWeight) * 10) / 10
    : null;
  const todayKey = formatDateKey(new Date());
  const nutritionByDate = new Map(dailyNutrition.map(item => [item.date, item]));
  const nutritionSeries = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const key = formatDateKey(date);
    const point = nutritionByDate.get(key);
    const isToday = key === todayKey;
    return {
      date: key,
      label: formatShortDate(key),
      calories: Math.round(Number(point?.calories ?? (isToday ? dashboardData?.stats?.caloriesConsumed ?? 0 : 0))),
    };
  });
  const caloriesConsumedToday = Math.round(Number(
    dashboardData?.stats?.caloriesConsumed
      ?? nutritionByDate.get(todayKey)?.calories
      ?? 0
  ));
  const caloriesGoalToday = Math.round(Number(dashboardData?.stats?.caloriesGoal ?? 0));
  const caloriesBurnedToday = Math.round(Number(dashboardData?.stats?.caloriesBurned ?? totalCalories ?? 0));
  const calorieAverage = Math.round(
    nutritionSeries.reduce((sum, point) => sum + point.calories, 0) / Math.max(1, nutritionSeries.length)
  );
  const weightPoints = sparklinePoints(recentWeights.map(point => Number(point.weightKg || 0)));
  const caloriePoints = sparklinePoints(nutritionSeries.map(point => point.calories));

  return (
    <div className="relative isolate space-y-5 p-0 animate-fade-in sm:p-0">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-64 bg-[linear-gradient(135deg,rgba(13,148,136,0.06),rgba(59,130,246,0.05)_36%,transparent_72%)]" />
      {/* ── Modal tạo kế hoạch AI ── */}
      {aiPlanModalOpen && (
        <CyberpunkWorkoutModal
          onClose={() => setAiPlanModalOpen(false)}
          onSuccess={handleAiPlanSuccess}
          onQuotaExceeded={() => { setAiPlanModalOpen(false); setUpgradeModalOpen(true); }}
        />
      )}

      {/* ── Modal nâng cấp gói AI ── */}
      {upgradeModalOpen && user?.id && (
        <AiUpgradeModal
          isOpen={upgradeModalOpen}
          onClose={() => setUpgradeModalOpen(false)}
          usage={usage}
          packages={packages}
          userId={user.id}
          onUpgradeSuccess={() => { refreshUsage(); setUpgradeModalOpen(false); }}
        />
      )}

      {/* ── Modal check-in sau buổi tập (overlay toàn màn, độc lập với session) ── */}
      {showCheckIn && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 animate-fade-in">
            <div className="text-center mb-5">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center mx-auto mb-3">
                <Check className="w-6 h-6 text-teal-600" />
              </div>
              <h3 className="font-grotesk font-bold text-slate-900 text-lg">Hoàn thành! Ghi nhận cảm nhận</h3>
              <p className="text-slate-500 text-xs mt-1">Giúp AI điều chỉnh kế hoạch & theo dõi phục hồi của bạn.</p>
            </div>

            {/* Độ mệt mỏi 1-5 */}
            <div className="mb-5">
              <label className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-2 block">Độ mệt mỏi</label>
              <div className="grid grid-cols-5 gap-2">
                {['Rất khỏe', 'Khỏe', 'Bình thường', 'Mệt', 'Kiệt sức'].map((lbl, i) => {
                  const val = i + 1;
                  return (
                    <button key={val} type="button" onClick={() => setCheckIn(c => ({ ...c, fatigue: val }))}
                      className={`py-2 rounded-xl border text-[10px] font-semibold leading-tight transition-all ${
                        checkIn.fatigue === val
                          ? 'bg-teal-50 border-teal-200 text-teal-800'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-900'
                      }`}>
                      <span className="block text-sm">{val}</span>{lbl}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Độ khó RPE 1-10 */}
            <div className="mb-5">
              <label className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-2 block">
                Độ khó buổi tập (RPE) {checkIn.rpe > 0 && <span className="text-teal-600 normal-case">· {checkIn.rpe}/10</span>}
              </label>
              <div className="grid grid-cols-10 gap-1">
                {Array.from({ length: 10 }, (_, i) => i + 1).map(val => (
                  <button key={val} type="button" onClick={() => setCheckIn(c => ({ ...c, rpe: val }))}
                    className={`py-2 rounded-lg border text-xs font-bold transition-all ${
                      checkIn.rpe === val
                        ? 'bg-blue-50 border-blue-300 text-blue-800'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:text-slate-900'
                    }`}>
                    {val}
                  </button>
                ))}
              </div>
            </div>

            {/* Giấc ngủ đêm qua */}
            <div className="mb-6">
              <label className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-2 block">Giấc ngủ đêm qua (tùy chọn)</label>
              <div className="relative">
                <input type="number" step={0.5} min={0} max={14} value={checkIn.sleep}
                  onChange={e => setCheckIn(c => ({ ...c, sleep: e.target.value }))}
                  placeholder="VD: 7.5"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 pr-16 py-3 text-slate-900 focus:outline-none focus:border-teal-200" />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm">giờ</span>
              </div>
            </div>

            {checkInError && (
              <div className="mb-3 px-4 py-3 rounded-2xl bg-red-50 border border-red-200 text-red-500 text-xs text-center">
                {checkInError}
              </div>
            )}

            <button onClick={submitCheckIn} disabled={savingCheckIn}
              className="w-full bg-teal-600 text-white hover:bg-teal-700 transition-colors py-3.5 rounded-2xl text-sm font-grotesk font-bold flex items-center justify-center gap-2 disabled:opacity-50">
              {savingCheckIn ? 'Đang lưu...' : 'Lưu & hoàn thành'}
              {!savingCheckIn && <Check className="w-4 h-4" />}
            </button>
            <button onClick={() => { setShowCheckIn(false); setCheckInError(null); }} disabled={savingCheckIn}
              className="w-full py-2.5 mt-1 text-xs text-slate-400 hover:text-slate-500 transition-colors disabled:opacity-30">
              Bỏ qua bước này
            </button>
          </div>
        </div>
      )}

      {/* ── Adaptation feedback banner (sau AI thích ứng hoặc check-in) ── */}
      {adaptationNote && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] w-full max-w-md px-4 animate-fade-in">
          <div className="rounded-2xl border border-teal-200 bg-white/95 backdrop-blur-md p-4 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="w-4 h-4 text-teal-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-teal-600 text-xs font-bold uppercase tracking-wider mb-1.5">
                  AI đã phân tích & điều chỉnh tuần {(activePlan?.weekNumber || 1) + 1}
                </p>
                <p className="text-slate-600 text-sm leading-relaxed">{adaptationNote}</p>
                <p className="text-slate-400 text-[10px] mt-2">
                  Cuộn xuống lịch tập tháng để xem lịch tập mới.
                </p>
              </div>
              <button onClick={() => setAdaptationNote(null)} className="text-slate-500 hover:text-slate-900 transition-colors shrink-0 mt-0.5">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Training report hero ── */}
      <div className="overflow-hidden rounded-[18px] border border-teal-100 bg-[linear-gradient(135deg,#ffffff_0%,#f5fffb_52%,#fff7ed_100%)] dark:border-teal-400/20 dark:bg-[linear-gradient(135deg,#111827_0%,#0f1f24_52%,#17140f_100%)]">
        <div className="flex items-center justify-between gap-3 border-b border-teal-100/80 px-5 py-4">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-teal-700">Báo cáo luyện tập</p>
            <h2 className="mt-1 truncate font-grotesk text-xl font-bold text-slate-950">
              {activePlan?.name ? displayPlanName(activePlan.name) : 'Kế hoạch tập cá nhân'}
            </h2>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {canShowAiUsage && (
              <AiUsageBadge usage={usage} actionCost={5} onUpgradeClick={() => setUpgradeModalOpen(true)} />
            )}
            {activePlan && (
              <button
                onClick={() => {
                  if (window.confirm('Tạo lại kế hoạch sẽ thay thế kế hoạch tập hiện tại bằng kế hoạch AI mới. Tiến độ của kế hoạch cũ sẽ không còn hiển thị. Bạn chắc chắn?')) {
                    setAiPlanModalOpen(true);
                  }
                }}
                title="Tạo lại kế hoạch bằng AI"
                className="flex h-9 items-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50 px-3 text-xs font-bold text-teal-800 transition-colors hover:border-teal-300 hover:bg-teal-100"
              >
                <Sparkles className="h-3.5 w-3.5" /> Tạo lại
              </button>
            )}
            <button
              onClick={loadTrainingSchedule}
              title="Tải lại lịch tập"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-teal-800 transition-colors hover:border-teal-200 hover:bg-teal-50"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="grid gap-0 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
          <div className="p-5 sm:p-6">
            <p className="mb-2 text-xs font-bold text-slate-700">
              {selectedDayIsRest ? 'Ngày phục hồi' : focusExercise?.done ? 'Bài đã hoàn thành' : 'Bài tiếp theo'}
            </p>
            <div className="flex items-start gap-4">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                {focusExercise?.imageUrl ? (
                  <img src={focusExercise.imageUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Dumbbell className="h-6 w-6 text-slate-600" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-grotesk text-2xl font-bold leading-tight text-slate-950 sm:text-3xl">
                  {focusExercise?.name || 'Tạo lịch tập hôm nay'}
                </h3>
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-800">{readinessSummary}</span>
                  {focusExercise && <span className="rounded-full bg-teal-50 px-2.5 py-1 text-teal-800 ring-1 ring-teal-200">{focusExercise.sets}</span>}
                  {focusExercise?.restTime && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-800">Nghỉ {formatDuration(focusExercise.restTime)}</span>}
                  {focusMuscle && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-800">{focusMuscle}</span>}
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-slate-700">
                <span className="font-bold text-slate-950">Đang tập:</span>{' '}
                {topPlanMuscles.length ? topPlanMuscles.map(([name]) => name).slice(0, 3).join(' · ') : 'Toàn thân'}
              </div>
              <button
                type="button"
                onClick={guidePrimaryAction}
                disabled={!!activePlan && scheduleExercises.length > 0 && !nextExercise}
                className="flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-teal-700 px-5 text-sm font-bold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {scheduleExercises.length > 0 && nextExercise?.done ? <RotateCcw className="h-4 w-4" /> : <Play className="h-4 w-4" fill="currentColor" />}
                {guidePrimaryLabel}
              </button>
            </div>
          </div>

          <div className="border-t border-teal-100/80 bg-white/70 p-5 dark:border-teal-400/15 dark:bg-[#0f141c] lg:border-l lg:border-t-0">
            <div className="mb-3 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
              <div className="relative h-28">
                {focusExercise?.imageUrl ? (
                  <img src={focusExercise.imageUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,#ccfbf1,#fff7ed)]">
                    <Dumbbell className="h-10 w-10 text-teal-700" />
                  </div>
                )}
                <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(15,118,110,0.82)_0%,rgba(15,118,110,0.45)_60%,rgba(15,118,110,0.12)_100%)]" />
                <div className="absolute left-3 top-3 rounded-full bg-white px-3 py-1 text-[11px] font-bold text-slate-900 shadow-sm">
                  {selectedDayIsRest ? 'Recovery' : `Ngày ${selectedDay}`}
                </div>
                <div className="absolute bottom-3 left-3 max-w-[72%]">
                  <p className="font-grotesk text-lg font-bold leading-tight text-white drop-shadow-sm">
                    {selectedDayIsRest ? 'Giữ nhịp phục hồi' : 'Sẵn sàng cho buổi tập'}
                  </p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">
              {[
                { label: 'Tuần', value: `${activePlan?.weekNumber || 1}/${activePlan?.totalWeeks || totalWeeksCount}` },
                { label: 'Tiến độ', value: `${planCompletion}%` },
                { label: 'Còn lại', value: `${remainingExercises} bài` },
                { label: 'Kcal hôm nay', value: `${totalCalories}` },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                  <p className="text-[11px] font-semibold text-slate-700">{label}</p>
                  <p className="mt-1 font-grotesk text-lg font-bold text-slate-950">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Kiến thức buổi tập + cảnh báo y khoa (sau khi tạo plan) ── */}
      {planInsight && (planInsight.rationale || planInsight.disclaimer || planInsight.notes.length > 0) && (
        <div className="space-y-3">
          {planInsight.disclaimer && (
            <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-orange-600 font-semibold text-sm">Lưu ý sức khỏe</p>
                <p className="text-slate-600 text-xs mt-1 leading-relaxed">{planInsight.disclaimer}</p>
              </div>
              <button onClick={() => setPlanInsight(null)} className="text-slate-500 hover:text-slate-900 shrink-0"><X className="w-4 h-4" /></button>
            </div>
          )}
          {(planInsight.rationale || planInsight.notes.length > 0) && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-orange-500" />
                  <span className="font-grotesk font-bold uppercase text-slate-900 text-sm tracking-wide">Vì sao kế hoạch này</span>
                </div>
                <button onClick={() => setPlanInsight(null)} className="text-slate-500 hover:text-slate-900 shrink-0"><X className="w-4 h-4" /></button>
              </div>
              {planInsight.rationale && <p className="text-slate-600 text-xs leading-relaxed mb-2">{planInsight.rationale}</p>}
              {planInsight.notes.length > 0 && (
                <ul className="space-y-1.5">
                  {planInsight.notes.slice(0, 6).map((n, i) => (
                    <li key={i} className="flex items-start gap-2 text-slate-600 text-xs">
                      <Check className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                      <span>{n}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Error ── */}
      {saveError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-500 text-sm">
          {saveError}
        </div>
      )}

      {/* ── Loading ── */}
      {loading && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 flex items-center justify-center gap-3 text-slate-500 text-sm">
          <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
          Đang tải lịch tập...
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && scheduleExercises.length === 0 && (
        <EmptySchedule activePlanId={activePlan?.id} onRetry={loadTrainingSchedule} onCreatePlan={() => setAiPlanModalOpen(true)} />
      )}

      {/* ── Main content ── */}
      {!loading && scheduleExercises.length > 0 && (
        <div className="space-y-4">

          {/* ── Sinh tuần tiếp theo ─────────────────────────────────────────── */}
          {canGenerateNextWeek && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center">
                  <CalendarDays className="w-4 h-4 text-slate-600" />
                </div>
                <div>
                  <p className="font-grotesk font-bold text-slate-900 text-sm leading-none">
                    {reachedPlanEnd ? 'Bạn đã đi hết lịch hiện có 🎉' : `Sinh lịch tập tuần ${(activePlan?.weekNumber || 1) + 1}`}
                  </p>
                <p className="text-slate-700 text-[11px] mt-0.5">
                  {reachedPlanEnd ? 'Sinh tuần tiếp theo để tiếp tục hành trình · 5 credit AI' : 'Mỗi lần sinh tốn 5 credit AI'}
                </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {/* AI thích ứng — phân tích tuần trước, điều chỉnh cường độ */}
                <button
                  onClick={autoRegulateNextWeek}
                  disabled={adaptingNextWeek || generatingNextWeek}
                  className="relative flex flex-col items-start gap-1.5 rounded-xl border border-[#0f766e] bg-[#0f766e] p-3 text-left text-white shadow-sm transition-colors hover:bg-[#115e59] disabled:cursor-not-allowed disabled:opacity-50 dark:border-lime/25 dark:bg-[linear-gradient(135deg,#162015_0%,#121821_56%,#0f2a28_100%)] dark:text-slate-50 dark:shadow-[0_16px_38px_-28px_rgba(204,255,0,0.55)] dark:hover:border-lime/40"
                >
                  <span className="absolute right-2 top-2 rounded-full bg-white/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white dark:bg-lime dark:text-[#050505]">Khuyên dùng</span>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-white dark:text-lime">
                    {adaptingNextWeek
                      ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Đang phân tích...</>
                      : <><Sparkles className="w-3.5 h-3.5" />AI thích ứng</>}
                  </div>
                  <p className="text-teal-50 text-[10px] leading-relaxed dark:text-slate-300">
                    AI xem xét RPE, độ mệt và số set đã làm tuần trước để điều chỉnh cường độ phù hợp.
                  </p>
                </button>
                {/* Sinh theo template — không dùng AI, nhanh hơn */}
                <button
                  onClick={generateNextWeek}
                  disabled={generatingNextWeek || adaptingNextWeek}
                  className="flex flex-col items-start gap-1.5 rounded-xl border border-slate-200 bg-white p-3 text-left hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <div className="flex items-center gap-1.5 text-slate-700 text-xs font-bold">
                    {generatingNextWeek
                      ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Đang tạo...</>
                      : <><RefreshCw className="w-3.5 h-3.5" />Sinh theo lịch</>}
                  </div>
                  <p className="text-slate-700 text-[10px] leading-relaxed">
                    Tạo lịch tuần tiếp theo theo chương trình gốc, không thay đổi cường độ.
                  </p>
                </button>
              </div>
            </div>
          )}

          {/* Monthly schedule */}
          <div className="rounded-[18px] border border-slate-200 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.06)] sm:p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-700 text-white">
                  <CalendarDays className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="font-grotesk text-base font-bold leading-none text-slate-950">Lịch tập tháng</p>
                  <p className="mt-1 truncate text-xs font-semibold text-slate-600">
                    {selectedMonthLabel} · {monthWorkoutDays} ngày tập · {monthCompletedDays} ngày xong
                  </p>
                </div>
              </div>
              <div className="shrink-0 rounded-xl bg-teal-50 px-3 py-2 text-right ring-1 ring-teal-100">
                <p className="font-grotesk text-xl font-bold leading-none text-teal-800">{trainingAdherence}%</p>
                <p className="mt-1 text-[11px] font-semibold text-slate-700">tuân thủ</p>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-bold text-slate-500">
              {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(day => (
                <div key={day} className="py-1">{day}</div>
              ))}
            </div>

            <div className="mt-1.5 grid grid-cols-7 gap-1.5 sm:gap-2">
              {monthCells.map((cell, index) => {
                if (!cell) {
                  return <div key={`empty-${index}`} className="min-h-14 rounded-xl border border-transparent" />;
                }

                const isPlanDay = cell.dayNumber != null;
                const isRest = cell.dayExercises.length === 0;
                const allDone = !isRest && cell.dayDone === cell.dayExercises.length;
                const disabled = !isPlanDay;
                const dateNumber = cell.date.getDate();

                return (
                  <button
                    key={cell.date.toISOString()}
                    type="button"
                    onClick={() => cell.dayNumber && jumpToDay(cell.dayNumber)}
                    disabled={disabled}
                    className={`relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl border px-1 py-2 text-center transition ${
                      cell.isSelected
                        ? 'border-teal-300 bg-teal-50 text-teal-950 shadow-[0_8px_18px_rgba(13,148,136,0.12)]'
                        : cell.isToday
                          ? 'border-orange-200 bg-orange-50 text-orange-900'
                          : disabled
                            ? 'border-slate-100 bg-slate-50 text-slate-300'
                            : isRest
                              ? 'border-dashed border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100'
                              : 'border-slate-200 bg-white text-slate-900 hover:border-teal-200 hover:bg-white'
                    } disabled:cursor-default`}
                  >
                    {cell.isToday && (
                      <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-orange-500" />
                    )}
                    <span className="font-grotesk text-sm font-bold leading-none">{dateNumber}</span>
                    <span className="flex h-4 items-center justify-center text-[10px] font-bold leading-none">
                      {!isPlanDay ? (
                        ''
                      ) : isRest ? (
                        <Moon className="h-3 w-3" />
                      ) : allDone ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        `${cell.dayDone}/${cell.dayExercises.length}`
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Workout queue */}
          <div className="grid gap-4">
            <div className="overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
              <div className="border-b border-slate-200 bg-white px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-teal-700">Thứ tự bài tập</p>
                    <h3 className="mt-1 font-grotesk text-base font-bold leading-tight text-slate-950">
                      {formatSelectedDayLabel(selectedDay)}
                      {selectedDayIsRest && <span className="ml-2 font-normal text-slate-700">· Nghỉ</span>}
                    </h3>
                  </div>
                  {!selectedDayIsRest && (
                    <div className="shrink-0 text-right">
                      <div className="font-grotesk text-2xl font-bold leading-none text-teal-700">{visibleProgressPercent}%</div>
                      <p className="mt-1 text-[11px] font-semibold text-slate-700">hoàn thành</p>
                    </div>
                  )}
                </div>

                {!selectedDayIsRest && (
                  <div className="mt-4 grid gap-2 text-xs sm:grid-cols-3">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                      <span className="font-semibold text-slate-950">{visibleExercises.length} bài</span>
                      <span className="text-slate-700"> trong buổi</span>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                      <span className="font-semibold text-slate-950">~{selectedDayMinutes || visibleExercises.length * 6} phút</span>
                      <span className="text-slate-700"> ước tính</span>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 truncate">
                      <span className="font-semibold text-slate-950">Trọng tâm </span>
                      <span className="text-slate-700">{selectedDayMuscles.slice(0, 2).join(', ') || 'Toàn thân'}</span>
                    </div>
                  </div>
                )}
              </div>

              {selectedDayIsRest ? (
                <div className="p-5">
                  <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
                    <Shield className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-semibold text-blue-950">Ngày nghỉ phục hồi</h4>
                      <p className="mt-1 text-xs leading-relaxed text-blue-800">
                        Không có bài chính. Ưu tiên đi bộ nhẹ, mobility hoặc stretching 10–20 phút.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {visibleExercises.map((ex, index) => (
                    <div
                      key={ex.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => ex.done ? replayExercise(ex) : startSession(ex)}
                      onKeyDown={e => e.key === 'Enter' && (ex.done ? replayExercise(ex) : startSession(ex))}
                      className={`group relative w-full cursor-pointer px-4 py-4 text-left transition-colors sm:px-5 ${
                        activeExercise?.id === ex.id
                          ? 'bg-teal-50 ring-1 ring-teal-200'
                          : 'bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3">
                        <div className="relative">
                          <div className="h-12 w-12 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                            {ex.imageUrl ? (
                              <img src={ex.imageUrl} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">
                                <Dumbbell className="h-5 w-5 text-slate-600" />
                              </div>
                            )}
                          </div>
                          <div className={`absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-lg text-[10px] font-bold ring-2 ring-white ${
                            ex.done
                              ? 'bg-emerald-600 text-white'
                              : activeExercise?.id === ex.id
                                ? 'bg-teal-700 text-white'
                                : 'bg-slate-900 text-white'
                          }`}>
                            {ex.done ? <Check className="h-3.5 w-3.5" /> : index + 1}
                          </div>
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`text-sm font-bold ${ex.done ? 'text-slate-700 line-through' : 'text-slate-950'}`}>
                              {ex.name}
                            </span>
                            {ex.difficulty && (
                              <span className={`rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase ${difficultyTone(ex.difficulty)}`}>
                                {ex.difficulty}
                              </span>
                            )}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            {ex.muscle && (
                              <span className="inline-flex items-center gap-1 rounded bg-teal-50 px-1.5 py-0.5 text-[10px] font-semibold text-teal-800 ring-1 ring-teal-200">
                                <Dumbbell className="h-2.5 w-2.5" /> {translateMuscle(ex.muscle)}
                              </span>
                            )}
                            {ex.secondaryMuscles?.slice(0, 2).map(m => (
                              <span key={m} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700">
                                {translateMuscle(m)}
                              </span>
                            ))}
                            {ex.exerciseType && (
                              <span className="text-[10px] font-medium text-slate-700">{formatEnumLabel(ex.exerciseType)}</span>
                            )}
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-medium text-slate-700">
                            <span className="font-bold text-slate-950">{ex.sets}</span>
                            <span>·</span>
                            <span>Nghỉ {formatDuration(ex.restTime)}</span>
                            <span>·</span>
                            <span>{ex.estimatedCalories || 0} kcal</span>
                            {ex.recommendedWeight && (
                              <>
                                <span>·</span>
                                <span className="inline-flex items-center gap-1 font-semibold text-teal-800"><Dumbbell className="h-2.5 w-2.5" /> {ex.recommendedWeight}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {ex.done ? (
                          <button
                            onClick={e => { e.stopPropagation(); replayExercise(ex); }}
                            title="Làm lại bài này"
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-teal-800 transition hover:border-teal-200 hover:bg-teal-50"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </button>
                        ) : activeExercise?.id === ex.id ? (
                          <button
                            onClick={e => { e.stopPropagation(); startSession(ex); }}
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-700 text-white transition hover:bg-teal-800"
                            title="Bắt đầu bài này"
                          >
                            <Play className="h-4 w-4" fill="currentColor" />
                          </button>
                        ) : (
                          <button
                            onClick={e => { e.stopPropagation(); startSession(ex); }}
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-teal-800 transition hover:border-teal-200 hover:bg-teal-50"
                            title="Bắt đầu bài này"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

      {!loading && scheduleExercises.length > 0 && (
        <section className="rounded-[18px] border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-teal-700">Báo cáo tập luyện</p>
              <h3 className="mt-1 font-grotesk text-xl font-bold text-slate-950">Theo dõi kế hoạch và mục tiêu cải thiện</h3>
            </div>
            <div className="rounded-xl border border-teal-100 bg-teal-50 px-4 py-2 text-teal-950">
              <p className="text-[11px] font-semibold text-teal-700">Trọng tâm hiện tại</p>
              <p className="font-grotesk text-sm font-bold">{mainPlanMuscle}</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                Icon: Activity,
                label: 'Tuân thủ tháng',
                value: `${trainingAdherence}%`,
                sub: `${monthCompletedDays}/${monthWorkoutDays || 0} ngày tập hoàn tất`,
                tone: 'text-teal-700 bg-teal-50 border-teal-100',
              },
              {
                Icon: Dumbbell,
                label: 'Khối lượng kế hoạch',
                value: `${totalTargetSets} set`,
                sub: `~${totalTargetReps} reps mục tiêu`,
                tone: 'text-slate-900 bg-slate-50 border-slate-200',
              },
              {
                Icon: Target,
                label: 'Mục tiêu còn lại',
                value: `${remainingPlanPercent}%`,
                sub: `${remainingExercises} bài chưa hoàn tất`,
                tone: 'text-blue-700 bg-blue-50 border-blue-100',
              },
              {
                Icon: Flame,
                label: 'Kcal buổi chọn',
                value: `${totalCalories}`,
                sub: `${visibleExercises.length} bài trong ngày`,
                tone: 'text-orange-700 bg-orange-50 border-orange-100',
              },
            ].map(({ Icon, label, value, sub, tone }) => (
              <div key={label} className={`rounded-2xl border p-4 ${tone}`}>
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.08em] opacity-75">{label}</p>
                    <p className="mt-2 font-grotesk text-2xl font-bold leading-none">{value}</p>
                  </div>
                  <Icon className="h-5 w-5 shrink-0" />
                </div>
                <p className="text-xs font-semibold leading-relaxed text-slate-700">{sub}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3 flex items-center justify-between text-xs">
                <span className="font-bold text-slate-950">Phân bổ nhóm cơ trong kế hoạch</span>
                <span className="font-bold text-teal-800">{topPlanMuscles.length} nhóm chính</span>
              </div>
              <div className="space-y-3">
                {topPlanMuscles.length > 0 ? topPlanMuscles.map(([muscle, count]) => {
                  const pct = scheduleExercises.length ? Math.round((count / scheduleExercises.length) * 100) : 0;
                  return (
                    <div key={muscle}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-900">{muscle}</span>
                        <span className="font-bold text-teal-800">{pct}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white">
                        <div className="h-full rounded-full bg-teal-700" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                }) : (
                  <p className="text-sm text-slate-700">Chưa đủ dữ liệu nhóm cơ để phân tích.</p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-teal-100 bg-[linear-gradient(135deg,#f0fdfa,#ffffff_62%,#fff7ed)] p-4 text-slate-950 dark:border-teal-400/20 dark:bg-[linear-gradient(135deg,#0f2a28,#111827_62%,#1f1a12)] dark:text-slate-50">
              <p className="text-xs font-bold text-teal-700">Mục tiêu hoàn thành kế hoạch</p>
              <div className="mt-3 flex items-end justify-between gap-3">
                <span className="font-grotesk text-4xl font-bold">{planCompletion}%</span>
                <span className="pb-1 text-xs font-semibold text-slate-700">mục tiêu 100%</span>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-teal-100">
                <div className="h-full rounded-full bg-teal-700" style={{ width: `${planCompletion}%` }} />
              </div>
              <p className="mt-3 text-xs leading-relaxed text-slate-700">
                Cần thêm {remainingPlanPercent}% tiến độ để hoàn tất kế hoạch hiện tại.
              </p>
            </div>
          </div>
        </section>
      )}

          {/* Body condition report */}
          {(recentWeights.length > 0 || nutritionSeries.some(pt => pt.calories > 0) || caloriesConsumedToday > 0 || caloriesBurnedToday > 0) && (
          <section className="rounded-[18px] border border-slate-200 bg-white p-5">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-teal-700">Báo cáo thể trạng</p>
                <h3 className="mt-1 font-grotesk text-lg font-bold text-slate-950">Cân nặng và kcal hằng ngày</h3>
              </div>
              <div className="rounded-xl bg-slate-100 px-3 py-2 text-right">
                <p className="text-[11px] font-semibold text-slate-700">Cân nặng hiện tại</p>
                <p className="font-grotesk text-xl font-bold text-slate-950">
                  {currentWeight != null ? `${currentWeight.toFixed(1)} kg` : '--'}
                </p>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-slate-950">Xu hướng cân nặng</p>
                      <p className="mt-0.5 text-xs text-slate-700">
                        {weightDelta == null
                          ? 'Cần ít nhất 2 lần đo để thấy xu hướng'
                          : `${weightDelta > 0 ? '+' : ''}${weightDelta} kg so với mốc đầu`}
                      </p>
                    </div>
                    <Activity className="h-5 w-5 text-teal-700" />
                  </div>

                  <div className="h-28 rounded-xl bg-white p-3">
                    {recentWeights.length >= 2 ? (
                      <svg viewBox="0 0 260 88" className="h-full w-full" role="img" aria-label="Biểu đồ cân nặng">
                        <polyline
                          points={weightPoints}
                          fill="none"
                          stroke="#0f766e"
                          strokeWidth="4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        {recentWeights.map((point, index) => {
                          const coords = sparklinePoints(recentWeights.map(item => Number(item.weightKg || 0))).split(' ')[index]?.split(',') || ['0', '0'];
                          return <circle key={`${point.recordedAt}-${index}`} cx={coords[0]} cy={coords[1]} r="3.5" fill="#0f766e" />;
                        })}
                      </svg>
                    ) : (
                      <div className="flex h-full items-center justify-center text-center text-xs font-semibold text-slate-600">
                        Chưa đủ dữ liệu cân nặng
                      </div>
                    )}
                  </div>

                  <div className="mt-3 flex justify-between text-[11px] font-semibold text-slate-700">
                    <span>{formatShortDate(recentWeights[0]?.recordedAt)}</span>
                    <span>{formatShortDate(recentWeights[recentWeights.length - 1]?.recordedAt)}</span>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-slate-950">Kcal tiêu thụ 7 ngày</p>
                      <p className="mt-0.5 text-xs text-slate-700">
                        Trung bình {calorieAverage.toLocaleString('vi-VN')} kcal/ngày
                      </p>
                    </div>
                    <Flame className="h-5 w-5 text-orange-600" />
                  </div>

                  <div className="h-28 rounded-xl bg-white p-3">
                    {nutritionSeries.some(point => point.calories > 0) ? (
                      <svg viewBox="0 0 260 88" className="h-full w-full" role="img" aria-label="Biểu đồ kcal tiêu thụ">
                        <polyline
                          points={caloriePoints}
                          fill="none"
                          stroke="#ea580c"
                          strokeWidth="4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        {nutritionSeries.map((point, index) => {
                          const coords = caloriePoints.split(' ')[index]?.split(',') || ['0', '0'];
                          return <circle key={point.date} cx={coords[0]} cy={coords[1]} r="3.5" fill="#ea580c" />;
                        })}
                      </svg>
                    ) : (
                      <div className="flex h-full items-center justify-center text-center text-xs font-semibold text-slate-600">
                        Chưa có log kcal dinh dưỡng
                      </div>
                    )}
                  </div>

                  <div className="mt-3 flex justify-between text-[11px] font-semibold text-slate-700">
                    <span>{nutritionSeries[0]?.label}</span>
                    <span>{nutritionSeries[nutritionSeries.length - 1]?.label}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-orange-100 bg-[linear-gradient(135deg,#fff7ed_0%,#ffffff_54%,#ecfdf5_100%)] p-4 dark:border-orange-400/20 dark:bg-[linear-gradient(135deg,#271b10_0%,#111827_54%,#0f2a28_100%)]">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-orange-700">Hôm nay</p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-orange-100 bg-white/72 px-3 py-2">
                    <p className="text-[11px] font-semibold text-slate-700">Kcal nạp</p>
                    <p className="mt-1 font-grotesk text-xl font-bold text-slate-950">{caloriesConsumedToday.toLocaleString('vi-VN')}</p>
                  </div>
                  <div className="rounded-xl border border-teal-100 bg-white/72 px-3 py-2">
                    <p className="text-[11px] font-semibold text-slate-700">Kcal đốt</p>
                    <p className="mt-1 font-grotesk text-xl font-bold text-slate-950">{caloriesBurnedToday.toLocaleString('vi-VN')}</p>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">So với mục tiêu kcal</span>
                    <span className="font-bold text-slate-950">
                      {caloriesGoalToday > 0 ? `${Math.min(100, Math.round((caloriesConsumedToday / caloriesGoalToday) * 100))}%` : '--'}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-orange-100">
                    <div
                      className="h-full rounded-full bg-orange-400"
                      style={{ width: `${caloriesGoalToday > 0 ? Math.min(100, Math.round((caloriesConsumedToday / caloriesGoalToday) * 100)) : 0}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-slate-700">
                    {caloriesGoalToday > 0
                      ? `Mục tiêu ngày: ${caloriesGoalToday.toLocaleString('vi-VN')} kcal.`
                      : 'Chưa có mục tiêu kcal ngày từ hồ sơ dinh dưỡng.'}
                  </p>
                </div>
              </div>
            </div>
          </section>
          )}
        </div>
      )}
    </div>
  );
}

export default memo(TrainingView);
