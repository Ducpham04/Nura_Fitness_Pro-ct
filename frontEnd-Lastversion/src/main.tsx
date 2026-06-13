import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import { initSentry } from './sentry';
import { initAnalytics } from './analytics';
import './i18n';
import './index.css';

initSentry(); // no-op nếu chưa cấu hình VITE_SENTRY_DSN
initAnalytics(); // no-op nếu chưa cấu hình VITE_PLAUSIBLE_DOMAIN

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
