import { test, expect } from '@playwright/test';

const TEST_USER = {
  email: process.env.E2E_EMAIL ?? 'test@fitnit.vn',
  password: process.env.E2E_PASSWORD ?? 'Test@123',
};

test.describe('Authentication', () => {
  test('trang login hiển thị đúng', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /đăng nhập|login/i })).toBeVisible();
    await expect(page.getByPlaceholder(/email/i)).toBeVisible();
    await expect(page.getByPlaceholder(/mật khẩu|password/i)).toBeVisible();
  });

  test('login với credentials sai → báo lỗi', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder(/email/i).fill('wrong@email.com');
    await page.getByPlaceholder(/mật khẩu|password/i).fill('wrongpass');
    await page.getByRole('button', { name: /đăng nhập|login/i }).click();
    await expect(page.getByText(/sai|không đúng|invalid|incorrect/i)).toBeVisible({ timeout: 5000 });
  });

  test('login thành công → redirect dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder(/email/i).fill(TEST_USER.email);
    await page.getByPlaceholder(/mật khẩu|password/i).fill(TEST_USER.password);
    await page.getByRole('button', { name: /đăng nhập|login/i }).click();
    await expect(page).toHaveURL(/dashboard|home/i, { timeout: 10000 });
  });

  test('logout → redirect về login', async ({ page }) => {
    // Login trước
    await page.goto('/login');
    await page.getByPlaceholder(/email/i).fill(TEST_USER.email);
    await page.getByPlaceholder(/mật khẩu|password/i).fill(TEST_USER.password);
    await page.getByRole('button', { name: /đăng nhập|login/i }).click();
    await page.waitForURL(/dashboard|home/i, { timeout: 10000 });

    // Logout
    await page.getByRole('button', { name: /đăng xuất|logout/i }).click();
    await expect(page).toHaveURL(/login/i, { timeout: 5000 });
  });
});
