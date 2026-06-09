-- Cộng BÙ điểm thưởng cho các thử thách user ĐÃ hoàn thành (SUCCESS) trước khi
-- có cơ chế cộng điểm vào ví. Idempotent nhờ cờ points_awarded:
--   · migration này cộng & đánh dấu các bài SUCCESS chưa cộng
--   · cơ chế cộng điểm đi tới (awardRewardPointsOnce) cũng dựa vào cờ này
--     → không bao giờ cộng trùng.

ALTER TABLE public.user_challenges ADD COLUMN IF NOT EXISTS points_awarded boolean DEFAULT false;

-- 1) Cộng tổng reward_points của các bài SUCCESS CHƯA cộng vào:
--    · points       (ví tiêu được — để đổi thưởng)
--    · level_points (XP/level — V6 đã backfill = points cho user cũ)
WITH to_award AS (
    SELECT uc.user_id AS uid, COALESCE(SUM(c.reward_points), 0) AS pts
    FROM public.user_challenges uc
    JOIN public.challenges c ON c.challenge_id = uc.challenge_id
    WHERE uc.status = 'SUCCESS' AND uc.points_awarded IS NOT TRUE
    GROUP BY uc.user_id
)
UPDATE public.users u
SET points       = COALESCE(u.points, 0) + ta.pts,
    level_points = COALESCE(u.level_points, COALESCE(u.points, 0)) + ta.pts
FROM to_award ta
WHERE u.user_id = ta.uid AND ta.pts > 0;

-- 2) Đánh dấu các bài SUCCESS đã được cộng (gồm cả bài reward_points = 0)
UPDATE public.user_challenges
SET points_awarded = true
WHERE status = 'SUCCESS' AND points_awarded IS NOT TRUE;
