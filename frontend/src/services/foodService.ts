import { apiClient } from './apiClient';
import type { ApiResponse } from '../types';

export interface FoodCatalogItem {
  id: number;
  name: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  category?: string;
  averageMarketPriceVnd?: number;
  notes?: string;
}

class FoodService {
  async getFoods(): Promise<ApiResponse<FoodCatalogItem[]>> {
    const response = await apiClient.get<any>('/foods');
    if (!response.success || !response.data) return response;

    const envelope = response.data;
    const rawItems = Array.isArray(envelope) ? envelope : envelope.data || [];
    const mapped = (Array.isArray(rawItems) ? rawItems : []).map((item: any) => ({
      id: item.id || item.foodId,
      name: item.name,
      calories: item.calories ?? item.caloriesPer100g ?? 0,
      protein: item.protein ?? item.proteinPer100g,
      carbs: item.carbs ?? item.carbsPer100g,
      fat: item.fat ?? item.fatPer100g,
      category: item.category || 'General',
      averageMarketPriceVnd: item.averageMarketPriceVnd,
      notes: item.notes,
    })).filter((item: FoodCatalogItem) => item.id && item.name);

    return { ...response, data: mapped };
  }
}

export const foodService = new FoodService();
