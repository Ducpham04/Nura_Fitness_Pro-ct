// HTTP Client for Java Backend API
import { API_CONFIG } from '../config/api';
import type { ApiResponse, ApiError } from '../types';

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${API_CONFIG.BASE_URL}${API_CONFIG.API_PREFIX}`;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    
    // Get token from localStorage
    const token = localStorage.getItem('accessToken');
    
    // Debug: log token presence (remove in production)
    if (process.env.NODE_ENV === 'development') {
      console.log(`[API] ${endpoint} - Token: ${token ? 'present' : 'missing'}`);
    }
    
    const headers: Record<string, string> = {
      ...API_CONFIG.HEADERS,
      ...((options.headers as Record<string, string>) || {}),
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config: RequestInit = {
      ...options,
      headers,
      credentials: 'include',
    };

    try {
      const response = await fetch(url, config);
      
      // Handle non-JSON responses
      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return { success: true, data: undefined as T };
      }

      const text = await response.text();
      const data = text ? JSON.parse(text) : null;

      if (!response.ok) {
        const error: ApiError = {
          code: data?.code || `HTTP_${response.status}`,
          message: data?.message || data?.error || 'An error occurred',
          details: data?.details,
          timestamp: new Date().toISOString(),
        };
        return { success: false, error };
      }

      return { success: true, data };
    } catch (error) {
      const apiError: ApiError = {
        code: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Network error occurred',
        timestamp: new Date().toISOString(),
      };
      return { success: false, error: apiError };
    }
  }

  // HTTP methods
  get<T>(endpoint: string, options?: RequestInit) {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  post<T>(endpoint: string, body: unknown, options?: RequestInit) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  put<T>(endpoint: string, body: unknown, options?: RequestInit) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  delete<T>(endpoint: string, options?: RequestInit) {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();
