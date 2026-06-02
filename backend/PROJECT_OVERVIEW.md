# TỔNG QUAN DỰ ÁN - Fitness AI Backend

**Ngày tạo:** May 7, 2026  
**Tên dự án:** FIT Challenge (Fitness AI Challenge)  
**Phiên bản:** 0.0.1-SNAPSHOT  
**Java:** 17  
**Spring Boot:** 3.5.7

---

## 📋 MỤC LỤC

1. [Giới thiệu](#giới-thiệu)
2. [Kiến trúc hệ thống](#kiến-trúc-hệ-thống)
3. [Công nghệ và thư viện](#công-nghệ-và-thư-viện)
4. [Cấu trúc dự án](#cấu-trúc-dự-án)
5. [API Endpoints](#api-endpoints)
6. [Cơ sở dữ liệu](#cơ-sở-dữ-liệu)
7. [Bảo mật](#bảo-mật)
8. [Triển khai](#triển-khai)
9. [Cấu hình](#cấu-hình)

---

## 🎯 GIỚI THIỆU

**FIT Challenge** là backend cho ứng dụng Fitness AI, cung cấp các tính năng:

- 🏋️ **Quản lý tập luyện:** Kế hoạch tập, thử thách, theo dõi tiến độ
- 🤖 **AI Evaluation:** Phân tích video tập luyện bằng AI (tích hợp Python service)
- 🥗 **Dinh dưỡng:** Kế hoạch ăn uống, quản lý thực phẩm
- 🏆 **Gamification:** Thử thách, điểm thưởng, đổi quà
- 📊 **Báo cáo:** Theo dõi chỉ số cơ thể, lịch sử tập luyện
- 🔔 **Thông báo:** Hệ thống thông báo đa kênh

---

## 🏗️ KIẾN TRÚC HỆ THỐNG

### Layer Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐│
│  │ Controllers │  │    DTOs     │  │ Request/Response││
│  └──────┬──────┘  └─────────────┘  └─────────────────┘│
├─────────┼───────────────────────────────────────────────┤
│         │              BUSINESS LAYER                  │
│  ┌──────┴──────┐  ┌─────────────┐  ┌─────────────────┐│
│  │   Services  │  │  Validation │  │   Business Logic││
│  └──────┬──────┘  └─────────────┘  └─────────────────┘│
├─────────┼───────────────────────────────────────────────┤
│         │              DATA ACCESS LAYER               │
│  ┌──────┴──────┐  ┌─────────────┐                      │
│  │Repositories │  │   Entities  │                      │
│  └──────┬──────┘  └─────────────┘                      │
├─────────┼───────────────────────────────────────────────┤
│         │              DATABASE                         │
│  ┌──────┴────────────────────────────┐                   │
│  │        MySQL / Docker Volume      │                   │
│  └───────────────────────────────────┘                   │
└─────────────────────────────────────────────────────────┘
```

### System Components

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Client App    │────▶│   Spring Boot   │────▶│   AI Service    │
│  (Web/Mobile)   │     │     Backend     │     │   (Python/ML)   │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    │              │              │
                    ▼              ▼              ▼
            ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
            │    MySQL    │ │  AWS S3     │ │    JWT      │
            │  Database   │ │  (Files)    │ │   Auth      │
            └─────────────┘ └─────────────┘ └─────────────┘
```

---

## 🛠️ CÔNG NGHỆ VÀ THƯ VIỆN

### Core Framework

| Thư viện | Phiên bản | Mục đích |
|----------|-----------|----------|
| Spring Boot | 3.5.7 | Framework chính |
| Spring Data JPA | 3.5.7 | ORM, Database access |
| Spring Security | 3.5.7 | Authentication, Authorization |
| Spring Validation | 3.5.7 | Request validation |
| Hibernate | 6.x | JPA Implementation |

### Security & Authentication

| Thư viện | Phiên bản | Mục đích |
|----------|-----------|----------|
| JJWT API | 0.11.5 | JWT Token generation |
| JJWT Jackson | 0.11.5 | JWT JSON serialization |
| BCrypt | - | Password hashing |

### Database & Storage

| Thư viện/Công nghệ | Phiên bản | Mục đích |
|---------------------|-----------|----------|
| MySQL Connector | 8.x | MySQL database driver |
| HikariCP | - | Connection pooling |
| AWS S3 SDK | 2.38.3 | File storage |

### Utilities

| Thư viện | Phiên bản | Mục đích |
|----------|-----------|----------|
| Lombok | 1.18.x | Boilerplate code reduction |
| Dotenv Java | 2.2.4 | Environment variables |

### Development & DevOps

| Công cụ | Mục đích |
|---------|----------|
| Maven | Build tool |
| Docker | Containerization |
| Docker Compose | Multi-container orchestration |
| Spring DevTools | Hot reload (development) |

---

## 📁 CẤU TRÚC DỰ ÁN

```
Fit_Ai_Challenge_Web-App_BE/
├── src/main/java/com/example/fitchallenge/
│   ├── FitChallengeApplication.java    # Entry point
│   ├──
│   ├── config/                         # Configuration
│   │   ├── FileStorageConfig.java
│   │   ├── NotificationResponse.java
│   │   └── WebConfig.java
│   │
│   ├── controller/                     # REST Controllers
│   │   ├── Admin/                      # Admin APIs (19 files)
│   │   │   ├── AdminUserController.java
│   │   │   ├── Auth.java
│   │   │   ├── ChallengeControllerAdmin.java
│   │   │   ├── DashboardController.java
│   │   │   ├── FoodController.java
│   │   │   ├── GoalsController.java
│   │   │   ├── MealController.java
│   │   │   ├── NutritionPlanController.java
│   │   │   ├── RewardController.java
│   │   │   ├── TrainingPlanControllerAdmin.java
│   │   │   └── ... (9 more)
│   │   │
│   │   ├── User/                       # User APIs (8 files)
│   │   │   ├── BodyMetricHistoryController.java
│   │   │   ├── DailyTrainingLogController.java
│   │   │   ├── HealthProfileController.java
│   │   │   ├── RewardRedemptionController.java
│   │   │   └── ... (4 more)
│   │   │
│   │   ├── UserChallenge/              # Challenge APIs
│   │   │   └── UserChallengeController.java
│   │   │
│   │   ├── AuthController.java         # Authentication
│   │   ├── ChallengeController.java    # Public challenges
│   │   ├── FileController.java         # File upload/download
│   │   ├── LeaderboardController.java  # Leaderboard
│   │   ├── RoleController.java         # Roles
│   │   └── TrainingPlanController.java # Training plans
│   │
│   ├── DTO/                            # Data Transfer Objects
│   │   ├── user/
│   │   ├── ChallengeDTO/
│   │   ├── FoodDTO/
│   │   ├── MealDTO/
│   │   └── ... (10 packages)
│   │
│   ├── Entity/                         # JPA Entities (26 entities)
│   │   ├── User.java
│   │   ├── Challenges.java
│   │   ├── TrainingPlan.java
│   │   ├── NutritionPlan.java
│   │   ├── Reward.java
│   │   └── ... (21 more)
│   │
│   ├── repository/                     # Repositories (23 interfaces)
│   │   ├── UserRepository.java
│   │   ├── ChallengeRepository.java
│   │   └── ... (21 more)
│   │
│   ├── service/                        # Business Services
│   │   ├── impl/                       # Service implementations (28 files)
│   │   ├── UserService.java
│   │   ├── ChallengeService.java
│   │   ├── TrainingPlanService.java
│   │   └── ... (23 interfaces)
│   │
│   ├── Security/                       # Security configuration
│   │   ├── JWT/
│   │   │   ├── JwtAuthenticationEntryPoint.java
│   │   │   ├── JwtAuthenticationFilter.java
│   │   │   └── JwtTokenProvider.java
│   │   ├── CorsConfig.java
│   │   └── SecurityConfig.java
│   │
│   └── utils/                          # Utility classes
│
├── src/main/resources/
│   ├── application.properties          # Main config
│   ├── application-local.properties    # Local profile
│   ├── application-docker.properties   # Docker profile
│   └── application-prod.properties   # Production profile
│
├── uploads/                            # Local file storage
├── postman/                            # API collections
├── reports/                            # Generated reports
├── Dockerfile                          # Multi-stage build
├── docker-compose.yml                  # Local development
├── pom.xml                             # Maven dependencies
└── ENTITY_REPORT.md                    # Database documentation

```

---

## 🔌 API ENDPOINTS

### Authentication APIs (`/api/auth/*`)

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/api/auth/register` | Đăng ký tài khoản |
| POST | `/api/auth/login` | Đăng nhập |
| GET | `/api/auth/me` | Lấy thông tin user hiện tại |
| PUT | `/api/auth/profile` | Cập nhật profile |

### Challenge APIs (`/api/challenges/*`)

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/challenges` | Danh sách thử thách |
| GET | `/api/challenges/{id}` | Chi tiết thử thách |
| POST | `/api/user-challenges` | Tham gia thử thách |
| POST | `/api/user-challenges/{id}/submit` | Nộp video thử thách |
| GET | `/api/user-challenges/my` | Lịch sử tham gia của user |

### Training Plan APIs (`/api/training-plans/*`)

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/training-plans` | Danh sách kế hoạch tập |
| GET | `/api/training-plans/{id}` | Chi tiết kế hoạch |
| POST | `/api/user-training` | Đăng ký kế hoạch tập |
| GET | `/api/user-training/my` | Kế hoạch tập của user |
| GET | `/api/daily-training-log` | Log tập luyện hàng ngày |
| POST | `/api/daily-training-log` | Tạo log tập luyện |

### Nutrition APIs (`/api/nutrition/*`)

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/nutrition-plans` | Danh sách kế hoạch dinh dưỡng |
| POST | `/api/user-nutrition` | Đăng ký kế hoạch dinh dưỡng |
| GET | `/api/meals` | Danh sách bữa ăn |
| GET | `/api/foods` | Danh sách thực phẩm |

### Reward APIs (`/api/rewards/*`)

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/rewards` | Danh sách phần thưởng |
| POST | `/api/reward-redemptions` | Đổi phần thưởng |
| GET | `/api/transactions` | Lịch sử giao dịch |

### File APIs (`/api/files/*`)

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/api/files/upload` | Upload file/video |
| GET | `/api/files/{filename}` | Download file |
| GET | `/uploads/**` | Static file serving |

### Leaderboard APIs (`/api/leaderboard/*`)

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/leaderboard` | Bảng xếp hạng |
| GET | `/api/leaderboard/weekly` | BXH tuần |
| GET | `/api/leaderboard/monthly` | BXH tháng |

### Health Profile APIs (`/api/health/*`)

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/health-profile` | Lấy health profile |
| POST | `/api/health-profile` | Tạo/cập nhật profile |
| GET | `/api/body-metric-history` | Lịch sử chỉ số cơ thể |
| POST | `/api/body-metric-history` | Thêm chỉ số mới |

### Admin APIs (`/api/admin/*`)

| Prefix | Mô tả |
|--------|-------|
| `/api/admin/users` | Quản lý users |
| `/api/admin/challenges` | Quản lý thử thách |
| `/api/admin/training-plans` | Quản lý kế hoạch tập |
| `/api/admin/nutrition-plans` | Quản lý kế hoạch dinh dưỡng |
| `/api/admin/foods` | Quản lý thực phẩm |
| `/api/admin/rewards` | Quản lý phần thưởng |
| `/api/admin/transactions` | Quản lý giao dịch |
| `/api/admin/dashboard` | Dashboard thống kê |

---

## 🗄️ CƠ SỞ DỮ LIỆU

### Thông tin kết nối

| Thông số | Giá trị |
|----------|---------|
| Database | PostgreSQL 16 |
| Connection Pool | HikariCP |
| ORM | Hibernate (JPA) |
| DDL Auto | update (dev) / validate (prod) |
| Dialect | PostgreSQLDialect |

### Các bảng chính (26 entities)

| STT | Entity | Table | Mục đích |
|-----|--------|-------|----------|
| 1 | User | users | Thông tin người dùng |
| 2 | Role | roles | Phân quyền |
| 3 | Challenges | challenges | Thử thách tập luyện |
| 4 | Goals | goals | Mục tiêu tập luyện |
| 5 | TrainingPlan | training_plans | Kế hoạch tập |
| 6 | TrainingPlanDetail | training_plan_details | Chi tiết kế hoạch |
| 7 | UserTraining | user_training | User đăng ký kế hoạch |
| 8 | DailyTrainingLog | daily_training_logs | Log tập luyện |
| 9 | NutritionPlan | nutrition_plans | Kế hoạch dinh dưỡng |
| 10 | Meal | meals | Bữa ăn |
| 11 | Food | foods | Thực phẩm |
| 12 | Reward | rewards | Phần thưởng |
| 13 | UserChallenge | user_challenges | Tham gia thử thách |
| 14 | AiEvaluationLog | ai_evaluation_logs | Log đánh giá AI |
| 15 | AiModelEvent | ai_model_events | Sự kiện AI |
| ... | ... | ... | ... |

> **Chi tiết xem:** [ENTITY_REPORT.md](./ENTITY_REPORT.md)

---

## 🔒 BẢO MẬT

### JWT Authentication

```
┌────────────────────────────────────────────────────────┐
│                    JWT FLOW                            │
├────────────────────────────────────────────────────────┤
│  1. Client ──POST /api/auth/login──▶ Server           │
│  2. Server validates credentials                       │
│  3. Server ──returns JWT Token──▶ Client               │
│  4. Client stores token                                │
│  5. Client ──requests with Header:                    │
│     Authorization: Bearer <token> ──▶ Server        │
│  6. JwtAuthenticationFilter validates token            │
│  7. Server processes request                           │
└────────────────────────────────────────────────────────┘
```

### Security Configuration

| Feature | Implementation |
|---------|----------------|
| Password Hashing | BCrypt (strength 10) |
| Token Type | JWT (HS512) |
| Token Expiration | 24 hours (86400000ms) |
| CORS | Configured for localhost:5173, Lambda API Gateway |
| Session | Stateless (STATELESS) |
| CSRF | Disabled (API only) |

### CORS Configuration

```java
Allowed Origins:
- http://localhost:5173        (Vite dev server)
- http://localhost:3000        (React dev server)
- https://*.execute-api.*.amazonaws.com  (AWS Lambda)

Allowed Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH
Allowed Headers: *
Allow Credentials: true
Max Age: 3600 seconds
```

---

## 🚀 TRIỂN KHAI

### Docker Multi-Stage Build

```dockerfile
Stage 1: dependencies ── Cache Maven dependencies
Stage 2: development ── Dev mode với hot reload + debug port 5005
Stage 3: builder ── Build production JAR
Stage 4: production ── Runtime với JAR (port 8080)
```

### Các môi trường

| Môi trường | Profile | Config File | Database |
|------------|---------|-------------|----------|
| Local | local | application-local.properties | localhost PostgreSQL |
| Docker | docker | application-docker.properties | Docker PostgreSQL |
| Production | prod | application-prod.properties | Production PostgreSQL |

### Docker Compose Services

```yaml
services:
  - app: Spring Boot application (port 8080, 5005)
  - db: PostgreSQL database (port 5432)
  - pgadmin: PostgreSQL Admin (port 8081)
```

---

## ⚙️ CẤU HÌNH

### Key Configuration (application.properties)

```properties
# Server
server.port=8080

# Database
spring.datasource.url=jdbc:mysql://localhost:3306/fit_challenge
spring.datasource.username=root
spring.datasource.password=${SPRING_DATASOURCE_PASSWORD}
spring.datasource.hikari.maximum-pool-size=10

# JPA
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=true

# JWT
jwt.secret=${JWT_SECRET:min-32-char-secret-key}
jwt.expiration=86400000

# File Upload
spring.servlet.multipart.max-file-size=3000MB
spring.servlet.multipart.max-request-size=3000MB

# AI Service
ai.service.url=http://localhost:5001

# CORS
spring.web.cors.allowed-methods=GET,POST,PUT,DELETE,OPTIONS,PATCH
```

### Environment Variables

| Variable | Mô tả | Default |
|----------|-------|---------|
| `SPRING_PROFILES_ACTIVE` | Active profile | local |
| `SPRING_DATASOURCE_URL` | Database URL | localhost |
| `SPRING_DATASOURCE_USERNAME` | DB username | root |
| `SPRING_DATASOURCE_PASSWORD` | DB password | 123456 |
| `JWT_SECRET` | JWT signing key | (dev key) |
| `JWT_EXPIRATION` | Token TTL (ms) | 86400000 |
| `UPLOAD_PATH` | File upload path | uploads/ |
| `APP_PUBLIC_BASE_URL` | Public URL | (empty) |
| `CORS_ALLOWED_ORIGINS` | Allowed origins | localhost |

---

## 📊 THỐNG KÊ

| Metric | Giá trị |
|--------|---------|
| Entities | 26 |
| Controllers | 27 |
| Services | 28 |
| Repositories | 23 |
| DTO Packages | 12+ |
| API Endpoints | 60+ |
| Dependencies | 20+ |

---

## 🔗 INTEGRATION

### External Services

| Service | Purpose | URL |
|---------|---------|-----|
| AI Service | Video analysis | http://localhost:5001 |
| AWS S3 | File storage | Configured |
| PostgreSQL | Database | jdbc:postgresql://... |

### Client Integration

- **Web Frontend:** Vite + React (localhost:5173)
- **Mobile App:** (tương lai)
- **API Gateway:** AWS Lambda (cấu hình CORS)

---

## 📚 TÀI LIỆU THAM KHẢO

| File | Mô tả |
|------|-------|
| [ENTITY_REPORT.md](./ENTITY_REPORT.md) | Chi tiết database entities |
| [pom.xml](./pom.xml) | Maven dependencies |
| [Dockerfile](./Dockerfile) | Docker build configuration |
| [docker-compose.yml](./docker-compose.yml) | Local development setup |

---

## 📞 HỖ TRỢ

- **Local Development:** `docker-compose up`
- **Debug Port:** 5005 (JPDA)
- **API Base URL:** http://localhost:8080/api

---

**Lưu ý:** Tài liệu này được tạo tự động từ codebase. Để cập nhật, hãy chỉnh sửa và chạy lại analysis.
