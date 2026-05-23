// Dashboard Data Hook
import { useState, useEffect, useCallback } from 'react';
import { userService, type DashboardData } from '../services/userService';
import { useAuthContext } from '../context/AuthContext';

interface UseDashboardReturn {
  data: DashboardData | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  updateStats: (updates: Partial<DashboardData['stats']>) => void;
}

export function useDashboard(): UseDashboardReturn {
  const { user, isAuthenticated } = useAuthContext();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user || !isAuthenticated) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await userService.getDashboardData(user.id);

      if (response.success && response.data) {
        const todayWorkouts = await userService.getTodayWorkouts(user.id);
        setData({
          ...response.data,
          todayWorkouts,
        });
      } else {
        const message = response.error?.message || 'Failed to load dashboard data';
        console.warn('[Dashboard] API failed:', message);
        setError(message);
        setData(null);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load dashboard data';
      console.warn('[Dashboard] Error fetching data:', err);
      setError(message);
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [user, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchData();
    } else {
      setIsLoading(false);
    }
  }, [fetchData, isAuthenticated, user]);

  const updateStats = useCallback((updates: Partial<DashboardData['stats']>) => {
    setData(prev => {
      if (!prev) return null;
      return {
        ...prev,
        stats: {
          ...prev.stats,
          ...updates,
        },
      };
    });
  }, []);

  return {
    data,
    isLoading,
    error,
    refresh: fetchData,
    updateStats,
  };
}
