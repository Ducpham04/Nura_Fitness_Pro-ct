// Dashboard Data Hook
import { useState, useEffect, useCallback } from 'react';
import { userService, type DashboardData, type UserStats, type WorkoutItem } from '../services/userService';
import { useAuthContext } from '../context/AuthContext';
import type { User } from '../types';

// Fallback data when ALL API calls fail
function getFallbackData(user: User): DashboardData {
  return {
    userSummary: {
      id: user.id,
      fullName: user.fullName || 'User',
      avatarUrl: user.avatarUrl,
      level: 1,
      currentExp: 0,
      nextLevelExp: 100,
      streakDays: 0,
    },
    stats: {
      caloriesConsumed: 0,
      caloriesGoal: 2000,
      proteinConsumed: 0,
      proteinGoal: 150,
      carbsConsumed: 0,
      carbsGoal: 250,
      fatConsumed: 0,
      fatGoal: 70,
      waterConsumed: 0,
      waterGoal: 2.5,
      budgetRemaining: 80000,
      budgetLimit: 80000,
    },
    todayWorkouts: [],
    recovery: {
      sleepHours: 0,
      sleepGoal: 8,
      hrv: 0,
      restingHR: 0,
      energyLevel: 3,
      recommendation: 'Rest',
    },
    budgetBreakdown: [],
    aiSuggestion: `Hi ${user.fullName || 'there'}! Welcome to FitChallenge. Start your first workout today!`,
  };
}

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
        setData(response.data);
      } else if (response.error?.code === 'HTTP_401' || response.error?.message?.includes('401')) {
        console.warn('[Dashboard] API returned 401, using fallback data');
        setData(getFallbackData(user));
      } else {
        console.warn('[Dashboard] API failed, using fallback:', response.error?.message);
        setData(getFallbackData(user));
      }
    } catch (err) {
      console.warn('[Dashboard] Error fetching data, using fallback:', err);
      setData(getFallbackData(user));
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
