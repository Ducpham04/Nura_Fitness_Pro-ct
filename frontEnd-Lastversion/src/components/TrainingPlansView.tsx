import { useState, useEffect, memo } from 'react';
import {
  Zap, Loader2, Dumbbell, Calendar, Target, TrendingUp,
  Play, RefreshCw, Sparkles, CheckCircle2,
} from 'lucide-react';
import { trainingService, type UserTraining } from '../services/trainingService';
import { userService } from '../services/userService';
import { useAuthContext } from '../context/AuthContext';
import CyberpunkWorkoutModal from './CyberpunkWorkoutModal';

const GOAL_LABELS: Record<string, string> = {
  weight_loss: 'Giảm mỡ',
  muscle_gain: 'Tăng cơ',
  maintenance: 'Duy trì',
  endurance: 'Sức bền',
  strength: 'Sức mạnh',
  lose: 'Giảm mỡ',
  muscle: 'Tăng cơ',
  maintain: 'Duy trì',
};

interface TrainingPlansViewProps {
  onPlanReady?: () => void;
}

function TrainingPlansView({ onPlanReady }: TrainingPlansViewProps) {
  const { user } = useAuthContext();
  const [training, setTraining] = useState<UserTraining | null>(null);
  const [goalText, setGoalText] = useState('');
  const [loading, setLoading] = useState(true);
  const [aiModalOpen, setAiModalOpen] = useState(false);

  const load = async () => {
    if (!user?.id) { setLoading(false); return; }
    setLoading(true);
    try {
      const list = await trainingService.getUserTraining(user.id);
      const active = list.find(t => /active|in_progress/i.test(t.status || '')) || list[0] || null;
      setTraining(active);
    } catch (e) {
      console.warn('[Chương trình] load failed:', e);
    } finally {
      setLoading(false);
    }
    userService.getBodyProfile().then((b: any) => {
      if (b?.goal) setGoalText(GOAL_LABELS[b.goal] || b.goal);
    }).catch(() => {});
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user?.id]);

  const handleAiSuccess = async (data: any) => {
    setAiModalOpen(false);
    await load();
    if (data?.userTrainingId && !data?.personalized) {
      try {
        await fetch(`/api/user/training/${data.userTrainingId}/regenerate-personalized`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token') || localStorage.getItem('authToken') || ''}`,
            'Content-Type': 'application/json',
          },
        });
      } catch { /* TrainingView sẽ tự retry khi load */ }
    }
    onPlanReady?.();
  };

  const week = training?.weekNumber || 1;
  const totalWeeks = training?.totalWeeks || 1;
  const progress = training?.completionPercentage != null
    ? Math.round(training.completionPercentage)
    : Math.round((Math.max(0, week - 1) / Math.max(1, totalWeeks)) * 100);

  return (
    <div className="max-w-4xl mx-auto px-4 space-y-6 animate-fade-in pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-grotesk font-bold text-2xl text-white">Chương trình của tôi</h1>
          <p className="text-neutral-400 text-sm mt-1">Kế hoạch tập luyện AI cá nhân hóa theo mục tiêu của bạn.</p>
        </div>
        <button
          onClick={() => setAiModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-lime text-black font-grotesk font-bold text-sm shadow-lg shadow-lime/20 hover:scale-[1.02] active:scale-[0.98] transition-all shrink-0"
        >
          <Sparkles className="w-4 h-4" />
          {training ? 'Tạo lại bằng AI' : 'Tạo kế hoạch AI'}
        </button>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-lime animate-spin" />
        </div>
      ) : training ? (
        <>
          {/* Thẻ chương trình đang hoạt động */}
          <div className="relative overflow-hidden rounded-3xl border border-white/[0.07] bg-gradient-to-br from-lime/[0.07] via-white/[0.02] to-blue-500/[0.05] p-6">
            <div className="pointer-events-none absolute -top-16 -right-10 w-56 h-56 rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(204,255,0,0.10) 0%, transparent 70%)' }} />

            <div className="relative flex items-start justify-between gap-4 mb-5">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-lime/15 border border-lime/25 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-lime">
                    <span className="w-1.5 h-1.5 rounded-full bg-lime animate-pulse" /> Đang hoạt động
                  </span>
                  {goalText && (
                    <span className="rounded-full bg-white/[0.06] border border-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-neutral-300">
                      {goalText}
                    </span>
                  )}
                </div>
                <h2 className="font-grotesk font-bold text-xl text-white truncate">
                  {training.name || 'Kế hoạch tập của bạn'}
                </h2>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-lime/10 border border-lime/20 flex items-center justify-center shrink-0">
                <Dumbbell className="w-6 h-6 text-lime" />
              </div>
            </div>

            {/* Tiến độ */}
            <div className="relative mb-5">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-neutral-400">Tiến độ chương trình</span>
                <span className="text-lime font-bold">{progress}%</span>
              </div>
              <div className="h-2 rounded-full bg-white/[0.08] overflow-hidden">
                <div className="h-full bg-gradient-to-r from-lime to-emerald-400 rounded-full transition-all duration-700"
                  style={{ width: `${progress}%` }} />
              </div>
            </div>

            {/* Chỉ số */}
            <div className="relative grid grid-cols-3 gap-3 mb-5">
              {[
                { icon: Calendar, label: 'Tuần', value: `${week}/${totalWeeks}`, color: 'text-blue-400' },
                { icon: Target, label: 'Ngày hiện tại', value: training.currentDay || 1, color: 'text-orange-400' },
                { icon: TrendingUp, label: 'Hoàn thành', value: `${progress}%`, color: 'text-lime' },
              ].map(({ icon: Icon, label, value, color }) => (
                <div key={label} className="rounded-2xl bg-white/[0.04] border border-white/[0.06] p-3 text-center">
                  <Icon className={`w-4 h-4 ${color} mx-auto mb-1.5`} />
                  <div className="font-grotesk font-bold text-base text-white">{value}</div>
                  <div className="text-neutral-600 text-[9px] uppercase tracking-wider mt-0.5">{label}</div>
                </div>
              ))}
            </div>

            {/* Hành động */}
            <div className="relative flex flex-col sm:flex-row gap-2.5">
              <button
                onClick={() => onPlanReady?.()}
                className="flex-1 btn-lime py-3 rounded-2xl text-sm font-grotesk font-bold flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4" fill="currentColor" /> Vào tập hôm nay
              </button>
              <button
                onClick={() => setAiModalOpen(true)}
                className="flex-1 rounded-2xl border border-white/10 bg-white/[0.04] py-3 text-sm font-grotesk font-bold text-neutral-300 hover:text-white hover:border-white/20 transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" /> Tạo lại bằng AI
              </button>
            </div>
          </div>

          {/* Ghi chú */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 flex items-start gap-3">
            <CheckCircle2 className="w-4 h-4 text-lime mt-0.5 shrink-0" />
            <p className="text-neutral-400 text-xs leading-relaxed">
              Lịch tập chi tiết từng buổi nằm ở tab <span className="text-white font-semibold">"Bài Tập Hôm Nay"</span>.
              Cuối mỗi tuần, dùng <span className="text-white font-semibold">"AI thích ứng"</span> để kế hoạch tự điều chỉnh
              theo mức độ hoàn thành & cảm nhận của bạn.
            </p>
          </div>
        </>
      ) : (
        /* Chưa có chương trình */
        <div className="rounded-3xl border border-white/[0.07] bg-white/[0.03] p-10 text-center">
          <div className="w-16 h-16 rounded-2xl bg-lime/10 border border-lime/20 flex items-center justify-center mx-auto mb-5">
            <Zap className="w-8 h-8 text-lime" />
          </div>
          <h3 className="font-grotesk font-bold text-white text-lg mb-2">Chưa có chương trình tập</h3>
          <p className="text-neutral-400 text-sm max-w-sm mx-auto mb-6">
            Tạo kế hoạch tập cá nhân hóa bằng AI — dựa trên mục tiêu, thể trạng, thiết bị và chấn thương của bạn.
          </p>
          <button
            onClick={() => setAiModalOpen(true)}
            className="btn-lime px-6 py-3.5 rounded-2xl text-sm font-grotesk font-bold inline-flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" /> Tạo kế hoạch AI
          </button>
        </div>
      )}

      {aiModalOpen && (
        <CyberpunkWorkoutModal
          onClose={() => setAiModalOpen(false)}
          onSuccess={handleAiSuccess}
        />
      )}
    </div>
  );
}

export default memo(TrainingPlansView);
