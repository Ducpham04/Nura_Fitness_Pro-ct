// Single source of truth cho "hành trình 4 chặng" — dùng chung HomePage + JourneyPage
// để tiến độ/tên chặng không bao giờ lệch nhau giữa 2 màn.

export type StageStatus = 'done' | 'current' | 'locked';

export interface StageMeta {
  title: string;
  weeks: string;
  desc: string;
  reward: string;
}

export const STAGES: StageMeta[] = [
  { title: 'Làm quen', weeks: 'Tuần 1–2', desc: 'Làm quen động tác & tạo thói quen mỗi ngày.', reward: 'Huy hiệu Người mới' },
  { title: 'Giữ nhịp', weeks: 'Tuần 3–4', desc: 'Tập đều đặn, tăng dần cường độ.',             reward: '+50 credit AI' },
  { title: 'Ổn định',  weeks: 'Tuần 5–6', desc: 'Duy trì phong độ, đẩy hiệu suất.',            reward: 'Huy hiệu Chiến binh' },
  { title: 'Về đích',  weeks: 'Tuần 7–8', desc: 'Về đích & giữ vững thành quả.',                reward: 'Cúp vàng hành trình' },
];

export function clampPct(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

export function stageStatus(index: number, progress: number): StageStatus {
  const start = index * 25;
  const end = (index + 1) * 25;
  if (progress >= end) return 'done';
  if (progress >= start) return 'current';
  return 'locked';
}

// Tiến độ tổng (THẬT): ưu tiên % kế hoạch đang chạy, fallback theo buổi tập tuần.
export function journeyProgress(stats?: {
  activePlanProgress?: number;
  workoutsThisWeek?: number;
  workoutsWeeklyGoal?: number;
}): number {
  const plan = stats?.activePlanProgress || 0;
  if (plan > 0) return clampPct(Math.round(plan));
  const week =
    stats && stats.workoutsWeeklyGoal && stats.workoutsWeeklyGoal > 0
      ? ((stats.workoutsThisWeek || 0) / stats.workoutsWeeklyGoal) * 100
      : 0;
  return clampPct(Math.round(week));
}

// Chỉ số chặng đang ở (0-based). -1 nếu đã hoàn thành toàn bộ.
export function currentStageIndex(progress: number): number {
  if (progress >= 100) return -1;
  const idx = STAGES.findIndex((_, i) => stageStatus(i, progress) === 'current');
  return idx >= 0 ? idx : 0;
}
