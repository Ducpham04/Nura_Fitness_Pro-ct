# Báo cáo dự án Fitnit Challenge (Fitness AI)

## 1) Tổng quan

Hệ thống gồm 3 thành phần chính:

- **Frontend** (`-Fit_Ai_Challenge_Wep-App_FE`): Web app cho người dùng (UI + luồng tập luyện/challenge).
- **Backend** (`Fit_Ai_Challenge_Web-App_BE`): REST API + authentication + quản lý dữ liệu challenge/training/nutrition/rewards.
- **AI Service** (`fitness-ai-service`): FastAPI phân tích động tác từ ảnh/frame (MediaPipe) + WebSocket realtime.

Môi trường local sử dụng `docker-compose.local.yml` (DB + BE + AI) và FE chạy bằng Vite.

## 2) Kiến trúc (Architecture)

### 2.1 Sơ đồ mức cao

- **Browser** → **Frontend (Vite/React)** → gọi **Backend (Spring Boot)** qua REST
- **Backend** → **PostgreSQL** (Spring Data JPA)
- **Backend** → gọi **AI Service** qua HTTP (port 5001) khi cần chấm điểm/phân tích
- **Frontend** có thể gọi **AI Service** trực tiếp (tùy flow realtime qua WebSocket)

### 2.2 Storage/Uploads

- Backend upload file qua `FileController`, lưu vào thư mục local `uploads/`
- Backend serve file qua đường dẫn `/uploads/**`

## 3) Công nghệ sử dụng (Tech stack)

### 3.1 Frontend

- **React** `^18.3.1`
- **Vite** `^6.4.x`
- **React Router** (`react-router-dom`)
- **Tailwind stack** (`tailwind-merge`, `clsx`, `class-variance-authority`)
- **Radix UI** (nhiều component)
- **Playwright** `^1.55.0` (E2E)
- **MediaPipe / TFJS**: `@mediapipe/pose`, `@tensorflow/tfjs`, `@tensorflow-models/pose-detection`

### 3.2 Backend

- **Java 17**
- **Spring Boot** `3.5.7`
  - `spring-boot-starter-web`, `data-jpa`, `security`, `validation`
- **PostgreSQL** connector
- **JWT**: `io.jsonwebtoken (jjwt)` `0.11.5`

> Lưu ý: `pom.xml` vẫn còn dependency AWS S3 SDK (di sản từ dự án cũ), nhưng flow hiện tại dùng uploads local.

### 3.3 AI Service

- **FastAPI** `0.104.1`, **Uvicorn** `0.24.0`
- **MediaPipe** `0.10.8`
- **OpenCV** `4.8.1.78`
- **WebSockets** `12.0`
- **NumPy** `1.24.3`, **Pydantic** `2.5.0`

### 3.4 Database

- **PostgreSQL 16** (Docker image `postgres:16-alpine`)

## 4) API & tính năng đã hoàn thành

### 4.1 Backend REST API (Spring Boot)

> Prefix mặc định: `http://localhost:8080`

#### Auth / User

- **POST** `/api/auth/register`
- **POST** `/api/auth/login`
- **GET** `/api/auth/me`
- **GET** `/api/auth/user`
- **PUT** `/api/auth/profile`
- **GET** `/api/users/{id}`

#### User profile (v1)

- **GET** `/api/v1/users/{userId}/profile`
- **GET** `/api/v1/users/{userId}/profile/full`

#### Challenge (user)

- **GET** `/api/challenges/{id}`
- **POST** `/api/challenges/{id}/join`

#### Training plans (user)

- **GET** `/api/training-plans/{id}`
- **GET** `/api/training-plans/{id}/details`
- **POST** `/api/training-plans/{id}/start`
- **DELETE** `/api/training-plans/user/{utId}`

#### Daily training logs (user)

- **GET** `/api/user/daily-training-logs/plan/{trainingPlanId}`
- **GET** `/api/user/daily-training-logs/plan/{trainingPlanId}/day/{dayNumber}`

#### Personalized training (user)

- **GET** `/api/user/training/{utId}/day/{dayNumber}`
- **GET** `/api/user/personalized/today`
- **POST** `/api/user/training/{utId}/regenerate-personalized`

#### Health profile (user)

- **GET** `/api/user/health-profile/recommended-plans`
- **POST** `/api/user/health-profile/generate-personal-plan`

#### User info (user)

- **GET** `/api/user/info`
- **PUT** `/api/user/info`

#### Body metrics (user)

- **GET** `/api/user/body-metric/latest`
- (các endpoint khác nằm trong `BodyMetricHistoryController`/`UserBodyProfileController`)

#### User challenges (user)

- **GET** `/api/user/challenges/my`
- **PUT** `/api/user/challenges/{id}/complete`

#### Files

- **POST** `/api/files/upload-video`
- **POST** `/api/files/upload-image`
- **GET** `/api/files/presigned-url` (legacy, trả URL local)
- **GET** `/api/files/video` (legacy)
- **GET** `/api/files/image` (legacy)

#### Leaderboard

- **GET** `/api/leaderboard`
  - Query: `category` = `points|challenges|streak` (default `points`)
  - Query: `period` = `all-time|weekly|monthly` (default `all-time`)
  - Query: `limit` (default `50`)

#### Roles

- **GET** `/api/auth/roles`

#### Admin (tổng hợp theo controller)

Nhóm endpoint admin nằm rải ở các prefix:

- `/api/admin/*` (dashboard, challenges, submissions, training plans, data seeder…)
- `/api/admin/users/*`
- `/api/admin/goals/*`
- `/api/admin/foods/*`
- `/api/admin/dishes/*`
- `/api/admin/rewards*`

Các controller chính:

- `AdminUserController`
- `DashboardController`
- `ChallengeControllerAdmin`
- `ChallengeSubmissionController`
- `TrainingPlanControllerAdmin`
- `TrainingPlanDetailController`
- `DataSeederController`
- `RewardController`, `RewardRedemptionController`
- `TransactionController`
- `GoalsController`
- `FoodController`
- `DishAdminController`

Ghi chú: các controller legacy `MealController`, `MealFoodController`, `NutritionPlanController`, `UserNutritionController` đã được loại khỏi flow hiện tại. Admin meal plan mới quản lý catalog qua `Food`, `Dish`, `DishIngredient` và xem plan user qua `PersonalizedNutritionPlan`.

### 4.2 AI Service API (FastAPI)

> Base: `http://localhost:5001`

- **GET** `/health`
- **GET** `/exercises`
- **POST** `/api/analyze-frame` (multipart: `exercise_type`, `frame`)
- **POST** `/api/reset-counter` (optional query `exercise_type`)
- **WS** `/ws/exercise/{exercise_type}` (realtime base64 frame)

## 5) Cách chạy local (chuẩn hoá)

Từ repo root:

```bash
chmod +x ./dev.sh
./dev.sh
```

## 6) Tài liệu liên quan

- Báo cáo **entity / database mapping (JPA)**: [entity-report.md](./entity-report.md)
