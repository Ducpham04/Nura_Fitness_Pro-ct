# 📊 **FitChallenge API Documentation (Synchronized with Source Code)**

*Generated based on actual Spring Boot controllers in the project.*

## 🔐 **Authentication & User Profiles (`/api/auth`, `/api/user`, `/api/v1/users`)**

### AuthController
* `POST /api/auth/register` - Đăng ký user
* `POST /api/auth/login` - Đăng nhập
* `POST /api/auth/logout` - Đăng xuất
* `GET /api/auth/user` - Lấy thông tin user hiện tại (AuthenticationPrincipal)
* `GET /api/auth/me` - Lấy thông tin current user
* `PUT /api/auth/profile` - Cập nhật profile cơ bản (tên, email, avatar)
* `GET /api/auth/roles` - Lấy danh sách roles (từ RoleController)

### UserProfileController (`/api/v1/users`)
* `GET /api/v1/users/{userId}/profile` - Lấy profile cơ bản
* `GET /api/v1/users/{userId}/profile/full` - Lấy full profile (bao gồm stats, achievements)

### Health & Body Profile (`/api/user`)
* `POST /api/user/health-profile` - Tạo/cập nhật Health Profile
* `GET /api/user/health-profile` - Lấy Health Profile
* `GET /api/user/health-profile/recommended-plans` - Gợi ý plans
* `POST /api/user/health-profile/generate-personal-plan` - Sinh personalized plan
* `POST /api/user/profile/body` - Tạo/cập nhật UserBodyProfile
* `GET /api/user/profile/body` - Lấy UserBodyProfile
* `GET /api/user/info` - Lấy thông tin body (UserInfo)
* `PUT /api/user/info` - Cập nhật thông tin body (UserInfo)
* `POST /api/user/body-metric` - Thêm lịch sử BodyMetric
* `GET /api/user/body-metric` - Lấy lịch sử BodyMetric theo ngày
* `GET /api/user/body-metric/latest` - Lấy bản ghi mới nhất

## 🏃 **Challenges (`/api/challenges`, `/api/user/challenges`, `/api/admin/challenges`)**

### User Challenges
* `GET /api/challenges` - Lấy danh sách challenges
* `GET /api/challenges/{id}` - Lấy chi tiết challenge
* `POST /api/challenges/{id}/join` - Tham gia challenge
* `GET /api/user/challenges/my` - Lấy challenge của tôi
* `PUT /api/user/challenges/{id}/complete` - Hoàn thành challenge

### Admin Challenges
* `POST /api/admin/challenges` - Tạo challenge
* `GET /api/admin/challenges` - Danh sách challenge (Admin)
* `GET /api/admin/challenges/{id}` - Lấy chi tiết
* `PUT /api/admin/challenges/{id}` - Cập nhật challenge
* `DELETE /api/admin/challenges/{id}` - Xóa challenge
* `GET /api/admin/challenges/submissions` - Lấy tất cả bài nộp
* `GET /api/admin/challenges/{id}/submissions` - Lấy bài nộp theo challenge
* `GET /api/admin/user-challenges` - Xem user challenges
* `GET /api/admin/user-challenges/{id}` - Chi tiết user challenge
* `POST /api/admin/user-challenges` - Tạo user challenge
* `PUT /api/admin/user-challenges/{id}` - Cập nhật user challenge
* `DELETE /api/admin/user-challenges/{id}` - Xóa user challenge
* `PUT /api/admin/user-challenges/{id}/feedback` - Gửi feedback

## 💪 **Training Plans (`/api/training-plans`, `/api/user/training`, `/api/admin/training-plans`)**

### User Training
* `GET /api/training-plans` - Xem danh sách training plans
* `GET /api/training-plans/{id}` - Xem chi tiết
* `GET /api/training-plans/{id}/details` - Lấy details (grouped by day)
* `POST /api/training-plans/{id}/start` - Bắt đầu training plan
* `DELETE /api/training-plans/user/{utId}` - Xóa plan cá nhân
* `GET /api/user/training/{userId}` - Lấy details plan của user
* `POST /api/user/training` - Tạo user training
* `GET /api/user/training/{utId}/day/{dayNumber}` - Lấy bài tập cá nhân theo ngày
* `GET /api/user/personalized/today` - Lấy bài tập cá nhân hôm nay
* `POST /api/user/training/{utId}/regenerate-personalized` - Sinh lại personalized plan
* `GET /api/user/daily-training-logs/plan/{trainingPlanId}` - Lấy logs
* `GET /api/user/daily-training-logs/plan/{trainingPlanId}/day/{dayNumber}` - Lấy log theo ngày
* `POST /api/user/daily-training-logs` - Thêm cập nhật daily training log

### Admin Training
* `GET /api/admin/training-plans` - Lấy danh sách (Admin)
* `GET /api/admin/training-plans/{tpId}` - Chi tiết plan
* `GET /api/admin/training-plans/goal/{goalId}` - Tìm theo goal
* `POST /api/admin/training-plans` - Tạo plan
* `PUT /api/admin/training-plans/{tpId}` - Cập nhật plan
* `DELETE /api/admin/training-plans/{tpId}` - Xóa plan
* `POST /api/admin/training-plans/{tpId}/duplicate` - Nhân bản plan
* `PUT /api/admin/training-plans/{tpId}/publish` - Publish plan
* `GET /api/admin/training-plans/{tpId}/users` - Lấy users theo plan
* `POST /api/admin/training-plan-details` - Tạo plan detail
* `PUT /api/admin/training-plan-details/{id}` - Cập nhật plan detail
* `DELETE /api/admin/training-plan-details/{id}` - Xóa detail
* `GET /api/admin/training-plan-details` - Lấy tất cả details
* `GET /api/admin/training-plan-details/plan/{planId}` - Lấy details theo plan
* `GET /api/admin/training-plan-details/{id}` - Chi tiết 1 detail

## 🥗 **Nutrition & Food (`/api/nutrition-plans`, `/api/foods`, `/api/inventory`, `/api/admin/meals`)**

### Nutrition & Meals
* `POST /api/nutrition-plans` - Tạo nutrition plan
* `PUT /api/nutrition-plans/{id}` - Cập nhật nutrition plan
* `DELETE /api/nutrition-plans/{id}` - Xóa nutrition plan
* `GET /api/nutrition-plans/{id}` - Lấy theo ID
* `GET /api/nutrition-plans` - Tất cả plans
* `GET /api/nutrition-plans/goal/{goalId}` - Tìm theo goal
* `POST /api/admin/meals` - Tạo meal
* `PUT /api/admin/meals/{id}` - Cập nhật
* `DELETE /api/admin/meals/{id}` - Xóa
* `GET /api/admin/meals/{id}` - Lấy theo ID
* `GET /api/admin/meals` - Lấy tất cả
* `GET /api/admin/meals/plan/{planId}` - Theo plan
* `POST /api/admin/foods` - Tạo food
* `PUT /api/admin/foods/{id}` - Cập nhật
* `DELETE /api/admin/foods/{id}` - Xóa
* `GET /api/admin/foods/{id}` - Chi tiết
* `GET /api/foods` - Lấy tất cả food (từ Admin/FoodController)
* `POST /api/meal-foods` - Tạo MealFood
* `PUT /api/meal-foods/{id}` - Sửa
* `DELETE /api/meal-foods/{id}` - Xóa
* `POST /api/user-nutrition` - Tạo UserNutrition
* `PUT /api/user-nutrition/{id}` - Sửa UserNutrition
* `DELETE /api/user-nutrition/{id}` - Xóa
* `GET /api/user-nutrition/{id}` - Chi tiết
* `GET /api/user-nutrition` - Tất cả UserNutrition

### Inventory & Refrigerator (`/api/inventory`)
* `GET /api/inventory/` - Tủ lạnh chung
* `POST /api/inventory/add` - Thêm
* `PUT /api/inventory/{id}` - Cập nhật
* `DELETE /api/inventory/{id}` - Xóa
* `GET /api/inventory/expiring-soon` - Sắp hết hạn
* `GET /api/inventory/low-stock` - Sắp hết
* `POST /api/inventory/scan-barcode` - Scan mã vạch
* `GET /api/inventory/shopping-list` - Gợi ý danh sách mua
* `GET /api/inventory/{userId}` - Tủ lạnh user
* `GET /api/inventory/{userId}/status/{status}` - Lọc trạng thái
* `GET /api/inventory/{userId}/expiring` - Lọc hết hạn
* `GET /api/inventory/{userId}/search` - Tìm kiếm
* `POST /api/inventory/{userId}/add` - Thêm đồ user
* `PUT /api/inventory/{userId}/{inventoryId}/status` - Đổi status
* `PUT /api/inventory/{userId}/{inventoryId}/used` - Đánh dấu dùng
* `DELETE /api/inventory/{userId}/{inventoryId}` - Xóa
* `POST /api/inventory/{inventoryId}/restore` - Khôi phục
* `GET /api/inventory/{userId}/stats` - Thống kê tủ lạnh
* `GET /api/inventory/{userId}/available-for-ai` - AI available items

### Personalized Nutrition (`/api/personalized-plans`)
* `GET /api/personalized-plans/{userId}` - Kế hoạch cá nhân
* `GET /api/personalized-plans/{userId}/active` - Kế hoạch active
* `GET /api/personalized-plans/{userId}/{planId}` - Chi tiết
* `POST /api/personalized-plans/{userId}/create` - Tạo từ AI
* `POST /api/personalized-plans/{planId}/meals` - Thêm meals
* `GET /api/personalized-plans/{planId}/day/{dayNumber}` - Meal trong ngày
* `PUT /api/personalized-plans/meals/{mealDetailId}/feedback` - Đánh giá món
* `PUT /api/personalized-plans/{planId}/actual-cost` - Cập nhật chi phí
* `POST /api/personalized-plans/{planId}/complete` - Hoàn thành plan
* `GET /api/personalized-plans/{userId}/budget-report` - Báo cáo ngân sách
* `DELETE /api/personalized-plans/{userId}/{planId}` - Xóa plan
* `POST /api/personalized-plans/{planId}/restore` - Khôi phục plan

## 🤖 **AI Gateway (`/api/food-analysis`, `/api/ai-plans`, `/api/ai-analysis`)**

* `POST /api/food-analysis/scan` - (Gateway)
* `POST /api/ai-plans/generate-meal` - (Gateway)
* `POST /api/ai-analysis/pose` - (Gateway)
* `POST /api/ai-analysis/nutrition` - (Gateway)
* `POST /api/food-analysis/analyze` - Gửi AI nhận dạng hình ảnh
* `POST /api/food-analysis/analyze-base64` - Gửi base64 AI nhận dạng
* `POST /api/food-analysis/log` - Lưu food log
* `GET /api/food-analysis/health` - Check health AI

## 📊 **Admin Dashboard & Management (`/api/admin`)**

* `GET /api/admin/dashboard/user-stats` - Thống kê user
* `GET /api/admin/dashboard/challenge-stats` - Thống kê challenge
* `GET /api/admin/dashboard/training-stats` - Thống kê training
* `GET /api/admin/dashboard/nutrition-stats` - Thống kê nutrition
* `GET /api/admin/dashboard/reward-stats` - Thống kê reward
* `GET /api/admin/dashboard/overview` - Tổng quan
* `GET /api/admin/users` - Danh sách users
* `POST /api/admin/users` - Tạo user
* `PUT /api/admin/users/{id}` - Cập nhật user
* `DELETE /api/admin/users/{id}` - Xóa user
* `GET /api/admin/users/{id}/body-metrics` - Body metrics
* `GET /api/admin/users/{id}/body-data` - Body info
* `GET /api/admin/users/{id}/training-plans` - Các kế hoạch đào tạo
* `GET /api/admin/users/{userId}/training-plans/{utId}/personalized-details` - Chi tiết PPD
* `PUT /api/admin/users/{userId}/training-plans/{utId}/personalized-details/{ppdId}` - Cập nhật PPD
* `POST /api/admin/goals` - Tạo goal
* `GET /api/admin/goals` - Xem goals
* `PUT /api/admin/goals/{id}` - Sửa goal
* `DELETE /api/admin/goals/{id}` - Xóa goal
* `GET /api/admin/information-body` - Thông tin body all user
* `GET /api/admin/information-body/{userId}` - By user
* `POST /api/admin/information-body` - Create
* `PUT /api/admin/information-body/{infoId}` - Update
* `DELETE /api/admin/information-body/{id}` - Delete
* `POST /api/admin/data-seeder/import-all` - Import dữ liệu mẫu
* `POST /api/admin/data-seeder/import-users`
* `POST /api/admin/data-seeder/import-challenges`
* `POST /api/admin/data-seeder/import-training-plans`
* `POST /api/admin/data-seeder/import-daily-logs`
* `POST /api/admin/data-seeder/import-user-challenges`

## 💰 **Payment, Rewards & Budget (`/api/payment`, `/api/transactions`, `/api/admin/rewards`, `/api/budget`)**

### Payments & Transactions
* `POST /api/payment/create-vnpay-url` - Tạo URL VNPay
* `GET /api/payment/vnpay-return` - VNPay redirect
* `POST /api/payment/vnpay-webhook` - VNPay Webhook
* `GET /api/payment/transactions/{userId}` - Lịch sử
* `GET /api/payment/transaction/{txnRef}` - Tra cứu giao dịch
* `POST /api/payment/topup-points` - Nạp điểm (Admin)
* `POST /api/transactions` - Thêm giao dịch (Admin)
* `GET /api/transactions` - Tất cả
* `GET /api/transactions/{id}` - Chi tiết
* `PUT /api/transactions/{id}` - Sửa
* `DELETE /api/transactions/{id}` - Xóa

### Budget
* `POST /api/budget/{userId}/track` - Chi tiêu
* `GET /api/budget/{userId}/weekly-report`
* `GET /api/budget/{userId}/monthly-report`
* `GET /api/budget/{userId}/ai-accuracy`
* `GET /api/budget/{userId}/history`

### Rewards
* `POST /api/admin/rewards` - Thêm reward
* `PUT /api/admin/rewards/{id}` - Sửa reward
* `GET /api/admin/rewards` - Xem rewards
* `GET /api/admin/rewards/{id}` - Chi tiết
* `DELETE /api/admin/rewards/{id}` - Xóa
* `POST /api/reward-redemptions` - Yêu cầu đổi quà
* `GET /api/reward-redemptions` - Xem đổi quà
* `PUT /api/reward-redemptions/{redemptionId}/status` - Cập nhật status

## ⚙️ **Other (Notifications, Preferences, File, Leaderboard)**
* `GET /api/leaderboard` - Bảng xếp hạng
* `GET /api/preferences/{userId}` - Tất cả preferences
* `GET /api/preferences/{userId}/type/{type}`
* `POST /api/preferences/{userId}/disliked-food`
* `POST /api/preferences/{userId}/liked-food`
* `POST /api/preferences/{userId}/skipped-exercise`
* `PUT /api/preferences/{userId}/cooking-equipment`
* `PUT /api/preferences/{userId}/meal-prep-time`
* `PUT /api/preferences/{userId}/work-schedule`
* `GET /api/preferences/{userId}/foods-to-avoid`
* `GET /api/preferences/{userId}/foods-to-prioritize`
* `GET /api/preferences/{userId}/ai-context`
* `GET /api/preferences/{userId}/stats`
* `DELETE /api/preferences/{preferenceId}`
* `GET /api/notifications/{userId}`
* `GET /api/notifications/{userId}/unread`
* `GET /api/notifications/{userId}/count-unread`
* `PUT /api/notifications/{notificationId}/read`
* `PUT /api/notifications/{userId}/read-all`
* `GET /api/notifications/{userId}/recent`
* `DELETE /api/notifications/{notificationId}`
* `POST /api/notifications/{userId}/cleanup`
* `POST /api/files/upload-video` - Upload video
* `POST /api/files/upload-image` - Upload image
* `GET /api/files/presigned-url` - Presigned URL
* `GET /api/files/video` - Video URL
* `GET /api/files/image` - Image URL

*Note: Document was completely audited and synced from the original controller source files inside `backend/src/main/java/com/example/fitchallenge/controller/`.*
