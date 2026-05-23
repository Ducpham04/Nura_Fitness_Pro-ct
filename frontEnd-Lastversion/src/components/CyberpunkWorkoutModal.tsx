import { useState } from 'react';
import { Zap, X, Dumbbell, Timer, Activity } from 'lucide-react';
import { useAuthContext } from '../context/AuthContext';
import { trainingService } from '../services/trainingService';

interface Props {
  onClose: () => void;
  onSuccess: (data: any) => void;
}

export default function CyberpunkWorkoutModal({ onClose, onSuccess }: Props) {
  const { user } = useAuthContext();
  const [days, setDays] = useState('7');
  const [equipment, setEquipment] = useState('tạ đơn, dây kháng lực, bodyweight');
  const [intensity, setIntensity] = useState('moderate');
  const [duration, setDuration] = useState('45');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!user) return;
    setLoading(true);
    setError('');

    try {
      const equipmentList = equipment.split(',').map(item => item.trim()).filter(Boolean);
      
      const response = await trainingService.generateAIWorkoutPlan(user.id, {
        days: parseInt(days, 10),
        equipment: equipmentList,
        intensity: intensity,
        duration: parseInt(duration, 10),
        preferences: []
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="relative w-full max-w-lg glass rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl animate-slide-up">
        
        {/* Header */}
        <div className="p-8 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-lime/10 flex items-center justify-center">
              <Dumbbell className="w-6 h-6 text-lime" />
            </div>
            <div>
              <h2 className="text-xl font-grotesk font-bold text-white tracking-tight">AI Kinetic Protocol</h2>
              <p className="text-xs text-neutral-500 font-medium uppercase tracking-widest">Powered by Llama-3 Intelligence</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-neutral-500 hover:text-white">
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
                  <p className="text-neutral-500 text-sm animate-pulse delay-75">Optimizing recovery intervals...</p>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-[0.2em] mb-3 block">
                      Duration (Days)
                    </label>
                    <input
                      type="number"
                      value={days}
                      onChange={(e) => setDays(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white font-grotesk font-bold focus:outline-none focus:border-lime/40 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-[0.2em] mb-3 block">
                      Mins/Session
                    </label>
                    <div className="relative">
                      <Timer className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                      <input
                        type="number"
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3.5 text-white font-grotesk font-bold focus:outline-none focus:border-lime/40 transition-all"
                      />
                    </div>
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
                          intensity === level ? 'bg-electric text-white' : 'bg-white/5 text-neutral-500 hover:bg-white/10'
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
                  <textarea
                    value={equipment}
                    onChange={(e) => setEquipment(e.target.value)}
                    rows={2}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-white text-sm focus:outline-none focus:border-electric/40 transition-all resize-none"
                    placeholder="Dumbbells, resistance bands, etc."
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
