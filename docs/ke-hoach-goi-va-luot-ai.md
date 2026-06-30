# Kế hoạch: Quản lý Gói & Lượt dùng AI

> Trạng thái: **ĐỀ XUẤT — chờ duyệt**. Chưa code.
> Mục tiêu: giới hạn lượt dùng AI theo gói (Free/Plus/Pro), chặn khi hết, cho admin quản lý gói, cho user xem lượt còn lại & nâng cấp.

---

## 1. Kiểm kê tính năng AI hiện có

Gần như toàn bộ AI đi qua **một cổng duy nhất**: `AIGatewayController` (`/api/...`) → `AIGatewayServiceImpl` → gọi `ai-service` (Groq LLM) hoặc `fitness-ai-service` (MediaPipe).

| # | Endpoint | Tính năng | Loại | Token/độ nặng |
|---|---|---|---|---|
| 1 | `POST /ai-plans/generate-meal` | Tạo thực đơn AI | LLM (Groq) | 🔴 Nặng ~2000 tok |
| 2 | `POST /ai-plans/generate-meal-hybrid` | Tạo thực đơn hybrid | LLM | 🔴 Nặng |
| 3 | `POST /ai-plans/generate-workout` | Tạo lịch tập AI | LLM | 🔴 Nặng ~2500 tok |
| 4 | `POST /ai-plans/workout/{utId}/generate-next-week` | Sinh tuần tập kế | LLM | 🔴 Nặng |
| 5 | `POST /ai-coach/chat` | Chat AI Coach | LLM | 🟠 Vừa (mỗi tin) |
| 6 | `POST /food-analysis/scan` | Quét ảnh món ăn → dinh dưỡng | LLM Vision | 🟠 Vừa |
| 7 | `POST /inventory/scan` | Quét ảnh kho thực phẩm | LLM Vision | 🟠 Vừa |
| 8 | `POST /ai-plans/log-food-natural` | Log món bằng ngôn ngữ tự nhiên | LLM | 🟢 Nhẹ |
| 9 | `POST /ai-analysis/pose` | Chấm form qua ảnh snapshot | MediaPipe | 🟢 Nhẹ (không token) |
| 10 | `POST /ai-analysis/nutrition` | Tính dinh dưỡng | Công thức | ⚪ Không AI |
| 11 | `WS /ws/exercise/{type}` (fitness-ai-service) | Chấm form realtime | MediaPipe | 🟢 Nhẹ (local) |

**Nhận xét:**
- Tốn tiền thật (Groq) = nhóm 🔴🟠 (1–8). Đây là thứ cần giới hạn.
- Nhóm MediaPipe (9, 11) chạy nội bộ, gần như miễn phí → **không nên tính lượt** (sẽ làm hỏng trải nghiệm thi thử thách).
- #10 không phải AI → bỏ qua.

---

## 2. Mô hình "lượt AI" (AI credits)

Dùng đơn vị **credit** để 1 gói chi phối được nhiều loại hành động theo độ nặng:

| Hành động | Credit/lần |
|---|---|
| Tạo thực đơn / lịch tập / tuần kế (1–4) | **5** |
| Quét ảnh món / kho (6, 7) | **2** |
| Chat AI Coach (5) | **1** |
| Log món tự nhiên (8) | **1** |
| Pose/MediaPipe (9, 11) | **0** (miễn phí) |

> Hệ số có thể chỉnh trong cấu hình; bắt đầu đơn giản như trên.

---

## 3. Thiết kế Gói (package/tier)

| Gói | Credit/tháng | Giá (đề xuất) | Ghi chú |
|---|---|---|---|
| **Free** (mặc định) | 30 | 0đ | ~6 lần tạo plan hoặc 30 tin chat |
| **Plus** | 200 | 49.000đ/tháng | Người dùng thường xuyên |
| **Pro** | Không giới hạn (-1) | 99.000đ/tháng | Power user |

- User mới → tự gán **Free**.
- Chu kỳ reset: **hàng tháng** (theo `aiResetAt`), tự reset khi gọi AI sau mốc đó.
- `quota = -1` ⇒ vô hạn (không trừ, không chặn).

---

## 4. Mô hình dữ liệu

### Entity mới: `AiPackage`
```
ai_packages
  id              bigint PK
  code            varchar  (FREE | PLUS | PRO) unique
  name            varchar  ("Gói Free")
  ai_quota        int      (credit/tháng; -1 = vô hạn)
  price_vnd       int
  duration_days   int      (30)
  is_active       boolean
  sort_order      int
```

### Thêm field vào `User`
```
ai_package_id   bigint FK → ai_packages (null = Free)
ai_quota        int     (snapshot quota của gói hiện tại; tiện đọc nhanh)
ai_used         int     (credit đã dùng trong chu kỳ)
ai_reset_at     timestamptz  (mốc reset chu kỳ kế)
ai_package_expires_at timestamptz (null = không hết hạn / Free)
```
> Lưu `ai_quota` trên user (snapshot) để không phải join package mỗi lần check; khi đổi gói thì cập nhật lại.

### (Tuỳ chọn) Log: tái dùng `Transaction` cho việc mua gói; thêm `AiUsageLog` nếu cần thống kê chi tiết theo hành động (phase sau).

---

## 5. Chốt chặn lượt (enforcement) — TẬP TRUNG

Vì mọi AI tốn tiền đi qua `AIGatewayServiceImpl`, ta thêm **1 guard duy nhất**:

```java
// AiUsageService
int remaining(Long userId);                 // còn lại (hoặc -1 vô hạn)
void ensureAndConsume(Long userId, int cost); // hết → ném QuotaExceededException; còn → +used
```

Trong mỗi method của `AIGatewayServiceImpl` (generateMeal, generateWorkout, chat, scan...):
```java
aiUsageService.ensureAndConsume(userId, COST_MEAL_PLAN); // đầu method, trước khi gọi AI
```
- Reset chu kỳ: khi `now > ai_reset_at` → `ai_used = 0`, `ai_reset_at = now + duration`.
- Hết lượt → `QuotaExceededException` → `GlobalExceptionHandler` trả **429** + message *"Bạn đã hết lượt AI tháng này. Nâng cấp gói để tiếp tục."* (FE bắt 429 → mở modal nâng cấp).
- Gói hết hạn (`ai_package_expires_at < now`) → tự hạ về Free.

---

## 6. API

### User
| Method | Path | Việc |
|---|---|---|
| GET | `/api/ai-usage/me` | `{ packageCode, quota, used, remaining, resetAt }` |
| GET | `/api/ai-packages` | Danh sách gói để nâng cấp |
| POST | `/api/ai-packages/{id}/subscribe` | Mua/nâng cấp gói (qua điểm hoặc payment — xem §8) |

### Admin
| Method | Path | Việc |
|---|---|---|
| GET/POST/PUT/DELETE | `/api/admin/ai-packages` | CRUD gói |
| PUT | `/api/admin/users/{id}/ai-package` | Gán gói cho user |
| PUT | `/api/admin/users/{id}/ai-usage` | Reset / chỉnh lượt thủ công |

---

## 7. Frontend

- **Badge lượt AI**: cạnh các nút "Tạo thực đơn / Tạo lịch tập" và ở AICoachPage → "Còn 25/30 lượt AI". Component `<AiUsageBadge/>` gọi `/api/ai-usage/me`.
- **Modal nâng cấp** (`UpgradeModal`): hiện khi bấm nút AI mà hết lượt (bắt 429) — liệt kê gói, nút nâng cấp.
- **Admin**: tab "Gói AI" trong AdminPanel — CRUD gói + gán gói cho user (tái dùng pattern bảng admin sẵn có).
- Chặn mềm phía FE: nếu `remaining === 0` → nút AI đổi thành "Hết lượt — Nâng cấp".

---

## 8. Thanh toán / nâng cấp (quyết định sản phẩm)

3 lựa chọn (chọn 1 cho MVP):
1. **Dùng điểm thưởng** (đã có ví `points`): đổi điểm lấy gói → tận dụng hệ thống điểm vừa làm, không cần payment gateway. **(Đề xuất cho MVP)**
2. **Admin cấp tay**: admin gán gói, chưa tự mua.
3. **VNPay**: PaymentController đã có khung (toàn TODO) → hoàn thiện sau.

---

## 9. Migration & rollout (prod dùng Flyway `validate`)

- **V8**: tạo bảng `ai_packages` + seed 3 gói (FREE/PLUS/PRO).
- **V9**: thêm cột AI vào `users` + backfill (`ai_package_id = FREE`, `ai_quota = 30`, `ai_used = 0`, `ai_reset_at = now + 30d`).
- Entity mới + cột mới ⇒ **bắt buộc** có migration (validate sẽ fail nếu thiếu).

---

## 10. Phân kỳ thực hi

| Phase | Nội dung | Quy mô |
|---|---|---|
| **P1 — Lõi** | Entity AiPackage, cột User, AiUsageService + guard trong AIGateway, reset chu kỳ, GET /ai-usage/me, badge FE, modal 429, Flyway V8/V9 | Trung bình |
| **P2 — Quản trị** | Admin CRUD gói + gán gói/chỉnh lượt, tab AdminPanel | Trung bình |
| **P3 — Nâng cấp** | Subscribe bằng điểm (hoặc VNPay), lịch sử mua | Nhỏ–trung |

---

## 11. Câu hỏi cần chốt trước khi code

1. **Hệ số credit & quota** ở §2/§3 có ổn không? (số lượt Free, giá Plus/Pro)
2. **Có tính lượt cho Chat AI Coach & quét ảnh** không, hay chỉ tính tạo plan?
3. **Cách nâng cấp** (§8): đổi bằng **điểm thưởng** / admin cấp tay / VNPay?
4. **Chu kỳ reset**: hàng tháng (đề xuất) hay theo ngày mua gói?

> Sau khi bạn chốt §11, mình bắt đầu **Phase 1**.
