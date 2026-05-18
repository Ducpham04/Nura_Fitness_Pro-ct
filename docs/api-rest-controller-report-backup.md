                                # Báo Cáo Tổng Hợp REST API Controllers - Fit Challenge

                                **Ngày cập nhật:** May 13, 2026

                                ---

                                ## 📊 Tổng Quan

                                | Hệ thống | Số Controllers | Số Endpoints |
                                |----------|---------------|--------------|
                                | **Java Backend** | 19 | 75+ |
                                | **AI Service** | 1 (FastAPI) | 30+ |
                                | **Tổng** | **20** | **105+** |
                                
                                ---

                                ## 🗃️ JAVA BACKEND - REST CONTROLLERS

                                ### 1. Auth Controller
                                **Base Path:** `/api/auth`
                                **File:** `AuthController.java`

                                | Method | Endpoint | Mô tả |
                                |--------|----------|-------|
                                | POST | `/api/auth/login` | Đăng nhập |
                                | POST | `/api/auth/register` | Đăng ký |
                                | POST | `/api/auth/refresh` | Refresh token |
                                | POST | `/api/auth/logout` | Đăng xuất |
                                | GET | `/api/auth/me` | Lấy thông tin user hiện tại |
                                | PUT | `/api/auth/change-password` | Đổi mật khẩu |
                                | POST | `/api/auth/forgot-password` | Quên mật khẩu |
                                | POST | `/api/auth/reset-password` | Reset mật khẩu |

                                ---

                                ### 2. User Controller
                                **Base Path:** `/api/users`
                                **File:** `UserController.java`

                                | Method | Endpoint | Mô tả |
                                |--------|----------|-------|
                                | GET | `/api/users` | Lấy tất cả users |
                                | GET | `/api/users/{id}` | Lấy user theo ID |
                                | PUT | `/api/users/{id}` | Cập nhật user |
                                | DELETE | `/api/users/{id}` | Xóa user (soft delete) |
                                | GET | `/api/users/{id}/profile` | Lấy profile user |
                                | PUT | `/api/users/{id}/profile` | Cập nhật profile |
                                | GET | `/api/users/{id}/stats` | Thống kê user |
                                | POST | `/api/users/{id}/avatar` | Upload avatar |

                                ---

                                ### 3. Challenge Controller
                                **Base Path:** `/api/challenges`
                                **File:** `ChallengeController.java`

                                | Method | Endpoint | Mô tả |
                                |--------|----------|-------|
                                | GET | `/api/challenges` | Lấy tất cả challenges |
                                | GET | `/api/challenges/{id}` | Lấy challenge theo ID |
                                | GET | `/api/challenges/goal/{goalId}` | Lấy challenges theo goal |
                                | POST | `/api/challenges` | Tạo challenge (Admin) |
                                | PUT | `/api/challenges/{id}` | Cập nhật challenge |
                                | DELETE | `/api/challenges/{id}` | Xóa challenge |
                                | GET | `/api/challenges/{id}/leaderboard` | Bảng xếp hạng challenge |
                                | GET | `/api/challenges/{id}/stats` | Thống kê challenge |

                                ---

                                ### 4. User Challenge Controller
                                **Base Path:** `/api/user-challenges`
                                **File:** `UserChallengeController.java`

                                | Method | Endpoint | Mô tả |
                                |--------|----------|-------|
                                | GET | `/api/user-challenges/user/{userId}` | Lấy challenges của user |
                                | GET | `/api/user-challenges/{id}` | Lấy chi tiết submission |
                                | POST | `/api/user-challenges` | Submit challenge |
                                | POST | `/api/user-challenges/{id}/upload` | Upload video |
                                | GET | `/api/user-challenges/{id}/result` | Lấy kết quả AI |
                                | POST | `/api/user-challenges/{id}/dispute` | Khiếu nại kết quả |
                                | GET | `/api/user-challenges/{id}/ai-feedback` | Lấy AI feedback |

                                ---

                                ### 5. Training Plan Controller
                                **Base Path:** `/api/training-plans`
                                **File:** `TrainingPlanController.java`

                                | Method | Endpoint | Mô tả |
                                |--------|----------|-------|
                                | GET | `/api/training-plans` | Lấy tất cả training plans |
                                | GET | `/api/training-plans/{id}` | Lấy plan theo ID |
                                | GET | `/api/training-plans/goal/{goalId}` | Lấy plans theo goal |
                                | POST | `/api/training-plans` | Tạo training plan |
                                | PUT | `/api/training-plans/{id}` | Cập nhật plan |
                                | DELETE | `/api/training-plans/{id}` | Xóa plan (soft delete) |
                                | GET | `/api/training-plans/{id}/details` | Lấy chi tiết plan |
                                | POST | `/api/training-plans/{id}/enroll` | Đăng ký plan |
                                | GET | `/api/training-plans/{id}/progress` | Xem tiến độ |

                                ---

                                ### 6. User Training Controller
                                **Base Path:** `/api/user-training`
                                **File:** `UserTrainingDetailController.java`

                                | Method | Endpoint | Mô tả |
                                |--------|----------|-------|
                                | GET | `/api/user-training/{userId}` | Lấy training hiện tại của user |
                                | GET | `/api/user-training/{userId}/history` | Lịch sử training |
                                | GET | `/api/user-training/{userId}/day/{dayNumber}` | Lấy ngày training cụ thể |
                                | POST | `/api/user-training/{userId}/log` | Ghi nhận daily log |
                                | PUT | `/api/user-training/{userId}/day/{day}/complete` | Hoàn thành ngày |
                                | GET | `/api/user-training/{userId}/stats` | Thống kê training |

                                ---

                                ### 7. Nutrition Plan Controller
                                **Base Path:** `/api/nutrition-plans`
                                **File:** `NutritionPlanController.java`

                                | Method | Endpoint | Mô tả |
                                |--------|----------|-------|
                                | GET | `/api/nutrition-plans` | Lấy tất cả nutrition plans |
                                | GET | `/api/nutrition-plans/{id}` | Lấy plan theo ID |
                                | GET | `/api/nutrition-plans/goal/{goalId}` | Lấy plans theo goal |
                                | POST | `/api/nutrition-plans` | Tạo nutrition plan |
                                | PUT | `/api/nutrition-plans/{id}` | Cập nhật plan |
                                | DELETE | `/api/nutrition-plans/{id}` | Xóa plan (soft delete) |
                                | GET | `/api/nutrition-plans/{id}/meals` | Lấy meals của plan |
                                | GET | `/api/nutrition-plans/{id}/shopping-list` | Lấy shopping list |

                                ---

                                ### 8. Food Controller
                                **Base Path:** `/api/foods`
                                **File:** `FoodController.java`

                                | Method | Endpoint | Mô tả |
                                |--------|----------|-------|
                                | GET | `/api/foods` | Lấy tất cả foods |
                                | GET | `/api/foods/{id}` | Lấy food theo ID |
                                | GET | `/api/foods/category/{category}` | Lấy foods theo category |
                                | GET | `/api/foods/search?keyword=xxx` | Tìm kiếm food |
                                | POST | `/api/foods` | Thêm food (Admin) |
                                | PUT | `/api/foods/{id}` | Cập nhật food |
                                | DELETE | `/api/foods/{id}` | Xóa food |
                                | GET | `/api/foods/budget-tier/{tier}` | Lấy foods theo budget tier |

                                ---

                                ### 9. Reward Controller
                                **Base Path:** `/api/rewards`
                                **File:** `RewardController.java`

                                | Method | Endpoint | Mô tả |
                                |--------|----------|-------|
                                | GET | `/api/rewards` | Lấy tất cả rewards |
                                | GET | `/api/rewards/{id}` | Lấy reward theo ID |
                                | POST | `/api/rewards` | Tạo reward (Admin) |
                                | PUT | `/api/rewards/{id}` | Cập nhật reward |
                                | DELETE | `/api/rewards/{id}` | Xóa reward |
                                | POST | `/api/rewards/{id}/redeem` | Đổi reward |
                                | GET | `/api/rewards/user/{userId}/history` | Lịch sử đổi reward |

                                ---

                                ### 10. Leaderboard Controller
                                **Base Path:** `/api/leaderboard`
                                **File:** `LeaderboardController.java`

                                | Method | Endpoint | Mô tả |
                                |--------|----------|-------|
                                | GET | `/api/leaderboard/global` | Bảng xếp hạng toàn cầu |
                                | GET | `/api/leaderboard/goal/{goalId}` | Bảng xếp hạng theo goal |
                                | GET | `/api/leaderboard/challenge/{challengeId}` | Bảng xếp hạng challenge |
                                | GET | `/api/leaderboard/weekly` | Bảng xếp hạng tuần |
                                | GET | `/api/leaderboard/monthly` | Bảng xếp hạng tháng |
                                | GET | `/api/leaderboard/user/{userId}/rank` | Xem rank của user |

                                ---

                                ### 11. File Controller
                                **Base Path:** `/api/files`
                                **File:** `FileController.java`

                                | Method | Endpoint | Mô tả |
                                |--------|----------|-------|
                                | POST | `/api/files/upload` | Upload file |
                                | POST | `/api/files/upload-image` | Upload image |
                                | POST | `/api/files/upload-video` | Upload video |
                                | GET | `/api/files/{filename}` | Download file |
                                | DELETE | `/api/files/{filename}` | Xóa file |
                                | GET | `/api/files/user/{userId}` | Lấy files của user |

                                ---

                                ### 12. Admin Controllers
                                **Base Path:** `/api/admin`
                                **File:** `Admin/*Controller.java`

                                | Method | Endpoint | Mô tả |
                                |--------|----------|-------|
                                | GET | `/api/admin/users` | Quản lý users |
                                | GET | `/api/admin/reports` | Xem báo cáo |
                                | GET | `/api/admin/ai-logs` | Xem AI logs |
                                | GET | `/api/admin/statistics` | Thống kê hệ thống |
                                | POST | `/api/admin/seed-data` | Seed data |

                                ---

                                ## 🆕 JAVA BACKEND - NEW CONTROLLERS (Entity Improvements)

                                ### 13. User Inventory Controller ⭐ NEW
                                **Base Path:** `/api/inventory`
                                **File:** `UserInventoryController.java`

                                | Method | Endpoint | Mô tả |
                                |--------|----------|-------|
                                | GET | `/api/inventory/{userId}` | Lấy tất cả items trong tủ lạnh |
                                | GET | `/api/inventory/{userId}/status/{status}` | Lấy items theo status |
                                | GET | `/api/inventory/{userId}/expiring?daysAhead=3` | Items sắp hết hạn |
                                | GET | `/api/inventory/{userId}/search?keyword=xxx` | Tìm items |
                                | GET | `/api/inventory/{userId}/stats` | Thống kê tủ lạnh |
                                | GET | `/api/inventory/{userId}/available-for-ai` | Items cho AI |
                                | POST | `/api/inventory/{userId}/add` | Thêm item mới |
                                | PUT | `/api/inventory/{userId}/{inventoryId}/status` | Cập nhật status |
                                | PUT | `/api/inventory/{userId}/{inventoryId}/used` | Mark đã dùng trong plan |
                                | DELETE | `/api/inventory/{userId}/{inventoryId}` | Xóa item (soft delete) |
                                | POST | `/api/inventory/{inventoryId}/restore` | Khôi phục item |

                                ---

                                ### 14. Personalized Nutrition Plan Controller ⭐ NEW
                                **Base Path:** `/api/personalized-plans`
                                **File:** `PersonalizedNutritionPlanController.java`

                                | Method | Endpoint | Mô tả |
                                |--------|----------|-------|
                                | GET | `/api/personalized-plans/{userId}` | Tất cả plans của user |
                                | GET | `/api/personalized-plans/{userId}/active` | Active plan |
                                | GET | `/api/personalized-plans/{userId}/{planId}` | Chi tiết plan |
                                | POST | `/api/personalized-plans/{userId}/create` | Tạo plan mới từ AI |
                                | POST | `/api/personalized-plans/{planId}/meals` | Thêm meal details |
                                | GET | `/api/personalized-plans/{planId}/day/{dayNumber}` | Meals của ngày |
                                | PUT | `/api/personalized-plans/meals/{mealDetailId}/feedback` | Cập nhật feedback |
                                | PUT | `/api/personalized-plans/{planId}/actual-cost` | Cập nhật chi phí thực tế |
                                | POST | `/api/personalized-plans/{planId}/complete` | Hoàn thành plan |
                                | GET | `/api/personalized-plans/{userId}/budget-report` | Budget report |
                                | DELETE | `/api/personalized-plans/{userId}/{planId}` | Xóa plan (soft delete) |
                                | POST | `/api/personalized-plans/{planId}/restore` | Khôi phục plan |

                                ---

                                ### 15. Budget Tracking Controller ⭐ NEW
                                **Base Path:** `/api/budget`
                                **File:** `BudgetTrackingController.java`

                                | Method | Endpoint | Mô tả |
                                |--------|----------|-------|
                                | POST | `/api/budget/{userId}/track` | Ghi nhận chi tiêu ngày |
                                | GET | `/api/budget/{userId}/weekly-report?weekStartDate=xxx` | Report tuần |
                                | GET | `/api/budget/{userId}/monthly-report?year=2024&month=5` | Report tháng |
                                | GET | `/api/budget/{userId}/ai-accuracy?startDate=xxx&endDate=xxx` | Đánh giá AI |
                                | GET | `/api/budget/{userId}/history?startDate=xxx&endDate=xxx` | Lịch sử chi tiêu |

                                ---

                                ### 16. User Preference Controller ⭐ NEW
                                **Base Path:** `/api/preferences`
                                **File:** `UserPreferenceController.java`

                                ### 17. Notification Controller ⭐ NEW
                                **Base Path:** `/api/notifications`
                                **File:** `NotificationController.java`

                                | Method | Endpoint | Mô tả |
                                |--------|----------|-------|
                                | GET | `/api/notifications/{userId}` | Lấy tất cả thông báo (phân trang) |
                                | GET | `/api/notifications/{userId}/unread` | Thông báo chưa đọc |
                                | GET | `/api/notifications/{userId}/count-unread` | Đếm chưa đọc (cho badge) |
                                | GET | `/api/notifications/{userId}/recent` | 5 thông báo gần nhất |
                                | PUT | `/api/notifications/{notificationId}/read` | Đánh dấu đã đọc |
                                | PUT | `/api/notifications/{userId}/read-all` | Đánh dấu tất cả đã đọc |
                                | DELETE | `/api/notifications/{notificationId}` | Xóa thông báo |
                                | POST | `/api/notifications/{userId}/cleanup` | Dọn dẹp thông báo cũ |

                                ### 18. Food Analysis Controller ⭐ NEW (API Gateway)
                                **Base Path:** `/api/food-analysis`
                                **File:** `FoodAnalysisController.java`

                                | Method | Endpoint | Mô tả |
                                |--------|----------|-------|
                                | POST | `/api/food-analysis/analyze` | Phân tích món ăn từ ảnh (proxy AI) |
                                | POST | `/api/food-analysis/analyze-base64` | Phân tích từ base64 |
                                | POST | `/api/food-analysis/log` | Lưu kết quả vào food log |
                                | GET | `/api/food-analysis/health` | Health check AI Service |

                                **⚠️ Quan trọng:** Frontend **KHÔNG** gọi trực tiếp AI Service (port 8000).
                                Java BE đóng vai trò API Gateway để:
                                - ✅ Verify JWT Token
                                - ✅ Xử lý CORS
                                - ✅ Rate limiting
                                - ✅ Audit log
                                - ✅ Bảo mật

                                ### 19. Payment Controller ⭐ NEW
                                **Base Path:** `/api/payment`
                                **File:** `PaymentController.java`

                                | Method | Endpoint | Mô tả |
                                |--------|----------|-------|
                                | POST | `/api/payment/create-vnpay-url` | Tạo URL thanh toán VNPay |
                                | GET | `/api/payment/vnpay-return` | Return URL sau thanh toán |
                                | POST | `/api/payment/vnpay-webhook` | Webhook IPN từ VNPay |
                                | GET | `/api/payment/transactions/{userId}` | Lịch sử giao dịch |
                                | GET | `/api/payment/transaction/{txnRef}` | Chi tiết giao dịch |
                                | POST | `/api/payment/topup-points` | Nạp điểm (internal) |

                                **💳 Tích hợp:** VNPay, MoMo, Stripe (cấu hình qua `application.properties`)

                                | Method | Endpoint | Mô tả |
                                |--------|----------|-------|
                                | GET | `/api/preferences/{userId}` | Tất cả preferences |
                                | GET | `/api/preferences/{userId}/type/{type}` | Theo type |
                                | POST | `/api/preferences/{userId}/disliked-food` | Ghi nhận food không thích |
                                | POST | `/api/preferences/{userId}/liked-food` | Ghi nhận food yêu thích |
                                | POST | `/api/preferences/{userId}/skipped-exercise` | Ghi nhận exercise bị skip |
                                | PUT | `/api/preferences/{userId}/cooking-equipment` | Cập nhật equipment |
                                | PUT | `/api/preferences/{userId}/meal-prep-time` | Cập nhật prep time |
                                | PUT | `/api/preferences/{userId}/work-schedule` | Cập nhật work schedule |
                                | GET | `/api/preferences/{userId}/foods-to-avoid` | Danh sách tránh |
                                | GET | `/api/preferences/{userId}/foods-to-prioritize` | Danh sách ưu tiên |
                                | GET | `/api/preferences/{userId}/ai-context` | Context cho AI |
                                | GET | `/api/preferences/{userId}/stats` | Thống kê preferences |
                                | DELETE | `/api/preferences/{preferenceId}` | Deactivate preference |

                                ---

                                ## 🤖 AI SERVICE - FASTAPI ENDPOINTS

                                **Base URL:** `http://localhost:8000`
                                **File:** `main.py`

                                ### Core AI APIs

                                | Method | Endpoint | Mô tả |
                                |--------|----------|-------|
                                | POST | `/analyze-user` | Phân tích user profile |
                                | POST | `/plan` | Generate nutrition plan |
                                | POST | `/full-plan` | Generate integrated meal + workout plan |
                                | POST | `/track-food` | Track food from image upload |
                                | POST | `/track-food-base64` | Track food from base64 image |
                                | POST | `/adjust-plan` | Điều chỉnh meal plan |
                                | POST | `/cheat-meal` | Handle cheat meals |
                                | GET | `/budget-foods/{tier}` | Get budget food recommendations |
                                | GET | `/sample-profiles` | Get test profiles |
                                | GET | `/health` | Health check |

                                ### User Preferences APIs

                                | Method | Endpoint | Mô tả |
                                |--------|----------|-------|
                                | POST | `/preferences/dislike-food` | Mark food as disliked |
                                | POST | `/preferences/skip-exercise` | Mark exercise as skipped |
                                | POST | `/preferences/rate-plan` | Rate plan (1-5 stars) |
                                | POST | `/preferences/meal-feedback` | Add meal feedback |
                                | POST | `/preferences/workout-feedback` | Add workout feedback |
                                | GET | `/preferences/{user_id}` | Get user preferences |
                                | GET | `/preferences/{user_id}/patterns` | Get feedback patterns |
                                | DELETE | `/preferences/{user_id}` | Clear preferences |

                                ### Progression APIs

                                | Method | Endpoint | Mô tả |
                                |--------|----------|-------|
                                | POST | `/progression/record-workout` | Record completed workout |
                                | POST | `/progression/record-weight` | Record user weight |
                                | POST | `/progression/advance-week` | Advance to next week |
                                | GET | `/progression/{user_id}` | Get progression data |
                                | GET | `/progression/{user_id}/weekly-summary` | Get weekly summary |
                                | GET | `/progression/{user_id}/adjustment/{exercise_name}` | Get exercise adjustment |

                                ### Price Database APIs

                                | Method | Endpoint | Mô tả |
                                |--------|----------|-------|
                                | GET | `/prices/ingredient?ingredient_name=xxx&amount=100g` | Get ingredient price |
                                | POST | `/prices/estimate-meal` | Estimate meal cost |
                                | GET | `/prices/category/{category}?budget=10000` | Get affordable ingredients |
                                | GET | `/prices/alternative?ingredient_name=xxx&budget=10000` | Get cheaper alternative |

                                ### Plan Versioning APIs

                                | Method | Endpoint | Mô tả |
                                |--------|----------|-------|
                                | POST | `/plans/save` | Save plan version |
                                | GET | `/plans/{user_id}` | Get all user plans |
                                | GET | `/plans/{user_id}/history/{plan_id}` | Get plan history |
                                | GET | `/plans/version/{version_id}` | Get specific version |
                                | GET | `/plans/compare?version_id_1=xxx&version_id_2=xxx` | Compare two versions |
                                | DELETE | `/plans/{user_id}/{plan_id}` | Delete plan history |

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


                                **Cập nhật:** May 10, 2026
