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
- [ ] Gỡ YouTube API key hardcode → `YOUTUBE_API_KEY`
- [ ] Mật khẩu/secret trong compose & properties chỉ còn giá trị dev rõ ràng, đọc từ env
- [ ] `.env.example` gốc khớp stack thật (PostgreSQL), đủ biến
- [ ] Upload file yêu cầu đăng nhập
- [ ] Endpoint `/api/auth/refresh` (FE đã gọi nhưng backend thiếu)
- [ ] Xác minh chặn IDOR `/api/v1/users/{id}/*`

## P4 — QA
- [ ] docs/TEST_PLAN.md
- [ ] Test backend cho refresh token & phân quyền upload
- [ ] Playwright e2e luồng chính: đăng ký → onboarding → dashboard → điều hướng tab
- [ ] Tất cả test pass (backend `mvn test`, e2e)

## P5 — Tài liệu cuối
- [ ] README: giới thiệu, tính năng, ảnh chụp, sơ đồ, cách chạy, tài khoản demo, deploy
- [ ] docs/FINAL_REPORT.md
- [ ] Chuyển PR sang Ready for review
