// Challenge Service - Java Backend API
import { apiClient } from './apiClient';
import { API_ENDPOINTS } from '../config/api';
import type { ApiResponse } from '../types';

export interface Challenge {
  id: number;
  title: string;
  description: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  exerciseType: string;
  minReps: number;
  maxReps: number;
  reward: string;
  status: 'ACTIVE' | 'INACTIVE';
  linkVideos: string;
  // Additional fields for UI
  goal?: string;
  duration?: string;
  participants?: number;
  rewardPoints?: number;
  prizeUsd?: number;
  imageUrl?: string;
  exercise?: string;
  passingScore?: number;
  joined?: boolean;
  submitted?: boolean;
  userScore?: number;
  endsAt?: string;
}

export interface UserChallenge {
  id: number;
  challengeId: number;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'DISPUTED';
  score: number | null;
  confidence: number | null;
  submittedAt: string | null;
  completedAt: string | null;
  videoUrl: string | null;
}

export interface ChallengeSubmitRequest {
  challengeId: number;
  videoUrl?: string;
  keypointsPayload?: string;
}

class ChallengeService {
  // Get all challenges
  async getAll(): Promise<ApiResponse<Challenge[]>> {
    const response = await apiClient.get<any>('/challenges');
    
    if (response.success && response.data) {
      const challenges = response.data.data || response.data;
      return {
        success: true,
        data: challenges.map((challenge: any) => ({
          id: challenge.challengeId,
          title: challenge.title,
          description: challenge.description,
          difficulty: challenge.difficulty,
          exerciseType: challenge.exerciseType,
          minReps: challenge.minReps,
          maxReps: challenge.maxReps,
          reward: challenge.reward,
          status: challenge.status,
          linkVideos: challenge.linkVideos,
          // UI fields
          goal: challenge.goal || 'muscle',
          duration: challenge.duration || '1 week',
          participants: challenge.participants || 0,
          rewardPoints: challenge.rewardPoints || 0,
          prizeUsd: challenge.prizeUsd,
          imageUrl: challenge.imageUrl,
          exercise: challenge.exercise || challenge.exerciseType,
          passingScore: challenge.passingScore || 85,
          joined: false,
          submitted: false,
          userScore: 0,
          endsAt: challenge.endsAt,
        }))
      };
    }
    
    return {
      success: false,
      error: response.error || { code: 'FETCH_ERROR', message: 'Failed to load challenges', timestamp: new Date().toISOString() }
    };
  }

  // Get challenge by ID
  async getById(id: number): Promise<ApiResponse<Challenge | null>> {
    const response = await apiClient.get<any>(`/challenges/${id}`);
    
    if (response.success && response.data) {
      const challenge = response.data.data || response.data;
      return {
        success: true,
        data: {
          id: challenge.challengeId,
          title: challenge.title,
          description: challenge.description,
          difficulty: challenge.difficulty,
          exerciseType: challenge.exerciseType,
          minReps: challenge.minReps,
          maxReps: challenge.maxReps,
          reward: challenge.reward,
          status: challenge.status,
          linkVideos: challenge.linkVideos,
          goal: challenge.goal || 'muscle',
          duration: challenge.duration || '1 week',
          participants: challenge.participants || 0,
          rewardPoints: challenge.rewardPoints || 0,
          prizeUsd: challenge.prizeUsd,
          imageUrl: challenge.imageUrl,
          exercise: challenge.exercise || challenge.exerciseType,
          passingScore: challenge.passingScore || 85,
          joined: false,
          submitted: false,
          userScore: 0,
          endsAt: challenge.endsAt,
        }
      };
    }
    
    return {
      success: false,
      error: response.error || { code: 'FETCH_ERROR', message: 'Failed to load challenge', timestamp: new Date().toISOString() }
    };
  }

  // Submit challenge attempt
  async submit(data: ChallengeSubmitRequest): Promise<ApiResponse<UserChallenge>> {
    return await apiClient.post<UserChallenge>('/challenges/submit', data);
  }

  // Upload video for challenge
  async uploadVideo(challengeId: number, file: File): Promise<ApiResponse<{ videoUrl: string }>> {
    const formData = new FormData();
    formData.append('video', file);

    const response = await fetch(`${API_ENDPOINTS.CHALLENGES.UPLOAD(challengeId)}`, {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
      },
    });

    if (!response.ok) {
      return {
        success: false,
        error: {
          code: 'UPLOAD_ERROR',
          message: 'Failed to upload video',
          timestamp: new Date().toISOString(),
        },
      };
    }

    const data = await response.json();
    return { success: true, data };
  }
}

export const challengeService = new ChallengeService();
