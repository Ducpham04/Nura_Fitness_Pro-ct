import { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation';
import { useAuthContext } from '../context/AuthContext';
import { userService } from '../services/userService';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../services/apiClient';

const FEEDBACK_TYPES = [
  { value: 'bug',     label: 'Báo lỗi' },
  { value: 'ux',      label: 'Góp ý giao diện' },
  { value: 'feature', label: 'Đề xuất tính năng' },
  { value: 'general', label: 'Ý kiến chung' },
];

export default function DashboardLayout() {
  const { user } = useAuthContext();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [checking, setChecking] = useState(true);

  // Feedback widget state
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState('general');
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function checkUserSetup() {
      if (!user) return;
      if (user.role === 'ADMIN') {
        setChecking(false);
        return;
      }
      try {
        const profile = await userService.getBodyProfile();
        const p = profile;
        // Chỉ ép onboarding khi GỌI THÀNH CÔNG nhưng hồ sơ thật sự trống
        // (user mới chưa từng nhập). Lỗi mạng/500 không còn đẩy user về
        // onboarding → tránh "kẹt vòng lặp" khi API chập chờn.
        const onboardingDone = !!(p && p.height && p.weight && p.age);
        if (!onboardingDone) {
          navigate('/onboarding', { replace: true });
          return;
        }
        setChecking(false);
      } catch (err) {
        // Lỗi tải hồ sơ (mạng/server) → cho vào dashboard, để các màn con tự
        // xử lý empty/error state. KHÔNG redirect về onboarding.
        console.error('Error checking profile (staying on dashboard):', err);
        setChecking(false);
      }
    }
    checkUserSetup();
  }, [user, navigate]);

  // Close feedback when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (feedbackOpen && dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
        setFeedbackOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [feedbackOpen]);

  async function sendFeedback() {
    if (!feedbackMsg.trim() && feedbackRating === 0) return;
    setFeedbackSending(true);
    try {
      await apiClient.post('/user/feedback', {
        feedbackType,
        rating: feedbackRating > 0 ? feedbackRating : null,
        message: feedbackMsg.trim(),
        page: location.pathname,
      });
      setFeedbackSent(true);
      setTimeout(() => {
        setFeedbackOpen(false);
        setFeedbackSent(false);
        setFeedbackMsg('');
        setFeedbackRating(0);
        setFeedbackType('general');
      }, 1800);
    } catch {
      // silent
    } finally {
      setFeedbackSending(false);
    }
  }

  if (checking) {
    return (
      <div className="vw-dark vw-dark-bg flex h-screen items-center justify-center">
        <div className="relative z-10 text-center space-y-4">
          <div className="relative w-14 h-14 mx-auto">
            <div className="absolute inset-0 border-4 border-white/10 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-[#CCFF00] rounded-full border-t-transparent animate-spin"></div>
          </div>
          <p className="text-[#94a3b8] font-bold font-grotesk text-xs animate-pulse">{t('dashboard.syncingProfile')}</p>
        </div>
      </div>
    );
  }

  // Don't show feedback button to admins
  const showFeedback = user?.role !== 'ADMIN';
  const isHome = location.pathname === '/dashboard';

  return (
    <div className="vw-dark vw-dark-bg min-h-screen font-inter text-[#f1f5f9]">
      <Navigation />
      <main className="relative z-10 px-3 sm:px-5 md:px-6 pt-4 md:pt-6 vw-content">
        <Outlet />
      </main>

      {/* Floating feedback button */}
      {showFeedback && (
        <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40" ref={dialogRef}>
          {feedbackOpen && (
            <div className="mb-3 w-80 rounded-2xl border border-white/10 bg-[#0c1322]/95 backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] p-4 space-y-3">
              {feedbackSent ? (
                <div className="flex flex-col items-center gap-2 py-4">
                  <span className="text-3xl">✅</span>
                  <p className="text-[#CCFF00] font-semibold text-sm">Cảm ơn bạn đã góp ý!</p>
                </div>
              ) : (
                <>
                  <p className="text-sm font-bold text-white">Góp ý / Báo lỗi</p>
                  <div className="flex gap-1">
                    {[1,2,3,4,5].map(s => (
                      <button key={s} onClick={() => setFeedbackRating(s)}
                        className={`text-xl transition ${feedbackRating >= s ? 'text-amber-400' : 'text-white/20 hover:text-amber-300'}`}>★</button>
                    ))}
                    {feedbackRating > 0 && (
                      <button onClick={() => setFeedbackRating(0)} className="text-xs text-[#64748b] ml-1 hover:text-[#94a3b8]">✕</button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {FEEDBACK_TYPES.map(ft => (
                      <button key={ft.value} onClick={() => setFeedbackType(ft.value)}
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-full border transition ${feedbackType === ft.value ? 'bg-[#CCFF00]/15 border-[#CCFF00] text-[#CCFF00]' : 'border-white/10 text-[#94a3b8] hover:border-white/25'}`}>
                        {ft.label}
                      </button>
                    ))}
                  </div>
                  <textarea value={feedbackMsg} onChange={e => setFeedbackMsg(e.target.value)}
                    placeholder="Mô tả chi tiết (không bắt buộc)..." rows={3}
                    className="w-full bg-white/5 rounded-xl border border-white/10 px-3 py-2 text-sm text-white placeholder:text-[#64748b] focus:outline-none focus:border-[#3b82f6] resize-none" />
                  <button onClick={sendFeedback}
                    disabled={feedbackSending || (!feedbackMsg.trim() && feedbackRating === 0)}
                    className="w-full rounded-xl bg-gradient-to-r from-[#22c55e] to-[#3b82f6] hover:opacity-90 text-white font-bold text-sm py-2 transition disabled:opacity-40 disabled:cursor-not-allowed">
                    {feedbackSending ? 'Đang gửi...' : 'Gửi góp ý'}
                  </button>
                </>
              )}
            </div>
          )}
          <button onClick={() => setFeedbackOpen(v => !v)}
            className="flex items-center gap-2 bg-white/8 hover:bg-white/14 border border-white/12 text-[#cbd5e1] text-xs font-bold px-3 py-2 rounded-full shadow-lg backdrop-blur transition">
            <span>💬</span><span>Góp ý</span>
          </button>
        </div>
      )}
    </div>
  );
}
