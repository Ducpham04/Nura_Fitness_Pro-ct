// Nutrition Service - Java Backend API
import { apiClient } from './apiClient';
import type { ApiResponse } from '../types';

export interface Meal {
  id: number;
  name: string;
  description?: string;
  ingredients?: MealIngredient[];
  protein: number;
  carbs: number;
  fat: number;
  calories: number;
  price: number;
  imageUrl?: string;
  category?: string;
  dayOfWeek?: string;
  isAvailable?: boolean;
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snacks';
  mealDetailId?: number;
  isEaten?: boolean;
  isInStock?: boolean;
}

export interface MealIngredient {
  id: number;
  foodId?: number;
  name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  price: number;
  fromInventory?: boolean;
}

export interface DailyNutritionPoint {
  date: string;      // YYYY-MM-DD
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface DailyMealPlan {
  day: number;
  dayName: string;
  date: string;
  totalCalories: number;
  totalPrice: number;
  budget: number;
  breakfast: Meal[];
  lunch: Meal[];
  dinner: Meal[];
  snacks: Meal[];
}

export interface WeeklyNutritionPlan {
  weeklyBudget: number;
  dailyBudget: number;
  dailyCalories: number;
  days: DailyMealPlan[];
  shoppingList: ShoppingItem[];
}

export interface ShoppingItem {
  id: number;
  name: string;
  quantity: string;
  unit: string;
  category: string;
  isChecked: boolean;
  daysNeeded: number[];
}

function unwrap<T>(response: ApiResponse<any>): ApiResponse<T> {
  if (response.success && response.data) {
    const body = response.data as any;
    // Nếu body là response bọc ({success, data}) thì lấy đúng data bên trong
    // (kể cả khi data = null, vd "No active plan") — KHÔNG fallback về cả body,
    // tránh trả object truthy khiến FE tưởng có plan.
    const inner = body && typeof body === 'object' && 'success' in body ? body.data : body;
    return { success: true, data: inner };
  }
  return { success: false, error: response.error };
}

class NutritionService {
  // Kept for old MealView fallback. Legacy /admin/meals endpoint was removed.
  async getAllMeals(): Promise<ApiResponse<Meal[]>> {
    return { success: true, data: [] };
  }

  async getActivePlan(userId: number): Promise<ApiResponse<any>> {
    return unwrap(await apiClient.get<any>(`/personalized-plans/${userId}/active`));
  }

  async getDayMeals(planId: number, dayNumber: number): Promise<ApiResponse<any[]>> {
    return unwrap(await apiClient.get<any>(`/personalized-plans/${planId}/day/${dayNumber}`));
  }

  // Lịch tuân thủ dinh dưỡng: kcal + macro gộp theo từng ngày (from..to = YYYY-MM-DD)
  async getDailyNutrition(userId: number, from: string, to: string): Promise<DailyNutritionPoint[]> {
    const res = await apiClient.get<any>(`/daily-nutrition/${userId}/daily?from=${from}&to=${to}`);
    if (!res.success || !res.data) return [];
    const data = (res.data as any).data || res.data;
    return Array.isArray(data) ? data : [];
  }

  async updateMealFeedback(
    mealDetailId: number,
    payload: { wasEaten: boolean; rating?: number; feedback?: string }
  ): Promise<ApiResponse<any>> {
    return apiClient.put<any>(`/personalized-plans/meals/${mealDetailId}/feedback`, {
      wasEaten: payload.wasEaten,
      rating: payload.rating,
      feedback: payload.feedback || '',
    });
  }

  async swapMealDish(mealDetailId: number): Promise<ApiResponse<any>> {
    return unwrap(await apiClient.post<any>(`/personalized-plans/meals/${mealDetailId}/swap-dish`, {}));
  }
}

export const nutritionService = new NutritionService();
