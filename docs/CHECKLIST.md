# Checklist — Portfolio hardening

Thứ tự ưu tiên từ trên xuống. Tick `[x]` khi xong và đã kiểm chứng.

## P0 — Chạy được end-to-end
- [x] Frontend `tsc` sạch (sửa 4 lỗi type)
- [x] ESLint 0 lỗi (còn warning `any`, xem DECISIONS D3)
- [x] Build Vite không còn warning (Tailwind class mơ hồ)
- [x] Backend build + chạy với PostgreSQL, Flyway seed
- [x] `./dev.sh` đăng ký được user (bật Flyway trong compose local)
- [x] `/api/goals` không còn 400 trên DB mới
- [x] Không còn lỗi/warning console trên mọi route (public, user, admin)
- [x] CI chạy typecheck + lint + build

## P1 — Trải nghiệm & chất lượng hiển thị
- [x] Responsive 375/768/1280 cho mọi route; admin có drawer menu < 1024px
- [x] Ảnh WebP + kích thước đúng (5.5 MB → 190 KB), xoá ảnh không dùng
- [x] Lazy-load ảnh dưới màn hình, `srcset` cho ảnh Unsplash, `fetchpriority` cho ảnh LCP
- [x] Sentry tải động (entry −73 KB khi bật Sentry)
- [x] Route lazy-load (đã có sẵn)
- [x] SEO: title/description/canonical/robots theo route, OG/Twitter alt, favicon PNG/ICO
- [x] GA chỉ bật khi có `VITE_GA_ID`
- [x] Accessibility: tên nút icon, label input, landmark, tương phản, thứ tự heading

## P2 — Tài liệu (vai trò BA / UX / Architect / PM)
- [x] docs/PRD.md
- [x] docs/DESIGN.md
- [x] docs/ARCHITECTURE.md
- [x] docs/CHECKLIST.md
- [x] docs/DECISIONS.md
- [x] Commit + push + mở Draft PR

## P3 — Bảo mật & secret
- [x] Gỡ YouTube API key hardcode → `YOUTUBE_API_KEY` (**key cũ vẫn trong git history — chủ repo phải thu hồi**)
- [x] Mật khẩu/secret trong compose & properties chỉ còn giá trị dev rõ ràng, đọc từ env
- [x] `.env.example` gốc khớp stack thật (PostgreSQL), đủ biến; `frontend/.env.example` đủ `VITE_*`
- [x] Upload file yêu cầu ADMIN/EDITOR (trước đây ẩn danh upload được)
- [x] Endpoint `/api/auth/refresh` (FE đã gọi nhưng backend thiếu) + xoay vòng token
- [x] Chặn dùng refresh token như access token (tường minh)
- [x] Xác minh chặn IDOR `/api/v1/users/{id}/*` (đã có sẵn, có test)
- [x] Sửa đăng ký lỗi 500 khi trùng họ tên (`username` UNIQUE)
- [x] Rà SQL injection (chỉ query tham số hoá), CORS whitelist

## P4 — QA
- [x] Test backend: `AuthSecurityIntegrationTest` (7), `DuplicateNameRegistrationTest` (2) — **22/22 pass**
- [x] Playwright e2e `main-flow.spec.ts` (desktop + mobile)
- [x] Sửa bug do e2e phát hiện: sai mật khẩu làm đóng modal, không hiện lỗi
- [x] Modal đăng nhập: `role=dialog`, label gắn input, nút hiện mật khẩu có tên
- [ ] **ĐANG DỞ** — e2e kịch bản đầy đủ: đã chạy tới dashboard trên cả 2 project; xử lý modal "Chào mừng" cho user mới + lọc 401 có chủ đích đã viết nhưng **chưa chạy lại xác nhận**. Kịch bản guard + SEO: 4/4 pass.
- [ ] Đưa e2e vào CI (cần job có Postgres + backend + Chromium)
- [ ] docs/TEST_PLAN.md đầy đủ (hiện tóm tắt trong FINAL_REPORT §3)

## P5 — Tài liệu cuối
- [ ] README viết lại (README hiện tại từ PR #1 đã có giới thiệu/tính năng/stack/cách chạy; còn thiếu: ảnh chụp thật, tài khoản demo, bảng biến môi trường, link docs mới)
- [x] docs/FINAL_REPORT.md (kiêm handoff)
- [ ] Chuyển PR sang Ready for review (sau khi e2e đầy đủ xanh)

## Việc tiếp theo (theo thứ tự)
1. Chạy lại e2e: `cd frontend && npx playwright test` (backend :8080 + Postgres đã seed Flyway). Sửa nếu đỏ.
2. Thu hồi YouTube API key bị lộ trên Google Cloud Console; đổi mật khẩu admin seed `admin@nura.vn` trên production.
3. Thêm job e2e vào `.github/workflows/ci.yml`.
4. Viết lại README theo mục P5, chụp ảnh `docs/screenshots/`.
5. Viết docs/TEST_PLAN.md, chuyển PR sang Ready.
