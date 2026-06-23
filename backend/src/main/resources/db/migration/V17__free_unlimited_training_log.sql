-- V17: Bỏ giới hạn ghi log tập luyện cho gói FREE (giữ nguyên nutrition log limit)
-- Lý do: limit 3 lần/ngày cho core flow (log bài tập) gây frustration — user tập 4+ bài/ngày bị kẹt
UPDATE ai_packages
SET max_training_log_per_day = -1
WHERE code = 'FREE';
