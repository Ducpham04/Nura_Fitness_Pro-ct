# Báo Cáo Tổng Hợp REST API Controllers - Fit Challenge

**Ngày cập nhật:** May 13, 2026

---

## 📊 Tổng Quan

| Hệ thống | Số Controllers | Số Endpoints |
|----------|---------------|--------------|
| **Java Backend** | 31 | 120+ |
| **AI Service** | 1 (FastAPI) | 30+ |
| **Tổng** | **32** | **150+** |

---

## 🗃️ JAVA BACKEND - REST CONTROLLERS

### 1. Auth Controller
**Base Path:** `/api/auth`
**File:** `AuthController.java`

| Method | Endpoint | Mô tả | Request Body | Response Body | Headers |
|--------|----------|-------|--------------|---------------|---------|
| POST | `/api/auth/login` | Đăng nhập | `{"email": "string", "password": "string"}` | `{"token": "string", "refreshToken": "string", "user": {...}}` | `Content-Type: application/json` |
| POST | `/api/auth/register` | Đăng ký | `{"email": "string", "fullName": "string", "password": "string", "roleId": "long?"}` | `{"token": "string", "refreshToken": "string", "user": {...}}` | `Content-Type: application/json` |
| POST | `/api/auth/refresh` | Refresh token | `{"refreshToken": "string"}` | `{"token": "string", "refreshToken": "string"}` | `Content-Type: application/json` |
| POST | `/api/auth/logout` | Đăng xuất | `{}` | `{"success": true, "message": "string"}` | `Authorization: Bearer {token}` |
| GET | `/api/auth/me` | Lấy thông tin user hiện tại | - | `{"id": "long", "email": "string", "username": "string", "role": "string"}` | `Authorization: Bearer {token}` |
| PUT | `/api/auth/change-password` | Đổi mật khẩu | `{"oldPassword": "string", "newPassword": "string"}` | `{"success": true, "message": "string"}` | `Authorization: Bearer {token}` |
| POST | `/api/auth/forgot-password` | Quên mật khẩu | `{"email": "string"}` | `{"success": true, "message": "string"}` | `Content-Type: application/json` |
| POST | `/api/auth/reset-password` | Reset mật khẩu | `{"token": "string", "newPassword": "string"}` | `{"success": true, "message": "string"}` | `Content-Type: application/json` |

**Path Variables:** None
**Query Parameters:** None
**Error Responses:**
- `400 Bad Request` - Invalid input data
- `401 Unauthorized` - Invalid credentials/token
- `409 Conflict` - Email already exists
- `500 Internal Server Error` - Server error

**Example Request (Login):**
```json
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Example Response (Login):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "username": "john_doe",
    "role": "USER"
  }
}
```

---

### 2. User Controller
**Base Path:** `/api/users`
**File:** `UserController.java`

| Method | Endpoint | Mô tả | Request Body | Response Body | Headers |
|--------|----------|-------|--------------|---------------|---------|
| GET | `/api/users` | Lấy tất cả users (Admin) | - | `[{"id": "long", "email": "string", "fullName": "string", ...}]` | `Authorization: Bearer {token}` |
| GET | `/api/users/{id}` | Lấy user theo ID | - | `{"id": "long", "email": "string", "fullName": "string", ...}` | `Authorization: Bearer {token}` |
| PUT | `/api/users/{id}` | Cập nhật user | `{"fullName": "string", "email": "string", ...}` | `{"id": "long", "email": "string", ...}` | `Authorization: Bearer {token}` |
| DELETE | `/api/users/{id}` | Xóa user (soft delete) | - | `{"success": true, "message": "string"}` | `Authorization: Bearer {token}` |
| GET | `/api/users/{id}/profile` | Lấy profile user | - | `{"profile": {...}, "stats": {...}, "activity": {...}}` | `Authorization: Bearer {token}` |
| PUT | `/api/users/{id}/profile` | Cập nhật profile | `{"avatar": "string", "bio": "string", ...}` | `{"success": true, "profile": {...}}` | `Authorization: Bearer {token}` |
| GET | `/api/users/{id}/stats` | Thống kê user | - | `{"totalWorkouts": "int", "challengesCompleted": "int", ...}` | `Authorization: Bearer {token}` |
| POST | `/api/users/{id}/avatar` | Upload avatar | `FormData: file` | `{"avatarUrl": "string"}` | `Authorization: Bearer {token}, Content-Type: multipart/form-data` |

**Path Variables:**
- `{id}` - User ID (Long)

**Query Parameters:** None
**Error Responses:**
- `403 Forbidden` - Not authorized to access user
- `404 Not Found` - User not found

---

### 3. Challenge Controller
**Base Path:** `/api/challenges`
**File:** `ChallengeController.java`

| Method | Endpoint | Mô tả | Request Body | Response Body | Headers |
|--------|----------|-------|--------------|---------------|---------|
| GET | `/api/challenges` | Lấy tất cả challenges | - | `[{"id": "long", "title": "string", "difficulty": "string", ...}]` | `Authorization: Bearer {token}` |
| GET | `/api/challenges/{id}` | Lấy challenge theo ID | - | `{"id": "long", "title": "string", "description": "string", ...}` | `Authorization: Bearer {token}` |
| GET | `/api/challenges/goal/{goalId}` | Lấy challenges theo goal | - | `[{"id": "long", "title": "string", ...}]` | `Authorization: Bearer {token}` |
| POST | `/api/challenges` | Tạo challenge (Admin) | `{"title": "string", "description": "string", "goalId": "long", ...}` | `{"id": "long", "title": "string", ...}` | `Authorization: Bearer {token}` |
| PUT | `/api/challenges/{id}` | Cập nhật challenge | `{"title": "string", "description": "string", ...}` | `{"id": "long", "title": "string", ...}` | `Authorization: Bearer {token}` |
| DELETE | `/api/challenges/{id}` | Xóa challenge | - | `{"success": true, "message": "string"}` | `Authorization: Bearer {token}` |
| GET | `/api/challenges/{id}/leaderboard` | Bảng xếp hạng challenge | - | `[{"rank": "int", "user": {...}, "score": "int"}]` | `Authorization: Bearer {token}` |
| GET | `/api/challenges/{id}/stats` | Thống kê challenge | - | `{"totalParticipants": "int", "completionRate": "float", ...}` | `Authorization: Bearer {token}` |

**Path Variables:**
- `{id}` - Challenge ID (Long)
- `{goalId}` - Goal ID (Long)

**Query Parameters:**
- `page` - Page number (default: 0)
- `size` - Page size (default: 20)
- `sort` - Sort field (default: createdAt)

---

### 4. User Challenge Controller
**Base Path:** `/api/user-challenges`
**File:** `UserChallengeController.java`

| Method | Endpoint | Mô tả | Request Body | Response Body | Headers |
|--------|----------|-------|--------------|---------------|---------|
| GET | `/api/user-challenges/user/{userId}` | Lấy challenges của user | - | `[{"id": "long", "challenge": {...}, "status": "string", ...}]` | `Authorization: Bearer {token}` |
| GET | `/api/user-challenges/{id}` | Lấy chi tiết submission | - | `{"id": "long", "videoUrl": "string", "aiScore": "float", ...}` | `Authorization: Bearer {token}` |
| POST | `/api/user-challenges` | Submit challenge | `{"challengeId": "long", "videoUrl": "string", "description": "string"}` | `{"id": "long", "status": "PENDING", ...}` | `Authorization: Bearer {token}` |
| POST | `/api/user-challenges/{id}/upload` | Upload video | `FormData: video file` | `{"videoUrl": "string", "uploadStatus": "SUCCESS"}` | `Authorization: Bearer {token}` |
| GET | `/api/user-challenges/{id}/result` | Lấy kết quả AI | - | `{"score": "float", "feedback": "string", "formAnalysis": {...}}` | `Authorization: Bearer {token}` |
| POST | `/api/user-challenges/{id}/dispute` | Khiếu nại kết quả | `{"reason": "string", "description": "string"}` | `{"disputeId": "long", "status": "PENDING"}` | `Authorization: Bearer {token}` |
| GET | `/api/user-challenges/{id}/ai-feedback` | Lấy AI feedback | - | `{"feedback": "string", "improvementTips": [...], "scoreBreakdown": {...}}` | `Authorization: Bearer {token}` |

**Path Variables:**
- `{id}` - UserChallenge ID (Long)
- `{userId}` - User ID (Long)

---

### 5. Training Plan Controller
**Base Path:** `/api/training-plans`
**File:** `TrainingPlanController.java`

| Method | Endpoint | Mô tả | Request Body | Response Body | Headers |
|--------|----------|-------|--------------|---------------|---------|
| GET | `/api/training-plans` | Lấy tất cả training plans | - | `[{"id": "long", "title": "string", "difficulty": "string", ...}]` | `Authorization: Bearer {token}` |
| GET | `/api/training-plans/{id}` | Lấy plan theo ID | - | `{"id": "long", "title": "string", "description": "string", "details": [...]}` | `Authorization: Bearer {token}` |
| GET | `/api/training-plans/goal/{goalId}` | Lấy plans theo goal | - | `[{"id": "long", "title": "string", ...}]` | `Authorization: Bearer {token}` |
| POST | `/api/training-plans` | Tạo training plan | `{"title": "string", "description": "string", "goalId": "long", "difficulty": "string", "durationWeeks": "int"}` | `{"id": "long", "title": "string", ...}` | `Authorization: Bearer {token}` |
| PUT | `/api/training-plans/{id}` | Cập nhật plan | `{"title": "string", "description": "string", ...}` | `{"id": "long", "title": "string", ...}` | `Authorization: Bearer {token}` |
| DELETE | `/api/training-plans/{id}` | Xóa plan (soft delete) | - | `{"success": true, "message": "string"}` | `Authorization: Bearer {token}` |
| GET | `/api/training-plans/{id}/details` | Lấy chi tiết plan | - | `[{"dayNumber": "int", "exercises": [...], "duration": "int"}]` | `Authorization: Bearer {token}` |
| POST | `/api/training-plans/{id}/enroll` | Đăng ký plan | `{"startDate": "date"}` | `{"userTrainingId": "long", "message": "string"}` | `Authorization: Bearer {token}` |
| GET | `/api/training-plans/{id}/progress` | Xem tiến độ | - | `{"completedDays": "int", "totalDays": "int", "completionRate": "float"}` | `Authorization: Bearer {token}` |

**Path Variables:**
- `{id}` - TrainingPlan ID (Long)
- `{goalId}` - Goal ID (Long)

**Query Parameters:**
- `difficulty` - Filter by difficulty (BEGINNER, INTERMEDIATE, ADVANCED)
- `duration` - Filter by duration weeks
- `page`, `size`, `sort` - Pagination

---

### 6. User Training Controller
**Base Path:** `/api/user-training`
**File:** `UserTrainingDetailController.java`

| Method | Endpoint | Mô tả | Request Body | Response Body | Headers |
|--------|----------|-------|--------------|---------------|---------|
| GET | `/api/user-training/{userId}` | Lấy training hiện tại của user | - | `{"userTrainingId": "long", "plan": {...}, "currentDay": "int", "progress": "float"}` | `Authorization: Bearer {token}` |
| GET | `/api/user-training/{userId}/history` | Lịch sử training | - | `[{"plan": {...}, "startDate": "date", "endDate": "date", "completionRate": "float"}]` | `Authorization: Bearer {token}` |
| GET | `/api/user-training/{userId}/day/{dayNumber}` | Lấy ngày training cụ thể | - | `{"dayNumber": "int", "exercises": [...], "completed": "boolean", "notes": "string"}` | `Authorization: Bearer {token}` |
| POST | `/api/user-training/{userId}/log` | Ghi nhận daily log | `{"dayNumber": "int", "exercisesCompleted": [...], "notes": "string", "duration": "int"}` | `{"logId": "long", "message": "string"}` | `Authorization: Bearer {token}` |
| PUT | `/api/user-training/{userId}/day/{day}/complete` | Hoàn thành ngày | `{"actualDuration": "int", "difficulty": "string", "notes": "string"}` | `{"success": true, "nextDay": "int"}` | `Authorization: Bearer {token}` |
| GET | `/api/user-training/{userId}/stats` | Thống kê training | - | `{"totalWorkouts": "int", "totalDuration": "int", "avgDifficulty": "string", "streak": "int"}` | `Authorization: Bearer {token}` |

**Path Variables:**
- `{userId}` - User ID (Long)
- `{dayNumber}` - Day number in plan (Integer)
- `{day}` - Day number (Integer)

**Query Parameters:**
- `startDate`, `endDate` - Date range for history
- `page`, `size` - Pagination for history

---

### 7. Nutrition Plan Controller
**Base Path:** `/api/nutrition-plans`
**File:** `NutritionPlanController.java`

| Method | Endpoint | Mô tả | Request Body | Response Body | Headers |
|--------|----------|-------|--------------|---------------|---------|
| GET | `/api/nutrition-plans` | Lấy tất cả nutrition plans | - | `[{"id": "long", "name": "string", "caloriesPerDay": "int", ...}]` | `Authorization: Bearer {token}` |
| GET | `/api/nutrition-plans/{id}` | Lấy plan theo ID | - | `{"id": "long", "name": "string", "meals": [...], "totalCalories": "int"}` | `Authorization: Bearer {token}` |
| GET | `/api/nutrition-plans/goal/{goalId}` | Lấy plans theo goal | - | `[{"id": "long", "name": "string", ...}]` | `Authorization: Bearer {token}` |
| POST | `/api/nutrition-plans` | Tạo nutrition plan | `{"name": "string", "goalId": "long", "caloriesPerDay": "int", "meals": [...]}` | `{"id": "long", "name": "string", ...}` | `Authorization: Bearer {token}` |
| PUT | `/api/nutrition-plans/{id}` | Cập nhật plan | `{"name": "string", "caloriesPerDay": "int", ...}` | `{"id": "long", "name": "string", ...}` | `Authorization: Bearer {token}` |
| DELETE | `/api/nutrition-plans/{id}` | Xóa plan (soft delete) | - | `{"success": true, "message": "string"}` | `Authorization: Bearer {token}` |
| GET | `/api/nutrition-plans/{id}/meals` | Lấy meals của plan | - | `[{"mealType": "string", "foods": [...], "calories": "int"}]` | `Authorization: Bearer {token}` |
| GET | `/api/nutrition-plans/{id}/shopping-list` | Lấy shopping list | - | `[{"ingredient": "string", "amount": "string", "estimatedCost": "float"}]` | `Authorization: Bearer {token}` |

**Path Variables:**
- `{id}` - NutritionPlan ID (Long)
- `{goalId}` - Goal ID (Long)

---

### 8. Food Controller
**Base Path:** `/api/foods`
**File:** `FoodController.java`

| Method | Endpoint | Mô tả | Request Body | Response Body | Headers |
|--------|----------|-------|--------------|---------------|---------|
| GET | `/api/foods` | Lấy tất cả foods | - | `[{"id": "long", "name": "string", "caloriesPer100g": "int", ...}]` | `Authorization: Bearer {token}` |
| GET | `/api/foods/{id}` | Lấy food theo ID | - | `{"id": "long", "name": "string", "nutrition": {...}, "category": "string"}` | `Authorization: Bearer {token}` |
| GET | `/api/foods/category/{category}` | Lấy foods theo category | - | `[{"id": "long", "name": "string", ...}]` | `Authorization: Bearer {token}` |
| GET | `/api/foods/search?keyword=xxx` | Tìm kiếm food | - | `[{"id": "long", "name": "string", "matchScore": "float"}]` | `Authorization: Bearer {token}` |
| POST | `/api/foods` | Thêm food (Admin) | `{"name": "string", "caloriesPer100g": "int", "protein": "float", ...}` | `{"id": "long", "name": "string", ...}` | `Authorization: Bearer {token}` |
| PUT | `/api/foods/{id}` | Cập nhật food | `{"name": "string", "caloriesPer100g": "int", ...}` | `{"id": "long", "name": "string", ...}` | `Authorization: Bearer {token}` |
| DELETE | `/api/foods/{id}` | Xóa food | - | `{"success": true, "message": "string"}` | `Authorization: Bearer {token}` |
| GET | `/api/foods/budget-tier/{tier}` | Lấy foods theo budget tier | - | `[{"id": "long", "name": "string", "pricePerKg": "float"}]` | `Authorization: Bearer {token}` |

**Path Variables:**
- `{id}` - Food ID (Long)
- `{category}` - Food category (String)
- `{tier}` - Budget tier (LOW, MEDIUM, HIGH)

**Query Parameters:**
- `keyword` - Search keyword (String)
- `page`, `size`, `sort` - Pagination

---

### 9. Reward Controller
**Base Path:** `/api/rewards`
**File:** `RewardController.java`

| Method | Endpoint | Mô tả | Request Body | Response Body | Headers |
|--------|----------|-------|--------------|---------------|---------|
| GET | `/api/rewards` | Lấy tất cả rewards | - | `[{"id": "long", "name": "string", "pointsRequired": "int", ...}]` | `Authorization: Bearer {token}` |
| GET | `/api/rewards/{id}` | Lấy reward theo ID | - | `{"id": "long", "name": "string", "description": "string", ...}` | `Authorization: Bearer {token}` |
| POST | `/api/rewards` | Tạo reward (Admin) | `{"name": "string", "description": "string", "pointsRequired": "int", "type": "string"}` | `{"id": "long", "name": "string", ...}` | `Authorization: Bearer {token}` |
| PUT | `/api/rewards/{id}` | Cập nhật reward | `{"name": "string", "pointsRequired": "int", ...}` | `{"id": "long", "name": "string", ...}` | `Authorization: Bearer {token}` |
| DELETE | `/api/rewards/{id}` | Xóa reward | - | `{"success": true, "message": "string"}` | `Authorization: Bearer {token}` |
| POST | `/api/rewards/{id}/redeem` | Đổi reward | `{"quantity": "int", "deliveryAddress": "string"}` | `{"redemptionId": "long", "status": "PENDING"}` | `Authorization: Bearer {token}` |
| GET | `/api/rewards/user/{userId}/history` | Lịch sử đổi reward | - | `[{"reward": {...}, "redeemedAt": "datetime", "status": "string"}]` | `Authorization: Bearer {token}` |

**Path Variables:**
- `{id}` - Reward ID (Long)
- `{userId}` - User ID (Long)

---

### 10. Leaderboard Controller
**Base Path:** `/api/leaderboard`
**File:** `LeaderboardController.java`

| Method | Endpoint | Mô tả | Request Body | Response Body | Headers |
|--------|----------|-------|--------------|---------------|---------|
| GET | `/api/leaderboard/global` | Bảng xếp hạng toàn cầu | - | `[{"rank": "int", "user": {...}, "points": "int", "challengesCompleted": "int"}]` | `Authorization: Bearer {token}` |
| GET | `/api/leaderboard/goal/{goalId}` | Bảng xếp hạng theo goal | - | `[{"rank": "int", "user": {...}, "goalProgress": "float"}]` | `Authorization: Bearer {token}` |
| GET | `/api/leaderboard/challenge/{challengeId}` | Bảng xếp hạng challenge | - | `[{"rank": "int", "user": {...}, "score": "float", "completionTime": "datetime"}]` | `Authorization: Bearer {token}` |
| GET | `/api/leaderboard/weekly` | Bảng xếp hạng tuần | - | `[{"rank": "int", "user": {...}, "weeklyPoints": "int"}]` | `Authorization: Bearer {token}` |
| GET | `/api/leaderboard/monthly` | Bảng xếp hạng tháng | - | `[{"rank": "int", "user": {...}, "monthlyPoints": "int"}]` | `Authorization: Bearer {token}` |
| GET | `/api/leaderboard/user/{userId}/rank` | Xem rank của user | - | `{"globalRank": "int", "weeklyRank": "int", "monthlyRank": "int", "points": "int"}` | `Authorization: Bearer {token}` |

**Path Variables:**
- `{goalId}` - Goal ID (Long)
- `{challengeId}` - Challenge ID (Long)
- `{userId}` - User ID (Long)

**Query Parameters:**
- `limit` - Number of results (default: 50)
- `period` - For weekly/monthly (current week/month)

---

### 11. File Controller
**Base Path:** `/api/files`
**File:** `FileController.java`

| Method | Endpoint | Mô tả | Request Body | Response Body | Headers |
|--------|----------|-------|--------------|---------------|---------|
| POST | `/api/files/upload` | Upload file | `FormData: file, type` | `{"fileUrl": "string", "fileId": "string"}` | `Authorization: Bearer {token}, Content-Type: multipart/form-data` |
| POST | `/api/files/upload-image` | Upload image | `FormData: image file` | `{"imageUrl": "string", "thumbnailUrl": "string"}` | `Authorization: Bearer {token}, Content-Type: multipart/form-data` |
| POST | `/api/files/upload-video` | Upload video | `FormData: video file` | `{"videoUrl": "string", "duration": "int", "size": "long"}` | `Authorization: Bearer {token}, Content-Type: multipart/form-data` |
| GET | `/api/files/{filename}` | Download file | - | `File stream` | `Authorization: Bearer {token}` |
| DELETE | `/api/files/{filename}` | Xóa file | - | `{"success": true, "message": "string"}` | `Authorization: Bearer {token}` |
| GET | `/api/files/user/{userId}` | Lấy files của user | - | `[{"filename": "string", "url": "string", "uploadedAt": "datetime"}]` | `Authorization: Bearer {token}` |

**Path Variables:**
- `{filename}` - File name (String)
- `{userId}` - User ID (Long)

**Form Data Parameters:**
- `file` - File to upload (File)
- `type` - File type (image, video, document)

---

### 12. Admin Controllers
**Base Path:** `/api/admin`
**File:** `Admin/*Controller.java`

| Method | Endpoint | Mô tả | Request Body | Response Body | Headers |
|--------|----------|-------|--------------|---------------|---------|
| GET | `/api/admin/users` | Quản lý users | - | `{"users": [...], "total": "long", "page": "int"}` | `Authorization: Bearer {token}` |
| GET | `/api/admin/reports` | Xem báo cáo | - | `{"userStats": {...}, "challengeStats": {...}, "revenue": "float"}` | `Authorization: Bearer {token}` |
| GET | `/api/admin/ai-logs` | Xem AI logs | - | `[{"timestamp": "datetime", "endpoint": "string", "status": "string"}]` | `Authorization: Bearer {token}` |
| GET | `/api/admin/statistics` | Thống kê hệ thống | - | `{"totalUsers": "long", "activeUsers": "long", "totalChallenges": "long"}` | `Authorization: Bearer {token}` |
| POST | `/api/admin/seed-data` | Seed data | `{"type": "string", "count": "int"}` | `{"success": true, "message": "string", "createdCount": "int"}` | `Authorization: Bearer {token}` |

**Query Parameters:**
- `page`, `size`, `sort` - Pagination
- `status` - Filter by status
- `role` - Filter by role
- `startDate`, `endDate` - Date range for reports

---

## 🆕 JAVA BACKEND - NEW CONTROLLERS (Entity Improvements)

### 13. User Inventory Controller ⭐ NEW
**Base Path:** `/api/inventory`
**File:** `UserInventoryController.java`

| Method | Endpoint | Mô tả | Request Body | Response Body | Headers |
|--------|----------|-------|--------------|---------------|---------|
| GET | `/api/inventory/{userId}` | Lấy tất cả items trong tủ lạnh | - | `[{"id": "long", "foodName": "string", "quantity": "float", "unit": "string", "expiryDate": "date", "status": "string"}]` | `Authorization: Bearer {token}` |
| GET | `/api/inventory/{userId}/status/{status}` | Lấy items theo status | - | `[{"id": "long", "foodName": "string", ...}]` | `Authorization: Bearer {token}` |
| GET | `/api/inventory/{userId}/expiring?daysAhead=3` | Items sắp hết hạn | - | `[{"id": "long", "foodName": "string", "daysUntilExpiry": "int"}]` | `Authorization: Bearer {token}` |
| GET | `/api/inventory/{userId}/search?keyword=xxx` | Tìm items | - | `[{"id": "long", "foodName": "string", "matchScore": "float"}]` | `Authorization: Bearer {token}` |
| GET | `/api/inventory/{userId}/stats` | Thống kê tủ lạnh | - | `{"totalItems": "int", "expiringSoon": "int", "wasted": "int", "categories": {...}}` | `Authorization: Bearer {token}` |
| GET | `/api/inventory/{userId}/available-for-ai` | Items cho AI | - | `[{"foodName": "string", "quantity": "float", "freshness": "string"}]` | `Authorization: Bearer {token}` |
| POST | `/api/inventory/{userId}/add` | Thêm item mới | `{"foodName": "string", "quantity": "float", "unit": "string", "expiryDate": "date", "category": "string"}` | `{"id": "long", "message": "string"}` | `Authorization: Bearer {token}` |
| PUT | `/api/inventory/{userId}/{inventoryId}/status` | Cập nhật status | `{"status": "AVAILABLE/USED/EXPIRED/WASTED"}` | `{"success": true, "message": "string"}` | `Authorization: Bearer {token}` |
| PUT | `/api/inventory/{userId}/{inventoryId}/used` | Mark đã dùng trong plan | `{"usedInPlanId": "long", "quantityUsed": "float"}` | `{"success": true, "remainingQuantity": "float"}` | `Authorization: Bearer {token}` |
| DELETE | `/api/inventory/{userId}/{inventoryId}` | Xóa item (soft delete) | - | `{"success": true, "message": "string"}` | `Authorization: Bearer {token}` |
| POST | `/api/inventory/{inventoryId}/restore` | Khôi phục item | - | `{"success": true, "message": "string"}` | `Authorization: Bearer {token}` |

**Path Variables:**
- `{userId}` - User ID (Long)
- `{inventoryId}` - Inventory Item ID (Long)
- `{status}` - Item status (AVAILABLE, USED, EXPIRED, WASTED)

**Query Parameters:**
- `daysAhead` - Days to check for expiry (default: 3)
- `keyword` - Search keyword for food names

---

### 14. Personalized Nutrition Plan Controller ⭐ NEW
**Base Path:** `/api/personalized-plans`
**File:** `PersonalizedNutritionPlanController.java`

| Method | Endpoint | Mô tả | Request Body | Response Body | Headers |
|--------|----------|-------|--------------|---------------|---------|
| GET | `/api/personalized-plans/{userId}` | Tất cả plans của user | - | `[{"id": "long", "planName": "string", "startDate": "date", "status": "string", "budgetUsed": "float"}]` | `Authorization: Bearer {token}` |
| GET | `/api/personalized-plans/{userId}/active` | Active plan | - | `{"id": "long", "planName": "string", "currentDay": "int", "meals": [...], "budgetRemaining": "float"}` | `Authorization: Bearer {token}` |
| GET | `/api/personalized-plans/{userId}/{planId}` | Chi tiết plan | - | `{"id": "long", "planName": "string", "meals": [...], "shoppingList": [...], "totalCost": "float"}` | `Authorization: Bearer {token}` |
| POST | `/api/personalized-plans/{userId}/create` | Tạo plan mới từ AI | `{"budget": "float", "preferences": [...], "durationDays": "int", "goal": "string"}` | `{"planId": "long", "message": "AI plan created successfully"}` | `Authorization: Bearer {token}` |
| POST | `/api/personalized-plans/{planId}/meals` | Thêm meal details | `{"dayNumber": "int", "mealType": "BREAKFAST/LUNCH/DINNER/SNACK", "foods": [...], "totalCalories": "int"}` | `{"mealDetailId": "long", "message": "Meal added successfully"}` | `Authorization: Bearer {token}` |
| GET | `/api/personalized-plans/{planId}/day/{dayNumber}` | Meals của ngày | - | `{"dayNumber": "int", "meals": [...], "totalCalories": "int", "totalCost": "float"}` | `Authorization: Bearer {token}` |
| PUT | `/api/personalized-plans/meals/{mealDetailId}/feedback` | Cập nhật feedback | `{"rating": "int", "comments": "string", "actualCost": "float"}` | `{"success": true, "message": "Feedback updated"}` | `Authorization: Bearer {token}` |
| PUT | `/api/personalized-plans/{planId}/actual-cost` | Cập nhật chi phí thực tế | `{"actualTotalCost": "float", "notes": "string"}` | `{"success": true, "budgetVariance": "float"}` | `Authorization: Bearer {token}` |
| POST | `/api/personalized-plans/{planId}/complete` | Hoàn thành plan | `{"rating": "int", "feedback": "string", "finalCost": "float"}` | `{"success": true, "completionStats": {...}}` | `Authorization: Bearer {token}` |
| GET | `/api/personalized-plans/{userId}/budget-report` | Budget report | - | `{"plannedBudget": "float", "actualCost": "float", "variance": "float", "breakdownByDay": [...], "savings": "float"}` | `Authorization: Bearer {token}` |
| DELETE | `/api/personalized-plans/{userId}/{planId}` | Xóa plan (soft delete) | - | `{"success": true, "message": "Plan deleted"}` | `Authorization: Bearer {token}` |
| POST | `/api/personalized-plans/{planId}/restore` | Khôi phục plan | - | `{"success": true, "message": "Plan restored"}` | `Authorization: Bearer {token}` |

**Path Variables:**
- `{userId}` - User ID (Long)
- `{planId}` - Personalized Plan ID (Long)
- `{mealDetailId}` - Meal Detail ID (Long)
- `{dayNumber}` - Day number in plan (Integer)

---

### 15. Budget Tracking Controller ⭐ NEW
**Base Path:** `/api/budget`
**File:** `BudgetTrackingController.java`

| Method | Endpoint | Mô tả | Request Body | Response Body | Headers |
|--------|----------|-------|--------------|---------------|---------|
| POST | `/api/budget/{userId}/track` | Ghi nhận chi tiêu ngày | `{"date": "date", "amount": "float", "category": "FOOD/TRANSPORT/OTHER", "description": "string", "receiptUrl": "string"}` | `{"trackingId": "long", "message": "Expense tracked successfully"}` | `Authorization: Bearer {token}` |
| GET | `/api/budget/{userId}/weekly-report?weekStartDate=2024-01-01` | Report tuần | - | `{"weekStartDate": "date", "totalSpent": "float", "budgetLimit": "float", "breakdownByCategory": {...}, "dailySpending": [...]}` | `Authorization: Bearer {token}` |
| GET | `/api/budget/{userId}/monthly-report?year=2024&month=5` | Report tháng | - | `{"month": "int", "year": "int", "totalSpent": "float", "budgetLimit": "float", "weeklyBreakdown": [...], "topCategories": [...]}` | `Authorization: Bearer {token}` |
| GET | `/api/budget/{userId}/ai-accuracy?startDate=2024-01-01&endDate=2024-01-31` | Đánh giá AI | - | `{"accuracyScore": "float", "estimatedVsActual": [...], "improvementSuggestions": [...], "predictionAccuracy": "float"}` | `Authorization: Bearer {token}` |
| GET | `/api/budget/{userId}/history?startDate=2024-01-01&endDate=2024-01-31` | Lịch sử chi tiêu | - | `[{"date": "date", "amount": "float", "category": "string", "description": "string"}]` | `Authorization: Bearer {token}` |

**Path Variables:**
- `{userId}` - User ID (Long)

**Query Parameters:**
- `weekStartDate` - Start date for weekly report (Date)
- `year` - Year for monthly report (Integer)
- `month` - Month for monthly report (Integer)
- `startDate` - Start date for history/accuracy (Date)
- `endDate` - End date for history/accuracy (Date)

---

### 16. User Preference Controller ⭐ NEW
**Base Path:** `/api/preferences`
**File:** `UserPreferenceController.java`

| Method | Endpoint | Mô tả | Request Body | Response Body | Headers |
|--------|----------|-------|--------------|---------------|---------|
| GET | `/api/preferences/{userId}` | Tất cả preferences | - | `[{"id": "long", "type": "string", "value": "string", "createdAt": "datetime"}]` | `Authorization: Bearer {token}` |
| GET | `/api/preferences/{userId}/type/{type}` | Theo type | - | `[{"id": "long", "value": "string", "metadata": {...}}]` | `Authorization: Bearer {token}` |
| POST | `/api/preferences/{userId}/disliked-food` | Ghi nhận food không thích | `{"foodId": "long", "reason": "string", "severity": "LOW/MEDIUM/HIGH"}` | `{"preferenceId": "long", "message": "Preference recorded"}` | `Authorization: Bearer {token}` |
| POST | `/api/preferences/{userId}/liked-food` | Ghi nhận food yêu thích | `{"foodId": "long", "rating": "int", "notes": "string"}` | `{"preferenceId": "long", "message": "Preference recorded"}` | `Authorization: Bearer {token}` |
| POST | `/api/preferences/{userId}/skipped-exercise` | Ghi nhận exercise bị skip | `{"exerciseId": "long", "reason": "TIRED/INJURY/TIME", "alternative": "string"}` | `{"preferenceId": "long", "message": "Skip recorded"}` | `Authorization: Bearer {token}` |
| PUT | `/api/preferences/{userId}/cooking-equipment` | Cập nhật equipment | `{"availableEquipment": ["OVEN", "MICROWAVE", "BLENDER"], "preferredMethods": ["GRILL", "BAKE"]}` | `{"success": true, "message": "Equipment updated"}` | `Authorization: Bearer {token}` |
| PUT | `/api/preferences/{userId}/meal-prep-time` | Cập nhật prep time | `{"maxPrepTimeMinutes": "int", "preferredMealTypes": ["QUICK", "PREP_AHEAD"]}` | `{"success": true, "message": "Prep time updated"}` | `Authorization: Bearer {token}` |
| PUT | `/api/preferences/{userId}/work-schedule` | Cập nhật work schedule | `{"workStartTime": "time", "workEndTime": "time", "lunchBreak": "time", "flexibleHours": "boolean"}` | `{"success": true, "message": "Schedule updated"}` | `Authorization: Bearer {token}` |
| GET | `/api/preferences/{userId}/foods-to-avoid` | Danh sách tránh | - | `[{"foodId": "long", "foodName": "string", "reason": "string", "severity": "string"}]` | `Authorization: Bearer {token}` |
| GET | `/api/preferences/{userId}/foods-to-prioritize` | Danh sách ưu tiên | - | `[{"foodId": "long", "foodName": "string", "rating": "int", "lastConsumed": "datetime"}]` | `Authorization: Bearer {token}` |
| GET | `/api/preferences/{userId}/ai-context` | Context cho AI | - | `{"dislikedFoods": [...], "likedFoods": [...], "cookingConstraints": {...}, "schedulePreferences": {...}}` | `Authorization: Bearer {token}` |
| GET | `/api/preferences/{userId}/stats` | Thống kê preferences | - | `{"totalPreferences": "int", "dislikedFoods": "int", "likedFoods": "int", "skippedExercises": "int", "lastUpdated": "datetime"}` | `Authorization: Bearer {token}` |
| DELETE | `/api/preferences/{preferenceId}` | Deactivate preference | - | `{"success": true, "message": "Preference deactivated"}` | `Authorization: Bearer {token}` |

**Path Variables:**
- `{userId}` - User ID (Long)
- `{type}` - Preference type (String)
- `{preferenceId}` - Preference ID (Long)

---

### 17. Notification Controller ⭐ NEW
**Base Path:** `/api/notifications`
**File:** `NotificationController.java`

| Method | Endpoint | Mô tả | Request Body | Response Body | Headers |
|--------|----------|-------|--------------|---------------|---------|
| GET | `/api/notifications/{userId}` | Lấy tất cả thông báo (phân trang) | - | `{"notifications": [...], "total": "long", "unreadCount": "int", "page": "int"}` | `Authorization: Bearer {token}` |
| GET | `/api/notifications/{userId}/unread` | Thông báo chưa đọc | - | `[{"id": "long", "title": "string", "content": "string", "type": "string", "createdAt": "datetime"}]` | `Authorization: Bearer {token}` |
| GET | `/api/notifications/{userId}/count-unread` | Đếm chưa đọc (cho badge) | - | `{"count": "int"}` | `Authorization: Bearer {token}` |
| GET | `/api/notifications/{userId}/recent` | 5 thông báo gần nhất | - | `[{"id": "long", "title": "string", "type": "string", "createdAt": "datetime"}]` | `Authorization: Bearer {token}` |
| PUT | `/api/notifications/{notificationId}/read` | Đánh dấu đã đọc | - | `{"success": true, "message": "Notification marked as read"}` | `Authorization: Bearer {token}` |
| PUT | `/api/notifications/{userId}/read-all` | Đánh dấu tất cả đã đọc | - | `{"success": true, "markedCount": "int"}` | `Authorization: Bearer {token}` |
| DELETE | `/api/notifications/{notificationId}` | Xóa thông báo | - | `{"success": true, "message": "Notification deleted"}` | `Authorization: Bearer {token}` |
| POST | `/api/notifications/{userId}/cleanup` | Dọn dẹp thông báo cũ | `{"daysToKeep": "int"}` | `{"success": true, "deletedCount": "int"}` | `Authorization: Bearer {token}` |

**Path Variables:**
- `{userId}` - User ID (Long)
- `{notificationId}` - Notification ID (Long)

**Query Parameters:**
- `page` - Page number (default: 0)
- `size` - Page size (default: 20)
- `type` - Filter by notification type

---

### 18. Food Analysis Controller ⭐ NEW (API Gateway)
**Base Path:** `/api/food-analysis`
**File:** `FoodAnalysisController.java`

| Method | Endpoint | Mô tả | Request Body | Response Body | Headers |
|--------|----------|-------|--------------|---------------|---------|
| POST | `/api/food-analysis/analyze` | Phân tích món ăn từ ảnh (proxy AI) | `{"imageUrl": "string", "userId": "long", "mealType": "string"}` | `{"foodItems": [...], "totalCalories": "int", "nutritionBreakdown": {...}, "confidence": "float"}` | `Authorization: Bearer {token}` |
| POST | `/api/food-analysis/analyze-base64` | Phân tích từ base64 | `{"imageBase64": "string", "userId": "long", "mealType": "string"}` | `{"foodItems": [...], "totalCalories": "int", "nutritionBreakdown": {...}}` | `Authorization: Bearer {token}` |
| POST | `/api/food-analysis/log` | Lưu kết quả vào food log | `{"analysisResult": {...}, "userId": "long", "mealType": "string"}` | `{"logId": "long", "message": "Food log created"}` | `Authorization: Bearer {token}` |
| GET | `/api/food-analysis/health` | Health check AI Service | - | `{"status": "UP", "timestamp": "datetime", "version": "string"}` | `Authorization: Bearer {token}` |

**⚠️ Quan trọng:** Frontend **KHÔNG** gọi trực tiếp AI Service (port 8000).
Java BE đóng vai trò API Gateway để:
- ✅ Verify JWT Token
- ✅ Xử lý CORS
- ✅ Rate limiting
- ✅ Audit log
- ✅ Bảo mật

---

### 19. Payment Controller ⭐ NEW
**Base Path:** `/api/payment`
**File:** `PaymentController.java`

| Method | Endpoint | Mô tả | Request Body | Response Body | Headers |
|--------|----------|-------|--------------|---------------|---------|
| POST | `/api/payment/create-vnpay-url` | Tạo URL thanh toán VNPay | `{"amount": "long", "orderInfo": "string", "userId": "long"}` | `{"paymentUrl": "string", "txnRef": "string", "qrCode": "string"}` | `Authorization: Bearer {token}` |
| GET | `/api/payment/vnpay-return` | Return URL sau thanh toán | - | `{"success": true, "transaction": {...}}` | - |
| POST | `/api/payment/vnpay-webhook` | Webhook IPN từ VNPay | `VNPay webhook data` | `{"received": true}` | - |
| GET | `/api/payment/transactions/{userId}` | Lịch sử giao dịch | - | `[{"txnRef": "string", "amount": "long", "status": "string", "createdAt": "datetime"}]` | `Authorization: Bearer {token}` |
| GET | `/api/payment/transaction/{txnRef}` | Chi tiết giao dịch | - | `{"txnRef": "string", "amount": "long", "status": "string", "vnpayResponse": {...}}` | `Authorization: Bearer {token}` |
| POST | `/api/payment/topup-points` | Nạp điểm (internal) | `{"userId": "long", "points": "int", "reason": "string"}` | `{"success": true, "newBalance": "int"}` | `Authorization: Bearer {token}` |

**💳 Tích hợp:** VNPay, MoMo, Stripe (cấu hình qua `application.properties`)

---

## 🤖 AI SERVICE - FASTAPI ENDPOINTS

**Base URL:** `http://localhost:8000`
**File:** `main.py`

### Core AI APIs

| Method | Endpoint | Mô tả | Request Body | Response Body |
|--------|----------|-------|--------------|---------------|
| POST | `/analyze-user` | Phân tích user profile | `{"user_id": "int", "profile_data": {...}}` | `{"insights": [...], "recommendations": {...}, "risk_factors": [...]}` |
| POST | `/plan` | Generate nutrition plan | `{"user_id": "int", "budget": "float", "preferences": [...], "duration_days": "int"}` | `{"plan": {...}, "meals": [...], "shopping_list": [...], "estimated_cost": "float"}` |
| POST | `/full-plan` | Generate integrated meal + workout plan | `{"user_id": "int", "budget": "float", "fitness_goal": "string", "duration_days": "int"}` | `{"nutrition_plan": {...}, "workout_plan": {...}, "progression": [...], "total_cost": "float"}` |
| POST | `/track-food` | Track food from image upload | `{"image_url": "string", "user_id": "int", "meal_type": "string"}` | `{"detected_foods": [...], "nutrition_info": {...}, "confidence_score": "float"}` |
| POST | `/track-food-base64` | Track food from base64 image | `{"image_base64": "string", "user_id": "int", "meal_type": "string"}` | `{"detected_foods": [...], "nutrition_info": {...}, "confidence_score": "float"}` |
| POST | `/adjust-plan` | Điều chỉnh meal plan | `{"plan_id": "int", "feedback": {...}, "adjustments": [...], "user_id": "int"}` | `{"adjusted_plan": {...}, "changes_made": [...], "new_cost_estimate": "float"}` |
| POST | `/cheat-meal` | Handle cheat meals | `{"user_id": "int", "cheat_meal": {...}, "current_plan": {...}}` | `{"adjustment_needed": "boolean", "suggested_changes": [...], "impact_analysis": {...}}` |
| GET | `/budget-foods/{tier}` | Get budget food recommendations | - | `{"foods": [...], "avg_price_per_meal": "float", "nutritional_balance": "float"}` |
| GET | `/sample-profiles` | Get test profiles | - | `[{"profile_id": "int", "data": {...}, "expected_outcomes": {...}}]` |
| GET | `/health` | Health check | - | `{"status": "healthy", "timestamp": "datetime", "model_versions": {...}}` |

### User Preferences APIs

| Method | Endpoint | Mô tả | Request Body | Response Body |
|--------|----------|-------|--------------|---------------|
| POST | `/preferences/dislike-food` | Mark food as disliked | `{"user_id": "int", "food_id": "int", "reason": "string", "severity": "string"}` | `{"recorded": true, "updated_preferences": {...}}` |
| POST | `/preferences/skip-exercise` | Mark exercise as skipped | `{"user_id": "int", "exercise_id": "int", "reason": "string", "alternative": "string"}` | `{"recorded": true, "adjustment_suggestions": [...], "updated_plan": {...}}` |
| POST | `/preferences/rate-plan` | Rate plan (1-5 stars) | `{"user_id": "int", "plan_id": "int", "rating": "int", "comments": "string"}` | `{"recorded": true, "feedback_analysis": {...}}` |
| POST | `/preferences/meal-feedback` | Add meal feedback | `{"user_id": "int", "meal_id": "int", "rating": "int", "taste": "string", "fullness": "string"}` | `{"recorded": true, "future_adjustments": [...], "pattern_detected": "boolean"}` |
| POST | `/preferences/workout-feedback` | Add workout feedback | `{"user_id": "int", "workout_id": "int", "difficulty": "string", "enjoyment": "int", "completion_rate": "float"}` | `{"recorded": true, "progression_adjustment": {...}, "next_session_suggestions": [...}}` |
| GET | `/preferences/{user_id}` | Get user preferences | - | `{"food_preferences": {...}, "exercise_preferences": {...}, "meal_patterns": {...}, "last_updated": "datetime"}` |
| GET | `/preferences/{user_id}/patterns` | Get feedback patterns | - | `{"taste_patterns": [...], "difficulty_patterns": [...], "time_patterns": [...], "consistency_score": "float"}` |
| DELETE | `/preferences/{user_id}` | Clear preferences | - | `{"cleared": true, "reset_to_defaults": true}` |

### Progression APIs

| Method | Endpoint | Mô tả | Request Body | Response Body |
|--------|----------|-------|--------------|---------------|
| POST | `/progression/record-workout` | Record completed workout | `{"user_id": "int", "workout_data": {...}, "performance_metrics": {...}}` | `{"recorded": true, "progress_analysis": {...}, "next_session_adjustments": {...}}` |
| POST | `/progression/record-weight` | Record user weight | `{"user_id": "int", "weight_kg": "float", "body_fat_percent": "float", "measurements": {...}}` | `{"recorded": true, "progress_trend": {...}, "goal_progress": "float", "adjustments_needed": "boolean"}` |
| POST | `/progression/advance-week` | Advance to next week | `{"user_id": "int", "current_week": "int", "performance_review": {...}}` | `{"advanced": true, "new_week_plan": {...}, "difficulty_adjustment": "string", "focus_areas": [...]}` |
| GET | `/progression/{user_id}` | Get progression data | - | `{"current_week": "int", "total_weeks": "int", "progress_percentage": "float", "weight_trend": [...], "performance_trend": [...], "achievements": [...]}` |
| GET | `/progression/{user_id}/weekly-summary` | Get weekly summary | - | `{"week_number": "int", "workouts_completed": "int", "avg_performance": "float", "weight_change": "float", "goals_met": "boolean", "highlights": [...]}` |
| GET | `/progression/{user_id}/adjustment/{exercise_name}` | Get exercise adjustment | - | `{"current_level": "string", "recommended_adjustment": "string", "reasoning": "string", "progression_path": [...], "estimated_completion": "datetime"}` |

### Price Database APIs

| Method | Endpoint | Mô tả | Request Body | Response Body |
|--------|----------|-------|--------------|---------------|
| GET | `/prices/ingredient?ingredient_name=xxx&amount=100g` | Get ingredient price | - | `{"ingredient_name": "string", "price_per_unit": "float", "unit": "string", "currency": "string", "last_updated": "datetime", "source": "string"}` |
| POST | `/prices/estimate-meal` | Estimate meal cost | `{"ingredients": [...], "quantities": [...], "location": "string"}` | `{"estimated_cost": "float", "breakdown": {...}, "alternative_options": [...], "savings_potential": "float"}` |
| GET | `/prices/category/{category}?budget=10000` | Get affordable ingredients | - | `{"ingredients": [...], "avg_price": "float", "budget_fit_score": "float", "recommendations": [...]}` |
| GET | `/prices/alternative?ingredient_name=xxx&budget=10000` | Get cheaper alternative | - | `{"original_ingredient": {...}, "alternatives": [...], "best_match": {...}, "savings": "float", "nutritional_comparison": {...}}` |

### Plan Versioning APIs

| Method | Endpoint | Mô tả | Request Body | Response Body |
|--------|----------|-------|--------------|---------------|
| POST | `/plans/save` | Save plan version | `{"user_id": "int", "plan_data": {...}, "version_name": "string", "changes_from_previous": "string"}` | `{"version_id": "int", "saved": true, "version_history": [...], "rollback_available": true}` |
| GET | `/plans/{user_id}` | Get all user plans | - | `[{"version_id": "int", "version_name": "string", "created_at": "datetime", "is_active": "boolean", "performance_score": "float"}]` |
| GET | `/plans/{user_id}/history/{plan_id}` | Get plan history | - | `{"plan_id": "int", "versions": [...], "change_log": [...], "performance_trends": {...}, "recommendations": [...]}` |
| GET | `/plans/version/{version_id}` | Get specific version | - | `{"version_id": "int", "plan_data": {...}, "metadata": {...}, "performance_at_creation": {...}, "rollback_eligibility": "boolean"}` |
| GET | `/plans/compare?version_id_1=xxx&version_id_2=xxx` | Compare two versions | - | `{"comparison": {...}, "differences": [...], "performance_change": {...}, "recommendation": "string", "suggested_action": "string"}` |
| DELETE | `/plans/{user_id}/{plan_id}` | Delete plan history | - | `{"deleted": true, "affected_versions": "int", "data_retained": "boolean"}` |

---

## 📊 Tổng Hợp Theo Nhóm Chức Năng

### 🔐 Authentication (8 endpoints)
- `/api/auth/*`

### 👤 User Management (8 endpoints)
- `/api/users/*`

### 🏋️ Training & Challenges (20+ endpoints)
- `/api/challenges/*`
- `/api/user-challenges/*`
- `/api/training-plans/*`
- `/api/user-training/*`

### 🥗 Nutrition & Food (15+ endpoints)
- `/api/nutrition-plans/*`
- `/api/foods/*`
- `/api/inventory/*` ⭐ NEW
- `/api/personalized-plans/*` ⭐ NEW
- `/api/budget/*` ⭐ NEW

### 🤖 AI Integration (20+ endpoints)
- `/analyze-user`
- `/plan`
- `/full-plan`
- `/track-food`
- `/preferences/*`
- `/progression/*`
- `/prices/*`
- `/plans/*`

### 🎁 Rewards & Gamification (5 endpoints)
- `/api/rewards/*`
- `/api/leaderboard/*`

### 📁 File Management (5 endpoints)
- `/api/files/*`

### 🔧 Admin (5 endpoints)
- `/api/admin/*`

---

## 🔗 Tích Hợp Java Backend ↔ AI Service

### Java BE gọi AI Service:
```
POST http://ai-service:8000/plan
POST http://ai-service:8000/full-plan
POST http://ai-service:8000/track-food
```

### AI Service lưu về Java BE:
```
POST /api/personalized-plans/{userId}/create
POST /api/inventory/{userId}/add
PUT /api/budget/{userId}/track
```

---

## 📁 Vị Trí Files

### Java Controllers:
```
backend/src/main/java/com/example/fitchallenge/Controller/
├── AuthController.java
├── UserController.java (implied)
├── ChallengeController.java
├── UserChallenge/
├── TrainingPlanController.java
├── UserTrainingDetailController.java
├── NutritionPlanController.java (implied)
├── FoodController.java (implied)
├── RewardController.java (implied)
├── LeaderboardController.java
├── FileController.java
├── Admin/
├── UserInventoryController.java ⭐ NEW
├── PersonalizedNutritionPlanController.java ⭐ NEW
├── BudgetTrackingController.java ⭐ NEW
├── UserPreferenceController.java ⭐ NEW
├── NotificationController.java ⭐ NEW
├── FoodAnalysisController.java ⭐ NEW (API Gateway)
└── PaymentController.java ⭐ NEW
```

### AI Service:
```
ai-service/main.py (FastAPI app with 30+ endpoints)
```

### Cấu Trúc Thư Mục (Đã cập nhật):
```
FitnitChallenge/
├── frontend/           ← React + Vite Frontend
├── backend/            ← Spring Boot Backend
└── ai-service/         ← Python AI Service
```

---

## 📝 Ghi Chú

- **Tổng số endpoints:** 105+
- **Controllers Java:** 19 (12 cũ + 7 mới)
- **AI Service:** 1 FastAPI app với 30+ endpoints
- **Authentication:** JWT token cho tất cả protected endpoints
- **Rate Limiting:** Cần implement cho production
- **CORS:** Đã enable cho frontend integration


---

**Cập nhật:** May 13, 2026
