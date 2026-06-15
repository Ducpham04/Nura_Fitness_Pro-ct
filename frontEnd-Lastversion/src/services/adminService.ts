import { API_CONFIG } from '../config/api';
import { apiClient } from './apiClient';
import type { ApiResponse } from '../types';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export type AdminModuleKey =
  | 'users'
  | 'goals'
  | 'challenges'
  | 'exercises'
  | 'trainingPlans'
  | 'trainingDetails'
  | 'foods'
  | 'dishes'
  | 'rewards'
  | 'transactions'
  | 'informationBody'
  | 'challengeSubmissions'
  | 'rewardRedemptions'
  | 'userChallenges'
  | 'leaderboard';

export interface AdminModuleConfig {
  key: AdminModuleKey;
  label: string;
  endpoint: string;
  idField: string;
  createMode: 'json' | 'goalMultipart' | 'challengeMultipart' | 'rewardMultipart';
  fields: AdminFieldConfig[];
  /** Cột hiển thị cố định trên table (nếu không khai báo sẽ auto-pick) */
  tableColumns?: string[];
}

export interface AdminFieldConfig {
  name: string;
  label: string;
  type?: 'text' | 'number' | 'password' | 'select' | 'textarea' | 'boolean' | 'image-upload';
  options?: string[];
  required?: boolean;
  /** Gợi ý/giải thích hiển thị dưới ô nhập — giúp admin hiểu cần điền gì. */
  hint?: string;
  /** Nhãn tiếng Việt cho từng option enum (theo thứ tự options). */
  optionLabels?: string[];
  /** Load options từ API: endpoint + field lấy label + field lấy value */
  remoteOptions?: { endpoint: string; labelField: string; valueField: string };
}

export interface AdminDashboardStats {
  userStats?: unknown;
  challengeStats?: unknown;
  trainingStats?: unknown;
  nutritionStats?: unknown;
  rewardStats?: unknown;
}

export interface SeederResult {
  usersCreated?: number;
  challengesCreated?: number;
  trainingPlansCreated?: number;
  healthProfilesCreated?: number;
  dailyLogsCreated?: number;
  userChallengesCreated?: number;
  rewardsCreated?: number;
  exercisesCreated?: number;
  foodsCreated?: number;
  totalRecords?: number;
  count?: number;
  [key: string]: unknown;
}

export interface ExerciseMetadataIssue {
  exerciseId: number;
  exerciseName?: string;
  status?: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE' | string;
  qualityScore: number;
  missingFields: string[];
  invalidFields: string[];
  warnings: string[];
  impact: string;
}

export interface ExerciseSessionReadiness {
  push: number;
  pull: number;
  legs: number;
  core: number;
  cardio: number;
  mobility: number;
  minUpperPush: number;
  minUpperPull: number;
  minLower: number;
  minCore: number;
  minCardio: number;
  fullBodyReady: boolean;
  upperPushReady: boolean;
  upperPullReady: boolean;
  lowerReady: boolean;
  cardioCoreReady: boolean;
  generationReady: boolean;
}

export interface ExerciseMetadataAuditReport {
  totalExercises: number;
  activeExercises: number;
  validExercises: number;
  invalidExercises: number;
  qualityScore: number;
  generationReady: boolean;
  generationReadiness: Record<string, number>;
  forceTypeCoverage: Record<string, number>;
  equipmentCoverage: Record<string, number>;
  primaryMuscleCoverage: Record<string, number>;
  severityCounts: Record<string, number>;
  missingFieldCounts: Record<string, number>;
  invalidFieldCounts: Record<string, number>;
  warningCounts: Record<string, number>;
  sessionReadiness: ExerciseSessionReadiness;
  recommendations: string[];
  issues: ExerciseMetadataIssue[];
}

const API_ROOT = `${API_CONFIG.BASE_URL}${API_CONFIG.API_PREFIX}`;

function authHeaders(extra?: Record<string, string>) {
  const token = localStorage.getItem('accessToken');
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(extra || {}),
  };
}

async function requestRaw<T>(endpoint: string, method: HttpMethod, body?: BodyInit): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_ROOT}${endpoint}`, {
      method,
      body,
      headers: authHeaders(),
      credentials: 'include',
    });
    const contentType = response.headers.get('content-type');
    const payload = contentType?.includes('application/json') ? await response.json() : undefined;
    if (!response.ok) {
      return {
        success: false,
        error: {
          code: `HTTP_${response.status}`,
          message: payload?.message || payload?.error || response.statusText,
          timestamp: new Date().toISOString(),
        },
      };
    }
    return { success: true, data: payload };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Network error occurred',
        timestamp: new Date().toISOString(),
      },
    };
  }
}

function unwrapList(payload: any): any[] {
  const data = payload?.data ?? payload;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(payload?.content)) return payload.content;
  return [];
}

function unwrapObject(payload: any): any {
  return payload?.data ?? payload;
}

/**
 * Backend trả NotificationResponse `{ success, message, data }` với HTTP 200 ngay cả khi
 * thao tác thất bại về mặt nghiệp vụ. apiClient chỉ check HTTP status nên cần kiểm tra
 * thêm field `success` trong body để phát hiện lỗi thực sự.
 */
function normalizeResponse(response: any): { success: boolean; data?: any; error?: { message: string } } {
  // Lỗi tầng HTTP/network
  if (!response.success) {
    return { success: false, error: { message: response.error?.message || 'Thao tác thất bại' } };
  }
  const body = response.data;
  // NotificationResponse body có field success === false → lỗi nghiệp vụ
  if (body && typeof body === 'object' && body.success === false) {
    return { success: false, error: { message: body.message || 'Thao tác thất bại' } };
  }
  return { success: true, data: body };
}

function toFormData(
  mode: AdminModuleConfig['createMode'],
  payload: Record<string, any>,
  files?: Record<string, File>,
): FormData {
  // Loại bỏ blob: URL khỏi payload — đó chỉ là preview tạm, ảnh thật đi qua file part
  const clean = { ...payload };
  for (const k of Object.keys(clean)) {
    if (typeof clean[k] === 'string' && clean[k].startsWith('blob:')) {
      delete clean[k];
    }
  }

  const formData = new FormData();
  if (mode === 'goalMultipart' || mode === 'challengeMultipart') {
    formData.append('data', JSON.stringify(clean));
    // Goals & Challenges: file field name is 'image'
    if (files?.imageLink) formData.append('image', files.imageLink);
    if (files?.imageUrl) formData.append('image', files.imageUrl);
  } else if (mode === 'rewardMultipart') {
    formData.append('reward', JSON.stringify(clean));
    // Reward: backend dùng field name 'file' cho ảnh
    if (files?.linkImage) formData.append('file', files.linkImage);
  }
  return formData;
}

function normalizeAdminPayload(module: AdminModuleConfig, payload: Record<string, any>): Record<string, any> {
  if (module.key !== 'challenges') return payload;

  return {
    ...payload,
    durationDays: payload.durationDays === '' || payload.durationDays == null ? undefined : Number(payload.durationDays),
    rewardPoints: payload.rewardPoints === '' || payload.rewardPoints == null ? undefined : Number(payload.rewardPoints),
    exerciseIds: typeof payload.exerciseIds === 'string'
      ? payload.exerciseIds
          .split(',')
          .map((id: string) => Number(id.trim()))
          .filter((id: number) => Number.isFinite(id) && id > 0)
      : Array.isArray(payload.exerciseIds) ? payload.exerciseIds : [],
  };
}

export const adminModules: AdminModuleConfig[] = [
  {
    key: 'users',
    label: 'Tài khoản',
    endpoint: '/admin/users',
    idField: 'id',
    createMode: 'json',
    tableColumns: ['id', 'fullName', 'email', 'role', 'status', 'createdAt'],
    fields: [
      { name: 'fullName',  label: 'Họ và tên',  required: true },
      { name: 'email',     label: 'Email',       required: true },
      { name: 'password',  label: 'Mật khẩu',   type: 'password', required: true },
      { name: 'roleId',    label: 'Vai trò', type: 'select',
        remoteOptions: { endpoint: '/auth/roles', labelField: 'roleName', valueField: 'id' } },
    ],
  },
  {
    key: 'goals',
    label: 'Mục tiêu',
    endpoint: '/admin/goals',
    idField: 'id',
    createMode: 'goalMultipart',
    tableColumns: ['id', 'name', 'imageLink'],
    fields: [
      { name: 'name',        label: 'Tên mục tiêu',  required: true },
      { name: 'description', label: 'Mô tả',         type: 'textarea' },
      { name: 'imageLink',   label: 'Ảnh đại diện',  type: 'image-upload' },
    ],
  },
  {
    key: 'challenges',
    label: 'Thử thách',
    endpoint: '/admin/challenges',
    idField: 'id',
    createMode: 'challengeMultipart',
    tableColumns: ['id', 'title', 'status', 'durationDays', 'rewardPoints', 'participants'],
    fields: [
      { name: 'goalId',       label: 'Mục tiêu', type: 'select',
        remoteOptions: { endpoint: '/admin/goals', labelField: 'name', valueField: 'id' } },
      { name: 'title',        label: 'Tiêu đề',  required: true },
      { name: 'imageUrl',     label: 'Ảnh bìa',  type: 'image-upload' },
      { name: 'description',  label: 'Mô tả',    type: 'textarea' },
      { name: 'durationDays', label: 'Số ngày',  type: 'number', required: true },
      { name: 'rewardPoints', label: 'Điểm thưởng', type: 'number', required: true },
      { name: 'reward',       label: 'Nhãn thưởng', hint: 'Mô tả ngắn phần thưởng, vd: "Huy hiệu Vàng".' },
      { name: 'aiRulesJson',  label: 'Quy tắc AI (JSON)', type: 'textarea', hint: 'Để trống nếu không dùng. Định dạng JSON cho chấm điểm tự động.' },
      { name: 'exerciseIds',  label: 'Danh sách bài tập', hint: 'Nhập ID các bài tập, phân cách bằng dấu phẩy. Vd: 1,5,12' },
      { name: 'status',       label: 'Trạng thái', type: 'select',
        options: ['ACTIVE', 'INACTIVE', 'DRAFT', 'COMPLETED'],
        optionLabels: ['Đang chạy', 'Tạm tắt', 'Bản nháp', 'Đã kết thúc'] },
    ],
  },
  {
    key: 'exercises',
    label: 'Bài tập',
    endpoint: '/admin/exercises',
    idField: 'id',
    createMode: 'json',
    tableColumns: ['id', 'exerciseName', 'forceType', 'exerciseCategory', 'primaryMuscle', 'metValue', 'status', 'videoUrl', 'imageUrl'],
    fields: [
      { name: 'exerciseName',          label: 'Tên bài tập (EN)',       required: true },
      { name: 'exerciseNameVi',         label: 'Tên bài tập (VI)' },
      { name: 'description',            label: 'Mô tả',                  type: 'textarea' },
      { name: 'difficultyLevel',        label: 'Độ khó',                 type: 'select', options: ['EASY', 'MEDIUM', 'HARD'] },
      { name: 'exerciseType',           label: 'Loại bài tập' },
      { name: 'exerciseCategory',       label: 'Nhóm bài tập',           type: 'select', options: ['COMPOUND', 'ISOLATION', 'MOBILITY'] },
      { name: 'primaryMuscle',          label: 'Nhóm cơ chính' },
      { name: 'secondaryMuscles',       label: 'Nhóm cơ phụ', hint: 'Phân cách bằng dấu phẩy, vd: Triceps, Shoulders' },
      { name: 'requiredEquipment',      label: 'Dụng cụ cần thiết',      type: 'select', options: ['BODYWEIGHT', 'DUMBBELL', 'BARBELL', 'RESISTANCE_BAND', 'MACHINE', 'CABLE'] },
      { name: 'equipmentAlternatives',  label: 'Dụng cụ thay thế',       type: 'textarea' },
      { name: 'contraindicatedInjuries', label: 'Chấn thương chống chỉ định', type: 'textarea' },
      { name: 'movementPattern',        label: 'Kiểu chuyển động' },
      { name: 'forceType',              label: 'Hướng lực',              type: 'select', options: ['PUSH', 'PULL', 'LEGS', 'CORE', 'CARDIO', 'MOBILITY'] },
      { name: 'defaultSets',            label: 'Số hiệp mặc định',       type: 'number' },
      { name: 'defaultReps',            label: 'Số lần mặc định',        type: 'number' },
      { name: 'defaultRestSeconds',     label: 'Thời gian nghỉ (giây)',  type: 'number' },
      { name: 'metValue',               label: 'MET chuẩn',              type: 'number', hint: 'Hệ số tiêu hao năng lượng để tính kcal (vd: nhẹ 3.0, nặng 8.0)' },
      { name: 'estimatedMet',           label: 'MET ước tính',           type: 'number' },
      { name: 'tempo',                  label: 'Tempo' },
      { name: 'rpeMin',                 label: 'RPE thấp nhất',          type: 'number' },
      { name: 'rpeMax',                 label: 'RPE cao nhất',           type: 'number' },
      { name: 'videoUrl',               label: 'Đường dẫn video' },
      { name: 'imageUrl',               label: 'Ảnh minh hoạ',  type: 'image-upload' },
      { name: 'status',                 label: 'Trạng thái',             type: 'select', options: ['ACTIVE', 'INACTIVE'] },
      { name: 'spinalLoading',          label: 'Tải trọng cột sống',     type: 'boolean' },
      { name: 'kneeDominant',           label: 'Bài tập đầu gối',        type: 'boolean' },
      { name: 'shoulderOverhead',       label: 'Tay qua đầu',            type: 'boolean' },
      { name: 'highImpact',             label: 'Va đập cao',             type: 'boolean' },
      { name: 'wristLoading',           label: 'Tải cổ tay',             type: 'boolean' },
      { name: 'suitableForSenior',      label: 'Phù hợp người cao tuổi', type: 'boolean' },
      { name: 'suitableForOverweight',  label: 'Phù hợp thừa cân',       type: 'boolean' },
      { name: 'isBilateral',            label: 'Song phương',            type: 'boolean' },
    ],
  },
  {
    key: 'trainingPlans',
    label: 'Kế hoạch tập luyện',
    endpoint: '/admin/training-plans',
    idField: 'tpId',
    createMode: 'json',
    tableColumns: ['tpId', 'title', 'difficultyLevel', 'goalName', 'durationWeeks'],
    fields: [
      { name: 'goalId',          label: 'Mục tiêu', type: 'select',
        remoteOptions: { endpoint: '/admin/goals', labelField: 'name', valueField: 'id' } },
      { name: 'title',           label: 'Tiêu đề kế hoạch', required: true },
      { name: 'description',     label: 'Mô tả',             type: 'textarea' },
      { name: 'difficultyLevel', label: 'Độ khó' },
      { name: 'durationWeeks',   label: 'Số tuần',           type: 'number' },
    ],
  },
  {
    key: 'trainingDetails',
    label: 'Lịch tập chi tiết',
    endpoint: '/admin/training-plan-details',
    idField: 'tpdId',
    createMode: 'json',
    tableColumns: ['tpdId', 'trainingPlanTitle', 'dayNumber', 'exerciseName', 'exerciseType', 'sets', 'reps', 'restTime', 'videoUrl'],
    fields: [
      { name: 'trainingPlanId', label: 'Kế hoạch tập', type: 'select', required: true,
        remoteOptions: { endpoint: '/admin/training-plans', labelField: 'title', valueField: 'tpId' } },
      { name: 'dayNumber',      label: 'Ngày thứ',        type: 'number', required: true },
      { name: 'exerciseId',     label: 'Bài tập',         type: 'select', required: true,
        remoteOptions: { endpoint: '/admin/exercises', labelField: 'exerciseName', valueField: 'id' } },
      { name: 'sets',           label: 'Số hiệp',         type: 'number' },
      { name: 'reps',           label: 'Số lần',          type: 'number' },
      { name: 'duration',       label: 'Thời gian (giây)', type: 'number' },
      { name: 'restTime',       label: 'Nghỉ (giây)',     type: 'number' },
      { name: 'instructions',   label: 'Hướng dẫn',       type: 'textarea' },
    ],
  },
  {
    key: 'foods',
    label: 'Thực phẩm',
    endpoint: '/admin/foods',
    idField: 'id',
    createMode: 'json',
    tableColumns: ['id', 'name', 'calories', 'protein', 'carbs', 'fat'],
    fields: [
      { name: 'name',     label: 'Tên thực phẩm',       required: true },
      { name: 'calories', label: 'Calo / 100g',          type: 'number' },
      { name: 'protein',  label: 'Đạm (g) / 100g',      type: 'number' },
      { name: 'carbs',    label: 'Tinh bột (g) / 100g',  type: 'number' },
      { name: 'fat',      label: 'Chất béo (g) / 100g',  type: 'number' },
      { name: 'notes',    label: 'Ghi chú',              type: 'textarea' },
    ],
  },
  {
    key: 'dishes',
    label: 'Món ăn',
    endpoint: '/admin/dishes',
    idField: 'dishId',
    createMode: 'json',
    tableColumns: ['dishId', 'dishName', 'dishRole', 'suitableMealTypes', 'isActive', 'imageUrl'],
    fields: [
      { name: 'dishName',         label: 'Tên món ăn',   required: true },
      { name: 'imageUrl',         label: 'Ảnh món ăn',   type: 'image-upload' },
      { name: 'dishRole',         label: 'Vai trò món',  type: 'select', required: true,
        options: ['MAIN_PROTEIN', 'SOUP', 'VEGETABLE', 'CARB_BASE', 'ONE_POT'],
        optionLabels: ['Món đạm chính', 'Canh/Súp', 'Rau', 'Tinh bột nền', 'Món một nồi'] },
      { name: 'suitableMealTypes', label: 'Bữa phù hợp', hint: 'Phân cách bằng dấu phẩy. Vd: BREAKFAST,LUNCH,DINNER' },
      { name: 'isActive',         label: 'Đang hoạt động', type: 'boolean' },
    ],
  },
  {
    key: 'rewards',
    label: 'Phần thưởng',
    endpoint: '/admin/rewards',
    idField: 'id',
    createMode: 'rewardMultipart',
    tableColumns: ['id', 'name', 'points', 'total', 'status', 'externalPartner', 'linkImage'],
    fields: [
      { name: 'name',            label: 'Tên phần thưởng', required: true },
      { name: 'description',     label: 'Mô tả',           type: 'textarea' },
      { name: 'points',          label: 'Điểm cần đổi',    type: 'number' },
      { name: 'total',           label: 'Số lượng tồn kho', type: 'number' },
      { name: 'status',          label: 'Trạng thái' },
      { name: 'linkImage',       label: 'Ảnh phần thưởng', type: 'image-upload' },
      { name: 'externalPartner', label: 'Đối tác' },
    ],
  },
  {
    key: 'transactions',
    label: 'Giao dịch điểm',
    endpoint: '/transactions',
    idField: 'id',
    createMode: 'json',
    tableColumns: ['id', 'userId', 'type', 'points', 'amount', 'status', 'createdAt'],
    fields: [
      { name: 'userId',      label: 'Người dùng', type: 'select', required: true,
        remoteOptions: { endpoint: '/admin/users?page=0&limit=500', labelField: 'fullName', valueField: 'id' } },
      { name: 'type',        label: 'Loại giao dịch', type: 'select', required: true,
        options: ['EARN', 'SPEND', 'REDEEM', 'REFUND', 'ADJUST'] },
      { name: 'amount',      label: 'Số tiền',         type: 'number' },
      { name: 'points',      label: 'Điểm',            type: 'number' },
      { name: 'reference',   label: 'Mã tham chiếu' },
      { name: 'status',      label: 'Trạng thái',      type: 'select',
        options: ['PENDING', 'COMPLETED', 'FAILED', 'CANCELLED'] },
      { name: 'description', label: 'Ghi chú',         type: 'textarea' },
    ],
  },
  {
    key: 'challengeSubmissions',
    label: 'Bài nộp thử thách',
    endpoint: '/admin/challenges/submissions',
    idField: 'ucId',
    createMode: 'json',
    tableColumns: ['ucId', 'userFullName', 'userEmail', 'challengeTitle', 'status', 'score', 'submittedAt'],
    fields: [
      { name: 'userId',      label: 'Người dùng (ID)', type: 'number', required: true },
      { name: 'challengeId', label: 'Thử thách (ID)',  type: 'number', required: true },
      { name: 'status',      label: 'Trạng thái',      type: 'select',
        options: ['PENDING', 'SUCCESS', 'FAILED', 'DISPUTED'] },
    ],
  },
  {
    key: 'rewardRedemptions',
    label: 'Đổi thưởng',
    endpoint: '/reward-redemptions',
    idField: 'redemptionId',
    createMode: 'json',
    tableColumns: ['redemptionId', 'userId', 'rewardId', 'status', 'createdAt'],
    fields: [
      { name: 'userId',   label: 'Người dùng (ID)',  type: 'number', required: true },
      { name: 'rewardId', label: 'Phần thưởng (ID)', type: 'number', required: true },
    ],
  },
  {
    key: 'informationBody',
    label: 'Hồ sơ thể chất',
    endpoint: '/admin/information-body',
    idField: 'infoId',
    createMode: 'json',
    tableColumns: ['infoId', 'userId', 'userName', 'heightCm', 'weightKg', 'age', 'gender', 'bmi'],
    fields: [
      { name: 'userId',     label: 'Người dùng', type: 'select', required: true,
        remoteOptions: { endpoint: '/admin/users?page=0&limit=500', labelField: 'fullName', valueField: 'id' } },
      { name: 'heightCm',   label: 'Chiều cao (cm)', type: 'number', required: true },
      { name: 'weightKg',   label: 'Cân nặng (kg)',  type: 'number', required: true },
      { name: 'age',        label: 'Tuổi',           type: 'number', required: true },
      { name: 'gender',     label: 'Giới tính',      type: 'select', required: true,
        options: ['Nam', 'Nữ', 'Khác'] },
      { name: 'bodyFatPct', label: 'Tỷ lệ mỡ (%)',  type: 'number' },
      { name: 'bmi',        label: 'Chỉ số BMI',     type: 'number' },
      { name: 'goalId',     label: 'Mục tiêu (tuỳ chọn)', type: 'select',
        remoteOptions: { endpoint: '/admin/goals', labelField: 'name', valueField: 'id' } },
    ],
  },
  {
    key: 'userChallenges',
    label: 'Tham gia thử thách',
    endpoint: '/admin/user-challenges',
    idField: 'ucId',
    createMode: 'json',
    tableColumns: ['ucId', 'userId', 'challengeId', 'status', 'submittedAt'],
    fields: [
      { name: 'userId',      label: 'Người dùng (ID)', type: 'number', required: true },
      { name: 'challengeId', label: 'Thử thách (ID)',  type: 'number', required: true },
      { name: 'status',      label: 'Trạng thái',      type: 'select',
        options: ['PENDING', 'SUCCESS', 'FAILED', 'DISPUTED'] },
    ],
  },
  {
    key: 'leaderboard',
    label: 'Leaderboard',
    endpoint: '/leaderboard',
    idField: 'userId',
    createMode: 'json',
    tableColumns: ['rank', 'userId', 'userName', 'fullName', 'points', 'completedChallenges'],
    fields: [],
  },
];

export const adminService = {
  async getDashboard(): Promise<AdminDashboardStats> {
    const [userStats, challengeStats, trainingStats, nutritionStats, rewardStats] = await Promise.all([
      apiClient.get('/admin/dashboard/user-stats'),
      apiClient.get('/admin/dashboard/challenge-stats'),
      apiClient.get('/admin/dashboard/training-stats'),
      apiClient.get('/admin/dashboard/nutrition-stats'),
      apiClient.get('/admin/dashboard/reward-stats'),
    ]);

    return {
      userStats: unwrapObject(userStats.data),
      challengeStats: unwrapObject(challengeStats.data),
      trainingStats: unwrapObject(trainingStats.data),
      nutritionStats: unwrapObject(nutritionStats.data),
      rewardStats: unwrapObject(rewardStats.data),
    };
  },

  async list(module: AdminModuleConfig): Promise<any[]> {
    let endpoint = module.endpoint;
    if (module.key === 'foods') endpoint = '/foods';
    if (module.key === 'leaderboard') endpoint = '/leaderboard?limit=100';
    if (module.key === 'users') endpoint = '/admin/users?page=0&limit=500';
    const response = await apiClient.get(endpoint);
    if (!response.success) throw new Error(response.error?.message || `Failed to load ${module.label}`);
    return unwrapList(response.data);
  },

  /** Upload 1 file ảnh qua /files/upload-image, trả về URL tương đối */
  async uploadImage(file: File): Promise<string> {
    const fd = new FormData();
    fd.append('file', file);
    const res = await requestRaw('/files/upload-image', 'POST', fd);
    const norm = normalizeResponse(res);
    if (!norm.success) throw new Error(norm.error?.message || 'Upload ảnh thất bại');
    // Backend trả URL dạng chuỗi hoặc object { url }
    return typeof norm.data === 'string' ? norm.data : (norm.data as any)?.url ?? (norm.data as any)?.filePath ?? String(norm.data);
  },

  /** Với module JSON có file đính kèm → upload ảnh trước, thay blob URL bằng URL thật */
  async resolveImageFiles(payload: Record<string, any>, files?: Record<string, File>): Promise<Record<string, any>> {
    if (!files || Object.keys(files).length === 0) return payload;
    const resolved = { ...payload };
    for (const [fieldName, file] of Object.entries(files)) {
      const url = await adminService.uploadImage(file);
      resolved[fieldName] = url;
    }
    return resolved;
  },

  async create(module: AdminModuleConfig, payload: Record<string, any>, files?: Record<string, File>) {
    const normalizedPayload = normalizeAdminPayload(module, payload);
    if (module.createMode === 'json') {
      const finalPayload = await adminService.resolveImageFiles(normalizedPayload, files);
      return normalizeResponse(await apiClient.post(module.endpoint, finalPayload));
    }
    return normalizeResponse(await requestRaw(module.endpoint, 'POST', toFormData(module.createMode, normalizedPayload, files)));
  },

  async update(module: AdminModuleConfig, id: string | number, payload: Record<string, any>, files?: Record<string, File>) {
    const normalizedPayload = normalizeAdminPayload(module, payload);
    if (module.createMode === 'json') {
      const finalPayload = await adminService.resolveImageFiles(normalizedPayload, files);
      return normalizeResponse(await apiClient.put(`${module.endpoint}/${id}`, finalPayload));
    }
    return normalizeResponse(await requestRaw(`${module.endpoint}/${id}`, 'PUT', toFormData(module.createMode, normalizedPayload, files)));
  },

  async remove(module: AdminModuleConfig, id: string | number) {
    return normalizeResponse(await apiClient.delete(`${module.endpoint}/${id}`));
  },

  async auditExerciseMetadata(): Promise<ExerciseMetadataAuditReport> {
    const response = await apiClient.get('/admin/exercises/audit');
    if (!response.success) throw new Error(response.error?.message || 'Failed to audit exercise metadata');

    const body: any = response.data;
    if (body?.success === false) {
      throw new Error(body.message || 'Exercise metadata audit failed');
    }
    return unwrapObject(body) as ExerciseMetadataAuditReport;
  },

  async listDishIngredients(dishId: string | number) {
    const response = await apiClient.get(`/admin/dishes/${dishId}/ingredients`);
    if (!response.success) throw new Error(response.error?.message || 'Failed to load ingredients');
    return unwrapList(response.data);
  },

  async addDishIngredient(dishId: string | number, payload: { foodId: number; isCoreIngredient: boolean }) {
    return normalizeResponse(await apiClient.post(`/admin/dishes/${dishId}/ingredients`, payload));
  },

  async updateDishIngredient(ingredientId: string | number, payload: { foodId?: number; isCoreIngredient?: boolean }) {
    return normalizeResponse(await apiClient.put(`/admin/dishes/ingredients/${ingredientId}`, payload));
  },

  async deleteDishIngredient(ingredientId: string | number) {
    return normalizeResponse(await apiClient.delete(`/admin/dishes/ingredients/${ingredientId}`));
  },

  async updateRedemptionStatus(redemptionId: string | number, status: string) {
    return requestRaw(`/reward-redemptions/${redemptionId}/status?status=${encodeURIComponent(status)}`, 'PUT');
  },

  async updateUserChallengeStatus(ucId: string | number, status: string) {
    return requestRaw(`/admin/user-challenges/${ucId}/feedback?status=${encodeURIComponent(status)}`, 'PUT');
  },

  async seedData(action: string): Promise<{ success: boolean; data?: SeederResult; message?: string }> {
    const response = await requestRaw<{ data: SeederResult; message: string }>(`/admin/data-seeder/${action}`, 'POST');
    if (!response.success) return { success: false, message: response.error?.message };
    const payload = response.data as any;
    return { success: true, data: payload?.data ?? payload, message: payload?.message };
  },
};
