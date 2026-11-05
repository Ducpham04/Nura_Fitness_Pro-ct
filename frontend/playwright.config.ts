import { defineConfig, devices } from '@playwright/test';

// E2E chạy trên stack thật: backend :8080 + PostgreSQL (Flyway seed) + Vite.
// - Local: tự khởi động `vite` (proxy /api → VITE_API_URL hoặc localhost:8080).
// - PLAYWRIGHT_BASE_URL: trỏ tới một môi trường đã chạy sẵn (staging…).
// - CHROMIUM_PATH: dùng Chromium có sẵn thay vì bản Playwright tải về.
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:5173';

export default defineConfig({
  testDir: './e2e',
  // screenshot-all chỉ chạy qua `npm run screenshot`
  testIgnore: process.env.SCREENSHOTS ? [] : ['**/screenshot-all.spec.ts'],
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  timeout: 60_000,
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    launchOptions: { executablePath: process.env.CHROMIUM_PATH || undefined },
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: 'npx vite --port 5173 --strictPort',
        url: 'http://localhost:5173',
        reuseExistingServer: true,
        timeout: 60_000,
      },
});
