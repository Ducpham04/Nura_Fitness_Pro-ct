import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Flame,
  Footprints,
  Gift,
  Leaf,
  Lock,
  Sparkles,
  Star,
  TrendingUp,
  Trophy,
  Zap,
  Flower2,
  Sprout,
  Dumbbell,
  Utensils,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useDashboard } from '../hooks/useDashboard';
import { useAuthContext } from '../context/AuthContext';
import { containerStagger, fadeUp, CountUp } from '../lib/motion';
import { STAGES, stageStatus, journeyProgress, clampPct as clamp } from '../lib/journey';

function shortName(fullName?: string) {
  return (fullName || 'Bạn').trim().split(/\s+/).slice(-1)[0] || 'Bạn';
}

const STAGE_ICONS = [Sprout, Leaf, Flower2, Trophy];

function encourage(progress: number, name: string) {
  if (progress >= 100) return `Tuyệt vời ${name}! Cây hành trình của bạn đã nở rộ.`;
  if (progress >= 75) return `Sắp chạm mốc rồi ${name}. Giữ nhịp thêm một chút nữa.`;
  if (progress >= 50) return `Bạn đã đi qua nửa hành trình. Cây đang lớn rất đẹp.`;
  if (progress >= 25) return `Những chiếc lá đầu tiên đã xuất hiện. Tiếp tục đều đặn nhé.`;
  if (progress > 0) return `Hành trình đã bắt đầu. Mỗi nhiệm vụ hoàn thành là một chiếc lá mới.`;
  return `Sẵn sàng chưa ${name}? Hoàn thành nhiệm vụ đầu tiên để gieo mầm cây của bạn.`;
}

function treeLevel(progress: number) {
  if (progress >= 75) return 'bloom';
  if (progress >= 50) return 'grow';
  if (progress >= 25) return 'sprout';
  if (progress > 0) return 'seed';
  return 'empty';
}

export default function JourneyPage() {
  const { user } = useAuthContext();
  const { data } = useDashboard();
  const navigate = useNavigate();

  const summary = data?.userSummary || {
    fullName: user?.fullName || 'Bạn',
    level: 1,
    currentExp: 0,
    nextLevelExp: 100,
    streakDays: 0,
  };

  const stats = data?.stats;

  const name = shortName(summary.fullName);

  const expPct = clamp(
      summary.nextLevelExp > 0
          ? (summary.currentExp / summary.nextLevelExp) * 100
          : 0
  );

  const overall = useMemo(() => journeyProgress(stats), [stats]);

  const level = treeLevel(overall);

  const completedLeaves = Math.max(1, Math.round(overall / 12));

  const currentStageIdx = STAGES.findIndex(
      (_, i) => stageStatus(i, overall) === 'current'
  );

  return (
      <motion.div
          variants={containerStagger}
          initial="hidden"
          animate="show"
          className="mx-auto w-full max-w-3xl space-y-5 pb-28 text-[#101a3d]"
      >
        {/* Hero */}
        <motion.section
            variants={fadeUp}
            className="relative overflow-hidden rounded-[32px] border border-emerald-100 bg-[#f4fbf5] p-5 shadow-[0_16px_40px_rgba(15,118,110,0.08)]"
        >
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-emerald-200/30 blur-2xl" />
          <div className="absolute -bottom-12 -left-10 h-44 w-44 rounded-full bg-lime-200/40 blur-2xl" />

          <div className="relative">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-emerald-700">
                  Hành trình của {name}
                </p>
                <h1 className="mt-1 font-grotesk text-[28px] font-bold leading-tight text-[#10251d]">
                  Cây tiến bộ cá nhân
                </h1>
                <p className="mt-1 max-w-[260px] text-sm leading-relaxed text-[#5f6f68]">
                  Hoàn thành tập luyện, ăn uống và thử thách để cây của bạn lớn lên mỗi ngày.
                </p>
              </div>

              <div className="rounded-2xl bg-white/80 px-3 py-2 text-right shadow-sm backdrop-blur">
                <p className="text-[11px] font-semibold text-[#6b7d75]">Cấp độ</p>
                <p className="font-grotesk text-xl font-bold text-emerald-700">
                  {summary.level}
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white/80 p-3 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#6b7d75]">
                  <Flame className="h-4 w-4 text-amber-500" />
                  Streak
                </div>
                <p className="mt-1 font-grotesk text-xl font-bold text-[#10251d]">
                  {summary.streakDays} ngày
                </p>
              </div>

              <div className="rounded-2xl bg-white/80 p-3 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#6b7d75]">
                  <Star className="h-4 w-4 text-amber-500" />
                  XP
                </div>
                <p className="mt-1 font-grotesk text-xl font-bold text-[#10251d]">
                  {summary.currentExp}/{summary.nextLevelExp}
                </p>
              </div>
            </div>

            <div className="mt-4">
              <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-[#6b7d75]">
                <span>Tiến độ cấp độ</span>
                <span>{Math.round(expPct)}%</span>
              </div>

              <div className="h-2.5 overflow-hidden rounded-full bg-emerald-100">
                <motion.div
                    className="h-full rounded-full bg-emerald-600"
                    initial={{ width: 0 }}
                    animate={{ width: `${expPct}%` }}
                    transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
            </div>
          </div>
        </motion.section>

        {/* Message */}
        <motion.div
            variants={fadeUp}
            className="flex items-center gap-3 rounded-[22px] border border-emerald-100 bg-white px-4 py-3 shadow-[0_10px_26px_rgba(15,118,110,0.06)]"
        >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50">
          <Sparkles className="h-5 w-5 text-emerald-600" />
        </span>

          <p className="text-sm font-medium leading-relaxed text-[#1f4d3a]">
            {encourage(overall, name)}
          </p>
        </motion.div>

        {/* Progress Summary */}
        <motion.div
            variants={fadeUp}
            className="rounded-[22px] border border-slate-100 bg-white p-4 shadow-[0_12px_30px_rgba(30,64,175,0.06)]"
        >
          <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-[#445178]">
            Tiến độ hành trình
          </span>

            <span className="font-grotesk text-lg font-bold text-emerald-600">
            <CountUp value={overall} suffix="%" />
          </span>
          </div>

          <div className="mt-2.5 h-2.5 overflow-hidden rounded-full bg-slate-100">
            <motion.div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-green-600"
                initial={{ width: 0 }}
                animate={{ width: `${overall}%` }}
                transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
        </motion.div>

        {/* Tree Journey */}
        <motion.section
            variants={fadeUp}
            className="relative overflow-hidden rounded-[34px] border border-emerald-100 bg-gradient-to-b from-[#f7fff8] to-[#eef8ee] p-5 shadow-[0_18px_45px_rgba(15,118,110,0.08)]"
        >
          <div className="absolute -right-12 top-8 h-40 w-40 rounded-full bg-emerald-200/30 blur-3xl" />
          <div className="absolute -left-12 bottom-10 h-40 w-40 rounded-full bg-lime-200/40 blur-3xl" />

          <div className="relative mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-[#10251d]">Cây hành trình</p>
              <p className="text-xs font-medium text-[#73847c]">
                Mỗi nhiệm vụ hoàn thành giúp cây lớn thêm
              </p>
            </div>

            <div className="rounded-full bg-white px-3 py-1.5 text-sm font-bold text-emerald-700 shadow-sm">
              <CountUp value={overall} suffix="%" />
            </div>
          </div>

          <div className="relative mx-auto h-[430px] max-w-[360px]">
            {/* Ground shadow */}
            <div className="absolute bottom-5 left-1/2 h-8 w-56 -translate-x-1/2 rounded-[100%] bg-emerald-900/10 blur-sm" />

            <svg
                viewBox="0 0 360 430"
                fill="none"
                className="absolute inset-0 h-full w-full"
            >
              {/* Soil */}
              <path
                  d="M92 384 C128 360 234 360 270 384"
                  stroke="#8B5E34"
                  strokeWidth="12"
                  strokeLinecap="round"
                  opacity="0.35"
              />

              {/* Trunk */}
              <motion.path
                  d="M180 365 C176 315 183 270 176 225 C171 190 150 165 153 128"
                  stroke="#8B5E34"
                  strokeWidth="18"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{
                    pathLength: overall > 0 ? Math.min(1, overall / 45) : 0,
                  }}
                  transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              />

              {/* Left branch */}
              <motion.path
                  d="M176 235 C138 220 118 190 102 158"
                  stroke="#8B5E34"
                  strokeWidth="10"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: overall >= 25 ? 1 : 0 }}
                  transition={{ duration: 1.1, delay: 0.2 }}
              />

              {/* Right branch */}
              <motion.path
                  d="M178 205 C220 190 242 160 258 124"
                  stroke="#8B5E34"
                  strokeWidth="10"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: overall >= 45 ? 1 : 0 }}
                  transition={{ duration: 1.1, delay: 0.35 }}
              />

              {/* Top branch */}
              <motion.path
                  d="M158 145 C175 112 193 88 214 62"
                  stroke="#8B5E34"
                  strokeWidth="8"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: overall >= 65 ? 1 : 0 }}
                  transition={{ duration: 1.1, delay: 0.5 }}
              />
            </svg>

            {/* Empty state */}
            {level === 'empty' && (
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="absolute bottom-[52px] left-1/2 -translate-x-1/2 rounded-full bg-amber-200 px-4 py-2 text-sm font-bold text-amber-900 shadow-sm"
                >
                  Hạt giống đang chờ bạn
                </motion.div>
            )}

            {/* Leaves */}
            {[
              { left: '24%', top: '34%', show: overall >= 15 },
              { left: '32%', top: '45%', show: overall >= 25 },
              { left: '64%', top: '32%', show: overall >= 35 },
              { left: '70%', top: '24%', show: overall >= 45 },
              { left: '46%', top: '22%', show: overall >= 55 },
              { left: '56%', top: '16%', show: overall >= 65 },
              { left: '38%', top: '28%', show: overall >= 75 },
              { left: '58%', top: '38%', show: overall >= 85 },
            ].map((leaf, index) =>
                leaf.show ? (
                    <motion.div
                        key={index}
                        initial={{ scale: 0, rotate: -20, opacity: 0 }}
                        animate={{
                          scale: 1,
                          rotate: index % 2 ? 12 : -12,
                          opacity: 1,
                        }}
                        transition={{
                          type: 'spring',
                          stiffness: 180,
                          damping: 14,
                          delay: 0.08 * index,
                        }}
                        className="absolute flex h-12 w-12 items-center justify-center rounded-[60%_40%_60%_40%] bg-emerald-500 text-white shadow-[0_8px_18px_rgba(16,185,129,0.24)]"
                        style={{ left: leaf.left, top: leaf.top }}
                    >
                      <Leaf className="h-6 w-6" />
                    </motion.div>
                ) : null
            )}

            {/* Flowers */}
            {[
              { left: '43%', top: '12%', show: overall >= 75 },
              { left: '69%', top: '18%', show: overall >= 90 },
              { left: '28%', top: '27%', show: overall >= 100 },
            ].map((flower, index) =>
                flower.show ? (
                    <motion.div
                        key={index}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{
                          type: 'spring',
                          stiffness: 200,
                          damping: 12,
                          delay: 0.2 + index * 0.12,
                        }}
                        className="absolute flex h-11 w-11 items-center justify-center rounded-full bg-amber-100 text-amber-600 shadow-[0_8px_18px_rgba(245,158,11,0.22)]"
                        style={{ left: flower.left, top: flower.top }}
                    >
                      <Flower2 className="h-6 w-6" />
                    </motion.div>
                ) : null
            )}

            {/* Status card */}
            <motion.div
                initial={{ y: 12, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="absolute bottom-0 left-1/2 w-[88%] -translate-x-1/2 rounded-[24px] border border-emerald-100 bg-white/90 p-4 shadow-[0_12px_28px_rgba(15,118,110,0.08)] backdrop-blur"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-[#10251d]">
                    {completedLeaves} dấu mốc đã phát triển
                  </p>
                  <p className="text-xs font-medium text-[#73847c]">
                    Dựa trên tập luyện, ăn uống và thử thách
                  </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                  <Leaf className="h-5 w-5" />
                </div>
              </div>

              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-emerald-100">
                <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-green-600"
                    initial={{ width: 0 }}
                    animate={{ width: `${overall}%` }}
                    transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                />
              </div>
            </motion.div>
          </div>
        </motion.section>

        {/* Growth Sources */}
        <motion.section variants={fadeUp} className="grid grid-cols-3 gap-3">
          <div className="rounded-[22px] border border-slate-100 bg-white p-3 shadow-[0_10px_24px_rgba(30,64,175,0.05)]">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <Dumbbell className="h-5 w-5" />
            </div>

            <p className="mt-2 text-sm font-bold text-[#10251d]">Tập luyện</p>
            <p className="mt-0.5 text-[11px] font-medium text-[#7a86a8]">
              Thêm thân cây
            </p>
          </div>

          <div className="rounded-[22px] border border-slate-100 bg-white p-3 shadow-[0_10px_24px_rgba(30,64,175,0.05)]">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-lime-50 text-lime-700">
              <Utensils className="h-5 w-5" />
            </div>

            <p className="mt-2 text-sm font-bold text-[#10251d]">Ăn uống</p>
            <p className="mt-0.5 text-[11px] font-medium text-[#7a86a8]">
              Thêm lá mới
            </p>
          </div>

          <div className="rounded-[22px] border border-slate-100 bg-white p-3 shadow-[0_10px_24px_rgba(30,64,175,0.05)]">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
              <Trophy className="h-5 w-5" />
            </div>

            <p className="mt-2 text-sm font-bold text-[#10251d]">Thử thách</p>
            <p className="mt-0.5 text-[11px] font-medium text-[#7a86a8]">
              Mở hoa
            </p>
          </div>
        </motion.section>

        {/* Stage Detail */}
        <motion.div variants={fadeUp} className="space-y-3">
          {STAGES.map((stage, i) => {
            const status = stageStatus(i, overall);
            const Icon = status === 'locked' ? Lock : STAGE_ICONS[i];

            return (
                <div
                    key={stage.title}
                    className={[
                      'flex items-start gap-3 rounded-[24px] border p-4 transition',
                      status === 'current'
                          ? 'border-emerald-200 bg-emerald-50/70 shadow-[0_12px_28px_rgba(16,185,129,0.12)]'
                          : 'border-slate-100 bg-white shadow-[0_10px_24px_rgba(30,64,175,0.04)]',
                      status === 'locked' ? 'opacity-70' : '',
                    ].join(' ')}
                >
              <span
                  className={[
                    'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl',
                    status === 'done'
                        ? 'bg-emerald-600 text-white'
                        : status === 'current'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-400',
                  ].join(' ')}
              >
                <Icon className="h-5 w-5" />
              </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p
                          className={[
                            'text-[15px] font-bold',
                            status === 'locked' ? 'text-slate-400' : 'text-[#10251d]',
                          ].join(' ')}
                      >
                        Chặng {i + 1}: {stage.title}
                      </p>

                      <span
                          className={[
                            'shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
                            status === 'done'
                                ? 'bg-emerald-100 text-emerald-700'
                                : status === 'current'
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-slate-100 text-slate-500',
                          ].join(' ')}
                      >
                    {status === 'done'
                        ? 'Đã nở'
                        : status === 'current'
                            ? 'Đang lớn'
                            : 'Chưa mở'}
                  </span>
                    </div>

                    <p className="mt-1 text-[13px] leading-relaxed text-[#556082]">
                      {stage.desc}
                    </p>

                    <p className="mt-2 flex items-center gap-1.5 text-[12px] font-medium text-[#7a86a8]">
                      <Gift className="h-3.5 w-3.5 text-emerald-500" />
                      Phần thưởng: {stage.reward}
                    </p>
                  </div>
                </div>
            );
          })}
        </motion.div>

        {/* CTA */}
        <motion.button
            variants={fadeUp}
            onClick={() => navigate('/dashboard/workout')}
            className="flex w-full items-center justify-center gap-2 rounded-[24px] bg-gradient-to-r from-emerald-500 to-green-600 py-4 text-[15px] font-bold text-white shadow-[0_16px_32px_rgba(16,185,129,0.3)] active:scale-[0.99]"
        >
          <Flame className="h-5 w-5" />

          {currentStageIdx >= 0
              ? `Tiếp tục chăm cây ở chặng ${currentStageIdx + 1}`
              : 'Gieo mầm hành trình'}
        </motion.button>
      </motion.div>
  );
}