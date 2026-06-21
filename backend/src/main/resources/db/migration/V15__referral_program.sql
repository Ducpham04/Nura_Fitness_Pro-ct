-- V15: Referral Program (Beta invite system)

-- 1. Thêm cột vào users
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS referral_code   VARCHAR(12) UNIQUE,
    ADD COLUMN IF NOT EXISTS referred_by_id  BIGINT REFERENCES users(user_id),
    ADD COLUMN IF NOT EXISTS referral_count  INT NOT NULL DEFAULT 0;

-- 2. Sinh referral_code ngẫu nhiên 8 ký tự cho user hiện có
UPDATE users
SET referral_code = UPPER(SUBSTRING(REPLACE(gen_random_uuid()::TEXT, '-', ''), 1, 8))
WHERE referral_code IS NULL;

-- 3. NOT NULL sau khi backfill
ALTER TABLE users
    ALTER COLUMN referral_code SET NOT NULL;
