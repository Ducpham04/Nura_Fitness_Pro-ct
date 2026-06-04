import { useState, useEffect } from 'react';
import { Scale, X, Minus, Plus, Check, Loader2, ChevronDown, TrendingDown, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { userService } from '../services/userService';

interface Props {
  /** Cân nặng lần đo gần nhất (kg) — để hiện so sánh & prefill. */
  previousWeight?: number;
  onClose: () => void;
  onSaved?: () => void;
}

/**
 * Modal check-in thể trạng hằng tuần.
 * Ghi 1 bản đo mới (backend tự tính BMI/BMR/TDEE) + đồng bộ cân nặng hồ sơ.
 */
export default function BodyCheckInModal({ previousWeight, onClose, onSaved }: Props) {
  const [weight, setWeight] = useState<number>(previousWeight && previousWeight > 0 ? previousWeight : 60);
  const [showMore, setShowMore] = useState(false);
  const [waist, setWaist] = useState<string>('');
  const [bodyFat, setBodyFat] = useState<string>('');
  const [saving, setSaving] = useState(false);

  // Lần đầu (chưa có lịch sử đo) → prefill bằng cân nặng hồ sơ hiện tại
  useEffect(() => {
    if (previousWeight && previousWeight > 0) return;
    let alive = true;
    userService.getBodyProfile().then(p => {
      const w = Number((p as any)?.weight);
      if (alive && w > 0) setWeight(w);
    }).catch(() => {});
    return () => { alive = false; };
  }, [previousWeight]);

  const valid = weight >= 20 && weight <= 400;
  const delta = previousWeight && previousWeight > 0 ? Math.round((weight - previousWeight) * 10) / 10 : null;

  const adjust = (d: number) => setWeight(w => Math.min(400, Math.max(20, Math.round((w + d) * 10) / 10)));

  const handleSave = async () => {
    if (!valid) { toast.error('Cân nặng không hợp lệ'); return; }
    setSaving(true);
    try {
      const ok = await userService.createBodyMetric({
        weightKg: weight,
        waistCm: waist ? parseFloat(waist) : undefined,
        bodyFatPct: bodyFat ? parseFloat(bodyFat) : undefined,
      });
      if (!ok) { toast.error('Lưu thất bại, thử lại sau'); setSaving(false); return; }
      // Đồng bộ cân nặng hồ sơ hiện tại (partial merge — không clobber field khác)
      await userService.postBodyProfile({ weight } as any).catch(() => {});
      window.dispatchEvent(new CustomEvent('body-metric-updated'));
      toast.success('Đã cập nhật thể trạng');
      onSaved?.();
      onClose();
    } catch {
      toast.error('Có lỗi xảy ra');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-3xl border border-white/[0.1] bg-[#111318] p-6 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-lime/15 border border-lime/25 flex items-center justify-center">
              <Scale className="w-5 h-5 text-lime" />
            </div>
            <div>
              <h3 className="font-grotesk font-bold italic uppercase text-white text-lg leading-none">Cập nhật thể trạng</h3>
              <p className="text-neutral-500 text-xs mt-1">Đo buổi sáng, cùng thời điểm để chính xác.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Weight stepper */}
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5 mb-3">
          <p className="text-center text-[10px] font-bold uppercase tracking-widest text-neutral-500 mb-3">Cân nặng (kg)</p>
          <div className="flex items-center justify-center gap-5">
            <button onClick={() => adjust(-0.1)}
              className="w-11 h-11 rounded-xl bg-white/[0.06] border border-white/[0.08] text-white text-xl font-bold flex items-center justify-center hover:bg-white/[0.1] active:scale-95 transition-all">
              <Minus className="w-4 h-4" />
            </button>
            <div className="text-center min-w-[120px]">
              <div className="font-grotesk font-bold text-5xl text-white leading-none tabular-nums">
                {weight.toFixed(1)}
              </div>
              {delta !== null && (
                <div className={`inline-flex items-center gap-1 mt-2 text-xs font-bold px-2 py-0.5 rounded-full ${
                  delta < 0 ? 'text-lime bg-lime/10' : delta > 0 ? 'text-orange-400 bg-orange-400/10' : 'text-neutral-400 bg-white/[0.05]'
                }`}>
                  {delta < 0 ? <TrendingDown className="w-3 h-3" /> : delta > 0 ? <TrendingUp className="w-3 h-3" /> : null}
                  {delta > 0 ? '+' : ''}{delta} kg so với lần trước
                </div>
              )}
            </div>
            <button onClick={() => adjust(0.1)}
              className="w-11 h-11 rounded-xl bg-white/[0.06] border border-white/[0.08] text-white text-xl font-bold flex items-center justify-center hover:bg-white/[0.1] active:scale-95 transition-all">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          {/* Quick steps */}
          <div className="flex gap-2 justify-center mt-4">
            {[-1, -0.5, +0.5, +1].map(d => (
              <button key={d} onClick={() => adjust(d)}
                className="px-3 py-1 rounded-lg text-xs font-bold bg-white/[0.04] border border-white/[0.08] text-neutral-400 hover:text-white transition-all">
                {d > 0 ? '+' : ''}{d}
              </button>
            ))}
          </div>
        </div>

        {/* More (optional) */}
        <button onClick={() => setShowMore(s => !s)}
          className="w-full flex items-center justify-center gap-1.5 text-neutral-500 hover:text-neutral-300 text-xs font-semibold py-2 transition-colors">
          Nhập thêm (vòng eo, % mỡ)
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showMore ? 'rotate-180' : ''}`} />
        </button>
        {showMore && (
          <div className="grid grid-cols-2 gap-3 mb-3">
            <label className="block">
              <span className="text-[10px] uppercase tracking-wider text-neutral-500">Vòng eo (cm)</span>
              <input type="number" inputMode="decimal" value={waist} onChange={e => setWaist(e.target.value)}
                placeholder="—"
                className="mt-1 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-white text-sm focus:outline-none focus:border-lime/30" />
            </label>
            <label className="block">
              <span className="text-[10px] uppercase tracking-wider text-neutral-500">% mỡ</span>
              <input type="number" inputMode="decimal" value={bodyFat} onChange={e => setBodyFat(e.target.value)}
                placeholder="—"
                className="mt-1 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-white text-sm focus:outline-none focus:border-lime/30" />
            </label>
          </div>
        )}

        {/* Save */}
        <button onClick={handleSave} disabled={!valid || saving}
          className="w-full btn-lime py-3.5 mt-2 text-sm font-grotesk font-bold rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          Lưu thể trạng
        </button>
      </div>
    </div>
  );
}
