// Nutrition Service - Java Backend API
import { apiClient } from './apiClient';
import { API_ENDPOINTS } from '../config/api';
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

export interface NutritionPlan {
  id: number;
  name: string;
  description: string;
  dailyCalories: number;
  dailyProtein: number;
  dailyCarbs: number;
  dailyFat: number;
  weeklyBudget: number;
  meals: Meal[];
}

export interface UserNutrition {
  userId: number;
  dailyBudget: number;
  spentToday: number;
  remainingBudget: number;
  weeklyMeals: Meal[];
  preferences: string[];
}

class NutritionService {
  // Get all available meals
  async getAllMeals(): Promise<ApiResponse<Meal[]>> {
    const response = await apiClient.get<any>('/admin/meals');
    
    if (response.success && response.data) {
      // BE returns NotificationResponse with data field
      const meals = response.data.data || response.data;
      return {
        success: true,
        data: meals.map((meal: any) => ({
          id: meal.mealId,
          name: meal.name,
          description: meal.description,
          protein: meal.protein || 0,
          carbs: meal.carbs || 0,
          fat: meal.fat || 0,
          calories: meal.calories || (meal.protein * 4 + meal.carbs * 4 + meal.fat * 9),
          price: meal.price || 0,
          imageUrl: meal.imageUrl,
          category: meal.category,
          dayOfWeek: meal.dayOfWeek,
          isAvailable: meal.isAvailable !== false,
        }))
      };
    }
    
    return {
      success: false,
      error: response.error || { code: 'FETCH_ERROR', message: 'Failed to load meals', timestamp: new Date().toISOString() }
    };
  }

  // Get meals by nutrition plan
  async getMealsByPlan(planId: number): Promise<ApiResponse<Meal[]>> {
    const response = await apiClient.get<any>(`/admin/meals/plan/${planId}`);
    
    if (response.success && response.data) {
      const meals = response.data.data || response.data;
      return {
        success: true,
        data: meals.map((meal: any) => ({
          id: meal.mealId,
          name: meal.name,
          description: meal.description,
          protein: meal.protein || 0,
          carbs: meal.carbs || 0,
          fat: meal.fat || 0,
          calories: meal.calories || (meal.protein * 4 + meal.carbs * 4 + meal.fat * 9),
          price: meal.price || 0,
          imageUrl: meal.imageUrl,
          category: meal.category,
          dayOfWeek: meal.dayOfWeek,
          isAvailable: meal.isAvailable !== false,
        }))
      };
    }
    
    return {
      success: false,
      error: response.error || { code: 'FETCH_ERROR', message: 'Failed to load meals for plan', timestamp: new Date().toISOString() }
    };
  }

  // Get user nutrition data
  async getUserNutrition(userId: number): Promise<ApiResponse<UserNutrition>> {
    const response = await apiClient.get<any>(`/admin/user-nutrition/${userId}`);
    
    if (response.success && response.data) {
      const nutrition = response.data.data || response.data;
      return {
        success: true,
        data: {
          userId: nutrition.userId || userId,
          dailyBudget: nutrition.dailyBudget || 80000,
          spentToday: nutrition.spentToday || 0,
          remainingBudget: nutrition.remainingBudget || (nutrition.dailyBudget || 80000) - (nutrition.spentToday || 0),
          weeklyMeals: nutrition.weeklyMeals || [],
          preferences: nutrition.preferences || [],
        }
      };
    }
    
    return {
      success: false,
      error: response.error || { code: 'FETCH_ERROR', message: 'Failed to load user nutrition data', timestamp: new Date().toISOString() }
    };
  }

  // Get nutrition plans
  async getNutritionPlans(): Promise<ApiResponse<NutritionPlan[]>> {
    const response = await apiClient.get<any>('/admin/nutrition-plans');
    
    if (response.success && response.data) {
      const plans = response.data.data || response.data;
      return {
        success: true,
        data: plans.map((plan: any) => ({
          id: plan.planId,
          name: plan.name,
          description: plan.description,
          dailyCalories: plan.dailyCalories || 2000,
          dailyProtein: plan.dailyProtein || 150,
          dailyCarbs: plan.dailyCarbs || 250,
          dailyFat: plan.dailyFat || 65,
          weeklyBudget: plan.weeklyBudget || 560000,
          meals: plan.meals || [],
        }))
      };
    }
    
    return {
      success: false,
      error: response.error || { code: 'FETCH_ERROR', message: 'Failed to load nutrition plans', timestamp: new Date().toISOString() }
    };
  }

  // Get personalized meal suggestions
  async getPersonalizedMeals(userId: number, preferences?: string[]): Promise<ApiResponse<Meal[]>> {
    const params = new URLSearchParams();
    if (preferences?.length) {
      preferences.forEach(pref => params.append('preferences', pref));
    }
    
    const response = await apiClient.get<any>(`/admin/nutrition-plans/personalized/${userId}?${params.toString()}`);
    
    if (response.success && response.data) {
      const meals = response.data.data || response.data;
      return {
        success: true,
        data: meals.map((meal: any) => ({
          id: meal.mealId,
          name: meal.name,
          description: meal.description,
          protein: meal.protein || 0,
          carbs: meal.carbs || 0,
          fat: meal.fat || 0,
          calories: meal.calories || (meal.protein * 4 + meal.carbs * 4 + meal.fat * 9),
          price: meal.price || 0,
          imageUrl: meal.imageUrl,
          category: meal.category,
          dayOfWeek: meal.dayOfWeek,
          isAvailable: meal.isAvailable !== false,
        }))
      };
    }
    
    return {
      success: false,
      error: response.error || { code: 'FETCH_ERROR', message: 'Failed to load personalized meals', timestamp: new Date().toISOString() }
    };
  }
 
  // Get active AI plan
  async getActivePlan(userId: number): Promise<ApiResponse<any>> {
    const response = await apiClient.get<any>(`/personalized-plans/${userId}/active`);
    if (response.success && response.data) {
      const plan = (response.data as any).data ?? response.data;
      return { success: true, data: plan };
    }
    return { success: false, error: response.error };
  }
 
  // Get meals for a specific plan and day
  async getDayMeals(planId: number, dayNumber: number): Promise<ApiResponse<any[]>> {
    const response = await apiClient.get<any>(`/personalized-plans/${planId}/day/${dayNumber}`);
    if (response.success && response.data) {
      const meals = (response.data as any).data ?? response.data;
      return { success: true, data: meals };
    }
    return { success: false, error: response.error };
  }

  async updateMealFeedback(
    mealDetailId: number,
    payload: { wasEaten: boolean; rating?: number; feedback?: string }
  ): Promise<ApiResponse<any>> {
    return apiClient.put<any>(`/personalized-plans/meals/${mealDetailId}/feedback`, {
      wasEaten: payload.wasEaten,
      rating: payload.rating,
      feedback: payload.feedback || ''
    });
  }
}

export const nutritionService = new NutritionService();
