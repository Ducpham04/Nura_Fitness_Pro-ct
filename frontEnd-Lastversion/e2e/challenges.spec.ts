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

test.describe('Challenges', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.getByRole('tab', { name: /challenge|thử thách/i }).click();
  });

  test('danh sách challenges load được', async ({ page }) => {
    await expect(page.getByText(/challenge|thử thách/i).first()).toBeVisible({ timeout: 8000 });
    // Không có lỗi "không tải được"
    const errorText = page.getByText(/lỗi|error|failed|500/i);
    await expect(errorText).not.toBeVisible();
  });

  test('mở chi tiết challenge', async ({ page }) => {
    const firstChallenge = page.getByRole('button', { name: /xem|chi tiết|join|tham gia/i }).first();
    if (await firstChallenge.isVisible({ timeout: 5000 }).catch(() => false)) {
      await firstChallenge.click();
      await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 });
    }
  });
});
