import { test, expect } from '@playwright/test';
import path from 'path';

const OUT_DIR = path.join(process.cwd(), 'screenshots');

const PUBLIC_ROUTES = [
  { name: '01-landing',         path: '/' },
  { name: '02-login',           path: '/login' },
  { name: '03-register',        path: '/register' },
  { name: '04-forgot-password', path: '/forgot-password' },
  { name: '05-reset-password',  path: '/reset-password' },
  { name: '06-privacy',         path: '/privacy' },
  { name: '07-terms',           path: '/terms' },
];

const AUTH_ROUTES = [
  { name: '10-dashboard-home',    path: '/dashboard' },
  { name: '11-dashboard-workout', path: '/dashboard/workout' },
  { name: '12-dashboard-diet',    path: '/dashboard/diet' },
  { name: '13-challenges',        path: '/dashboard/challenges' },
  { name: '14-ai-coach',          path: '/dashboard/coach' },
  { name: '15-logbook',           path: '/dashboard/logbook' },
  { name: '16-profile',           path: '/dashboard/profile' },
  { name: '17-profile-edit',      path: '/dashboard/profile/edit' },
];

test.describe.configure({ mode: 'serial' });

test('Public pages', async ({ page }) => {
  for (const route of PUBLIC_ROUTES) {
    await page.goto(route.path, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await page.screenshot({
      path: path.join(OUT_DIR, `${route.name}.png`),
      fullPage: true,
    });
  }
});

test('Authenticated pages', async ({ page }) => {
  const email = process.env.E2E_EMAIL ?? '';
  const password = process.env.E2E_PASSWORD ?? '';

  if (!email || !password) {
    test.skip(true, 'Set E2E_EMAIL và E2E_PASSWORD để chụp màn authenticated');
    return;
  }

  await page.goto('/login', { waitUntil: 'networkidle' });
  await page.getByPlaceholder(/email/i).fill(email);
  await page.getByPlaceholder(/mật khẩu|password/i).fill(password);
  await page.getByRole('button', { name: /đăng nhập|login/i }).click();
  await page.waitForURL(/dashboard/i, { timeout: 10000 });

  for (const route of AUTH_ROUTES) {
    await page.goto(route.path, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: path.join(OUT_DIR, `${route.name}.png`),
      fullPage: true,
    });
  }

  // Mobile viewport
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of AUTH_ROUTES) {
    await page.goto(route.path, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    await page.screenshot({
      path: path.join(OUT_DIR, `${route.name}-mobile.png`),
      fullPage: true,
    });
  }
});
