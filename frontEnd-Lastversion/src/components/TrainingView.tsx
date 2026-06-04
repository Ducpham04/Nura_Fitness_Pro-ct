import { useState, useEffect, useCallback, memo, type ChangeEvent } from 'react';
import {
  Play,
  X,
  Check,
  AlertTriangle,
  Camera,
  Volume2,
  VolumeX,
  Loader2,
  Dumbbell,
  Shield,
  Timer,
  Flame,
  Target,
  Activity,
  CalendarDays,
  RotateCcw,
  Video,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Search,
  X as XIcon,
  Scale,
  Moon,
  Lightbulb,
  ShieldAlert,
} from 'lucide-react';
import { useAuthContext } from '../context/AuthContext';
import { trainingService, type DailyTrainingLog, type PersonalizedWorkoutExercise, type AlternativeExercise } from '../services/trainingService';
import { aiService } from '../services/aiService';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import CyberpunkWorkoutModal from './CyberpunkWorkoutModal';
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
    sets: `${targetSets}x${targetReps}`,
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

const difficultyTone = (difficulty?: string) => {
  const value = (difficulty || '').toLowerCase();
  if (value.includes('hard') || value.includes('advanced')) return 'text-warning bg-warning/10 border-warning/20';
  if (value.includes('medium') || value.includes('intermediate')) return 'text-electric bg-electric/10 border-electric/20';
  return 'text-lime bg-lime/10 border-lime/20';
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

const PHASE_VI: Record<string, string> = {
  'Foundation': 'Nền tảng', 'Strength': 'Sức mạnh', 'Endurance': 'Sức bền',
  'Hypertrophy': 'Tăng cơ', 'Power': 'Sức mạnh bùng nổ', 'Recovery': 'Phục hồi',
};

/**
 * Smart video player — embeds YouTube inline, or shows a fallback link for other URLs.
 */
const ExerciseVideoPlayer = memo(({ videoUrl, name, defaultExpanded = false }: { videoUrl: string; name: string; defaultExpanded?: boolean }) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  // Extract YouTube video ID from embed URL, watch URL, or short URL
  const getYouTubeId = (url: string): string | null => {
    const patterns = [
      /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
      /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    ];
    for (const p of patterns) {
      const m = url.match(p);
      if (m) return m[1];
    }
    return null;
  };

  const ytId = getYouTubeId(videoUrl);
  const embedUrl = ytId
    ? `https://www.youtube.com/embed/${ytId}?autoplay=0&rel=0&modestbranding=1`
    : null;

  if (!embedUrl) {
    return (
      <a
        href={videoUrl}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.06] px-4 py-2.5 text-neutral-300 hover:text-white text-sm transition-colors"
      >
        <Video className="w-4 h-4 text-blue-400 shrink-0" />
        <span>Video hướng dẫn</span>
        <ArrowRight className="w-3.5 h-3.5 ml-auto" />
      </a>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden border border-white/[0.07]">
      {!expanded ? (
        <button
          onClick={() => setExpanded(true)}
          className="w-full flex items-center gap-2 bg-white/[0.06] px-4 py-2.5 text-neutral-300 hover:text-white text-sm transition-colors hover:bg-white/[0.06]"
        >
          <div className="w-7 h-7 rounded-lg bg-red-600/80 flex items-center justify-center flex-shrink-0">
            <Play className="w-3.5 h-3.5 text-white fill-white" />
          </div>
          <span className="font-medium">Xem video hướng dẫn</span>
          <ArrowRight className="w-3.5 h-3.5 ml-auto opacity-50" />
        </button>
      ) : (
        <div className="relative">
          <iframe
            src={embedUrl}
            title={`${name} tutorial`}
            className="w-full aspect-video"
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
          <button
            onClick={() => setExpanded(false)}
            className="absolute top-2 right-2 w-7 h-7 bg-black/70 rounded-full flex items-center justify-center text-white hover:bg-black/90 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
});

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
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-10 text-center">
      <div className="w-12 h-12 rounded-2xl bg-lime/10 border border-lime/20 flex items-center justify-center mx-auto mb-4">
        <Dumbbell className="w-6 h-6 text-lime" />
      </div>
      <h3 className="font-grotesk font-bold text-white text-lg mb-2">Chưa có lịch tập</h3>
      <p className="text-neutral-400 text-sm mb-6 max-w-md mx-auto">
        {activePlanId
          ? 'Plan của bạn đã được tạo nhưng lịch tập cá nhân chưa được sinh. Nhấn bên dưới để tạo.'
          : 'Bạn chưa có chương trình tập. Tạo kế hoạch AI cá nhân hóa theo mục tiêu, thể trạng & thiết bị của bạn để bắt đầu.'}
      </p>
      {msg && <p className="text-lime text-xs mb-4 animate-pulse">{msg}</p>}
      <div className="flex flex-wrap gap-3 justify-center">
        {activePlanId ? (
          <button
            onClick={tryRegenerate}
            disabled={regenerating}
            className="btn-lime px-5 py-2.5 text-sm inline-flex items-center gap-2 disabled:opacity-60"
          >
            {regenerating
              ? <><div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />Đang tạo...</>
              : <><RefreshCw className="w-4 h-4" />Tạo lịch tập ngay</>
            }
          </button>
        ) : (
          <button onClick={onCreatePlan} className="btn-lime px-5 py-2.5 text-sm inline-flex items-center gap-2">
            <Sparkles className="w-4 h-4" />Tạo kế hoạch AI
          </button>
        )}
        <button onClick={onRetry} className="px-5 py-2.5 text-sm border border-white/[0.08] rounded-xl text-neutral-400 hover:text-white inline-flex items-center gap-2 transition-colors">
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

interface PoseCorrection {
  issue?: string;
  cue?: string;
  severity?: string;
}

interface PoseAnalysisResult {
  exercise_type?: string;
  overall_score?: number;
  score?: number;
  risk_level?: string;
  confidence?: number;
  phase?: string;
  key_findings?: string[];
  corrections?: Array<PoseCorrection | string>;
  notes?: string;
}

const poseRiskTone = (risk?: string) => {
  const value = (risk || '').toLowerCase();
  if (value === 'high') return 'text-red-300 border-red-400/30 bg-red-400/10';
  if (value === 'medium') return 'text-yellow-300 border-yellow-400/30 bg-yellow-400/10';
  return 'text-lime border-lime/25 bg-lime/10';
};

function TrainingView() {
  const { user } = useAuthContext();
  const { i18n } = useTranslation();

  // ── Swap exercise state ──────────────────────────────────────────────────
  const [showSwap, setShowSwap] = useState(false);
  const [alternatives, setAlternatives] = useState<AlternativeExercise[]>([]);
  const [altLoading, setAltLoading] = useState(false);
  const [altMuscleFilter, setAltMuscleFilter] = useState('');
  const [swapping, setSwapping] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [sessionData, setSessionData] = useState<SessionData>({ reps: 0, caloriesBurned: 0, avgRepTime: 0 });
  const [formAlert, setFormAlert] = useState<string | null>(null);
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
  const [activePlan, setActivePlan] = useState<any>(null);
  const [generatingNextWeek, setGeneratingNextWeek] = useState(false);
  const [adaptingNextWeek, setAdaptingNextWeek] = useState(false);
  const [poseChecking, setPoseChecking] = useState(false);
  const [poseResult, setPoseResult] = useState<PoseAnalysisResult | null>(null);
  const [poseError, setPoseError] = useState<string | null>(null);
  // Check-in sau buổi tập: độ mệt mỏi (1-5), độ khó RPE (1-10), giấc ngủ (giờ)
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [savingCheckIn, setSavingCheckIn] = useState(false);
  const [checkIn, setCheckIn] = useState<{ fatigue: number; rpe: number; sleep: string }>({ fatigue: 0, rpe: 0, sleep: '' });
  // Modal tạo kế hoạch AI (gộp từ tab "Kế Hoạch Tập" cũ)
  const [aiPlanModalOpen, setAiPlanModalOpen] = useState(false);
  // Thông tin cá nhân hóa hiển thị sau khi tạo plan (kiến thức + cảnh báo y khoa)
  const [planInsight, setPlanInsight] = useState<{ rationale: string; disclaimer: string; riskTier: string; notes: string[] } | null>(null);

  const loadTrainingSchedule = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const trainings = await trainingService.getUserTraining(user.id);
      const list = Array.isArray(trainings) ? trainings : [];
      const activeTraining = list.find((t: any) =>
        t.status === 'ACTIVE' || t.status === 'active' || t.status === 'IN_PROGRESS'
      ) || list[0];
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
      const dayExercises = mapped.filter(ex => ex.dayNumber === dayNumber);
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

  // Rest countdown timer
  useEffect(() => {
    if (!isResting || restCountdown <= 0) return;
    const t = setTimeout(() => {
      setRestCountdown(c => {
        if (c <= 1) { setIsResting(false); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearTimeout(t);
  }, [isResting, restCountdown]);

  // Mở panel đổi bài, load alternatives ngay lập tức
  const openSwap = async (ex: TrainingExercise) => {
    setShowSwap(true);
    setAltMuscleFilter('');
    setAlternatives([]);
    setAltLoading(true);
    try {
      const list = await trainingService.getAlternativeExercises(ex.id);
      setAlternatives(list);
    } catch {
      toast.error('Không tải được danh sách bài thay thế');
    } finally {
      setAltLoading(false);
    }
  };

  // Filter alternatives theo nhóm cơ người dùng nhập
  const filterAlternatives = async (muscle: string) => {
    setAltMuscleFilter(muscle);
    if (!panelExercise) return;
    setAltLoading(true);
    try {
      const list = await trainingService.getAlternativeExercises(
        panelExercise.id,
        muscle.trim() || undefined
      );
      setAlternatives(list);
    } catch {
      toast.error('Không tải được danh sách bài tập');
    } finally {
      setAltLoading(false);
    }
  };

  // Xác nhận đổi bài
  const confirmSwap = async (alt: AlternativeExercise) => {
    if (!panelExercise || swapping) return;
    setSwapping(true);
    try {
      const res = await trainingService.swapExercise(panelExercise.id, alt.id);
      if (res?.success !== false) {
        toast.success(`Đã đổi sang "${i18n.language === 'vi' && alt.nameVi ? alt.nameVi : alt.name}"`);
        setShowSwap(false);
        // Reload lịch tập để cập nhật UI
        setLoading(true);
        const newList = await trainingService.getPersonalizedSchedule(user?.id);
        const planId = activePlan?.id;
        const completed = new Set<string>(
          scheduleExercises.filter(e => e.done).map(e => `${e.dayNumber}:${e.exerciseId}`)
        );
        const mapped = newList.map(e =>
          mapPersonalizedExercise(e, planId ? Number(planId) : undefined, completed, i18n.language)
        );
        setScheduleExercises(mapped);
        setActiveExercise(null);
        setLoading(false);
      } else {
        toast.error(res?.message || 'Đổi bài thất bại');
      }
    } catch {
      toast.error('Lỗi khi đổi bài tập');
    } finally {
      setSwapping(false);
    }
  };

  const startSession = (ex: TrainingExercise) => {
    setActiveExercise(ex);
    setCameraActive(true);
    setSessionData({ reps: 0, caloriesBurned: 0, avgRepTime: 0 });
    setFormAlert(null);
    setSaveError(null);
    setCurrentSet(0);
    setSessionTime(0);
    setIsResting(false);
    setRestCountdown(0);
    setCurrentRepInput(ex.targetReps || 0);
    setPoseResult(null);
    setPoseError(null);
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
  ) => {
    if (!user || !activeExercise?.trainingPlanId || !activeExercise.dayNumber || !activeExercise.exerciseId) return false;

    const response = await trainingService.saveTrainingLog(user.id, {
      trainingPlanId: activeExercise.trainingPlanId,
      dayNumber: activeExercise.dayNumber,
      exerciseId: activeExercise.exerciseId,
      status: markDone ? 'COMPLETED' : 'IN_PROGRESS',
      analysisData: {
        repsCompleted: sessionData.reps,
        setsCompleted: currentSet,
        actualDurationMinutes: Math.max(1, Math.round(sessionTime / 60)),
        // Gửi estimatedCalories để backend dùng khi tính kcal đã đốt
        caloriesBurned: activeExercise.estimatedCalories || 0,
        ...(extra?.fatigueLevel ? { fatigueLevel: extra.fatigueLevel } : {}),
        ...(extra?.perceivedDifficulty ? { perceivedDifficulty: extra.perceivedDifficulty } : {}),
        ...(extra?.sleepHours != null ? { sleepHours: extra.sleepHours } : {}),
      },
    });

    if (!response.success) {
      setSaveError(response.error?.message || 'Could not save training log');
      return false;
    }

    if (markDone) {
      setScheduleExercises(prev =>
        prev.map(ex => ex.id === activeExercise.id ? { ...ex, done: true } : ex)
      );
    }

    // Thông báo Dashboard cập nhật sau khi tập xong
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
    return true;
  };

  /** Xác nhận check-in → lưu kèm dữ liệu phục hồi. */
  const submitCheckIn = async () => {
    setSavingCheckIn(true);
    const sleepNum = parseFloat(checkIn.sleep);
    const ok = await persistTrainingLog(true, {
      fatigueLevel: checkIn.fatigue || undefined,
      perceivedDifficulty: checkIn.rpe || undefined,
      sleepHours: !isNaN(sleepNum) && sleepNum > 0 ? sleepNum : undefined,
    });
    setSavingCheckIn(false);
    if (ok) setShowCheckIn(false);
  };

  const analyzePoseSnapshot = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !user || !activeExercise || poseChecking) return;

    setPoseChecking(true);
    setPoseError(null);
    try {
      const exerciseType = activeExercise.exerciseType || activeExercise.name;
      const response = await aiService.analyzePose(user.id, file, exerciseType);
      const body = response.data as any;
      if (!response.success || body?.success === false) {
        throw new Error(body?.message || response.error?.message || 'Không thể phân tích form');
      }
      setPoseResult((body?.data ?? body) as PoseAnalysisResult);
    } catch (error) {
      setPoseError(error instanceof Error ? error.message : 'Không thể phân tích form');
    } finally {
      setPoseChecking(false);
    }
  };

  /**
   * Làm lại bài đã hoàn thành — reset done state và mở lại session.
   */
  const replayExercise = (ex: TrainingExercise) => {
    setScheduleExercises(prev =>
      prev.map(e => e.id === ex.id ? { ...e, done: false } : e)
    );
    startSession({ ...ex, done: false });
  };

  const completeSet = () => {
    if (!activeExercise) return;
    const targetSets = activeExercise.targetSets || 1;
    const repsThisSet = currentRepInput || activeExercise.targetReps || 0;
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

  const generateNextWeek = async () => {
    if (!activePlan?.id) {
      setSaveError('Không tìm thấy UserTraining ID để sinh tuần tiếp theo');
      return;
    }
    setGeneratingNextWeek(true);
    setSaveError(null);
    try {
      const response = await trainingService.generateNextWorkoutWeek(Number(activePlan.id));
      if (!response.success) {
        setSaveError(response.error?.message || (response as any).message || 'Không thể sinh tuần tiếp theo');
        return;
      }
      await loadTrainingSchedule();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Không thể sinh tuần tiếp theo');
    } finally {
      setGeneratingNextWeek(false);
    }
  };

  const autoRegulateNextWeek = async () => {
    if (!user || !activePlan?.id) {
      setSaveError('Không tìm thấy UserTraining ID để AI thích ứng tuần tiếp theo');
      return;
    }
    setAdaptingNextWeek(true);
    setSaveError(null);
    try {
      const response = await trainingService.autoRegulateNextWorkoutWeek(user.id, Number(activePlan.id));
      if (!response.success) {
        setSaveError(response.error?.message || (response as any).message || 'Không thể AI thích ứng tuần tiếp theo');
        return;
      }
      toast.success('AI đã cập nhật template và sinh tuần tiếp theo');
      await loadTrainingSchedule();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Không thể AI thích ứng tuần tiếp theo');
    } finally {
      setAdaptingNextWeek(false);
    }
  };

  if (cameraActive && activeExercise) {
    const formatTime = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
    const targetSets   = activeExercise.targetSets || parseInt(activeExercise.sets.split('x')[0]) || 3;
    const targetReps   = activeExercise.targetReps || parseInt(activeExercise.sets.split('x')[1]) || 10;
    const allSetsDone  = currentSet >= targetSets;
    const setProgress  = Math.round((currentSet / targetSets) * 100);
    const restPct      = activeExercise.restTime ? Math.round((restCountdown / activeExercise.restTime) * 100) : 0;
    const exerciseName = i18n.language === 'vi' ? (activeExercise as any).nameVi || activeExercise.name : activeExercise.name;
    const parsed       = parseNotes(activeExercise.notes);
    const movement     = translateMovement(activeExercise.exerciseType);
    const poseScore    = Math.round(Number(poseResult?.overall_score ?? poseResult?.score ?? 0));
    const poseRisk     = poseResult?.risk_level || 'low';
    const poseCorrections = (poseResult?.corrections || []).slice(0, 3);

    return (
      <div className="fixed inset-0 z-50 bg-[#080a0e] flex flex-col overflow-hidden animate-fade-in">

        {/* ── Top bar ── */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
          <button
            onClick={exitSessionOnly}
            className="w-9 h-9 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Session timer */}
          <div className="flex items-center gap-2 glass rounded-full px-4 py-1.5 border border-white/[0.07]">
            <div className="w-1.5 h-1.5 rounded-full bg-lime animate-pulse" />
            <span className="text-white font-grotesk font-bold text-sm tabular-nums">{formatTime(sessionTime)}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-neutral-500 text-xs">{activeExercise.estimatedCalories || 0}</span>
            <Flame className="w-3.5 h-3.5 text-orange-400" />
          </div>
        </div>

        {/* ── Exercise info ── */}
        <div className="px-5 pb-4 shrink-0">
          <div className="flex items-start gap-3">
            {activeExercise.imageUrl && (
              <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-white/[0.08]">
                <img src={activeExercise.imageUrl} alt={exerciseName} className="w-full h-full object-cover opacity-80" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h2 className="font-grotesk font-bold text-white text-xl leading-tight">{exerciseName}</h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-lime/15 text-lime border border-lime/25 font-semibold inline-flex items-center gap-1">
                  <Dumbbell className="w-3 h-3" /> {translateMuscle(activeExercise.muscle || '')}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] text-neutral-400 border border-white/[0.08]">
                  {movement.label}
                </span>
                {activeExercise.difficulty && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${difficultyTone(activeExercise.difficulty)}`}>
                    {activeExercise.difficulty === 'EASY' ? 'Dễ' : activeExercise.difficulty === 'HARD' ? 'Khó' : 'Trung bình'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Main content (scrollable) ── */}
        <div className="flex-1 overflow-y-auto px-5 space-y-4 pb-4">

          {/* VIDEO HƯỚNG DẪN — tự mở khi vào bài */}
          {activeExercise.videoUrl && (
            <ExerciseVideoPlayer
              videoUrl={activeExercise.videoUrl}
              name={exerciseName}
              defaultExpanded={true}
            />
          )}

          {/* AI FORM CHECK — snapshot-based vision analysis */}
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 flex items-center gap-1.5">
                  <Shield className="w-3 h-3 text-lime" /> AI form check
                </p>
                <p className="text-neutral-500 text-xs mt-1">Chấm nhanh từ ảnh snapshot của bài đang tập.</p>
              </div>
              <input
                id={`pose-upload-${activeExercise.id}`}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={analyzePoseSnapshot}
                disabled={poseChecking}
              />
              <label
                htmlFor={`pose-upload-${activeExercise.id}`}
                className={`h-9 px-3 rounded-xl border text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all shrink-0 ${
                  poseChecking
                    ? 'border-white/[0.08] bg-white/[0.04] text-neutral-600 pointer-events-none'
                    : 'border-lime/25 bg-lime/10 text-lime hover:bg-lime/15 cursor-pointer'
                }`}
              >
                {poseChecking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                Kiểm tra
              </label>
            </div>

            {poseError && (
              <div className="mt-3 rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-xs text-red-200">
                {poseError}
              </div>
            )}

            {poseResult && (
              <div className="mt-3 space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-xl bg-black/20 p-2 text-center">
                    <div className="text-lg font-grotesk font-bold text-white">{poseScore}</div>
                    <div className="text-[9px] uppercase tracking-wider text-neutral-600">Score</div>
                  </div>
                  <div className={`rounded-xl border p-2 text-center ${poseRiskTone(poseRisk)}`}>
                    <div className="text-xs font-bold uppercase">{poseRisk}</div>
                    <div className="text-[9px] uppercase tracking-wider opacity-70">Risk</div>
                  </div>
                  <div className="rounded-xl bg-black/20 p-2 text-center">
                    <div className="text-xs font-bold text-white">{Math.round(Number(poseResult.confidence ?? 0) * 100)}%</div>
                    <div className="text-[9px] uppercase tracking-wider text-neutral-600">Tin cậy</div>
                  </div>
                </div>

                {!!poseCorrections.length && (
                  <div className="space-y-1.5">
                    {poseCorrections.map((item, idx) => {
                      const correction = typeof item === 'string' ? { issue: item } : item;
                      return (
                        <div key={`${correction.issue}-${idx}`} className="rounded-xl border border-white/[0.06] bg-black/10 px-3 py-2">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="w-3.5 h-3.5 text-yellow-300 mt-0.5 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs text-white">{correction.issue || 'Cần chỉnh kỹ thuật'}</p>
                              {correction.cue && <p className="text-[11px] text-neutral-500 mt-0.5">{correction.cue}</p>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SET PROGRESS */}
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Tiến độ set</span>
              <span className="text-white font-grotesk font-bold text-sm">
                {currentSet} / {targetSets} set
              </span>
            </div>
            {/* Set dots */}
            <div className="flex items-center gap-2 mb-3">
              {Array.from({ length: targetSets }).map((_, i) => (
                <div
                  key={i}
                  className={`h-2 flex-1 rounded-full transition-all duration-500 ${
                    i < currentSet
                      ? 'bg-lime shadow-[0_0_8px_rgba(204,255,0,0.4)]'
                      : i === currentSet
                      ? 'bg-white/20 animate-pulse'
                      : 'bg-white/[0.06]'
                  }`}
                />
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-neutral-600">
              {Array.from({ length: targetSets }).map((_, i) => (
                <span key={i} className={i < currentSet ? 'text-lime font-bold' : ''}>S{i + 1}</span>
              ))}
            </div>
          </div>

          {/* REST TIMER — hiện khi đang nghỉ */}
          {isResting && (
            <div className="rounded-2xl border border-blue-500/30 bg-blue-500/[0.06] p-5 text-center relative overflow-hidden">
              {/* Circular countdown */}
              <div className="relative w-24 h-24 mx-auto mb-3">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 96 96">
                  <circle cx="48" cy="48" r="40" fill="none" stroke="rgba(59,130,246,0.15)" strokeWidth="6" />
                  <circle
                    cx="48" cy="48" r="40" fill="none"
                    stroke="#3B82F6" strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 40}`}
                    strokeDashoffset={`${2 * Math.PI * 40 * (1 - restPct / 100)}`}
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-blue-400 font-grotesk font-bold text-2xl tabular-nums">{restCountdown}</span>
                  <span className="text-blue-400/60 text-[9px] uppercase tracking-widest">giây</span>
                </div>
              </div>
              <p className="text-blue-300 font-semibold text-sm">Nghỉ giữa set</p>
              <p className="text-blue-400/60 text-xs mt-0.5">Chuẩn bị cho Set {currentSet + 1}</p>
              <button
                onClick={() => setIsResting(false)}
                className="mt-3 text-[10px] text-blue-400/60 hover:text-blue-300 underline underline-offset-2 transition-colors"
              >
                Bỏ qua
              </button>
            </div>
          )}

          {/* REP INPUT — cho set hiện tại */}
          {!isResting && !allSetsDone && (
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5">
              <div className="text-center mb-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-1">
                  Set {currentSet + 1} — Số rep thực hiện
                </p>
                <p className="text-neutral-600 text-xs">Mục tiêu: <span className="text-lime font-bold">{targetReps} rep</span></p>
              </div>

              {/* Big rep display with +/- */}
              <div className="flex items-center justify-center gap-6 mb-5">
                <button
                  onClick={() => setCurrentRepInput(r => Math.max(0, r - 1))}
                  className="w-12 h-12 rounded-xl bg-white/[0.06] border border-white/[0.08] text-white text-xl font-bold flex items-center justify-center hover:bg-white/[0.1] active:scale-95 transition-all"
                >−</button>

                <div className="text-center">
                  <div
                    className="font-grotesk font-bold text-white leading-none"
                    style={{ fontSize: '72px', textShadow: currentRepInput >= targetReps ? '0 0 25px rgba(204,255,0,0.5)' : 'none' }}
                  >
                    <span className={currentRepInput >= targetReps ? 'text-lime' : 'text-white'}>{currentRepInput}</span>
                  </div>
                  <div className="text-neutral-600 text-xs uppercase tracking-widest mt-1">rep</div>
                </div>

                <button
                  onClick={() => setCurrentRepInput(r => r + 1)}
                  className="w-12 h-12 rounded-xl bg-white/[0.06] border border-white/[0.08] text-white text-xl font-bold flex items-center justify-center hover:bg-white/[0.1] active:scale-95 transition-all"
                >+</button>
              </div>

              {/* Quick presets */}
              <div className="flex gap-2 justify-center">
                {[targetReps - 2, targetReps, targetReps + 2].filter(n => n > 0).map(n => (
                  <button
                    key={n}
                    onClick={() => setCurrentRepInput(n)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                      currentRepInput === n
                        ? 'bg-lime/20 border-lime/40 text-lime'
                        : 'bg-white/[0.04] border-white/[0.08] text-neutral-500 hover:text-white'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ALL SETS DONE — summary */}
          {allSetsDone && (
            <div className="rounded-2xl border border-lime/30 bg-lime/[0.06] p-5 text-center">
              <div className="w-12 h-12 rounded-full bg-lime/15 flex items-center justify-center mx-auto mb-2">
                <Check className="w-6 h-6 text-lime" />
              </div>
              <p className="text-lime font-grotesk font-bold text-lg">Hoàn thành!</p>
              <p className="text-neutral-400 text-sm mt-1">
                {targetSets} set · {sessionData.reps} rep · {formatTime(sessionTime)}
              </p>
              <div className="flex justify-center gap-4 mt-3 text-xs text-neutral-500">
                <span className="inline-flex items-center gap-1"><Flame className="w-3 h-3" /> {activeExercise.estimatedCalories || 0} kcal</span>
                {activeExercise.muscle && <span className="inline-flex items-center gap-1"><Dumbbell className="w-3 h-3" /> {translateMuscle(activeExercise.muscle)}</span>}
              </div>
            </div>
          )}

          {/* Tips — hướng dẫn nhanh */}
          {parsed.benefit && !allSetsDone && (
            <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-600 mb-1 flex items-center gap-1.5">
                <Activity className="w-3 h-3" /> Lợi ích
              </p>
              <p className="text-neutral-500 text-xs leading-relaxed">{parsed.benefit}</p>
              {parsed.tempo && parsed.tempo !== 'N/A' && (
                <p className="text-neutral-600 text-xs mt-1.5 flex items-center gap-1.5">
                  <Timer className="w-3 h-3" /> Nhịp độ: <span className="text-neutral-400 font-mono">{parsed.tempo}</span> (xuống – dừng – lên)
                </p>
              )}
            </div>
          )}

          {/* Equipment */}
          {activeExercise.equipment && (
            <div className="flex items-center justify-between rounded-xl border border-white/[0.05] bg-white/[0.02] px-4 py-2.5 text-sm">
              <span className="text-neutral-500 text-xs">Dụng cụ</span>
              <span className="text-white text-xs font-medium inline-flex items-center gap-1.5">
                {activeExercise.equipment.toUpperCase() === 'BODYWEIGHT'
                  ? <><Activity className="w-3.5 h-3.5" /> Tự trọng</>
                  : <><Dumbbell className="w-3.5 h-3.5" /> {formatEnumLabel(activeExercise.equipment)}</>}
              </span>
            </div>
          )}
          {activeExercise.recommendedWeight && (
            <div className="flex items-center justify-between rounded-xl border border-cyan-500/20 bg-cyan-500/[0.04] px-4 py-2.5">
              <span className="text-neutral-500 text-xs inline-flex items-center gap-1.5"><Scale className="w-3.5 h-3.5" /> Tạ gợi ý</span>
              <span className="text-cyan-400 text-xs font-semibold">{activeExercise.recommendedWeight}</span>
            </div>
          )}
        </div>

        {/* ── Bottom action buttons ── */}
        <div className="px-5 pb-6 pt-3 space-y-2.5 shrink-0 border-t border-white/[0.05] bg-[#080a0e]">
          {allSetsDone ? (
            /* Xong tất cả set → nút hoàn thành bài (lưu + mark done) */
            <button
              onClick={() => endSession(true)}
              className="w-full btn-lime py-4 text-sm font-grotesk font-bold rounded-2xl flex items-center justify-center gap-2.5 text-base"
            >
              <Check className="w-5 h-5" />
              Hoàn thành bài tập
            </button>
          ) : isResting ? (
            /* Đang nghỉ — cho phép bắt đầu set kế sớm */
            <button
              onClick={() => setIsResting(false)}
              className="w-full py-4 rounded-2xl font-grotesk font-bold text-sm border border-blue-500/40 text-blue-300 bg-blue-500/10 flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4" fill="currentColor" />
              Bắt đầu Set {currentSet + 1} ngay
            </button>
          ) : (
            /* Đang tập set — nút hoàn thành set */
            <button
              onClick={completeSet}
              className="w-full btn-lime py-4 rounded-2xl font-grotesk font-bold text-base flex items-center justify-center gap-2.5"
            >
              <Check className="w-5 h-5" />
              Hoàn thành Set {currentSet + 1} / {targetSets}
            </button>
          )}
          {/* Dừng & lưu tiến độ — chỉ khi đã làm ít nhất 1 set */}
          {!allSetsDone && currentSet > 0 && (
            <button
              onClick={() => endSession(false)}
              className="w-full py-2.5 rounded-xl text-xs text-neutral-600 hover:text-neutral-400 transition-colors"
            >
              Dừng & lưu tiến độ ({currentSet}/{targetSets} set)
            </button>
          )}
          {/* Thoát không lưu — khi chưa làm gì */}
          {!allSetsDone && currentSet === 0 && (
            <button
              onClick={exitSessionOnly}
              className="w-full py-2.5 rounded-xl text-xs text-neutral-600 hover:text-neutral-400 transition-colors"
            >
              Thoát không lưu
            </button>
          )}
        </div>
      </div>
    );
  }

  const totalScheduleDays = planDurationDays(activePlan, scheduleExercises);
  const visibleExercises = scheduleExercises.filter(ex => (ex.dayNumber || 1) === selectedDay);
  const completedCount = scheduleExercises.filter(ex => ex.done).length;
  const visibleCompletedCount = visibleExercises.filter(ex => ex.done).length;
  const progressPercent = scheduleExercises.length ? Math.round((completedCount / scheduleExercises.length) * 100) : 0;
  const visibleProgressPercent = visibleExercises.length ? Math.round((visibleCompletedCount / visibleExercises.length) * 100) : 0;
  const selectedDayIsRest = visibleExercises.length === 0;
  const nextExercise = visibleExercises.find(ex => !ex.done) || visibleExercises[0] || scheduleExercises.find(ex => !ex.done) || scheduleExercises[0] || null;
  // Panel detail dùng bài tập đang được chọn (activeExercise), fallback sang bài tiếp theo
  const panelExercise = activeExercise ?? nextExercise;
  const totalCalories = visibleExercises.reduce((sum, ex) => sum + (ex.estimatedCalories || 0), 0);
  const canGenerateNextWeek = activePlan?.weekNumber && activePlan?.totalWeeks
    ? Number(activePlan.weekNumber) < Number(activePlan.totalWeeks)
    : false;

  // Week navigator
  const weekSize = 7;

  // getDayDate cần được khai báo trước khi dùng ở getCalendarMondayPlanDay
  const getDayDateEarly = (dayNumber: number): Date | null => {
    const raw = activePlan?.startDate;
    if (!raw) return null;
    const start = new Date(raw);
    if (Number.isNaN(start.getTime())) return null;
    const d = new Date(start);
    d.setDate(d.getDate() + dayNumber - 1);
    return d;
  };

  // ── Calendar-aligned week (T2 → CN) ─────────────────────────────────────
  const getCalendarMondayPlanDay = (refDay: number): number => {
    const refDate = getDayDateEarly(refDay);
    if (!refDate || !activePlan?.startDate) {
      return Math.floor((refDay - 1) / weekSize) * weekSize + 1;
    }
    const dow = refDate.getDay(); // 0=CN, 1=T2 ... 6=T7
    const daysFromMon = dow === 0 ? 6 : dow - 1;
    const monday = new Date(refDate);
    monday.setDate(monday.getDate() - daysFromMon);
    const startDate = new Date(activePlan.startDate);
    const diffMs = monday.getTime() - startDate.getTime();
    const mondayPlanDay = Math.round(diffMs / 86400000) + 1;
    return mondayPlanDay;
  };

  const currentWeekStart = getCalendarMondayPlanDay(selectedDay);
  // 7 days T2→CN, clipped to [1, totalScheduleDays]
  const weekDays = Array.from({ length: weekSize }, (_, i) => currentWeekStart + i)
    .filter(d => d >= 1 && d <= totalScheduleDays);
  const canPrevWeek = currentWeekStart > 1;
  const canNextWeek = currentWeekStart + weekSize - 1 < totalScheduleDays;
  const currentWeekNum = Math.ceil(selectedDay / weekSize);
  const totalWeeksCount = Math.ceil(totalScheduleDays / weekSize);

  // Date helpers — map plan day number → real calendar date
  const VI_WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
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

  const formatDayPill = (dayNumber: number) => {
    const date = getDayDate(dayNumber);
    if (!date) return { weekday: `D${dayNumber}`, date: null };
    return {
      weekday: VI_WEEKDAYS[date.getDay()],
      date: `${date.getDate()}/${date.getMonth() + 1}`,
      dayNum: dayNumber,
    };
  };

  const formatSelectedDayLabel = (dayNumber: number) => {
    const date = getDayDate(dayNumber);
    if (!date) return `Ngày ${dayNumber}`;
    const weekdayFull = VI_WEEKDAYS_FULL[date.getDay()];
    return `Ngày ${dayNumber} · ${weekdayFull}, ${date.getDate()} tháng ${date.getMonth() + 1}`;
  };

  const formatWeekRange = () => {
    // Hiển thị T2 – CN của tuần calendar hiện tại
    const monDate = getDayDate(currentWeekStart);
    const lastDay = weekDays[weekDays.length - 1] ?? (currentWeekStart + weekSize - 1);
    const sunDate = getDayDate(lastDay);
    if (!monDate) return `Tuần ${currentWeekNum} / ${totalWeeksCount} · ${totalScheduleDays} ngày`;
    const monStr = `${monDate.getDate()}/${monDate.getMonth() + 1}`;
    const sunStr = sunDate ? `${sunDate.getDate()}/${sunDate.getMonth() + 1}` : '';
    return `Tuần ${currentWeekNum} / ${totalWeeksCount} · T2 ${monStr} – CN ${sunStr}`;
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

  const jumpToDay = (day: number) => {
    setSelectedDay(day);
    const dayExercises = scheduleExercises.filter(ex => (ex.dayNumber || 1) === day);
    const firstInDay = dayExercises.find(ex => !ex.done) || dayExercises[0] || null;
    if (firstInDay) setActiveExercise(firstInDay);
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* ── Modal tạo kế hoạch AI ── */}
      {aiPlanModalOpen && (
        <CyberpunkWorkoutModal
          onClose={() => setAiPlanModalOpen(false)}
          onSuccess={handleAiPlanSuccess}
        />
      )}

      {/* ── Modal check-in sau buổi tập (overlay toàn màn, độc lập với session) ── */}
      {showCheckIn && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0f1116] p-6 animate-fade-in">
            <div className="text-center mb-5">
              <div className="w-12 h-12 rounded-2xl bg-lime/10 flex items-center justify-center mx-auto mb-3">
                <Check className="w-6 h-6 text-lime" />
              </div>
              <h3 className="font-grotesk font-bold text-white text-lg">Hoàn thành! Ghi nhận cảm nhận</h3>
              <p className="text-neutral-500 text-xs mt-1">Giúp AI điều chỉnh kế hoạch & theo dõi phục hồi của bạn.</p>
            </div>

            {/* Độ mệt mỏi 1-5 */}
            <div className="mb-5">
              <label className="text-neutral-400 text-xs font-medium uppercase tracking-wider mb-2 block">Độ mệt mỏi</label>
              <div className="grid grid-cols-5 gap-2">
                {['Rất khỏe', 'Khỏe', 'Bình thường', 'Mệt', 'Kiệt sức'].map((lbl, i) => {
                  const val = i + 1;
                  return (
                    <button key={val} type="button" onClick={() => setCheckIn(c => ({ ...c, fatigue: val }))}
                      className={`py-2 rounded-xl border text-[10px] font-semibold leading-tight transition-all ${
                        checkIn.fatigue === val ? 'bg-lime/15 border-lime/40 text-lime' : 'bg-white/[0.04] border-white/10 text-neutral-400 hover:text-white'
                      }`}>
                      <span className="block text-sm">{val}</span>{lbl}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Độ khó RPE 1-10 */}
            <div className="mb-5">
              <label className="text-neutral-400 text-xs font-medium uppercase tracking-wider mb-2 block">
                Độ khó buổi tập (RPE) {checkIn.rpe > 0 && <span className="text-lime normal-case">· {checkIn.rpe}/10</span>}
              </label>
              <div className="grid grid-cols-10 gap-1">
                {Array.from({ length: 10 }, (_, i) => i + 1).map(val => (
                  <button key={val} type="button" onClick={() => setCheckIn(c => ({ ...c, rpe: val }))}
                    className={`py-2 rounded-lg border text-xs font-bold transition-all ${
                      checkIn.rpe === val ? 'bg-blue-500/20 border-blue-400/50 text-blue-300' : 'bg-white/[0.04] border-white/10 text-neutral-500 hover:text-white'
                    }`}>
                    {val}
                  </button>
                ))}
              </div>
            </div>

            {/* Giấc ngủ đêm qua */}
            <div className="mb-6">
              <label className="text-neutral-400 text-xs font-medium uppercase tracking-wider mb-2 block">Giấc ngủ đêm qua (tùy chọn)</label>
              <div className="relative">
                <input type="number" step={0.5} min={0} max={14} value={checkIn.sleep}
                  onChange={e => setCheckIn(c => ({ ...c, sleep: e.target.value }))}
                  placeholder="VD: 7.5"
                  className="w-full bg-white/[0.06] border border-white/10 rounded-2xl px-4 pr-16 py-3 text-white focus:outline-none focus:border-lime/40" />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 text-sm">giờ</span>
              </div>
            </div>

            <button onClick={submitCheckIn} disabled={savingCheckIn}
              className="w-full btn-lime py-3.5 rounded-2xl text-sm font-grotesk font-bold flex items-center justify-center gap-2 disabled:opacity-50">
              {savingCheckIn ? 'Đang lưu...' : 'Lưu & hoàn thành'}
              {!savingCheckIn && <Check className="w-4 h-4" />}
            </button>
            <button onClick={submitCheckIn} disabled={savingCheckIn}
              className="w-full py-2.5 mt-1 text-xs text-neutral-600 hover:text-neutral-400 transition-colors">
              Bỏ qua bước này
            </button>
          </div>
        </div>
      )}

      {/* ── Hero ── */}
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.06]">
        <img
          src="https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=1400&q=80"
          alt="" aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-black via-black/85 to-black/45" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent" />

        <div className="relative p-6 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-lime text-[11px] font-bold uppercase tracking-[0.28em] mb-2">
                <Activity className="w-3.5 h-3.5" /> Tập luyện
              </div>
              <h2 className="font-grotesk font-bold italic uppercase text-white text-3xl sm:text-[2.4rem] leading-[0.9] tracking-tight">
                Lịch tập cá nhân
              </h2>
              {activePlan?.name && (
                <p className="text-neutral-300 text-sm mt-2 truncate max-w-md">
                  {displayPlanName(activePlan.name)} · Tuần {activePlan.weekNumber || currentWeekNum}/{activePlan.totalWeeks || totalWeeksCount}
                </p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={() => setAiPlanModalOpen(true)}
                className="rounded-xl bg-lime border border-lime px-3.5 py-2 text-black text-xs font-bold hover:bg-lime/90 transition-colors flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{activePlan ? 'Tạo lại bằng AI' : 'Tạo kế hoạch AI'}</span>
                <span className="sm:hidden">AI</span>
              </button>
              <button
                onClick={() => window.location.reload()}
                className="rounded-xl border border-white/15 bg-white/5 backdrop-blur px-3 py-2 text-neutral-200 text-xs font-medium hover:text-white hover:border-white/30 transition-colors flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tải lại</span>
              </button>
            </div>
          </div>

          {/* Stat badges */}
          <div className="flex flex-wrap items-center gap-2.5 mt-5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 backdrop-blur border border-white/15 px-3 py-1.5 text-xs text-neutral-200">
              <Check className="w-3.5 h-3.5 text-lime" />
              <span className="text-white font-bold">{completedCount}/{scheduleExercises.length}</span> bài hoàn thành
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 backdrop-blur border border-white/15 px-3 py-1.5 text-xs text-neutral-200">
              <Flame className="w-3.5 h-3.5 text-orange-400" />
              <span className="text-white font-bold">{totalCalories}</span> kcal hôm nay
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-lime/15 backdrop-blur border border-lime/30 px-3 py-1.5 text-xs text-lime font-bold">
              <Target className="w-3.5 h-3.5" />
              {progressPercent}% tiến độ
            </span>
          </div>

          {/* Progress bar + next-week actions */}
          {activePlan && (
            <div className="mt-4">
              <div className="h-1.5 bg-white/15 rounded-full overflow-hidden">
                <div
                  className="h-full bg-lime rounded-full transition-all duration-700"
                  style={{ width: `${activePlan.completionPercentage ?? progressPercent}%` }}
                />
              </div>
              {canGenerateNextWeek && (
                <div className="flex flex-wrap gap-2 mt-3">
                  <button
                    onClick={autoRegulateNextWeek}
                    disabled={adaptingNextWeek || generatingNextWeek}
                    className="rounded-xl border border-lime/30 bg-lime/15 backdrop-blur px-3 py-2 text-lime text-xs font-semibold hover:bg-lime/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors"
                  >
                    {adaptingNextWeek ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    AI thích ứng
                  </button>
                  <button
                    onClick={generateNextWeek}
                    disabled={generatingNextWeek || adaptingNextWeek}
                    className="rounded-xl border border-white/15 bg-white/5 backdrop-blur px-3 py-2 text-neutral-200 text-xs font-semibold hover:text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors"
                  >
                    {generatingNextWeek ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CalendarDays className="w-3.5 h-3.5" />}
                    Tuần tiếp theo
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Kiến thức buổi tập + cảnh báo y khoa (sau khi tạo plan) ── */}
      {planInsight && (planInsight.rationale || planInsight.disclaimer || planInsight.notes.length > 0) && (
        <div className="space-y-3">
          {planInsight.disclaimer && (
            <div className="rounded-2xl border border-orange-400/30 bg-orange-400/[0.07] p-4 flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-orange-300 font-semibold text-sm">Lưu ý sức khỏe</p>
                <p className="text-neutral-300 text-xs mt-1 leading-relaxed">{planInsight.disclaimer}</p>
              </div>
              <button onClick={() => setPlanInsight(null)} className="text-neutral-500 hover:text-white shrink-0"><X className="w-4 h-4" /></button>
            </div>
          )}
          {(planInsight.rationale || planInsight.notes.length > 0) && (
            <div className="rounded-2xl border border-lime/20 bg-lime/[0.05] p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-lime" />
                  <span className="font-grotesk font-bold uppercase text-white text-sm tracking-wide">Vì sao kế hoạch này</span>
                </div>
                <button onClick={() => setPlanInsight(null)} className="text-neutral-500 hover:text-white shrink-0"><X className="w-4 h-4" /></button>
              </div>
              {planInsight.rationale && <p className="text-neutral-300 text-xs leading-relaxed mb-2">{planInsight.rationale}</p>}
              {planInsight.notes.length > 0 && (
                <ul className="space-y-1.5">
                  {planInsight.notes.slice(0, 6).map((n, i) => (
                    <li key={i} className="flex items-start gap-2 text-neutral-300 text-xs">
                      <Check className="w-3.5 h-3.5 text-lime mt-0.5 shrink-0" />
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
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-400 text-sm">
          {saveError}
        </div>
      )}

      {/* ── Loading ── */}
      {loading && (
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-8 flex items-center justify-center gap-3 text-neutral-400 text-sm">
          <Loader2 className="w-4 h-4 animate-spin text-lime" />
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

          {/* Week navigator — lịch tuần nổi bật */}
          <div className="rounded-3xl border border-white/[0.08] bg-gradient-to-b from-white/[0.05] to-white/[0.02] p-4 sm:p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-lime/15 border border-lime/25 flex items-center justify-center shrink-0">
                  <CalendarDays className="w-4 h-4 text-lime" />
                </div>
                <div className="min-w-0">
                  <p className="font-grotesk font-bold uppercase text-white text-sm tracking-wide leading-none">Lịch tuần</p>
                  <p className="text-neutral-500 text-[11px] mt-1 truncate">{formatWeekRange()}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => jumpToDay(Math.max(1, currentWeekStart - weekSize))}
                  disabled={!canPrevWeek || currentWeekStart <= 1}
                  className="w-9 h-9 rounded-xl border border-white/10 bg-white/[0.03] flex items-center justify-center text-neutral-400 hover:text-white hover:border-white/20 disabled:opacity-25 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => jumpToDay(Math.min(totalScheduleDays, currentWeekStart + weekSize))}
                  disabled={!canNextWeek}
                  className="w-9 h-9 rounded-xl border border-white/10 bg-white/[0.03] flex items-center justify-center text-neutral-400 hover:text-white hover:border-white/20 disabled:opacity-25 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {weekDays.map(day => {
                const dayExercises = scheduleExercises.filter(ex => (ex.dayNumber || 1) === day);
                const dayDone = dayExercises.filter(ex => ex.done).length;
                const isRest = dayExercises.length === 0;
                const isActive = selectedDay === day;
                const isToday = todayDayNumber === day;
                const allDone = !isRest && dayDone === dayExercises.length;
                const pill = formatDayPill(day);
                return (
                  <button
                    key={day}
                    onClick={() => jumpToDay(day)}
                    className={`relative rounded-2xl py-3 px-1 flex flex-col items-center justify-center gap-1 transition-all ${
                      isActive
                        ? 'bg-lime text-black shadow-[0_6px_24px_-6px_rgba(204,255,0,0.5)]'
                        : isToday
                        ? 'border border-lime/40 bg-lime/[0.06] hover:bg-lime/10'
                        : isRest
                        ? 'border border-dashed border-white/[0.1] hover:bg-white/[0.04]'
                        : 'border border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.07]'
                    }`}
                  >
                    {/* "Hôm nay" badge */}
                    {isToday && !isActive && (
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[7px] font-bold uppercase tracking-wider text-lime bg-charcoal border border-lime/30 px-1.5 py-px rounded-full">
                        Nay
                      </span>
                    )}

                    {/* Weekday */}
                    <div className={`text-xs font-bold leading-none ${
                      isActive ? 'text-black' : isToday ? 'text-lime' : isRest ? 'text-neutral-600' : 'text-neutral-200'
                    }`}>
                      {pill.weekday}
                    </div>

                    {/* Date */}
                    {pill.date && (
                      <div className={`text-[10px] leading-none ${
                        isActive ? 'text-black/60' : 'text-neutral-600'
                      }`}>
                        {pill.date}
                      </div>
                    )}

                    {/* Status: rest / done / progress */}
                    <div className={`mt-0.5 leading-none font-bold flex items-center justify-center ${
                      isActive ? 'text-black' : allDone ? 'text-lime' : isRest ? 'text-neutral-700' : 'text-neutral-500'
                    }`}>
                      {isRest
                        ? <Moon className="w-3 h-3" />
                        : allDone
                        ? <Check className="w-3.5 h-3.5" />
                        : <span className="text-[10px]">{dayDone}/{dayExercises.length}</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Exercise list + detail panel */}
          <div className="grid gap-4 xl:grid-cols-[1fr_360px]">

            {/* Exercise list */}
            <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] overflow-hidden">
              <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-grotesk font-semibold text-white text-sm leading-tight">
                    {formatSelectedDayLabel(selectedDay)}
                    {selectedDayIsRest && <span className="text-neutral-500 font-normal ml-2">· Nghỉ</span>}
                  </h3>
                  {!selectedDayIsRest && (
                    <p className="text-neutral-500 text-xs mt-0.5">
                      {visibleExercises.length} bài · {visibleCompletedCount}/{visibleExercises.length} hoàn thành
                    </p>
                  )}
                </div>
                {!selectedDayIsRest && (
                  <div className="text-right shrink-0">
                    <div className="text-lime font-grotesk font-bold text-xl">{visibleProgressPercent}%</div>
                    <div className="w-20 h-1 bg-white/[0.06] rounded-full overflow-hidden mt-1.5 ml-auto">
                      <div className="h-full bg-lime rounded-full transition-all" style={{ width: `${visibleProgressPercent}%` }} />
                    </div>
                  </div>
                )}
              </div>

              {selectedDayIsRest ? (
                <div className="p-5">
                  <div className="rounded-xl border border-white/[0.07] bg-white/[0.04] p-4 flex items-start gap-3">
                    <Shield className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-white text-sm">Ngày nghỉ phục hồi</h4>
                      <p className="text-neutral-400 text-xs mt-1 leading-relaxed">
                        Không có bài chính. Ưu tiên đi bộ nhẹ, mobility hoặc stretching 10–20 phút.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-white/[0.05]">
                  {visibleExercises.map((ex, index) => (
                    <div
                      key={ex.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setActiveExercise(ex)}
                      onKeyDown={e => e.key === 'Enter' && setActiveExercise(ex)}
                      className={`w-full text-left px-5 py-4 transition-colors relative cursor-pointer ${
                        activeExercise?.id === ex.id
                          ? 'bg-white/[0.07] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-0.5 before:bg-lime before:rounded-r'
                          : 'hover:bg-white/[0.04]'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Index / done badge */}
                        <div className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center text-xs font-bold mt-0.5 ${ex.done ? 'bg-lime/15 text-lime' : 'bg-white/[0.06] text-neutral-500'}`}>
                          {ex.done ? <Check className="w-3.5 h-3.5" /> : index + 1}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`font-semibold text-sm ${ex.done ? 'text-neutral-500 line-through' : 'text-white'}`}>
                              {ex.name}
                            </span>
                            {ex.difficulty && (
                              <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border ${difficultyTone(ex.difficulty)}`}>
                                {ex.difficulty}
                              </span>
                            )}
                          </div>
                          {/* Muscle group badge + secondary muscles + exercise type */}
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            {ex.muscle && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-lime/10 text-lime/80 border border-lime/20 inline-flex items-center gap-1">
                                <Dumbbell className="w-2.5 h-2.5" /> {ex.muscle}
                              </span>
                            )}
                            {ex.secondaryMuscles?.slice(0, 2).map(m => (
                              <span key={m} className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.06] text-neutral-500 border border-white/[0.07]">
                                {m}
                              </span>
                            ))}
                            {ex.exerciseType && (
                              <span className="text-[10px] text-neutral-500">{formatEnumLabel(ex.exerciseType)}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2.5 mt-1.5 text-xs text-neutral-500 flex-wrap">
                            <span>{ex.sets}</span>
                            <span>·</span>
                            <span>Nghỉ {formatDuration(ex.restTime)}</span>
                            <span>·</span>
                            <span>{ex.estimatedCalories || 0} kcal</span>
                            {ex.recommendedWeight && (
                              <>
                                <span>·</span>
                                <span className="text-cyan-400 font-medium inline-flex items-center gap-1"><Dumbbell className="w-2.5 h-2.5" /> {ex.recommendedWeight}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Right indicator / Replay button */}
                        {ex.done ? (
                          <button
                            onClick={e => { e.stopPropagation(); replayExercise(ex); }}
                            title="Làm lại bài này"
                            className="shrink-0 w-7 h-7 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-neutral-600 hover:text-lime hover:border-lime/30 hover:bg-lime/10 transition-all"
                          >
                            <RotateCcw className="w-3 h-3" />
                          </button>
                        ) : activeExercise?.id === ex.id ? (
                          <div className="shrink-0 w-1 h-8 bg-lime rounded-full mt-0.5" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-neutral-700 shrink-0 mt-1" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Exercise detail panel */}
            {panelExercise && (() => {
              const ex = panelExercise;
              const parsed = parseNotes(ex.notes);
              const movement = translateMovement(ex.exerciseType);
              const isSelected = activeExercise?.id === ex.id;
              const allMuscles = [ex.muscle, ...(ex.secondaryMuscles || [])].filter(Boolean);

              return (
                <aside className="rounded-2xl border border-white/[0.07] bg-white/[0.03] overflow-hidden xl:sticky xl:top-6 self-start">
                  {/* Visual header */}
                  <div className="relative h-44">
                    {ex.imageUrl ? (
                      <img src={ex.imageUrl} alt={ex.name} className="absolute inset-0 w-full h-full object-cover opacity-60" />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-lime/[0.08] via-transparent to-electric/[0.04]" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0f1014] via-[#0f1014]/50 to-transparent" />

                    {/* Status badge */}
                    <div className="absolute top-3.5 left-4 right-4 flex items-center justify-between">
                      <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full border ${
                        isSelected ? 'text-lime/90 border-lime/30 bg-lime/10' : 'text-neutral-400 border-white/10 bg-black/30'
                      }`}>
                        <Target className="w-2.5 h-2.5" />
                        {isSelected ? 'Đang xem' : 'Tiếp theo'}
                      </div>
                      {ex.difficulty && (
                        <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full border ${difficultyTone(ex.difficulty)}`}>
                          {ex.difficulty === 'EASY' ? 'Dễ' : ex.difficulty === 'HARD' ? 'Khó' : 'Trung bình'}
                        </span>
                      )}
                    </div>

                    {/* Exercise name + primary muscle */}
                    <div className="absolute bottom-3.5 left-4 right-4">
                      <h3 className="font-grotesk font-bold text-white text-lg leading-snug">{ex.name}</h3>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-lime/20 text-lime border border-lime/30">
                          <Dumbbell className="w-2.5 h-2.5" /> {translateMuscle(ex.muscle || '')}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-white/[0.08] text-neutral-300 border border-white/10">
                          {movement.label}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 space-y-3">
                    {/* Thống số chính */}
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { Icon: Dumbbell, label: 'Khối lượng', value: ex.sets, color: 'text-lime' },
                        { Icon: Timer,    label: 'Nghỉ',       value: formatDuration(ex.restTime), color: 'text-blue-400' },
                        { Icon: Flame,    label: 'Kcal',       value: `${ex.estimatedCalories || 0}`, color: 'text-orange-400' },
                      ].map(({ Icon, label, value, color }) => (
                        <div key={label} className="rounded-xl border border-white/[0.07] bg-white/[0.04] p-2.5">
                          <Icon className={`w-3 h-3 ${color} mb-1`} />
                          <p className="text-neutral-500 text-[9px] uppercase tracking-wider">{label}</p>
                          <p className="text-white font-bold text-sm mt-0.5">{value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Bài này tập gì? */}
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 flex items-center gap-1.5">
                        <Activity className="w-3 h-3" /> Bài này tập gì?
                      </p>

                      {/* Movement pattern explanation */}
                      {movement.desc && (
                        <p className="text-neutral-300 text-xs leading-relaxed">{movement.desc}</p>
                      )}

                      {/* Nhóm cơ được kích hoạt */}
                      {allMuscles.length > 0 && (
                        <div>
                          <p className="text-[10px] text-neutral-600 mb-1">Cơ bắp kích hoạt:</p>
                          <div className="flex flex-wrap gap-1">
                            {allMuscles.slice(0, 5).map((m, i) => (
                              <span key={m} className={`text-[10px] px-1.5 py-0.5 rounded border ${
                                i === 0
                                  ? 'bg-lime/10 text-lime border-lime/20 font-semibold'
                                  : 'bg-white/[0.05] text-neutral-400 border-white/[0.08]'
                              }`}>
                                {translateMuscle(m)}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Lợi ích từ notes */}
                      {parsed.benefit && (
                        <div className="border-t border-white/[0.05] pt-2">
                          <p className="text-[10px] text-neutral-600 mb-0.5">Lợi ích:</p>
                          <p className="text-neutral-400 text-xs leading-relaxed">{parsed.benefit}</p>
                        </div>
                      )}
                    </div>

                    {/* Thông tin thêm */}
                    <div className="space-y-1.5">
                      {ex.equipment && (
                        <div className="flex items-center justify-between text-xs py-1 border-b border-white/[0.04]">
                          <span className="text-neutral-500 flex items-center gap-1.5">
                            <Dumbbell className="w-3 h-3" /> Dụng cụ
                          </span>
                          <span className="text-white font-medium inline-flex items-center gap-1.5">
                            {ex.equipment.toUpperCase() === 'BODYWEIGHT' ? <><Activity className="w-3 h-3" /> Tự trọng (không cần dụng cụ)</> : <><Dumbbell className="w-3 h-3" /> {formatEnumLabel(ex.equipment)}</>}
                          </span>
                        </div>
                      )}
                      {ex.recommendedWeight && (
                        <div className="flex items-center justify-between text-xs py-1 border-b border-white/[0.04]">
                          <span className="text-neutral-500 inline-flex items-center gap-1.5"><Scale className="w-3 h-3" /> Tạ gợi ý</span>
                          <span className="text-cyan-400 font-semibold">{ex.recommendedWeight}</span>
                        </div>
                      )}
                      {parsed.tempo && parsed.tempo !== 'N/A' && (
                        <div className="flex items-center justify-between text-xs py-1 border-b border-white/[0.04]">
                          <span className="text-neutral-500 flex items-center gap-1.5">
                            <Timer className="w-3 h-3" /> Nhịp độ
                          </span>
                          <span className="text-neutral-300 font-mono">{parsed.tempo} <span className="text-neutral-600 font-sans">(xuống–dừng–lên)</span></span>
                        </div>
                      )}
                      {parsed.phase && (
                        <div className="flex items-center justify-between text-xs py-1">
                          <span className="text-neutral-500 inline-flex items-center gap-1.5"><Target className="w-3 h-3" /> Giai đoạn tập</span>
                          <span className="text-neutral-300">{PHASE_VI[parsed.phase] || parsed.phase}</span>
                        </div>
                      )}
                    </div>

                    {/* Video hướng dẫn */}
                    {ex.videoUrl && (
                      <ExerciseVideoPlayer videoUrl={ex.videoUrl} name={ex.name} />
                    )}

                    {/* ── Swap Exercise Panel ─────────────────────────── */}
                    {!ex.done && (
                      <div>
                        {/* Nút mở / đóng swap */}
                        <button
                          onClick={() => showSwap ? setShowSwap(false) : openSwap(ex)}
                          className={`w-full py-2.5 text-xs font-semibold rounded-xl flex items-center justify-center gap-2 border transition-all ${
                            showSwap
                              ? 'border-white/20 bg-white/[0.06] text-neutral-300'
                              : 'border-white/[0.08] bg-white/[0.03] text-neutral-400 hover:text-white hover:border-white/20'
                          }`}
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${showSwap ? 'rotate-180' : ''} transition-transform`} />
                          {showSwap ? 'Đóng' : 'Không thích? Đổi bài khác'}
                        </button>

                        {/* Swap panel */}
                        {showSwap && (
                          <div className="mt-2 rounded-xl border border-white/[0.08] bg-[#0d0f13] overflow-hidden">
                            {/* Header + filter nhóm cơ */}
                            <div className="px-3 pt-3 pb-2 border-b border-white/[0.06]">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-2">
                                Chọn nhóm cơ mong muốn
                              </p>
                              <div className="flex flex-wrap gap-1 mb-2">
                                {['', 'Chest', 'Back', 'Quadriceps', 'Glutes', 'Core', 'Shoulders', 'Full Body'].map(m => (
                                  <button
                                    key={m}
                                    onClick={() => filterAlternatives(m)}
                                    className={`text-[10px] px-2 py-1 rounded-full border transition-all ${
                                      altMuscleFilter === m
                                        ? 'bg-lime/20 border-lime/40 text-lime font-bold'
                                        : 'border-white/[0.08] text-neutral-500 hover:text-white hover:border-white/20'
                                    }`}
                                  >
                                    {m === '' ? <span className="inline-flex items-center gap-1"><Target className="w-2.5 h-2.5" /> Cùng nhóm cơ</span> : translateMuscle(m)}
                                  </button>
                                ))}
                              </div>
                              {/* Custom input */}
                              <div className="relative">
                                <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-600" />
                                <input
                                  type="text"
                                  placeholder="Tìm nhóm cơ khác..."
                                  value={altMuscleFilter}
                                  onChange={e => setAltMuscleFilter(e.target.value)}
                                  onKeyDown={e => e.key === 'Enter' && filterAlternatives(altMuscleFilter)}
                                  className="w-full pl-7 pr-8 py-1.5 text-xs bg-white/[0.04] border border-white/[0.07] rounded-lg text-white placeholder-neutral-600 outline-none focus:border-lime/30"
                                />
                                {altMuscleFilter && (
                                  <button
                                    onClick={() => filterAlternatives('')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-600 hover:text-white"
                                  >
                                    <XIcon className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Danh sách alternatives */}
                            <div className="max-h-64 overflow-y-auto divide-y divide-white/[0.04]">
                              {altLoading ? (
                                <div className="flex items-center justify-center py-6 gap-2 text-neutral-500 text-xs">
                                  <div className="w-4 h-4 border-2 border-lime/30 border-t-lime rounded-full animate-spin" />
                                  Đang tải...
                                </div>
                              ) : alternatives.length === 0 ? (
                                <div className="py-6 text-center text-neutral-600 text-xs">
                                  Không tìm thấy bài tập phù hợp
                                </div>
                              ) : alternatives.map(alt => {
                                const altName = i18n.language === 'vi' && alt.nameVi ? alt.nameVi : alt.name;
                                const diff = (alt.difficultyLevel || '').toLowerCase();
                                return (
                                  <button
                                    key={alt.id}
                                    onClick={() => confirmSwap(alt)}
                                    disabled={swapping}
                                    className="w-full text-left px-3 py-2.5 hover:bg-white/[0.04] transition-colors flex items-center gap-2.5 group"
                                  >
                                    {/* Ảnh nhỏ */}
                                    <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-white/[0.04] border border-white/[0.06]">
                                      {alt.imageUrl ? (
                                        <img src={alt.imageUrl} alt={altName} className="w-full h-full object-cover opacity-70" />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center text-neutral-500">
                                          {alt.requiredEquipment === 'BODYWEIGHT' ? <Activity className="w-4 h-4" /> : <Dumbbell className="w-4 h-4" />}
                                        </div>
                                      )}
                                    </div>
                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                      <p className="text-white text-xs font-semibold truncate group-hover:text-lime transition-colors">
                                        {altName}
                                      </p>
                                      <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                                        <span className="text-[9px] text-neutral-500 inline-flex items-center gap-1">
                                          <Dumbbell className="w-2 h-2" /> {translateMuscle(alt.primaryMuscle || '')}
                                        </span>
                                        {alt.defaultSets && alt.defaultReps && (
                                          <span className="text-[9px] text-neutral-600">
                                            · {alt.defaultSets}×{alt.defaultReps}
                                          </span>
                                        )}
                                        <span className={`text-[9px] px-1 rounded border ml-auto ${
                                          diff.includes('hard') ? 'text-orange-400 border-orange-400/20 bg-orange-400/10' :
                                          diff.includes('medium') ? 'text-yellow-400 border-yellow-400/20 bg-yellow-400/10' :
                                          'text-lime border-lime/20 bg-lime/10'
                                        }`}>
                                          {diff.includes('hard') ? 'Khó' : diff.includes('medium') ? 'TB' : 'Dễ'}
                                        </span>
                                      </div>
                                    </div>
                                    <ArrowRight className="w-3.5 h-3.5 text-neutral-700 group-hover:text-lime transition-colors shrink-0" />
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {/* ── End Swap Panel ──────────────────────────────── */}

                    {/* CTA */}
                    {ex.done ? (
                      <div className="space-y-2">
                        <div className="rounded-xl border border-lime/20 bg-lime/10 px-4 py-3 flex items-center gap-2 text-lime text-sm font-semibold">
                          <Check className="w-4 h-4" />
                          Đã hoàn thành hôm nay
                        </div>
                        <button
                          onClick={() => replayExercise(ex)}
                          className="w-full py-2.5 rounded-xl text-xs font-semibold border border-white/[0.08] text-neutral-400 hover:text-white hover:border-white/20 flex items-center justify-center gap-1.5 transition-all"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Làm lại bài này
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startSession(ex)}
                        className="w-full btn-lime py-3 text-sm font-semibold rounded-xl flex items-center justify-center gap-2"
                      >
                        <Play className="w-4 h-4" fill="currentColor" />
                        Bắt đầu với AI Coach
                      </button>
                    )}
                  </div>
                </aside>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(TrainingView);
