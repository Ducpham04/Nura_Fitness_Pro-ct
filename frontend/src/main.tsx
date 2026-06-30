import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import { initSentry } from './sentry';
import { initAnalytics } from './analytics';
import './i18n';
import './index.css';

initSentry(); // no-op nếu chưa cấu hình VITE_SENTRY_DSN
initAnalytics(); // no-op nếu chưa cấu hình VITE_PLAUSIBLE_DOMAIN

// Đăng nhập Google: gác sau env. Trống → không bọc provider (zero cost), nút Google tự ẩn.
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

const app = (
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);

createRoot(document.getElementById('root')!).render(
  googleClientId
    ? <GoogleOAuthProvider clientId={googleClientId}>{app}</GoogleOAuthProvider>
    : app
);

// PWA: đăng ký service worker (chỉ production) → bật "Cài app" trên Android + offline tối thiểu.
// Dev không đăng ký để tránh cache cản trở HMR.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => { /* bỏ qua nếu lỗi */ });
  });
}
