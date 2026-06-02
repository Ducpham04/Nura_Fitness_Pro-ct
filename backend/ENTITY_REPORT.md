# BÁO CÁO ENTITY - Fitness AI Backend

**Ngày cập nhật:** May 14, 2026  
**Tổng số Entity:** 32  
**Đường dẫn:** `/src/main/java/com/example/fitchallenge/Entity/`

---

## 📊 TỔNG QUAN CÁC ENTITY

### 1. USER MANAGEMENT (4 entities)

| Entity | Table | Mô tả |
|--------|-------|-------|
| `User` | users | Thông tin người dùng hệ thống |
| `Role` | roles | Phân quyền người dùng |
| `InformationBodyUser` | information_body_user | Thông tin cơ thể cơ bản của user (dùng cho Dashboard) |
| `UserPreference` | user_preferences | Lưu tùy chọn và feedback của người dùng (AI preference store) |

### 2. CHALLENGE SYSTEM (3 entities)

| Entity | Table | Mô tả |
|--------|-------|-------|
| `Goals` | goals | Mục tiêu tập luyện |
| `Challenges` | challenges | Thử thách tập luyện với AI evaluation |
| `UserChallenge` | user_challenges | Lưu thông tin user tham gia thử thách |

### 3. TRAINING SYSTEM (5 entities)

| Entity | Table | Mô tả |
|--------|-------|-------|
| `TrainingPlan` | training_plans | Kế hoạch tập luyện mẫu |
| `TrainingPlanDetail` | training_plan_details | Chi tiết từng ngày trong kế hoạch mẫu |
| `UserTraining` | user_training | User đăng ký kế hoạch tập |
| `PersonalizedPlanDetail` | personalized_plan_detail | Bài tập cá nhân hóa (AI Generated) |
| `DailyTrainingLog` | daily_training_logs | Nhật ký tập luyện hàng ngày |

### 4. NUTRITION & FOOD (8 entities)

| Entity | Table | Mô tả |
|--------|-------|-------|
| `NutritionPlan` | nutrition_plans | Kế hoạch dinh dưỡng mẫu |
| `Meal` | meals | Bữa ăn trong kế hoạch mẫu |
| `MealFood` | meal_foods | Liên kết Meal và Food |
| `Food` | foods | Danh mục thực phẩm |
| `UserNutrition` | user_nutrition | User đăng ký kế hoạch dinh dưỡng |
| `PersonalizedNutritionPlan` | personalized_nutrition_plans | Kế hoạch dinh dưỡng cá nhân hóa (AI) |
| `PersonalizedMealDetail` | personalized_meal_details | Bữa ăn cá nhân hóa theo kho thực phẩm |
| `UserInventory` | user_inventory | Kho thực phẩm hiện có của người dùng |

### 5. AI & EVALUATION (4 entities)

| Entity | Table | Mô tả |
|--------|-------|-------|
| `AiEvaluationLog` | ai_evaluation_logs | Log chi tiết quá trình đánh giá AI |
| `AiModelEvent` | ai_model_events | Sự kiện phân tích từ AI model |
| `Report` | reports | Báo cáo/Khiếu nại về kết quả AI |
| `PlanVersionHistory` | plan_version_history | Lịch sử các phiên bản kế hoạch AI |

### 6. REWARD & FINANCE (4 entities)

| Entity | Table | Mô tả |
|--------|-------|-------|
| `Reward` | rewards | Danh sách phần thưởng |
| `RewardRedemption` | reward_redemptions | Lịch sử đổi quà |
| `Transaction` | transactions | Giao dịch điểm/tiền |
| `BudgetTracking` | budget_tracking | Theo dõi ngân sách ăn uống hàng ngày |

### 7. HEALTH & METRICS (3 entities)

| Entity | Table | Mô tả |
|--------|-------|-------|
| `HealthProfile` | health_profile | Hồ sơ sức khỏe chi tiết |
| `UserBodyProfile` | user_body_profile | Chỉ số cơ thể từ Onboarding |
| `BodyMetricHistory` | body_metric_history | Biểu đồ lịch sử thay đổi chỉ số |

### 8. NOTIFICATION (1 entity)

| Entity | Table | Mô tả |
|--------|-------|-------|
| `Notification` | notifications | Hệ thống thông báo đa kênh |

---

## 📋 CHI TIẾT CÁC ENTITY MỚI/CẬP NHẬT

### 24. USER_BODY_PROFILE (Updated)
**Bảng:** `user_body_profile`
*Dùng để lưu dữ liệu từ form Onboarding.*

| Field | Type | Nullable | Mô tả |
|-------|------|----------|-------|
| id | Long | No | PK |
| user | User | No | FK → User |
| height | Double | Yes | Chiều cao (cm) |
| weight | Double | Yes | Cân nặng (kg) |
| bmi | Double | Yes | Chỉ số BMI (tự động tính) |
| bodyFat | Double | Yes | % mỡ |
| muscleMass | Double | Yes | Khối lượng cơ |
| age | Integer | Yes | Tuổi |
| gender | String | Yes | Giới tính (MALE, FEMALE) |
| goal | String | Yes | Mục tiêu (string label) |
| createdAt | OffsetDateTime | Yes | `@CreationTimestamp` |
| updatedAt | OffsetDateTime | Yes | `@UpdateTimestamp` |

---

### 27. BUDGET_TRACKING
**Bảng:** `budget_tracking`
*Theo dõi chi tiêu ăn uống so với ngân sách dự kiến.*

| Field | Type | Nullable | Mô tả |
|-------|------|----------|-------|
| btId | Long | No | PK |
| user | User | No | FK → User |
| trackingDate | LocalDate | No | Ngày theo dõi |
| dailyBudget | Integer | No | Ngân sách mục tiêu (VND) |
| actualSpent | Integer | No | Thực tế đã chi |
| variance | Integer | Yes | Chênh lệch |
| createdAt | ZonedDateTime | Yes | Ngày tạo |

---

### 28. USER_INVENTORY
**Bảng:** `user_inventory`
*Quản lý thực phẩm user đang có trong tủ lạnh để AI gợi ý món ăn.*

| Field | Type | Nullable | Mô tả |
|-------|------|----------|-------|
| inventoryId | Long | No | PK |
| user | User | No | FK → User |
| food | Food | Yes | FK → Food (nếu có trong DB) |
| foodName | String | No | Tên thực phẩm (manual input) |
| quantityGrams| Double | No | Khối lượng (g) |
| status | Enum | No | AVAILABLE, EXPIRED, USED |
| expiryDate | LocalDate | Yes | Ngày hết hạn |
| addedAt | ZonedDateTime | Yes | Ngày nhập kho |

---

### 29. USER_PREFERENCE
**Bảng:** `user_preferences`
*Lưu các tùy chọn cá nhân để AI học hỏi (Preference Store).*

| Field | Type | Nullable | Mô tả |
|-------|------|----------|-------|
| upId | Long | No | PK |
| user | User | No | FK → User |
| preferenceType| Enum | No | DISLIKED_FOOD, LIKED_FOOD, SKIPPED_EXERCISE, v.v. |
| itemName | String | No | Tên item (ví dụ: "Mướp đắng") |
| preferenceValue| String | Yes | Giá trị bổ sung (JSON/Text) |
| priority | Integer | Yes | Mức độ ưu tiên (1-10) |
| occurrenceCount| Integer | Yes | Số lần lặp lại hành vi |

---

### 30. PERSONALIZED_NUTRITION_PLAN
**Bảng:** `personalized_nutrition_plans`
*Kế hoạch dinh dưỡng do AI tạo riêng cho User.*

| Field | Type | Nullable | Mô tả |
|-------|------|----------|-------|
| pnpId | Long | No | PK |
| user | User | No | FK → User |
| templatePlan | NutritionPlan | Yes | FK → Plan mẫu (nếu có) |
| aiPlanId | String | No | ID từ AI Model |
| status | Enum | No | ACTIVE, EXPIRED, REPLACED |
| targetBudget | Integer | Yes | Ngân sách mục tiêu/ngày |
| createdAt | ZonedDateTime | Yes | Ngày tạo |

---

### 31. PERSONALIZED_MEAL_DETAIL
**Bảng:** `personalized_meal_details`
*Chi tiết các bữa ăn trong kế hoạch AI.*

| Field | Type | Nullable | Mô tả |
|-------|------|----------|-------|
| pmdId | Long | No | PK |
| pnpId | Long | No | FK → PersonalizedNutritionPlan |
| mealType | String | No | BREAKFAST, LUNCH, DINNER, SNACK |
| foodName | String | No | Tên món ăn gợi ý |
| calories | Integer | Yes | Calo ước tính |
| recipeJson | String | Yes | Công thức nấu (JSON) |

---

### 32. PLAN_VERSION_HISTORY
**Bảng:** `plan_version_history`
*Lưu vết các lần AI điều chỉnh kế hoạch.*

| Field | Type | Nullable | Mô tả |
|-------|------|----------|-------|
| pvhId | Long | No | PK |
| user | User | No | FK → User |
| planType | String | No | TRAINING, NUTRITION |
| oldDataJson | String | Yes | Dữ liệu cũ |
| newDataJson | String | Yes | Dữ liệu mới |
| changeReason | String | Yes | Lý do thay đổi (User feedback/AI re-eval) |
| createdAt | ZonedDateTime | Yes | Thời điểm thay đổi |

---

## 🔗 SƠ ĐỒ QUAN HỆ (Cập nhật)

1. **User Body Profile Sync:** Khi User hoàn thành Onboarding, dữ liệu được lưu vào `UserBodyProfile` đồng thời sync sang `InformationBodyUser` để hiển thị Dashboard.
2. **AI Nutrition Loop:** `UserInventory` + `UserPreference` → **AI Engine** → `PersonalizedNutritionPlan` → `BudgetTracking`.
3. **AI Training Loop:** `HealthProfile` + `DailyTrainingLog` → **AI Engine** → `PersonalizedPlanDetail`.

---

## 🔧 CÁC CẬP NHẬT MỚI NHẤT (May 14, 2026)
1. **Đồng bộ hóa Onboarding:** Thêm logic trigger trong `UserBodyProfileServiceImpl` để tự động cập nhật `InformationBodyUser` khi có profile mới.
2. **Gender-aware Calculations:** Cập nhật `BodyMetricsCalculator` và Onboarding Form để hỗ trợ Nam/Nữ trong tính toán BMR.
3. **Mở rộng Hệ sinh thái AI:** Bổ sung các Entity về Inventory, Preference và Version History để hỗ trợ các service Python AI tích hợp sâu hơn.
