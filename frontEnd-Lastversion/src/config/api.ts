// API Configuration for Java Backend
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export const API_CONFIG = {
  BASE_URL: API_BASE_URL,
  API_PREFIX: '/api',
  TIMEOUT: 30000,
  HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
} as const;

// API Endpoints
export const API_ENDPOINTS = {
  // Auth
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    REFRESH: '/auth/refresh',
    LOGOUT: '/auth/logout',
    ME: '/auth/me',
    CHANGE_PASSWORD: '/auth/change-password',
  },
  // User (v1 prefix matches BE)
  USER: {
    PROFILE: (id: number) => `/v1/users/${id}/profile`,
    FULL_PROFILE: (id: number) => `/v1/users/${id}/profile/full`,
    DASHBOARD: (id: number) => `/v1/users/${id}/dashboard`,
    STATS: (id: number) => `/v1/users/${id}/profile/full`,
    INFO: '/user/info',
    BODY_PROFILE: "/user/profile/body",
  },
  // Challenges
  CHALLENGES: {
    LIST: '/challenges',
    DETAIL: (id: number) => `/challenges/${id}`,
    SUBMIT: '/user-challenges',
    UPLOAD: (id: number) => `/user-challenges/${id}/upload`,
    MY: '/user/challenges/my',
  },
  // Training
  TRAINING: {
    PLANS: '/training-plans',
    USER_TRAINING: (userId: number) => `/user/training/${userId}`,
    LOG: (userId: number) => `/user/training/${userId}/log`,
    DAILY_LOGS_BY_PLAN: (planId: number) => `/user/daily-training-logs/plan/${planId}`,
    DAILY_LOGS_SAVE: '/user/daily-training-logs',
    PERSONALIZED_TODAY: '/user/personalized/today',
  },
  // Nutrition
  NUTRITION: {
    PLANS: '/nutrition-plans',
    PERSONALIZED: '/personalized-plans',
    INVENTORY: '/inventory',
    BUDGET: '/budget',
  },
  // Budget
  BUDGET: {
    HISTORY: (userId: number) => `/budget/${userId}/history`,
    WEEKLY: (userId: number) => `/budget/${userId}/weekly-report`,
    MONTHLY: (userId: number) => `/budget/${userId}/monthly-report`,
    TRACK: (userId: number) => `/budget/${userId}/track`,
  },
  // AI Analysis
  AI: {
    SCAN_FOOD: '/food-analysis/scan',
    ANALYZE_FOOD: '/food-analysis/analyze',
    GENERATE_MEAL: '/ai-plans/generate-meal-hybrid',
    GENERATE_WORKOUT: '/ai-plans/generate-workout',
  },
  // Notifications
  NOTIFICATIONS: {
    LIST: (userId: number) => `/notifications/${userId}`,
    UNREAD_COUNT: (userId: number) => `/notifications/${userId}/count-unread`,
    MARK_READ: (id: number) => `/notifications/${id}/read`,
  },
  // Health
  HEALTH: {
    PROFILE: '/user/health-profile',
    BODY_METRIC: '/user/body-metric',
    BODY_METRIC_LATEST: '/user/body-metric/latest',
  },
} as const;
