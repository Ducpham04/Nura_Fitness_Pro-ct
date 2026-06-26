import { useState, useEffect, useCallback } from 'react';
import { X, Gift, Loader2, Coins, AlertTriangle, Package, Check } from 'lucide-react';
import { toast } from 'sonner';
import { rewardService, type RewardItem } from '../services/rewardService';
import { API_CONFIG } from '../config/api';

// Ảnh reward: URL tuyệt đối giữ nguyên; path tương đối ghép base backend
const resolveImg = (url?: string) => {
  if (!url || url.length < 5) return null;
  if (/^(https?:|blob:|data:)/.test(url)) return url;
  const clean = url.startsWith('/') ? url.slice(1) : url;
  return `${API_CONFIG.BASE_URL}/${clean}`;
};

export default function RewardShop({ userId, onClose }: { userId: number; onClose: () => void }) {
  const [rewards, setRewards] = useState<RewardItem[]>([]);
  const [points, setPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [redeeming, setRedeeming] = useState<number | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [rRes, bRes] = await Promise.all([
      rewardService.getRewards(),
      rewardService.getBalance(userId),
    ]);
    if (rRes.success && rRes.data) setRewards(rRes.data);
    else setError(rRes.error?.message || 'Không tải được phần thưởng');
    if (bRes.success && typeof bRes.data === 'number') setPoints(bRes.data);
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const handleRedeem = async (r: RewardItem) => {
    setConfirmId(null);
    setRedeeming(r.id);
    const res = await rewardService.redeem(userId, r.id);
    setRedeeming(null);
    if (res.success) {
      toast.success(`Đã đổi "${r.name}"! 🎁`);
      load();
    } else {
      toast.error(res.error?.message || 'Đổi thưởng thất bại');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div
        className="relative w-full max-w-2xl max-h-[calc(100vh-2rem)] glass rounded-3xl border border-white/10 overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-lime/15 border border-lime/25 flex items-center justify-center shrink-0">
              <Gift className="w-4 h-4 text-lime" />
            </div>
            <div className="min-w-0">
              <h2 className="font-grotesk font-bold text-white text-base leading-none">Đổi thưởng</h2>
              <p className="text-neutral-500 text-[11px] mt-1">Dùng điểm tích lũy đổi quà</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-lime/10 border border-lime/30 px-3 py-1.5">
              <Coins className="w-3.5 h-3.5 text-lime" />
              <span className="text-lime font-grotesk font-bold text-sm tabular-nums">{points.toLocaleString('vi-VN')}</span>
              <span className="text-lime/60 text-[11px]">điểm</span>
            </span>
            <button onClick={onClose} className="w-9 h-9 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-neutral-400 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-7 h-7 animate-spin text-lime" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <AlertTriangle className="w-9 h-9 text-orange-400 mx-auto mb-3" />
              <p className="text-neutral-400 text-sm mb-4">{error}</p>
              <button onClick={load} className="btn-lime px-5 py-2 text-sm font-bold">Thử lại</button>
            </div>
          ) : rewards.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-10 h-10 text-neutral-700 mx-auto mb-3" />
              <p className="text-white font-semibold mb-1">Chưa có phần thưởng</p>
              <p className="text-neutral-500 text-sm">Quay lại sau nhé — quà sẽ sớm có mặt.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {rewards.map(r => {
                const img = resolveImg(r.linkImage);
                const outOfStock = (r.total ?? 0) <= 0 || r.status === 'Out of Stock';
                const affordable = points >= r.points;
                const canRedeem = !outOfStock && affordable && redeeming === null;
                return (
                  <div key={r.id} className="rounded-2xl border border-white/[0.08] bg-white/[0.03] overflow-hidden flex flex-col">
                    {/* Ảnh */}
                    <div className="relative h-32 bg-white/[0.04]">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Gift className="w-8 h-8 text-neutral-700" />
                      </div>
                      {img && (
                        <img
                          src={img}
                          alt={r.name}
                          onError={e => { e.currentTarget.style.display = 'none'; }}
                          className="relative w-full h-full object-cover"
                        />
                      )}
                      {outOfStock && (
                        <span className="absolute top-2 right-2 text-[10px] font-bold uppercase tracking-wider text-neutral-300 bg-black/60 border border-white/15 px-2 py-0.5 rounded-full">
                          Hết hàng
                        </span>
                      )}
                    </div>

                    {/* Nội dung */}
                    <div className="p-4 flex flex-col flex-1">
                      <h3 className="font-semibold text-white text-sm leading-tight line-clamp-1">{r.name}</h3>
                      {r.description && <p className="text-neutral-500 text-xs mt-1 line-clamp-2 flex-1">{r.description}</p>}
                      <div className="flex items-center justify-between mt-3 gap-2">
                        <span className="inline-flex items-center gap-1 text-lime font-grotesk font-bold text-sm">
                          <Coins className="w-3.5 h-3.5" />{r.points.toLocaleString('vi-VN')}
                        </span>
                        {typeof r.total === 'number' && !outOfStock && (
                          <span className="text-neutral-600 text-[11px]">Còn {r.total}</span>
                        )}
                      </div>

                      {/* Nút đổi / xác nhận */}
                      {confirmId === r.id ? (
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => handleRedeem(r)}
                            className="flex-1 btn-lime py-2 text-xs font-bold rounded-xl inline-flex items-center justify-center gap-1.5"
                          >
                            <Check className="w-3.5 h-3.5" /> Xác nhận
                          </button>
                          <button
                            onClick={() => setConfirmId(null)}
                            className="px-3 py-2 text-xs text-neutral-500 hover:text-white rounded-xl border border-white/[0.08]"
                          >
                            Hủy
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmId(r.id)}
                          disabled={!canRedeem}
                          className={`mt-3 w-full py-2 text-xs font-bold rounded-xl inline-flex items-center justify-center gap-1.5 transition-all ${
                            canRedeem
                              ? 'btn-lime'
                              : 'bg-white/[0.04] border border-white/[0.08] text-neutral-600 cursor-not-allowed'
                          }`}
                        >
                          {redeeming === r.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : outOfStock ? 'Hết hàng' : !affordable ? `Thiếu ${(r.points - points).toLocaleString('vi-VN')} điểm` : 'Đổi ngay'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
