import { useMemo, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowRight, Activity, Flame, Target, HeartPulse,
  Droplets, Beef, Wheat, Clock,
} from 'lucide-react';
import Logo from '../components/Logo';
import { BMI_ZONES, getBmiZone, computeBodyMetrics } from '../lib/bodyMetrics';

interface AssessmentState {
  age?: number; weight?: number; height?: number;
  gender?: string; goal?: string; activityLevel?: string;
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
    <svg viewBox="0 0 300 165" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-xs mx-auto text-slate-900">
      {/* Track shadow */}
      <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        stroke="rgba(148,163,184,0.18)" strokeWidth={sw + 6} fill="none" strokeLinecap="round" />

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
          stroke="#ffffff" strokeWidth={2.5} />;
      })}

      {/* Needle */}
      <line x1={cx} y1={cy} x2={nx.toFixed(2)} y2={ny.toFixed(2)}
        stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={7} fill="currentColor" />

      {/* BMI value */}
      <text x={cx} y={cy - 48} textAnchor="middle" fill="currentColor"
        style={{ fontSize: 38, fontWeight: 800, fontFamily: "'Space Grotesk', sans-serif" }}>
        {bmi.toFixed(1)}
      </text>
      <text x={cx} y={cy - 24} textAnchor="middle" fill={zone.hex}
        style={{ fontSize: 12, fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>
        {zone.label}
      </text>

      {/* Axis labels */}
      <text x={cx - r + 6} y={cy + 18} textAnchor="middle"
        style={{ fontSize: 9, fill: '#94a3b8', fontFamily: 'Inter, sans-serif' }}>Thiếu</text>
      <text x={cx + r - 6} y={cy + 18} textAnchor="middle"
        style={{ fontSize: 9, fill: '#94a3b8', fontFamily: 'Inter, sans-serif' }}>Béo phì</text>
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
    <svg viewBox="0 0 110 110" xmlns="http://www.w3.org/2000/svg" className="text-slate-900">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(148,163,184,0.18)" strokeWidth={sw + 3} />
      <g transform={`rotate(-90, ${cx}, ${cy})`}>
        {segs.map(({ len, off, color }, i) => (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none"
            stroke={color} strokeWidth={sw}
            strokeDasharray={`${len.toFixed(2)} ${(circ - len).toFixed(2)}`}
            strokeDashoffset={(-off).toFixed(2)} />
        ))}
      </g>
      <text x={cx} y={cy - 2} textAnchor="middle" fill="currentColor"
        style={{ fontSize: 14, fontWeight: 800, fontFamily: "'Space Grotesk', sans-serif" }}>
        {totalCal.toLocaleString('vi-VN')}
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle"
        style={{ fontSize: 7, fill: '#94a3b8', fontFamily: 'Inter, sans-serif' }}>
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
          <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
          <span className="text-[10px] text-slate-500">Khối cơ <span className="text-slate-900 font-semibold">{leanKg} kg</span></span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0" />
          <span className="text-[10px] text-slate-500">Mỡ <span className="text-slate-900 font-semibold">{fatKg} kg</span></span>
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

  const m = useMemo(() => computeBodyMetrics({
    weight: state.weight,
    height: state.height,
    age: state.age,
    gender: state.gender,
    goal: state.goal,
    activityLevel: state.activityLevel,
  }), [state]);

  if (!hasData) return null;

  return (
    <div className="min-h-screen bg-[#f4f6f2] flex items-center justify-center relative overflow-hidden font-inter px-5 py-10">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(13,148,136,0.08) 0%, transparent 70%)' }} />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.06) 0%, transparent 70%)' }} />

      <div className="w-full max-w-xl relative z-10 space-y-4 animate-fade-in">

        <div className="flex justify-center mb-1">
          <Logo size={34} wordmarkClass="text-base" />
        </div>

        {/* Header */}
        <div className="text-center mb-1">
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-4 py-1.5 mb-2">
            <HeartPulse className="w-3.5 h-3.5 text-teal-700" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal-700">Đánh giá thể trạng</span>
          </div>
          <h1 className="font-grotesk font-bold text-2xl text-slate-900 mb-1">Kết quả phân tích</h1>
          <p className="text-slate-500 text-xs">AI dùng các chỉ số này để cá nhân hóa kế hoạch ăn & tập của bạn.</p>
        </div>

        {/* ── BMI GAUGE ── */}
        <div className="bg-white rounded-3xl px-6 pt-5 pb-4 border border-slate-200">
          <div className="flex items-center justify-between mb-1">
            <span className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider">BMI — Chuẩn WHO Á Đông</span>
            <span className="text-[10px] text-slate-500">Lý tưởng: {m.idealMin}–{m.idealMax} kg</span>
          </div>

          <BmiGauge bmi={m.bmi} />

          {/* Zone legend */}
          <div className="flex justify-center gap-3 flex-wrap -mt-1 mb-3">
            {BMI_ZONES.filter(z => z.max < 99).map(z => (
              <div key={z.label} className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: z.hex }} />
                <span className="text-[9px] text-slate-500">{z.label}</span>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-slate-500 text-center leading-relaxed">
            {getBmiZone(m.bmi).note}
          </p>
        </div>

        {/* ── ENERGY STATS ── */}
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { label: 'BMR',      value: m.bmr,    sub: 'nghỉ ngơi',    icon: Activity, colorCls: 'text-blue-600',   bgCls: 'bg-blue-50' },
            { label: 'TDEE',     value: m.tdee,   sub: 'tiêu hao/ngày', icon: Flame,   colorCls: 'text-orange-600', bgCls: 'bg-orange-50' },
            { label: 'Mục tiêu', value: m.target, sub: 'ăn/ngày',      icon: Target,  colorCls: 'text-teal-700',       bgCls: 'bg-teal-50' },
          ].map(({ label, value, sub, icon: Icon, colorCls, bgCls }) => (
            <div key={label} className="bg-white rounded-2xl p-4 border border-slate-200 text-center">
              <div className={`w-8 h-8 ${bgCls} rounded-xl flex items-center justify-center mx-auto mb-2`}>
                <Icon className={`w-4 h-4 ${colorCls}`} />
              </div>
              <div className={`font-grotesk font-bold text-xl leading-none ${colorCls}`}>
                {value.toLocaleString('vi-VN')}
              </div>
              <div className="text-slate-500 text-[10px] mt-1">{sub}</div>
              <div className="text-slate-500 text-[9px] uppercase tracking-wider mt-0.5 font-semibold">{label}</div>
            </div>
          ))}
        </div>

        {/* ── MACRO BREAKDOWN ── */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-bold text-slate-900">Phân bổ dinh dưỡng</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{m.dirLabel}</p>
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
                { label: 'Protein',    g: m.protG, cal: m.protG * 4, color: '#60a5fa', tw: 'text-blue-600',   icon: Beef,  note: 'Xây cơ & phục hồi' },
                { label: 'Carbs',      g: m.carbG, cal: m.carbG * 4, color: '#a3e635', tw: 'text-teal-700',       icon: Wheat, note: 'Năng lượng tập' },
                { label: 'Chất béo',   g: m.fatG,  cal: m.fatG * 9,  color: '#fb923c', tw: 'text-orange-600', icon: Flame, note: 'Hormone & vitamin' },
              ].map(({ label, g, cal, color, tw, icon: Icon, note }) => {
                const pct = Math.round((cal / m.target) * 100);
                return (
                  <div key={label}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Icon className={`w-3 h-3 ${tw} flex-shrink-0`} />
                        <span className="text-xs text-slate-900 font-semibold truncate">{label}</span>
                        <span className="text-[9px] text-slate-500 hidden sm:inline truncate">{note}</span>
                      </div>
                      <div className="flex items-baseline gap-1 flex-shrink-0 ml-2">
                        <span className={`text-sm font-bold ${tw}`}>{g}g</span>
                        <span className="text-[9px] text-slate-500">{pct}%</span>
                      </div>
                    </div>
                    <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
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
          <div className="bg-white rounded-2xl p-4 border border-slate-200">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2 font-semibold">Thành phần cơ thể</div>
            <div className="flex items-end gap-1 mb-3">
              <span className="font-grotesk font-bold text-3xl text-orange-600 leading-none">{m.bodyFat}</span>
              <span className="text-slate-500 text-sm mb-0.5">% mỡ</span>
            </div>
            <BodyCompBar weight={m.weight} fatPct={m.bodyFat} />
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <div className="w-7 h-7 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Droplets className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Nước / ngày</span>
              </div>
              <div className="flex items-end gap-1">
                <span className="font-grotesk font-bold text-3xl text-blue-600 leading-none">{m.waterL}</span>
                <span className="text-slate-500 text-sm mb-0.5">L</span>
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
            <div className="text-[10px] text-slate-500 mt-1.5">
              ≈ {Math.round(Number(m.waterL) / 0.25)} ly 250ml
            </div>
          </div>
        </div>

        {/* ── TIMELINE ── */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0">
            <Clock className="w-4 h-4 text-teal-700" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-slate-900 mb-0.5">Lộ trình ước tính</div>
            <p className="text-xs text-slate-600 leading-relaxed">{m.timelineText}</p>
            <p className="text-[10px] text-slate-500 mt-1">
              {m.dirLabel} · Kết quả phụ thuộc vào sự đều đặn và giấc ngủ.
            </p>
          </div>
        </div>

        {/* ── DISCLAIMER ── */}
        <div className="rounded-xl p-3 border border-slate-200 bg-slate-50">
          <p className="text-slate-500 text-[10px] leading-relaxed">
            <span className="text-slate-700 font-semibold">BMR</span> — năng lượng khi nghỉ hoàn toàn ·{' '}
            <span className="text-slate-700 font-semibold">TDEE</span> — tổng tiêu hao theo mức vận động ·{' '}
            <span className="text-slate-700 font-semibold">% Mỡ</span> — ước tính theo Deurenberg (BMI+tuổi) ·{' '}
            Thang BMI theo chuẩn WHO châu Á 2004.
          </p>
        </div>

        <button onClick={() => navigate('/welcome', { state: { goal: state.goal } })}
          className="w-full rounded-2xl bg-teal-700 text-white hover:bg-teal-800 transition-colors py-4 text-sm font-grotesk font-bold flex items-center justify-center gap-2">
          Bắt đầu sử dụng <ArrowRight className="w-4 h-4" />
        </button>

        <p className="text-center text-slate-500 text-[11px] pb-4">
          Tiếp theo: thiết lập ngân sách & kho thực phẩm để AI lên thực đơn cá nhân hóa.
        </p>
      </div>
    </div>
  );
}
