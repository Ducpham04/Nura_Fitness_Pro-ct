# Báo Cáo Entity Hiện Tại - FitChallenge Backend

Ngày cập nhật: 2026-05-20

Tài liệu này mô tả trạng thái entity JPA hiện tại sau khi dọn legacy nutrition flow. Smart Meal Plan đang dùng kiến trúc Hybrid `Food + Dish + DishIngredient + PersonalizedMeal*`; các entity template cũ `NutritionPlan`, `Meal`, `MealFood`, `UserNutrition` đã được loại khỏi code/JPA.

## Tổng Quan

Backend hiện còn 32 entity trong package `com.example.fitchallenge.Entity`.

Flow Smart Meal Plan hiện tại:

`foods` -> `dishes` -> `dish_ingredients` -> `personalized_nutrition_plans` -> `personalized_meal_details` -> `personalized_meal_items`

Các bảng legacy đã được đưa vào migration drop:

- `nutrition_plans`
- `meals`
- `meal_foods`
- `user_nutrition`

Migration liên quan: `backend/src/main/resources/db/migration/V4__Drop_Legacy_Nutrition_Flow.sql`.

## Quy Ước Trạng Thái

| Trạng thái | Ý nghĩa |
|---|---|
| `ACTIVE` | Đang dùng trong hệ thống hiện tại. |
| `ACTIVE-HYBRID` | Đang dùng trực tiếp trong Smart Meal Plan mới. |
| `REMOVED` | Đã loại khỏi code/JPA và có migration drop bảng/cột. |
| `LEGACY-FIELD` | Field cũ còn giữ để tương thích dữ liệu/API cũ, không dùng cho flow chính. |

## Entity Đang Có Trong Hệ Thống

### Nhóm Auth & User

| Entity | Bảng | Trạng thái | Chức năng |
|---|---|---|---|
| `User` | `users` | `ACTIVE` | Tài khoản trung tâm, thông tin đăng nhập, điểm, avatar, trạng thái, role. |
| `Role` | `roles` | `ACTIVE` | Phân quyền user/admin. |

### Nhóm Goal, Challenge & AI Workout

| Entity | Bảng | Trạng thái | Chức năng |
|---|---|---|---|
| `Goals` | `goals` | `ACTIVE` | Catalog mục tiêu như giảm cân, tăng cơ, duy trì. |
| `Challenges` | `challenges` | `ACTIVE` | Challenge/bài tập, độ khó, video mẫu, reward, rule AI. |
| `UserChallenge` | `user_challenges` | `ACTIVE` | Lượt user tham gia challenge, video submit, điểm, confidence, trạng thái. |
| `AiModelEvent` | `ai_model_events` | `ACTIVE` | Kết quả model AI khi chấm bài tập/video. |
| `AiEvaluationLog` | `ai_evaluation_logs` | `ACTIVE` | Log pipeline AI: input/output payload, model version, lỗi, thời gian xử lý. |
| `Report` | `reports` | `ACTIVE` | Báo cáo lỗi/khiếu nại AI, challenge hoặc hệ thống. |

### Nhóm Training Plan

| Entity | Bảng | Trạng thái | Chức năng |
|---|---|---|---|
| `TrainingPlan` | `training_plans` | `ACTIVE` | Template kế hoạch tập luyện theo goal/độ khó. |
| `TrainingPlanDetail` | `training_plan_details` | `ACTIVE` | Chi tiết từng ngày/bài trong training plan. |
| `UserTraining` | `user_training` | `ACTIVE` | Plan tập luyện user đang theo, ngày hiện tại, tiến độ. |
| `PersonalizedPlanDetail` | `personalized_plan_detail` | `ACTIVE` | Bài tập cá nhân hóa cho user theo ngày/challenge. |
| `DailyTrainingLog` | `daily_training_logs` | `ACTIVE` | Nhật ký tập luyện hằng ngày, reps/sets/calo/score. |

### Nhóm Health, Body & Profile

| Entity | Bảng | Trạng thái | Chức năng |
|---|---|---|---|
| `HealthProfile` | `health_profile` | `ACTIVE` | Hồ sơ sức khỏe/lifestyle chi tiết, diet type, sleep, injury, equipment. |
| `UserBodyProfile` | `user_body_profile` | `ACTIVE` | Chỉ số cơ thể chính, BMR/TDEE, target calories, goal, budget; dùng cho meal solver. |
| `InformationBodyUser` | `information_body_user` | `ACTIVE` | Dữ liệu onboarding/body info cũ, vẫn được một số service đọc. |
| `BodyMetricHistory` | `body_metric_history` | `ACTIVE` | Lịch sử số đo cơ thể để theo dõi progress/trend. |

### Nhóm Smart Meal Plan Hybrid

| Entity | Bảng | Trạng thái | Chức năng |
|---|---|---|---|
| `Food` | `foods` | `ACTIVE-HYBRID` | Master nguyên liệu: macro/100g, giá, category, serving unit, raw/cooked, vegan. |
| `Dish` | `dishes` | `ACTIVE-HYBRID` | Master món ăn: tên món, ảnh, vai trò món, loại bữa phù hợp. |
| `DishIngredient` | `dish_ingredients` | `ACTIVE-HYBRID` | Công thức chuẩn món ăn, liên kết `Dish` và `Food`. |
| `UserInventory` | `user_inventory` | `ACTIVE-HYBRID` | Tủ lạnh user; solver dùng để set `fromInventory=true` và cost = 0. |
| `UserPreference` | `user_preferences` | `ACTIVE-HYBRID` | Sở thích, dị ứng, món không thích, context cá nhân hóa. |
| `PersonalizedNutritionPlan` | `personalized_nutrition_plans` | `ACTIVE-HYBRID` | Header meal plan cá nhân hóa: ngày, budget, macro target, status. |
| `PersonalizedMealDetail` | `personalized_meal_details` | `ACTIVE-HYBRID` | Một bữa ăn cụ thể trong plan, gắn `dish_id`, tổng macro/cost. |
| `PersonalizedMealItem` | `personalized_meal_items` | `ACTIVE-HYBRID` | Từng nguyên liệu đã solver tính gram/cost/macro/inventory flag. |
| `BudgetTracking` | `budget_tracking` | `ACTIVE` | Theo dõi chi tiêu/ngân sách, có thể liên kết personalized meal plan. |
| `DailyNutritionLog` | `daily_nutrition_logs` | `ACTIVE` | Nhật ký ăn uống hằng ngày. |
| `PlanVersionHistory` | `plan_version_history` | `ACTIVE` | Lịch sử version của nutrition/training plan. |

### Nhóm Notification, Reward & Transaction

| Entity | Bảng | Trạng thái | Chức năng |
|---|---|---|---|
| `Notification` | `notifications` | `ACTIVE` | Thông báo in-app/email/push. |
| `Reward` | `rewards` | `ACTIVE` | Catalog phần thưởng đổi điểm. |
| `RewardRedemption` | `reward_redemptions` | `ACTIVE` | Lịch sử user đổi thưởng. |
| `Transaction` | `transactions` | `ACTIVE` | Giao dịch điểm/thưởng/tiền. |

## Chi Tiết Smart Meal Plan Hybrid

### `Food / foods`

Là master data nguyên liệu. Java solver chỉ tính macro/cost dựa trên dữ liệu bảng này, không lấy số lượng/calo/giá từ Groq.

| Field chính | Ý nghĩa |
|---|---|
| `foodId`, `name` | ID và tên nguyên liệu. |
| `caloriesPer100g`, `proteinPer100g`, `carbsPer100g`, `fatPer100g` | Macro chuẩn trên 100g. |
| `averageMarketPriceVnd` | Nếu `GRAM`: giá/100g. Nếu `PIECE`: giá/1 cái/quả/cây. |
| `category` | Nhóm solver: `FIBER`, `PROTEIN`, `CARB`, `FAT`. |
| `servingUnit`, `gramsPerPiece` | Quy đổi gram/piece để tránh định lượng phi thực tế như 0.33 quả trứng. |
| `prepState`, `isVegan` | Trạng thái sơ chế và filter dietary. |

Quan hệ chính: được FK bởi `DishIngredient`, `UserInventory`, `PersonalizedMealItem`.

### `Dish / dishes`

Là master món ăn. Groq chỉ được chọn `dish_id`, không được sinh tên món tự do, định lượng, calo hoặc giá.

| Field chính | Ý nghĩa |
|---|---|
| `dishId`, `dishName` | ID và tên món hiển thị. |
| `imageUrl` | Ảnh món ăn. |
| `dishRole` | `MAIN_PROTEIN`, `SOUP`, `VEGETABLE`, `CARB_BASE`, `ONE_POT`. |
| `suitableMealTypes` | `BREAKFAST`, `MAIN_COURSE`, `SNACK`. |
| `isActive` | Có được dùng trong catalog AI hay không. |

Quan hệ chính: `OneToMany DishIngredient`, được FK bởi `PersonalizedMealDetail`, `PersonalizedMealItem`.

### `DishIngredient / dish_ingredients`

Là bảng công thức chuẩn, thay thế hoàn toàn `MealFood`.

Luồng sử dụng:

1. Java pre-filter catalog món.
2. Groq trả về danh sách `dish_id`.
3. Java query `DishIngredient` để lấy các `food_id` cấu thành món.
4. Java solver tự tính quantity, macro, cost.

### `PersonalizedNutritionPlan / personalized_nutrition_plans`

Là header plan active của user. Entity này không còn FK `templatePlan` tới `NutritionPlan`; cột `template_plan_id` được drop trong migration V4.

Field chính: `pnpId`, `user`, `aiPlanId`, `version`, `startDate`, `endDate`, `durationDays`, `targetBudgetPerDay`, `estimatedTotalCost`, `actualTotalCost`, `targetCalories`, `targetProtein`, `targetCarbs`, `targetFat`, `status`, `aiPromptVersion`, `aiResponseJson`, `generationNotes`.

### `PersonalizedMealDetail / personalized_meal_details`

Mỗi record là một bữa ăn cụ thể trong plan.

Field chính: `pmdId`, `personalizedPlan`, `dayNumber`, `mealType`, `dish`, `totalCalories`, `totalProtein`, `totalCarbs`, `totalFat`, `estimatedCost`, `prepTimeMinutes`, `cookingInstructions`, `wasEaten`, `userRating`, `userFeedback`.

Field `mealItemsJson` còn tồn tại như `LEGACY-FIELD` để tương thích dữ liệu/API cũ. Flow mới ưu tiên `PersonalizedMealItem`.

### `PersonalizedMealItem / personalized_meal_items`

Mỗi record là một nguyên liệu đã được solver tính xong cho một bữa.

Field chính: `pmiId`, `mealDetail`, `food`, `dish`, `quantityGrams`, `fromInventory`, `lineCalories`, `lineProtein`, `lineCarbs`, `lineFat`, `lineCostVnd`.  

Logic cost:

- `ServingUnit.GRAM`: làm tròn gram theo bội số 5, `cost = finalGrams / 100 * averageMarketPriceVnd`.
- `ServingUnit.PIECE`: làm tròn số piece nguyên, `finalGrams = pieces * gramsPerPiece`, `cost = pieces * averageMarketPriceVnd`.
- Nếu `fromInventory=true`: ép `lineCostVnd = 0`.

## Entity Đã Loại Bỏ Khỏi Flow Hiện Tại

| Entity cũ | Bảng cũ | Trạng thái hiện tại | Thay thế bằng |
|---|---|---|---|
| `NutritionPlan` | `nutrition_plans` | `REMOVED` | `PersonalizedNutritionPlan` |
| `Meal` | `meals` | `REMOVED` | `PersonalizedMealDetail` + `Dish` |
| `MealFood` | `meal_foods` | `REMOVED` | `DishIngredient` + `PersonalizedMealItem` |
| `UserNutrition` | `user_nutrition` | `REMOVED` | Active plan trong `PersonalizedNutritionPlanRepository` |

Các thành phần đã gỡ kèm:

- Entity JPA: `NutritionPlan`, `Meal`, `MealFood`, `UserNutrition`.
- Repository: `NutritionPlanRepository`, `MealRepository`, `MealFoodRepository`, `UserNutritionRepository`.
- Service/Admin CRUD: `NutritionPlanService`, `MealService`, `MealFoodService`, `UserNutritionService` và các implementation/controller tương ứng.
- DTO legacy: `NutritionPlanDTO`, `MealDTO`, `MealFoodDTO`, `UserNutritionDTO`.
- Seeder legacy trong `DataSeederServiceImpl`.

## Dependency Đã Chuyển Sang Flow Mới chọn dflow mới nè. 

| Vị trí | Cập nhật |
|---|---|
| `DashboardServiceImpl` | Thống kê nutrition đọc từ `PersonalizedNutritionPlanRepository` thay vì `UserNutritionRepository`. |
| `UserServiceImpl` | Fallback daily calories dùng `UserBodyProfile.recommendedCalories`, sau đó active `PersonalizedNutritionPlan.targetCalories`. |
| `PersonalizedNutritionPlan` | Bỏ relation `templatePlan`; plan mới không phụ thuộc nutrition template. |
| `Food` | Bỏ relation legacy `mealFoods`; chỉ còn phục vụ master ingredient và hybrid solver. |
| `DataSeederServiceImpl` | Không seed `NutritionPlan`, `Meal`, `MealFood`, `UserNutrition` nữa. |

## API/Service Cần Giữ Cho Meal Plan Mới

| Thành phần | Vai trò |
|---|---|
| `AIGatewayController.generateHybridMealPlan` | Endpoint `/api/ai-plans/generate-meal-hybrid`. |
| `SmartMealPlanService` | Orchestrator: pre-filter dish, gọi FastAPI, lookup recipe, solve macro/cost, persist. |
| `DishRepository` | Query catalog món ăn. |
| `DishIngredientRepository` | Query công thức món ăn kèm `Food`. |
| `FoodRepository` | Master ingredient data. |
| `DishAdminController` | CRUD admin cho `Dish` và `DishIngredient`. |
| `UserInventoryRepository` | Lấy tủ lạnh để set `fromInventory`. |
| `PersonalizedNutritionPlanRepository` | Lấy active plan cho FE. |
| `PersonalizedMealDetailRepository` | Lấy meal theo ngày, fetch dish/items. |
| `PersonalizedMealItemRepository` | Batch insert nguyên liệu đã solve. |

## SQL Migration Đã Thêm

```sql
ALTER TABLE personalized_nutrition_plans DROP COLUMN IF EXISTS template_plan_id;

DROP TABLE IF EXISTS meal_foods;
DROP TABLE IF EXISTS meals;
DROP TABLE IF EXISTS user_nutrition;
DROP TABLE IF EXISTS nutrition_plans;
```

## Kết Luận

Flow meal plan hiện tại đã không còn phụ thuộc các bảng template cũ. Các bảng cốt lõi không được xoá là:

- `foods`
- `dishes`
- `dish_ingredients`
- `user_inventory`
- `user_preferences`
- `personalized_nutrition_plans`
- `personalized_meal_details`
- `personalized_meal_items`
