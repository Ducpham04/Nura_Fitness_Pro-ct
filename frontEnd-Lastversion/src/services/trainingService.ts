// Training Service - Java Backend API
import { apiClient } from './apiClient';
import { API_ENDPOINTS } from '../config/api';
import type { ApiResponse } from '../types';

export interface TrainingPlan {
  id: number;
  title: string;
  description: string;
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  durationDays: number;
  status: 'ACTIVE' | 'INACTIVE';
  goal?: string;
  workoutsPerWeek?: number;
  rating?: number;
  reviews?: number;
  imageUrl?: string;
  features?: string[];
  started?: boolean;
  progress?: number;
}

export interface PersonalizedWorkoutExercise {
  id: number;
  userId: number;
  dayNumber: number;
  exerciseId: number;
  exerciseName: string;
  sets: number;
  reps: number;
  restTime?: number;
  difficulty?: string;
  targetMuscle?: string;
  videoUrl?: string;
  estimatedCalories?: number;
}

export interface UserTraining {
  id: number;
  trainingPlanId: number;
  name?: string;
  startDate?: string;
  endDate?: string;
  completionPercentage?: number;
  status?: string;
}

export interface TrainingPlanDetail {
  id: number;
  dayNumber: number;
  sets: number;
  reps: number;
  restTime?: number;
  exerciseId: number;
  exerciseName: string;
  exerciseType: string;
  videoUrl?: string;
  challengeName?: string;
}

export interface DailyTrainingLog {
  id?: number;
  dtlId?: number;
  userId: number;
  trainingPlanId: number;
  dayNumber: number;
  exerciseId: number;
  exerciseName?: string;
  challengeTitle?: string;
  challengeName?: string;
  exerciseType?: string;
  videoUrl?: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED' | 'not_started' | 'in_progress' | 'completed' | 'skipped';
  repsCompleted: number;
  setsCompleted: number;
  targetReps?: number;
  targetSets?: number;
  score: number | null;
  confidence: number | null;
  caloriesBurned: number;
  fatigueLevel?: number;
  sleepHours?: number;
  trainingDate: string;
}

export interface SessionData {
  reps: number;
  formScore: number;
  caloriesBurned: number;
  avgRepTime: number;
}

class TrainingService {
  // Get all training plans
  async getTrainingPlans(filters?: {
    difficulty?: string;
    status?: string;
    goalId?: number;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<TrainingPlan[]>> {
    const params = new URLSearchParams();
    if (filters?.difficulty) params.append('difficulty', filters.difficulty);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.goalId) params.append('goalId', filters.goalId.toString());
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    
    const endpoint = `${API_ENDPOINTS.TRAINING.PLANS}?${params.toString()}`;
    const response = await apiClient.get<any>(endpoint);
    
    if (response.success && response.data) {
      // BE returns paginated response with content field
      const plans = response.data.content || response.data;
      return {
        success: true,
        data: plans.map((plan: any) => ({
          id: plan.tpId,
          title: plan.title,
          description: plan.description,
          difficulty: plan.difficulty,
          durationDays: plan.durationDays,
          status: plan.status,
          goal: plan.goal?.title,
          workoutsPerWeek: plan.workoutsPerWeek,
          rating: plan.rating,
          reviews: plan.reviewCount,
          imageUrl: plan.imageUrl,
          features: plan.features || [],
          started: false,
          progress: 0,
        }))
      };
    }
    
    return {
      success: false,
      error: response.error || { code: 'FETCH_ERROR', message: 'Failed to load training plans', timestamp: new Date().toISOString() }
    };
  }

  // Get user training
  async getUserTraining(userId: number): Promise<UserTraining[]> {
    const response = await apiClient.get<any>(API_ENDPOINTS.TRAINING.USER_TRAINING(userId));
    if (!response.success || !response.data) return [];
    const data = (response.data as any).data || response.data;
    if (!Array.isArray(data)) return [];
    return data.map((item: any) => ({
      id: item.id ?? item.utId,
      trainingPlanId: item.trainingPlanId ?? item.trainingPlan?.tpId ?? item.trainingPlan?.id,
      name: item.name ?? item.trainingPlan?.title,
      startDate: item.startDate,
      endDate: item.endDate,
      completionPercentage: item.completionPercentage,
      status: item.status ?? item.Status,
    }));
  }

  // Get daily logs
  async getDailyLogs(userId: number): Promise<DailyTrainingLog[]> {
    const response = await apiClient.get<DailyTrainingLog[]>(API_ENDPOINTS.TRAINING.LOG(userId));
    return response.success ? response.data || [] : [];
  }

  async getDailyLogsByPlan(planId: number): Promise<DailyTrainingLog[]> {
    const response = await apiClient.get<any>(API_ENDPOINTS.TRAINING.DAILY_LOGS_BY_PLAN(planId));
    if (!response.success || !response.data) return [];
    const data = (response.data as any).data || response.data;
    return Array.isArray(data) ? data : [];
  }

  async getTodayPersonalizedWorkout(dayNumber: number): Promise<PersonalizedWorkoutExercise[]> {
    const params = new URLSearchParams();
    params.append('dayNumber', dayNumber.toString());
    const response = await apiClient.get<any>(`${API_ENDPOINTS.TRAINING.PERSONALIZED_TODAY}?${params.toString()}`);
    if (!response.success || !response.data) return [];
    const data = (response.data as any).data || response.data;
    return Array.isArray(data) ? data : [];
  }

  async startTrainingPlan(planId: number, startDate = new Date().toISOString().split('T')[0]): Promise<ApiResponse<any>> {
    return await apiClient.post<any>(
      `${API_ENDPOINTS.TRAINING.PLANS}/${planId}/start`,
      { startDate }
    );
  }

  // Save training log
  async saveTrainingLog(userId: number, options: {
    trainingPlanId: number;
    dayNumber: number;
    exerciseId: number;
    challengeId?: number;
    status: string;
    analysisData?: {
      repsCompleted?: number;
      setsCompleted?: number;
      score?: number;
      confidence?: number;
      actualDurationMinutes?: number;
      caloriesBurned?: number;
      fatigueLevel?: number;
      sleepHours?: number;
    }
  }): Promise<ApiResponse<any>> {
    const exerciseId = options.exerciseId ?? options.challengeId;
    if (!exerciseId) {
      return {
        success: false,
        error: {
          code: 'MISSING_EXERCISE_ID',
          message: 'Exercise ID is required to save a training log',
          timestamp: new Date().toISOString(),
        },
      };
    }

    const params = new URLSearchParams();
    params.append('trainingPlanId', options.trainingPlanId.toString());
    params.append('dayNumber', options.dayNumber.toString());
    // BE still accepts this legacy query name, but the value is an exercise_id.
    params.append('challengeId', exerciseId.toString());
    params.append('status', options.status);
    
    return await apiClient.post<any>(
      `${API_ENDPOINTS.TRAINING.DAILY_LOGS_SAVE}?${params.toString()}`,
      options.analysisData || {},
      { headers: { 'userId': userId.toString() } }
    );
  }

  // Generate AI Workout Plan
  async generateAIWorkoutPlan(userId: number, options: { 
    days: number; 
    equipment: string[]; 
    intensity: string;
    duration: number;
    preferences: string[];
  }): Promise<ApiResponse<any>> {
    return await apiClient.post<any>(
      `${API_ENDPOINTS.AI.GENERATE_WORKOUT}`,
      options,
      { headers: { 'userId': userId.toString() } }
    );
  }
}

export const trainingService = new TrainingService();
