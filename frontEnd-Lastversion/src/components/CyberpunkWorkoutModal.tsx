import { useState } from 'react';
import { Zap, X, Dumbbell, Timer, Activity } from 'lucide-react';
import { useAuthContext } from '../context/AuthContext';
import { trainingService } from '../services/trainingService';

interface Props {
  onClose: () => void;
  onSuccess: (data: any) => void;
}

const programOptions = [
  { value: '8W', label: '8 Weeks', hint: 'Build Muscle', weeks: 8, phase: 'foundation' },
  { value: '10W', label: '10 Weeks', hint: 'Custom Balance', weeks: 10, phase: 'foundation' },
  { value: '12W', label: '12 Weeks', hint: 'Performance Endurance', weeks: 12, phase: 'foundation' },
];

const durationOptions = ['30', '45', '60'];

const equipmentPresets = [
  { label: 'Tự trọng', value: 'bodyweight',                          emoji: '🤸', hint: 'Không cần thiết bị' },
  { label: 'Tạ đơn',  value: 'dumbbell, bodyweight',                 emoji: '🏋️', hint: 'Tạ đơn + tự trọng' },
  { label: 'Phòng Gym', value: 'full gym',                           emoji: '🏟️', hint: 'Máy + tạ đòn + tạ đơn' },
  { label: 'Tạ đòn',  value: 'barbell, dumbbell',                    emoji: '⚡', hint: 'Compound nặng' },
  { label: 'Dây kháng lực', value: 'resistance band, bodyweight',    emoji: '🟡', hint: 'Tập tại nhà' },
];

const goalOptions = [
  { value: 'weight_loss',  label: 'Giảm mỡ',  emoji: '🔥', hint: 'Đốt calo' },
  { value: 'muscle_gain',  label: 'Tăng cơ',   emoji: '💪', hint: 'Hypertrophy' },
  { value: 'strength',     label: 'Sức mạnh',  emoji: '⚡', hint: 'Nâng nặng' },
  { value: 'endurance',    label: 'Độ bền',    emoji: '🏃', hint: 'Cardio' },
  { value: 'maintenance',  label: 'Duy trì',   emoji: '⚖️', hint: 'Cân bằng' },
];

export default function CyberpunkWorkoutModal({ onClose, onSuccess }: Props) {
  const { user } = useAuthContext();
  const [program, setProgram] = useState(programOptions[0]);
  const [equipment, setEquipment] = useState('full gym');
  const [intensity, setIntensity] = useState('moderate');
  const [duration, setDuration] = useState('45');
  const [goal, setGoal] = useState('weight_loss');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!user) return;
    setLoading(true);
    setError('');

    try {
      // Gửi "full gym" nguyên vẹn để Java nhận diện đúng gym scenario
      // (không split "full gym" thành ["full", "gym"])
      const equipmentList = equipment === 'full gym'
        ? ['full gym']
        : equipment.split(',').map(item => item.trim()).filter(Boolean);
      
      const response = await trainingService.generateAIWorkoutPlan(user.id, {
        program: program.value,
        days: program.weeks * 7,
        totalWeeks: program.weeks,
        week_number: 1,
        progressionPhase: program.phase,
        equipment: equipmentList,
        intensity: intensity,
        duration: parseInt(duration, 10),
        preferences: [],
        goal: goal,
      });

      if (response.success) {
        onSuccess(response.data);
      } else {
        setError(response.error?.message || 'Failed to generate workout plan');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center overflow-y-auto p-4 animate-fade-in">
      <div className="relative max-h-[calc(100vh-2rem)] w-full max-w-lg glass rounded-[2.5rem] border border-white/10 overflow-y-auto shadow-2xl animate-slide-up">
        
        {/* Header */}
        <div className="p-8 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-lime/10 flex items-center justify-center">
              <Dumbbell className="w-6 h-6 text-lime" />
            </div>
            <div>
              <h2 className="text-xl font-grotesk font-bold text-white tracking-tight">AI Kinetic Protocol</h2>
              <p className="text-xs text-neutral-500 font-medium uppercase tracking-widest">Multi-Week AI Generator</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/[0.06] rounded-full transition-colors text-neutral-500 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-8 space-y-8">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-8">
              <div className="relative w-20 h-20">
                <div className="absolute inset-0 border-2 border-electric/10 rounded-full"></div>
                <div className="absolute inset-0 border-2 border-electric rounded-full border-t-transparent animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Activity className="w-8 h-8 text-electric" />
                </div>
              </div>
              <div className="text-center space-y-3">
                <p className="text-white text-xl font-grotesk font-bold">Mapping Muscle Fibers</p>
                <div className="flex flex-col gap-1">
                  <p className="text-neutral-500 text-sm animate-pulse">Calculating biomechanical loads...</p>
                  <p className="text-neutral-500 text-sm animate-pulse delay-75">Generating Week 1 Blueprint...</p>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-6">
                <div className="grid gap-6">
                  <div>
                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-[0.2em] mb-3 block">
                      Training Program
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {programOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setProgram(option)}
                          className={`min-h-[72px] rounded-2xl border px-3 py-3 text-left transition-all ${
                            program.value === option.value
                              ? 'border-lime/50 bg-lime/10 text-lime shadow-lg shadow-lime/5'
                              : 'border-white/10 bg-white/[0.06] text-neutral-300 hover:border-white/20 hover:bg-white/[0.06]'
                          }`}
                        >
                          <span className="block font-grotesk text-base font-bold leading-tight">{option.label}</span>
                          <span className={`mt-1 block text-[11px] font-medium ${program.value === option.value ? 'text-lime/70' : 'text-neutral-500'}`}>
                            {option.hint}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-[0.2em] mb-3 block">
                      Mins/Session
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {durationOptions.map((minutes) => (
                        <button
                          key={minutes}
                          type="button"
                          onClick={() => setDuration(minutes)}
                          className={`py-3 rounded-xl font-bold font-grotesk text-xs uppercase tracking-widest transition-all ${
                            duration === minutes ? 'bg-lime text-black' : 'bg-white/[0.06] text-neutral-500 hover:bg-white/[0.06]'
                          }`}
                        >
                          <span className="inline-flex items-center justify-center gap-2">
                            <Timer className="w-4 h-4" />
                            {minutes}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-[0.2em] mb-3 block">
                    Mục tiêu tập luyện
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {goalOptions.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setGoal(opt.value)}
                        className={`min-h-[68px] rounded-2xl border px-2 py-2.5 flex flex-col items-center justify-center gap-1 transition-all ${
                          goal === opt.value
                            ? 'border-lime/50 bg-lime/10 text-lime shadow-lg shadow-lime/5'
                            : 'border-white/10 bg-white/[0.06] text-neutral-300 hover:border-white/20 hover:bg-white/[0.06]'
                        }`}
                      >
                        <span className="text-lg leading-none">{opt.emoji}</span>
                        <span className="font-grotesk text-[10px] font-bold leading-tight text-center">{opt.label}</span>
                        <span className={`text-[9px] font-medium leading-tight text-center ${goal === opt.value ? 'text-lime/70' : 'text-neutral-600'}`}>
                          {opt.hint}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-[0.2em] mb-3 block">
                    Intensity Level
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {['low', 'moderate', 'high'].map((level) => (
                      <button
                        key={level}
                        onClick={() => setIntensity(level)}
                        className={`py-3 rounded-xl font-bold font-grotesk text-xs uppercase tracking-widest transition-all ${
                          intensity === level ? 'bg-electric text-white' : 'bg-white/[0.06] text-neutral-500 hover:bg-white/[0.06]'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-[0.2em] mb-3 block">
                    Available Gear
                  </label>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {equipmentPresets.map((preset) => (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => setEquipment(preset.value)}
                        className={`py-2.5 rounded-xl font-grotesk text-xs font-semibold transition-all flex flex-col items-center gap-1 ${
                          equipment === preset.value
                            ? 'bg-lime/10 border border-lime/40 text-lime'
                            : 'bg-white/[0.06] border border-white/10 text-neutral-400 hover:bg-white/[0.06]'
                        }`}
                      >
                        <span>{preset.emoji}</span>
                        <span>{preset.label}</span>
                      </button>
                    ))}
                  </div>
                  <input
                    value={equipment}
                    onChange={(e) => setEquipment(e.target.value)}
                    className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-3 text-white text-xs focus:outline-none focus:border-electric/40 transition-all"
                    placeholder="dumbbell, barbell, bodyweight..."
                  />
                </div>

                {error && (
                  <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-2xl text-red-400 text-xs font-medium flex items-center gap-3">
                    <X className="w-4 h-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
              </div>

              <button
                onClick={handleGenerate}
                className="btn-lime w-full py-5 text-sm font-grotesk font-bold uppercase tracking-widest shadow-xl group"
              >
                <div className="flex items-center justify-center gap-3 relative z-10 group-active:scale-95 transition-transform">
                  <Zap className="w-5 h-5" fill="currentColor" />
                  INITIATE KINETIC PLAN
                </div>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
