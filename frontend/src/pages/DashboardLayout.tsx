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
        const p = profile as any;
        const onboardingDone = !!(p && p.height && p.weight && p.age);
        if (!onboardingDone) {
          navigate('/onboarding', { replace: true });
          return;
        }
        setChecking(false);
      } catch (e) {
        console.error('Error checking profile, redirecting to onboarding:', e);
        navigate('/onboarding', { replace: true });
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
    } catch (e) {
      // silent
    } finally {
      setFeedbackSending(false);
    }
  }

  if (checking) {
    return (
      <div className="flex h-screen bg-obsidian items-center justify-center">
        <div className="text-center space-y-6">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 border-4 border-lime/20 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-lime rounded-full border-t-transparent animate-spin"></div>
          </div>
          <p className="text-neutral-500 font-bold font-grotesk uppercase tracking-widest text-xs animate-pulse">{t('dashboard.syncingProfile')}</p>
        </div>
      </div>
    );
  }

  // Don't show feedback button to admins
  const showFeedback = user?.role !== 'ADMIN';

  return (
    <div className="min-h-screen bg-obsidian font-inter">
      <Navigation />
      <main className="px-3 sm:px-5 md:px-6 pt-16 md:py-8 main-pad-mobile">
        <Outlet />
      </main>

      {/* Floating feedback button */}
      {showFeedback && (
        <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40" ref={dialogRef}>
          {/* Dialog */}
          {feedbackOpen && (
            <div className="mb-3 w-80 rounded-2xl border border-white/10 bg-[#1a1a2e] shadow-2xl p-4 space-y-3">
              {feedbackSent ? (
                <div className="flex flex-col items-center gap-2 py-4">
                  <span className="text-2xl">✓</span>
                  <p className="text-emerald-400 font-semibold text-sm">Cảm ơn bạn đã góp ý!</p>
                </div>
              ) : (
                <>
                  <p className="text-sm font-bold text-slate-200">Góp ý / Báo lỗi</p>

                  {/* Rating */}
                  <div className="flex gap-1">
                    {[1,2,3,4,5].map(s => (
                      <button
                        key={s}
                        onClick={() => setFeedbackRating(s)}
                        className={`text-xl transition ${feedbackRating >= s ? 'text-amber-400' : 'text-slate-600 hover:text-amber-300'}`}
                      >★</button>
                    ))}
                    {feedbackRating > 0 && (
                      <button onClick={() => setFeedbackRating(0)} className="text-xs text-slate-600 ml-1 hover:text-slate-400">✕</button>
                    )}
                  </div>

                  {/* Type */}
                  <div className="flex flex-wrap gap-1.5">
                    {FEEDBACK_TYPES.map(t => (
                      <button
                        key={t.value}
                        onClick={() => setFeedbackType(t.value)}
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-full border transition ${feedbackType === t.value ? 'bg-white/10 border-white/20 text-white' : 'border-white/5 text-slate-500 hover:border-white/10'}`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {/* Message */}
                  <textarea
                    value={feedbackMsg}
                    onChange={e => setFeedbackMsg(e.target.value)}
                    placeholder="Mô tả chi tiết (không bắt buộc)..."
                    rows={3}
                    className="w-full bg-white/5 rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-white/20 resize-none"
                  />

                  <button
                    onClick={sendFeedback}
                    disabled={feedbackSending || (!feedbackMsg.trim() && feedbackRating === 0)}
                    className="w-full rounded-xl bg-lime/90 hover:bg-lime text-black font-bold text-sm py-2 transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {feedbackSending ? 'Đang gửi...' : 'Gửi góp ý'}
                  </button>
                </>
              )}
            </div>
          )}

          {/* Toggle button */}
          <button
            onClick={() => setFeedbackOpen(v => !v)}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-white/10 text-slate-300 text-xs font-bold px-3 py-2 rounded-full shadow-lg transition"
          >
            <span>💬</span>
            <span>Góp ý</span>
          </button>
        </div>
      )}
    </div>
  );
}
