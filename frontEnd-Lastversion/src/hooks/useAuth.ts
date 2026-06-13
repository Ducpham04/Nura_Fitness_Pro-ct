// React Hook for Authentication
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { setUnauthorizedHandler } from '../services/apiClient';
import type { User, LoginRequest, RegisterRequest } from '../types';

interface UseAuthReturn {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  login: (credentials: LoginRequest) => Promise<boolean>;
  loginWithGoogle: (idToken: string) => Promise<boolean>;
  register: (data: RegisterRequest) => Promise<boolean>;
  logout: () => Promise<void>;
  refresh: () => Promise<boolean>;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Register a global 401 handler once so any expired-token response
  // immediately clears auth state and sends the user to /login.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null);
      navigate('/login', { replace: true, state: { sessionExpired: true } });
    });
  }, [navigate]);

  useEffect(() => {
    // Verify stored session on every page load.
    // If a token exists but the server rejects it (expired / rotated secret),
    // redirect to /login with the sessionExpired flag so the banner shows.
    const initAuth = async () => {
      try {
        if (authService.isAuthenticated()) {
          const currentUser = await authService.getCurrentUser(true);
          if (currentUser) {
            setUser(currentUser);
          } else {
            // Token existed but server said no — make sure localStorage is clean
            // and land on login with the "session expired" banner.
            authService.clearAuthData();
            navigate('/login', { replace: true, state: { sessionExpired: true } });
          }
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        authService.clearAuthData();
      } finally {
        setIsLoading(false);
      }
    };
    initAuth();
    // navigate is stable; omit from deps to avoid re-running on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(async (credentials: LoginRequest): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const success = await authService.login(credentials);
      if (success) {
        const user = await authService.getCurrentUser(true);
        setUser(user);
        return true;
      }
      return false;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An error occurred';
      setError(msg);
      throw new Error(msg); // ném tiếp để trang Login hiển thị đúng message
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loginWithGoogle = useCallback(async (idToken: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const success = await authService.loginWithGoogle(idToken);
      if (success) {
        const user = await authService.getCurrentUser(true);
        setUser(user);
        return true;
      }
      return false;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An error occurred';
      setError(msg);
      throw new Error(msg); // ném tiếp để trang Login hiển thị đúng message
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (data: RegisterRequest): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const success = await authService.register(data);
      if (success) {
        const user = await authService.getCurrentUser(true);
        setUser(user);
        return true;
      }
      setError('Registration failed. Please try again.');
      return false;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An error occurred';
      setError(msg);
      throw new Error(msg); // ném tiếp để trang Register hiển thị đúng message
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      await authService.logout();
    } finally {
      setUser(null);
      setIsLoading(false);
    }
  }, []);

  const refresh = useCallback(async (): Promise<boolean> => {
    try {
      const success = await authService.refreshToken();
      if (success) {
        const user = await authService.getCurrentUser(true);
        setUser(user);
      }
      return success;
    } catch {
      return false;
    }
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    error,
    login,
    loginWithGoogle,
    register,
    logout,
    refresh,
  };
}
