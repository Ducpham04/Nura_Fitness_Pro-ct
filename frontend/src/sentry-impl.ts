// Phần nặng của Sentry — chỉ được import động từ sentry.ts khi có DSN.
// Dùng named import để Rollup tree-shake phần SDK không dùng tới.
import { init, captureException } from '@sentry/react';

export function start(dsn: string) {
  init({
    dsn,
    environment: import.meta.env.VITE_APP_ENV || import.meta.env.MODE,
    // Performance tracing: mặc định tắt để tiết kiệm quota free tier.
    tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE ?? 0),
    // App sức khỏe — không gửi PII (IP, dữ liệu nhập) lên Sentry.
    sendDefaultPii: false,
  });
}

export { captureException };
