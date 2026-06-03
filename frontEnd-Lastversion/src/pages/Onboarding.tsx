import { useState, useMemo, useEffect } from 'react';
import type { LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowRight, 
  ArrowLeft, 
  Zap, 
  Target, 
  Activity, 
  Heart, 
  Dumbbell, 
  UtensilsCrossed 
} from 'lucide-react';
import { toast } from 'sonner';
import { userService } from '../services/userService';


interface FormData {
  age: string;
  weight: string;
  height: string;
  gender: string;
  goal: string;
  activityLevel: string;
  injuries: string[];
  equipment: string[];
  dietType: string;
}


const activityLevels = [
  { id: 'sedentary', label: 'Ít vận động', desc: 'Hầu như không tập' },
  { id: 'light', label: 'Vận động nhẹ', desc: '1-3 ngày/tuần' },
  { id: 'moderate', label: 'Vận động vừa', desc: '3-5 ngày/tuần' },
  { id: 'very', label: 'Vận động nhiều', desc: '6-7 ngày/tuần' },
];

const injuriesList = [
  { id: 'none', label: 'Không chấn thương' },
  { id: 'back', label: 'Đau lưng' },
  { id: 'knee', label: 'Vấn đề đầu gối' },
  { id: 'shoulder', label: 'Đau vai' },
  { id: 'ankle', label: 'Cổ chân / Bàn chân' },
  { id: 'wrist', label: 'Cổ tay / Bàn tay' },
];

const equipmentList = [
  { id: 'dumbbells', label: 'Tạ đơn' },
  { id: 'barbell', label: 'Tạ đòn' },
  { id: 'kettlebell', label: 'Tạ ấm' },
  { id: 'machine', label: 'Máy tập' },
  { id: 'bodyweight', label: 'Chỉ trọng lượng cơ thể' },
  { id: 'bands', label: 'Dây kháng lực' },
];

const dietTypes = [
  { id: 'omnivore', label: 'Ăn tạp', icon: '🍖' },
  { id: 'vegetarian', label: 'Ăn chay', icon: '🥗' },
  { id: 'vegan', label: 'Thuần chay', icon: '🌱' },
  { id: 'keto', label: 'Keto', icon: '🥑' },
];

const steps: Array<{
  title: string;
  subtitle: string;
  icon: LucideIcon | string;
}> = [
  { title: 'Số đo cơ thể', subtitle: 'Dùng để tính nhu cầu năng lượng mỗi ngày của bạn.', icon: Activity },
  { title: 'Mục tiêu chính', subtitle: 'Bạn đang tập luyện vì điều gì?', icon: Target },
  { title: 'Mức độ vận động', subtitle: 'Hiện tại bạn tập luyện thường xuyên thế nào?', icon: Heart },
  { title: 'Có chấn thương không?', subtitle: 'Giúp chúng tôi tạo bài tập an toàn cho bạn.', icon: '⚠️' },
  { title: 'Thiết bị sẵn có', subtitle: 'Bạn có thể sử dụng những gì?', icon: Dumbbell },
  { title: 'Chế độ ăn', subtitle: 'Chúng tôi sẽ điều chỉnh thực đơn phù hợp.', icon: UtensilsCrossed },
];

function ParticleField() {
  const particles = useMemo(() => Array.from({ length: 6 }, (_, i) => ({
    id: i,
    left: 15 + (i * 14) % 85,
    delay: i * 1,
    duration: 6 + (i % 2) * 2,
    size: 1 + (i % 2),
  })), []);
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {particles.map(p => (
        <div key={p.id} className="absolute rounded-full bg-lime opacity-0"
          style={{ left: `${p.left}%`, bottom: '-10px', width: `${p.size}px`, height: `${p.size}px`, animation: `particle ${p.duration}s linear ${p.delay}s infinite` }} />
      ))}
    </div>
  );
}

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [backendGoals, setBackendGoals] = useState<any[]>([]);
  const [form, setForm] = useState<FormData>({
    age: '',
    weight: '',
    height: '',
    gender: '',
    goal: '',
    activityLevel: 'moderate',
    injuries: [],
    equipment: [],
    dietType: '',
  });

  useEffect(() => {
    const fetchGoals = async () => {
      try {
        const response = await userService.getGoals();
        if (response.success && response.data) {
          const data = (response.data as any).data || response.data;
          if (Array.isArray(data)) {
            setBackendGoals(data);
            if (data.length > 0) {
               setForm(prev => ({ ...prev, goal: data[0].name }));
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch goals:", err);
      }
    };
    fetchGoals();
  }, []);

  const update = (field: keyof FormData, value: any) => setForm(prev => ({ ...prev, [field]: value }));

  const toggleArrayItem = (field: 'injuries' | 'equipment', id: string) => {
    update(field, form[field].includes(id) ? form[field].filter(i => i !== id) : [...form[field], id]);
  };

  const canAdvance = () => {
    switch (step) {
      case 0: return !!(form.age && form.weight && form.height && form.gender);
      case 1: return !!form.goal;
      case 2: return !!form.activityLevel;
      case 4: return form.equipment.length > 0;
      case 5: return !!form.dietType;
      default: return true;
    }
  };

  const submitProfileToBackend = async () => {
    setIsSubmitting(true);
    try {
      const mapExperienceLevel = (level: string) => {
        const mapping: Record<string, string> = {
          'sedentary': 'beginner',
          'light': 'beginner',
          'moderate': 'intermediate',
          'very': 'advanced'
        };
        return mapping[level] || 'beginner';
      };

      // Map gender to backend expected values for BMR calculation (MALE/FEMALE)
      const mapGender = (g: string): string => {
        if (g === 'male') return 'MALE';
        if (g === 'female') return 'FEMALE';
        return 'MALE';
      };

      const payload = {
        height: parseFloat(form.height),
        weight: parseFloat(form.weight),
        bodyFat: 0,
        muscleMass: 0,
        age: parseInt(form.age),
        gender: mapGender(form.gender),
        experienceLevel: mapExperienceLevel(form.activityLevel),
        goal: form.goal,
        injuryNotes: form.injuries.length > 0 ? form.injuries.join(', ') : 'none'
      };

      const healthPayload = {
        heightCm: parseFloat(form.height),
        weightKg: parseFloat(form.weight),
        age: parseInt(form.age),
        gender: mapGender(form.gender),
        dailyActivityLevel: form.activityLevel,
        currentInjuries: form.injuries.length > 0 ? form.injuries.join(', ') : 'none',
        availableEquipment: form.equipment.length > 0 ? form.equipment.join(', ') : 'none',
        currentDietType: form.dietType,
        primaryGoal: form.goal,
      };

      await userService.postBodyProfile(payload);
      await userService.postHealthProfile(healthPayload);

      // Hồ sơ đã lưu → sang màn ĐÁNH GIÁ THỂ TRẠNG (BMI/BMR/TDEE),
      // sau đó mới tới /welcome để thiết lập ngân sách + kho thực phẩm.
      navigate('/assessment', {
        state: {
          age: parseInt(form.age),
          weight: parseFloat(form.weight),
          height: parseFloat(form.height),
          gender: form.gender,
          goal: form.goal,
          activityLevel: form.activityLevel,
        },
      });

    } catch (error) {
      console.error("Lỗi khi lưu Health Profile:", error);
      toast.error("Đã có lỗi xảy ra khi lưu hồ sơ!");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    if (step < steps.length - 1) setStep(s => s + 1);
    else submitProfileToBackend();
  };

  const StepIcon = typeof steps[step].icon === 'string' ? null : steps[step].icon as LucideIcon;
  const StepGlyph = typeof steps[step].icon === 'string' ? steps[step].icon : null;

  return (
    <div className="min-h-screen bg-obsidian flex items-center justify-center relative overflow-hidden font-inter px-6">
      <ParticleField />

      <div className="w-full max-w-2xl relative z-10 animate-fade-in">
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-lime flex items-center justify-center">
              <Zap className="w-4 h-4 text-obsidian" fill="currentColor" />
            </div>
            <span className="font-grotesk font-bold text-white text-lg">Fitnit</span>
          </div>
        </div>

        <div className="flex items-center gap-1 mb-8">
          {steps.map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-500 ${i <= step ? 'bg-lime' : 'bg-white/[0.06]'}`} />
          ))}
        </div>

        <div className="text-center mb-6">
          <div className="text-neutral-400 text-xs font-grotesk uppercase tracking-widest">Bước {step + 1} / {steps.length}</div>
        </div>

        <div className="glass rounded-3xl p-8 border border-white/5 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-2xl bg-lime/10 flex items-center justify-center">
               {StepIcon ? <StepIcon className="w-5 h-5 text-lime" /> : <span className="text-xl">{StepGlyph}</span>}
            </div>
            <div>
              <h2 className="font-grotesk font-bold text-white text-xl">{steps[step].title}</h2>
              <p className="text-neutral-400 text-sm">{steps[step].subtitle}</p>
            </div>
          </div>

          {/* Step 0: Metrics + Gender */}
          {step === 0 && (
            <div className="space-y-4">
              {/* Numeric inputs */}
              {[
                { field: 'age' as const, label: 'Tuổi', unit: 'tuổi' },
                { field: 'weight' as const, label: 'Cân nặng', unit: 'kg' },
                { field: 'height' as const, label: 'Chiều cao', unit: 'cm' },
              ].map(({ field, label, unit }) => (
                <div key={field}>
                  <label className="text-neutral-400 text-xs font-medium uppercase tracking-wider mb-2 block">{label}</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={form[field]}
                      onChange={e => update(field, e.target.value)}
                      className="w-full bg-white/[0.06] border border-white/10 rounded-2xl px-4 py-3.5 text-white focus:outline-none focus:border-lime/40 transition-all pr-16"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 text-sm">{unit}</span>
                  </div>
                </div>
              ))}

              {/* Gender selector */}
              <div>
                <label className="text-neutral-400 text-xs font-medium uppercase tracking-wider mb-3 block">
                  Giới tính <span className="text-amber-400">*</span>
                  <span className="normal-case ml-2 text-neutral-500 tracking-normal font-normal">— dùng để tính BMR &amp; lượng calo</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => update('gender', 'male')}
                    className={`p-4 rounded-2xl border transition-all duration-200 flex flex-col items-center gap-2 ${
                      form.gender === 'male'
                        ? 'bg-lime/10 border-lime/40 text-lime shadow-lg shadow-lime/5'
                        : 'bg-white/[0.06] border-white/10 text-neutral-300 hover:border-white/20 hover:bg-white/[0.06]'
                    }`}
                  >
                    <span className="text-3xl select-none">👨</span>
                    <span className="font-grotesk font-semibold text-sm">Nam</span>
                    <span className={`text-xs font-mono ${form.gender === 'male' ? 'text-lime/70' : 'text-neutral-600'}`}>
                      BMR +5 kcal
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => update('gender', 'female')}
                    className={`p-4 rounded-2xl border transition-all duration-200 flex flex-col items-center gap-2 ${
                      form.gender === 'female'
                        ? 'bg-pink-500/10 border-pink-400/50 text-pink-300 shadow-lg shadow-pink-500/5'
                        : 'bg-white/[0.06] border-white/10 text-neutral-300 hover:border-white/20 hover:bg-white/[0.06]'
                    }`}
                  >
                    <span className="text-3xl select-none">👩</span>
                    <span className="font-grotesk font-semibold text-sm">Nữ</span>
                    <span className={`text-xs font-mono ${form.gender === 'female' ? 'text-pink-400/70' : 'text-neutral-600'}`}>
                      BMR −161 kcal
                    </span>
                  </button>
                </div>

                {!form.gender && (
                  <p className="mt-2 text-xs text-center text-amber-500/70">
                    ⚠️ Chọn giới tính để tiếp tục — ảnh hưởng đến kế hoạch calo cá nhân hóa của bạn
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Step 1: Goal */}
          {step === 1 && (
            <div className="grid grid-cols-2 gap-3">
              {backendGoals.map(g => (
                <button key={g.id} onClick={() => update('goal', g.name)}
                  className={`p-4 rounded-2xl text-left transition-all border ${form.goal === g.name ? 'bg-lime/10 border-lime/30 text-lime' : 'bg-white/[0.06] border-white/5 text-white'}`}>
                  <div className="text-2xl mb-2">
                    {g.imageLink ? <img src={g.imageLink} alt="" className="w-8 h-8 object-contain" /> : '🎯'}
                  </div>
                  <div className="font-grotesk font-semibold text-sm">{g.name}</div>
                  <div className="text-[10px] text-neutral-500 mt-1 line-clamp-1">{g.description}</div>
                </button>
              ))}
            </div>
          )}

          {/* Step 2: Activity Level */}
          {step === 2 && (
            <div className="space-y-2">
              {activityLevels.map(level => (
                <button key={level.id} onClick={() => update('activityLevel', level.id)}
                  className={`w-full p-4 rounded-2xl text-left border transition-all ${form.activityLevel === level.id ? 'bg-lime/10 border-lime/30 text-lime' : 'bg-white/[0.06] border-white/5 text-white'}`}>
                  <div className="font-grotesk font-semibold">{level.label}</div>
                  <div className="text-neutral-400 text-xs">{level.desc}</div>
                </button>
              ))}
            </div>
          )}

          {/* Step 3: Injuries */}
          {step === 3 && (
            <div className="space-y-2">
              {injuriesList.map(inj => (
                <button key={inj.id} onClick={() => toggleArrayItem('injuries', inj.id)}
                  className={`w-full p-3 rounded-2xl text-left border transition-all flex items-center gap-3 ${form.injuries.includes(inj.id) ? 'bg-lime/10 border-lime/30 text-lime' : 'bg-white/[0.06] border-white/5 text-white'}`}>
                  <div className={`w-4 h-4 rounded border flex items-center justify-center ${form.injuries.includes(inj.id) ? 'bg-lime border-lime' : 'border-neutral-500'}`}>
                    {form.injuries.includes(inj.id) && <div className="w-2 h-2 bg-obsidian rounded-full" />}
                  </div>
                  <span className="text-sm">{inj.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Step 4: Equipment */}
          {step === 4 && (
            <div className="grid grid-cols-2 gap-3">
              {equipmentList.map(eq => (
                <button key={eq.id} onClick={() => toggleArrayItem('equipment', eq.id)}
                  className={`p-4 rounded-2xl text-left border transition-all ${form.equipment.includes(eq.id) ? 'bg-lime/10 border-lime/30 text-lime' : 'bg-white/[0.06] border-white/5 text-white'}`}>
                  <div className="font-grotesk font-semibold text-sm flex justify-between items-center">
                    {eq.label}
                    {form.equipment.includes(eq.id) && <div className="w-2 h-2 rounded-full bg-lime" />}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Step 5: Diet */}
          {step === 5 && (
            <div className="grid grid-cols-2 gap-3">
              {dietTypes.map(d => (
                <button key={d.id} onClick={() => update('dietType', d.id)}
                  className={`p-4 rounded-2xl text-left border transition-all ${form.dietType === d.id ? 'bg-lime/10 border-lime/30 text-lime' : 'bg-white/[0.06] border-white/5 text-white'}`}>
                  <div className="text-2xl mb-2">{d.icon}</div>
                  <div className="font-grotesk font-semibold text-sm">{d.label}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <button onClick={() => setStep(s => s - 1)} disabled={step === 0 || isSubmitting}
            className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-grotesk font-medium text-sm transition-all ${step === 0 ? 'opacity-30 cursor-not-allowed' : 'text-white hover:bg-white/[0.06]'}`}>
            <ArrowLeft className="w-4 h-4" /> Quay lại
          </button>
          <button onClick={handleNext} disabled={!canAdvance() || isSubmitting}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-grotesk font-semibold text-sm transition-all ${canAdvance() && !isSubmitting ? 'bg-lime text-obsidian' : 'bg-white/[0.06] text-neutral-500'}`}>
            {isSubmitting ? 'Đang xử lý...' : step === steps.length - 1 ? 'Tạo kế hoạch' : 'Tiếp tục'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
