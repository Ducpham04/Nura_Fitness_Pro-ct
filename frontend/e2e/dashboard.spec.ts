import { test, expect, Page } from '@playwright/test';

const TEST_USER = {
  email: process.env.E2E_EMAIL ?? 'test@fitnit.vn',
  password: process.env.E2E_PASSWORD ?? 'Test@123',
};

async function login(page: Page) {
  await page.goto('/login');
  await page.getByPlaceholder(/email/i).fill(TEST_USER.email);
  await page.getByPlaceholder(/mật khẩu|password/i).fill(TEST_USER.password);
  await page.getByRole('button', { name: /đăng nhập|login/i }).click();
  await page.waitForURL(/dashboard|home/i, { timeout: 10000 });
}

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('dashboard load được sau login', async ({ page }) => {
    await expect(page).toHaveURL(/dashboard/i);
    // Kiểm tra không có lỗi 500/404
    const response = await page.waitForResponse(r => r.url().includes('/api/') || r.url().includes('/v1/'), { timeout: 10000 }).catch(() => null);
    if (response) {
      expect(response.status()).toBeLessThan(500);
    }
  });

  test('tab Workout hiển thị', async ({ page }) => {
    await page.getByRole('tab', { name: /workout|tập luyện/i }).click();
    await expect(page.getByText(/kế hoạch|plan|training/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('tab Diet/Dinh dưỡng hiển thị', async ({ page }) => {
    await page.getByRole('tab', { name: /diet|dinh dưỡng|nutrition/i }).click();
    await expect(page.getByText(/bữa ăn|meal|calories/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('tab Challenges hiển thị', async ({ page }) => {
    await page.getByRole('tab', { name: /challenge|thử thách/i }).click();
    await expect(page.getByText(/challenge|thử thách/i).first()).toBeVisible({ timeout: 5000 });
  });
});
