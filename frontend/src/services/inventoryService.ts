import { apiClient } from './apiClient';
import type { ApiResponse } from '../types';

export interface InventoryItem {
  id: number;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  status: 'keep' | 'avoid' | 'limit' | 'reserved' | 'consumed' | 'expired';
  expiryDate: string;
  caloriesPer100g: number;
  notes?: string;
  daysToExpiry?: number;
  usedInPlan?: boolean;
}

export interface InventoryRequest {
  name: string;
  quantity: number;
  unit: string;
  category: string;
  status: string;
  expiryDate: string;
  caloriesPer100g: number;
  notes?: string;
}

class InventoryService {
  private unwrap<T = any>(payload: any): T {
    return payload?.data ?? payload;
  }

  private mapStatus(status?: string): InventoryItem['status'] {
    const normalized = (status || '').toUpperCase();
    if (normalized === 'AVAILABLE') return 'keep';
    if (normalized === 'RESERVED') return 'reserved';
    if (normalized === 'CONSUMED') return 'consumed';
    if (normalized === 'EXPIRED') return 'expired';
    return 'limit';
  }

  private mapItem(item: any): InventoryItem {
    const expiryDate = item.expiryDate || '';
    return {
      id: item.inventoryId || item.id,
      name: item.displayName || item.foodName || item.name || item.food?.name || 'Unknown item',
      quantity: item.quantityGrams ?? item.quantity ?? 0,
      unit: item.unit || 'g',
      category: item.category || item.food?.category || 'General',
      status: this.mapStatus(item.status),
      expiryDate,
      caloriesPer100g: item.caloriesPer100g ?? item.food?.caloriesPer100g ?? item.food?.calories ?? 0,
      notes: item.aiSuggestionNote || item.notes,
      usedInPlan: !!item.usedInPlan,
      daysToExpiry: expiryDate ? Math.ceil((new Date(expiryDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24)) : undefined
    };
  }

  async getInventory(userId: number): Promise<ApiResponse<InventoryItem[]>> {
    const response = await apiClient.get<any>(`/inventory/${userId}`);
    if (response.success && response.data) {
      const data = this.unwrap<any>(response.data);
      const rawItems = data?.content || (Array.isArray(data) ? data : []);
      const mapped = rawItems.map((item: any) => this.mapItem(item));
      return { ...response, data: mapped };
    }
    return response;
  }

  async addItem(userId: number, item: any): Promise<ApiResponse<any>> {
    const payload = {
      foodName: item.name,
      quantityGrams: item.quantity,
      unit: item.unit,
      expiryDate: item.expiryDate
    };
    return await apiClient.post<any>(`/inventory/${userId}/add`, payload);
  }

  async updateItem(userId: number, id: number, item: any): Promise<ApiResponse<any>> {
    return await apiClient.put<any>(`/inventory/${userId}/${id}/status`, { status: item.status });
  }

  async deleteItem(userId: number, id: number): Promise<ApiResponse<any>> {
    return await apiClient.delete<any>(`/inventory/${userId}/${id}`);
  }

  async getExpiringSoon(userId: number, days: number = 7): Promise<ApiResponse<any>> {
    const response = await apiClient.get<any>(`/inventory/${userId}/expiring?daysAhead=${days}`);
    if (response.success && response.data) {
      const data = this.unwrap<any>(response.data);
      const rawItems = data?.content || (Array.isArray(data) ? data : []);
      const mapped = rawItems.map((item: any) => this.mapItem(item));
      return { ...response, data: mapped };
    }
    return response;
  }

  async generateShoppingList(userId: number, _daysAhead: number = 7): Promise<ApiResponse<any>> {
    // Fallback to stats or generic list since UserInventoryController lacks direct shopping-list endpoint
    const response = await apiClient.get<any>(`/inventory/${userId}/stats`);
    if (response.success && response.data) {
      return { ...response, data: { summary: `You have ${response.data.expiringSoon} items expiring soon. Consider replenishing staples.` } };
    }
    return response;
  }
 
  async scanItem(userId: number, imageBlob: Blob): Promise<ApiResponse<any>> {
    const formData = new FormData();
    formData.append('image', imageBlob, 'inventory-scan.jpg');
    
    return await apiClient.post<any>(
      '/inventory/scan',
      formData,
      { headers: { 'userId': userId.toString(), 'Content-Type': 'multipart/form-data' } }
    );
  }
}

export const inventoryService = new InventoryService();
