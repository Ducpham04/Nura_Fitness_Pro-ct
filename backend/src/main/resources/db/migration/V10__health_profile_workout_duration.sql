-- V10: thêm thời lượng buổi tập mong muốn vào health_profile
-- Để onboarding hỏi "bao nhiêu phút/buổi" và AI workout tôn trọng ràng buộc đó
-- thay vì luôn mặc định 45 phút.
ALTER TABLE health_profile
    ADD COLUMN IF NOT EXISTS preferred_workout_duration_minutes INT;
