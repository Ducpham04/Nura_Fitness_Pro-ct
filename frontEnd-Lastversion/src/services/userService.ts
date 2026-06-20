// User Service - Java Backend API
import { apiClient } from './apiClient';
import { API_ENDPOINTS } from '../config/api';
import type { ApiResponse } from '../types';

export interface UserStats {
  totalWorkouts: number;
  completedChallenges: number;
  currentStreak: number;
  totalPoints: number;
  caloriesBurned: number;
  caloriesConsumed: number;
  dailyBudget: number;
  spentToday: number;
}
export interface UserBodyProfile {
  height: number;
  weight: number;
  bodyFat: number;
  muscleMass: number;
  age: number;
  gender: string;
  experienceLevel: string;
  goal: string;
  injuryNotes: string;
}

export interface BodyMetricPoint {
  weightKg?: number;
  bmi?: number;
  bodyFatPct?: number;
  recordedAt?: string;
}

export interface DashboardData {
  userSummary: {
    id: number;
    fullName: string;
    avatarUrl?: string;
    level: number;
    currentExp: number;
    nextLevelExp: number;
    streakDays: number;
  };
  stats: {
    caloriesConsumed: number;
    caloriesGoal: number;
    caloriesBurned: number;
    proteinConsumed: number;
    proteinGoal: number;
    carbsConsumed: number;
    carbsGoal: number;
    fatConsumed: number;
    fatGoal: number;
    waterConsumed: number;
    waterGoal: number;
    budgetRemaining: number;
    budgetLimit: number;
    // ── Mới ──
    completedWorkoutsToday: number;
    scheduledWorkoutsToday: number;
    workoutsThisWeek: number;
    workoutsWeeklyGoal: number;
    activePlanProgress: number;
  };
  todayWorkouts: WorkoutItem[];
  recentActivities: {
    type: string;
    title: string;
    value: string;
    date: string;
  }[];
  recovery: {
    sleepHours: number;
    sleepGoal: number;
    hrv: number;
    restingHR: number;
    energyLevel: number;
    recommendation: string;
  };
  budgetBreakdown: {
    category: string;
    amount: number;
    color: string;
  }[];
  aiSuggestion: string | null;
}

export interface WorkoutItem {
  id: number;
  name: string;
  sets: string;
  done: boolean;
  imageUrl?: string;
  muscle?: string;
  equipment?: string;
  estimatedCalories?: number;
}

// BE response shapes
interface FullProfileResponse {
  profile: {
    id: number;
    username: string;
    email: string;
    avatar?: string;
    joinDate: string;
    currentStreak: number;
  };
  stats: {
    aiScore: number;
    challengesCompleted: number;
    totalWorkouts: number;
    currentStreak: number;
  };
  activity: {
    totalCaloriesBurned: number;
    totalMinutes: number;
    favoriteWorkout: string;
  };
  weeklyStats?: {
    totalCaloriesBurned?: number;
    totalMinutes?: number;
  };
}

interface BudgetHistoryItem {
  btId: number;
  trackingDate: string;
  dailyBudget: number;
  totalSpent: number;
  weeklyBudget: number;
  weeklySpent: number;
  aiEstimatedCost: number;
  actualSpend: number;
}

interface TrainingLogItem {
  dtlId: number;
  trainingDate: string;
  dayNumber: number;
  status: string;
  exerciseId?: number;
  exerciseName?: string;
  exerciseType?: string;
  challengeName?: string;
  challengeTitle?: string;
  videoUrl?: string;
  targetSets?: number;
  targetReps?: number;
  actualDurationMinutes: number;
  caloriesBurned: number;
  setsCompleted: number;
  repsCompleted: number;
  score: number;
  challenge?: {
    id: number;
    title: string;
    exerciseType: string;
    minReps: number;
    maxReps: number;
  };
}

interface NotificationResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

function unwrapNotificationResponse<T>(response: ApiResponse<NotificationResponse<T>>): ApiResponse<T> {
  if (!response.success) {
    return {
      success: false,
      error: response.error,
      message: response.message,
    };
  }

  const payload = response.data;
  if (!payload || typeof payload.success !== 'boolean') {
    return { success: true, data: payload as T };
  }

  if (!payload.success) {
    return {
      success: false,
      message: payload.message,
      error: {
        code: 'BACKEND_ERROR',
        message: payload.message || 'Request failed',
        timestamp: new Date().toISOString(),
      },
    };
  }

  return {
    success: true,
    data: payload.data,
    message: payload.message,
  };
}

class UserService {
  // Get full profile from BE
  async getFullProfile(userId: number): Promise<FullProfileResponse | null> {
    const response = await apiClient.get<FullProfileResponse>(API_ENDPOINTS.USER.FULL_PROFILE(userId));
    return response.success ? response.data || null : null;
  }

  // Get all fitness goals from BE
  async getGoals(): Promise<ApiResponse<any>> {
    return await apiClient.get<any>('/goals');
  }

  // ── Tự quản lý tài khoản ──────────────────────────────────────────────────
  /** Đổi tên hiển thị / email. Trả { ok, message }. */
  updateMyProfile = async (payload: { fullName?: string; email?: string }): Promise<{ ok: boolean; message?: string }> => {
    const res = await apiClient.put<any>('/user/account/profile', payload);
    return { ok: res.success, message: res.success ? 'Cập nhật thành công' : res.error?.message };
  };

  /** Đổi mật khẩu — yêu cầu mật khẩu hiện tại. Trả { ok, message }. */
  changePassword = async (currentPassword: string, newPassword: string): Promise<{ ok: boolean; message?: string }> => {
    const res = await apiClient.put<any>('/user/account/password', { currentPassword, newPassword });
    const body = res.data as any;
    return { ok: res.success, message: res.success ? (body?.message || 'Đổi mật khẩu thành công') : res.error?.message };
  };

  /** Tự vô hiệu hoá tài khoản (xoá mềm). Trả { ok, message }. */
  deactivateMyAccount = async (): Promise<{ ok: boolean; message?: string }> => {
    const res = await apiClient.delete<any>('/user/account');
    const body = res.data as any;
    return { ok: res.success, message: res.success ? (body?.message || 'Đã vô hiệu hoá tài khoản') : res.error?.message };
  };


  postBodyProfile = async (bodyProfile: UserBodyProfile): Promise<UserBodyProfile | null> => {
    const response = await apiClient.post<UserBodyProfile>(API_ENDPOINTS.USER.BODY_PROFILE, bodyProfile);
    return response.success ? response.data || null : null;
  };

  getBodyProfile = async (): Promise<UserBodyProfile | null> => {
    const response = await apiClient.get<any>(API_ENDPOINTS.USER.BODY_PROFILE);
    if (!response.success) return null;
    const body = response.data as any;
    // Backend bọc trong NotificationResponse { success, message, data } → lấy inner data
    return (body?.data ?? body) || null;
  };

  postHealthProfile = async (healthProfile: any): Promise<any | null> => {
    const response = await apiClient.post<any>(API_ENDPOINTS.HEALTH.PROFILE, healthProfile);
    return response.success ? response.data || null : null;
  };

  getHealthProfile = async (): Promise<any | null> => {
    const response = await apiClient.get<any>(API_ENDPOINTS.HEALTH.PROFILE);
    return response.success ? response.data || null : null;
  };

  postBudgetTrack = async (userId: number, payload: { date: string; actualSpent: number; dailyBudget?: number; itemsJson?: string; notes?: string }): Promise<any | null> => {
    const response = await apiClient.post<any>(API_ENDPOINTS.BUDGET.TRACK(userId), payload);
    return response.success ? response.data || null : null;
  };

  updateBudgetLimit = async (_userId: number, limit: number): Promise<boolean> => {
    // Persist budget limit in the user's body profile
    const response = await apiClient.post<any>(API_ENDPOINTS.USER.BODY_PROFILE, { targetBudgetPerDay: limit });
    return response.success;
  };

  postInventoryAdd = async (userId: number, payload: { foodName: string; quantityGrams: number; unit: string; expiryDate?: string; foodId?: number }): Promise<any | null> => {
    const response = await apiClient.post<any>(`/inventory/${userId}/add`, payload);
    return response.success ? response.data || null : null;
  };

  postInventoryReplace = async (userId: number, items: { foodName: string; quantityGrams: number; unit: string; expiryDate?: string; foodId?: number }[]): Promise<any | null> => {
    const response = await apiClient.post<any>(`/inventory/${userId}/replace`, { items });
    return response.success ? response.data || null : null;
  };

  // Fetch today's budget data
  async getTodayBudget(userId: number): Promise<{ dailyBudget: number; spentToday: number } | null> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const startDate = today;
      const endDate = today;
      const response = await apiClient.get<BudgetHistoryItem[]>(
        `${API_ENDPOINTS.BUDGET.HISTORY(userId)}?startDate=${startDate}&endDate=${endDate}`
      );
      if (response.success && response.data && response.data.length > 0) {
        const todayBudget = response.data[0];
        return {
          dailyBudget: todayBudget.dailyBudget || todayBudget.aiEstimatedCost || 80000,
          spentToday: todayBudget.totalSpent || todayBudget.actualSpend || 0,
        };
      }
    } catch (e) {
      console.warn('[UserService] Budget fetch failed:', e);
    }
    return null;
  }

  // AI Generation
  async generateAiMealPlan(userId: number, request: any): Promise<ApiResponse<any>> {
    const response = await apiClient.post<NotificationResponse<any>>(API_ENDPOINTS.AI.GENERATE_MEAL, request, {
      headers: { 'userId': userId.toString() }
    });
    return unwrapNotificationResponse(response);
  }

  async generateAiWorkoutPlan(userId: number, request: any = {}): Promise<ApiResponse<any>> {
    const response = await apiClient.post<NotificationResponse<any>>(API_ENDPOINTS.AI.GENERATE_WORKOUT, request, {
      headers: { 'userId': userId.toString() }
    });
    return unwrapNotificationResponse(response);
  }

  // Fetch today's training logs  
  async getTodayWorkouts(userId: number): Promise<WorkoutItem[]> {
    try {
      // Try to get user's active training plan first
      const trainingResp = await apiClient.get<{ success?: boolean; data?: unknown[] }>(
        API_ENDPOINTS.TRAINING.USER_TRAINING(userId)
      );

      if (trainingResp.success && trainingResp.data) {
        // Find active user training
        const trainings = Array.isArray(trainingResp.data) ? trainingResp.data :
          (trainingResp.data as { data?: unknown[] })?.data || [];

        if (Array.isArray(trainings) && trainings.length > 0) {
          const activeTraining = trainings.find(
            (t: Record<string, unknown>) => t.status === 'ACTIVE' || t.status === 'active' || t.status === 'IN_PROGRESS'
          ) || trainings[0];

          const planId = (activeTraining as Record<string, unknown>).trainingPlanId ||
            ((activeTraining as Record<string, unknown>).trainingPlan as Record<string, unknown>)?.id;

          if (planId) {
            const logsResp = await apiClient.get<{ success?: boolean; data?: TrainingLogItem[] }>(
              API_ENDPOINTS.TRAINING.DAILY_LOGS_BY_PLAN(Number(planId))
            );

            if (logsResp.success && logsResp.data) {
              const logs: TrainingLogItem[] = Array.isArray(logsResp.data) ? logsResp.data :
                (logsResp.data as { data?: TrainingLogItem[] })?.data || [];

              // Filter for today or upcoming exercises
              const today = new Date().toISOString().split('T')[0];
              const todayLogs = logs.filter((l: TrainingLogItem) =>
                l.trainingDate === today || l.status === 'NOT_STARTED' || l.status === 'not_started' || l.status === 'IN_PROGRESS' || l.status === 'in_progress'
              ).slice(0, 6);

              if (todayLogs.length > 0) {
                return todayLogs.map((log: TrainingLogItem) => ({
                  id: log.dtlId,
                  name: log.exerciseName || log.challengeTitle || log.challengeName || log.challenge?.title || `Day ${log.dayNumber} Exercise`,
                  sets: log.setsCompleted
                    ? `${log.setsCompleted}x${log.repsCompleted || 0}`
                    : log.targetSets && log.targetReps
                      ? `${log.targetSets}x${log.targetReps}`
                      : `${log.challenge?.minReps || 10}-${log.challenge?.maxReps || 15} reps`,
                  done: log.status === 'COMPLETED' || log.status === 'completed',
                  imageUrl: log.videoUrl,
                }));
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn('[UserService] Training logs fetch failed:', e);
    }
    return [];
  }

  // Get full dashboard data - calls the specialized customer dashboard endpoint
  async getDashboardData(userId: number): Promise<ApiResponse<DashboardData>> {
    try {
      const response = await apiClient.get<any>(API_ENDPOINTS.USER.DASHBOARD(userId));
      
      if (response.success && response.data) {
        // Map the backend structure to our FE structure
        const data = response.data;
        return {
          success: true,
          data: {
            userSummary: data.user,
            stats: {
              caloriesConsumed: Number(data.stats?.caloriesConsumed ?? 0),
              caloriesGoal: Number(data.stats?.caloriesGoal ?? 2000),
              caloriesBurned: Number(data.stats?.caloriesBurned ?? 0),
              proteinConsumed: Number(data.stats?.proteinConsumed ?? 0),
              proteinGoal: Number(data.stats?.proteinGoal ?? 150),
              carbsConsumed: Number(data.stats?.carbsConsumed ?? 0),
              carbsGoal: Number(data.stats?.carbsGoal ?? 250),
              fatConsumed: Number(data.stats?.fatConsumed ?? 0),
              fatGoal: Number(data.stats?.fatGoal ?? 70),
              waterConsumed: Number(data.stats?.waterConsumed ?? 0),
              waterGoal: Number(data.stats?.waterGoal ?? 2.5),
              budgetRemaining: Number(data.stats?.budgetRemaining ?? 80000),
              budgetLimit: Number(data.stats?.budgetLimit ?? 80000),
              completedWorkoutsToday: Number(data.stats?.completedWorkoutsToday ?? 0),
              scheduledWorkoutsToday: Number(data.stats?.scheduledWorkoutsToday ?? 0),
              workoutsThisWeek: Number(data.stats?.workoutsThisWeek ?? 0),
              workoutsWeeklyGoal: Number(data.stats?.workoutsWeeklyGoal ?? 5),
              activePlanProgress: Number(data.stats?.activePlanProgress ?? 0),
            },
            todayWorkouts: (Array.isArray(data.todayWorkouts) ? data.todayWorkouts : []).map((w: any) => ({
              id: w.id,
              name: w.title || w.name || 'Bài tập',
              sets: w.sets || '—',
              done: w.isCompleted || w.done || false,
              imageUrl: w.imageUrl,
              muscle: w.muscle,
              equipment: w.equipment,
              estimatedCalories: w.estimatedCalories,
            })),
            recentActivities: Array.isArray(data.recentActivities) ? data.recentActivities : [],
            recovery: {
              // Không bịa số: backend trả null khi chưa có dữ liệu thật → 0/'' để UI hiện "—"
              sleepHours: Number(data.recovery?.sleepHours ?? 0),
              sleepGoal: Number(data.recovery?.sleepGoal ?? 8),
              hrv: data.recovery?.hrv ?? 0,
              restingHR: data.recovery?.restingHR ?? 0,
              energyLevel: data.recovery?.energyLevel ?? 0,
              recommendation: data.recovery?.recommendation ?? '',
            },
            budgetBreakdown: data.budgetBreakdown || [],
            aiSuggestion: data.aiSuggestion || null,
          }
        };
      }

      return {
        success: false,
        error: response.error || {
          code: 'FETCH_ERROR',
          message: 'Failed to load dashboard data',
          timestamp: new Date().toISOString(),
        }
      };
    } catch (err) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: err instanceof Error ? err.message : 'Failed to load dashboard',
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * Lịch sử chỉ số cơ thể (cân nặng, BMI, % mỡ) theo thời gian.
   * Dùng cho biểu đồ xu hướng trên Dashboard. Trả mảng rỗng nếu chưa có dữ liệu.
   */
  async getBodyMetricHistory(): Promise<BodyMetricPoint[]> {
    try {
      const res = await apiClient.get<any>(API_ENDPOINTS.HEALTH.BODY_METRIC);
      const raw = res.data;
      const list = Array.isArray(raw) ? raw : (raw?.data ?? raw?.content ?? []);
      if (!Array.isArray(list)) return [];
      return list
        .map((m: any): BodyMetricPoint => ({
          weightKg: m.weightKg != null ? Number(m.weightKg) : undefined,
          bmi: m.bmi != null ? Number(m.bmi) : undefined,
          bodyFatPct: m.bodyFatPct != null ? Number(m.bodyFatPct) : undefined,
          recordedAt: m.recordedAt || m.createdAt || '',
        }))
        .filter((m: BodyMetricPoint) => m.recordedAt && m.weightKg != null)
        .sort((a: BodyMetricPoint, b: BodyMetricPoint) =>
          (a.recordedAt || '').localeCompare(b.recordedAt || ''));
    } catch {
      return [];
    }
  }

  /**
   * Ghi 1 bản đo thể trạng mới (check-in). Backend tự tính BMI/BMR/TDEE và set recordedAt.
   * Chỉ `weightKg` là bắt buộc; chiều cao/tuổi/giới lấy từ hồ sơ.
   */
  async createBodyMetric(payload: {
    weightKg: number; bodyFatPct?: number; waistCm?: number; hipCm?: number; heightCm?: number;
  }): Promise<boolean> {
    try {
      const res = await apiClient.post<any>(API_ENDPOINTS.HEALTH.BODY_METRIC, payload);
      const body = res.data as any;
      return res.success && body?.success !== false;
    } catch {
      return false;
    }
  }
}

export const userService = new UserService();
