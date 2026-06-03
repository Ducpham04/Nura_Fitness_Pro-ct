# Thiết kế: Mô hình Freemium + Giới hạn quota AI

> Tài liệu thiết kế để review trước khi code. Phạm vi: gói trả phí theo tính năng +
> giới hạn số lần gọi AI mỗi tháng, nâng cấp qua VNPay.

---

## 1. Mục tiêu & nguyên tắc

- **Monetization-first, không phải cost-control.** AI gọi Groq (rẻ) + chỉ gọi 1 lần/chương trình.
  Quota là đòn bẩy bán Pro, không phải để tiết kiệm chi phí. Phần tốn nhất là **vision**
  (pose detection, scan ảnh) — đúng cái "10 phiên AI pose" nhắm tới.
- **Fail-open có kiểm soát:** nếu hệ thống đếm quota lỗi → KHÔNG chặn user (tránh mất trải nghiệm),
  ghi log để theo dõi. Chỉ chặn khi xác định chắc chắn đã vượt.
- **Một nguồn sự thật:** quota tính theo **tháng dương lịch** (period = `YYYY-MM`), tự reset
  đầu tháng bằng cách đổi khóa period — KHÔNG cần cron.
- **Đếm sau khi thành công:** chỉ +1 quota khi lệnh AI trả về thành công. Lỗi AI không trừ lượt.

---

## 2. Định nghĩa các gói (tier)

| Tính năng | FREE | STUDENT (99k/tháng) | PRO (249k/tháng) |
|---|---|---|---|
| Phân tích form (pose, vision) | 3 / tháng | 10 / tháng | Không giới hạn |
| Scan ảnh món ăn / kho (vision) | 3 / tháng | 20 / tháng | Không giới hạn |
| AI Coach chat | 10 / tháng | 100 / tháng | Không giới hạn |
| Sinh / tạo lại kế hoạch tập (AI) | 1 / tháng | 4 / tháng | Không giới hạn |
| Sinh thực đơn AI | 1 / tháng | 4 / tháng | Không giới hạn |
| Ghi bữa ăn ngôn ngữ tự nhiên | 5 / tháng | 50 / tháng | Không giới hạn |
| AI thích ứng tuần (auto-regulate) | ❌ | ✅ | ✅ |
| Theo dõi tiến độ / thử thách / điểm | ✅ | ✅ | ✅ (cơ bản, không tốn AI) |
| Phân tích nâng cao (analytics) | ❌ | cơ bản | đầy đủ |

> Các con số trên là **đề xuất khởi điểm** — chỉnh trong config, không hardcode.
> Cần bạn chốt số cuối ở mục §12.

---

## 3. Phân loại endpoint AI cần gate

Map từng endpoint → "loại quota" (feature key):

| Endpoint (controller) | Feature key | Độ tốn |
|---|---|---|
| `POST /ai-analysis/pose` | `pose` | 🔴 Cao (vision) |
| `POST /food-analysis/scan` | `vision_scan` | 🔴 Cao (vision) |
| `POST /inventory/scan` | `vision_scan` | 🔴 Cao (vision) |
| `POST /ai-coach/chat` | `coach_chat` | 🟡 Vừa |
| `POST /ai-plans/generate-workout` | `gen_workout` | 🟡 Vừa |
| `POST /ai-plans/workout/{utId}/generate-next-week` | `gen_workout` | 🟡 Vừa |
| `POST /ai-plans/auto-regulate` | `gen_workout` (gói chặn FREE) | 🟡 Vừa |
| `POST /ai-plans/generate-meal` · `/generate-meal-hybrid` | `gen_meal` | 🟡 Vừa |
| `POST /ai-analysis/nutrition` | `coach_chat` | 🟢 Thấp |
| `POST /ai-plans/log-food-natural` | `food_log_nl` | 🟢 Thấp |

---

## 4. Data model (thay đổi schema)

### 4.1. Bổ sung vào `User` (hoặc tách `Subscription` — xem §4.2)
```
tier              ENUM('FREE','STUDENT','PRO')  DEFAULT 'FREE'
tier_expires_at   TIMESTAMP NULL   -- null = FREE vĩnh viễn; có giá trị = hết hạn thì về FREE
```

### 4.2. (Khuyến nghị) Entity `Subscription` — tách riêng để lưu lịch sử
```
subscription_id   PK
user_id           FK
tier              ENUM('STUDENT','PRO')
status            ENUM('ACTIVE','EXPIRED','CANCELLED')
started_at        TIMESTAMP
expires_at        TIMESTAMP
transaction_id    FK -> Transaction   -- giao dịch VNPay tạo ra gói này
```
> `User.tier` là "tier hiệu lực hiện tại" (denormalized để check nhanh);
> `Subscription` là lịch sử/nguồn sự thật. Khi `expires_at < now` → hạ User.tier về FREE
> (lazy: kiểm tra lúc đọc; hoặc job nhẹ chạy ngày).

### 4.3. Entity `AiUsageCounter` — bộ đếm quota
```
id            PK
user_id       FK
period        VARCHAR(7)   -- 'YYYY-MM'
feature_key   VARCHAR(40)  -- 'pose' | 'coach_chat' | ...
count         INT DEFAULT 0
UNIQUE(user_id, period, feature_key)
```
> Đếm theo tháng. Sang tháng mới → `period` đổi → bản ghi mới → tự "reset".
> Có thể tận dụng `AiEvaluationLog` (đã có) để đối soát/audit, nhưng đếm nên dùng bảng
> riêng này cho nhanh & chính xác (atomic increment).

---

## 5. Cấu hình giới hạn (không hardcode)

`application.properties` hoặc bảng config:
```
quota.FREE.pose=3
quota.FREE.coach_chat=10
quota.STUDENT.pose=10
quota.PRO.pose=-1        # -1 = không giới hạn
...
```
Hoặc 1 class `QuotaPolicy` map `Tier x FeatureKey -> limit (Integer, -1=unlimited, 0=khoá hẳn)`.

---

## 6. Enforcement (mấu chốt)

### 6.1. `QuotaService`
```
boolean canUse(userId, featureKey)        // limit==-1 → true; count<limit → true
void    recordUsage(userId, featureKey)   // atomic increment bản ghi (user, period, feature)
QuotaStatus status(userId, featureKey)    // {used, limit, remaining, resetAt}
```

### 6.2. Hook ở đâu
- **Cách A (khuyến nghị):** annotation `@RequiresQuota("pose")` + một `AOP aspect`/`HandlerInterceptor`
  bọc các endpoint AI. Trước khi vào controller → `canUse`; nếu false → ném `QuotaExceededException`.
  Sau khi controller trả thành công → `recordUsage`.
- **Cách B (đơn giản hơn):** gọi `quotaService.canUse(...)` thủ công ở đầu mỗi method trong
  `AIGatewayServiceImpl`, và `recordUsage(...)` ngay trước khi return thành công.

### 6.3. Hợp đồng lỗi khi vượt quota (FE cần biết)
```
HTTP 402 Payment Required
{
  "error": "QUOTA_EXCEEDED",
  "featureKey": "pose",
  "tier": "FREE",
  "used": 3, "limit": 3,
  "resetAt": "2026-07-01",
  "message": "Bạn đã dùng hết 3 lượt phân tích form miễn phí tháng này. Nâng cấp để tiếp tục."
}
```
> Dùng **402** (không phải 403) để FE phân biệt rõ "cần nâng cấp" vs "cấm quyền".

---

## 7. Luồng thanh toán → nâng tier (VNPay đã có sẵn)

```
1. FE: user bấm "Nâng cấp Pro" → POST /api/payment/create-vnpay-url
   { amount: 249000, orderType: "premium", planTier: "PRO" }
2. BE: tạo Transaction(status=PENDING, type="premium"), trả paymentUrl
3. User thanh toán trên VNPay → redirect GET /api/payment/vnpay-return?...
4. BE (vnpay-return): verify chữ ký + mã phản hồi
   - Thành công →
       Transaction.status = COMPLETED
       tạo Subscription(tier=PRO, started=now, expires=now+1 tháng, ACTIVE)
       User.tier = PRO, User.tier_expires_at = now+1 tháng
   - Thất bại → Transaction.status = FAILED, không đổi tier
5. Redirect FE về /dashboard?upgrade=success|failed
```
> **Cần thêm:** trong `vnpay-return` hiện tại CHƯA nâng tier (vì chưa có field tier).
> Đây là phần cần code khi triển khai.
> **Bảo mật:** chỉ nâng tier ở server sau khi verify chữ ký VNPay — KHÔNG tin tham số FE.

---

## 8. API mới cần thêm

| Method | Endpoint | Mục đích |
|---|---|---|
| GET | `/api/me/subscription` | Tier hiện tại + hạn dùng |
| GET | `/api/me/usage` | Số lượt đã dùng / còn lại từng feature (tháng này) |
| POST | `/api/payment/create-vnpay-url` | (đã có) thêm xử lý `planTier` |
| GET | `/api/payment/vnpay-return` | (đã có) thêm logic nâng tier |
| (admin) | `/api/admin/users/{id}/tier` | Đổi tier thủ công (cấp/thu hồi tay) |

---

## 9. Frontend UX

- **Badge tier** cạnh tên user (FREE/STUDENT/PRO).
- **Quota meter:** ở các màn dùng AI hiện "Còn 7/10 lượt phân tích form tháng này"
  (gọi `GET /me/usage`). Khi gần hết → đổi màu cảnh báo.
- **Paywall modal:** khi nhận `402 QUOTA_EXCEEDED` → hiện modal:
  > "Bạn đã hết lượt {tên tính năng} miễn phí tháng này (reset {resetAt}).
  >  Nâng cấp Pro để dùng không giới hạn." + nút **Nâng cấp** → flow VNPay.
- **Trang Pricing** (Landing đã có Student/Pro) → nút "Bắt đầu" gọi create-vnpay-url.
- **Sau thanh toán:** `/dashboard?upgrade=success` → toast "Đã nâng cấp Pro 🎉" + refresh tier.

---

## 10. Edge cases & nguyên tắc an toàn

- **Hết hạn gói:** đọc tier lúc check quota; nếu `tier_expires_at < now` → coi như FREE.
- **Đổi tháng giữa phiên:** quota tính theo `period` lúc gọi, không cache cứng.
- **Race condition đếm:** dùng `UPDATE ... SET count=count+1` (atomic) hoặc DB constraint, không đọc-rồi-ghi.
- **Hoàn tiền/huỷ:** Subscription.status=CANCELLED → hạ tier về FREE.
- **Admin/seed user:** có thể set PRO vĩnh viễn (`tier_expires_at = null`).
- **Fail-open:** lỗi `QuotaService` → cho qua + log, không chặn user.
- **Idempotent VNPay return:** chống double-credit nếu callback gọi 2 lần (check Transaction đã COMPLETED chưa).

---

## 11. Kế hoạch triển khai theo phase

**Phase 1 — Quota lõi (không thanh toán)**
- Thêm `User.tier` + `AiUsageCounter` + `QuotaService` + `QuotaPolicy` config
- Gate các endpoint AI (Cách B: gọi thủ công, ít rủi ro)
- API `GET /me/usage`, `GET /me/subscription`
- FE: quota meter + paywall modal (402)
- Nâng/hạ tier thủ công qua admin (đã có khung admin)

**Phase 2 — Thanh toán VNPay**
- Entity `Subscription` + logic `vnpay-return` nâng tier
- FE: nút nâng cấp → create-vnpay-url → flow thanh toán → cập nhật tier
- Idempotent + verify chữ ký

**Phase 3 — Hoàn thiện**
- Email/thông báo sắp hết hạn, gia hạn
- Analytics nâng cao cho Pro
- Job hạ tier hết hạn (nếu không dùng lazy)

---

## 12. Câu hỏi cần bạn chốt trước khi code

1. **Số quota từng tier** (§2) — giữ đề xuất hay chỉnh?
2. **FREE có được dùng thử AI không** (3 lượt/tháng) hay khoá hẳn, bắt mua mới dùng?
3. **Chu kỳ tính:** theo tháng dương lịch (1→cuối tháng) hay 30 ngày kể từ lúc mua?
4. **Cổng thanh toán:** chỉ VNPay (đã có) hay thêm MoMo?
5. **Gói theo tháng** hay có cả **theo năm** (giảm giá)?
6. Khi hết hạn Pro mà còn data Pro (analytics) → ẩn hay giữ chỉ-đọc?
