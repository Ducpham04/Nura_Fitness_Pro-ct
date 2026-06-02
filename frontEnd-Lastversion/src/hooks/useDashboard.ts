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

  // Refresh khi user hoàn thành bài tập
  useEffect(() => {
    const onWorkoutCompleted = () => {
      fetchData();
    };
    window.addEventListener('workout-completed', onWorkoutCompleted);
    return () => window.removeEventListener('workout-completed', onWorkoutCompleted);
  }, [fetchData]);

  // Refresh khi user quay lại tab (chuyển từ WorkoutTab → Dashboard)
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible' && isAuthenticated && user) {
        fetchData();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
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
