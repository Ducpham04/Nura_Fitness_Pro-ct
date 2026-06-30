import { useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowRight, Flame, Target, HeartPulse,
  Droplets, Beef, Wheat,
} from 'lucide-react';
import Logo from '../components/Logo';

interface AssessmentState {
  age?: number; weight?: number; height?: number;
  gender?: string; goal?: string; activityLevel?: string;
}

const ACTIVITY_FACTOR: Record<string, number> = {
  sedentary: 1.2, light: 1.375, moderate: 1.55, very: 1.725,
};

const BMI_ZONES = [
  { max: 18.5, label: 'Thiếu cân',    hex: '#60a5fa', note: 'Nên tăng cân lành mạnh — surplus calo nhẹ và tăng protein.' },
  { max: 23,   label: 'Bình thường',  hex: '#a3e635', note: 'Cân đối theo chuẩn WHO Á Đông — duy trì thói quen hiện tại.' },
  { max: 25,   label: 'Thừa cân nhẹ', hex: '#facc15', note: 'Hơi vượt ngưỡng Á Đông — siết nhẹ calo và tăng cardio.' },
  { max: 30,   label: 'Thừa cân',     hex: '#fb923c', note: 'Tạo thâm hụt ~500 kcal/ngày và duy trì tập đều đặn.' },
  { max: 99,   label: 'Béo phì',      hex: '#f87171', note: 'Ưu tiên giảm mỡ an toàn, tham khảo chuyên gia dinh dưỡng.' },
];

function getBmiZone(bmi: number) {
  return BMI_ZONES.find(z => bmi < z.max) ?? BMI_ZONES[BMI_ZONES.length - 1];
}

function resolveDir(goal: string): 'deficit' | 'surplus' | 'maintain' {
  const g = (goal || '').toLowerCase();
  if (/giảm|lose|mỡ|fat|cut|weight_loss/.test(g)) return 'deficit';
  if (/tăng|gain|cơ|muscle|bulk|strength/.test(g)) return 'surplus';
  return 'maintain';
}

// ── SVG Speedometer Gauge ─────────────────────────────────────
function BmiGauge({ bmi }: { bmi: number }) {
  const cx = 150, cy = 152, r = 112, sw = 16;
  const MIN = 13.5, MAX = 36;

  const toAngle = (b: number) =>
    Math.PI * (1 - (Math.max(MIN, Math.min(MAX, b)) - MIN) / (MAX - MIN));

  const pt = (θ: number, radius = r): [number, number] =>
    [cx + radius * Math.cos(θ), cy - radius * Math.sin(θ)];

  const arcPath = (b1: number, b2: number) => {
    const [x1, y1] = pt(toAngle(b1));
    const [x2, y2] = pt(toAngle(b2));
    return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
  };

  const zones = [
    { from: MIN,  to: 18.5, hex: '#60a5fa' },
    { from: 18.5, to: 23,   hex: '#a3e635' },
    { from: 23,   to: 25,   hex: '#facc15' },
    { from: 25,   to: 30,   hex: '#fb923c' },
    { from: 30,   to: MAX,  hex: '#f87171' },
  ];

  const nAngle = toAngle(bmi);
  const [nx, ny] = pt(nAngle, r - 26);
  const zone = getBmiZone(bmi);

  return (
    <svg viewBox="0 0 300 165" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-xs mx-auto">
      {/* Track shadow */}
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        stroke="#ffffff06" strokeWidth={sw + 6} fill="none" strokeLinecap="round" />

      {/* Colored zones */}
      {zones.map((z, i) => (
        <path key={i} d={arcPath(z.from, z.to)} fill="none"
          stroke={z.hex} strokeWidth={sw}
          strokeLinecap={i === 0 ? 'round' : i === zones.length - 1 ? 'round' : 'butt'} />
      ))}

      {/* Zone dividers */}
      {[18.5, 23, 25, 30].map(tick => {
        const a = toAngle(tick);
        const [x1, y1] = pt(a, r - sw / 2 - 1);
        const [x2, y2] = pt(a, r + sw / 2 + 1);
        return <line key={tick}
          x1={x1.toFixed(1)} y1={y1.toFixed(1)} x2={x2.toFixed(1)} y2={y2.toFixed(1)}
          stroke="#0a0a0a" strokeWidth={2.5} />;
      })}

      {/* Needle */}
      <line x1={cx} y1={cy} x2={nx.toFixed(2)} y2={ny.toFixed(2)}
        stroke="white" strokeWidth={2.5} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={8} fill="white" />
      <circle cx={cx} cy={cy} r={4} fill="#0d0d0d" />

      {/* BMI value */}
      <text x={cx} y={cy - 48} textAnchor="middle" fill="white"
        style={{ fontSize: 38, fontWeight: 800, fontFamily: "'Space Grotesk', sans-serif" }}>
        {bmi.toFixed(1)}
      </text>
      <text x={cx} y={cy - 24} textAnchor="middle" fill={zone.hex}
        style={{ fontSize: 12, fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>
        {zone.label}
      </text>

      {/* Axis labels */}
      <text x={cx - r + 6} y={cy + 18} textAnchor="middle"
        style={{ fontSize: 9, fill: '#555', fontFamily: 'Inter, sans-serif' }}>Thiếu</text>
      <text x={cx + r - 6} y={cy + 18} textAnchor="middle"
        style={{ fontSize: 9, fill: '#555', fontFamily: 'Inter, sans-serif' }}>Béo phì</text>
    </svg>
  );
}

// ── Macro Donut Chart ─────────────────────────────────────────
function MacroDonut({ protG, carbG, fatG, totalCal }: {
  protG: number; carbG: number; fatG: number; totalCal: number;
}) {
  const r = 42, cx = 55, cy = 55, sw = 13;
  const circ = 2 * Math.PI * r;
  const pCal = protG * 4, cCal = carbG * 4, fCal = fatG * 9;
  const sum = pCal + cCal + fCal;

  let acc = 0;
  const segs = [
    { cal: pCal, color: '#60a5fa' },
    { cal: cCal, color: '#a3e635' },
    { cal: fCal, color: '#fb923c' },
  ].map(s => {
    const len = (s.cal / sum) * circ;
    const off = acc;
    acc += len;
    return { ...s, len, off };
  });

  return (
    <svg viewBox="0 0 110 110" xmlns="http://www.w3.org/2000/svg">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#ffffff08" strokeWidth={sw + 3} />
      <g transform={`rotate(-90, ${cx}, ${cy})`}>
        {segs.map(({ len, off, color }, i) => (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none"
            stroke={color} strokeWidth={sw}
            strokeDasharray={`${len.toFixed(2)} ${(circ - len).toFixed(2)}`}
            strokeDashoffset={(-off).toFixed(2)} />
        ))}
      </g>
      <text x={cx} y={cy - 2} textAnchor="middle" fill="white"
        style={{ fontSize: 14, fontWeight: 800, fontFamily: "'Space Grotesk', sans-serif" }}>
        {totalCal.toLocaleString('vi-VN')}
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle"
        style={{ fontSize: 7, fill: '#666', fontFamily: 'Inter, sans-serif' }}>
        kcal / ngày
      </text>
    </svg>
  );
}

// ── Body Composition Stacked Bar ──────────────────────────────
function BodyCompBar({ weight, fatPct }: { weight: number; fatPct: number }) {
  const fatKg  = (weight * fatPct / 100).toFixed(1);
  const leanKg = (weight - Number(fatKg)).toFixed(1);
  return (
    <div>
      <div className="flex rounded-full overflow-hidden h-2.5 mb-2.5 gap-0.5">
        <div className="bg-blue-400/80 rounded-full h-full" style={{ width: `${100 - fatPct}%` }} />
        <div className="bg-orange-400/70 rounded-full h-full" style={{ width: `${fatPct}%` }} />
      </div>
      <div className="flex justify-between">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
          <span className="text-[10px] text-neutral-300 font-medium">Khối cơ <span className="text-white font-semibold">{leanKg} kg</span></span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0" />
          <span className="text-[10px] text-neutral-300 font-medium">Mỡ <span className="text-white font-semibold">{fatKg} kg</span></span>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────
export default function BodyAssessment() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state || {}) as AssessmentState;
  const hasData = !!(state.weight && state.height && state.age && state.gender);

  useEffect(() => {
    if (!hasData) navigate('/welcome', { replace: true });
  }, [hasData, navigate]);

  const m = useMemo(() => {
    const weight = Number(state.weight) || 0;
    const height = Number(state.height) || 0;
    const age    = Number(state.age)    || 0;
    const isMale = (state.gender || '').toLowerCase() === 'male';
    const hM     = height / 100;

    const bmi  = hM > 0 ? weight / (hM * hM) : 0;
    const bmr  = 10 * weight + 6.25 * height - 5 * age + (isMale ? 5 : -161);
    const tdee = bmr * (ACTIVITY_FACTOR[state.activityLevel || 'moderate'] ?? 1.55);
    const dir  = resolveDir(state.goal || '');
    const delta  = dir === 'deficit' ? -500 : dir === 'surplus' ? 300 : 0;
    const target = Math.round(tdee + delta);

    const protPerKg = dir === 'surplus' ? 2.2 : dir === 'deficit' ? 2.0 : 1.8;
    const protG = Math.round(weight * protPerKg);
    const fatCal = Math.round(target * 0.28);
    const fatG   = Math.round(fatCal / 9);
    const carbG  = Math.max(0, Math.round((target - protG * 4 - fatCal) / 4));

    const bodyFat = Math.round(Math.max(5, Math.min(50,
      1.2 * bmi + 0.23 * age - (isMale ? 16.2 : 5.4))));

    const idealMin = Math.round(18.5 * hM * hM * 10) / 10;
    const idealMax = Math.round(22.9 * hM * hM * 10) / 10;
    const waterL   = (weight * 33 / 1000).toFixed(1);

    let timelineText = '';
    if (dir === 'deficit') {
      const kgToLose = Math.max(0, weight - idealMax);
      timelineText = kgToLose > 0
        ? `Giảm ~0.45 kg/tuần → đạt ngưỡng lý tưởng sau khoảng ${Math.round(kgToLose / 0.45)} tuần`
        : 'Bạn đã trong dải cân nặng lý tưởng!';
    } else if (dir === 'surplus') {
      timelineText = 'Tăng ~0.27 kg/tuần (chủ yếu là cơ, kết hợp tập tạ hiệu quả hơn)';
    } else {
      timelineText = 'Duy trì cân nặng — tập trung cải thiện thành phần cơ thể theo thời gian';
    }

    const dirLabel = dir === 'deficit' ? 'Giảm mỡ (−500 kcal/ngày)'
      : dir === 'surplus' ? 'Tăng cơ (+300 kcal/ngày)' : 'Duy trì cân nặng';

    return {
      bmi, bmr: Math.round(bmr), tdee: Math.round(tdee), target,
      protG, fatG, carbG, bodyFat, idealMin, idealMax,
      waterL, timelineText, dirLabel, dir, weight,
    };
  }, [state]);

  if (!hasData) return null;

  return (
    <div className="min-h-screen bg-obsidian flex items-center justify-center relative overflow-hidden font-inter px-5 py-10">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(204,255,0,0.07) 0%, transparent 70%)' }} />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(96,165,250,0.06) 0%, transparent 70%)' }} />

      <div className="w-full max-w-xl relative z-10 space-y-4 animate-fade-in">

        <div className="flex justify-center mb-1">
          <Logo size={34} wordmarkClass="text-base" dark />
        </div>

        {/* Header */}
        <div className="text-center mb-1">
          <div className="inline-flex items-center gap-2 rounded-full border border-lime/25 bg-lime/[0.06] px-4 py-1.5 mb-2">
            <HeartPulse className="w-3.5 h-3.5 text-lime" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-lime">Đánh giá thể trạng</span>
          </div>
          <h1 className="font-grotesk font-bold text-2xl text-white mb-1">Kết quả phân tích</h1>

        </div>

        {/* ── BMI GAUGE ── */}
        <div className="glass rounded-3xl px-6 pt-5 pb-4 border border-white/5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-neutral-300 text-[10px] font-semibold uppercase tracking-wider">BMI — Chuẩn WHO Á Đông</span>
            <span className="text-[10px] text-neutral-200 font-medium">Lý tưởng: {m.idealMin}–{m.idealMax} kg</span>
          </div>

          <BmiGauge bmi={m.bmi} />

          {/* Zone legend */}
          <div className="flex justify-center gap-3 flex-wrap -mt-1 mb-3">
            {BMI_ZONES.filter(z => z.max < 99).map(z => (
              <div key={z.label} className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: z.hex }} />
                <span className="text-[9px] text-neutral-300 font-medium">{z.label}</span>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-neutral-500 text-center leading-relaxed">
            {getBmiZone(m.bmi).note}
          </p>
        </div>

        {/* ── TARGET CALORIES ── */}
        <div className="glass rounded-2xl p-5 border border-white/5">
          <p className="text-xs font-bold text-white mb-4">Mục tiêu calo hàng ngày</p>

          <div className="grid grid-cols-2 gap-4">
            {/* Calo cần đốt */}
            <div>
              <div className="text-[10px] text-neutral-400 font-medium mb-2 uppercase tracking-wider">Cần đốt cháy</div>
              <div className="flex items-end gap-1">
                <span className="font-grotesk font-bold text-3xl text-orange-400 leading-none">
                  {Math.abs(m.tdee - m.target).toLocaleString('vi-VN')}
                </span>
                <span className="text-neutral-300 text-sm font-medium mb-0.5">kcal</span>
              </div>
            </div>

            {/* Calo được ăn */}
            <div>
              <div className="text-[10px] text-neutral-400 font-medium mb-2 uppercase tracking-wider">Được tiêu thụ</div>
              <div className="flex items-end gap-1">
                <span className="font-grotesk font-bold text-3xl text-lime leading-none">
                  {m.target.toLocaleString('vi-VN')}
                </span>
                <span className="text-neutral-300 text-sm font-medium mb-0.5">kcal</span>
              </div>
            </div>
          </div>

          <p className="text-[10px] text-neutral-400 font-medium mt-3 pt-3 border-t border-white/10">
            {m.dirLabel}
          </p>
        </div>

        {/* ── MACRO BREAKDOWN ── */}
        <div className="glass rounded-3xl p-5 border border-white/5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-bold text-white">Phân bổ dinh dưỡng</p>
              <p className="text-[10px] text-neutral-300 font-medium mt-0.5">{m.dirLabel}</p>
            </div>
          </div>
          <div className="flex gap-5 items-center">
            {/* Donut chart */}
            <div className="w-[110px] flex-shrink-0">
              <MacroDonut protG={m.protG} carbG={m.carbG} fatG={m.fatG} totalCal={m.target} />
            </div>
            {/* Legend */}
            <div className="flex-1 space-y-3 min-w-0">
              {[
                { label: 'Protein',    g: m.protG, cal: m.protG * 4, color: '#60a5fa', tw: 'text-blue-400',   icon: Beef,  note: 'Xây cơ & phục hồi' },
                { label: 'Carbs',      g: m.carbG, cal: m.carbG * 4, color: '#a3e635', tw: 'text-lime',       icon: Wheat, note: 'Năng lượng tập' },
                { label: 'Chất béo',   g: m.fatG,  cal: m.fatG * 9,  color: '#fb923c', tw: 'text-orange-400', icon: Flame, note: 'Hormone & vitamin' },
              ].map(({ label, g, cal, color, tw, icon: Icon, note }) => {
                const pct = Math.round((cal / m.target) * 100);
                return (
                  <div key={label}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                        <Icon className={`w-3 h-3 ${tw} flex-shrink-0`} />
                        <span className="text-xs text-white font-semibold">{label}</span>
                        <span className="text-[9px] text-neutral-300 font-medium">{note}</span>
                      </div>
                      <div className="flex items-baseline gap-1 flex-shrink-0 ml-2">
                        <span className={`text-sm font-bold ${tw}`}>{g}g</span>
                        <span className="text-[9px] text-neutral-300 font-medium">{pct}%</span>
                      </div>
                    </div>
                    <div className="h-1 bg-white/[0.05] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── BODY COMPOSITION + WATER ── */}
        <div className="grid grid-cols-2 gap-3">
          <div className="glass rounded-2xl p-4 border border-white/5">
            <div className="text-[10px] text-neutral-300 uppercase tracking-wider mb-2 font-semibold">Thành phần cơ thể</div>
            <div className="flex items-end gap-1 mb-3">
              <span className="font-grotesk font-bold text-3xl text-orange-400 leading-none">{m.bodyFat}</span>
              <span className="text-neutral-300 text-sm font-medium mb-0.5">% mỡ</span>
            </div>
            <BodyCompBar weight={m.weight} fatPct={m.bodyFat} />
          </div>

          <div className="glass rounded-2xl p-4 border border-white/5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <div className="w-7 h-7 rounded-xl bg-blue-400/10 flex items-center justify-center">
                  <Droplets className="w-3.5 h-3.5 text-blue-400" />
                </div>
                <span className="text-[10px] text-neutral-300 uppercase tracking-wider font-semibold">Nước / ngày</span>
              </div>
              <div className="flex items-end gap-1">
                <span className="font-grotesk font-bold text-3xl text-blue-400 leading-none">{m.waterL}</span>
                <span className="text-neutral-300 text-sm font-medium mb-0.5">L</span>
              </div>
            </div>
            {/* Water bar visual */}
            <div className="flex items-end gap-[2px] mt-3 h-5">
              {Array.from({ length: Math.min(12, Math.round(Number(m.waterL) / 0.25)) }, (_, i) => {
                const filled = i < Math.round(Number(m.waterL) / 0.25 * 0.6);
                return (
                  <div key={i} className={`flex-1 rounded-sm transition-all ${filled ? 'bg-blue-400/65 h-full' : 'bg-blue-400/20 h-3'}`} />
                );
              })}
            </div>
            <div className="text-[10px] text-neutral-300 font-medium mt-1.5">
              ≈ {Math.round(Number(m.waterL) / 0.25)} ly 250ml
            </div>
          </div>
        </div>


        <button onClick={() => navigate('/welcome', { state: { goal: state.goal } })}
          className="w-full btn-lime py-4 text-sm font-grotesk font-bold flex items-center justify-center gap-2">
          Bắt đầu sử dụng <ArrowRight className="w-4 h-4" />
        </button>

        <p className="text-center text-neutral-300 text-[11px] font-medium pb-4">
          Tiếp theo: thiết lập ngân sách & kho thực phẩm để AI lên thực đơn cá nhân hóa.
        </p>
      </div>
    </div>
  );
}
