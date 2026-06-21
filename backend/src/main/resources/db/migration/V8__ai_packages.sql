-- V8: AI Package System
-- Tạo bảng gói AI và thêm cột AI vào users

-- ── 1. Bảng gói AI ────────────────────────────────────────────────────────────
CREATE TABLE ai_packages (
    id            BIGSERIAL PRIMARY KEY,
    code          VARCHAR(20)  NOT NULL UNIQUE,   -- FREE | PLUS | PRO
    name          VARCHAR(100) NOT NULL,
    ai_quota      INT          NOT NULL,           -- credit/tháng; -1 = vô hạn
    price_vnd     INT          NOT NULL DEFAULT 0,
    duration_days INT          NOT NULL DEFAULT 30,
    is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
    sort_order    INT          NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── 2. Seed 3 gói cơ bản ──────────────────────────────────────────────────────
INSERT INTO ai_packages (code, name, ai_quota, price_vnd, duration_days, sort_order) VALUES
    ('FREE', 'Gói Miễn Phí',   20,  0,      30, 1),
    ('PLUS', 'Gói Plus',       150, 49000,  30, 2),
    ('PRO',  'Gói Pro',        500, 99000,  30, 3);

-- ── 3. Bảng mã khuyến mãi ─────────────────────────────────────────────────────
CREATE TABLE ai_promo_codes (
    id                BIGSERIAL    PRIMARY KEY,
    code              VARCHAR(50)  NOT NULL UNIQUE,
    description       VARCHAR(255),
    target_package_id BIGINT       REFERENCES ai_packages(id),  -- NULL = tặng credit
    bonus_credits     INT          NOT NULL DEFAULT 0,           -- credit thêm khi dùng code
    discount_percent  INT          NOT NULL DEFAULT 0,           -- % giảm giá gói
    max_uses          INT,                                       -- NULL = không giới hạn
    used_count        INT          NOT NULL DEFAULT 0,
    valid_from        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    valid_until       TIMESTAMPTZ,                              -- NULL = không hết hạn
    is_active         BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── 4. Thêm cột AI vào users ───────────────────────────────────────────────────
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS ai_package_id        BIGINT       REFERENCES ai_packages(id),
    ADD COLUMN IF NOT EXISTS ai_quota             INT          NOT NULL DEFAULT 25,
    ADD COLUMN IF NOT EXISTS ai_used              INT          NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS ai_reset_at          TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS ai_package_expires_at TIMESTAMPTZ;

-- ── 5. Backfill: gán gói FREE cho tất cả user hiện có ──────────────────────────
DO $$
DECLARE
    free_id BIGINT;
BEGIN
    SELECT id INTO free_id FROM ai_packages WHERE code = 'FREE';

    UPDATE users
    SET
        ai_package_id = free_id,
        ai_quota      = 25,
        ai_used       = 0,
        ai_reset_at   = NOW() + INTERVAL '30 days'
    WHERE ai_package_id IS NULL;
END $$;
