// =====================================================================
// Prerender các trang công khai của SPA thành HTML tĩnh trong dist/
// để Google/Bing/Cốc Cốc đọc được nội dung ngay, không cần chạy JS.
//
// Chạy tự động sau `vite build` (script "postbuild" trong package.json):
//   1. Serve dist/ trên một port cục bộ (SPA fallback về index.html)
//   2. Mở từng route bằng Chromium headless (Playwright)
//   3. Ghi HTML đã render về dist/<route>/index.html
//      → nginx (try_files $uri $uri/ /index.html) tự phục vụ file này.
//
// Yêu cầu: npx playwright install chromium (đã có trong Dockerfile).
// =====================================================================
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const DIST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');
const ORIGIN = 'https://app.viway.id.vn';

// Route công khai + title/description riêng cho từng trang.
// (SPA không đổi document.title lúc chạy nên bake sẵn vào HTML tĩnh.)
const ROUTES = [
  {
    path: '/',
    // Giữ nguyên title/description gốc trong index.html
    title: null,
    description: null,
  },
  // /login, /register đã bỏ — auth dùng modal trên Landing, nginx 301 về "/"
  {
    path: '/privacy',
    title: 'Chính sách bảo mật — Viway',
    description: 'Chính sách bảo mật của Viway: cách chúng tôi thu thập, sử dụng và bảo vệ dữ liệu của bạn.',
  },
  {
    path: '/terms',
    title: 'Điều khoản sử dụng — Viway',
    description: 'Điều khoản sử dụng dịch vụ Viway — AI lập kế hoạch ăn và tập luyện.',
  },
];

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.webp': 'image/webp', '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.xml': 'application/xml', '.txt': 'text/plain',
};

// Server tĩnh tối giản: /api trả 401 ngay (để useAuth fail nhanh, không treo),
// file tĩnh theo $uri, còn lại fallback về index.html như nginx prod.
function startServer() {
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost').pathname;
    if (url.startsWith('/api/') || url.startsWith('/pose/')) {
      res.writeHead(401, { 'content-type': 'application/json' });
      res.end('{"error":"unauthenticated"}');
      return;
    }
    const filePath = path.join(DIST, decodeURIComponent(url));
    const target = existsSync(filePath) && !url.endsWith('/') ? filePath : path.join(DIST, 'index.html');
    try {
      const body = await readFile(target);
      res.writeHead(200, { 'content-type': MIME[path.extname(target)] || 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end();
    }
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

async function main() {
  if (!existsSync(path.join(DIST, 'index.html'))) {
    console.error('[prerender] dist/index.html không tồn tại — chạy `vite build` trước.');
    process.exit(1);
  }

  const { server, port } = await startServer();
  // --no-sandbox: bắt buộc khi chạy trong Docker build (user root);
  // chỉ render nội dung cục bộ của chính mình nên an toàn.
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });

  // Chặn request ra ngoài (analytics, fonts, Clarity, Sentry...) — vừa nhanh
  // vừa không bơm traffic ảo vào Google Analytics mỗi lần build.
  await context.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/, (route) => route.abort());

  for (const { path: routePath, title, description } of ROUTES) {
    const page = await context.newPage();
    try {
      await page.goto(`http://127.0.0.1:${port}${routePath}`, { waitUntil: 'networkidle', timeout: 30_000 });
      // Chờ React mount xong (root có nội dung thật)
      await page.waitForFunction(
        () => (document.getElementById('root')?.innerText || '').trim().length > 50,
        { timeout: 15_000 },
      );
      await page.waitForTimeout(1_000); // cho lazy content/animation kịp gắn vào DOM

      await page.evaluate(({ title, description, canonical }) => {
        if (title) document.title = title;
        if (description) {
          document.querySelector('meta[name="description"]')?.setAttribute('content', description);
          document.querySelector('meta[property="og:description"]')?.setAttribute('content', description);
        }
        document.querySelector('link[rel="canonical"]')?.setAttribute('href', canonical);
        document.querySelector('meta[property="og:url"]')?.setAttribute('content', canonical);
        // Bỏ style ẩn của animation (framer-motion để opacity:0 với phần tử
        // chưa vào viewport) — Google bỏ qua text vô hình trong HTML tĩnh.
        document.querySelectorAll('[style*="opacity: 0"], [style*="opacity:0"]').forEach((el) => {
          el.style.opacity = '';
          el.style.transform = '';
        });
      }, { title, description, canonical: `${ORIGIN}${routePath === '/' ? '/' : routePath}` });

      const html = '<!doctype html>\n' + (await page.evaluate(() => document.documentElement.outerHTML));
      const outFile = routePath === '/'
        ? path.join(DIST, 'index.html')
        : path.join(DIST, routePath.slice(1), 'index.html');
      await mkdir(path.dirname(outFile), { recursive: true });
      await writeFile(outFile, html, 'utf8');
      console.log(`[prerender] ✓ ${routePath} → ${path.relative(DIST, outFile)} (${(html.length / 1024).toFixed(0)} KB)`);
    } catch (err) {
      // Trang lỗi thì giữ nguyên SPA fallback cho route đó, không phá build
      console.error(`[prerender] ✗ ${routePath}: ${err.message}`);
      process.exitCode = routePath === '/' ? 1 : process.exitCode; // trang chủ bắt buộc phải thành công
    } finally {
      await page.close();
    }
  }

  await browser.close();
  server.close();
}

main().catch((err) => {
  console.error('[prerender] lỗi:', err);
  process.exit(1);
});
