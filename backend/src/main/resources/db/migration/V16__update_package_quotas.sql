-- V16: Điều chỉnh quota gói AI về giá trị launch
UPDATE ai_packages SET ai_quota = 20  WHERE code = 'FREE';
UPDATE ai_packages SET ai_quota = 150 WHERE code = 'PLUS';
UPDATE ai_packages SET ai_quota = 500 WHERE code = 'PRO';
