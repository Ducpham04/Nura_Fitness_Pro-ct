import { API_CONFIG } from '../config/api';
import { apiClient } from './apiClient';
import type { ApiResponse } from '../types';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export type AdminModuleKey =
  | 'users'
  | 'goals'
  | 'challenges'
  | 'trainingPlans'
  | 'trainingDetails'
  | 'foods'
  | 'dishes'
  | 'rewards'
  | 'transactions'
  | 'informationBody';

export interface AdminModuleConfig {
  key: AdminModuleKey;
  label: string;
  endpoint: string;
  idField: string;
  createMode: 'json' | 'goalMultipart' | 'challengeMultipart' | 'rewardMultipart';
  fields: AdminFieldConfig[];
}

export interface AdminFieldConfig {
  name: string;
  label: string;
  type?: 'text' | 'number' | 'password' | 'select' | 'textarea' | 'boolean';
  options?: string[];
  required?: boolean;
}

export interface AdminDashboardStats {
  userStats?: unknown;
  challengeStats?: unknown;
  trainingStats?: unknown;
  nutritionStats?: unknown;
  rewardStats?: unknown;
}

const API_ROOT = `${API_CONFIG.BASE_URL}${API_CONFIG.API_PREFIX}`;

function authHeaders(extra?: Record<string, string>) {
  const token = localStorage.getItem('accessToken');
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(extra || {}),
  };
}

async function requestRaw<T>(endpoint: string, method: HttpMethod, body?: BodyInit): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_ROOT}${endpoint}`, {
      method,
      body,
      headers: authHeaders(),
      credentials: 'include',
    });
    const contentType = response.headers.get('content-type');
    const payload = contentType?.includes('application/json') ? await response.json() : undefined;
    if (!response.ok) {
      return {
        success: false,
        error: {
          code: `HTTP_${response.status}`,
          message: payload?.message || payload?.error || response.statusText,
          timestamp: new Date().toISOString(),
        },
      };
    }
    return { success: true, data: payload };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Network error occurred',
        timestamp: new Date().toISOString(),
      },
    };
  }
}

function unwrapList(payload: any): any[] {
  const data = payload?.data ?? payload;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(payload?.content)) return payload.content;
  return [];
}

function unwrapObject(payload: any): any {
  return payload?.data ?? payload;
}

function toFormData(mode: AdminModuleConfig['createMode'], payload: Record<string, any>): FormData {
  const formData = new FormData();
  if (mode === 'goalMultipart' || mode === 'challengeMultipart') {
    formData.append('data', JSON.stringify(payload));
  } else if (mode === 'rewardMultipart') {
    formData.append('reward', JSON.stringify(payload));
  }
  return formData;
}

function normalizeAdminPayload(module: AdminModuleConfig, payload: Record<string, any>): Record<string, any> {
  if (module.key !== 'challenges') return payload;

  return {
    ...payload,
    durationDays: payload.durationDays === '' || payload.durationDays == null ? undefined : Number(payload.durationDays),
    rewardPoints: payload.rewardPoints === '' || payload.rewardPoints == null ? undefined : Number(payload.rewardPoints),
    exerciseIds: typeof payload.exerciseIds === 'string'
      ? payload.exerciseIds
          .split(',')
          .map((id: string) => Number(id.trim()))
          .filter((id: number) => Number.isFinite(id) && id > 0)
      : Array.isArray(payload.exerciseIds) ? payload.exerciseIds : [],
  };
}

export const adminModules: AdminModuleConfig[] = [
  {
    key: 'users',
    label: 'User Accounts',
    endpoint: '/admin/users',
    idField: 'id',
    createMode: 'json',
    fields: [
      { name: 'fullName', label: 'Full name', required: true },
      { name: 'email', label: 'Email', required: true },
      { name: 'password', label: 'Password', type: 'password' },
      { name: 'roleId', label: 'Role ID', type: 'number' },
    ],
  },
  {
    key: 'goals',
    label: 'Goal Taxonomy',
    endpoint: '/admin/goals',
    idField: 'id',
    createMode: 'goalMultipart',
    fields: [
      { name: 'name', label: 'Name', required: true },
      { name: 'description', label: 'Description', type: 'textarea' },
      { name: 'imageLink', label: 'Image URL' },
    ],
  },
  {
    key: 'challenges',
    label: 'Challenge Library',
    endpoint: '/admin/challenges',
    idField: 'id',
    createMode: 'challengeMultipart',
    fields: [
      { name: 'goalId', label: 'Goal ID', type: 'number' },
      { name: 'title', label: 'Title', required: true },
      { name: 'description', label: 'Description', type: 'textarea' },
      { name: 'durationDays', label: 'Duration days', type: 'number', required: true },
      { name: 'rewardPoints', label: 'Reward points', type: 'number', required: true },
      { name: 'reward', label: 'Reward label' },
      { name: 'aiRulesJson', label: 'AI rules JSON', type: 'textarea' },
      { name: 'exerciseIds', label: 'Exercise IDs CSV' },
      { name: 'status', label: 'Status', type: 'select', options: ['ACTIVE', 'INACTIVE', 'DRAFT', 'COMPLETED'] },
    ],
  },
  {
    key: 'trainingPlans',
    label: 'Training Programs',
    endpoint: '/admin/training-plans',
    idField: 'tpId',
    createMode: 'json',
    fields: [
      { name: 'goalId', label: 'Goal ID', type: 'number' },
      { name: 'title', label: 'Title', required: true },
      { name: 'description', label: 'Description', type: 'textarea' },
      { name: 'difficultyLevel', label: 'Difficulty' },
      { name: 'durationWeeks', label: 'Duration weeks', type: 'number' },
    ],
  },
  {
    key: 'trainingDetails',
    label: 'Program Schedule',
    endpoint: '/admin/training-plan-details',
    idField: 'tpdId',
    createMode: 'json',
    fields: [
      { name: 'trainingPlanId', label: 'Training plan ID', type: 'number', required: true },
      { name: 'dayNumber', label: 'Day', type: 'number', required: true },
      { name: 'exerciseId', label: 'Exercise ID', type: 'number', required: true },
      { name: 'sets', label: 'Sets', type: 'number' },
      { name: 'reps', label: 'Reps', type: 'number' },
      { name: 'duration', label: 'Duration seconds', type: 'number' },
      { name: 'restTime', label: 'Rest seconds', type: 'number' },
      { name: 'instructions', label: 'Instructions', type: 'textarea' },
    ],
  },
  {
    key: 'foods',
    label: 'Ingredient Catalog',
    endpoint: '/admin/foods',
    idField: 'id',
    createMode: 'json',
    fields: [
      { name: 'name', label: 'Name', required: true },
      { name: 'calories', label: 'Calories / 100g', type: 'number' },
      { name: 'protein', label: 'Protein / 100g', type: 'number' },
      { name: 'carbs', label: 'Carbs / 100g', type: 'number' },
      { name: 'fat', label: 'Fat / 100g', type: 'number' },
      { name: 'notes', label: 'Notes', type: 'textarea' },
    ],
  },
  {
    key: 'dishes',
    label: 'Meal Catalog',
    endpoint: '/admin/dishes',
    idField: 'dishId',
    createMode: 'json',
    fields: [
      { name: 'dishName', label: 'Dish name', required: true },
      { name: 'imageUrl', label: 'Image URL' },
      { name: 'dishRole', label: 'Role', type: 'select', options: ['MAIN_PROTEIN', 'SOUP', 'VEGETABLE', 'CARB_BASE', 'ONE_POT'], required: true },
      { name: 'suitableMealTypes', label: 'Meal types CSV' },
      { name: 'isActive', label: 'Active', type: 'boolean' },
    ],
  },
  {
    key: 'rewards',
    label: 'Reward Catalog',
    endpoint: '/admin/rewards',
    idField: 'id',
    createMode: 'rewardMultipart',
    fields: [
      { name: 'name', label: 'Name', required: true },
      { name: 'description', label: 'Description', type: 'textarea' },
      { name: 'points', label: 'Points', type: 'number' },
      { name: 'total', label: 'Stock', type: 'number' },
      { name: 'status', label: 'Status' },
      { name: 'linkImage', label: 'Image URL' },
      { name: 'externalPartner', label: 'Partner' },
    ],
  },
  {
    key: 'transactions',
    label: 'Point Ledger',
    endpoint: '/transactions',
    idField: 'id',
    createMode: 'json',
    fields: [
      { name: 'userId', label: 'User ID', type: 'number', required: true },
      { name: 'type', label: 'Type', required: true },
      { name: 'amount', label: 'Amount', type: 'number' },
      { name: 'points', label: 'Points', type: 'number' },
      { name: 'reference', label: 'Reference' },
      { name: 'status', label: 'Status' },
      { name: 'description', label: 'Description', type: 'textarea' },
    ],
  },
  {
    key: 'informationBody',
    label: 'Body Profiles',
    endpoint: '/admin/information-body',
    idField: 'infoId',
    createMode: 'json',
    fields: [
      { name: 'userId', label: 'User ID', type: 'number', required: true },
      { name: 'heightCm', label: 'Height cm', type: 'number' },
      { name: 'weightKg', label: 'Weight kg', type: 'number' },
      { name: 'age', label: 'Age', type: 'number' },
      { name: 'gender', label: 'Gender' },
      { name: 'activityLevel', label: 'Activity level' },
    ],
  },
];

export const adminService = {
  async getDashboard(): Promise<AdminDashboardStats> {
    const [userStats, challengeStats, trainingStats, nutritionStats, rewardStats] = await Promise.all([
      apiClient.get('/admin/dashboard/user-stats'),
      apiClient.get('/admin/dashboard/challenge-stats'),
      apiClient.get('/admin/dashboard/training-stats'),
      apiClient.get('/admin/dashboard/nutrition-stats'),
      apiClient.get('/admin/dashboard/reward-stats'),
    ]);

    return {
      userStats: unwrapObject(userStats.data),
      challengeStats: unwrapObject(challengeStats.data),
      trainingStats: unwrapObject(trainingStats.data),
      nutritionStats: unwrapObject(nutritionStats.data),
      rewardStats: unwrapObject(rewardStats.data),
    };
  },

  async list(module: AdminModuleConfig): Promise<any[]> {
    const endpoint = module.key === 'foods' ? '/foods' : module.endpoint;
    const response = await apiClient.get(endpoint);
    if (!response.success) throw new Error(response.error?.message || `Failed to load ${module.label}`);
    return unwrapList(response.data);
  },

  async create(module: AdminModuleConfig, payload: Record<string, any>) {
    const normalizedPayload = normalizeAdminPayload(module, payload);
    if (module.createMode === 'json') {
      return apiClient.post(module.endpoint, normalizedPayload);
    }
    return requestRaw(module.endpoint, 'POST', toFormData(module.createMode, normalizedPayload));
  },

  async update(module: AdminModuleConfig, id: string | number, payload: Record<string, any>) {
    const normalizedPayload = normalizeAdminPayload(module, payload);
    if (module.createMode === 'json') {
      return apiClient.put(`${module.endpoint}/${id}`, normalizedPayload);
    }
    return requestRaw(`${module.endpoint}/${id}`, 'PUT', toFormData(module.createMode, normalizedPayload));
  },

  async remove(module: AdminModuleConfig, id: string | number) {
    return apiClient.delete(`${module.endpoint}/${id}`);
  },

  async listDishIngredients(dishId: string | number) {
    const response = await apiClient.get(`/admin/dishes/${dishId}/ingredients`);
    if (!response.success) throw new Error(response.error?.message || 'Failed to load ingredients');
    return unwrapList(response.data);
  },

  async addDishIngredient(dishId: string | number, payload: { foodId: number; isCoreIngredient: boolean }) {
    return apiClient.post(`/admin/dishes/${dishId}/ingredients`, payload);
  },

  async updateDishIngredient(ingredientId: string | number, payload: { foodId?: number; isCoreIngredient?: boolean }) {
    return apiClient.put(`/admin/dishes/ingredients/${ingredientId}`, payload);
  },

  async deleteDishIngredient(ingredientId: string | number) {
    return apiClient.delete(`/admin/dishes/ingredients/${ingredientId}`);
  },
};
