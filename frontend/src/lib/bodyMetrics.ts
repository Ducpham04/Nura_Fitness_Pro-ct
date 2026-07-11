// ── Phân tích thể trạng (BMI/BMR/TDEE/target/macro/timeline) ──────────────
// Công thức dùng CHUNG cho trang BodyAssessment (sau onboarding) và card
// "Phân tích thể trạng" trên Tổng quan — đảm bảo số liệu không lệch nhau.

export const ACTIVITY_FACTOR: Record<string, number> = {
  sedentary: 1.2, light: 1.375, moderate: 1.55, very: 1.725,
};

export interface BmiZone {
  max: number;
  label: string;
  hex: string;
  note: string;
}

export const BMI_ZONES: BmiZone[] = [
  { max: 18.5, label: 'Thiếu cân',    hex: '#60a5fa', note: 'Nên tăng cân lành mạnh — surplus calo nhẹ và tăng protein.' },
  { max: 23,   label: 'Bình thường',  hex: '#22c55e', note: 'Cân đối theo chuẩn WHO Á Đông — duy trì thói quen hiện tại.' },
  { max: 25,   label: 'Thừa cân nhẹ', hex: '#eab308', note: 'Hơi vượt ngưỡng Á Đông — siết nhẹ calo và tăng cardio.' },
  { max: 30,   label: 'Thừa cân',     hex: '#f97316', note: 'Tạo thâm hụt ~500 kcal/ngày và duy trì tập đều đặn.' },
  { max: 99,   label: 'Béo phì',      hex: '#ef4444', note: 'Ưu tiên giảm mỡ an toàn, tham khảo chuyên gia dinh dưỡng.' },
];

export function getBmiZone(bmi: number): BmiZone {
  return BMI_ZONES.find(z => bmi < z.max) ?? BMI_ZONES[BMI_ZONES.length - 1];
}

export type GoalDir = 'deficit' | 'surplus' | 'maintain';

export function resolveDir(goal: string): GoalDir {
  const g = (goal || '').toLowerCase();
  if (/giảm|lose|mỡ|fat|cut|weight_loss/.test(g)) return 'deficit';
  if (/tăng|gain|cơ|muscle|bulk|strength/.test(g)) return 'surplus';
  return 'maintain';
}

export interface BodyMetricsInput {
  weight?: number | string;
  height?: number | string;
  age?: number | string;
  gender?: string;
  goal?: string;
  activityLevel?: string;
}

export interface BodyMetrics {
  bmi: number;
  bmr: number;
  tdee: number;
  target: number;
  protG: number;
  fatG: number;
  carbG: number;
  bodyFat: number;
  idealMin: number;
  idealMax: number;
  waterL: string;
  timelineText: string;
  dir: GoalDir;
  dirLabel: string;
  goalShort: string;
  weight: number;
  zone: BmiZone;
}

/** Quy đổi số tuần sang chuỗi thân thiện (tránh hiển thị "231 tuần"). */
export function formatDurationWeeks(weeks: number): string {
  if (weeks <= 8) return `${weeks} tuần`;
  if (weeks <= 52) return `~${Math.round(weeks / 4.345)} tháng`;
  const years = weeks / 52;
  return years < 1.5 ? 'khoảng 1 năm' : `hơn ${Math.floor(years)} năm`;
}

/**
 * Tính toàn bộ chỉ số thể trạng từ hồ sơ.
 * - BMR: Mifflin–St Jeor. TDEE: BMR × hệ số vận động.
 * - target: TDEE −500 (giảm) / +300 (tăng) / +0 (duy trì).
 */
export function computeBodyMetrics(input: BodyMetricsInput): BodyMetrics {
  const weight = Number(input.weight) || 0;
  const height = Number(input.height) || 0;
  const age    = Number(input.age)    || 0;
  const isMale = (input.gender || '').toLowerCase() === 'male';
  const hM     = height / 100;

  const bmi  = hM > 0 ? weight / (hM * hM) : 0;
  const bmr  = 10 * weight + 6.25 * height - 5 * age + (isMale ? 5 : -161);
  const tdee = bmr * (ACTIVITY_FACTOR[input.activityLevel || 'moderate'] ?? 1.55);
  const dir  = resolveDir(input.goal || '');
  const delta  = dir === 'deficit' ? -500 : dir === 'surplus' ? 300 : 0;
  // Sàn calo an toàn (1200 nữ / 1500 nam) — không bao giờ kê thấp hơn,
  // kể cả deficit với người nhỏ con ít vận động (từng ra 889 kcal).
  const calorieFloor = isMale ? 1500 : 1200;
  const target = Math.max(calorieFloor, Math.round(tdee + delta));

  const protPerKg = dir === 'surplus' ? 2.2 : dir === 'deficit' ? 2.0 : 1.8;
  const protG = Math.round(weight * protPerKg);
  const fatCal = Math.round(target * 0.28);
  const fatG   = Math.round(fatCal / 9);
  const carbG  = Math.max(0, Math.round((target - protG * 4 - fatCal) / 4));

  const bodyFat = Math.round(Math.max(5, Math.min(50,
    1.2 * bmi + 0.23 * age - (isMale ? 16.2 : 5.4))));

  const idealMin = Math.round(18.5 * hM * hM * 10) / 10;
  const idealMax = Math.round(22.9 * hM * hM * 10) / 10;
  const waterL   = (weight * 33 / 1000).toFixed(1);

  let timelineText = '';
  if (dir === 'deficit') {
    const kgToLose = Math.max(0, Math.round((weight - idealMax) * 10) / 10);
    if (kgToLose <= 0) {
      timelineText = 'Bạn đã trong dải cân nặng lý tưởng — tập trung cải thiện vóc dáng!';
    } else {
      const weeks = Math.round(kgToLose / 0.45);
      // Không hiển thị con số "quá dài" gây nản — quy đổi thân thiện & neo vào mốc nhỏ.
      const horizon = weeks <= 40
        ? ` → đạt dải lý tưởng sau ${formatDurationWeeks(weeks)}`
        : ' — hãy chinh phục theo từng mốc nhỏ mỗi tháng';
      timelineText = `Giảm an toàn ~0.45 kg/tuần (~2 kg/tháng)${horizon}`;
    }
  } else if (dir === 'surplus') {
    timelineText = 'Tăng ~0.27 kg/tuần (chủ yếu là cơ, kết hợp tập tạ hiệu quả hơn)';
  } else {
    timelineText = 'Duy trì cân nặng — tập trung cải thiện thành phần cơ thể theo thời gian';
  }

  const dirLabel = dir === 'deficit' ? 'Giảm mỡ (−500 kcal/ngày)'
    : dir === 'surplus' ? 'Tăng cơ (+300 kcal/ngày)' : 'Duy trì cân nặng';
  const goalShort = dir === 'deficit' ? 'Giảm mỡ'
    : dir === 'surplus' ? 'Tăng cơ' : 'Duy trì';

  return {
    bmi, bmr: Math.round(bmr), tdee: Math.round(tdee), target,
    protG, fatG, carbG, bodyFat, idealMin, idealMax,
    waterL, timelineText, dir, dirLabel, goalShort, weight,
    zone: getBmiZone(bmi),
  };
}
