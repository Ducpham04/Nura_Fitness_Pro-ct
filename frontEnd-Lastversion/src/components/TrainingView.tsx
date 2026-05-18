import { useState, useEffect, memo } from 'react';
import { Play, X, Check, AlertTriangle, Camera, Zap, Volume2, VolumeX } from 'lucide-react';

const exercises = [
  { id: 1, name: 'Push-ups', sets: '4x15', muscle: 'Chest / Triceps', img: 'https://images.pexels.com/photos/4162583/pexels-photo-4162583.jpeg?auto=compress&cs=tinysrgb&w=400', done: true, formChecks: ['Back straight', 'Full range of motion', 'No sagging'] },
  { id: 2, name: 'Barbell Squat', sets: '3x12', muscle: 'Legs / Core', img: 'https://images.pexels.com/photos/1552252/pexels-photo-1552252.jpeg?auto=compress&cs=tinysrgb&w=400', done: true, formChecks: ['Knees tracked', 'Back upright', 'Depth good'] },
  { id: 3, name: 'Deadlift', sets: '3x10', muscle: 'Back / Glutes', img: 'https://images.pexels.com/photos/4162590/pexels-photo-4162590.jpeg?auto=compress&cs=tinysrgb&w=400', done: false, formChecks: ['Neutral spine', 'Shoulders over bar', 'Full lockout'] },
  { id: 4, name: 'Pull-ups', sets: '3x8', muscle: 'Back / Biceps', img: 'https://images.pexels.com/photos/4397840/pexels-photo-4397840.jpeg?auto=compress&cs=tinysrgb&w=400', done: false, formChecks: ['Full extension', 'Chin over bar', 'Controlled descent'] },
  { id: 5, name: 'Plank', sets: '3x60s', muscle: 'Core', img: 'https://images.pexels.com/photos/6456301/pexels-photo-6456301.jpeg?auto=compress&cs=tinysrgb&w=400', done: false, formChecks: ['Hips level', 'Shoulders aligned', 'Core tight'] },
  { id: 6, name: 'Overhead Press', sets: '3x10', muscle: 'Shoulders', img: 'https://images.pexels.com/photos/3837757/pexels-photo-3837757.jpeg?auto=compress&cs=tinysrgb&w=400', done: false, formChecks: ['Core engaged', 'Elbows under wrist', 'Full lock-out'] },
];

interface SessionData {
  reps: number;
  formScore: number;
  caloriesBurned: number;
  avgRepTime: number;
}

function TrainingView() {
  const [cameraActive, setCameraActive] = useState(false);
  const [sessionData, setSessionData] = useState<SessionData>({ reps: 0, formScore: 94, caloriesBurned: 0, avgRepTime: 0 });
  const [formAlert, setFormAlert] = useState<string | null>(null);
  const [activeExercise, setActiveExercise] = useState(exercises[2]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [currentSet, setCurrentSet] = useState(1);
  const [sessionTime, setSessionTime] = useState(0);

  const formAlerts = ["Lưng cong", "Hạ quá thấp", "Tốc độ quá nhanh", "Không tràn khớp"];

  useEffect(() => {
    if (!cameraActive) return;

    // Mock WebSocket - update rep count every 2-3 seconds
    const repInterval = setInterval(() => {
      setSessionData(prev => ({
        ...prev,
        reps: prev.reps + 1,
        caloriesBurned: Math.round(prev.caloriesBurned + Math.random() * 2 + 2),
        avgRepTime: Math.floor((sessionTime + 5) / (prev.reps + 1)),
      }));
    }, 2200 + Math.random() * 1000);

    // Random form alerts
    const alertInterval = setInterval(() => {
      if (Math.random() < 0.3) {
        const randomAlert = formAlerts[Math.floor(Math.random() * formAlerts.length)];
        setFormAlert(randomAlert);
        if (soundEnabled) {
          // Sound feedback would play here in production
          // Mock: visual feedback only
        }
        setTimeout(() => setFormAlert(null), 3000);
      }

      // Form score fluctuation
      setSessionData(prev => ({
        ...prev,
        formScore: Math.max(70, Math.min(99, prev.formScore + (Math.random() - 0.5) * 8)),
      }));
    }, 3500);

    // Session timer
    const timerInterval = setInterval(() => {
      setSessionTime(t => t + 1);
    }, 1000);

    return () => {
      clearInterval(repInterval);
      clearInterval(alertInterval);
      clearInterval(timerInterval);
    };
  }, [cameraActive, soundEnabled]);

  const startSession = (ex: typeof exercises[0]) => {
    setActiveExercise(ex);
    setCameraActive(true);
    setSessionData({ reps: 0, formScore: 94, caloriesBurned: 0, avgRepTime: 0 });
    setFormAlert(null);
    setCurrentSet(1);
    setSessionTime(0);
  };

  const endSession = () => {
    setCameraActive(false);
    // TODO: Save session data to backend API
    // POST /api/training/sessions with sessionData
  };

  if (cameraActive) {
    const formatTime = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
    const targetReps = parseInt(activeExercise.sets.split('x')[1]);
    const repProgress = Math.min(100, (sessionData.reps / targetReps) * 100);

    return (
      <div className="fixed inset-0 bg-black z-40 flex flex-col animate-fade-in">
        {/* Camera feed placeholder */}
        <div className="relative flex-1 overflow-hidden">
          <img
            src={activeExercise.img}
            alt="Camera feed"
            className="w-full h-full object-cover opacity-50"
          />

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
              <div className="text-white text-xs mt-0.5">Set {currentSet} / {activeExercise.sets.split('x')[0]}</div>
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

          {/* Form score */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2">
            <div className={`glass rounded-2xl px-4 py-2 border ${formAlert ? 'border-danger/40' : 'border-lime/20'}`}>
              <div className={`font-grotesk font-bold text-sm ${formAlert ? 'text-danger' : 'text-lime'}`}>
                FORM: {Math.round(sessionData.formScore)}%
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
                  <div className="text-neutral-400 text-xs uppercase tracking-widest">Calories</div>
                  <div className="text-white font-grotesk font-bold text-lg">{sessionData.caloriesBurned}</div>
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
              <button className="glass-lime rounded-2xl py-3 font-grotesk font-bold text-lime text-sm flex items-center justify-center gap-2">
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
          <p className="text-neutral-400 text-sm mt-1">2 of 6 exercises completed today</p>
        </div>
        <div className="flex items-center gap-2 glass-lime rounded-full px-4 py-2">
          <Zap className="w-3 h-3 text-lime" />
          <span className="text-lime text-xs font-grotesk font-bold">AI FORM CHECK ON</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="glass rounded-2xl p-4 border border-white/5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-neutral-400 text-sm">Today's progress</span>
          <span className="text-lime text-sm font-grotesk font-bold">2 / 6</span>
        </div>
        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
          <div className="h-full bg-lime rounded-full transition-all duration-1000" style={{ width: '33%' }} />
        </div>
      </div>

      {/* Exercise grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {exercises.map(ex => (
          <div key={ex.id} className={`glass rounded-3xl overflow-hidden border transition-all card-hover ${ex.done ? 'border-lime/20' : 'border-white/5'}`}>
            <div className="relative h-40">
              <img src={ex.img} alt={ex.name} className={`w-full h-full object-cover transition-all ${ex.done ? 'opacity-50' : 'opacity-70'}`} />
              <div className="absolute inset-0 bg-gradient-to-t from-charcoal to-transparent" />
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
