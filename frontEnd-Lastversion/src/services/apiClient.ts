// HTTP Client for Java Backend API
import { API_CONFIG } from '../config/api';
import type { ApiResponse, ApiError } from '../types';

interface ApiRequestInit extends RequestInit {
  skipAuth?: boolean;
  /** Internal flag — set true on retry after token refresh to prevent infinite loops */
  _isRetry?: boolean;
}

// ── 401 / session-expiry handling ───────────────────────────────────────────
// When any API call comes back with 401 we clear local auth state and send the
// user to /login so they don't sit in a "zombie authenticated" state where the
// UI thinks they're logged in but every request fails.

let _onUnauthorized: (() => void) | null = null;

/** Register a callback that fires whenever the client receives a 401. */
export function setUnauthorizedHandler(cb: () => void) {
  _onUnauthorized = cb;
}

function handleUnauthorized() {
  // Clear every auth key so the next page load starts fresh
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  _onUnauthorized?.();
}

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${API_CONFIG.BASE_URL}${API_CONFIG.API_PREFIX}`;
  }

  private async request<T>(
    endpoint: string,
    options: ApiRequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const { skipAuth, _isRetry, ...fetchOptions } = options;

    // Get token from localStorage
    const token = localStorage.getItem('accessToken');

    const headers: Record<string, string> = {
      ...API_CONFIG.HEADERS,
      ...((fetchOptions.headers as Record<string, string>) || {}),
    };

    if (token && !skipAuth) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config: RequestInit = {
      ...fetchOptions,
      headers,
      credentials: 'include',
    };

    try {
      const response = await fetch(url, config);

      // ── 401: session expired or token invalid ───────────────────────────
      // Only intercept on genuinely "protected resource" endpoints.
      // Auth-plumbing endpoints (/auth/me, /auth/login, etc.) handle their
      // own 401 internally — intercepting them here causes a race condition
      // where getCurrentUser's `cached` local variable survives the
      // localStorage.clear() and returns a ghost user.
      if (response.status === 401 && !skipAuth && !_isRetry) {
        const isAuthPlumbing = endpoint.includes('/auth/login') ||
                               endpoint.includes('/auth/register') ||
                               endpoint.includes('/auth/refresh') ||
                               endpoint.includes('/auth/logout') ||
                               endpoint.includes('/auth/me') ||
                               endpoint.includes('/auth/user');
        if (!isAuthPlumbing) {
          handleUnauthorized();
          return {
            success: false,
            error: {
              code: 'SESSION_EXPIRED',
              message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
              timestamp: new Date().toISOString(),
            },
          };
        }
      }

      // Handle non-JSON responses
      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        if (!response.ok) {
          return {
            success: false,
            error: {
              code: `HTTP_${response.status}`,
              message: response.statusText || `HTTP ${response.status}`,
              timestamp: new Date().toISOString(),
            },
          };
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
  get<T>(endpoint: string, options?: ApiRequestInit) {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  post<T>(endpoint: string, body: unknown, options?: ApiRequestInit) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  put<T>(endpoint: string, body: unknown, options?: ApiRequestInit) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  delete<T>(endpoint: string, options?: ApiRequestInit) {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();
