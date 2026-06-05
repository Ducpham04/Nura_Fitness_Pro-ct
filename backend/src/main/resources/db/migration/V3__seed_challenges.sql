-- =====================================================================
-- V3: Seed challenges (thử thách thể lực)
-- Dữ liệu nền để tab "Thử thách" có nội dung thật cho người dùng tham gia.
-- status hợp lệ: ACTIVE / INACTIVE / DRAFT / COMPLETED (enum Challenges.Status)
-- start_date = hôm nay, end_date = hôm nay + duration_days.
-- =====================================================================

INSERT INTO challenges (title, description, duration_days, reward_points, reward, status, start_date, end_date, created_at, updated_at)
VALUES
  ('100 Hít đất',          'Hoàn thành 100 lần hít đất đúng form trong một buổi. Rèn sức mạnh thân trên và cơ lõi.',      7,  500,  '500 điểm + huy hiệu Đồng',  'ACTIVE', CURRENT_DATE, CURRENT_DATE + 7,  now(), now()),
  ('Thử thách Plank 30 ngày','Mỗi ngày giữ plank, tăng dần thời gian. Sau 30 ngày chinh phục mốc 5 phút.',                30, 800,  '800 điểm + huy hiệu Bạc',   'ACTIVE', CURRENT_DATE, CURRENT_DATE + 30, now(), now()),
  ('200 Squat tốc độ',     'Hoàn thành 200 squat đúng form trong dưới 12 phút. Bùng nổ sức mạnh thân dưới.',             14, 750,  '750 điểm + huy hiệu Bạc',   'ACTIVE', CURRENT_DATE, CURRENT_DATE + 14, now(), now()),
  ('Chạy bộ 5KM',          'Hoàn thành quãng đường 5km. Phù hợp người mới bắt đầu rèn sức bền tim mạch.',                 7,  600,  '600 điểm + huy hiệu Đồng',  'ACTIVE', CURRENT_DATE, CURRENT_DATE + 7,  now(), now()),
  ('50 Burpee mỗi ngày',   'Thử thách 21 ngày: mỗi ngày 50 burpee. Đốt mỡ toàn thân, tăng thể lực vượt trội.',           21, 1000, '1000 điểm + huy hiệu Vàng', 'ACTIVE', CURRENT_DATE, CURRENT_DATE + 21, now(), now());
