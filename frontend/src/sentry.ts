// Khởi tạo Sentry (giám sát lỗi frontend).
// No-op khi VITE_SENTRY_DSN trống — chưa cấu hình thì không làm gì cả.
import * as Sentry from '@sentry/react';

const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;

export function initSentry() {
  if (!dsn) return; // chưa cấu hình → bỏ qua hoàn toàn
  Sentry.init({
    dsn,
    environment: import.meta.env.VITE_APP_ENV || import.meta.env.MODE,
    // Performance tracing: mặc định tắt để tiết kiệm quota free tier.
    tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE ?? 0),
    // App sức khỏe — không gửi PII (IP, dữ liệu nhập) lên Sentry.
    sendDefaultPii: false,
  });
}

// Gửi 1 lỗi đã bắt được lên Sentry (no-op nếu chưa init/chưa cấu hình DSN).
export function captureError(error: unknown, context?: Record<string, unknown>) {
  if (!dsn) return;
  Sentry.captureException(error, context ? { extra: context } : undefined);
}
