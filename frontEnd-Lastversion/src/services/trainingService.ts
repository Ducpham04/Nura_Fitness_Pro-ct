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

export interface TrainingPlanDetail {
  id: number;
  dayNumber: number;
  sets: number;
  reps: number;
  challenge: {
    id: number;
    title: string;
    exerciseType: string;
  };
}

export interface DailyTrainingLog {
  id: number;
  userId: number;
  trainingPlanId: number;
  dayNumber: number;
  challengeId: number;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';
  repsCompleted: number;
  setsCompleted: number;
  score: number | null;
  confidence: number | null;
  caloriesBurned: number;
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
          rating: plan.rating || 4.5,
          reviews: plan.reviewCount || 0,
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
  async getUserTraining(userId: number): Promise<any[]> {
    const response = await apiClient.get<any[]>(API_ENDPOINTS.TRAINING.USER_TRAINING(userId));
    return response.success ? response.data || [] : [];
  }

  // Get daily logs
  async getDailyLogs(userId: number): Promise<DailyTrainingLog[]> {
    const response = await apiClient.get<DailyTrainingLog[]>(API_ENDPOINTS.TRAINING.LOG(userId));
    return response.success ? response.data || [] : [];
  }

  // Save training log
  async saveTrainingLog(userId: number, options: {
    trainingPlanId: number;
    dayNumber: number;
    challengeId: number;
    status: string;
    analysisData?: {
      repsCompleted?: number;
      setsCompleted?: number;
      score?: number;
      confidence?: number;
      actualDurationMinutes?: number;
    }
  }): Promise<ApiResponse<any>> {
    const params = new URLSearchParams();
    params.append('trainingPlanId', options.trainingPlanId.toString());
    params.append('dayNumber', options.dayNumber.toString());
    params.append('challengeId', options.challengeId.toString());
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
