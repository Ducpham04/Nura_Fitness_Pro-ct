-- =====================================================================
-- V4: Seed roles (bắt buộc — nếu thiếu, KHÔNG user nào đăng ký được)
-- Code hiện hardcode role_id:
--   - registerCustomer (POST /api/auth/register) dùng role_id = 5
--   - registerAdmin default role_id = 2
-- Authorization: /api/admin/** yêu cầu authority "ADMIN" (đúng role_name).
-- Seed các id được tham chiếu + reset sequence.
-- =====================================================================

INSERT INTO roles (role_id, role_name, description) VALUES
  (1, 'ADMIN', 'Quản trị viên hệ thống'),
  (2, 'USER',  'Người dùng tiêu chuẩn'),
  (5, 'USER',  'Khách hàng (đăng ký công khai)')
ON CONFLICT (role_id) DO NOTHING;

-- Đảm bảo sequence không cấp lại id đã seed
SELECT setval('roles_role_id_seq', (SELECT GREATEST(MAX(role_id), 5) FROM roles), true);
