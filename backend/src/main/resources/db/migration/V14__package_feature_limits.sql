-- V14: Giới hạn tính năng theo gói (swap, log, challenge)

-- ── 1. Thêm cột giới hạn vào ai_packages ──────────────────────────────────────
ALTER TABLE ai_packages
    ADD COLUMN IF NOT EXISTS max_exercise_swap_per_month INT  NOT NULL DEFAULT -1,
    ADD COLUMN IF NOT EXISTS max_meal_swap_per_month     INT  NOT NULL DEFAULT -1,
    ADD COLUMN IF NOT EXISTS max_training_log_per_day    INT  NOT NULL DEFAULT -1,
    ADD COLUMN IF NOT EXISTS max_nutrition_log_per_day   INT  NOT NULL DEFAULT -1,
    ADD COLUMN IF NOT EXISTS can_join_challenges         BOOL NOT NULL DEFAULT FALSE;

-- ── 2. Cập nhật giá trị từng gói ──────────────────────────────────────────────
UPDATE ai_packages SET
    max_exercise_swap_per_month = 5,
    max_meal_swap_per_month     = 5,
    max_training_log_per_day    = 3,
    max_nutrition_log_per_day   = 3,
    can_join_challenges         = FALSE
WHERE code = 'FREE';

UPDATE ai_packages SET
    max_exercise_swap_per_month = 20,
    max_meal_swap_per_month     = 20,
    max_training_log_per_day    = -1,
    max_nutrition_log_per_day   = -1,
    can_join_challenges         = TRUE
WHERE code = 'PLUS';

UPDATE ai_packages SET
    max_exercise_swap_per_month = -1,
    max_meal_swap_per_month     = -1,
    max_training_log_per_day    = -1,
    max_nutrition_log_per_day   = -1,
    can_join_challenges         = TRUE
WHERE code = 'PRO';

-- ── 3. Thêm cột tracking swap / log vào users ──────────────────────────────────
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS exercise_swap_used  INT  NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS meal_swap_used      INT  NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS swap_reset_at       TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS training_log_today  INT  NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS nutrition_log_today INT  NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS log_reset_date      DATE;

-- ── 4. Thêm reward_type vào rewards ───────────────────────────────────────────
ALTER TABLE rewards
    ADD COLUMN IF NOT EXISTS reward_type VARCHAR(20) NOT NULL DEFAULT 'PHYSICAL';
-- PHYSICAL = quà vật lý / voucher
-- CREDIT   = quy đổi credit AI (credit_value chứa số credit được cộng)

ALTER TABLE rewards
    ADD COLUMN IF NOT EXISTS credit_value INT NOT NULL DEFAULT 0;
-- Số credit AI được cộng khi đổi phần thưởng loại CREDIT (tỉ lệ 100 điểm = 10 credit)
