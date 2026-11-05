// Khởi tạo Sentry (giám sát lỗi frontend).
// No-op khi VITE_SENTRY_DSN trống — chưa cấu hình thì không làm gì cả.
// SDK được import động nên không nằm trong bundle tải ban đầu.
type SentryImpl = typeof import('./sentry-impl');

const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
let sentryPromise: Promise<SentryImpl> | null = null;

function loadSentry(): Promise<SentryImpl> {
  if (!sentryPromise) {
    sentryPromise = import('./sentry-impl').then(mod => {
      mod.start(dsn as string);
      return mod;
    });
  }
  return sentryPromise;
}

export function initSentry() {
  if (!dsn) return; // chưa cấu hình → bỏ qua hoàn toàn
  void loadSentry();
}

// Gửi 1 lỗi đã bắt được lên Sentry (no-op nếu chưa cấu hình DSN).
export function captureError(error: unknown, context?: Record<string, unknown>) {
  if (!dsn) return;
  void loadSentry().then(mod => {
    mod.captureException(error, context ? { extra: context } : undefined);
  });
}
