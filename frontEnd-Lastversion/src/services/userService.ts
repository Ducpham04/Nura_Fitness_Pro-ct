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
  };
  todayWorkouts: WorkoutItem[];
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


  postBodyProfile = async (bodyProfile: UserBodyProfile): Promise<UserBodyProfile | null> => {
    const response = await apiClient.post<UserBodyProfile>(API_ENDPOINTS.USER.BODY_PROFILE, bodyProfile);
    return response.success ? response.data || null : null;
  };

  getBodyProfile = async (): Promise<UserBodyProfile | null> => {
    const response = await apiClient.get<UserBodyProfile>(API_ENDPOINTS.USER.BODY_PROFILE);
    return response.success ? response.data || null : null;
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
            stats: data.stats,
            todayWorkouts: (Array.isArray(data.todayWorkouts) ? data.todayWorkouts : []).map((w: any) => ({
              ...w
            })),
            recovery: data.recovery,
            budgetBreakdown: data.budgetBreakdown,
            aiSuggestion: data.aiSuggestion
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
}

export const userService = new UserService();
