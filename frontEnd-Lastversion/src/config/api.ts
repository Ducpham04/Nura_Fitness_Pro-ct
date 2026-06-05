// API Configuration for Java Backend
// Dùng `??` (không phải `||`) để VITE_API_URL='' (chuỗi rỗng) vẫn được giữ nguyên:
//   - Dev: VITE_API_URL không set (undefined) -> fallback localhost:8080
//   - Prod (nginx 1 origin): VITE_API_URL='' -> baseUrl = '/api' tương đối,
//     nginx proxy /api -> backend, tránh CORS hoàn toàn.
const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';

// fitness-ai-service (MediaPipe pose) — WebSocket realtime cho chấm điểm thử thách.
// - VITE_POSE_WS_URL nếu được set (ưu tiên).
// - Prod (https, same-origin qua nginx): wss://<host>/pose  → nginx proxy tới fitness-ai:5001.
// - Dev: ws://localhost:5001 (kết nối trực tiếp service).
export const POSE_WS_BASE: string =
  (import.meta.env.VITE_POSE_WS_URL as string | undefined) ??
  (typeof window !== 'undefined' && window.location.protocol === 'https:'
    ? `wss://${window.location.host}/pose`
    : 'ws://localhost:5001');

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
    PERSONALIZED_SCHEDULE: '/user/personalized/schedule',
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
    GENERATE_NEXT_WORKOUT_WEEK: (utId: number) => `/ai-plans/workout/${utId}/generate-next-week`,
    AUTO_REGULATE_WORKOUT: '/ai-plans/auto-regulate',
    LOG_FOOD_NATURAL: '/ai-plans/log-food-natural',
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
