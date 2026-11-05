# Final report / Handoff — Portfolio hardening

Nhánh: `claude/awesome-archimedes-lo6k45` · PR: https://github.com/Ducpham04/Nura_Fitness_Pro-ct/pull/3 (Draft)
Tiến độ chi tiết: [CHECKLIST.md](CHECKLIST.md) · Lý do các quyết định: [DECISIONS.md](DECISIONS.md)

## 1. Đã xong (mỗi nhóm một commit)

| Commit | Nội dung | Kiểm chứng |
| --- | --- | --- |
| `fix: clean typecheck, lint errors and build warnings` | 4 lỗi tsc, toàn bộ lỗi ESLint, warning Tailwind; `/api/goals` 400 → 200; bật Flyway trong compose local (trước đó đăng ký lỗi 500 với `./dev.sh`); CI chạy typecheck + lint | `tsc` sạch, ESLint 0 lỗi, `vite build` không warning; Playwright quét console mọi route: 0 lỗi |
| `fix(responsive)` | Admin < 1024px không điều hướng được → drawer menu; `min-w-0` để bảng không kéo giãn trang | Playwright 375/768/1280, mọi route public/user/admin: không tràn, không phần tử bị cắt |
| `perf` | Ảnh WebP (5.5 MB → 190 KB), xoá ảnh 604 KB không dùng, `srcset`/lazy/`fetchpriority`, Sentry tải động (entry 233 → 160 KB khi bật Sentry), cache nginx cho ảnh | So sánh kích thước bundle |
| `feat(seo)` | Title/description/canonical/og:url/robots theo route, `noindex` cho trang riêng tư, `<html lang>` theo ngôn ngữ, favicon PNG/ICO, OG alt, GA qua `VITE_GA_ID`, tạo lại `icon-192.png` bị hỏng | Playwright kiểm tra title/canonical/robots từng route |
| `fix(a11y)` | Tên cho nút icon, label gắn input, landmark `<main>`/`<header>`, tương phản, thứ tự heading | axe-core 375 & 1280px: chỉ còn thẻ thành tích khoá (mờ có chủ đích) |
| `docs` | PRD, DESIGN, ARCHITECTURE (ERD mermaid, API, phân quyền), CHECKLIST, DECISIONS | — |
| `chore(security)` | Gỡ YouTube API key hardcode, secret dev rõ ràng, `.env.example` gốc + FE viết lại đúng stack | `git grep` không còn key |
| `fix(security)` | Thêm `/api/auth/refresh` (FE đã gọi, backend thiếu → mọi phiên tự hết sau 24h); chặn refresh token làm access token; upload chỉ ADMIN/EDITOR; sửa đăng ký 500 khi trùng họ tên | 9 integration test mới, **backend 22/22 pass** trên PostgreSQL mới |
| `test(e2e)` | Spec luồng chính (desktop + Pixel 7); sửa bug sai mật khẩu làm đóng modal và nuốt thông báo lỗi; modal có `role=dialog`, label, tên nút | Guard + SEO: 4/4 pass. Luồng đầy đủ: xem §2 |

## 2. Đang dở / chưa làm

- **E2E luồng đầy đủ chưa xanh hoàn toàn.** Lần chạy cuối đã đi qua đăng ký → onboarding → assessment → dashboard trên cả desktop và mobile, rồi dừng vì modal "Chào mừng" dành cho user mới che mất thanh điều hướng. Bước xử lý (bấm "Bắt đầu thiết lập ngay", và bỏ qua lỗi 401 cố ý của lần đăng nhập sai) **đã viết nhưng chưa chạy lại** vì hết thời gian.
- E2E chưa có trong CI.
- README chưa viết lại. Bản hiện tại (từ PR #1) đã có phần giới thiệu, tính năng, stack, cách chạy; còn thiếu ảnh chụp thật, tài khoản demo, bảng biến môi trường, link sang docs mới.
- `docs/TEST_PLAN.md` chưa có; tóm tắt nằm ở §3 bên dưới.
- PR vẫn ở trạng thái Draft.

## 3. Test (tóm tắt test plan)

| Tầng | File | Chạy | Kết quả |
| --- | --- | --- | --- |
| Unit | `PersonalizationResolverTest`, `NutritionSafetyResolverTest` (có sẵn) | `cd backend && ./mvnw test` | pass |
| Integration (Spring + PostgreSQL) | `security/AuthSecurityIntegrationTest`: đăng ký, đăng nhập, refresh, sai mật khẩu, upload theo role, IDOR, `/goals` rỗng | như trên (cần `SPRING_DATASOURCE_*`, `JWT_SECRET`) | 7/7 |
| Integration | `security/DuplicateNameRegistrationTest`: trùng họ tên, trùng email → 409 | như trên | 2/2 |
| E2E | `frontend/e2e/main-flow.spec.ts` | backend :8080 + DB đã seed Flyway, rồi `cd frontend && npx playwright test` | 4/6 (xem §2) |
| Audit thủ công tự động | Script Playwright quét console/tràn layout, axe-core | không commit (chạy trong phiên) | sạch |

## 4. Lỗi & rủi ro đã biết

1. **YouTube API key đã lộ trong lịch sử git** (`scripts/run_media_populate.py`). Cần **thu hồi key trên Google Cloud Console**. Code đã chuyển sang biến môi trường; mình không viết lại lịch sử (DECISIONS D11).
2. **Tài khoản admin seed** `admin@nura.vn` (Flyway V11) có bcrypt hash trong repo. Nếu mật khẩu yếu hoặc đã được chia sẻ, hãy đổi ngay trên production.
3. **Logout là stateless**: token không bị thu hồi phía server; refresh token sống 7 ngày. Cân nhắc lưu danh sách thu hồi hoặc phiên bản token trong DB.
4. 302 warning `no-explicit-any` (payload API ở FE chưa có kiểu), ghi nhận là nợ kỹ thuật (D3).
5. User thường gọi `/api/admin/**` hoặc upload nhận **401 thay vì 403** do handler hiện tại; không lộ dữ liệu nhưng sai ngữ nghĩa HTTP.
6. Profile `local` mặc định vẫn tắt Flyway khi chạy backend bằng IDE/`mvn`: phải đặt `SPRING_FLYWAY_ENABLED=true` (compose local đã bật sẵn).
7. Thẻ thành tích bị khoá ở trang Hồ sơ có độ tương phản thấp (cố ý làm mờ).

## 5. Bước tiếp theo cụ thể

1. Khởi động stack: `./dev.sh` (hoặc Postgres + `SPRING_FLYWAY_ENABLED=true ./mvnw spring-boot:run`), rồi chạy `cd frontend && npx playwright test`. Nếu kịch bản đầy đủ còn đỏ, xem `test-results/*/test-failed-1.png`.
2. Thêm job `e2e` vào `.github/workflows/ci.yml`: service Postgres, `./mvnw -DskipTests package && java -jar … &` với `SPRING_FLYWAY_ENABLED=true`, sau đó `npx playwright install --with-deps chromium && npx playwright test`.
3. Thu hồi YouTube key; đổi mật khẩu admin production.
4. README: thêm ảnh `docs/screenshots/` (chạy `npm run screenshot`), bảng tài khoản demo (tạo bằng seed riêng cho môi trường demo, không dùng tài khoản production), bảng biến môi trường, link sang `docs/`.
5. Viết `docs/TEST_PLAN.md` từ §3, chuyển PR sang Ready for review.

## 6. Đề xuất phiên bản tiếp theo

- Gõ kiểu API phía FE (sinh type từ OpenAPI bằng `openapi-typescript`) để gỡ `any`.
- Danh sách thu hồi token + trang "phiên đăng nhập" trong hồ sơ.
- Seed dữ liệu demo tiếng Việt (mục tiêu, giáo án, món ăn) cho môi trường demo, kèm tài khoản USER/EDITOR/ADMIN.
- Lighthouse CI trong pipeline để giữ điểm hiệu năng, SEO và a11y.

## 7. Gợi ý giá bán (tham khảo)

Dựa trên các gói đang có trong sản phẩm (Free / Plus / Pro, thanh toán VietQR):

| Gói | Giá gợi ý | Nội dung |
| --- | --- | --- |
| Free | 0đ | 25 lượt AI/tháng, giáo án + thực đơn cơ bản |
| Plus | 49.000–79.000đ/tháng | Lượt AI cao hơn, thực đơn theo ngân sách đầy đủ, chấm tư thế |
| Pro | 129.000–199.000đ/tháng | Không giới hạn hợp lý, AI Coach, ưu tiên tính năng mới |

Mức giá này cần kiểm chứng bằng dữ liệu chuyển đổi thật (funnel đã có trong trang Quản trị).
