# BÁO CÁO NĂNG LỰC AI & LỘ TRÌNH NÂNG CẤP

**Hệ thống AI — Fitnit Challenge**

| Hạng mục | Nội dung |
|---|---|
| Sản phẩm | Fitnit Challenge — Fitness AI Platform |
| Phạm vi báo cáo | Năng lực AI hiện tại + Roadmap nâng cấp |
| Kiến trúc AI | Hybrid: AI (phán đoán) + Java (thực thi/an toàn) + Pose service (MediaPipe on-device) |
| Nhà cung cấp model | Groq API (Llama 4 Scout / Llama 3.3 / GPT-OSS / Qwen / Vision) + MediaPipe Pose |
| Phiên bản tài liệu | v1.2 — cập nhật 06/2026 (pose real-time MediaPipe + HMAC) |

---

## 1. Tóm tắt điều hành

Hệ thống AI của Fitnit Challenge hiện vận hành theo **kiến trúc lai (hybrid)**: AI đảm nhận phần *phán đoán dưới sự mơ hồ* (lập kế hoạch, hiểu hình ảnh, tư vấn), còn Java đảm nhận phần *có đáp án đúng tuyệt đối* (lọc an toàn y tế, tính toán, kiểm định). Cách phân vai này giúp tận dụng thế mạnh của AI mà vẫn đảm bảo độ tin cậy và an toàn cho người dùng.

> **Định hướng cốt lõi**
> - AI = bộ não chiến lược, gọi qua API (**không tự train LLM**).
> - Java = cỗ máy thực thi: an toàn, toán học, lưu trữ — không bao giờ giao cho AI.
> - Hướng nâng cấp: khai thác mạnh hơn **xử lý ngôn ngữ tự nhiên**, **thị giác máy tính** và **vòng lặp thích ứng (auto-regulation)** qua RAG.

---

## 2. Kiến trúc AI hiện tại

### 2.1 Mô hình phân vai Hybrid

Một giáo án tập hay thực đơn **không có "đáp án đúng duy nhất"** — đó là vùng của AI. Còn *"bài này có an toàn cho người chấn thương không"* hay *"buổi tập đốt bao nhiêu calo"* thì **có đáp án đúng** — đó là vùng của Java.

| Lớp | Vai trò | Ví dụ nhiệm vụ |
|---|---|---|
| **AI (Groq LLM)** | Phán đoán / chiến lược | Chia lịch tuần, chọn bài từ catalog, tư vấn, hiểu ảnh |
| **Java (Backend)** | Thực thi xác định | Lọc an toàn y tế, tính calo, tăng tiến, validate, lưu DB |

### 2.2 Các model đang sử dụng (Groq API)

| Model | Dùng cho | Ghi chú |
|---|---|---|
| `meta-llama/llama-4-scout-17b-16e-instruct` | Sinh workout / meal plan (chính) | Model mặc định, nhanh |
| `llama-3.3-70b-versatile` | Fallback chất lượng cao | Khi model chính bị rate-limit (429) |
| `openai/gpt-oss-120b` / `20b` | Fallback dự phòng | Chuỗi dự phòng tự động chuyển |
| `qwen/qwen3-32b` | Fallback dự phòng | Alibaba Qwen 32B |
| `groq/compound` / `compound-mini` | Fallback dự phòng | Groq compound |
| `llama-3.1-8b-instant` | Backup nhỏ nhất | ~2.2K tokens/request, luôn sẵn |
| `llama-3.2-11b-vision` | Phân tích ảnh món ăn | Vision model — nhận diện món Việt |
| **MediaPipe Pose** | Chấm tư thế real-time | Chạy on-device/server, KHÔNG qua Groq |

> Hệ thống có **chuỗi fallback tự động 7 model text** (`workout_planner.fallback_models`):
> khi một model bị giới hạn tần suất (429), tự chuyển sang model kế tiếp theo thứ tự
> mạnh→nhỏ → đảm bảo tính sẵn sàng cao.

---

## 3. Năng lực AI hiện tại

Hệ thống hiện cung cấp **9 năng lực AI** qua API Gateway:

### 3.1 Sinh kế hoạch tập luyện (Workout Generation)
- **Đầu vào:** hồ sơ user (cân nặng, chiều cao, tuổi, mục tiêu, trình độ, dụng cụ, chấn thương) + catalog bài tập đã lọc an toàn.
- AI sinh **ProgramTemplate** gọn: lịch tuần 7 ngày, pool bài tập theo buổi, thông số gốc (sets/reps/nghỉ), tốc độ tăng tiến.
- Java bung template thành lịch từng ngày, tính calo (MET), áp tăng tiến block 4 tuần, **sinh tuần kế tiếp KHÔNG gọi lại AI**.
- Endpoint: `POST /ai-plans/generate-workout`, `/ai-plans/workout/{utId}/generate-next-week`

### 3.2 Sinh thực đơn dinh dưỡng (Meal Plan)
- **Chế độ chuẩn:** AI gợi ý món + macro theo mục tiêu calo/dinh dưỡng.
- **Chế độ Hybrid Smart Meal:** AI chỉ chọn `dish_id` từ catalog; Java giải nguyên liệu, gram, macro và chi phí từ công thức thật.
- Đảm bảo tính khả thi về nguyên liệu — AI không "bịa" món.
- Endpoint: `POST /ai-plans/generate-meal`, `/ai-plans/generate-meal-hybrid`

### 3.3 Phân tích hình ảnh món ăn (Food Vision)
- Dùng **Llama 3.2 Vision** — nhận diện món ăn Việt từ ảnh, ước lượng calo & macro.
- Tiền xử lý ảnh (resize, chuẩn RGB) trước khi gửi model.
- Endpoint: `POST /food-analysis/scan`, `/inventory/scan`

### 3.4 AI Coach Chat
- Chatbot tư vấn sức khoẻ & dinh dưỡng theo ngữ cảnh người dùng.
- Context hiện đã bổ sung preferences, training summary và retrieval metadata để chuẩn bị cho RAG.
- Endpoint: `POST /ai-coach/chat`

### 3.5 Phân tích tư thế real-time (Pose Analysis — MediaPipe) ✅ ĐÃ NÂNG CẤP
- **Đã chuyển sang chấm form real-time** bằng service riêng `fitness-ai-service` (MediaPipe Pose, 33 landmark) — không còn dừng ở snapshot.
- Mỗi bài có **analyzer riêng** (squat, push-up, pull-up, sit-up, plank): tính góc khớp, **đếm rep bằng máy trạng thái hysteresis + làm mượt**, chấm `quality_score` 0–100 và trả `form_errors` (lỗi + mức độ) bằng tiếng Việt theo thời gian thực.
- **Bảo mật server-authoritative:** pose service **ký kết quả bằng HMAC-SHA256** (`POSE_SIGNING_SECRET`); client chỉ chuyển tiếp `{token, sig}`; backend verify chữ ký + hạn 5 phút → **không thể bịa reps/điểm**.
- Là model **on-device/server nhỏ**, chạy độc lập với Groq → không tốn token LLM, độ trễ thấp.
- Chi tiết công thức: xem *Báo cáo kỹ thuật §5.9–5.10*.

### 3.6 Ghi log dinh dưỡng bằng ngôn ngữ tự nhiên
- Người dùng nhập câu tự nhiên như *"Sáng ăn 2 trứng luộc và 1 chuối"*.
- AI parse thành items, calories, macro; Backend lưu vào `DailyNutritionLog`.
- FE đã có panel **Ghi bữa nhanh** trong màn dinh dưỡng.
- Endpoint: `POST /ai-plans/log-food-natural`

### 3.7 Auto-Regulation workout
- Cuối tuần, Backend gửi template hiện tại, log tuần, summary và preferences cho AI.
- AI trả điều chỉnh template; Backend sinh tuần kế tiếp bằng engine Java, không gen lại toàn bộ chương trình từ đầu.
- Endpoint: `POST /ai-plans/auto-regulate`

### Bảng tổng hợp năng lực

| Năng lực | Công nghệ | Trạng thái |
|---|---|---|
| Sinh workout plan | Groq Llama 4/3.3 | ✅ Hoạt động |
| Sinh meal plan (chuẩn + hybrid) | Groq Llama | ✅ Hoạt động |
| Phân tích ảnh món ăn | Groq Llama 3.2 Vision | ✅ Hoạt động |
| Quét inventory từ ảnh | Groq Vision | ✅ Hoạt động |
| AI Coach chat | Groq Llama | ✅ Hoạt động |
| Ghi log food bằng câu tự nhiên | Groq Llama + Java persistence | ✅ Đã nối FE/BE/AI |
| Auto-regulation workout | Groq Llama + Java weekly engine | ✅ Đã có luồng v2.2 |
| Phân tích tư thế real-time | MediaPipe (analyzer/bài) + HMAC | ✅ **Đã nâng cấp** — chấm rep + form liên tục |
| Bảo mật điểm tư thế | HMAC-SHA256 server-authoritative | ✅ Chống gian lận điểm |
| Tính dinh dưỡng tổng hợp (macro g/kg) | Java + AI | ✅ Hoạt động |

---

## 4. Điểm mạnh & giới hạn hiện tại

### 4.1 Điểm mạnh
- **An toàn cao:** Java lọc y tế TRƯỚC khi AI thấy + validate ID SAU khi AI trả về → AI không thể kê bài nguy hiểm hay không tồn tại.
- **Tiết kiệm chi phí:** AI gọi 1 lần/chương trình; các tuần sau Java tự sinh từ template (0 chi phí AI).
- **Độ tin cậy:** toán học (calo, tăng tiến) nằm trong code — chính xác, kiểm thử được.
- **Sẵn sàng cao:** chuỗi fallback nhiều model, tự chuyển khi rate-limit.

### 4.2 Giới hạn hiện tại (cơ hội nâng cấp)

| Giới hạn | Tác động | Hướng khắc phục |
|---|---|---|
| Prompt hardcode nhiều (goal→pattern) | Giá trị AI marginal thấp ở phần lập lịch | Khai thác mạnh NLP & vision |
| Kế hoạch tĩnh sau khi sinh | Chưa thích ứng theo tiến độ thật của user | Auto-regulation (vòng lặp phản hồi) |
| Chưa dùng log user làm ngữ cảnh | Coach tư vấn chung chung | RAG trên dữ liệu user |
| Đầu vào chủ yếu là form/dropdown | Bỏ lỡ sắc thái ngôn ngữ tự nhiên | Ô nhập text tự do + trích xuất AI |
| Chất lượng phụ thuộc metadata bài tập | Thiếu trường → AI quyết định kém | Hoàn thiện thư viện Bài tập |
| Pose mới hỗ trợ 5 bài (squat/push-up/pull-up/sit-up/plank) | Bài khác chưa chấm form | Thêm analyzer mới (đã có `TEMPLATE_NEW_EXERCISE.py`) |

---

## 5. Lộ trình nâng cấp (version sắp tới)

**Định hướng:** tăng giá trị AI bằng cách khai thác các vùng mà rule cứng làm rất tệ — hiểu ngôn ngữ tự nhiên, thị giác máy tính, và phán đoán thích ứng. **Không train LLM riêng**; dùng API frontier + RAG + model nhỏ on-device cho tác vụ hẹp.

### 🔹 Phiên bản 2.1 — Trải nghiệm ngôn ngữ tự nhiên

| Tính năng | Mô tả | Giá trị |
|---|---|---|
| Ghi log bằng câu chữ | *"Sáng ăn 2 trứng 1 chuối"* → log có cấu trúc | ✅ Đã triển khai FE/BE/AI |
| Onboarding hội thoại | User kể tình trạng → AI trích xuất profile + chấn thương | Cá nhân hoá sâu, bắt được sắc thái |

> Đây là vùng Java gần như không cạnh tranh được — **điểm mạnh rõ rệt nhất của LLM**.

### 🔹 Phiên bản 2.2 — Auto-Regulation (vòng lặp thích ứng)
- AI đọc **log thật của user** (sets/reps hoàn thành, skipped exercises, preferences, week summary).
- Tự điều chỉnh template và gọi Java sinh tuần kế tiếp thay vì dùng template tĩnh.
- Bước còn lại: bổ sung RPE/fatigue chuẩn hoá trên UI để AI phát hiện chững và deload chính xác hơn.

> Đây là nâng cấp biến AI từ *"phát mẫu"* thành *"cá nhân hoá thật"*.

### 🔹 Phiên bản 2.3 — RAG cho AI Coach
- Đã bổ sung lớp context nền: preferences, training summary, retrieval metadata.
- Bước tiếp theo là embeddings/vector store để nhồi lịch sử & log của chính user vào ngữ cảnh chat.
- Coach tư vấn có dẫn chứng: *"3 tuần nay bạn bỏ buổi chân nên squat chững lại…"*.
- Kỹ thuật: **embeddings + RAG** — KHÔNG cần train model.

### 🔹 Phiên bản 2.4 — Thị giác máy tính nâng cao
- ✅ **Đã có chấm form real-time bằng MediaPipe** (5 bài: squat/push-up/pull-up/sit-up/plank) với đếm rep + điểm form + HMAC bảo mật điểm.
- Bước tiếp theo: mở rộng số bài có analyzer; lưu frame/feedback để review sau buổi; kết hợp LLM nhận xét tổng kết buổi.
- Nâng cấp food-scan: độ chính xác macro, khẩu phần.
- Lộ trình: model nhỏ on-device (MediaPipe) cho real-time + Vision API cho phân tích ảnh tĩnh.

---

## 6. Chiến lược model: API vs Tự train

**Khuyến nghị dứt khoát: Dùng API. Không train LLM từ đầu.**

| Phương án | Chi phí | Chất lượng | Khuyến nghị |
|---|---|---|---|
| Train từ đầu | Hàng triệu \$, GPU cluster | — | ❌ KHÔNG (bất khả thi) |
| Fine-tune model mở | Cao + MLOps + hosting | Hơn base chút ít | ⚠️ Chỉ khi có lý do hẹp |
| Dùng API frontier | Trả theo lượt, rẻ | Đã rất tốt sẵn | ✅ **KHUYẾN NGHỊ** |

### 6.1 Khi nào MỚI nên fine-tune (model nhỏ, không phải LLM)
1. Task hẹp + lượng request khổng lồ → model nhỏ rẻ hơn gọi LLM.
2. Có data độc quyền tạo lợi thế (vd 100k cặp *"video → điểm form"*).
3. Cần chạy on-device/real-time/offline (vd pose — đã làm với MediaPipe).

### 6.2 Chiến lược lai khuyến nghị

| Loại tác vụ | Giải pháp |
|---|---|
| Phán đoán (workout/nutrition/coach) | API frontier (Groq/GPT/Claude/Gemini) |
| Real-time hẹp (pose detection) | Model nhỏ on-device (MediaPipe — đã có) |
| Dùng data của mình / "cảm giác riêng" | RAG + embeddings (KHÔNG train) |
| Chi phí LLM tăng ở 1 task hẹp | Lúc đó mới fine-tune model nhỏ |

> **Insight cốt lõi**
> - Bạn hầu như **KHÔNG bao giờ cần TRAIN**.
> - Cái cần là: **prompt tốt hơn + RAG + (có thể) fine-tune nhẹ model nhỏ** cho task hẹp.
> - Moat của sản phẩm là **DATA và TRẢI NGHIỆM**, không phải một LLM tự chế.

---

## 7. Kết luận & ưu tiên

Hệ thống AI hiện tại đã **vững về kiến trúc** (hybrid an toàn) và **đầy đủ năng lực nền** (workout, nutrition, vision, coach, pose). Giai đoạn tiếp theo nên tập trung vào việc làm AI *"đáng tiền hơn"* bằng các năng lực mà rule cứng không thể thay thế.

### Thứ tự ưu tiên đề xuất

| Ưu tiên | Hạng mục | Trạng thái |
|---|---|---|
| **1** | Hoàn thiện thư viện Bài tập (metadata) | ✅ Có audit admin, readiness gate, backfill metadata, catalog payload giàu trường |
| **2** | RAG cho Coach + Auto-regulation | 🟡 Auto-regulation đã chạy; RAG embeddings/vector store là bước kế tiếp |
| **3** | Nhập liệu ngôn ngữ tự nhiên | ✅ Đã có natural food log FE/BE/AI |
| **4** | Vision nâng cao (form check) | ✅ **Đã có pose real-time MediaPipe + HMAC**; mở rộng số bài là bước tiếp theo |

### Checklist kỹ thuật đã cập nhật

| Nhóm | Kết quả |
|---|---|
| Exercise metadata | `GET /api/admin/exercises/audit`, form admin mở metadata AI, seeder backfill, gate catalog trước khi gọi AI |
| Workout AI | AI chỉ sinh `ProgramTemplate`; Backend validate/expand/generate next week bằng Java |
| Auto-regulation | AI nhận `week_summary`, `last_week_log`, `preferences`; Backend lưu template mới và sinh tuần kế tiếp |
| Natural input | FE panel **Ghi bữa nhanh** gọi `/ai-plans/log-food-natural`, BE lưu `DailyNutritionLog` |
| Pose real-time | `fitness-ai-service` (MediaPipe) chấm rep + form từng frame; ký HMAC; backend `PoseResultVerifier` xác minh trước khi cộng điểm challenge |
| Macro dinh dưỡng | Protein theo g/kg (2.0 tăng cơ / 1.6 còn lại), fat 25% calo, carbs phần còn lại — Java tính, AI chỉ chọn món |

---

*— Hết báo cáo — Fitnit Challenge*
