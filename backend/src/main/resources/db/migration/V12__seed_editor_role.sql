-- =====================================================================
-- V12: Seed role EDITOR (biên tập viên nội dung).
--   role_id = 3 — chưa dùng (V4 seed 1=ADMIN, 2=USER, 5=USER).
--   Authority = role_name (CustomUserDetailService) → quyền "EDITOR".
--   EDITOR chỉ được thao tác các endpoint NHẬP LIỆU nội dung
--   (/api/admin/exercises, /dishes, /training-plans, /training-plan-details)
--   — KHÔNG truy cập users / ai / data-seeder / transactions / rewards.
--   Phân quyền chi tiết nằm ở SecurityConfig (đặt trước rule /api/admin/**).
-- Idempotent: ON CONFLICT DO NOTHING + reset sequence như V4.
-- =====================================================================
INSERT INTO roles (role_id, role_name, description) VALUES
  (3, 'EDITOR', 'Biên tập viên nội dung (bài tập, món ăn, giáo án)')
ON CONFLICT (role_id) DO NOTHING;

-- Giữ sequence không cấp lại id đã seed (đồng bộ với V4)
SELECT setval('roles_role_id_seq', (SELECT GREATEST(MAX(role_id), 5) FROM roles), true);
