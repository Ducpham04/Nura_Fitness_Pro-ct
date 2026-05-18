import { apiClient } from './apiClient';
import type { ApiResponse } from '../types';

export interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
}

export interface ChatResponse {
  success: boolean;
  response: string;
  timestamp: string;
}

class AIService {
  async chat(userId: number, message: string, history: ChatMessage[] = []): Promise<ApiResponse<ChatResponse>> {
    return await apiClient.post<any>(
      '/ai-coach/chat',
      { message, history },
      { headers: { 'userId': userId.toString() } }
    );
  }

  async analyzePose(userId: number, media: File, exerciseType: string): Promise<ApiResponse<any>> {
    const formData = new FormData();
    formData.append('media', media);
    formData.append('exerciseType', exerciseType);
    
    return await apiClient.post<any>(
      '/ai-analysis/pose',
      formData,
      { headers: { 'userId': userId.toString() } }
    );
  }

  async scanFood(userId: number, image: File): Promise<ApiResponse<any>> {
    const formData = new FormData();
    formData.append('image', image);
    
    return await apiClient.post<any>(
      '/food-analysis/scan',
      formData,
      { headers: { 'userId': userId.toString() } }
    );
  }
}

export const aiService = new AIService();
