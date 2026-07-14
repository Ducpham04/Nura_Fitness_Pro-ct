-- Attribution nguồn đăng ký: utm_source / referrer host / 'direct'
-- FE capture ở landing page, gửi kèm khi register. User cũ = NULL (không rõ nguồn).
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS signup_source VARCHAR(60);

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS signup_campaign VARCHAR(80);
