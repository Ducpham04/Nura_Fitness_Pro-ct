-- =====================================================================
-- V5: Thêm cột ảnh bìa cho challenges
-- Cho phép admin upload ảnh minh hoạ cho thử thách.
-- =====================================================================

ALTER TABLE challenges ADD COLUMN IF NOT EXISTS image_url varchar(500);
