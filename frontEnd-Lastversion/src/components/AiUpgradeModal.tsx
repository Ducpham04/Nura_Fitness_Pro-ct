import React, { useState, useEffect } from 'react';
import { X, Zap, Check, Loader2, Gift, Clock } from 'lucide-react';
import { AiPackage, AiUsageInfo, aiUsageService } from '../services/aiUsageService';
import { trackEvent } from '../analytics';

interface AiUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  usage: AiUsageInfo | null;
  packages: AiPackage[];
  userId: number;
  /** Gọi lại sau khi upgrade thành công để refresh badge */
  onUpgradeSuccess?: () => void;
}

const PACKAGE_FEATURES: Record<string, string[]> = {
  FREE: [
    '25 AI credit / tháng',
    '~5 lần tạo meal/workout plan',
    'Chat AI Coach cơ bản',
    'Quét ảnh món ăn',
  ],
  PLUS: [
    '200 AI credit / tháng',
    '~40 lần tạo plan',
    'Chat AI Coach không giới hạn*',
    'Quét ảnh & kho nguyên liệu',
    'Ưu tiên xử lý AI',
  ],
  PRO: [
    'Không giới hạn AI credit',
    'Tạo plan tùy ý',
    'Chat AI Coach không giới hạn',
    'Tất cả tính năng AI',
    'Hỗ trợ ưu tiên',
  ],
};

const PACKAGE_COLORS: Record<string, string> = {
  FREE: 'border-zinc-600 bg-zinc-800/50',
  PLUS: 'border-lime-500/60 bg-lime-500/5',
  PRO:  'border-violet-500/60 bg-violet-500/5',
};

const PACKAGE_BADGE: Record<string, string> = {
  FREE: '',
  PLUS: 'Phổ biến',
  PRO:  'Không giới hạn',
};

export const AiUpgradeModal: React.FC<AiUpgradeModalProps> = ({
  isOpen, onClose, usage, packages, userId, onUpgradeSuccess,
}) => {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [promoCode, setPromoCode] = useState('');
  const [promoValidated, setPromoValidated] = useState<{discountPercent: number; bonusCredits: number} | null>(null);
  const [promoError, setPromoError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingPromo, setCheckingPromo] = useState(false);

  // Auto-select PLUS khi mở
  useEffect(() => {
    if (isOpen && packages.length > 0 && !selectedId) {
      const plus = packages.find(p => p.code === 'PLUS');
      if (plus) setSelectedId(plus.id);
    }
  }, [isOpen, packages]);

  if (!isOpen) return null;

  const selectedPkg = packages.find(p => p.id === selectedId);
  const currentCode = usage?.packageCode ?? 'FREE';

  const formatPrice = (vnd: number) =>
    vnd === 0 ? 'Miễn phí' : `${vnd.toLocaleString('vi-VN')}đ/tháng`;

  const discountedPrice = (pkg: AiPackage) => {
    if (!promoValidated || promoValidated.discountPercent === 0) return pkg.priceVnd;
    return pkg.priceVnd - Math.round(pkg.priceVnd * promoValidated.discountPercent / 100);
  };

  const handleCheckPromo = async () => {
    if (!promoCode.trim() || !selectedId) return;
    setCheckingPromo(true);
    setPromoError('');
    const res = await aiUsageService.validatePromo(userId, promoCode.trim(), selectedId);
    setCheckingPromo(false);
    if (res.success && res.data?.valid) {
      setPromoValidated(res.data);
    } else {
      setPromoError(res.error?.message ?? 'Mã không hợp lệ');
      setPromoValidated(null);
    }
  };

  const handleSubscribe = async () => {
    if (!selectedId || !selectedPkg) return;
    setLoading(true);
    const returnUrl = `${window.location.origin}/payment/result`;
    const res = await aiUsageService.subscribe(
      userId, selectedId,
      promoValidated ? promoCode : undefined,
      returnUrl
    );
    setLoading(false);

    if (!res.success) {
      alert(res.error?.message ?? 'Đã xảy ra lỗi, vui lòng thử lại.');
      return;
    }

    const data = res.data;
    if (data?.method === 'direct') {
      // Gói miễn phí hoặc đã xử lý xong
      trackEvent('Upgrade', { package: selectedPkg.code, method: 'direct' });
      alert(data.message ?? 'Gói đã được kích hoạt!');
      onUpgradeSuccess?.();
      onClose();
    } else if (data?.paymentUrl) {
      // funnel: revenue intent — bắt đầu thanh toán VNPay
      trackEvent('UpgradeCheckout', { package: selectedPkg.code, amount: data.amount ?? selectedPkg.priceVnd });
      window.location.href = data.paymentUrl;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-zinc-900/95 backdrop-blur border-b border-zinc-700/50 p-5 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-lime-400" />
            <h2 className="text-lg font-bold text-white">Nâng cấp gói AI</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Current usage info */}
          {usage && !usage.isUnlimited && (
            <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-sm text-yellow-300">
              ⚠️ Bạn còn <strong>{usage.remaining}/{usage.quota}</strong> credit AI tháng này ({usage.packageName}).
              {usage.remaining === 0 && ' Hết lượt — hãy nâng cấp để tiếp tục.'}
            </div>
          )}

          {/* Package cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {packages.map(pkg => {
              const isCurrent = pkg.code === currentCode;
              const isSelected = pkg.id === selectedId;
              const badge = PACKAGE_BADGE[pkg.code];
              const features = PACKAGE_FEATURES[pkg.code] ?? [];
              const finalPrice = discountedPrice(pkg);

              return (
                <button
                  key={pkg.id}
                  type="button"
                  disabled={isCurrent}
                  onClick={() => { setSelectedId(pkg.id); setPromoValidated(null); setPromoCode(''); }}
                  className={`relative text-left p-4 rounded-xl border-2 transition-all
                    ${PACKAGE_COLORS[pkg.code] ?? 'border-zinc-600 bg-zinc-800/50'}
                    ${isSelected ? 'ring-2 ring-lime-400/60' : ''}
                    ${isCurrent ? 'opacity-60 cursor-default' : 'hover:opacity-90 cursor-pointer'}
                  `}
                >
                  {badge && (
                    <span className="absolute -top-2 left-3 px-2 py-0.5 rounded-full bg-lime-500 text-black text-[10px] font-bold">
                      {badge}
                    </span>
                  )}
                  {isCurrent && (
                    <span className="absolute -top-2 right-3 px-2 py-0.5 rounded-full bg-zinc-500 text-white text-[10px] font-bold">
                      Hiện tại
                    </span>
                  )}
                  <div className="mb-2">
                    <div className="font-bold text-white">{pkg.name}</div>
                    <div className="text-lg font-black text-lime-400 mt-0.5">
                      {pkg.priceVnd === 0 ? 'Miễn phí' : (
                        <>
                          {finalPrice !== pkg.priceVnd && (
                            <span className="line-through text-zinc-500 text-sm mr-1">
                              {pkg.priceVnd.toLocaleString('vi-VN')}đ
                            </span>
                          )}
                          {finalPrice.toLocaleString('vi-VN')}đ
                          <span className="text-xs font-normal text-zinc-400">/tháng</span>
                        </>
                      )}
                    </div>
                  </div>
                  <ul className="space-y-1">
                    {features.map((f, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs text-zinc-300">
                        <Check className="w-3 h-3 text-lime-400 mt-0.5 flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </button>
              );
            })}
          </div>

          {/* Promo code */}
          {selectedPkg && selectedPkg.priceVnd > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs text-zinc-400 flex items-center gap-1">
                <Gift className="w-3.5 h-3.5" /> Mã khuyến mãi
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={promoCode}
                  onChange={e => { setPromoCode(e.target.value.toUpperCase()); setPromoValidated(null); setPromoError(''); }}
                  placeholder="Nhập mã (vd: SUMMER50)"
                  className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-lime-500"
                />
                <button
                  type="button"
                  onClick={handleCheckPromo}
                  disabled={!promoCode.trim() || checkingPromo}
                  className="px-3 py-2 bg-zinc-700 hover:bg-zinc-600 text-white text-sm rounded-lg disabled:opacity-50 transition-colors whitespace-nowrap"
                >
                  {checkingPromo ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Áp dụng'}
                </button>
              </div>
              {promoValidated && (
                <div className="text-xs text-lime-400 flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Hợp lệ! Giảm {promoValidated.discountPercent}%
                  {promoValidated.bonusCredits > 0 && ` + ${promoValidated.bonusCredits} credit thêm`}
                </div>
              )}
              {promoError && <div className="text-xs text-red-400">{promoError}</div>}
            </div>
          )}

          {/* CTA */}
          {selectedPkg && selectedPkg.priceVnd > 0 ? (
            /* Gói trả phí — chưa mở thanh toán, hiển thị "Sắp ra mắt" */
            <div className="space-y-3">
              <div className="w-full py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-400 text-sm font-bold
                              flex items-center justify-center gap-2 cursor-default">
                <Clock className="w-4 h-4" /> Thanh toán sắp ra mắt
              </div>
              <div className="rounded-xl bg-lime-500/10 border border-lime-500/25 p-3 text-xs text-lime-300 space-y-1.5">
                <p className="font-bold text-lime-400">Giai đoạn beta — nhận gói cao hơn miễn phí!</p>
                <p>Mời bạn bè qua link trong trang cá nhân:</p>
                <ul className="space-y-0.5 text-lime-300/80">
                  <li>• Mời đủ <strong className="text-white">5 người</strong> → lên <strong className="text-lime-400">PLUS</strong> (200 credit/tháng)</li>
                  <li>• Mời đủ <strong className="text-white">20 người</strong> → lên <strong className="text-violet-400">PRO</strong> (không giới hạn)</li>
                </ul>
              </div>
            </div>
          ) : (
            /* Gói FREE */
            <button
              type="button"
              onClick={handleSubscribe}
              disabled={!selectedId || loading || selectedPkg?.code === currentCode}
              className="w-full py-3 rounded-xl bg-lime-500 hover:bg-lime-400 text-black font-bold text-sm
                         disabled:opacity-50 disabled:cursor-default transition-all flex items-center justify-center gap-2"
            >
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang xử lý...</>
                : 'Kích hoạt gói miễn phí'
              }
            </button>
          )}
          <p className="text-center text-xs text-zinc-500">
            Giai đoạn thử nghiệm · Tính năng nâng cao sắp ra mắt
          </p>
        </div>
      </div>
    </div>
  );
};
