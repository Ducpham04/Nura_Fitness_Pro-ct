// Plausible analytics — nhẹ, không cookie, không cần banner GDPR.
// No-op khi VITE_PLAUSIBLE_DOMAIN trống. Tự đo pageview (kể cả điều hướng SPA);
// trackEvent() để bắn event funnel (đăng ký, tạo plan, nâng cấp).
const domain = import.meta.env.VITE_PLAUSIBLE_DOMAIN as string | undefined;
const src = (import.meta.env.VITE_PLAUSIBLE_SRC as string | undefined)
  || 'https://plausible.io/js/script.js';

declare global {
  interface Window {
    plausible?: (event: string, opts?: { props?: Record<string, string | number | boolean> }) => void;
  }
}

export function initAnalytics() {
  if (!domain) return; // chưa cấu hình → bỏ qua hoàn toàn
  if (document.querySelector('script[data-domain]')) return; // tránh nhúng 2 lần

  // Hàng đợi để trackEvent gọi được trước khi script tải xong
  window.plausible = window.plausible || function (...args: unknown[]) {
    (window.plausible as unknown as { q: unknown[] }).q =
      ((window.plausible as unknown as { q?: unknown[] }).q || []);
    (window.plausible as unknown as { q: unknown[] }).q.push(args);
  };

  const s = document.createElement('script');
  s.defer = true;
  s.setAttribute('data-domain', domain);
  s.src = src;
  document.head.appendChild(s);
}

// Bắn 1 event tuỳ biến (no-op nếu chưa cấu hình).
export function trackEvent(name: string, props?: Record<string, string | number | boolean>) {
  if (!domain) return;
  window.plausible?.(name, props ? { props } : undefined);
}
