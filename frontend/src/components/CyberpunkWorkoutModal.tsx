import { useState } from 'react';
import { Zap, X, Dumbbell, Timer, Activity, CalendarDays, Target, Check } from 'lucide-react';
import { useAuthContext } from '../context/AuthContext';
import { trainingService } from '../services/trainingService';
import { trackEvent } from '../analytics';

// Vùng cơ ưu tiên → keyword nhóm cơ (primary_muscle) backend hiểu
const focusOptions: { label: string; muscles: string[] }[] = [
  { label: 'Mông',     muscles: ['glutes'] },
  { label: 'Đùi',      muscles: ['quadriceps', 'hamstrings'] },
  { label: 'Eo/Bụng',  muscles: ['core'] },
  { label: 'Lưng',     muscles: ['back'] },
  { label: 'Ngực',     muscles: ['chest'] },
  { label: 'Vai/Tay',  muscles: ['shoulders', 'biceps', 'triceps'] },
];
const dayOptions = [2, 3, 4, 5, 6];

interface Props {
  onClose: () => void;
  onSuccess: (data: any) => void;
  onQuotaExceeded?: () => void;
}

const programOptions = [
  { value: '8W',  label: '8 Tuần',  hint: 'Xây dựng cơ nền',     weeks: 8,  phase: 'foundation' },
  { value: '10W', label: '10 Tuần', hint: 'Cân bằng toàn diện',  weeks: 10, phase: 'foundation' },
  { value: '12W', label: '12 Tuần', hint: 'Sức bền & hiệu suất', weeks: 12, phase: 'foundation' },
];

const durationOptions = ['30', '45', '60'];

const equipmentPresets = [
  { label: 'Trọng lượng cơ thể', value: 'bodyweight',                emoji: '🤸', hint: 'Không cần thiết bị' },
  { label: 'Tạ đơn',  value: 'dumbbell, bodyweight',                 emoji: '🏋️', hint: 'Tạ đơn + trọng lượng cơ thể' },
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

export default function CyberpunkWorkoutModal({ onClose, onSuccess, onQuotaExceeded }: Props) {
  const { user } = useAuthContext();
  const [program, setProgram] = useState(programOptions[0]);
  const [equipment, setEquipment] = useState('full gym');
  const [intensity, setIntensity] = useState('moderate');
  const [duration, setDuration] = useState('45');
  const [goal, setGoal] = useState('weight_loss');
  const [daysPerWeek, setDaysPerWeek] = useState(4);
  const [focusLabels, setFocusLabels] = useState<string[]>([]);
  const [preferSplit, setPreferSplit] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggleFocus = (label: string) =>
    setFocusLabels(prev => prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]);

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
        daysPerWeek: daysPerWeek,
        focusAreas: focusLabels.flatMap(l => focusOptions.find(o => o.label === l)?.muscles || []),
        preferSplit: preferSplit ? 'per_area' : 'balanced',
      });

      if (response.success) {
        trackEvent('PlanGenerated', { type: 'workout' }); // activation aha-moment
        onSuccess(response.data);
      } else {
        if (response.error?.code === 'QUOTA_EXCEEDED') {
          onClose();
          onQuotaExceeded?.();
          return;
        }
        setError(response.error?.message || 'Tạo kế hoạch tập thất bại');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center overflow-y-auto p-4 animate-fade-in">
      <div className="relative max-h-[calc(100vh-2rem)] w-full max-w-lg bg-white rounded-[2.5rem] border border-slate-200 overflow-y-auto shadow-2xl animate-slide-up">
        
        {/* Header */}
        <div className="p-8 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center">
              <Dumbbell className="w-6 h-6 text-teal-600" />
            </div>
            <div>
              <h2 className="text-xl font-grotesk font-bold text-slate-900 tracking-tight">AI Lập Kế Hoạch Tập</h2>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-widest">Tạo kế hoạch nhiều tuần</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full transition-colors text-slate-500 hover:text-slate-900">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-8 pb-28 space-y-8">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-8">
              <div className="relative w-20 h-20">
                <div className="absolute inset-0 border-2 border-teal-100 rounded-full"></div>
                <div className="absolute inset-0 border-2 border-teal-500 rounded-full border-t-transparent animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Activity className="w-8 h-8 text-teal-600" />
                </div>
              </div>
              <div className="text-center space-y-3">
                <p className="text-slate-900 text-xl font-grotesk font-bold">AI đang phân tích cơ bắp</p>
                <div className="flex flex-col gap-1">
                  <p className="text-slate-500 text-sm animate-pulse">Đang tính toán tải trọng sinh cơ học...</p>
                  <p className="text-slate-500 text-sm animate-pulse delay-75">Đang tạo kế hoạch tuần 1...</p>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-6">
                <div className="grid gap-6">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-3 block">
                      Chương trình
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {programOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setProgram(option)}
                          className={`min-h-[72px] rounded-2xl border px-3 py-3 text-left transition-all ${
                            program.value === option.value
                              ? 'border-lime/50 bg-teal-50 text-teal-600 shadow-lg shadow-lime/5'
                              : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <span className="block font-grotesk text-base font-bold leading-tight">{option.label}</span>
                          <span className={`mt-1 block text-[11px] font-medium ${program.value === option.value ? 'text-teal-600' : 'text-slate-500'}`}>
                            {option.hint}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-3 block">
                      Thời lượng / buổi (phút)
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {durationOptions.map((minutes) => (
                        <button
                          key={minutes}
                          type="button"
                          onClick={() => setDuration(minutes)}
                          className={`py-3 rounded-xl font-bold font-grotesk text-xs uppercase tracking-widest transition-all ${
                            duration === minutes ? 'bg-teal-600 text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-50'
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
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-3 block">
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
                            ? 'border-lime/50 bg-teal-50 text-teal-600 shadow-lg shadow-lime/5'
                            : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <span className="text-lg leading-none">{opt.emoji}</span>
                        <span className="font-grotesk text-[10px] font-bold leading-tight text-center">{opt.label}</span>
                        <span className={`text-[11px] font-medium leading-tight text-center ${goal === opt.value ? 'text-teal-600' : 'text-slate-400'}`}>
                          {opt.hint}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Số buổi/tuần */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-3 flex items-center gap-1.5">
                    <CalendarDays className="w-3.5 h-3.5" /> Số buổi / tuần
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {dayOptions.map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDaysPerWeek(d)}
                        className={`py-3 rounded-xl font-bold font-grotesk text-sm transition-all ${
                          daysPerWeek === d ? 'bg-teal-600 text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2">Hệ thống tự chọn cách chia phù hợp trình độ & số ngày của bạn.</p>
                </div>

                {/* Vùng cơ ưu tiên */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-3 flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5" /> Vùng cơ ưu tiên <span className="text-slate-400 normal-case tracking-normal">(tùy chọn)</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {focusOptions.map((opt) => {
                      const on = focusLabels.includes(opt.label);
                      return (
                        <button
                          key={opt.label}
                          type="button"
                          onClick={() => toggleFocus(opt.label)}
                          className={`py-2.5 rounded-xl font-grotesk text-xs font-semibold border transition-all flex items-center justify-center gap-1.5 ${
                            on ? 'bg-teal-50 border-teal-300 text-teal-600' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                          }`}
                        >
                          {on && <Check className="w-3 h-3" />}{opt.label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2">Ưu tiên thêm khối lượng cho vùng đã chọn — vẫn giữ cân bằng cơ.</p>
                </div>

                {/* Toggle: mỗi ngày một vùng */}
                <button
                  type="button"
                  onClick={() => setPreferSplit(s => !s)}
                  className={`w-full flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 transition-all ${
                    preferSplit ? 'border-teal-300 bg-teal-50' : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <div className="text-left">
                    <p className="text-sm font-semibold text-slate-900">Chia "mỗi ngày một vùng"</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Kiểu Đẩy/Kéo/Chân — cần trung cấp+ & ≥5 buổi (nếu không hệ thống sẽ tự chỉnh).</p>
                  </div>
                  <span className={`shrink-0 w-10 h-6 rounded-full transition-colors relative ${preferSplit ? 'bg-teal-600' : 'bg-slate-200'}`}>
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${preferSplit ? 'left-[18px]' : 'left-0.5'}`} />
                  </span>
                </button>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-3 block">
                    Cường độ
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 'low',      label: 'Nhẹ' },
                      { value: 'moderate', label: 'Vừa' },
                      { value: 'high',     label: 'Cao' },
                    ].map(({ value: level, label: levelLabel }) => (
                      <button
                        key={level}
                        onClick={() => setIntensity(level)}
                        className={`py-3 rounded-xl font-bold font-grotesk text-xs uppercase tracking-widest transition-all ${
                          intensity === level ? 'bg-teal-600 text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                        }`}
                      >
                        {levelLabel}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-3 block">
                    Thiết bị tập
                  </label>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {equipmentPresets.map((preset) => (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => setEquipment(preset.value)}
                        className={`py-2.5 rounded-xl font-grotesk text-xs font-semibold transition-all flex flex-col items-center gap-1 ${
                          equipment === preset.value
                            ? 'bg-teal-50 border border-teal-300 text-teal-600'
                            : 'bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-50'
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
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 text-xs focus:outline-none focus:border-teal-400 transition-all"
                    placeholder="tạ tay, tạ đòn, tự trọng lượng..."
                  />
                </div>

                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-500 text-xs font-medium flex items-center gap-3">
                    <X className="w-4 h-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
              </div>

              <button
                onClick={handleGenerate}
                className="w-full rounded-2xl bg-teal-600 text-white hover:bg-teal-700 transition-colors py-5 text-sm font-grotesk font-bold uppercase tracking-widest shadow-[0_14px_30px_-10px_rgba(13,148,136,0.6)] group"
              >
                <div className="flex items-center justify-center gap-3 relative z-10 group-active:scale-95 transition-transform">
                  <Zap className="w-5 h-5" fill="currentColor" />
                  TẠO KẾ HOẠCH AI
                </div>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
