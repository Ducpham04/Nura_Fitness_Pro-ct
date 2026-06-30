# CHIẾN LƯỢC SẢN PHẨM & THỊ TRƯỜNG — FITNIT CHALLENGE

> **Người lập:** Business Analyst kiêm Marketing PM (phiên tự chủ)
> **Ngày:** 14/06/2026
> **Phương pháp:** Đối chiếu trực tiếp codebase (109 commit, ~64k LOC) + memory dự án + nghiên cứu thị trường web
> **Mục đích:** Xác định phạm vi & độ hoàn thiện thật, đánh giá kỹ thuật / khoa học / hạ tầng / thị trường, đưa lộ trình + chiến lược mở bán.

---

## 0. TÓM TẮT ĐIỀU HÀNH (đọc cái này nếu chỉ có 2 phút)

Fitnit Challenge **không phải dự án dang dở — về mặt kỹ thuật nó gần như đã xong** (engineering ~88%). Lõi khoa học dinh dưỡng/thể lực **vững và có trích nguồn chuẩn**. Nút thắt thật **không nằm ở code mà ở 2 chỗ: (1) chưa deploy lên server thật, (2) chưa có một khách hàng nào** — tức toàn bộ giả thuyết thị trường chưa được kiểm chứng.

**Độ sẵn sàng MỞ BÁN (có trọng số): ~63%.**
Trong đó: Build 88% · Khoa học 85% · Hạ tầng (đã deploy) 70% · Go-to-market 25%.

**Phán quyết thẳng:**
- Ngừng thêm tính năng. Code đã thừa đủ để bán.
- Việc duy nhất đáng làm trong 2 tuần tới: **đưa lên mạng + lấy 10 người dùng thật trả tiền (kể cả chuyển khoản tay)**.
- Mục tiêu **100 triệu / 90 ngày từ B2C là phi thực tế** với một người làm, khởi đầu nguội (math ở §7). Nên **reframe**: 90 ngày để *validate công thức* (CAC, conversion, churn) + 50–150 người trả tiền + 2–3 phòng gym pilot. Mốc 100 triệu là mục tiêu **6 tháng**, và đường đến đó **chủ yếu là B2B (gym/PT)** chứ không phải bán lẻ 99k.

---

## 1. PHẠM VI & CHỨC NĂNG HIỆN CÓ (Scope Audit)

### 1.1 Kiến trúc (đã xác minh trên code)

| Lớp | Công nghệ | Quy mô thật | Trạng thái |
|---|---|---|---|
| Frontend | React + Vite + TS | 51 component, ~19.3k LOC | ✅ Hoàn chỉnh |
| Backend | Spring Boot 3 / Java 17 | 48 controller, 38 entity, ~38.9k LOC | ✅ Hoàn chỉnh |
| AI Service | Python + FastAPI | 28 file, ~6.5k LOC | ✅ Hoàn chỉnh |
| Pose Service | FastAPI + MediaPipe | service riêng, HMAC-signed | ✅ Hoàn chỉnh |
| DB | PostgreSQL + Flyway | 10 migration (V1–V10) | ✅ Versioned |
| LLM | Groq (multi-provider + fail-over) | 7 model fallback chain | ✅ Chống lock-in |

### 1.2 Bản đồ tính năng (nhóm theo giá trị người dùng)

**Lõi tạo giá trị (đã chạy, smoke-test 8/8 PASS):**
- AI **thực đơn theo ngân sách Việt** (chế độ chuẩn + Hybrid Smart Meal: AI chọn `dish_id`, Java giải nguyên liệu/gram/macro/chi phí từ công thức thật → không bịa món).
- AI **giáo án tập** cá nhân hóa (template tuần → Java bung lịch, tính calo MET, tăng tiến block 4 tuần, sinh tuần kế **không gọi lại AI** → tiết kiệm token).
- **Phân tích ảnh món ăn** (Llama Vision, nhận diện món Việt).
- **Chấm tư thế real-time** (MediaPipe 33 landmark, đếm rep máy trạng thái, chấm form, **HMAC server-authoritative chống gian lận điểm**).
- **AI Coach chat** (context-aware, đã chuẩn bị metadata cho RAG).
- **Log dinh dưỡng bằng ngôn ngữ tự nhiên**.

**Vòng giữ chân & doanh thu:**
- Challenges + Leaderboard + Rewards (gamification, điểm idempotent, cộng bù).
- **Hệ thống credit/gói AI**: FREE 25 / PLUS 49k–200 credit / PRO 99k–vô hạn; promo code; VNPay; theo dõi usage.
- Inventory ("tủ lạnh thông minh") + budget tracking.
- Quản trị: 9+ admin controller (user, challenge, food, dish, training, reward, transaction, dashboard stats).

**Vận hành & tin cậy:**
- Forgot/Reset password (email, token 30', single-use).
- Google OAuth login (BE verify ID token).
- Sentry (FE+BE, no-op khi trống DSN), Plausible analytics (funnel: Signup → PlanGenerated → Upgrade).
- DB backup tự động hằng đêm → S3.
- Privacy Policy + Terms (đã có, có disclaimer y tế).

### 1.3 Phán quyết kỹ thuật

> **Code đã ổn để bán.** Đây là sản phẩm trưởng thành, không phải MVP thô. Vấn đề còn lại là *vận hành & thương mại*, không phải *xây dựng*.

**Tồn đọng kỹ thuật (mức thấp, KHÔNG chặn launch):**
- IDOR tầng "quấy phá" còn sót: `restorePlan`/`swap-dish`/`feedback` theo planId không check owner; `deactivatePreference` không owner; `redeemReward` race-condition double-spend (chưa pessimistic lock). → Vá trong 1 buổi sau khi có user, không chặn go-live.
- PWA service worker: chưa có (ảnh hưởng trải nghiệm mobile "cài như app", không chặn bán).
- 70 bài tập seed chưa Việt hóa hoàn toàn (mỹ phẩm).
- Chưa có unit test diện rộng (chỉ có test an toàn nutrition/workout) — chấp nhận được ở giai đoạn này.

---

## 2. ĐÁNH GIÁ KHOA HỌC CHUYÊN MÔN (Scientific Soundness)

Đây là phần nhiều startup fitness làm ẩu. **Fitnit làm đúng chuẩn** — đã xác minh trong `ai-service/app/core/analyzer.py` và các resolver an toàn.

### 2.1 Điểm mạnh (có cơ sở khoa học, trích nguồn trong code)

| Hạng mục | Công thức / chuẩn dùng | Đánh giá |
|---|---|---|
| BMR | Mifflin-St Jeor (mặc định) + Katch-McArdle (khi có %mỡ) | ✅ Chuẩn vàng lâm sàng |
| TDEE | Hệ số PAL 1.2–1.9 theo **WHO/FAO 2001** | ✅ Chuẩn |
| Điều chỉnh calo theo mục tiêu | Giảm cân −500 (≈0.45kg/tuần, ngưỡng an toàn); tăng cơ +300 (lean bulk) — theo **NSCA/ACSM/ISSN** | ✅ Bằng chứng tốt |
| Calo buổi tập | Tính theo **MET** | ✅ Chuẩn ngành |
| Phân vai Hybrid | AI phán đoán mơ hồ / Java giữ phần "có đáp án đúng" (an toàn, toán, validate) | ✅ Thiết kế trưởng thành, giảm rủi ro ảo giác LLM |

### 2.2 Chắn an toàn y tế (rủi ro pháp lý cao nhất — đã vá 13/6)

- **Workout:** Java pre-filter bài tập theo catalog y tế (`PersonalizationResolver`), `workout_planner.py` bắt buộc `allowed_exercises`; FE có `riskTier` + `requiresMedicalClearance` + disclaimer.
- **Nutrition:** `NutritionSafetyResolver` parse tiền sử bệnh → avoid keywords (dị ứng) + diet rules (9 bệnh nền) + cờ cần khám; Java **hard-filter catalog món/food TRƯỚC khi gửi Groq**; response trả `medicalDisclaimer`; FE hiện banner.
- **Có unit test thật** (12 test, ~34ms) — đã bắt bug thật: hàm bỏ dấu tiếng Việt không tách `đ` → "tiểu đường"/"đậu phộng"/"đột quỵ" bị lọt → đã vá.

### 2.3 Giới hạn khoa học cần biết (và cách xử lý)

| Giới hạn | Rủi ro | Khuyến nghị |
|---|---|---|
| Lọc dị ứng khớp theo **TÊN món** | "hải sản" không bắt được món "Tôm rang" — chỉ prompt rule che | Bổ sung ánh xạ nguyên liệu→nhóm dị ứng (post-launch); giữ disclaimer mạnh |
| Dị ứng parse từ free-text | Người dùng gõ sai → lọt | Chuyển sang chọn checkbox nhóm dị ứng phổ biến (UX, làm sớm) |
| Chưa có chuyên gia dinh dưỡng/PT có chứng chỉ review | Không được tuyên bố "y tế/điều trị" | **Định vị là "trợ lý tham khảo", KHÔNG phải tư vấn y tế.** Giữ disclaimer ở mọi plan. Cân nhắc 1 cố vấn dinh dưỡng có bằng để tăng uy tín marketing |
| Chưa validate lâm sàng kết quả | — | Không cần ở giai đoạn này; thu thập kết quả thật của user làm social proof |

> **Phán quyết khoa học: ~85%.** Đủ vững để vận hành thương mại an toàn với disclaimer. Đừng tuyên bố y khoa. Khoảng trống còn lại là *uy tín được chứng thực* (chuyên gia + kết quả thật), không phải *sai công thức*.

---

## 3. HẠ TẦNG & VẬN HÀNH (Infrastructure Readiness)

### 3.1 Đã có sẵn (Infrastructure-as-Code)

- `docker-compose.prod.yml` (5 service: db, backend, ai-service, fitness-ai pose, frontend+nginx same-origin reverse proxy).
- `docker-compose.caddy.yml` (TLS tự động qua Caddy) + `deploy/Caddyfile`.
- **ECS Fargate IaC**: taskdef cho cả 4 service + IAM policy (read secrets, S3) + `register-all.sh` + tài liệu kiến trúc AWS.
- `.env.prod.example` đầy đủ: JWT, POSE_SIGNING_SECRET, S3 upload + backup, SMTP, VNPay, Sentry, Plausible.
- Service `db-backup` (pg_dump → S3 hằng đêm, đã test).
- Healthcheck đã vá (tắt mail indicator để `/actuator/health` không DOWN khi chưa cấu hình SMTP).

### 3.2 Khoảng trống (việc thật để LIVE — không phải code)

| Việc | Trạng thái | Thời gian | Chi phí |
|---|---|---|---|
| Mua VPS ≥4GB RAM | ❌ | 1 giờ | ~$12–20/tháng |
| Mua domain + trỏ DNS | ❌ | 1 giờ | ~200–300k/năm |
| Bật TLS (Caddy/Cloudflare) | ❌ | 30 phút | Miễn phí |
| Gmail App Password (SMTP) | ❌ | 15 phút | Miễn phí |
| **VNPay merchant** (nộp hồ sơ) | ❌ | duyệt 3–7 ngày | — |
| Sentry + Plausible domain | ❌ | 30 phút | Miễn phí tier |
| UptimeRobot (alert down) | ❌ | 15 phút | Miễn phí |
| Test e2e trên production | ❌ | 2 giờ | — |

> **Phán quyết hạ tầng: ~70%.** "Deployable" nhưng chưa "deployed". Mọi mảnh ghép code đã có; cần ~1 ngày thao tác + tiền lẻ để lên sóng. **Lựa chọn nhanh nhất: 1 VPS chạy `docker compose` (không cần ECS lúc này — ECS để dành khi scale).**

---

## 4. NGHIÊN CỨU THỊ TRƯỜNG (Market Research)

### 4.1 Quy mô & xu hướng

- Thị trường app fitness/health VN đang tăng mạnh (nhiều nguồn báo CAGR 2 chữ số; đô thị hóa + smartphone + thanh toán số + ý thức sức khỏe hậu-COVID).
- **Nhưng willingness-to-pay thấp:** ARPU subscription toàn cầu $3–9/tháng; nhóm Health & Fitness median 14-day ARPU chỉ ~$0.44. VN còn thấp hơn mặt bằng → **freemium rò rỉ cao, conversion free→paid là trận đánh chính.**

### 4.2 Bản đồ cạnh tranh

| Đối thủ | Mô hình | Định vị | Hàm ý cho Fitnit |
|---|---|---|---|
| **LEEP.app** (CMG Asia) | Gym-network + PT marketplace, ví thanh toán, 130+ club | Offline-first, well-funded | **Khác niche.** Họ bán "kết nối PT + gym"; Fitnit bán "AI lập kế hoạch ăn/tập theo ngân sách". Không đối đầu trực diện — thậm chí gym là *khách B2B* của Fitnit |
| MacroFactor | $6–12/tháng, macro tracking thông minh | Premium global | Đắt + tiếng Anh + món Tây → Fitnit thắng ở **món Việt + ngân sách VND + giá nội địa** |
| Eat This Much | $12/tháng, auto meal plan | Global, không free tier | Tương tự — Fitnit rẻ hơn 3x và bản địa hóa |
| MyFitnessPal | Freemium tracking | Phổ biến nhưng là *tracker*, không *planner* | Fitnit chủ động *lập kế hoạch*, không bắt user tự nghĩ |

### 4.3 Khác biệt hóa & "hào" (moat)

**Khác biệt cốt lõi (USP):** *"AI lập thực đơn + giáo án theo NGÂN SÁCH và MÓN VIỆT, có chắn an toàn bệnh nền, gắn challenge cộng đồng."* — không đối thủ nào ở VN gộp đủ 4 yếu tố này.

**Hào thật (vì AI/prompt trên Groq là copy được):**
1. **Dữ liệu adherence tích lũy** — log ăn/tập gắn `plan_id` → plan tốt dần theo từng user. *(Ưu tiên kỹ thuật #1: đảm bảo log gắn plan_id để ghi adherence — xem §8.)*
2. **Cộng đồng challenge + leaderboard** — network effect, chuyển đổi rời bỏ thành thi đua.
3. **Catalog món Việt + công thức thật theo vùng/giá** — tài sản dữ liệu khó sao chép nhanh.
4. **Thương hiệu "an toàn & bản địa"** — chắn bệnh nền + disclaimer làm đúng.

### 4.4 Mức độ ĐÁP ỨNG thị trường (product–market fit)

> **Giả thuyết PMF: CHƯA kiểm chứng (0 người dùng).** Sản phẩm khớp một nhu cầu có thật (người Việt muốn ăn-tập đúng mà rẻ, ngại tự tính macro), trong thị trường đang lớn, ở một niche chưa ai chiếm. Nhưng **willingness-to-pay là ẩn số sống còn** và chỉ trả lời được bằng 10–50 khách thật. Đây là việc khẩn cấp nhất.

---

## 5. THẺ ĐIỂM ĐỘ HOÀN THIỆN (Completion Scorecard)

| Chiều | Trọng số | Điểm | Đóng góp | Ghi chú |
|---|---|---|---|---|
| **Build (kỹ thuật/sản phẩm)** | 35% | 88% | 30.8 | Gần xong; chỉ còn IDOR nhẹ + PWA |
| **Khoa học chuyên môn** | 10% | 85% | 8.5 | Công thức chuẩn; thiếu chứng thực chuyên gia |
| **Hạ tầng (đã LIVE)** | 20% | 70% | 14.0 | IaC đủ; chưa deploy thật |
| **Go-to-market / Kinh doanh** | 35% | 25% | 8.75 | 0 user, chưa demo video, chưa kênh, chưa merchant |
| **TỔNG (sẵn sàng MỞ BÁN)** | 100% | — | **~62%** | Nút thắt = deploy + GTM, KHÔNG phải code |

**Đọc thẻ điểm:** Nếu chỉ tính "phần mềm đã xây xong chưa" → ~88%. Nếu tính "đã sẵn sàng để một người lạ trả tiền chưa" → ~62%. Khoảng cách 26 điểm đó **toàn bộ là việc vận hành + bán hàng**, làm được trong 2–3 tuần mà gần như không cần code thêm.

---

## 6. CHIẾN LƯỢC & LỘ TRÌNH PHÁT TRIỂN (Phased Roadmap)

Nguyên tắc xuyên suốt: **Đóng băng tính năng. Mỗi giai đoạn có 1 câu hỏi cần trả lời, không phải 1 danh sách việc.**

### GIAI ĐOẠN 0 — LÊN SÓNG (Tuần 1, ngày 1–7)
**Câu hỏi:** "App có chạy ổn định trên server thật cho người lạ không?"
- Mua VPS 4GB + domain → `docker compose -f docker-compose.prod.yml up` → bật TLS (Caddy).
- Điền `.env.prod`: JWT, DB pass, GROQ key, POSE_SIGNING_SECRET, S3 backup, Gmail App Password.
- **Nộp hồ sơ VNPay merchant NGAY** (song song, vì duyệt 3–7 ngày).
- Bật Sentry + Plausible + UptimeRobot.
- Chạy test e2e đủ luồng: đăng ký → onboarding → tạo meal/workout plan → challenge → mua credit (sandbox) → forgot password → admin.
- **Đầu ra:** URL chạy được + giám sát + dữ liệu seed demo.

### GIAI ĐOẠN 1 — 10 KHÁCH ĐẦU TIÊN (Tuần 2–4)
**Câu hỏi:** "Người lạ có thấy đủ giá trị để TRẢ TIỀN không (kể cả chuyển khoản tay)?"
- Quay **video demo 90 giây** (script có sẵn trong LAUNCH_CHECKLIST).
- Liên hệ 20–30 người trong vòng quen (người tập gym, PT, sinh viên muốn giảm cân) → mời dùng + xin feedback 1-1.
- **Close 5–10 người trả tiền đầu tiên** — chưa cần VNPay, nhận chuyển khoản tay rồi cấp gói thủ công.
- Thu **testimonial + screenshot kết quả thật** (social proof).
- Theo dõi 3 số bằng SQL hằng tuần: signup theo nguồn (cột `signup_source`/UTM), tỉ lệ free→paid, giao dịch.
- **Đầu ra:** 5–10 khách trả tiền + 3–5 testimonial + funnel số liệu đầu tiên.

### GIAI ĐOẠN 2 — TÌM KÊNH (Tháng 2)
**Câu hỏi:** "Kênh nào ra khách với chi phí ~0 và lặp lại được?"
- Test song song 3 kênh chi phí thấp: **TikTok demo** (trước/sau, "ăn 100k/ngày vẫn đủ macro"), **nhóm FB gym/giảm cân VN**, **micro-KOL gym** (hoa hồng thay vì phí trước).
- Bật **VNPay production** (sau khi có merchant).
- Tối ưu **landing page** theo conversion: headline rõ ("AI lập kế hoạch ăn + tập theo ngân sách của bạn"), giá rõ, social proof, CTA "Thử miễn phí".
- Đo CAC / conversion / churn theo kênh.
- **Đầu ra:** 1–2 kênh thắng + công thức unit economics sơ bộ.

### GIAI ĐOẠN 3 — NHÂN RỘNG + B2B (Tháng 3)
**Câu hỏi:** "Đổ thêm công vào kênh thắng có ra tiền tuyến tính không? B2B có mở khóa doanh thu lớn không?"
- Nhân đôi kênh thắng ở GĐ2.
- **Pilot B2B gym/PT**: gói 2–3M/tháng (quản lý member + plan hàng loạt) — đây là đường đến doanh thu lớn thật.
- Cân nhắc tier **"Coaching"** cao cấp (299–499k) có check-in người thật → tăng mật độ doanh thu.
- **Đầu ra:** quyết định scale/pivot dựa trên số thật; 2–3 gym pilot.

---

## 7. MÔ HÌNH TÀI CHÍNH & ĐỊNH GIÁ (Financial Model)

### 7.1 Sự thật về mục tiêu 100 triệu / 90 ngày

**Math B2C thuần (giá PRO 99k):**
- 100.000.000 ÷ 99.000 ≈ **1.010 thuê bao PRO**.
- Với conversion free→paid lạc quan 3–5% → cần **20.000–34.000 lượt đăng ký** trong 90 ngày.
- Khởi đầu nguội, một người làm, không ngân sách quảng cáo → **không khả thi**. Kể cả CAC chỉ 5.000đ cũng tốn 100–170 triệu ad spend.

**Math B2B (gym 2–3M/tháng):**
- 100 triệu ≈ **35–50 gym-tháng** → ví dụ 15–20 gym ký trong quý. **Khó nhưng khả thi** nếu dồn lực bán B2B.

**Kịch bản thực tế 90 ngày (blended, bootstrapped):**

| Kịch bản | Người trả tiền B2C | Gym pilot | Doanh thu 90 ngày | Giá trị thật |
|---|---|---|---|---|
| Thận trọng | 30–50 | 0–1 | 5–10 triệu | Validate funnel |
| Cơ sở | 80–150 | 2–3 | 12–25 triệu | Tìm được 1 kênh + PMF tín hiệu |
| Lạc quan | 200+ | 4–5 | 30–50 triệu | Kênh lặp lại được |

> **Khuyến nghị: Reframe 100 triệu thành mục tiêu 6 tháng**, đường đến đó chủ yếu qua B2B + tier coaching. 90 ngày đầu **tính điểm bằng *học được công thức* (CAC/conversion/churn) + 50–150 khách trả tiền + 2–3 gym**, không phải bằng doanh số.

### 7.2 Phê bình định giá hiện tại

| Vấn đề | Phân tích | Đề xuất |
|---|---|---|
| PRO 99k *vô hạn* chỉ gấp 2x PLUS 49k | PLUS gần như vô nghĩa — ai cũng nhảy thẳng PRO hoặc ở FREE | Giãn bậc: PLUS 79k (giá trị rõ) hoặc bỏ PLUS, thêm tier cao |
| Không có gói năm | Mất cơ hội khóa doanh thu + giảm churn | Thêm **gói năm giảm ~30%** (vd PRO năm ~790k) |
| Thiếu tier doanh thu cao | 99k khó đạt 100M | Thêm **Coaching 299–499k** (người thật check-in) + **Gym 2–3M** |
| FREE 25 credit | Hợp lý cho acquisition | Giữ; đo rò rỉ free→paid kỹ |

**Cấu trúc giá đề xuất:**
| Gói | Giá | Đối tượng | Vai trò |
|---|---|---|---|
| Free | 0đ (25 credit) | Acquisition | Phễu |
| Plus | 79k/tháng | Cá nhân thường | Volume |
| Pro | 99k/tháng · 790k/năm | Power user | Lõi doanh thu B2C |
| Coaching | 299–499k/tháng | Người cần kèm sát | Mật độ doanh thu |
| Gym/Studio | 2–3M/tháng | B2B | **Đường đến 100M** |

---

## 8. ƯU TIÊN KỸ THUẬT TỐI THIỂU TRƯỚC/QUANH LAUNCH

Chỉ những việc *bật được doanh thu hoặc đo lường*, không phải tính năng. **Trạng thái dưới đây đã đối chiếu code thực tế (14/6):**

1. **Adherence dinh dưỡng — KHOẢNG TRỐNG MOAT #1.** Đã xác minh:
   - ✅ `DailyTrainingLog` **đã** gắn `tp_id` (FK → `training_plans`, có index `idx_dtl_user_plan`) + đủ trường adherence (`status`, `perceivedDifficulty`, `effortLevel`, `fatigueLevel`, `score`, `confidence`). → Adherence **tập luyện** đã đo được tốt.
   - ❌ `DailyNutritionLog` **CHƯA** có `plan_id`/liên kết tới plan đã sinh (chỉ có user_id + tracking_date + macro). → **Việc cần làm:** thêm cột nối log dinh dưỡng với `PersonalizedNutritionPlan`/`PersonalizedMealItem` để biết user có *ăn đúng plan* không. *(Ưu tiên #1 — đây là tài sản dữ liệu nuôi moat)*
2. **`signup_source` / UTM trên User — CHƯA CÓ (đã xác minh).** Thêm 1 cột `signup_source` (đọc từ UTM param lúc đăng ký) → đo kênh nào ra khách. Rẻ, làm trước khi chạy kênh.
3. 3 query SQL theo dõi tuần (signup theo nguồn, free→paid, giao dịch VNPay).
4. Vá nốt IDOR tầng quấy phá + pessimistic lock `redeemReward` (1 buổi, sau khi có user).
5. Landing conversion-optimized (headline + giá + social proof + CTA).

KHÔNG làm: PWA, pose detection nâng cao, social sharing, refactor, test diện rộng, mobile app.

---

## 9. SỔ RỦI RO (Risk Register)

| # | Rủi ro | Khả năng | Tác động | Giảm thiểu |
|---|---|---|---|---|
| R1 | Willingness-to-pay VN thấp → conversion kém | Cao | Cao | Validate sớm với 10 khách tay; nghiêng về B2B + coaching; free tier giữ acquisition |
| R2 | Mục tiêu 100M/90 ngày tạo áp lực sai → đốt tiền ads vô ích | Cao | TB | Reframe thành mục tiêu học; cấm chạy ads trước khi có funnel số |
| R3 | Rủi ro pháp lý dinh dưỡng (gợi ý sai cho người bệnh nền) | TB | Cao | Disclaimer mọi nơi (đã có); KHÔNG tuyên bố y tế; bổ sung ánh xạ nguyên liệu→dị ứng |
| R4 | Phụ thuộc Groq (giá/giới hạn khi scale) | TB | TB | Đã tách multi-provider + 7 model fallback; cache plan khi có volume |
| R5 | Một người làm → bottleneck vận hành + bán hàng | Cao | Cao | Tự động hóa onboarding; ưu tiên 1 kênh; cân nhắc cộng sự sales/PT |
| R6 | LEEP/đối thủ lớn nhảy vào niche AI meal-budget | Thấp-TB | TB | Xây moat dữ liệu + cộng đồng nhanh; B2B hóa quan hệ gym trước |
| R7 | VNPay duyệt chậm → nghẽn thu tiền | TB | TB | Nhận chuyển khoản tay cho 10 khách đầu; nộp hồ sơ ngày 1 |
| R8 | Chưa deploy → mọi thứ kẹt | Đang xảy ra | Cao | GĐ0 tuần 1, dùng VPS + compose (không chờ ECS) |

---

## 10. KPI THEO DÕI (do hằng tuần)

**Bắc Đẩu (North Star):** *Số plan được TẠO và THỰC HIỆN có log adherence mỗi tuần* (đo giá trị thật + nuôi moat dữ liệu).

| Nhóm | Chỉ số | Mục tiêu GĐ1 |
|---|---|---|
| Acquisition | Signup/tuần theo nguồn | Bắt đầu đo |
| Activation | % hoàn tất onboarding + tạo plan đầu | >60% |
| Revenue | Free→paid conversion | Đo baseline |
| Retention | % quay lại tuần 2 (log tiếp) | >30% |
| Referral | Testimonial / lời mời | 3–5 |
| Đơn vị KT | CAC, ARPU, churn | Có số ở cuối GĐ2 |

---

## 11. KHUYẾN NGHỊ HÀNH ĐỘNG (48 GIỜ TỚI)

1. **Mua VPS + domain**, chạy `docker-compose.prod.yml`, bật TLS. *(nửa ngày)*
2. **Nộp hồ sơ VNPay merchant** ngay hôm nay. *(1 giờ)*
3. **Gmail App Password** + điền `.env.prod` + Sentry/Plausible domain.
4. **Test e2e** đủ luồng trên production.
5. **Quay video demo 90 giây.**
6. **Liệt kê 20 người** để mời dùng + nhắn 10 người đầu.

> Mọi thứ sau đó là lặp lại vòng: *demo → feedback → close → testimonial → kênh*. Code đã xong việc của nó. Trận đánh bây giờ là **phân phối & niềm tin**, không phải tính năng.

---

*Tài liệu này được xây bằng cách đối chiếu trực tiếp 109 commit + lõi khoa học `analyzer.py` + resolver an toàn + nghiên cứu thị trường. Các con số % là ước lượng có cơ sở để ra quyết định, không phải đo lường tuyệt đối.*
