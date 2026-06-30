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

  async logFoodNatural(userId: number, text: string, mealTime = 'OTHER'): Promise<ApiResponse<any>> {
    return await apiClient.post<any>(
      '/ai-plans/log-food-natural',
      { text, meal_time: mealTime },
      { headers: { 'userId': userId.toString() } }
    );
  }

  /** Gợi ý món nấu được từ nguyên liệu (vd: "mực, hành, cà chua"). */
  async suggestDishes(userId: number, ingredients: string, count = 4): Promise<ApiResponse<any>> {
    return await apiClient.post<any>(
      '/ai-plans/suggest-dishes',
      { ingredients, count },
      { headers: { 'userId': userId.toString() } }
    );
  }

  /** Gợi ý nên mua thêm gì dựa trên tủ lạnh + ngân sách. */
  async suggestShopping(userId: number, inventory: string, budget = 0): Promise<ApiResponse<any>> {
    return await apiClient.post<any>(
      '/ai-plans/suggest-shopping',
      { inventory, budget, count: 6 },
      { headers: { 'userId': userId.toString() } }
    );
  }

  async autoRegulateWorkout(userId: number, utId: number): Promise<ApiResponse<any>> {
    return await apiClient.post<any>(
      '/ai-plans/auto-regulate',
      { utId },
      { headers: { 'userId': userId.toString() } }
    );
  }
}

export const aiService = new AIService();
