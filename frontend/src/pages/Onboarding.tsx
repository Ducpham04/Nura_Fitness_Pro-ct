import { useState, useEffect, useRef, useMemo, useCallback, Fragment } from 'react';
import type { LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Crosshair, ScanLine, Award, Sparkles,
  Sofa, Footprints, Bike, Rocket, Gauge, Check,
  Flame, Dumbbell, HeartPulse, Wind, Trophy, Zap, Activity, Target,
} from 'lucide-react';
import { toast } from 'sonner';
import { userService } from '../services/userService';
import { Vico } from '../components/ViwayIcons';

interface FormData {
  age: string; weight: string; height: string; gender: string;
  goal: string; activityLevel: string; dietType: string;
}

const LIME = '#CCFF00';

/* ── Number scroll picker ─────────────────────────────────────────── */
const ITEM_H = 44;
const PAD    = 2;

function NumberPicker({ value, onChange, min, max, label, unit, defaultVal }: {
  value: string; onChange: (v: string) => void;
  min: number; max: number; label: string; unit: string; defaultVal: number;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const timer     = useRef<ReturnType<typeof setTimeout>>();
  const numbers   = useMemo(() => Array.from({ length: max - min + 1 }, (_, i) => min + i), [min, max]);
  const curNum    = value ? parseInt(value) : defaultVal;

  useEffect(() => {
    const idx = numbers.indexOf(defaultVal);
    if (idx >= 0 && scrollRef.current) scrollRef.current.scrollTop = idx * ITEM_H;
    onChange(String(defaultVal));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onScroll = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (!scrollRef.current) return;
      const idx = Math.round(scrollRef.current.scrollTop / ITEM_H);
      const val = numbers[Math.max(0, Math.min(idx, numbers.length - 1))];
      if (val !== undefined) onChange(String(val));
    }, 60);
  }, [numbers, onChange]);

  return (
    <div className="flex flex-col items-center">
      <label className="block text-neutral-500 text-[11px] font-medium mb-2 text-center tracking-wide uppercase">{label}</label>
      <div className="relative w-full overflow-hidden" style={{ height: ITEM_H * (PAD * 2 + 1) }}>
        {/* selection band */}
        <div className="absolute inset-x-1 pointer-events-none" style={{ zIndex: 1, top: PAD * ITEM_H, height: ITEM_H, background: 'rgba(204,255,0,0.06)', border: `1.5px solid rgba(204,255,0,0.35)`, borderRadius: 12 }} />

        <div ref={scrollRef} onScroll={onScroll}
          className="vw-picker-scroll absolute inset-0 overflow-y-scroll"
          style={{ scrollSnapType: 'y mandatory', scrollbarWidth: 'none', zIndex: 10 }}>
          {Array.from({ length: PAD }, (_, i) => <div key={`t${i}`} style={{ height: ITEM_H }} />)}
          {numbers.map(n => (
            <div key={n} style={{ height: ITEM_H, scrollSnapAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{
                fontSize:   n === curNum ? 24 : 16,
                fontWeight: n === curNum ? 700 : 400,
                color:      n === curNum ? LIME : '#374151',
                transition: 'all 0.12s',
                lineHeight: 1,
                fontFamily: n === curNum ? 'Space Grotesk, sans-serif' : 'inherit',
              }}>{n}</span>
            </div>
          ))}
          {Array.from({ length: PAD }, (_, i) => <div key={`b${i}`} style={{ height: ITEM_H }} />)}
        </div>

        {/* fade masks */}
        <div className="absolute inset-x-0 top-0 pointer-events-none" style={{ zIndex: 20, height: PAD * ITEM_H, background: 'linear-gradient(to bottom, #111318 40%, transparent)' }} />
        <div className="absolute inset-x-0 bottom-0 pointer-events-none" style={{ zIndex: 20, height: PAD * ITEM_H, background: 'linear-gradient(to top, #111318 40%, transparent)' }} />
      </div>
      <p className="text-center text-[10px] text-neutral-600 mt-1.5 font-medium tracking-widest uppercase">{unit}</p>
    </div>
  );
}

/* ── Data ─────────────────────────────────────────────────────────── */
const FALLBACK_GOALS = [
  { id: 'fb-1', name: 'Weight Loss'     },
  { id: 'fb-2', name: 'Muscle Gain'    },
  { id: 'fb-3', name: 'Endurance'      },
  { id: 'fb-4', name: 'General Fitness' },
  { id: 'fb-5', name: 'Flexibility'    },
  { id: 'fb-6', name: 'Strength'       },
];

type GoalInfo = { label: string; desc: string; color: string; mood: 'wave' | 'cheer' | 'training' | 'water' | 'sleep' | 'streak' | 'default'; Icon: LucideIcon; bgImage: string };

function getGoalBgSVG(name: string): string {
  const g = (name || '').toLowerCase();
  // Giảm mỡ - Scale/weight icon
  if (/lose|weight loss|fat|giảm|mỡ/.test(g)) return `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cellipse cx='100' cy='140' rx='60' ry='15' fill='rgba(249,115,22,0.08)'/%3E%3Crect x='70' y='100' width='60' height='35' rx='8' fill='none' stroke='rgba(249,115,22,0.12)' stroke-width='2'/%3E%3Cpath d='M 100 60 L 85 100 L 115 100 Z' fill='rgba(249,115,22,0.1)'/%3E%3C/svg%3E")`;
  // Tăng cơ - Dumbbell
  if (/muscle|cơ|hypertrophy|gain|build/.test(g)) return `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='30' y='85' width='140' height='12' rx='6' fill='rgba(204,255,0,0.08)'/%3E%3Crect x='10' y='70' width='30' height='40' rx='6' fill='rgba(204,255,0,0.12)'/%3E%3Crect x='160' y='70' width='30' height='40' rx='6' fill='rgba(204,255,0,0.12)'/%3E%3C/svg%3E")`;
  // Sức bền - Running figure
  if (/endurance|cardio|stamina|bền/.test(g)) return `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='120' cy='50' r='15' fill='rgba(239,68,68,0.1)'/%3E%3Cpath d='M 120 70 L 100 110 L 130 95' stroke='rgba(239,68,68,0.12)' stroke-width='3' fill='none' stroke-linecap='round'/%3E%3Cpath d='M 90 95 L 70 150' stroke='rgba(239,68,68,0.1)' stroke-width='3' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`;
  // Dẻo dai - Yoga pose
  if (/flexib|mobility|dẻo|linh hoạt/.test(g)) return `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='100' cy='60' r='12' fill='rgba(168,85,247,0.1)'/%3E%3Cpath d='M 100 75 Q 80 90 70 130' stroke='rgba(168,85,247,0.12)' stroke-width='2.5' fill='none' stroke-linecap='round'/%3E%3Cpath d='M 100 75 Q 120 90 130 130' stroke='rgba(168,85,247,0.12)' stroke-width='2.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`;
  // Thể thao - Lightning bolt
  if (/athletic|performance|thể thao|hiệu suất/.test(g)) return `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M 100 40 L 140 100 L 110 100 L 100 160 L 60 100 L 90 100 Z' fill='rgba(245,158,11,0.1)' stroke='rgba(245,158,11,0.12)' stroke-width='1.5'/%3E%3C/svg%3E")`;
  // Sức mạnh - Lifted weight
  if (/strength|sức mạnh|power/.test(g)) return `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='45' y='90' width='110' height='8' rx='4' fill='rgba(34,211,238,0.08)'/%3E%3Ccircle cx='60' cy='85' r='16' fill='none' stroke='rgba(34,211,238,0.12)' stroke-width='2'/%3E%3Ccircle cx='140' cy='85' r='16' fill='none' stroke='rgba(34,211,238,0.12)' stroke-width='2'/%3E%3Cpath d='M 100 50 L 100 80' stroke='rgba(34,211,238,0.1)' stroke-width='2'/%3E%3C/svg%3E")`;
  // Thể lực chung - Balance scale
  if (/general|fitness|maintain|duy trì|tổng/.test(g)) return `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M 50 120 L 100 60 L 150 120' fill='none' stroke='rgba(99,102,241,0.1)' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'/%3E%3Ccircle cx='70' cy='140' r='12' fill='rgba(99,102,241,0.08)'/%3E%3Ccircle cx='130' cy='140' r='12' fill='rgba(99,102,241,0.08)'/%3E%3C/svg%3E")`;
  return `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='100' cy='100' r='50' fill='none' stroke='rgba(148,163,184,0.1)' stroke-width='2'/%3E%3C/svg%3E")`;
}

function goalDisplay(name: string): GoalInfo {
  const g = (name || '').toLowerCase();
  if (/lose|weight loss|fat|giảm|mỡ/.test(g))            return { label: 'Giảm mỡ',       desc: 'Đốt mỡ thừa, lấy lại vóc dáng tự tin.',          color: '#f97316', mood: 'cheer', Icon: Flame, bgImage: getGoalBgSVG(name) };
  if (/muscle|cơ|hypertrophy|gain|build/.test(g))         return { label: 'Tăng cơ',       desc: 'Cơ rắn chắc, thân hình thon gọn hơn mỗi tuần.',  color: LIME, mood: 'training', Icon: Dumbbell, bgImage: getGoalBgSVG(name) };
  if (/endurance|cardio|stamina|bền/.test(g))             return { label: 'Sức bền',       desc: 'Tim khoẻ hơn, vận động lâu mà ít mệt.',          color: '#ef4444', mood: 'training', Icon: HeartPulse, bgImage: getGoalBgSVG(name) };
  if (/flexib|mobility|dẻo|linh hoạt/.test(g))           return { label: 'Dẻo dai',       desc: 'Khớp linh hoạt, giảm đau lưng và nguy cơ chấn thương.',color: '#a855f7', mood: 'wave', Icon: Wind, bgImage: getGoalBgSVG(name) };
  if (/athletic|performance|thể thao|hiệu suất/.test(g)) return { label: 'Thể thao',      desc: 'Nhanh hơn, bùng nổ hơn — đỉnh cao phong độ.',    color: '#f59e0b', mood: 'training', Icon: Trophy, bgImage: getGoalBgSVG(name) };
  if (/strength|sức mạnh|power/.test(g))                 return { label: 'Sức mạnh',      desc: 'Nâng nặng hơn mỗi tuần, cảm giác mạnh mẽ thật sự.',color: '#22d3ee', mood: 'training', Icon: Zap, bgImage: getGoalBgSVG(name) };
  if (/general|fitness|maintain|duy trì|tổng/.test(g))   return { label: 'Thể lực chung', desc: 'Khoẻ, dẻo, bền — không cực đoan, bền vững lâu dài.',color: '#6366f1', mood: 'wave', Icon: Activity, bgImage: getGoalBgSVG(name) };
  return { label: name, desc: '', color: '#94a3b8', mood: 'default', Icon: Target, bgImage: getGoalBgSVG(name) };
}

const activityLevels: Array<{ id: string; label: string; desc: string; Icon: LucideIcon; color: string }> = [
  { id: 'sedentary', label: 'Ít vận động',    desc: 'Công việc văn phòng, ít đi lại trong ngày.',       Icon: Sofa,       color: '#64748b' },
  { id: 'light',    label: 'Vận động nhẹ',   desc: 'Đi bộ hoặc tập nhẹ vài buổi mỗi tuần.',           Icon: Footprints, color: LIME      },
  { id: 'moderate', label: 'Vận động đều',   desc: 'Tập 3–5 ngày/tuần, giữ sức khoẻ ổn định.',        Icon: Bike,       color: '#007AFF' },
  { id: 'very',     label: 'Vận động nhiều', desc: 'Cường độ cao gần như mỗi ngày — bạn nghiêm túc.',  Icon: Rocket,     color: '#a855f7' },
];

const STEPS = [
  { title: 'Thông tin cơ thể của bạn',   subtitle: 'Dữ liệu này giúp Viway cá nhân hoá kế hoạch',  Icon: ScanLine   },
  { title: 'Bạn muốn đạt được điều gì?', subtitle: 'Chọn mục tiêu chính của bạn',                   Icon: Crosshair  },
  { title: 'Mức độ vận động hiện tại',   subtitle: 'Bạn đang tập luyện thường xuyên thế nào?',      Icon: Gauge      },
];

/* ── Page ─────────────────────────────────────────────────────────── */
export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [backendGoals, setBackendGoals] = useState<any[]>([]);
  const [goalsLoading, setGoalsLoading] = useState(true);

  const [form, setForm] = useState<FormData>({
    age: '', weight: '', height: '', gender: '',
    // dietType mặc định "Ăn đa dạng" — người dùng có thể đổi trong app sau,
    // giúp rút onboarding còn 3 bước.
    goal: '', activityLevel: 'moderate', dietType: 'omnivore',
  });

  useEffect(() => {
    userService.getGoals()
      .then(res => {
        if (res.success && res.data) {
          const data = (res.data as any).data || res.data;
          if (Array.isArray(data) && data.length > 0) setBackendGoals(data);
        }
      })
      .catch(() => {})
      .finally(() => setGoalsLoading(false));
  }, []);

  const displayGoals = backendGoals.length > 0 ? backendGoals : FALLBACK_GOALS;
  const update = (field: keyof FormData, value: string) => setForm(p => ({ ...p, [field]: value }));

  const canAdvance = () => {
    if (step === 0) return !!(form.age && form.weight && form.height && form.gender);
    if (step === 1) return !!form.goal;
    if (step === 2) return !!form.activityLevel;
    return true;
  };

  const submitProfile = async () => {
    setIsSubmitting(true);
    try {
      const mapLevel  = (l: string) => ({ sedentary: 'beginner', light: 'beginner', moderate: 'intermediate', very: 'advanced' }[l] ?? 'beginner');
      const mapGender = (g: string) => g === 'female' ? 'FEMALE' : 'MALE';

      await userService.postBodyProfile({
        height: parseFloat(form.height), weight: parseFloat(form.weight),
        bodyFat: 0, muscleMass: 0, age: parseInt(form.age),
        gender: mapGender(form.gender), experienceLevel: mapLevel(form.activityLevel),
        goal: form.goal, injuryNotes: 'none',
      });
      await userService.postHealthProfile({
        heightCm: parseFloat(form.height), weightKg: parseFloat(form.weight),
        age: parseInt(form.age), gender: mapGender(form.gender),
        dailyActivityLevel: form.activityLevel, currentInjuries: 'none',
        availableEquipment: 'bodyweight', preferredWorkoutDurationMinutes: 45,
        currentDietType: form.dietType, primaryGoal: form.goal,
      });

      const ref = localStorage.getItem('pendingReferral');
      if (ref?.trim()) {
        try { await userService.applyReferralCode(ref.trim().toUpperCase()); } catch {}
        localStorage.removeItem('pendingReferral');
      }

      navigate('/assessment', {
        state: {
          age: parseInt(form.age), weight: parseFloat(form.weight),
          height: parseFloat(form.height), gender: form.gender,
          goal: form.goal, activityLevel: form.activityLevel,
        },
      });
    } catch {
      toast.error('Đã có lỗi xảy ra khi lưu hồ sơ!');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) setStep(s => s + 1);
    else submitProfile();
  };

  const ok = canAdvance();

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-4 font-inter text-white"
      style={{ background: '#0c0d11' }}
    >
      {/* Ambient lime orb */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(204,255,0,0.07) 0%, transparent 70%)' }} />
      </div>

      <div className="relative w-full max-w-md">

        {/* Top bar: back arrow + progress dots */}
        <div className="flex items-center gap-3 mb-5">
          <button
            onClick={() => setStep(s => s - 1)}
            disabled={step === 0 || isSubmitting}
            className={`flex h-9 w-9 items-center justify-center rounded-full border transition-all ${
              step === 0
                ? 'opacity-0 pointer-events-none border-transparent'
                : 'glass border-white/10 text-neutral-400 hover:text-white hover:border-white/20'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          {/* Dots + line */}
          <div className="flex flex-1 items-center justify-center">
            {STEPS.map((_, i) => (
              <Fragment key={i}>
                <div className="relative flex items-center justify-center">
                  {i === step && (
                    <span className="absolute w-5 h-5 rounded-full animate-ping"
                      style={{ background: 'rgba(204,255,0,0.18)' }} />
                  )}
                  <span className="relative rounded-full transition-all duration-300"
                    style={{
                      width: i === step ? 10 : 8,
                      height: i === step ? 10 : 8,
                      background: i <= step ? LIME : '#2a2d35',
                      boxShadow: i === step ? `0 0 10px ${LIME}` : 'none',
                    }} />
                </div>
                {i < STEPS.length - 1 && (
                  <div className="h-[1.5px] w-8 sm:w-12 rounded-full transition-all duration-500 mx-1"
                    style={{ background: i < step ? LIME : '#2a2d35' }} />
                )}
              </Fragment>
            ))}
          </div>

          <span className="text-[11px] font-bold text-neutral-400 w-12 text-right">Bước {step + 1}/{STEPS.length}</span>
        </div>

        {/* Header with Vico mascot */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <Vico size={88} mood={step === 0 ? 'wave' : step === 1 ? 'cheer' : step === 2 ? 'training' : 'wave'} />
          </div>
          <h2 className="font-grotesk font-bold text-white text-[32px] leading-tight tracking-tight mb-2">{STEPS[step].title}</h2>
          <p className="text-neutral-300 text-sm font-medium">{STEPS[step].subtitle}</p>
        </div>

        {/* Card */}
        <div className="glass rounded-3xl border border-white/[0.07] p-4 mb-4 shadow-[0_20px_60px_rgba(0,0,0,0.5)]">

          {/* ── Step 0: Gender + metrics ── */}
          {step === 0 && (
            <div className="space-y-4">
              {/* Gender */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'male',   glyph: '♂', label: 'Nam' },
                  { id: 'female', glyph: '♀', label: 'Nữ'  },
                ].map(g => {
                  const sel = form.gender === g.id;
                  return (
                    <button key={g.id} type="button" onClick={() => update('gender', g.id)}
                      className="py-3.5 rounded-2xl border flex items-center justify-center gap-2.5 transition-all"
                      style={sel
                        ? { borderColor: LIME, background: 'rgba(204,255,0,0.08)', boxShadow: `0 0 16px rgba(204,255,0,0.18)` }
                        : { borderColor: '#1f2129', background: '#13151a' }}>
                      <span className="text-xl leading-none" style={{ color: sel ? LIME : '#4b5563' }}>{g.glyph}</span>
                      <span className="font-semibold text-sm" style={{ color: sel ? LIME : '#9ca3af' }}>{g.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Number pickers */}
              <div className="grid grid-cols-3 gap-3"
                style={{ background: '#111318', borderRadius: 16, padding: '10px 8px' }}>
                <NumberPicker value={form.age}    onChange={v => update('age', v)}    min={10} max={80}   label="Tuổi"      unit="tuổi" defaultVal={25}  />
                <NumberPicker value={form.weight} onChange={v => update('weight', v)} min={30} max={150}  label="Cân nặng"  unit="kg"   defaultVal={65}  />
                <NumberPicker value={form.height} onChange={v => update('height', v)} min={130} max={220} label="Chiều cao" unit="cm"   defaultVal={170} />
              </div>

              {/* Privacy note */}
              <div className="flex items-center gap-2.5 rounded-2xl border border-white/[0.05] bg-white/[0.02] px-3.5 py-2.5">
                <Sparkles className="w-4 h-4 flex-shrink-0" style={{ color: LIME }} />
                <p className="text-[11.5px] text-neutral-500 leading-snug">Thông tin của bạn luôn được bảo mật và chỉ dùng để cá nhân hoá trải nghiệm.</p>
              </div>
            </div>
          )}

          {/* ── Step 1: Goal ── */}
          {step === 1 && (
            goalsLoading
              ? <div className="flex justify-center py-10"><div className="w-8 h-8 border-2 border-white/10 rounded-full animate-spin" style={{ borderTopColor: LIME }} /></div>
              : (
                <div className="grid grid-cols-2 gap-2.5">
                  {displayGoals.map(g => {
                    const gd  = goalDisplay(g.name);
                    const sel = form.goal === g.name;
                    return (
                      <button key={g.id} onClick={() => update('goal', g.name)}
                        className="relative p-3 rounded-2xl text-left border transition-all overflow-hidden group"
                        style={sel
                          ? { borderColor: LIME, background: '#13151a', backgroundImage: gd.bgImage, backgroundSize: 'cover', backgroundPosition: 'center', boxShadow: `0 0 0 1px ${LIME}55, 0 10px 28px rgba(204,255,0,0.12)` }
                          : { borderColor: '#1f2129', background: '#13151a', backgroundImage: gd.bgImage, backgroundSize: 'cover', backgroundPosition: 'center' }}>
                        {/* Dark overlay */}
                        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors pointer-events-none" />

                        {sel && (
                          <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full z-10"
                            style={{ background: LIME }}>
                            <Check className="w-3 h-3 text-black" strokeWidth={3} />
                          </span>
                        )}
                        <div className="flex justify-center mb-2 relative z-5">
                          <span className="flex h-12 w-12 items-center justify-center rounded-2xl"
                            style={{ background: `${gd.color}1f`, border: `1px solid ${gd.color}55` }}>
                            <gd.Icon className="w-6 h-6" style={{ color: gd.color }} />
                          </span>
                        </div>
                        <p className="font-bold text-sm leading-tight mb-1 text-center relative z-5" style={{ color: sel ? LIME : '#e5e7eb' }}>{gd.label}</p>
                        <p className="text-[10.5px] leading-snug text-neutral-300 relative z-5">{gd.desc}</p>
                      </button>
                    );
                  })}
                </div>
              )
          )}

          {/* ── Step 2: Activity level ── */}
          {step === 2 && (
            <div className="space-y-2.5">
              {activityLevels.map(lvl => {
                const sel = form.activityLevel === lvl.id;
                return (
                  <button key={lvl.id} onClick={() => update('activityLevel', lvl.id)}
                    className="w-full px-4 py-3.5 rounded-2xl text-left border flex items-center gap-3 transition-all"
                    style={sel
                      ? { borderColor: LIME, background: 'rgba(204,255,0,0.06)', boxShadow: `0 0 0 1px ${LIME}55` }
                      : { borderColor: '#1f2129', background: '#13151a' }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${lvl.color}1a`, border: `1px solid ${lvl.color}40` }}>
                      <lvl.Icon className="w-5 h-5" style={{ color: lvl.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm" style={{ color: sel ? LIME : '#e5e7eb' }}>{lvl.label}</p>
                      <p className="text-[11px] text-neutral-400 mt-0.5 leading-tight">{lvl.desc}</p>
                    </div>
                    <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
                      style={sel ? { borderColor: LIME, backgroundColor: LIME } : { borderColor: '#2a2d35' }}>
                      {sel && <Check className="w-3 h-3 text-black" strokeWidth={3} />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

        </div>

        {/* CTA button */}
        <button onClick={handleNext} disabled={!ok || isSubmitting}
          className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-full text-[15px] font-grotesk font-bold transition-all ${ok && !isSubmitting ? 'btn-lime' : ''}`}
          style={!ok || isSubmitting ? { background: '#13151a', color: '#374151', cursor: 'not-allowed' } : {}}>
          {isSubmitting ? (
            <><div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />Đang xử lý...</>
          ) : step === STEPS.length - 1 ? (
            <><Award className="w-4 h-4" />Tạo kế hoạch cho tôi</>
          ) : (
            <>Tiếp tục<ArrowRight className="w-4 h-4" /></>
          )}
        </button>

      </div>
    </div>
  );
}
