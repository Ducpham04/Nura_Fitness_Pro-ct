import { RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer } from 'recharts';
import { CountUp } from '../lib/motion';

interface Macro { label: string; consumed: number; goal: number; color: string; }

function pct(v: number, g: number) { return g > 0 ? Math.min(100, Math.round((v / g) * 100)) : 0; }

/**
 * Biểu đồ vòng macro (Protein/Carbs/Fat) — 3 vòng đồng tâm, mỗi vòng = % so với mục tiêu.
 * Tâm hiển thị tổng kcal nạp. Kiểu Nike: đậm, nhiều màu, gọn.
 */
export default function MacroRadial({
  protein, carbs, fat, caloriesConsumed, caloriesGoal,
}: {
  protein: Macro; carbs: Macro; fat: Macro;
  caloriesConsumed: number; caloriesGoal: number;
}) {
  // Recharts vẽ từ trong ra ngoài → đặt Fat (trong) → Protein (ngoài)
  const data = [
    { name: 'fat', value: pct(fat.consumed, fat.goal), fill: fat.color },
    { name: 'carbs', value: pct(carbs.consumed, carbs.goal), fill: carbs.color },
    { name: 'protein', value: pct(protein.consumed, protein.goal), fill: protein.color },
  ];
  const macros = [protein, carbs, fat];

  return (
    <div className="flex items-center gap-5">
      {/* Vòng macro */}
      <div className="relative w-[150px] h-[150px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            innerRadius="42%" outerRadius="100%" data={data}
            startAngle={90} endAngle={-270} barSize={9}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
            <RadialBar
              background={{ fill: 'rgba(255,255,255,0.06)' }}
              dataKey="value" cornerRadius={6} isAnimationActive
              animationDuration={1100} animationEasing="ease-out"
            />
          </RadialBarChart>
        </ResponsiveContainer>
        {/* Tâm: tổng kcal */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <CountUp value={Math.round(caloriesConsumed)} className="font-grotesk font-bold text-2xl text-white leading-none" />
          <span className="text-neutral-500 text-[10px] mt-0.5">/ {Math.round(caloriesGoal)} kcal</span>
        </div>
      </div>

      {/* Chú thích macro */}
      <div className="flex-1 space-y-2.5 min-w-0">
        {macros.map((m) => (
          <div key={m.label} className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: m.color }} />
            <span className="text-neutral-400 text-xs font-medium uppercase tracking-wider w-14 shrink-0">{m.label}</span>
            <div className="flex-1 h-1.5 rounded-full bg-white/[0.07] overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pct(m.consumed, m.goal)}%`, backgroundColor: m.color }} />
            </div>
            <span className="text-white text-xs font-bold tabular-nums shrink-0">
              {Math.round(m.consumed)}<span className="text-neutral-600 font-normal">/{Math.round(m.goal)}g</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
