# BÁO CÁO KỸ THUẬT HỆ THỐNG — FITNIT CHALLENGE

> Tài liệu mô tả: **Mô hình dữ liệu (Entity) → Quan hệ trường data → Luồng nghiệp vụ → Công thức tính toán cụ thể.**
> Phạm vi: Backend Spring Boot 3 (Java 17) + PostgreSQL + AI Service (FastAPI/Groq).

---

## 1. Tổng quan kiến trúc dữ liệu

Hệ thống có **37 entity JPA**, chia thành 5 nhóm chức năng. Dữ liệu chảy theo trục:

```
NGƯỜI DÙNG (hồ sơ) ──► AI (sinh chiến lược) ──► JAVA (bung + tính toán) ──► TRACKING (theo dõi)
   User/HealthProfile      ProgramTemplate         TrainingPlanDetail          DailyTrainingLog
   UserBodyProfile                                 PersonalizedPlanDetail       BodyMetricHistory
```

**Nguyên tắc thiết kế:** mỗi trường metadata của `Exercise`/`HealthProfile` là một "đầu vào quyết định" cho AI và bộ lọc an toàn. Chất lượng metadata = chất lượng kế hoạch.

---

## 2. Danh mục Entity theo nhóm

### 2.1 Nhóm Người dùng & Hồ sơ
| Entity | Bảng | Trường khóa | Vai trò |
|---|---|---|---|
| `User` | users | id, email, password, role_id, **points**, streak | Tài khoản, ví điểm |
| `Role` | roles | id, role_name | USER / ADMIN |
| `HealthProfile` | health_profile | user_id, **available_equipment**, **current_injuries**, primary_goal | Đầu vào lọc an toàn + dụng cụ cho AI |
| `UserBodyProfile` | user_body_profile | user_id, height, weight, age, gender, **goal**, bmi, bmr, recommended_calories, activity_level, experience_level | Hồ sơ thể chất → tính BMR/TDEE + goal cho AI |
| `BodyMetricHistory` | body_metric_history | user_id, weight_kg, bmi, body_fat_pct, muscle_mass_kg, waist/hip/chest/arm/thigh_cm, waist_hip_ratio, bmr/tdee_calculated | Lịch sử đo cơ thể (tracking tiến triển) |
| `UserPreference` | user_preferences | user_id, disliked_foods, skipped_exercises | Tuỳ chọn cá nhân (cho AI/auto-regulation) |
| `Notification` | notifications | user_id, content, is_read | Thông báo |

### 2.2 Nhóm Fitness & Training
| Entity | Bảng | Trường khóa | Vai trò |
|---|---|---|---|
| `Goals` | goals | id, name, image_link | Mục tiêu (taxonomy) |
| `Exercise` | exercises | id, primary_muscle, exercise_category, **required_equipment**, **knee_dominant**, **high_impact**, force_type, met_value, default_sets/reps | Thư viện bài tập — nguồn AI chọn |
| `TrainingPlan` | training_plans | tp_id, goal_id, title, difficulty_level, duration_weeks | Kế hoạch (template hoặc "vỏ" AI) |
| `TrainingPlanDetail` | training_plan_details | tpd_id, tp_id, day_number, exercise_id, sets, reps, rest_time | Lịch tập từng ngày (template đã bung) |
| `UserTraining` | user_training | ut_id, user_id, tp_id, week_number, total_weeks, completion_percentage | User đăng ký 1 chương trình |
| `PersonalizedPlanDetail` | personalized_plan_detail | ppd_id, ut_id, tpd_id, exercise_id, sets, reps | **Lịch cá nhân hoá user thực sự thấy** |
| `ProgramTemplate` | program_templates | id, user_training_id, weekly_pattern_json, exercise_pool_json, goal, base_sets/reps | Template gọn AI sinh (JSON) |
| `DailyTrainingLog` | daily_training_logs | dtl_id, user_id, day_number, exercise_id, status, sets/reps_completed, calories_burned, perceived_difficulty | **Tracking buổi tập thực tế** |
| `UserTrainingSession` | user_training_sessions | id, ut_id, session_type, calories | Log phiên tập |

### 2.3 Nhóm Challenges
| Entity | Bảng | Vai trò |
|---|---|---|
| `Challenges` | challenges | Thử thách (title, duration_days, reward_points, ai_rules_json) |
| `UserChallenge` | user_challenges | User tham gia (status, score, video_url) |
| `AiEvaluationLog` / `AiModelEvent` | — | Log AI chấm điểm submission |

### 2.4 Nhóm Nutrition
| Entity | Bảng | Vai trò |
|---|---|---|
| `Food` | foods | Nguyên liệu (calories, protein, carbs, fat /100g) |
| `Dish` | dishes | Món ăn (role, meal types) |
| `DishIngredient` | dish_ingredients | Liên kết Dish ↔ Food (công thức) |
| `PersonalizedNutritionPlan` / `PersonalizedMealItem` | — | Kế hoạch dinh dưỡng cá nhân |
| `DailyNutritionLog` | daily_nutrition_logs | Nhật ký ăn uống |

### 2.5 Nhóm Rewards & Finance
| Entity | Bảng | Vai trò |
|---|---|---|
| `Reward` | rewards | Phần thưởng (cost_points, **stock**) |
| `RewardRedemption` | reward_redemptions | Đổi thưởng (status PENDING/FULFILLED/CANCELLED) |
| `Transaction` | transactions | Sổ cái điểm (type, points, status) |
| `BudgetTracking` | budget_tracking | Ngân sách dinh dưỡng |

---

## 3. Quan hệ trường data cốt lõi (Field-level dependencies)

Đây là phần quan trọng nhất — **trường nào ở entity này quyết định hành vi ở entity/luồng khác.**

### 3.1 Hồ sơ → Bộ lọc an toàn AI
```
HealthProfile.current_injuries  ──┐
   "knee"  → loại Exercise có knee_dominant=true OR high_impact=true
   "back"  → loại Exercise có spinal_loading=true
   "shoulder" → loại shoulder_overhead=true
   "wrist" → loại wrist_loading=true
                                   │
HealthProfile.available_equipment ┼──► findSafeExercises() → catalog gửi AI
   "full gym" → [dumbbell,barbell,machine,cable,...] (loại bodyweight)
   "dumbbells" → [dumbbell] only
```
→ **Exercise.knee_dominant / high_impact / spinal_loading / required_equipment** là các "công tắc" lọc. Thiếu/sai cờ này = AI có thể kê bài nguy hiểm.

### 3.2 Hồ sơ thể chất → Công thức năng lượng
```
UserBodyProfile{weight, height, age, gender} ──► BMR ──► TDEE (×activity_level)
                                                  │
                                                  └──► recommended_calories (mục tiêu calo/ngày)
UserBodyProfile.goal ("muscle_gain") ──► AI weekly_pattern + rep range
```

### 3.3 Chuỗi sinh lịch tập (4 tầng)
```
ProgramTemplate.exercise_pool_json   (AI chọn exercise_id theo buổi)
        │ (WorkoutDailyPlanGenerator bung + guardrail nhóm cơ + compound-first)
        ▼
TrainingPlanDetail{day_number, exercise_id, sets, reps}   (lịch template từng ngày)
        │ (PersonalizationServiceImpl: resolveSafeExercise giữ nhóm cơ + đúng dụng cụ)
        ▼
PersonalizedPlanDetail{ut_id, tpd_id, exercise_id, sets, reps}   (user thực sự thấy)
        │ (user hoàn thành buổi tập)
        ▼
DailyTrainingLog{status=COMPLETED, sets_completed, reps_completed, calories_burned}
```
**Lưu ý quan hệ then chốt:** `PersonalizedPlanDetail.tpd_id` trỏ về `TrainingPlanDetail` — đảm bảo lịch cá nhân luôn đồng bộ với template. (Bug từng xảy ra khi 2 nguồn lệch nhau.)

### 3.4 Goal — nguồn chuẩn & đồng bộ
```
Khi generate: request.goal → UserBodyProfile.goal  ✚  HealthProfile.primary_goal  (đồng bộ cả 2)
Khi personalize: ProgramTemplate.goal (ưu tiên) → primary_goal → "maintenance"
                 → chuẩn hoá qua GoalMapper.toAiGoal → quyết định rep range
```

### 3.5 Kinh tế điểm thưởng
```
Reward.cost_points  ┐
User.points         ┼──► redeemReward(): validate points≥cost & stock>0
Reward.stock        ┘         → User.points -= cost ; Reward.stock -= 1
                              → RewardRedemption(PENDING)
Huỷ (CANCELLED) → hoàn: User.points += cost ; Reward.stock += 1
```

---

## 4. Các luồng nghiệp vụ chính

### 4.1 Onboarding → Hồ sơ
1. User nhập: cân nặng, chiều cao, tuổi, giới tính, **mục tiêu**, **dụng cụ**, **chấn thương**.
2. Lưu `UserBodyProfile` (goal, age, gender...) + `HealthProfile` (equipment, injuries).
3. Backend tính ngay BMI, BMR, TDEE → lưu vào profile.

### 4.2 Sinh kế hoạch tập (Workout Generation)
```
1. Java: findSafeExercisesForAi(profile) → lọc an toàn y tế + dụng cụ
2. Java: _build_prompt_exercise_catalog → cân bằng nhóm cơ + dụng cụ (≤35 bài)
3. AI (Groq): sinh ProgramTemplate {weekly_pattern, exercise_pool, base_sets/reps}
4. Java: validate ID (chống ảo giác) → WorkoutDailyPlanGenerator bung:
   - GUARDRAIL: lọc đúng nhóm cơ theo session + compound-first
   - Tính progression theo tuần (block 4 tuần)
   - Tính calo (MET formula)
   → ghi TrainingPlanDetail + DailyTrainingLog (planned)
5. Java: createPersonalizedPlanDetails → swap giữ nhóm cơ + đúng dụng cụ → PersonalizedPlanDetail
```

### 4.3 Auto-Regulation (tuần kế tiếp)
```
1. Java gom: ProgramTemplate hiện tại + log tuần (sets/reps hoàn thành, skipped, RPE) + preferences
2. AI: trả điều chỉnh template (tăng/giảm volume)
3. Java: saveAdaptedProgramTemplate (version mới) → generateNextWeek (engine Java, KHÔNG gọi lại AI cho việc bung)
```

### 4.4 Tracking buổi tập
```
User hoàn thành buổi → POST /daily-training-logs{status=COMPLETED, reps/sets_completed, calories}
  → DailyTrainingLog cập nhật → Dashboard/Logbook/Profile tổng hợp (số buổi, calo đốt, completion%)
```

### 4.5 Đổi thưởng
```
User đổi → validate điểm+stock → trừ điểm + giảm stock → RewardRedemption(PENDING)
Admin duyệt → FULFILLED (đã giao) | huỷ → CANCELLED (hoàn điểm+stock)
```

---

## 5. Công thức tính toán cụ thể

### 5.1 BMI (Body Mass Index)
```
BMI = weight(kg) / height(m)²
```
*VD: 66 / 1.70² = 22.84*

### 5.2 BMR — Mifflin-St Jeor Equation
```
Nam:  BMR = 10×weight(kg) + 6.25×height(cm) − 5×age + 5
Nữ:   BMR = 10×weight(kg) + 6.25×height(cm) − 5×age − 161
```
*VD (nam, 66kg, 170cm, 22t): 10×66 + 6.25×170 − 5×22 + 5 = 660 + 1062.5 − 110 + 5 = 1617.5 kcal*

### 5.3 TDEE (Total Daily Energy Expenditure)
```
TDEE = BMR × Activity Multiplier
```
| Mức vận động | Hệ số |
|---|---|
| Sedentary (ít) | 1.2 |
| Lightly active (nhẹ) | 1.375 |
| Moderately active (vừa) | 1.55 |
| Very active (nhiều) | 1.725 |
| Extra active (rất nhiều) | 1.9 |
*VD: 1617.5 × 1.55 = 2507 kcal*

### 5.4 Calo mỗi buổi tập — MET Formula (Compendium 2024)
```
Calories = MET × weight(kg) × duration(phút) / 60
```
| Session type | MET |
|---|---|
| full_body | 5.0 |
| upper_body | 4.5 |
| lower_body | 5.5 |
| cardio | 7.0 |
| hiit | 8.0 |
| stretch / mobility | 2.5 |
| rest | 1.0 |
*VD (full_body, 66kg, 45 phút): 5.0 × 66 × 45 / 60 = 247.5 → 248 kcal*

### 5.5 WHR (Waist-Hip Ratio)
```
WHR = waist(cm) / hip(cm)
```
*VD: 78 / 95 = 0.82 — chỉ số đánh giá phân bố mỡ & nguy cơ tim mạch*

### 5.6 Navy Body Fat (ước lượng từ số đo vòng)
```
Nam: %BF = 495 / (1.0324 − 0.19077×log₁₀(waist−neck) + 0.15456×log₁₀(height)) − 450
Nữ:  %BF = 495 / (1.29579 − 0.35004×log₁₀(waist+hip−neck) + 0.22100×log₁₀(height)) − 450
```
*(số đo quy đổi sang inch: cm / 2.54)*

### 5.7 Tăng tiến theo tuần (Progression — block 4 tuần)
```
Tuần % 4 == 0  → DELOAD: sets − 1 (giữ reps để hồi phục)

Block 0 (tuần 1–3) FOUNDATION: reps = base + weekInBlock      (3×12 → 3×13 → 3×14)
Block 1 (tuần 5–7) BUILD:      reps = base + 2 + weekInBlock   (3×14 → 3×15 → 3×16)
Block 2+ (tuần 9+) OVERLOAD:   sets = base + 1 + weekInBlock/2,
                               reps = max(base−2, 3), rest + 30s
```

### 5.8 Rep range & nghỉ theo mục tiêu (AI prompt)
| Goal | Rest gợi ý | Weekly pattern |
|---|---|---|
| muscle_gain | 60–90s (75s) | `[upper_push, lower, rest, upper_pull, lower, rest, rest]` |
| strength | 120–180s (150s) | `[lower, upper_push, rest, lower, upper_pull, rest, rest]` |
| weight_loss | 45–60s (52s) | `[full_body, cardio_core, full_body, rest, cardio_core, full_body, rest]` |
| endurance | 30–45s (38s) | `[full_body, cardio_core, full_body, cardio_core, rest, full_body, rest]` |

---

## 6. Ràng buộc & bất biến (Invariants) quan trọng

1. **An toàn y tế tuyệt đối:** Exercise có cờ chấn thương khớp với `current_injuries` → KHÔNG BAO GIỜ lọt vào catalog gửi cho AI. Java lọc TRƯỚC + validate ID SAU.
2. **Session coherence:** buổi `lower` chỉ chứa bài nhóm chân; `upper_push` chỉ ngực/vai/tay — guardrail Java đảm bảo bất kể AI sinh gì.
3. **Compound-first:** trong mỗi buổi, bài COMPOUND luôn xếp trước ISOLATION.
4. **Đồng bộ template ↔ personalized:** `PersonalizedPlanDetail.tpd_id` luôn trỏ TrainingPlanDetail hợp lệ; goal đồng bộ qua 2 bảng profile.
5. **Kinh tế điểm nguyên tử:** đổi thưởng trừ điểm + giảm stock trong 1 `@Transactional`; huỷ thì hoàn lại.
6. **BMI/BMR/TDEE tự tính:** mọi lần lưu body metric, backend tính lại (không tin client).

---

## 7. Sơ đồ quan hệ tổng (ERD mô tả)

```
User 1───1 HealthProfile          User 1───1 UserBodyProfile
 │                                  │
 │ 1───* UserTraining *───1 TrainingPlan *───1 Goals
 │             │                          │
 │             │ 1───* PersonalizedPlanDetail *───1 Exercise
 │             │                                       ▲
 │             └─ 1───1 ProgramTemplate                │ (pool chọn từ)
 │                                                     │
 │ 1───* DailyTrainingLog *────────────────────────────┘
 │ 1───* BodyMetricHistory
 │ 1───* UserChallenge *───1 Challenges
 │ 1───* RewardRedemption *───1 Reward
 │ 1───* Transaction
 │
TrainingPlan 1───* TrainingPlanDetail *───1 Exercise
Dish *───* Food  (qua DishIngredient)
```

---

*— Báo cáo kỹ thuật Fitnit Challenge —*
