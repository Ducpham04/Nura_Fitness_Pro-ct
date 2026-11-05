import { test, expect, type Page, type ConsoleMessage } from '@playwright/test';

/**
 * Luồng chính end-to-end trên stack thật (backend + PostgreSQL):
 *   Landing → Đăng ký (modal) → Onboarding 3 bước → Đánh giá thể trạng → Dashboard
 *   → điều hướng các tab → Đăng xuất → Đăng nhập lại.
 * Mỗi lần chạy tạo một tài khoản mới nên không phụ thuộc dữ liệu có sẵn.
 */

const PASSWORD = 'Viway@2026';

// Lỗi do môi trường (font/analytics/ảnh CDN bị chặn) không phải lỗi app.
const EXTERNAL = /fonts\.g|googletagmanager|google-analytics|clarity|unsplash|ERR_TUNNEL|ERR_FAILED|ERR_NAME_NOT_RESOLVED|ERR_CONNECTION/;

function collectConsoleErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', (m: ConsoleMessage) => {
    const where = m.location()?.url ?? '';
    // 401 của lần đăng nhập sai mật khẩu là có chủ đích (trình duyệt luôn log lỗi mạng)
    const expected401 = /status of 401/.test(m.text()) && /\/api\/auth\/login/.test(where);
    if (m.type() === 'error' && !expected401 && !EXTERNAL.test(m.text() + where)) errors.push(`${m.text()} @ ${where}`);
  });
  page.on('pageerror', e => errors.push(e.message));
  return errors;
}

async function blockThirdParty(page: Page) {
  await page.route(EXTERNAL, r => r.abort());
}

function newEmail(projectName: string) {
  return `e2e-${projectName}-${Date.now()}-${Math.floor(Math.random() * 1e4)}@viway.test`;
}

async function openAuthModal(page: Page, tab: 'register' | 'login') {
  await page.goto(tab === 'register' ? '/register' : '/login'); // redirect về "/" và mở đúng tab
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('dialog')).toBeVisible();
}

test.describe('Luồng chính', () => {
  test('đăng ký → onboarding → dashboard → điều hướng → đăng xuất → đăng nhập', async ({ page }, info) => {
    await blockThirdParty(page);
    const errors = collectConsoleErrors(page);
    const email = newEmail(info.project.name);

    // ── Đăng ký ────────────────────────────────────────────────
    await openAuthModal(page, 'register');
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Họ tên').or(dialog.locator('#register-name')).fill('Người Dùng E2E');
    await dialog.locator('#register-email').fill(email);
    await dialog.locator('#register-password').fill(PASSWORD);
    await dialog.locator('#register-confirm').fill(PASSWORD);
    await dialog.locator('#modal-terms').check();
    await dialog.locator('button[type="submit"]').click();

    // ── Onboarding ─────────────────────────────────────────────
    await expect(page).toHaveURL(/\/onboarding$/, { timeout: 15_000 });
    await expect(page).toHaveTitle(/Thiết lập hồ sơ — Viway/);
    await page.getByRole('button', { name: /Nam/ }).click();
    await page.getByRole('button', { name: /Tiếp tục/ }).click();

    await expect(page.getByRole('heading', { name: /Bạn muốn đạt được điều gì/ })).toBeVisible();
    await page.locator('main button').filter({ hasText: /giảm|tăng|cơ|cân|khoẻ|khỏe/i }).first().click();
    await page.getByRole('button', { name: /Tiếp tục/ }).click();

    await expect(page.getByRole('heading', { name: /Mức độ vận động/ })).toBeVisible();
    await page.getByRole('button', { name: /Vận động đều/ }).click();
    await page.getByRole('button', { name: /Tạo kế hoạch cho tôi/ }).click();

    // ── Đánh giá thể trạng → Welcome → Dashboard ───────────────
    await expect(page).toHaveURL(/\/assessment$/, { timeout: 15_000 });
    await expect(page.getByText(/BMI/).first()).toBeVisible();
    await page.locator('button').filter({ hasText: /tiếp|bắt đầu|dashboard/i }).last().click();
    await expect(page).toHaveURL(/\/welcome$/);
    await page.locator('button').filter({ hasText: /bắt đầu|vào|tiếp/i }).first().click();
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });
    await expect(page).toHaveTitle(/Hôm nay — Viway/);

    // User mới thấy modal "Chào mừng" mời thiết lập dinh dưỡng/luyện tập (thiết kế có chủ đích)
    const setupCta = page.getByRole('button', { name: /Bắt đầu thiết lập ngay/ });
    if (await setupCta.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await setupCta.click();
      await expect(setupCta).toBeHidden();
    }

    // ── Điều hướng các tab chính ───────────────────────────────
    for (const [path, title] of [
      ['/dashboard/workout', /Tập luyện — Viway/],
      ['/dashboard/diet', /Dinh dưỡng — Viway/],
      ['/dashboard/coach', /AI Coach — Viway/],
      ['/dashboard/profile', /Hồ sơ — Viway/],
    ] as const) {
      await page.locator(`a[href="${path}"]:visible`).first().click();
      await expect(page).toHaveURL(new RegExp(`${path}$`));
      await expect(page).toHaveTitle(title);
    }

    // ── Đăng xuất ──────────────────────────────────────────────
    await page.getByRole('button', { name: 'Đăng xuất' }).filter({ visible: true }).first().click();
    await expect(page).not.toHaveURL(/\/dashboard/, { timeout: 10_000 });

    // ── Đăng nhập lại: sai mật khẩu rồi đúng mật khẩu ──────────
    await openAuthModal(page, 'login');
    const login = page.getByRole('dialog');
    await login.locator('#login-email').fill(email);
    await login.locator('#login-password').fill('sai-mat-khau');
    await login.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/$/);
    await expect(login.getByText(/sai|không đúng|không hợp lệ|invalid|incorrect/i).first()).toBeVisible({ timeout: 10_000 });

    await login.locator('#login-password').fill(PASSWORD);
    await login.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 15_000 });

    expect(errors, `console errors:\n${errors.join('\n')}`).toEqual([]);
  });

  test('route riêng tư chặn người chưa đăng nhập', async ({ page }) => {
    await blockThirdParty(page);
    await page.goto('/dashboard/diet');
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('dialog')).toBeVisible(); // modal đăng nhập
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/$/);
  });

  test('trang công khai có SEO meta và không lỗi console', async ({ page }) => {
    await blockThirdParty(page);
    const errors = collectConsoleErrors(page);
    for (const [path, title] of [
      ['/', /Viway — AI lập kế hoạch ăn & tập/],
      ['/privacy', /Chính sách bảo mật — Viway/],
      ['/terms', /Điều khoản sử dụng — Viway/],
    ] as const) {
      await page.goto(path);
      await expect(page).toHaveTitle(title);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', new RegExp(`${path === '/' ? '/' : path}$`));
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /^index/);
      await expect(page.locator('main')).toHaveCount(1);
    }
    expect(errors).toEqual([]);
  });
});
