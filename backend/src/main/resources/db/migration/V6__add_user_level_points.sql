-- Tách "điểm tiêu được" (points — ví đổi thưởng) khỏi "XP/level" (level_points).
-- level_points CHỈ tăng khi tích luỹ → đổi thưởng (trừ points) không làm tụt level.

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS level_points integer;

-- Backfill: user hiện có lấy level_points = points hiện tại để GIỮ NGUYÊN level
-- (trước đây level được tính trực tiếp từ points).
UPDATE public.users SET level_points = COALESCE(points, 0) WHERE level_points IS NULL;
