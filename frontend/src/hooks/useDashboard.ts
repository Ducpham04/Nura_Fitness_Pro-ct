// Dashboard Data Hook
import { useState, useEffect, useCallback, useRef } from 'react';
import { userService, type DashboardData } from '../services/userService';
import { useAuthContext } from '../context/AuthContext';

// Khoảng tối thiểu giữa 2 lần refetch do quay lại tab (tránh spam 2 API mỗi lần
// chuyển tab). workout-completed vẫn refetch tức thì, không bị chặn bởi guard này.
const VISIBILITY_REFETCH_MIN_MS = 30_000;

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
  // Mốc thời gian lần fetch thành công gần nhất — dùng để chặn refetch quá dày
  // khi user liên tục chuyển qua lại tab.
  const lastFetchRef = useRef<number>(0);

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
        lastFetchRef.current = Date.now();
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

  // Refresh khi user quay lại tab (chuyển từ WorkoutTab → Dashboard).
  // Chỉ refetch nếu đã quá VISIBILITY_REFETCH_MIN_MS kể từ lần fetch gần nhất —
  // tránh gọi 2 API mỗi lần liếc qua tab khác rồi quay lại.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState !== 'visible' || !isAuthenticated || !user) return;
      if (Date.now() - lastFetchRef.current < VISIBILITY_REFETCH_MIN_MS) return;
      fetchData();
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
