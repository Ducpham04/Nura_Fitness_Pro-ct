import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2, Zap } from 'lucide-react';
import { apiClient } from '../services/apiClient';

type ResultState = 'loading' | 'success' | 'failed' | 'error';

export default function PaymentResultPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [state, setState] = useState<ResultState>('loading');
  const [message, setMessage] = useState('');
  const [packageCode, setPackageCode] = useState('');

  useEffect(() => {
    async function verify() {
      // Lấy tất cả params VNPay trả về
      const params: Record<string, string> = {};
      searchParams.forEach((value, key) => { params[key] = value; });

      const responseCode = params['vnp_ResponseCode'];

      // Nếu không có param VNPay → không phải callback thật
      if (!responseCode) {
        setState('error');
        setMessage('Không tìm thấy thông tin thanh toán.');
        return;
      }

      if (responseCode === '00') {
        // Thành công — gọi BE xác nhận
        try {
          const queryStr = new URLSearchParams(params).toString();
          const res = await apiClient.get(`/ai-packages/payment/result?${queryStr}`, { skipAuth: true });
          if (res.success && (res.data as any)?.success) {
            setState('success');
            setPackageCode((res.data as any)?.packageCode ?? '');
            setMessage('Gói AI của bạn đã được kích hoạt thành công!');
          } else {
            setState('failed');
            setMessage((res.data as any)?.message || 'Xác nhận thanh toán thất bại.');
          }
        } catch {
          // Nếu BE fail, vẫn coi là thành công về UX (VNPay đã xác nhận 00)
          setState('success');
          setMessage('Thanh toán thành công. Gói sẽ được kích hoạt trong vài giây.');
        }
      } else {
        setState('failed');
        const codeMessages: Record<string, string> = {
          '24': 'Bạn đã huỷ giao dịch.',
          '51': 'Tài khoản không đủ số dư.',
          '65': 'Vượt quá giới hạn giao dịch trong ngày.',
          '75': 'Ngân hàng đang bảo trì.',
        };
        setMessage(codeMessages[responseCode] || `Thanh toán thất bại (mã lỗi: ${responseCode}).`);
      }
    }

    void verify();
  }, [searchParams]);

  const handleContinue = () => {
    navigate('/dashboard', { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#0b0d11] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-2xl p-8 text-center shadow-2xl">
        {/* Icon */}
        <div className="flex justify-center mb-5">
          {state === 'loading' && (
            <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-zinc-400 animate-spin" />
            </div>
          )}
          {state === 'success' && (
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
          )}
          {(state === 'failed' || state === 'error') && (
            <div className="w-16 h-16 rounded-full bg-red-500/15 flex items-center justify-center">
              <XCircle className="w-8 h-8 text-red-400" />
            </div>
          )}
        </div>

        {/* Title */}
        <h1 className="text-xl font-bold text-white mb-2">
          {state === 'loading' && 'Đang xác nhận thanh toán...'}
          {state === 'success' && 'Thanh toán thành công! 🎉'}
          {state === 'failed' && 'Thanh toán thất bại'}
          {state === 'error' && 'Có lỗi xảy ra'}
        </h1>

        {/* Message */}
        {message && (
          <p className="text-zinc-400 text-sm mb-6">{message}</p>
        )}

        {/* Package badge (khi success) */}
        {state === 'success' && packageCode && (
          <div className="mb-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-lime-500/15 border border-lime-500/30">
            <Zap className="w-4 h-4 text-lime-400" />
            <span className="text-lime-300 font-semibold text-sm">Gói {packageCode} đã kích hoạt</span>
          </div>
        )}

        {/* Actions */}
        {state !== 'loading' && (
          <div className="space-y-3 mt-2">
            <button
              onClick={handleContinue}
              className="w-full py-3 rounded-xl bg-lime-500 hover:bg-lime-400 text-black font-bold text-sm transition-colors"
            >
              {state === 'success' ? 'Bắt đầu dùng AI →' : 'Quay về Dashboard'}
            </button>
            {state === 'failed' && (
              <button
                onClick={() => navigate(-1)}
                className="w-full py-2.5 rounded-xl border border-zinc-600 text-zinc-300 hover:text-white text-sm transition-colors"
              >
                Thử lại
              </button>
            )}
          </div>
        )}

        {/* VNPay txnRef nhỏ */}
        {searchParams.get('vnp_TxnRef') && (
          <p className="mt-5 text-[11px] text-zinc-600">
            Mã GD: {searchParams.get('vnp_TxnRef')}
          </p>
        )}
      </div>
    </div>
  );
}
