-- =====================================================================
-- V11: Seed tài khoản ADMIN cho production.
--   role_id = 1 (ADMIN) — khớp seed V4 và check hasAuthority("ADMIN").
--   username = email để đảm bảo UNIQUE (cột username có ràng buộc unique).
--   Mật khẩu lưu dạng bcrypt ($2y, BCryptPasswordEncoder chấp nhận).
--   ⚠️ ĐỔI MẬT KHẨU ngay sau lần đăng nhập đầu tiên.
-- Idempotent: chỉ tạo nếu chưa tồn tại user với email này.
-- =====================================================================
INSERT INTO users (email, username, full_name, password, role_id, is_active, points, level_points, created_at, updated_at)
SELECT 'admin@nura.vn', 'admin@nura.vn', 'Administrator',
       '$2y$10$yTZCTym8bQyxWDYAnRWby.V7Pe5MWayhvXyzXi.tVal9XDpzZqz3i',
       1, 'active', 0, 0, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@nura.vn');
