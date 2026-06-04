# Thiết kế: Đo lại thể trạng → Tính lại → Dự đoán tiến độ

> Tài liệu thiết kế (chưa code). Mục tiêu: nối hoàn chỉnh **vòng lặp thông minh** —
> người dùng cập nhật số đo định kỳ → hệ thống tính lại chỉ số & mục tiêu → sinh lại
> kế hoạch & **dự đoán tiến độ**. Đây là phần lõi tạo giá trị "AI" cho sản phẩm.

---

## 1. Bối cảnh & hiện trạng

### Đã có sẵn (tận dụng được)
- **Entity `BodyMetricHistory`** + `BodyMetricHistoryRepository`
  (`findByUserIdOrderByRecordedAtDesc`, `findByUserIdAndDateRange`, `findLatestByUserId`).
- **`POST /api/user/body-metric`** (`BodyMetricHistoryController.createBodyMetric`):
  khi lưu 1 bản đo, backend **tự tính** BMI, BMR (Mifflin-St Jeor), TDEE, tỉ lệ eo/hông
  qua `BodyMetricsCalculator` và lưu kèm timestamp `recordedAt`.
- **`GET /api/user/body-metric`** (toàn bộ / theo `from`–`to`) và **`/latest`**.
- **FE**: `userService.getBodyMetricHistory()` (đã thêm) + `TrendChart` đọc dữ liệu này
  để vẽ biểu đồ xu hướng cân nặng.
- **"AI thích ứng" tuần tập** (`autoRegulateNextWeek`): điều chỉnh tuần tập kế tiếp
  dựa trên log buổi tập (mệt mỏi / RPE / giấc ngủ).

### Còn thiếu (3 mảnh cần nối)
1. **UI nhập số đo định kỳ** — FE **chưa bao giờ** gọi `POST /api/user/body-metric`.
   Trang sửa hồ sơ (`ProfileEditPage` → `POST /user/profile/body`) chỉ **ghi đè**
   `UserBodyProfile` hiện tại, **không tạo mốc lịch sử** → biểu đồ xu hướng gần như luôn rỗng.
2. **Tự tính lại & sinh lại kế hoạch** — đổi thể trạng không đẩy TDEE mới vào thực đơn/giáo án.
3. **Dự đoán tiến độ** — chưa có bất kỳ logic forecast/ETA nào.

---

## 2. Mục tiêu & phạm vi

| Giai đoạn | Tên | Giá trị | Rủi ro |
|---|---|---|---|
| **A** | Check-in thể trạng hằng tuần | Nền móng; biểu đồ "sống" | Thấp |
| **C** | Dự đoán tiến độ & đối chiếu kế hoạch | Điểm "wow" demo | Thấp–TB |
| **B** | Tính lại & sinh lại kế hoạch (AI) | Khép kín vòng lặp | Cao hơn |

Thứ tự triển khai khuyến nghị: **A → C → B**.

### Ngoài phạm vi (lần này)
- Đồng bộ cân điện tử/thiết bị đeo (HRV/RHR thật).
- Ảnh tiến trình (progress photos).

---

## 3. Mô hình dữ liệu

### 3.1 Tận dụng `BodyMetricHistory` (không cần đổi schema cho A & C)
Trường dùng tới: `weightKg`, `heightCm`, `bmi`, `bodyFatPct`, `waistCm`, `hipCm`,
`bmrCalculated`, `tdeeCalculated`, `recordedAt`.

### 3.2 Mục tiêu & calo — ĐÃ CÓ SẴN (không cần đổi schema)
- ✅ **Cân nặng mục tiêu**: `HealthProfile.goalWeightKg` đã tồn tại (DTO + entity).
  → ETA dùng trực tiếp, **không cần thêm trường**.
- ✅ **Calo/TDEE mục tiêu**: `UserBodyProfile.recommendedCalories` (= TDEE) được
  **tự tính lại khi save** (`@PrePersist/@PreUpdate` trong `UserBodyProfile`).
- (Tùy chọn) **`targetDate`** — mốc người dùng muốn đạt mục tiêu; thêm sau nếu cần.

---

## 4. Giai đoạn A — Check-in thể trạng hằng tuần

### 4.1 Luồng người dùng
1. Dashboard hiển thị **card nhắc** khi `now - latest.recordedAt ≥ 7 ngày`
   (hoặc chưa có bản đo nào): *"Đã N ngày kể từ lần đo gần nhất — cập nhật cân nặng?"*.
2. Bấm → **Modal "Cập nhật thể trạng"**:
   - **Cân nặng (kg)** — bắt buộc.
   - **Vòng eo (cm)**, **% mỡ** — tùy chọn (mở rộng "Nhập thêm").
   - Chiều cao/tuổi/giới lấy từ hồ sơ hiện tại (không bắt nhập lại).
3. Lưu → gọi **`POST /api/user/body-metric`** (BE tự tính BMI/BMR/TDEE) **và**
   `POST /user/profile/body` để đồng bộ cân nặng hiện tại.
4. Toast xác nhận + điều hướng người dùng tới biểu đồ Xu hướng (đã có delta mới).

### 4.2 FE cần thêm
- `userService.createBodyMetric(payload)` → `POST API_ENDPOINTS.HEALTH.BODY_METRIC`.
  Payload: `{ weightKg, heightCm?, bodyFatPct?, waistCm?, hipCm? }`.
- Component `BodyCheckInModal.tsx` (form tối giản + validate cân nặng 20–400 kg).
- Card nhắc trên `HomePage` (tính `daysSinceLastMetric` từ `getBodyMetricHistory()`).
- Sau khi lưu: `window.dispatchEvent('body-metric-updated')` để `TrendChart`/Dashboard refresh.

### 4.3 Tiêu chí hoàn thành
- Người dùng đo ≥ 2 lần → biểu đồ Xu hướng hiện đường + delta kg thật.
- Không bịa số: < 2 mốc vẫn giữ empty state hiện tại.

---

## 5. Giai đoạn C — Dự đoán tiến độ

### 5.1 Đầu vào
- Chuỗi `(recordedAt, weightKg)` từ lịch sử.
- `tdeeCalculated` mới nhất.
- Calo nạp trung bình/ngày (từ log dinh dưỡng, nếu có) — tùy chọn.
- `targetWeightKg` (mục 3.2).

### 5.2 Công thức (minh bạch, kèm độ tin cậy)

**a) Tốc độ thay đổi cân nặng** — hồi quy tuyến tính bình phương tối thiểu trên
N mốc gần nhất (đổi thời gian sang "tuần"):
```
rate_kg_per_week = slope( weight ~ week )
```
- Nếu < 3 mốc → dùng 2 điểm `(last - first) / số_tuần`; gắn nhãn "ước lượng sơ bộ".
- Tính `R²` → độ tin cậy (cao nếu dữ liệu ổn định).

**b) ETA đạt mục tiêu**:
```
weeks_to_goal = (currentWeight - targetWeightKg) / rate_kg_per_week
```
Chỉ hiển thị khi **dấu của rate khớp hướng mục tiêu** (đang giảm & cần giảm).
Ngược hướng → cảnh báo "đang đi sai hướng so với mục tiêu".

**c) Kỳ vọng theo cân bằng năng lượng** (đối chiếu thực tế ↔ kế hoạch):
```
expected_kg_per_week ≈ (intake_avg - TDEE) × 7 / 7700      # 7700 kcal ≈ 1 kg mỡ
```
So sánh `rate` đo được với `expected` → kết luận:
- **Đúng tiến độ** | **Nhanh hơn dự kiến** | **Chậm hơn dự kiến** | **Chững lại (plateau)**.

**d) Mục tiêu tốc độ an toàn** (theo goal):
- Giảm cân: ~ −0.5 kg/tuần (0.5–1%/tuần thể trọng).
- Tăng cơ: ~ +0.25–0.5 kg/tuần.

**e) Cảnh báo an toàn**: `|rate| > 1% thể trọng/tuần` → nhắc "giảm/tăng quá nhanh,
cân nhắc điều chỉnh".

### 5.3 Nơi tính
- **Khuyến nghị**: tính ở **backend** (`ProgressPredictionService`) → endpoint
  **`GET /api/user/progress-prediction`** trả:
  ```json
  {
    "ratePerWeek": -0.4,
    "confidence": "high|medium|low",
    "etaWeeks": 8, "etaDate": "2026-08-01",
    "expectedPerWeek": -0.45,
    "status": "on_track|faster|slower|plateau|wrong_direction|insufficient_data",
    "safetyWarning": null,
    "dataPoints": 5
  }
  ```
  Lý do: công thức/ngưỡng an toàn nên nằm 1 chỗ, FE chỉ hiển thị.
  > Có thể tính tạm ở FE cho bản demo nhanh, rồi chuyển sang BE.

### 5.4 Hiển thị (Dashboard)
- Thẻ **"Dự đoán tiến độ"** cạnh biểu đồ Xu hướng:
  - Tốc độ hiện tại (vd `−0.4 kg/tuần`) + nhãn trạng thái màu.
  - ETA: *"Dự kiến đạt 68 kg vào ~đầu tháng 8 (tuần 8)"* + ghi chú độ tin cậy.
  - Dòng AI gợi ý ngắn: vd "Chậm hơn dự kiến — cân nhắc giảm ~150 kcal/ngày hoặc thêm 1 buổi cardio".
- Empty state trung thực: *"Cần ≥ 3 lần đo cách nhau ≥ 5 ngày để dự đoán."*

---

## 6. Giai đoạn B — Tính lại & sinh lại kế hoạch

### 6.1 Sau mỗi check-in
- `UserBodyProfile.recommendedCalories` (TDEE) đã tự tính lại khi save số đo.
- Từ TDEE → **mục tiêu calo mới** theo goal:
  - Giảm: `TDEE × 0.80–0.85`; Tăng: `TDEE × 1.10–1.15`; Giữ: `TDEE`.
  > Cần xác nhận **goal factor này hiện đang áp ở đâu** (AI service khi sinh meal plan,
  > hay backend) để tái dùng đúng chỗ — tránh lệch logic.
- Hiển thị so sánh **cũ → mới** (calo & macro mục tiêu) trước khi áp dụng.

### 6.2 Sinh lại kế hoạch
- Nút **"Cập nhật kế hoạch theo số đo mới"**:
  - Thực đơn: gọi lại luồng sinh meal plan hiện có (AI service) với TDEE/macro mới.
  - Giáo án (tùy chọn): tái dùng `/api/user/training/{id}/regenerate-personalized`
    hoặc "AI thích ứng" đã có.
  > ⚠️ **Open question 2**: xác nhận endpoint sinh lại thực đơn & nơi lưu calo mục tiêu
  > (`UserBodyProfile.targetCalories`? hay tính runtime?).

### 6.3 Lưu ý
- Không tự động ghi đè kế hoạch đang chạy — luôn để người dùng xác nhận (tránh phá vỡ tuần đang tập/ăn).
- Có thể giới hạn tần suất regen (vd tối đa 1 lần/tuần) — liên quan thiết kế quota AI.

---

## 7. UX & nguyên tắc
- **Trung thực số liệu**: thiếu dữ liệu → nói rõ "cần thêm N lần đo", không bịa.
- **Tần suất hợp lý**: nhắc đo mỗi 7 ngày (cân dao động ngày — đo cùng thời điểm, buổi sáng).
- **An toàn lên trên**: luôn cảnh báo tốc độ bất thường, không khuyến khích giảm cực đoan.
- **Người dùng kiểm soát**: mọi thay đổi kế hoạch đều cần xác nhận.

## 8. Câu hỏi mở
1. ~~Nguồn cân nặng mục tiêu~~ → ✅ **Đã có** `HealthProfile.goalWeightKg`.
2. ~~Nơi lưu calo mục tiêu~~ → ✅ `UserBodyProfile.recommendedCalories` (tự tính khi save);
   **còn lại**: xác nhận **goal factor** (×0.8…) áp ở đâu + endpoint **sinh lại thực đơn**.
3. **Calo nạp thực tế**: hiện chỉ có truy vấn tổng calo theo ngày cho **thực đơn dự kiến**
   (`PersonalizedMealDetailRepository`), **chưa thấy** tổng hợp **log ăn thực tế**
   (`DailyNutritionLog`) theo ngày → cần thêm query cho mục 5.2(c). Nếu chưa có, phần
   "đối chiếu kỳ vọng" của C có thể tạm dùng calo thực đơn dự kiến.
4. Có cần lịch nhắc đẩy (notification) khi tới hạn đo, hay chỉ card trên Dashboard?

## 9. Thứ tự công việc (đề xuất)
1. **A** — `createBodyMetric` + `BodyCheckInModal` + card nhắc Dashboard. *(½–1 ngày)*
2. **C** — `ProgressPredictionService` + endpoint + thẻ "Dự đoán tiến độ". *(1 ngày)*
3. **B** — tính lại mục tiêu calo + nút sinh lại kế hoạch. *(1–2 ngày, cần chốt Q2)*
