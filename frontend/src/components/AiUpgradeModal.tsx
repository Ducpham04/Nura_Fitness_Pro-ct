import React, { useState, useEffect } from 'react';
import { X, Zap, Check, Loader2, Gift, Clock, QrCode, Copy, CheckCheck } from 'lucide-react';
import { AiPackage, AiUsageInfo, aiUsageService } from '../services/aiUsageService';
import { apiClient } from '../services/apiClient';
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
  const [paymentCfg, setPaymentCfg] = useState<{ qrUrl: string; bankInfo: string } | null>(null);
  const [qrInfo, setQrInfo] = useState<{ qrUrl: string; dynamic: boolean; content: string; amount: number; bankInfo: string } | null>(null);
  const [bankCopied, setBankCopied] = useState(false);
  const [notifyNote, setNotifyNote] = useState('');
  const [notifySent, setNotifySent] = useState(false);
  const [notifyLoading, setNotifyLoading] = useState(false);
  const [notifyError, setNotifyError] = useState('');

  // Auto-select PLUS khi mở
  useEffect(() => {
    if (isOpen && packages.length > 0 && !selectedId) {
      const plus = packages.find(p => p.code === 'PLUS');
      if (plus) setSelectedId(plus.id);
    }
  }, [isOpen, packages]);

  // Load payment config (QR URL) — fetch lại MỖI lần mở modal để luôn lấy QR mới nhất
  // (tránh kẹt state cũ "sắp ra mắt" khi admin vừa cập nhật QR mà user chưa reload trang).
  useEffect(() => {
    if (!isOpen) return;
    apiClient.get('/ai-packages/payment-config').then(res => {
      if (res.success && res.data) setPaymentCfg(res.data as any);
    }).catch(() => {});
  }, [isOpen]);

  // Lấy VietQR động (nhúng số tiền + nội dung CK riêng) cho gói trả phí đang chọn
  // → SePay tự đối soát & kích hoạt khi nhận được tiền.
  useEffect(() => {
    if (!isOpen || !selectedId) { setQrInfo(null); return; }
    const pkg = packages.find(p => p.id === selectedId);
    if (!pkg || pkg.priceVnd <= 0) { setQrInfo(null); return; }
    setNotifySent(false);
    apiClient.get(`/ai-packages/${selectedId}/payment-qr`, { headers: { userId: userId.toString() } })
      .then(res => { if (res.success && res.data) setQrInfo(res.data as any); })
      .catch(() => setQrInfo(null));
  }, [isOpen, selectedId]);

  if (!isOpen) return null;

  const selectedPkg = packages.find(p => p.id === selectedId);
  const currentCode = usage?.packageCode ?? 'FREE';

  // QR + nội dung CK: ưu tiên QR động theo gói (auto-fill), fallback QR tĩnh admin cấu hình
  const qrUrl = qrInfo?.qrUrl || paymentCfg?.qrUrl || '';
  const ckContent = qrInfo?.content || `SEVQR VIWAY ${selectedPkg?.code ?? ''} ${userId}`;
  const ckBankInfo = qrInfo?.bankInfo || paymentCfg?.bankInfo || '';

  const formatPrice = (vnd: number) =>
    vnd === 0 ? 'Miễn phí' : `${vnd.toLocaleString('vi-VN')}đ/tháng`;

  const discountedPrice = (pkg: AiPackage) => {
    if (!promoValidated || promoValidated.discountPercent === 0) return pkg.priceVnd;
    return pkg.priceVnd - Math.round(pkg.priceVnd * promoValidated.discountPercent / 100);
  };

  const handleNotifyPayment = async () => {
    if (!selectedId) return;
    setNotifyLoading(true);
    setNotifyError('');
    try {
      const res = await apiClient.post('/ai-packages/notify-payment',
        { packageId: selectedId, note: notifyNote.trim() || undefined },
        { headers: { userId: userId.toString() } }
      );
      if ((res as any)?.success || res.success) {
        setNotifySent(true);
        trackEvent('PaymentNotified', { package: selectedPkg?.code });
      } else {
        setNotifyError('Không gửi được thông báo. Vui lòng liên hệ trực tiếp.');
      }
    } catch {
      setNotifyError('Lỗi kết nối. Vui lòng thử lại.');
    } finally {
      setNotifyLoading(false);
    }
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
            /* Gói trả phí */
            <div className="space-y-3">
              {qrUrl ? (
                /* ── Có QR chuyển khoản ── */
                <div className="rounded-xl border border-lime-500/30 bg-zinc-800/60 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-lime-400" />
                    <p className="text-sm font-bold text-white">Chuyển khoản ngân hàng</p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4 items-center">
                    <img
                      src={qrUrl}
                      alt="QR chuyển khoản"
                      className="w-36 h-36 rounded-xl border border-zinc-600 object-contain shrink-0 bg-white p-1"
                    />
                    <div className="flex-1 space-y-2 text-sm">
                      {ckBankInfo && (
                        <div className="rounded-lg bg-zinc-700/50 p-2.5 font-mono text-xs text-zinc-200 leading-relaxed whitespace-pre-wrap">
                          {ckBankInfo}
                        </div>
                      )}
                      <p className="text-zinc-400 text-xs">
                        Nội dung chuyển khoản: <strong className="text-white">{ckContent}</strong>
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(ckContent);
                          setBankCopied(true);
                          setTimeout(() => setBankCopied(false), 2000);
                        }}
                        className="flex items-center gap-1.5 text-xs text-lime-400 hover:text-lime-300 transition-colors"
                      >
                        {bankCopied ? <CheckCheck className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {bankCopied ? 'Đã copy!' : 'Copy nội dung CK'}
                      </button>
                    </div>
                  </div>
                  {qrInfo?.dynamic && (
                    <div className="rounded-lg bg-lime-500/10 border border-lime-500/25 p-2.5 text-[11px] text-lime-300 leading-relaxed">
                      ⚡ <strong className="text-lime-400">Tự động kích hoạt:</strong> giữ nguyên nội dung CK ở trên — gói sẽ được bật <strong>tự động trong 1–2 phút</strong> sau khi ngân hàng nhận tiền. Không cần chờ admin duyệt.
                    </div>
                  )}
                  {/* Nút báo đã CK — fallback khi auto chưa kích hoạt / ghi sai nội dung */}
                  {!notifySent ? (
                    <div className="space-y-2 pt-1 border-t border-zinc-700">
                      <p className="text-[11px] text-zinc-400">Nếu sau vài phút gói chưa được bật, bấm nút bên dưới để admin xử lý thủ công:</p>
                      <textarea
                        value={notifyNote}
                        onChange={e => setNotifyNote(e.target.value)}
                        placeholder="Ghi chú thêm (không bắt buộc): đã CK lúc 14:30..."
                        rows={2}
                        className="w-full px-3 py-2 bg-zinc-700/60 border border-zinc-600 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-lime-500 resize-none"
                      />
                      <button
                        type="button"
                        disabled={notifyLoading}
                        onClick={handleNotifyPayment}
                        className="w-full py-2.5 rounded-xl bg-lime-500 hover:bg-lime-400 text-black text-sm font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                      >
                        {notifyLoading
                          ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang gửi...</>
                          : '✓ Tôi đã chuyển khoản — báo admin'}
                      </button>
                      {notifyError && <p className="text-xs text-red-400">{notifyError}</p>}
                    </div>
                  ) : (
                    <div className="rounded-xl bg-lime-500/15 border border-lime-500/30 p-3 text-center">
                      <p className="text-lime-400 font-bold text-sm">Đã gửi thông báo!</p>
                      <p className="text-zinc-400 text-xs mt-1">Admin sẽ kích hoạt gói trong vòng 24h. Kiểm tra email để xác nhận.</p>
                    </div>
                  )}
                </div>
              ) : (
                /* ── Chưa cấu hình QR ── */
                <div className="w-full py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-400 text-sm font-bold
                                flex items-center justify-center gap-2 cursor-default">
                  <Clock className="w-4 h-4" /> Thanh toán sắp ra mắt
                </div>
              )}
              <div className="rounded-xl bg-lime-500/10 border border-lime-500/25 p-3 text-xs text-lime-300 space-y-1.5">
                <p className="font-bold text-lime-400">Hoặc nhận gói miễn phí qua referral!</p>
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
