// Authentication Types for Java Backend

export interface User {
  id: number;
  email: string;
  fullName: string;
  avatarUrl?: string; // Mapped from BE linkImage/profileImage
  role: 'USER' | 'ADMIN' | 'EDITOR';
  isActive: boolean; // Mapped from BE status
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string; // From BE
  status?: string; // From BE
  linkImage?: string; // From BE
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
  avatarUrl?: string;
}

// BE Response format
export interface BEAuthResponse {
  token: string; // BE uses 'token'
  refreshToken: string;
  type: string;
  user: BEUserInfo;
}

// BE UserInfo format
export interface BEUserInfo {
  id: number;
  email: string;
  fullName: string;
  role: string;
}

// FE Expected format
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: User;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: string;
  timestamp: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  message?: string;
}
