# GHI CHÚ DUE-DILIGENCE KỸ THUẬT — FITNIT CHALLENGE

> Wave 3 phiên chiến lược · 14/06/2026 · **Mọi claim dưới đây đã đối chiếu trực tiếp code (file:line).**
> Mục đích: kiểm chứng các điểm rủi ro thường được nhắc, để pitch/quyết định dựa trên *sự thật code* chứ không phải trí nhớ.

---

## Tóm tắt: 4/4 điểm rủi ro đã kiểm chứng — 2 điểm "rủi ro" hóa ra đã được vá tốt

| # | Claim rủi ro (theo memory cũ) | Kết quả kiểm chứng | Mức |
|---|---|---|---|
| 1 | VNPay có fail-closed khi sai chữ ký? | ✅ **Có** — từ chối giao dịch | An toàn |
| 2 | Phụ thuộc 1 nhà cung cấp LLM (Groq)? | ✅ **Đã tách** multi-provider + fail-over | An toàn |
| 3 | redeemReward double-spend (chưa lock)? | ✅ **Đã vá** bằng atomic UPDATE (tốt hơn lock) — *claim memory lỗi thời* | An toàn |
| 4 | IDOR swap-dish/feedback không check owner? | 🟡 **Đã giảm nhẹ** — userId lấy từ JWT; cần xác nhận tầng service | Thấp |

---

## 1. VNPay — fail-closed ✅
`AiPackageServiceImpl.java`:
- L150–154: lấy `vnp_SecureHash` ra khỏi params rồi `if (!verifyVnpayHash(params, secureHash)) → return {success:false, "Chữ ký không hợp lệ"}`. **Sai chữ ký = từ chối**, không cấp credit.
- L158: kiểm `responseCode == "00"` (chỉ chấp nhận thành công thật).
- L164, L180: kiểm mã giao dịch hợp lệ + tồn tại giao dịch "đang chờ" trước khi ghi có.

→ Luồng tiền **không thể bị giả mạo callback** để nạp credit miễn phí. Đạt chuẩn an toàn thanh toán.

## 2. LLM multi-provider + fail-over ✅
`ai-service/app/core/llm.py`:
- `_provider_configs()` (L34): dựng danh sách provider theo env — **primary** (`LLM_BASE_URL`/`LLM_API_KEY`, fallback `GROQ_API_KEY` để tương thích) + **fallback tùy chọn** (`LLM_FALLBACK_*`).
- `make_client()` trả object giữ nguyên interface `chat.completions.create()` nhưng **tự fail-over qua các provider** (L64).
- Mặc định vẫn Groq → không đổi hành vi; đổi hãng = đổi env, không sửa code.

→ **Không lock-in.** Kết hợp với chuỗi 7 model fallback ở `workout_planner` → khả dụng cao khi 1 model/hãng bị rate-limit.

## 3. redeemReward — KHÔNG race double-spend ✅ *(đính chính memory)*
Memory cũ ghi "redeemReward race-condition double-spend (chưa pessimistic lock)". **Code hiện tại đã xử lý đúng — bằng cách tốt hơn pessimistic lock:**

`RewardRedemptionServiceImpl.java` L68:
```java
if (userRepository.deductPointsIfEnough(user.getId(), cost) == 0) { /* từ chối */ }
```
`UserRepository.deductPointsIfEnough` (L26) là **atomic conditional UPDATE** (`UPDATE ... SET points = points - cost WHERE id = ? AND points >= cost`, trả số dòng bị ảnh hưởng). Nếu 2 request đua nhau, chỉ 1 cái update thành công (rows=1), cái còn lại rows=0 → bị từ chối. **Đây là compare-and-swap ở tầng DB — chống double-spend mà không cần khóa bi quan.**

→ Việc grep toàn backend không thấy `@Lock/PESSIMISTIC/synchronized` **không phải lỗ hổng** — họ chọn pattern atomic-update đúng hơn. *Khuyến nghị: cập nhật lại memory rủi ro.*

## 4. IDOR tầng "quấy phá" — đã giảm nhẹ 🟡
`PersonalizedNutritionPlanController.java`:
- GET `/{userId}`, `/{userId}/active`, `/{userId}/{planId}`: **có** check `authenticatedUserId.equals(userId)` → 403 nếu lệch (L87, L114, L152).
- `swap-dish` (L234) và `feedback` (L259): **truyền `authenticatedUserId` (từ JWT)** xuống service (`swapMealDish(mealDetailId, authenticatedUserId)`, `updateMealFeedback(mealDetailId, authenticatedUserId, ...)`) — KHÔNG còn tin userId từ client.

→ Rủi ro còn lại: cần xác nhận **tầng service có chặn khi `mealDetailId` không thuộc về `authenticatedUserId`** hay không (nếu service chỉ nhận userId mà không so khớp chủ sở hữu của mealDetail thì vẫn lọt). Mức **thấp/griefing** (chỉ sửa được plan của chính phiên đăng nhập trừ khi đoán đúng mealDetailId người khác). **Việc 1 buổi sau launch**, không chặn go-live.

---

## Kết luận DD
Các trục rủi ro "tiền" và "phụ thuộc nhà cung cấp" — vốn là 2 thứ nguy hiểm nhất cho một sản phẩm SaaS sắp thu phí — **đều đã được xử lý đúng chuẩn**. Tồn đọng còn lại là tầng griefing mức thấp, không chặn thương mại hóa. **Sức khỏe kỹ thuật để mở bán: tốt.**
