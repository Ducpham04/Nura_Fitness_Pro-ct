import { useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Zap, ArrowRight, Activity, Flame, Gauge, Target, HeartPulse } from 'lucide-react';

/**
 * Màn ĐÁNH GIÁ THỂ TRẠNG — hiển thị ngay sau Onboarding.
 * Tính BMI / BMR / TDEE / calo mục tiêu từ số đo người dùng vừa nhập
 * (truyền qua navigation state) rồi đưa ra nhận xét. Sau đó tiếp tục
 * sang /welcome để thiết lập ngân sách + kho thực phẩm.
 */

interface AssessmentState {
  age?: number;
  weight?: number;
  height?: number;
  gender?: string;       // 'male' | 'female'
  goal?: string;         // tên mục tiêu từ backend
  activityLevel?: string;// 'sedentary' | 'light' | 'moderate' | 'very'
}

const ACTIVITY_FACTOR: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very: 1.725,
};

function classifyBmi(bmi: number) {
  if (bmi < 18.5) return { label: 'Thiếu cân', color: 'text-blue-400', bar: 'bg-blue-400', note: 'Nên tăng cân lành mạnh, ưu tiên đủ năng lượng & protein.' };
  if (bmi < 23) return { label: 'Bình thường', color: 'text-lime', bar: 'bg-lime', note: 'Thể trạng cân đối — duy trì thói quen tốt là chính.' };
  if (bmi < 25) return { label: 'Thừa cân nhẹ', color: 'text-yellow-400', bar: 'bg-yellow-400', note: 'Hơi dư cân, có thể siết nhẹ calo kết hợp tập đều.' };
  if (bmi < 30) return { label: 'Thừa cân', color: 'text-orange-400', bar: 'bg-orange-400', note: 'Nên tạo thâm hụt calo vừa phải và tập đều đặn.' };
  return { label: 'Béo phì', color: 'text-red-400', bar: 'bg-red-400', note: 'Ưu tiên giảm mỡ an toàn, tham khảo chuyên gia nếu cần.' };
}

// Map tên mục tiêu (đa dạng) → hướng calo
function resolveGoalDirection(goal: string): 'deficit' | 'surplus' | 'maintain' {
  const g = (goal || '').toLowerCase();
  if (/giảm|lose|mỡ|fat|cut|weight_loss/.test(g)) return 'deficit';
  if (/tăng|gain|cơ|muscle|bulk|strength|sức mạnh/.test(g)) return 'surplus';
  return 'maintain';
}

export default function BodyAssessment() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state || {}) as AssessmentState;

  const hasData = !!(state.weight && state.height && state.age && state.gender);

  // Nếu vào trực tiếp không có dữ liệu → sang thẳng bước thiết lập
  useEffect(() => {
    if (!hasData) navigate('/welcome', { replace: true });
  }, [hasData, navigate]);

  const metrics = useMemo(() => {
    const weight = Number(state.weight) || 0;
    const height = Number(state.height) || 0;
    const age = Number(state.age) || 0;
    const isMale = state.gender === 'male' || state.gender === 'MALE';
    const heightM = height / 100;

    const bmi = heightM > 0 ? weight / (heightM * heightM) : 0;
    const bmr = 10 * weight + 6.25 * height - 5 * age + (isMale ? 5 : -161);
    const factor = ACTIVITY_FACTOR[state.activityLevel || 'moderate'] ?? 1.55;
    const tdee = bmr * factor;

    const dir = resolveGoalDirection(state.goal || '');
    const target = dir === 'deficit' ? tdee - 500 : dir === 'surplus' ? tdee + 300 : tdee;
    const dirLabel = dir === 'deficit' ? 'Giảm mỡ (thâm hụt ~500 kcal)' : dir === 'surplus' ? 'Tăng cơ (dư ~300 kcal)' : 'Duy trì';

    return {
      bmi,
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
      target: Math.round(target),
      bmiInfo: classifyBmi(bmi),
      dirLabel,
    };
  }, [state]);

  if (!hasData) return null;

  // Vị trí marker BMI trên thang 15–35
  const bmiPos = Math.min(100, Math.max(0, ((metrics.bmi - 15) / (35 - 15)) * 100));

  const cont = () => navigate('/welcome', { state: { goal: state.goal } });

  return (
    <div className="min-h-screen bg-obsidian flex items-center justify-center relative overflow-hidden font-inter px-6 py-12">
      {/* BG glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(204,255,0,0.08) 0%, transparent 70%)' }} />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(0,122,255,0.07) 0%, transparent 70%)' }} />

      <div className="w-full max-w-xl relative z-10 animate-fade-in">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-lime flex items-center justify-center">
              <Zap className="w-5 h-5 text-obsidian" fill="currentColor" />
            </div>
            <span className="font-grotesk font-bold text-white text-lg">Fitnit</span>
          </div>
        </div>

        {/* Tiêu đề */}
        <div className="text-center mb-7">
          <div className="inline-flex items-center gap-2 rounded-full border border-lime/25 bg-lime/[0.06] px-4 py-1.5 mb-4">
            <HeartPulse className="w-3.5 h-3.5 text-lime" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-lime">Phân tích thể trạng</span>
          </div>
          <h1 className="font-grotesk font-bold text-3xl sm:text-4xl text-white mb-2">Đánh giá cơ thể của bạn</h1>
          <p className="text-neutral-400 text-sm max-w-sm mx-auto">
            Dựa trên số đo bạn vừa nhập, đây là các chỉ số nền tảng AI dùng để cá nhân hóa kế hoạch.
          </p>
        </div>

        {/* BMI card */}
        <div className="glass rounded-3xl p-6 border border-white/5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Gauge className="w-4 h-4 text-neutral-400" />
              <span className="text-neutral-400 text-xs font-medium uppercase tracking-wider">Chỉ số khối cơ thể (BMI)</span>
            </div>
            <span className={`text-xs font-bold ${metrics.bmiInfo.color}`}>{metrics.bmiInfo.label}</span>
          </div>
          <div className="flex items-end gap-2 mb-4">
            <span className="font-grotesk font-bold text-4xl text-white leading-none">{metrics.bmi.toFixed(1)}</span>
            <span className="text-neutral-500 text-xs mb-1">kg/m²</span>
          </div>
          {/* Thang BMI */}
          <div className="relative h-2 rounded-full overflow-hidden bg-gradient-to-r from-blue-400 via-lime to-red-400 mb-1.5">
            <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white border-2 border-obsidian shadow"
              style={{ left: `calc(${bmiPos}% - 6px)` }} />
          </div>
          <div className="flex justify-between text-[11px] text-neutral-600 uppercase tracking-wider">
            <span>Thiếu cân</span><span>Bình thường</span><span>Béo phì</span>
          </div>
          <p className="text-neutral-400 text-xs mt-3 leading-relaxed">{metrics.bmiInfo.note}</p>
        </div>

        {/* 3 chỉ số năng lượng */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: 'BMR', value: metrics.bmr, sub: 'kcal nghỉ', icon: Activity, color: 'text-blue-400' },
            { label: 'TDEE', value: metrics.tdee, sub: 'kcal/ngày', icon: Flame, color: 'text-orange-400' },
            { label: 'Mục tiêu', value: metrics.target, sub: 'kcal/ngày', icon: Target, color: 'text-lime' },
          ].map(({ label, value, sub, icon: Icon, color }) => (
            <div key={label} className="glass rounded-2xl p-4 border border-white/5 text-center">
              <Icon className={`w-4 h-4 ${color} mx-auto mb-2`} />
              <div className="font-grotesk font-bold text-xl text-white leading-none">{value.toLocaleString('vi-VN')}</div>
              <div className="text-neutral-600 text-[11px] mt-1">{sub}</div>
              <div className="text-neutral-500 text-[10px] uppercase tracking-wider mt-1.5">{label}</div>
            </div>
          ))}
        </div>

        {/* Giải thích ngắn */}
        <div className="glass rounded-2xl p-4 border border-white/5 mb-6">
          <p className="text-neutral-400 text-xs leading-relaxed">
            <span className="text-white font-semibold">BMR</span> là năng lượng cơ thể đốt khi nghỉ ·{' '}
            <span className="text-white font-semibold">TDEE</span> là tổng năng lượng tiêu hao mỗi ngày theo mức vận động ·{' '}
            <span className="text-white font-semibold">Mục tiêu</span> đã điều chỉnh theo định hướng{' '}
            <span className="text-lime font-semibold">{metrics.dirLabel}</span>.
          </p>
        </div>

        {/* CTA */}
        <button onClick={cont}
          className="w-full btn-lime py-4 text-sm font-grotesk font-bold flex items-center justify-center gap-2">
          Tiếp tục thiết lập <ArrowRight className="w-4 h-4" />
        </button>
        <p className="text-center text-neutral-600 text-[11px] mt-3">
          Bước tiếp theo: thiết lập ngân sách & kho thực phẩm để AI lên thực đơn cho bạn.
        </p>
      </div>
    </div>
  );
}
