# Hướng Dẫn Chạy Backend + Seed Data

## 🚀 Cách 1: Chạy Nhanh (Khuyến nghị)

### Bước 1: Khởi động Database & Services

```bash
cd /Users/vanduc/Documents/Work/FitnitChallenge

# Chạy Docker Compose (DB + Backend + AI Service)
docker compose -f docker-compose.local.yml up -d

# Hoặc nếu muốn build lại
docker compose -f docker-compose.local.yml up -d --build
```

### Bước 2: Chờ services sẵn sàng

```bash
# Kiểm tra health
curl http://localhost:8080/actuator/health
curl http://localhost:5001/health
```

### Bước 3: Seed Data cho Testing

```bash
# Seed data cơ bản (users, challenges, plans)
curl -X POST http://localhost:8080/api/admin/data-seeder/import-all

# Seed data đầy đủ cho FE testing (bao gồm inventory, nutrition plans, budget, notifications)
curl -X POST http://localhost:8080/api/admin/enhanced-seeder/seed-all
```

### Bước 4: Test đăng nhập

```bash
# Test user login
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user1@test.com","password":"password123"}'

# Hoặc admin login
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"admin123"}'
```

---

## 🛠️ Cách 2: Chạy Backend Local (Dev Mode)

### Bước 1: Cấu hình Database

Tạo file `backend/src/main/resources/application-local.properties`:

```properties
# Database
spring.datasource.url=jdbc:mysql://localhost:3306/fit_challenge?useSSL=false&serverTimezone=Asia/Ho_Chi_Minh&allowPublicKeyRetrieval=true
spring.datasource.username=root
spring.datasource.password=123456

# JPA
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=true

# JWT
jwt.secret=your-secret-key-here-make-it-long-and-secure
jwt.expiration=86400000

# AI Service
ai.service.url=http://localhost:5001

# CORS (cho FE chạy ở localhost:5173)
cors.allowed-origins=http://localhost:5173,http://localhost:3000
```

### Bước 2: Chạy MySQL (nếu chưa có)

```bash
docker run -d \
  --name fit-challenge-db \
  -e MYSQL_ROOT_PASSWORD=123456 \
  -e MYSQL_DATABASE=fit_challenge \
  -p 3306:3306 \
  mysql:8.0 \
  --default-authentication-plugin=mysql_native_password
```

### Bước 3: Chạy Backend

```bash
cd backend

# Mac/Linux
./mvnw spring-boot:run -Dspring-boot.run.profiles=local

# Windows
mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=local
```

Backend sẽ chạy ở `http://localhost:8080`

### Bước 4: Chạy AI Service

```bash
cd ai-service

# Setup Python env (nếu chưa có)
python3 -m venv venv
source venv/bin/activate  # Mac/Linux
# hoặc venv\Scripts\activate  # Windows

pip install -r requirements.txt

# Chạy AI Service
python main.py
```

AI Service chạy ở `http://localhost:5001`

---

## 📊 API Endpoints Có Sẵn Sau Khi Seed

### Authentication
```
POST /api/auth/login          - Đăng nhập
POST /api/auth/register       - Đăng ký
POST /api/auth/refresh        - Refresh token
GET  /api/auth/me             - Lấy thông tin user
```

### Users
```
GET /api/users/{id}           - Thông tin user
GET /api/users/{id}/stats     - Thống kê user
PUT /api/users/{id}           - Cập nhật user
```

### Challenges
```
GET  /api/challenges              - Danh sách challenges
GET  /api/challenges/{id}         - Chi tiết challenge
POST /api/user-challenges         - Submit challenge
POST /api/user-challenges/{id}/upload  - Upload video
```

### Training
```
GET /api/training-plans           - Danh sách plans
GET /api/user-training/{userId}   - Training hiện tại
POST /api/user-training/{userId}/log  - Ghi log
```

### 🆕 New Features (Sau khi Enhanced Seed)
```
# Inventory (Tủ lạnh)
GET  /api/inventory/{userId}              - Items trong tủ lạnh
GET  /api/inventory/{userId}/expiring     - Sắp hết hạn

# Personalized Nutrition
GET  /api/personalized-plans/{userId}     - Plans của user
GET  /api/personalized-plans/{userId}/active  - Plan đang active
POST /api/personalized-plans/{userId}/create  - Tạo plan mới

# Budget
POST /api/budget/{userId}/track           - Ghi nhận chi tiêu
GET  /api/budget/{userId}/weekly-report   - Report tuần

# Notifications
GET  /api/notifications/{userId}          - Danh sách thông báo
GET  /api/notifications/{userId}/count-unread  - Đếm chưa đọc
PUT  /api/notifications/{id}/read         - Đánh dấu đã đọc
```

---

## 👤 Test Accounts

| Email | Password | Role | Mô tả |
|-------|----------|------|-------|
| user1@test.com | password123 | USER | Có đầy đủ data (inventory, plan, budget, notifications) |
| admin@test.com | admin123 | ADMIN | Quyền admin, seed data |

---

## 🔧 Troubleshooting

### Lỗi: "Connection refused" khi seed data
```bash
# Kiểm tra BE đã chạy chưa
curl http://localhost:8080/actuator/health

# Nếu chưa chạy, đợi 30s rồi thử lại
```

### Lỗi: "Role USER not found"
```bash
# Chạy data seeder trước để tạo roles
curl -X POST http://localhost:8080/api/admin/data-seeder/import-users?count=1
```

### Lỗi: Database chưa có schema
```bash
# BE sẽ tự động tạo schema (ddl-auto=update)
# Hoặc chạy migration script nếu có
```

### Lỗi: Port 8080 đã được sử dụng
```bash
# Tìm process đang dùng port 8080
lsof -i :8080  # Mac/Linux
netstat -ano | findstr :8080  # Windows

# Kill process hoặc đổi port trong application.properties
server.port=8081
```

---

## 📋 Quick Commands

```bash
# ========== START ==========
# 1. Start all services
docker compose -f docker-compose.local.yml up -d

# 2. Wait 30s for services to be ready
sleep 30

# 3. Seed data
curl -X POST http://localhost:8080/api/admin/enhanced-seeder/seed-all

# 4. Test
curl http://localhost:8080/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"

# ========== STOP ==========
docker compose -f docker-compose.local.yml down

# ========== CLEAN ==========
docker compose -f docker-compose.local.yml down -v  # Xóa cả volumes
```

---

## 🎯 Data Được Seed

Sau khi chạy `enhanced-seeder/seed-all`:

| Data | Số lượng | Chi tiết |
|------|----------|----------|
| **Test Users** | 2 | user1@test.com, admin@test.com |
| **Foods** | 20 | Có giá thị trường VND |
| **Health Profile** | 1 | Chiều cao, cân nặng, goal... |
| **Body Metrics** | 5 | Lịch sử đo 5 lần |
| **Inventory** | 6 | Items trong tủ lạnh |
| **Nutrition Plan** | 1 | Personalized plan + 6 meals |
| **Budget Tracking** | 7 | 7 ngày chi tiêu |
| **Preferences** | 3 | Disliked foods, equipment, prep time |
| **Notifications** | 3 | Unread + read |

---

## 🔗 Kết Nối FE

Sau khi BE chạy và có data:

1. Vào `frontend/`
2. Tạo file `.env` với `VITE_API_URL=http://localhost:8080`
3. Chạy `npm install && npm run dev`
4. Đăng nhập với `user1@test.com / password123`
5. Xem data load từ BE!

---

**Sẵn sàng để test!** 🚀
