import { useState, useEffect, memo } from 'react';
import { Play, X, Check, AlertTriangle, Camera, Zap, Volume2, VolumeX, Loader2, Dumbbell } from 'lucide-react';
import { useAuthContext } from '../context/AuthContext';
import { trainingService, type DailyTrainingLog, type PersonalizedWorkoutExercise } from '../services/trainingService';

interface TrainingExercise {
  id: number;
  name: string;
  sets: string;
  muscle: string;
  videoUrl?: string;
  done: boolean;
  trainingPlanId?: number;
  dayNumber?: number;
  exerciseId?: number;
  targetSets?: number;
  targetReps?: number;
  estimatedCalories?: number;
}

const mapPersonalizedExercise = (
  exercise: PersonalizedWorkoutExercise,
  trainingPlanId?: number,
  completedExerciseIds = new Set<number>()
): TrainingExercise => {
  const targetSets = exercise.sets;
  const targetReps = exercise.reps;

  return {
    id: exercise.id,
    name: exercise.exerciseName,
    sets: `${targetSets}x${targetReps}`,
    muscle: exercise.targetMuscle || exercise.difficulty || 'Training',
    videoUrl: exercise.videoUrl,
    done: completedExerciseIds.has(exercise.exerciseId),
    trainingPlanId,
    dayNumber: exercise.dayNumber,
    exerciseId: exercise.exerciseId,
    targetSets,
    targetReps,
    estimatedCalories: exercise.estimatedCalories,
  };
};

interface SessionData {
  reps: number;
  caloriesBurned: number;
  avgRepTime: number;
}

function TrainingView() {
  const { user } = useAuthContext();
  const [cameraActive, setCameraActive] = useState(false);
  const [sessionData, setSessionData] = useState<SessionData>({ reps: 0, caloriesBurned: 0, avgRepTime: 0 });
  const [formAlert, setFormAlert] = useState<string | null>(null);
  const [exercisesToday, setExercisesToday] = useState<TrainingExercise[]>([]);
  const [loading, setLoading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [activeExercise, setActiveExercise] = useState<TrainingExercise | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [currentSet, setCurrentSet] = useState(0);
  const [sessionTime, setSessionTime] = useState(0);

  useEffect(() => {
    const loadTodayExercises = async () => {
      if (!user) return;
      try {
        setLoading(true);
        const trainings = await trainingService.getUserTraining(user.id);
        const list = Array.isArray(trainings) ? trainings : [];
        const activeTraining = list.find((t: any) =>
          t.status === 'ACTIVE' || t.status === 'active' || t.status === 'IN_PROGRESS'
        ) || list[0];
        const planId = activeTraining?.trainingPlanId;
        const startDate = activeTraining?.startDate;
        const dayNumber = startDate
          ? Math.max(1, Math.floor((Date.now() - new Date(startDate).getTime()) / 86400000) + 1)
          : 1;

        if (!planId) {
          setExercisesToday([]);
          setActiveExercise(null);
          return;
        }

        const [personalized, logs] = await Promise.all([
          trainingService.getTodayPersonalizedWorkout(dayNumber),
          trainingService.getDailyLogsByPlan(Number(planId)),
        ]);
        const completedExerciseIds = new Set(
          logs
            .filter((log: DailyTrainingLog) => log.status === 'COMPLETED' || log.status === 'completed')
            .map((log: DailyTrainingLog) => log.exerciseId)
        );

        const mapped = personalized.map(exercise => mapPersonalizedExercise(exercise, Number(planId), completedExerciseIds));
        setExercisesToday(mapped);
        setActiveExercise(mapped.find(ex => !ex.done) || mapped[0] || null);
      } catch (error) {
        console.warn('[TrainingView] Failed to load daily training logs:', error);
        setExercisesToday([]);
        setActiveExercise(null);
      } finally {
        setLoading(false);
      }
    };

    loadTodayExercises();
  }, [user]);

  useEffect(() => {
    if (!cameraActive) return;

    const timerInterval = setInterval(() => {
      setSessionTime(t => t + 1);
    }, 1000);

    return () => {
      clearInterval(timerInterval);
    };
  }, [cameraActive]);

  const startSession = (ex: TrainingExercise) => {
    setActiveExercise(ex);
    setCameraActive(true);
    setSessionData({ reps: 0, caloriesBurned: 0, avgRepTime: 0 });
    setFormAlert(null);
    setSaveError(null);
    setCurrentSet(0);
    setSessionTime(0);
  };

  const endSession = async () => {
    setCameraActive(false);
    if (!user || !activeExercise?.trainingPlanId || !activeExercise.dayNumber || !activeExercise.exerciseId) return;

    const response = await trainingService.saveTrainingLog(user.id, {
      trainingPlanId: activeExercise.trainingPlanId,
      dayNumber: activeExercise.dayNumber,
      exerciseId: activeExercise.exerciseId,
      status: 'COMPLETED',
      analysisData: {
        repsCompleted: sessionData.reps,
        setsCompleted: currentSet,
        actualDurationMinutes: Math.max(1, Math.round(sessionTime / 60)),
      },
    });

    if (!response.success) {
      setSaveError(response.error?.message || 'Could not save training log');
      return;
    }

    setExercisesToday(prev => prev.map(ex => ex.id === activeExercise.id ? { ...ex, done: true } : ex));
  };

  const completeSet = () => {
    if (!activeExercise) return;
    const targetSets = activeExercise.targetSets || 1;
    const targetReps = activeExercise.targetReps || 0;
    setCurrentSet(set => Math.min(targetSets, set + 1));
    setSessionData(prev => ({
      ...prev,
      reps: Math.min(targetSets * targetReps, prev.reps + targetReps),
      avgRepTime: prev.reps + targetReps > 0 ? Math.round(sessionTime / Math.max(1, prev.reps + targetReps)) : 0,
    }));
  };

  if (cameraActive && activeExercise) {
    const formatTime = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
    const targetReps = activeExercise.targetReps || parseInt(activeExercise.sets.split('x')[1]);
    const repProgress = Math.min(100, (sessionData.reps / targetReps) * 100);

    return (
      <div className="fixed inset-0 bg-black z-40 flex flex-col animate-fade-in">
        {/* Camera feed placeholder */}
        <div className="relative flex-1 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-charcoal via-obsidian to-black" />

          {/* Scan beam */}
          <div className="absolute inset-x-0 h-0.5 scan-beam" style={{ background: 'rgba(0,122,255,0.6)' }} />

          {/* Skeleton overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <svg viewBox="0 0 120 180" className="w-48 h-72 opacity-70" fill="none">
              <circle cx="60" cy="20" r="12" stroke="#007AFF" strokeWidth="2" />
              <line x1="60" y1="32" x2="60" y2="90" stroke="#CCFF00" strokeWidth="2" />
              <line x1="30" y1="45" x2="90" y2="45" stroke="#007AFF" strokeWidth="2" />
              <line x1="30" y1="45" x2="18" y2="80" stroke="#CCFF00" strokeWidth="2" className="skeleton-line" />
              <line x1="90" y1="45" x2="102" y2="80" stroke="#CCFF00" strokeWidth="2" className="skeleton-line" />
              <line x1="18" y1="80" x2="12" y2="110" stroke="#007AFF" strokeWidth="2" />
              <line x1="102" y1="80" x2="108" y2="110" stroke="#007AFF" strokeWidth="2" />
              <line x1="40" y1="90" x2="80" y2="90" stroke="#CCFF00" strokeWidth="2" />
              <line x1="40" y1="90" x2="35" y2="135" stroke="#007AFF" strokeWidth="2" className="skeleton-line" />
              <line x1="80" y1="90" x2="85" y2="135" stroke="#007AFF" strokeWidth="2" className="skeleton-line" />
              <line x1="35" y1="135" x2="30" y2="170" stroke="#CCFF00" strokeWidth="2" />
              <line x1="85" y1="135" x2="90" y2="170" stroke="#CCFF00" strokeWidth="2" />
              {[[60, 32], [30, 45], [90, 45], [18, 80], [102, 80], [40, 90], [80, 90], [35, 135], [85, 135]].map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r="4" fill="#CCFF00" />
              ))}
            </svg>
          </div>

          {/* Top HUD */}
          <div className="absolute top-0 left-0 right-0 p-4 flex items-start justify-between">
            <div className="glass rounded-2xl px-4 py-2 hud-border">
              <div className="text-lime text-xs font-grotesk font-bold uppercase tracking-widest">{activeExercise.name}</div>
                  <div className="text-white text-xs mt-0.5">
                    Set {Math.min(currentSet + 1, activeExercise.targetSets || 1)} / {activeExercise.targetSets || activeExercise.sets.split('x')[0]}
                  </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="glass rounded-xl px-3 py-2 flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-danger animate-pulse" />
                <span className="text-white text-xs font-grotesk font-bold">REC</span>
              </div>
              <button onClick={() => setSoundEnabled(!soundEnabled)} className="glass rounded-xl p-2 text-white hover:text-lime transition-colors">
                {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </button>
              <button onClick={endSession} className="glass rounded-xl p-2 text-white hover:text-danger transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Form alert */}
          {formAlert && (
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 glass rounded-2xl px-5 py-3 border border-danger/40 flex items-center gap-3 animate-fade-in">
              <AlertTriangle className="w-5 h-5 text-danger" />
              <div>
                <div className="font-grotesk font-bold text-danger text-sm">FORM ALERT</div>
                <div className="text-white text-xs">{formAlert}</div>
              </div>
            </div>
          )}

          {/* Tracking status */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2">
            <div className={`glass rounded-2xl px-4 py-2 border ${formAlert ? 'border-danger/40' : 'border-lime/20'}`}>
              <div className={`font-grotesk font-bold text-sm ${formAlert ? 'text-danger' : 'text-lime'}`}>
                MANUAL TRACKING
              </div>
            </div>
          </div>

          {/* Bottom HUD — Rep counter & stats */}
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <div className="flex items-end justify-between mb-4">
              <div>
                <div className="text-lime font-grotesk font-bold text-8xl leading-none neon-flicker" style={{ textShadow: '0 0 30px rgba(204,255,0,0.5)' }}>
                  {sessionData.reps}
                </div>
                <div className="text-neutral-400 text-sm font-grotesk uppercase tracking-widest mt-1">REPS</div>
              </div>
              <div className="space-y-3 text-right">
                <div className="glass rounded-2xl px-4 py-3">
                  <div className="text-neutral-400 text-xs uppercase tracking-widest">Time</div>
                  <div className="text-white font-grotesk font-bold text-lg">{formatTime(sessionTime)}</div>
                </div>
                <div className="glass rounded-2xl px-4 py-3">
                  <div className="text-neutral-400 text-xs uppercase tracking-widest">Est. Calories</div>
                  <div className="text-white font-grotesk font-bold text-lg">{activeExercise.estimatedCalories || 0}</div>
                </div>
              </div>
            </div>

            {/* Rep progress */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-neutral-400 text-xs font-grotesk">Rep Progress</span>
                <span className="text-lime text-xs font-grotesk font-bold">{sessionData.reps}/{targetReps}</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-lime to-electric rounded-full transition-all" style={{ width: `${repProgress}%` }} />
              </div>
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button onClick={completeSet} className="glass-lime rounded-2xl py-3 font-grotesk font-bold text-lime text-sm flex items-center justify-center gap-2">
                <Check className="w-4 h-4" /> Completed Set
              </button>
              <button onClick={endSession} className="glass rounded-2xl py-3 font-grotesk font-medium text-neutral-300 text-sm">
                End Session
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-grotesk font-bold text-white text-xl">AI Training Hub</h2>
          <p className="text-neutral-400 text-sm mt-1">
            {exercisesToday.filter(ex => ex.done).length} of {exercisesToday.length} exercises completed today
          </p>
        </div>
        <div className="flex items-center gap-2 glass-lime rounded-full px-4 py-2">
          <Zap className="w-3 h-3 text-lime" />
          <span className="text-lime text-xs font-grotesk font-bold">API PLAN ACTIVE</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="glass rounded-2xl p-4 border border-white/5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-neutral-400 text-sm">Today's progress</span>
          <span className="text-lime text-sm font-grotesk font-bold">
            {exercisesToday.filter(ex => ex.done).length} / {exercisesToday.length}
          </span>
        </div>
        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-lime rounded-full transition-all duration-1000"
            style={{ width: `${exercisesToday.length ? (exercisesToday.filter(ex => ex.done).length / exercisesToday.length) * 100 : 0}%` }}
          />
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-neutral-400 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading today's safe workout plan...
        </div>
      )}

      {!loading && exercisesToday.length === 0 && (
        <div className="glass rounded-3xl border border-white/5 p-8 text-center">
          <Dumbbell className="w-10 h-10 text-neutral-500 mx-auto mb-4" />
          <h3 className="font-grotesk font-bold text-white text-lg mb-2">No personalized workout yet</h3>
          <p className="text-neutral-400 text-sm mb-5">
            Start a training plan or generate an AI workout plan so the backend can create safe personalized exercises from your health profile.
          </p>
        </div>
      )}

      {saveError && (
        <div className="glass rounded-2xl border border-danger/30 px-4 py-3 text-danger text-sm">
          {saveError}
        </div>
      )}

      {/* Exercise grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {exercisesToday.map(ex => (
          <div key={ex.id} className={`glass rounded-3xl overflow-hidden border transition-all card-hover ${ex.done ? 'border-lime/20' : 'border-white/5'}`}>
            <div className="relative h-40">
              <div className="absolute inset-0 bg-gradient-to-br from-surface via-charcoal to-obsidian" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Dumbbell className={`w-12 h-12 transition-all ${ex.done ? 'text-lime/60' : 'text-electric/70'}`} />
              </div>
              {ex.done && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-lime/20 border-2 border-lime flex items-center justify-center">
                    <Check className="w-6 h-6 text-lime" />
                  </div>
                </div>
              )}
              {!ex.done && (
                <div className="absolute top-3 right-3">
                  <div className="glass rounded-lg px-2 py-1">
                    <div className="flex items-center gap-1">
                      <Camera className="w-3 h-3 text-electric" />
                      <span className="text-electric text-xs font-grotesk">AI Ready</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-grotesk font-bold text-white">{ex.name}</h3>
                  <p className="text-neutral-400 text-xs mt-0.5">{ex.muscle}</p>
                </div>
                <span className="glass rounded-lg px-2 py-1 text-xs font-grotesk text-neutral-300">{ex.sets}</span>
              </div>
              {ex.done ? (
                <div className="flex items-center gap-1.5">
                  <Check className="w-3 h-3 text-lime" />
                  <span className="text-lime text-xs font-grotesk font-semibold">Completed</span>
                </div>
              ) : (
                <button onClick={() => startSession(ex)} className="w-full btn-lime py-2.5 text-sm flex items-center justify-center gap-2 mt-1">
                  <Play className="w-3.5 h-3.5" fill="currentColor" /> Start with AI
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default memo(TrainingView);
