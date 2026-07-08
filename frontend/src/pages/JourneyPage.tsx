import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Flame,
  Gift,
  Leaf,
  Lock,
  Sparkles,
  Star,
  Trophy,
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
          className="mx-auto w-full max-w-3xl space-y-5 px-3 pb-28 pt-3 text-white sm:px-0 sm:pt-0"
      >
        {/* Hero */}
        <motion.section
            variants={fadeUp}
            className="relative overflow-hidden rounded-3xl border border-white/[0.14] bg-[linear-gradient(135deg,#24282f_0%,#14171d_52%,#0b0d11_100%)] p-5 shadow-[0_18px_44px_rgba(0,0,0,0.28)]"
        >
          <div className="absolute -right-10 -top-12 h-44 w-44 rounded-full bg-orange-300/15 blur-3xl" />
          <div className="absolute -bottom-14 -left-10 h-48 w-48 rounded-full bg-lime/10 blur-3xl" />
          <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/35 to-transparent" />

          <div className="relative">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-orange-100">
                  <Sparkles className="h-3.5 w-3.5" />
                  Hành trình của {name}
                </p>
                <h1 className="mt-3 font-grotesk text-[30px] font-bold uppercase italic leading-[0.92] tracking-tight text-white">
                  Mỗi ngày thêm một bước
                </h1>
                <p className="mt-3 max-w-[320px] text-sm font-medium leading-relaxed text-neutral-200">
                  Tập một bài, ghi một bữa, hoàn thành một thử thách. Viway gom tất cả thành tiến bộ nhìn thấy được.
                </p>
              </div>

              <div className="rounded-2xl border border-lime/25 bg-lime text-right text-black px-3 py-2 shadow-[0_10px_24px_rgba(204,255,0,0.18)]">
                <p className="text-[11px] font-bold text-black/65">Cấp độ</p>
                <p className="font-grotesk text-xl font-bold">
                  {summary.level}
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/[0.13] bg-white/[0.12] p-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-neutral-200">
                  <Flame className="h-4 w-4 text-amber-500" />
                  Streak
                </div>
                <p className="mt-1 font-grotesk text-xl font-bold text-white">
                  {summary.streakDays} ngày
                </p>
              </div>

              <div className="rounded-2xl border border-white/[0.13] bg-white/[0.12] p-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-neutral-200">
                  <Star className="h-4 w-4 text-amber-500" />
                  XP
                </div>
                <p className="mt-1 font-grotesk text-xl font-bold text-white">
                  {summary.currentExp}/{summary.nextLevelExp}
                </p>
              </div>
            </div>

            <div className="mt-4">
              <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-neutral-200">
                <span>Tiến độ cấp độ</span>
                <span className="text-lime">{Math.round(expPct)}%</span>
              </div>

              <div className="h-2.5 overflow-hidden rounded-full bg-white/12">
                <motion.div
                    className="h-full rounded-full bg-lime"
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
            className="flex items-center gap-3 rounded-3xl border border-white/[0.14] bg-white/[0.09] px-4 py-3 shadow-[0_14px_34px_rgba(0,0,0,0.18)]"
        >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-orange-200/20 bg-orange-300/12">
          <Sparkles className="h-5 w-5 text-orange-200" />
        </span>

          <p className="text-sm font-medium leading-relaxed text-neutral-100">
            {encourage(overall, name)}
          </p>
        </motion.div>

        {/* Progress Summary */}
        <motion.div
            variants={fadeUp}
            className="rounded-3xl border border-white/[0.14] bg-white/[0.09] p-4"
        >
          <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-neutral-100">
            Tiến độ hành trình
          </span>

            <span className="font-grotesk text-lg font-bold text-lime">
            <CountUp value={overall} suffix="%" />
          </span>
          </div>

          <div className="mt-2.5 h-2.5 overflow-hidden rounded-full bg-white/12">
            <motion.div
                className="h-full rounded-full bg-gradient-to-r from-orange-300 via-lime to-emerald-300"
                initial={{ width: 0 }}
                animate={{ width: `${overall}%` }}
                transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
        </motion.div>

        <motion.section variants={fadeUp} className="grid grid-cols-2 gap-3">
          <button
              type="button"
              onClick={() => navigate('/dashboard/workout')}
              className="rounded-3xl border border-orange-200/25 bg-orange-300/[0.10] p-4 text-left transition hover:bg-orange-300/[0.14]"
          >
            <CalendarDays className="h-5 w-5 text-orange-200" />
            <p className="mt-3 text-sm font-bold text-white">Tập hôm nay</p>
            <p className="mt-1 text-xs leading-relaxed text-neutral-300">Hoàn thành một bài để tăng tiến độ.</p>
          </button>

          <button
              type="button"
              onClick={() => navigate('/dashboard/diet')}
              className="rounded-3xl border border-emerald-300/25 bg-emerald-300/[0.10] p-4 text-left transition hover:bg-emerald-300/[0.14]"
          >
            <CheckCircle2 className="h-5 w-5 text-emerald-200" />
            <p className="mt-3 text-sm font-bold text-white">Ghi bữa ăn</p>
            <p className="mt-1 text-xs leading-relaxed text-neutral-300">Đánh dấu bữa đã ăn để giữ nhịp.</p>
          </button>
        </motion.section>

        {/* Tree Journey */}
        <motion.section
            variants={fadeUp}
            className="relative overflow-hidden rounded-3xl border border-white/[0.14] bg-[linear-gradient(180deg,rgba(255,255,255,0.10)_0%,rgba(255,255,255,0.055)_100%)] p-5 shadow-[0_18px_44px_rgba(0,0,0,0.24)]"
        >
          <div className="absolute -right-12 top-8 h-40 w-40 rounded-full bg-orange-300/12 blur-3xl" />
          <div className="absolute -left-12 bottom-10 h-40 w-40 rounded-full bg-lime/10 blur-3xl" />

          <div className="relative mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-white">Cây hành trình</p>
              <p className="text-xs font-medium text-neutral-300">
                Mỗi nhiệm vụ hoàn thành giúp cây lớn thêm
              </p>
            </div>

            <div className="rounded-full border border-lime/25 bg-lime px-3 py-1.5 text-sm font-bold text-black">
              <CountUp value={overall} suffix="%" />
            </div>
          </div>

          <div className="relative mx-auto h-[390px] max-w-[360px]">
            {/* Ground shadow */}
            <div className="absolute bottom-5 left-1/2 h-8 w-56 -translate-x-1/2 rounded-[100%] bg-black/35 blur-sm" />

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
                  opacity="0.55"
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
                        className="absolute flex h-12 w-12 items-center justify-center rounded-[60%_40%_60%_40%] bg-emerald-400 text-[#052015] shadow-[0_8px_18px_rgba(16,185,129,0.20)]"
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
                        className="absolute flex h-11 w-11 items-center justify-center rounded-full bg-orange-200 text-orange-900 shadow-[0_8px_18px_rgba(245,158,11,0.18)]"
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
                className="absolute bottom-0 left-1/2 w-[88%] -translate-x-1/2 rounded-3xl border border-white/[0.16] bg-[#171b20]/92 p-4 shadow-[0_12px_28px_rgba(0,0,0,0.22)] backdrop-blur"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-white">
                    {completedLeaves} dấu mốc đã phát triển
                  </p>
                  <p className="text-xs font-medium text-neutral-300">
                    Dựa trên tập luyện, ăn uống và thử thách
                  </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-300/20 bg-emerald-300/12 text-emerald-200">
                  <Leaf className="h-5 w-5" />
                </div>
              </div>

              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/12">
                <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-orange-300 via-lime to-emerald-300"
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
          <div className="rounded-3xl border border-white/[0.13] bg-white/[0.09] p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-orange-200/20 bg-orange-300/12 text-orange-200">
              <Dumbbell className="h-5 w-5" />
            </div>

            <p className="mt-2 text-sm font-bold text-white">Tập luyện</p>
            <p className="mt-0.5 text-[11px] font-medium text-neutral-300">
              Thêm thân cây
            </p>
          </div>

          <div className="rounded-3xl border border-white/[0.13] bg-white/[0.09] p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-300/20 bg-emerald-300/12 text-emerald-200">
              <Utensils className="h-5 w-5" />
            </div>

            <p className="mt-2 text-sm font-bold text-white">Ăn uống</p>
            <p className="mt-0.5 text-[11px] font-medium text-neutral-300">
              Thêm lá mới
            </p>
          </div>

          <div className="rounded-3xl border border-white/[0.13] bg-white/[0.09] p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-lime/20 bg-lime/10 text-lime">
              <Trophy className="h-5 w-5" />
            </div>

            <p className="mt-2 text-sm font-bold text-white">Thử thách</p>
            <p className="mt-0.5 text-[11px] font-medium text-neutral-300">
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
                          ? 'border-orange-200/30 bg-orange-300/[0.10]'
                          : 'border-white/[0.13] bg-white/[0.08]',
                      status === 'locked' ? 'opacity-65' : '',
                    ].join(' ')}
                >
              <span
                  className={[
                    'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl',
                    status === 'done'
                        ? 'bg-emerald-300/18 text-emerald-200 border border-emerald-300/25'
                        : status === 'current'
                            ? 'bg-orange-300/15 text-orange-100 border border-orange-200/25'
                            : 'bg-white/[0.08] text-neutral-400 border border-white/[0.1]',
                  ].join(' ')}
              >
                <Icon className="h-5 w-5" />
              </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p
                          className={[
                            'text-[15px] font-bold',
                            status === 'locked' ? 'text-neutral-500' : 'text-white',
                          ].join(' ')}
                      >
                        Chặng {i + 1}: {stage.title}
                      </p>

                      <span
                          className={[
                            'shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
                            status === 'done'
                                ? 'bg-emerald-300/15 text-emerald-200'
                                : status === 'current'
                                    ? 'bg-orange-300/15 text-orange-100'
                                    : 'bg-white/[0.08] text-neutral-400',
                          ].join(' ')}
                      >
                    {status === 'done'
                        ? 'Đã nở'
                        : status === 'current'
                            ? 'Đang lớn'
                            : 'Chưa mở'}
                  </span>
                    </div>

                    <p className="mt-1 text-[13px] leading-relaxed text-neutral-300">
                      {stage.desc}
                    </p>

                    <p className="mt-2 flex items-center gap-1.5 text-[12px] font-medium text-neutral-300">
                      <Gift className="h-3.5 w-3.5 text-lime" />
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
            className="btn-lime flex w-full items-center justify-center gap-2 rounded-3xl py-4 text-[15px] font-bold active:scale-[0.99]"
        >
          <Flame className="h-5 w-5" />

          {currentStageIdx >= 0
              ? `Tiếp tục chăm cây ở chặng ${currentStageIdx + 1}`
              : 'Gieo mầm hành trình'}
          <ArrowRight className="h-4 w-4" />
        </motion.button>
      </motion.div>
  );
}
