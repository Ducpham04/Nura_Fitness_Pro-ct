// Authentication Service - Java Backend
import { apiClient } from './apiClient';
import { API_ENDPOINTS } from '../config/api';
import type { 
  LoginRequest, 
  RegisterRequest, 
  AuthResponse, 
  User,
  ChangePasswordRequest,
  BEAuthResponse,
  BEUserInfo
} from '../types/auth';

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const USER_KEY = 'user';

class AuthService {
  // Login
  async login(credentials: LoginRequest): Promise<boolean> {
    const response = await apiClient.post<BEAuthResponse>(
      API_ENDPOINTS.AUTH.LOGIN, 
      credentials
    );

    if (response.success && response.data) {
      const feData = this.mapBEToFE(response.data);
      this.saveAuthData(feData);
      return true;
    }
    // Ném message thật từ backend (vd "Sai email hoặc mật khẩu") để UI hiển thị đúng
    throw new Error(response.error?.message || 'Đăng nhập thất bại');
  }

  // Login with Google — gửi ID token từ Google Identity Services, BE verify rồi trả JWT
  async loginWithGoogle(idToken: string): Promise<boolean> {
    const response = await apiClient.post<BEAuthResponse>(
      API_ENDPOINTS.AUTH.GOOGLE,
      { idToken }
    );

    if (response.success && response.data) {
      const feData = this.mapBEToFE(response.data);
      this.saveAuthData(feData);
      return true;
    }
    throw new Error(response.error?.message || 'Đăng nhập Google thất bại');
  }

  // Register
  async register(data: RegisterRequest): Promise<boolean> {
    const response = await apiClient.post<BEAuthResponse>(
      API_ENDPOINTS.AUTH.REGISTER,
      data
    );

    if (response.success && response.data) {
      const feData = this.mapBEToFE(response.data);
      this.saveAuthData(feData);
      return true;
    }
    // Ném kèm message từ backend (vd "Email này đã được đăng ký!") để UI hiển thị
    throw new Error(response.error?.message || 'Đăng ký thất bại');
  }

  // Logout
  async logout(): Promise<void> {
    try {
      await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT, {});
    } finally {
      this.clearAuthData();
    }
  }

  // Get current user
  async getCurrentUser(forceRefresh = false): Promise<User | null> {
    const cached = this.getStoredUser();
    if (cached && !forceRefresh) return cached;

    if (!this.getAccessToken()) {
      this.clearAuthData();
      return null;
    }

    const response = await apiClient.get<BEUserInfo>(API_ENDPOINTS.AUTH.ME);
    if (response.success && response.data) {
      const user = this.mapBEUserToFE(response.data);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      return user;
    }

    // Any auth failure (401 from server or SESSION_EXPIRED from interceptor)
    // means the token is invalid — clear everything and return null.
    // Do NOT fall back to `cached`: cached was captured before the request and
    // may still hold an object even after localStorage was cleared, causing a
    // ghost session where the user appears logged-in but every API call fails.
    if (response.error?.code === 'HTTP_401' || response.error?.code === 'SESSION_EXPIRED') {
      this.clearAuthData();
      return null;
    }

    // Non-auth error (e.g. network blip, 500) — use cached as best-effort
    if (cached) return cached;
    return null;
  }

  // Change password
  async changePassword(data: ChangePasswordRequest): Promise<boolean> {
    const response = await apiClient.put(
      API_ENDPOINTS.AUTH.CHANGE_PASSWORD,
      data
    );
    return response.success;
  }

  // Map BE response to FE format
  private mapBEToFE(beData: BEAuthResponse): AuthResponse {
    return {
      accessToken: beData.token, // Map token → accessToken
      refreshToken: beData.refreshToken,
      expiresIn: 3600, // Default 1 hour
      user: this.mapBEUserToFE(beData.user),
    };
  }

  // Map BE user to FE user
  private mapBEUserToFE(beUser: BEUserInfo): User {
    const normalizedRole = String(beUser.role || 'USER').toUpperCase() as 'USER' | 'ADMIN' | 'EDITOR';
    return {
      id: beUser.id,
      email: beUser.email,
      fullName: beUser.fullName,
      role: normalizedRole,
      isActive: true, // Default to true, BE doesn't provide this
      createdAt: new Date().toISOString(), // Default for now
      updatedAt: new Date().toISOString(), // Default for now
    };
  }

  // Helper methods
  saveAuthData(data: AuthResponse): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
  }

  clearAuthData(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  getStoredUser(): User | null {
    const data = localStorage.getItem(USER_KEY);
    if (data) {
      try {
        const user = JSON.parse(data) as User;
        const normalized = {
          ...user,
          role: String(user.role || 'USER').toUpperCase() as 'USER' | 'ADMIN' | 'EDITOR',
        };
        if (normalized.role !== user.role) {
          localStorage.setItem(USER_KEY, JSON.stringify(normalized));
        }
        return normalized;
      } catch {
        return null;
      }
    }
    return null;
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }



  // Refresh token
  async refreshToken(): Promise<boolean> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return false;
    }

    try {
      const response = await apiClient.post<BEAuthResponse>('/auth/refresh', {
        refreshToken
      });

      if (response.success && response.data) {
        const feData = this.mapBEToFE(response.data);
        this.saveAuthData(feData);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  }
}

export const authService = new AuthService();
