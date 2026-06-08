# BÁO CÁO DỰ ÁN — FITNIT CHALLENGE

**Ứng dụng Fitness AI — Quản lý thể chất & thử thách sức khoẻ**

| Thông tin | Chi tiết |
|---|---|
| Tên dự án | Fitnit Challenge (FitChallenge) |
| Phiên bản | v2.1 — Production Ready (chấm tư thế real-time + deploy) |
| Ngày cập nhật | 08 tháng 6, 2026 |
| Công nghệ chính | React 18 + Spring Boot 3.5 + FastAPI + PostgreSQL 16 + MediaPipe |
| Môi trường triển khai | Docker Compose (local & production) / ngrok demo / Cloud ready |

---

## 1. TỔNG QUAN DỰ ÁN

Fitnit Challenge là nền tảng fitness toàn diện kết hợp AI, cho phép người dùng theo dõi sức khoẻ, tham gia thử thách thể dục, nhận kế hoạch dinh dưỡng & tập luyện cá nhân hoá, và **được AI chấm điểm tư thế tập luyện real-time qua camera**. Hệ thống được xây dựng theo kiến trúc microservice với **4 thành phần dịch vụ** chính.

### 1.1 Các thành phần hệ thống

| Thành phần | Công nghệ | Cổng | Vai trò |
|---|---|---|---|
| Frontend | React 18 + Vite + TypeScript | 5173 | Giao diện người dùng & admin |
| Backend | Spring Boot 3.5 (Java 17) | 8080 | REST API + Business Logic + Auth |
| AI Service | FastAPI + Groq API (Python) | 8001 | Sinh kế hoạch AI + Phân tích ảnh |
| **Pose Service** | FastAPI + MediaPipe (Python) | 8000 | **Chấm tư thế real-time, đếm rep, ký điểm HMAC** |
| Database | PostgreSQL 16 | 5432 | Lưu trữ dữ liệu chính |
| DB Admin | Adminer / pgAdmin | 8081 | Quản lý cơ sở dữ liệu |

> So với v2.0, hệ thống tách riêng **Pose Service** (`fitness-ai-service`) chạy MediaPipe
> để chấm form tập luyện liên tục — độc lập với AI Service (Groq LLM).

### 1.2 Luồng dữ liệu chính

1. Người dùng đăng nhập → JWT token → lưu localStorage.
2. Frontend gọi Backend `/api/*` với Bearer token.
3. Backend xử lý nghiệp vụ → gọi **AI Service** (Groq LLM) khi cần sinh kế hoạch.
4. AI Service dùng Groq API để generate kế hoạch dinh dưỡng & tập luyện; Backend validate + tính toán (calo, macro).
5. Khi tập challenge: camera → **Pose Service** (MediaPipe) chấm rep + form real-time → **ký kết quả bằng HMAC** → Backend xác minh chữ ký trước khi cộng điểm.
6. Kết quả lưu PostgreSQL → trả về Frontend.

---

## 2. CÔNG NGHỆ SỬ DỤNG (TECH STACK)

### 2.1 Frontend (React + Vite + TypeScript)

| Thư viện / Framework | Phiên bản | Mục đích |
|---|---|---|
| React | ^18.3.1 | UI Framework chính |
| Vite | ^5.4.2 | Build tool & Dev server |
| TypeScript | ^5.5.3 | Type safety |
| React Router DOM | ^7.15.0 | Client-side routing |
| Tailwind CSS | ^3.4.1 | Utility-first CSS framework |
| Lucide React | ^0.344.0 | Icon library |
| Recharts | ^2.x | Biểu đồ dữ liệu (macro, xu hướng cân nặng) |
| Sonner | ^2.0.7 | Toast notifications |
| i18next | ^26.2.0 | Đa ngôn ngữ (VI/EN) |
| Lenis | ^1.3.23 | Smooth scrolling |
| Framer Motion | ^11.x | Animation cao cấp (Dashboard) |

### 2.2 Backend (Spring Boot 3.5 / Java 17)

| Dependency | Phiên bản | Mục đích |
|---|---|---|
| Spring Boot | 3.5.7 | Framework chính |
| Spring Data JPA | built-in | ORM + Repository pattern |
| Spring Security | built-in | Authentication & Authorization |
| JJWT | 0.11.5 | JWT token generation/validation |
| Flyway | built-in | Quản lý schema migration (V1–V5) |
| PostgreSQL Driver | built-in | Database connectivity |
| Lombok | built-in | Code generation (Builder, Getter...) |
| SpringDoc OpenAPI | built-in | Swagger UI (tắt ở production) |
| Jackson | built-in | JSON serialization/deserialization |

### 2.3 AI Service (FastAPI / Python)

| Thư viện | Phiên bản | Mục đích |
|---|---|---|
| FastAPI | 0.104.1 | REST API framework |
| Uvicorn | 0.24.0 | ASGI server |
| Groq SDK / OpenAI client | latest | LLM API (Llama 4 Scout + chuỗi fallback) |
| Pydantic | 2.5.0 | Data validation & schemas |
| NumPy | 1.24.3 | Numerical computing |
| httpx / Requests | built-in | HTTP client |

### 2.3b Pose Service (FastAPI + MediaPipe)

| Thư viện | Mục đích |
|---|---|
| MediaPipe Pose | Phát hiện 33 landmark cơ thể từ frame camera |
| OpenCV / NumPy | Xử lý ảnh, tính góc khớp, khoảng cách |
| FastAPI + Uvicorn | API nhận frame, trả điểm form + rep |
| HMAC-SHA256 (hashlib/hmac) | Ký kết quả buổi thi (server-authoritative) |

### 2.4 Infrastructure

| Thành phần | Công nghệ | Ghi chú |
|---|---|---|
| Container (local) | Docker + Docker Compose | Chạy local với `./dev.sh` |
| Container (prod) | `docker-compose.prod.yml` | 5 service: db, backend, ai, pose, nginx+web |
| Schema migration | Flyway (V1–V5) | `ddl-auto=validate` ở production |
| Database | PostgreSQL 16 Alpine | Dữ liệu chính |
| DB UI | Adminer / pgAdmin | Port 8081 |
| File Storage | Local filesystem `/uploads/` | Upload ảnh/video |
| Authentication | JWT Stateless | Bearer token, không dùng session |
| Pose security | `POSE_SIGNING_SECRET` (HMAC) | Bí mật chia sẻ backend ↔ pose service |
| CORS | Spring `allowedOriginPatterns` | localhost + wildcard ngrok (`https://*.ngrok-free.app`) |
| Demo tunnel | ngrok | Phơi localhost ra internet cho demo |

---

## 3. CƠ SỞ DỮ LIỆU & ENTITIES (37 Entity)

### 3.1 Nhóm User & Authentication

| Entity | Bảng DB | Mô tả chính |
|---|---|---|
| User | users | Tài khoản người dùng: email, password, role, points, streak |
| Role | roles | Phân quyền: USER / ADMIN |
| HealthProfile | health_profiles | Hồ sơ sức khoẻ: mục tiêu, điều kiện y tế, dụng cụ, chấn thương |
| UserBodyProfile | user_body_profiles | Thông số cơ thể: chiều cao, cân nặng, BMI, BMR, TDEE |
| InformationBodyUser | information_body_users | Body data onboarding: tuổi, giới tính, mức vận động |
| BodyMetricHistory | body_metric_history | Lịch sử đo cơ thể theo thời gian (tracking & dự đoán tiến độ) |
| UserPreference | user_preferences | Tuỳ chọn cá nhân: món không thích, bài bỏ qua |
| Notification | notifications | Thông báo hệ thống cho user |

### 3.2 Nhóm Fitness & Training

| Entity | Bảng DB | Mô tả chính |
|---|---|---|
| Goals | goals | Mục tiêu tập luyện: Giảm cân, Tăng cơ, Cardio... |
| Exercise | exercises | Thư viện bài tập: MET value, video URL, cờ an toàn (knee/high_impact...) |
| TrainingPlan | training_plans | Kế hoạch tập luyện template (theo goal, độ khó, số tuần) |
| TrainingPlanDetail | training_plan_details | Lịch tập chi tiết: ngày, bài tập, sets, reps, restTime |
| UserTraining | user_trainings | User đăng ký training plan |
| UserTrainingSession | user_training_sessions | Log từng buổi tập |
| DailyTrainingLog | daily_training_logs | Nhật ký tập luyện hàng ngày (status, calo đốt, RPE) |
| PersonalizedPlanDetail | personalized_plan_details | Kế hoạch cá nhân hoá AI cho từng user |
| PlanVersionHistory | plan_version_history | Lịch sử thay đổi kế hoạch (auto-regulation) |
| ProgramTemplate | program_templates | Template chương trình tập (JSON AI sinh) |

### 3.3 Nhóm Challenges

| Entity | Bảng DB | Mô tả chính |
|---|---|---|
| Challenges | challenges | Thử thách: tiêu đề, duration, rewardPoints, AI rules |
| UserChallenge | user_challenges | User tham gia: status, **score & confidence do AI chấm** |
| AiEvaluationLog | ai_evaluation_logs | Log đánh giá AI cho submission |
| AiModelEvent | ai_model_events | Sự kiện từ AI model (pose detection) |
| Report | reports | Báo cáo/khiếu nại submission |

> **Bảo mật điểm:** `UserChallenge.score` chỉ được ghi khi backend xác minh thành công
> chữ ký HMAC từ Pose Service — client không thể tự khai điểm (xem §6.4).

### 3.4 Nhóm Nutrition & Food

| Entity | Bảng DB | Mô tả chính |
|---|---|---|
| Food | foods | Nguyên liệu: tên, calories/100g, protein, carbs, fat |
| Dish | dishes | Món ăn: role (MAIN_PROTEIN/SOUP/...), meal types |
| DishIngredient | dish_ingredients | Liên kết Dish ↔ Food (công thức món ăn) |
| PersonalizedNutritionPlan | personalized_nutrition_plans | Kế hoạch dinh dưỡng cá nhân hoá |
| PersonalizedMealItem | personalized_meal_items | Bữa ăn trong kế hoạch dinh dưỡng |
| PersonalizedMealDetail | personalized_meal_details | Chi tiết nguyên liệu trong bữa ăn (was_eaten tracking) |
| DailyNutritionLog | daily_nutrition_logs | Nhật ký dinh dưỡng hàng ngày |

### 3.5 Nhóm Rewards & Finance

| Entity | Bảng DB | Mô tả chính |
|---|---|---|
| Reward | rewards | Phần thưởng: tên, điểm đổi, tồn kho, partner |
| RewardRedemption | reward_redemptions | Đổi thưởng: status (PENDING/FULFILLED/CANCELLED) |
| Transaction | transactions | Giao dịch điểm: loại, số điểm, status |
| BudgetTracking | budget_tracking | Theo dõi ngân sách dinh dưỡng |
| UserInventory | user_inventory | Kho thực phẩm của user |

---

## 4. API ENDPOINTS (REST)

**Base URL:** `http://localhost:8080` | Tất cả endpoint có prefix `/api`

### 4.1 Authentication & User

| Method | Endpoint | Mô tả | Auth |
|---|---|---|---|
| POST | /api/auth/register | Đăng ký tài khoản mới (email trùng → 409) | Public |
| POST | /api/auth/login | Đăng nhập, nhận JWT token | Public |
| GET | /api/auth/me | Lấy thông tin user hiện tại | Bearer |
| PUT | /api/auth/profile | Cập nhật profile | Bearer |
| GET | /api/auth/roles | Danh sách roles | Public |

### 4.2 User — Body & Health

| Method | Endpoint | Mô tả | Auth |
|---|---|---|---|
| GET | /api/user/info | Lấy thông tin body user | Bearer |
| PUT | /api/user/info | Cập nhật thông tin body | Bearer |
| POST | /api/user/body-metric | Lưu mốc đo mới (BE tự tính BMI/BMR/TDEE) | Bearer |
| GET | /api/user/body-metric/latest | Số đo cơ thể mới nhất | Bearer |
| GET | /api/user/health-profile/recommended-plans | Training plans được đề xuất | Bearer |
| POST | /api/user/health-profile/generate-personal-plan | Sinh kế hoạch cá nhân | Bearer |

### 4.3 Training Plans

| Method | Endpoint | Mô tả | Auth |
|---|---|---|---|
| GET | /api/training-plans | Danh sách tất cả training plans | Public |
| GET | /api/training-plans/{id}/details | Lịch tập chi tiết của plan | Public |
| POST | /api/training-plans/{id}/start | User bắt đầu training plan | Bearer |
| GET | /api/user/personalized/today | Kế hoạch hôm nay | Bearer |
| POST | /api/user/training/{utId}/regenerate-personalized | Sinh lại kế hoạch AI | Bearer |
| POST | /api/ai-plans/auto-regulate | AI điều chỉnh tuần kế tiếp | Bearer |

### 4.4 Challenges

| Method | Endpoint | Mô tả | Auth |
|---|---|---|---|
| GET | /api/challenges | Danh sách challenges | Public |
| POST | /api/challenges/{id}/join | Tham gia challenge | Bearer |
| GET | /api/user/challenges/my | Challenges đang tham gia | Bearer |
| PUT | /api/user/challenges/{id}/complete | Hoàn thành (gửi {token, sig} đã ký HMAC) | Bearer |

### 4.5 Nutrition & Meal Planning

| Method | Endpoint | Mô tả | Auth |
|---|---|---|---|
| GET | /api/foods | Danh mục thực phẩm | Public |
| GET | /api/personalized-plans/today | Bữa ăn hôm nay | Bearer |
| POST | /api/ai-plans/generate-meal-hybrid | Sinh thực đơn Smart Meal (Dish catalog) | Bearer |
| POST | /api/ai-plans/log-food-natural | Ghi bữa bằng câu tự nhiên | Bearer |
| POST | /api/food-analysis/scan | Phân tích món ăn từ ảnh (AI) | Bearer |
| GET | /api/budget | Theo dõi ngân sách dinh dưỡng | Bearer |

### 4.6 Rewards & Transactions

| Method | Endpoint | Mô tả | Auth |
|---|---|---|---|
| GET | /api/reward-redemptions | Danh sách yêu cầu đổi thưởng | Bearer |
| POST | /api/reward-redemptions | Tạo yêu cầu đổi thưởng | Bearer |
| GET | /api/transactions | Lịch sử giao dịch điểm | Bearer |
| GET | /api/leaderboard | Bảng xếp hạng (points/challenges/streak) | Bearer |

### 4.7 Admin Endpoints (`/api/admin/*`)

| Nhóm | Prefix | Chức năng chính |
|---|---|---|
| Dashboard | /api/admin/dashboard/* | user/challenge/training/nutrition/reward-stats |
| **AI / Token** | /api/admin/dashboard/ai-stats | **Lượt gọi AI, token ước tính, top user, log gần nhất** |
| Users | /api/admin/users | CRUD users + body metrics + training plans |
| Goals | /api/admin/goals | CRUD mục tiêu (multipart: text + file upload) |
| Challenges | /api/admin/challenges | CRUD challenges + submissions + ảnh |
| Exercises | /api/admin/exercises | CRUD bài tập + audit metadata + **upload ảnh từ máy** |
| Training Plans | /api/admin/training-plans | CRUD kế hoạch + inline schedule |
| Foods / Dishes | /api/admin/foods, /dishes | CRUD thực phẩm, món ăn + công thức |
| Rewards | /api/admin/rewards | CRUD phần thưởng (multipart: file upload) |
| Data Seeder | /api/admin/data-seeder/* | Import dữ liệu mẫu (9 loại) |

### 4.8 AI & Pose Service Endpoints

| Service | Endpoint | Mô tả |
|---|---|---|
| AI (8001) | POST /api/ai-plans/generate-meal-hybrid | Sinh thực đơn (Groq + Dish catalog) |
| AI (8001) | POST /api/ai-plans/generate-workout | Sinh ProgramTemplate workout |
| AI (8001) | POST /api/ai-plans/workout/{utId}/generate-next-week | Sinh tuần kế tiếp (Java engine) |
| AI (8001) | POST /api/ai-coach/chat | Chat với AI Coach (Groq Llama) |
| AI (8001) | POST /api/food-analysis/scan | Nhận diện món ăn từ ảnh (Vision) |
| **Pose (8000)** | POST /analyze-frame | **Chấm 1 frame: góc khớp, đếm rep, điểm form** |
| **Pose (8000)** | POST /finalize | **Chốt buổi → ký HMAC kết quả {reps, quality, type}** |

---

## 5. FRONTEND — KIẾN TRÚC & TÍNH NĂNG

### 5.1 Cấu trúc thư mục

| Thư mục/File | Mô tả |
|---|---|
| src/pages/ | Landing, Login, Register, Dashboard, Admin, Onboarding... |
| src/components/ | UI components (WorkoutTab, DietTab, ChallengesView, ChallengeCameraModal...) |
| src/services/ | apiClient.ts, authService.ts, adminService.ts, trainingService.ts, challengeService.ts |
| src/hooks/ | useAuth.ts, useTraining.ts |
| src/context/ | AuthContext.tsx |
| src/config/ | api.ts (endpoints) |

### 5.2 Trang & Màn hình chính

| Trang | Route | Mô tả |
|---|---|---|
| Landing | / | Giới thiệu sản phẩm (Lenis smooth scroll, spotlight) |
| Login / Register | /login, /register | Xác thực, hỗ trợ demo account |
| Onboarding | /onboarding | Thu thập thông tin cơ thể |
| Dashboard → Home | /dashboard | Tổng quan: stats, kế hoạch hôm nay, biểu đồ macro/cân nặng |
| → Workout | /dashboard/workout | Kế hoạch tập + chọn số buổi/vùng cơ |
| → Diet | /dashboard/diet | Kế hoạch dinh dưỡng + ghi bữa nhanh |
| → Challenges | /dashboard/challenges | "Đấu trường" thử thách + camera chấm form |
| → Coach / Logbook / Profile | /dashboard/* | AI Coach, nhật ký, hồ sơ |
| Admin Panel | /admin | Trang quản trị (ADMIN role) |

### 5.3 Admin Panel — Tính năng quản trị

Admin Panel dark theme, sidebar collapsible với **8 nhóm chức năng**:

| Nhóm | Modules | Chức năng |
|---|---|---|
| Tổng quan | Dashboard | 5 stat cards: Users/Challenges/Training/Nutrition/Rewards |
| **Thống kê AI / Token** | AI Stats | **Lượt gọi AI, token ước tính, breakdown loại, top user, log 20 lần** |
| Tài khoản | Users | CRUD users, phân quyền |
| Nội dung Fitness | Mục tiêu, Thử thách, Bài tập, Kế hoạch tập | CRUD + inline lịch tập + upload ảnh bài tập |
| Dinh dưỡng | Thực phẩm, Món ăn & Công thức | CRUD + quản lý DishIngredient |
| Thưởng & Tài chính | Phần thưởng, Đổi thưởng, Giao dịch điểm | CRUD + cập nhật status |
| Hoạt động & Sức khoẻ | Bài nộp, Tham gia, Leaderboard, Body Profiles | Xem & quản lý |
| Nhập dữ liệu mẫu | Data Seeder | 9 loại seed data |

### 5.4 Tính năng đặc biệt Frontend

- Dark theme toàn bộ Admin Panel với accent màu theo domain.
- **Tab Thống kê AI/Token**: KPI cards (lượt gọi hôm nay/tháng, token), breakdown 3 loại call, top user, log gần nhất.
- **Upload ảnh bài tập từ máy**: chọn file → upload `/files/upload-image` → lưu URL (không chỉ dán link).
- Video player inline (YouTube embed + file video, `preload="none"`).
- Remote select dropdowns load từ API thực (Goals, Exercises, Plans).
- Biểu đồ Recharts: vòng macro, xu hướng cân nặng & calo đốt (lazy-load).
- **Việt hoá loading AI**: các màn sinh kế hoạch đã chuyển sang tiếng Việt.
- Đa ngôn ngữ (i18next), Toast (Sonner), Smooth scroll (Lenis), animation (Framer Motion).

---

## 6. BẢO MẬT & PHÂN QUYỀN

### 6.1 JWT Authentication

| Thành phần | Chi tiết |
|---|---|
| Token type | JWT — Stateless |
| Algorithm | HS256 (HMAC SHA-256) |
| Payload | email (subject) + role (claim) + expiration |
| Storage | localStorage |
| Header | Authorization: Bearer {token} |

### 6.2 Authorization Rules

| Endpoint pattern | Yêu cầu | Ghi chú |
|---|---|---|
| /api/auth/login, /register | Public | Không cần token |
| /api/goals, /foods, /challenges, /training-plans | Public GET | Đọc danh mục |
| /api/files/**, /uploads/** | Public | Static files |
| /api/admin/** | hasAuthority("ADMIN") | Chỉ role ADMIN |
| Còn lại | authenticated() | Cần đăng nhập |

### 6.3 Role System

- **USER** — Người dùng thông thường (roleId mặc định khi đăng ký).
- **ADMIN** — Quản trị viên, truy cập `/api/admin/**` và `/admin` frontend.
- Authority lưu trong JWT claim `role` (không prefix `ROLE_`); `JwtAuthenticationFilter` set `SimpleGrantedAuthority(role)`.

### 6.4 Bảo mật điểm tư thế — HMAC server-authoritative

Điểm challenge phải do **Pose Service ký**, client không thể bịa:

1. Pose Service tạo `token = base64url(JSON{reps, quality_score, exercise_type, issued_at})`.
2. Ký `sig = HMAC-SHA256(POSE_SIGNING_SECRET, token)`.
3. Client chỉ chuyển tiếp `{token, sig}` cho backend.
4. Backend (`PoseResultVerifier`) tính lại HMAC, so sánh **hằng-thời-gian** (chống timing attack), kiểm tra token **hết hạn sau 5 phút**, rồi lấy reps/quality **từ payload đã ký**.

> Bất biến: **không có chữ ký hợp lệ ⇒ không có điểm**.

### 6.5 CORS cho production / ngrok

`CorsConfig` dùng `allowedOriginPatterns` (hỗ trợ wildcard) thay vì `allowedOrigins`:
cho phép `http://localhost`, `https://*.ngrok-free.app`, `https://*.ngrok.io` → demo qua ngrok không bị chặn 403.

---

## 7. AI SERVICE — TÍCH HỢP TRÍ TUỆ NHÂN TẠO

### 7.1 Mô hình AI sử dụng

| Tính năng | Model/Service | Mô tả |
|---|---|---|
| Sinh thực đơn / workout | Groq — Llama 4 Scout 17B (+ chuỗi fallback) | LLM sinh template; tự chuyển model khi 429 |
| AI Coach Chat | Groq — Llama | Chatbot tư vấn sức khoẻ & dinh dưỡng |
| Phân tích ảnh món ăn | Groq Llama 3.2 Vision | Nhận diện món Việt, ước tính calo |
| **Chấm tư thế real-time** | **MediaPipe Pose (on-device)** | **Đếm rep + điểm form từng frame, KHÔNG tốn token LLM** |

> Chuỗi fallback 7 model text (Llama 4 Scout → Llama 3.3 70B → GPT-OSS 120B/20B → Qwen 32B → compound → Llama 3.1 8B) đảm bảo sẵn sàng cao.

### 7.2 Luồng sinh kế hoạch AI (Hybrid an toàn)

1. Java lọc bài tập an toàn (`findSafeExercisesForAi`) theo chấn thương + dụng cụ.
2. AI Service (Groq) sinh **ProgramTemplate** gọn (weekly_pattern, exercise_pool, base sets/reps).
3. Java validate ID (chống ảo giác) → bung lịch từng ngày, áp **periodization NSCA 4 tuần**, tính calo (MET).
4. Tuần kế tiếp do **engine Java** sinh từ template (auto-regulation) — không gọi lại AI cho việc bung.

### 7.3 Hybrid Smart Meal & macro do Java tính

- LLM chỉ chọn `dish_id` từ catalog (không tự bịa món).
- Backend giải nguyên liệu, gram, macro, chi phí từ `foods.*_per_100g`.
- **Mục tiêu macro** (do Java tính): protein theo g/kg (2.0 tăng cơ / 1.6 còn lại), fat 25% calo, carbs phần còn lại.

### 7.4 Chấm tư thế real-time (Pose Service)

- MediaPipe phát hiện 33 landmark; mỗi bài (squat, push-up, pull-up, sit-up, plank) có analyzer riêng.
- Tính **góc khớp**, **đếm rep** bằng máy trạng thái hysteresis + làm mượt, chấm **điểm form 0–100** (trừ điểm theo lỗi + lệch góc, làm mượt EMA).
- Kết quả được **ký HMAC** trước khi gửi backend (xem §6.4).
- Chi tiết công thức: *Báo cáo kỹ thuật §5.9–5.11*.

---

## 8. HƯỚNG DẪN CÀI ĐẶT & CHẠY

### 8.1 Yêu cầu hệ thống

| Phần mềm | Phiên bản tối thiểu | Ghi chú |
|---|---|---|
| Docker Desktop | 24.0+ | Bắt buộc cho database & services |
| Node.js | 20+ | Cho Frontend (Vite) |
| Java JDK | 17+ | Cho Backend (Spring Boot) |
| Python | 3.11+ | Cho AI & Pose Service |

### 8.2 Biến môi trường cần thiết

| Biến | Mô tả | Ví dụ |
|---|---|---|
| JWT_SECRET | Secret key cho JWT (≥32 ký tự) | fitchallenge-secret-key-... |
| SPRING_DATASOURCE_PASSWORD | Password PostgreSQL | your_db_password |
| GROQ_API_KEY | API key từ console.groq.com | gsk_... |
| POSE_SIGNING_SECRET | Bí mật ký điểm tư thế (chia sẻ BE ↔ pose) | pose-secret-32chars... |

### 8.3 Khởi động hệ thống

- **Local toàn bộ:** `./dev.sh` (Docker Compose).
- **Production:** `docker compose -p fitnit-prod --env-file .env.prod -f docker-compose.prod.yml up -d --build`.
- Chạy riêng từng service: Frontend (`npm run dev`), Backend (`./mvnw spring-boot:run`), AI (`uvicorn main:app --port 8001`).

### 8.4 Endpoints sau khi khởi động

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8080 |
| Swagger UI (local) | http://localhost:8080/swagger-ui.html |
| AI Service | http://localhost:8001 |
| Pose Service | http://localhost:8000 |
| Adminer / pgAdmin | http://localhost:8081 |

---

## 9. TÍNH NĂNG ĐÃ HOÀN THIỆN

### 9.1 Người dùng (User)

- Đăng ký / Đăng nhập / Đăng xuất với JWT (email trùng báo 409 rõ ràng).
- Onboarding thu thập thông tin cơ thể & mục tiêu.
- Dashboard cá nhân: stats, kế hoạch hôm nay, biểu đồ macro/cân nặng/calo đốt.
- **Check-in thể trạng hằng tuần** + theo dõi BMI/cân nặng qua thời gian.
- Nhật ký tập luyện & dinh dưỡng; ghi bữa bằng câu tự nhiên.
- Leaderboard, thông báo, đổi thưởng bằng điểm.

### 9.2 Fitness & Training

- Thư viện bài tập có video, thông số kỹ thuật, cờ an toàn.
- Kế hoạch cá nhân hoá AI theo goal & fitness level; **chọn số buổi/tuần + vùng cơ**.
- Periodization NSCA 4 tuần + cân bằng đẩy–kéo, lọc an toàn theo chấn thương.
- Log buổi tập, theo dõi tiến độ; **AI auto-regulation** điều chỉnh tuần kế tiếp.
- **Chấm tư thế real-time qua camera** (đếm rep + điểm form) khi tham gia challenge.
- AI Coach chatbot tư vấn.

### 9.3 Dinh dưỡng

- Kế hoạch bữa ăn cá nhân hoá AI (Hybrid Smart Meal — LLM + catalog thực).
- Macro do Java tính (protein g/kg, fat 25%, carbs còn lại).
- Phân tích dinh dưỡng từ ảnh (AI food scanner).
- Nhật ký dinh dưỡng, theo dõi macro, quản lý inventory thực phẩm, ngân sách.

### 9.4 Admin Panel

- Dashboard thống kê 5 metrics + **tab Thống kê AI/Token** (lượt gọi, token, top user, log).
- CRUD đầy đủ các module; **upload ảnh bài tập từ máy**.
- Quản lý bài tập với video inline + audit metadata.
- Inline schedule viewer, Data Seeder 9 loại, bộ lọc/search/phân trang.
- Dark theme nhất quán, tiếng Việt hoàn toàn.

---

## 10. TRIỂN KHAI PRODUCTION

| Hạng mục | Trạng thái |
|---|---|
| Docker Compose production (`docker-compose.prod.yml`) | ✅ 5 service (db, backend, ai, pose, nginx+web) |
| Flyway migration (V1–V5), `ddl-auto=validate` | ✅ Schema quản lý chặt ở prod |
| Swagger tắt ở production | ✅ `springdoc.*.enabled=false` |
| CORS wildcard cho ngrok/domain | ✅ `allowedOriginPatterns` |
| HMAC pose scoring (`POSE_SIGNING_SECRET`) | ✅ Chống gian lận điểm |
| Demo qua ngrok | ✅ Phơi localhost ra internet |
| HTTPS/TLS, Cloud VM (Oracle/VPS) | ⏳ Bước tiếp theo |

---

## 11. CẤU TRÚC THƯ MỤC DỰ ÁN

| Thư mục | Mô tả |
|---|---|
| backend/ | Spring Boot application (Java 17) |
| backend/.../Entity/ | 37 JPA Entities (Lombok + Builder) |
| backend/.../controller/ | REST Controllers (Admin + User + Public) |
| backend/.../service/ | Service interfaces + implementations |
| backend/.../utils/ | BodyMetricsCalculator, CaloriesCalculator |
| backend/.../Security/ | JWT filter, Security config, CORS, PoseResultVerifier |
| backend/src/main/resources/db/migration/ | Flyway V1–V5 |
| frontEnd-Lastversion/ | React + Vite + TypeScript frontend |
| ai-service/ | FastAPI AI Service (Groq planners, vision) |
| fitness-ai-service/ | Pose Service (MediaPipe analyzers + HMAC) |
| docs/ | Tài liệu dự án (báo cáo, API docs, entity docs) |

---

*— Hết báo cáo — Cập nhật: 08 tháng 6, 2026*
