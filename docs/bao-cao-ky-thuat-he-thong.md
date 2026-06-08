# BÁO CÁO KỸ THUẬT HỆ THỐNG — FITNIT CHALLENGE

> Tài liệu mô tả: **Mô hình dữ liệu (Entity) → Quan hệ trường data → Luồng nghiệp vụ → Công thức tính toán cụ thể.**
> Phạm vi: Backend Spring Boot 3 (Java 17) + PostgreSQL + AI Service (FastAPI/Groq) + Pose Service (MediaPipe).
> **Phiên bản:** v1.2 — cập nhật 06/2026 (bổ sung: chấm tư thế real-time MediaPipe + HMAC, macro dinh dưỡng theo g/kg, periodization NSCA 4 tuần, split buổi tập theo số ngày/tuần, dự đoán tiến độ cân nặng).

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

### 5.4 Calo mỗi buổi tập — MET Formula chuẩn ACSM (Compendium 2024)

**Công thức chính xác trong code** (`CaloriesCalculator.calculateCalories`):
```
Calories = MET × 3.5 × weight(kg) × duration(phút) / 200
```
> Đây là dạng chuẩn ACSM: `MET × 3.5 × kg / 200` = kcal/phút (vì 1 MET = 3.5 ml O₂/kg/phút, 1 L O₂ ≈ 5 kcal). Tương đương `MET × kg × giờ × 1.05`.

**MET được tra theo 2 tầng** (`getMETValue`):
1. **Theo TÊN bài tập** (ưu tiên — chính xác hơn): burpee=10, jump rope=10, pull-up/chin-up=8, push-up=8, bench press=6, squat=5.5, deadlift=6, lunge=5, plank=3.5, bicep curl=3.0, lateral raise=3.0, stretch/yoga=2.5…
2. **Fallback theo LOẠI** (`exercise_type`): cardio=7.0, strength=5.0, full_body=5.5, upper/lower=5.0, mặc định=5.0.

*VD (squat, 66kg, 30 phút): 5.5 × 3.5 × 66 × 30 / 200 = 190.5 → 191 kcal*

**Ước tính thời lượng buổi tập** khi không có duration thực (`estimateDurationMinutes`):
```
active(s) = sets × reps × 2          (2 giây/rep — tempo trung bình)
rest(s)   = (sets − 1) × restSeconds  (không tính nghỉ sau set cuối)
duration  = round((active + rest) / 60)  phút
```
*VD (3×15, nghỉ 45s): active = 3×15×2 = 90s; rest = 2×45 = 90s; total = 180s = 3 phút.*

> **Cân nặng mặc định** khi thiếu hồ sơ: 70 kg. Khi user đã hoàn thành buổi
> (`calculateCaloriesFromLog`): ưu tiên duration thực; nếu chỉ có sets/reps thì
> ước tính với nghỉ mặc định 45s.

### 5.4b Macro mục tiêu dinh dưỡng (Smart Meal — `SmartMealPlanTransactionService`)

Khi sinh thực đơn, backend tính **mục tiêu macro/ngày** từ hồ sơ — AI không bịa số:
```
Calo mục tiêu = UserBodyProfile.recommendedCalories (TDEE)   [mặc định 2000]

Protein (g) = weight(kg) × hệ_số
   hệ_số = 2.0  nếu goal chứa "muscle"/"tăng" (tăng cơ)
   hệ_số = 1.6  các mục tiêu còn lại

Fat (g)   = Calo × 0.25 / 9          (25% năng lượng từ chất béo; 1g fat = 9 kcal)

Carbs (g) = (Calo − Protein×4 − Fat×9) / 4   (phần năng lượng còn lại; 1g = 4 kcal)
```
*VD (nam tăng cơ, 66kg, TDEE 2500):*
- *Protein = 66 × 2.0 = 132 g (528 kcal)*
- *Fat = 2500 × 0.25 / 9 = 69.4 g (625 kcal)*
- *Carbs = (2500 − 528 − 625) / 4 = 336.75 g*

> **Lưu ý phân biệt:** màn Dashboard tổng quan dùng tỉ lệ nhanh 25/50/25
> (protein/carbs/fat) để vẽ vòng macro; còn **engine sinh thực đơn thật** dùng
> công thức protein theo **g/kg thể trọng** ở trên (chính xác theo dinh dưỡng thể thao).

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

### 5.7 Tăng tiến theo tuần — Periodization NSCA chu kỳ 4 tuần

AI service (`workout_planner._PHASE_PARAMS`) áp **chu kỳ NSCA 4 tuần lặp lại**, pha
tự suy ra từ số tuần: `phase = cycle[(week−1) % 4 + 1]`.

| Tuần trong chu kỳ | Pha | Sets | Rep range | Nghỉ | Cường độ (%1RM) |
|---|---|---|---|---|---|
| 1 | **foundation** (thích nghi) | 3 | 12–15 | 75s | 65% |
| 2 | **volume** (khối lượng) | 4 | 10–12 | 75s | 70% |
| 3 | **intensity** (cường độ) | 4 | 6–8 | 90s | 80% |
| 4 | **deload** (giảm tải hồi phục) | 2 | 12–15 | 60s | 55% |

Hai pha mở rộng (khi auto-regulation yêu cầu): **build** (4×8–10, 90s, 75%) và
**overload** (5×4–6, 120s, 85%).

> **Cap cường độ theo rủi ro:** với hồ sơ tuổi cao / có chấn thương,
> `intensity_pct` bị giới hạn bởi `intensity_cap_pct` (vd cap 70% → không bao giờ
> đẩy lên pha intensity 80%). An toàn luôn ưu tiên hơn tiến độ.

### 5.8 Chọn split buổi tập theo SỐ NGÀY/TUẦN & trình độ

Pattern tuần 7 ngày chọn theo **trình độ** (NSCA frequency) rồi tinh chỉnh theo
**chiến lược chia buổi** (`_SPLIT_PATTERNS`, ưu tiên cao hơn nếu có):

| Trình độ | Tần suất | Logic |
|---|---|---|
| **beginner** | 3 buổi/tuần | Full-body xen kẽ nghỉ (giai đoạn thích nghi thần kinh-cơ) |
| **intermediate** | 4 buổi/tuần | Upper/Lower split |
| **advanced** | 5 buổi/tuần | Tần suất cao hơn mỗi nhóm cơ |

**Rep range & nghỉ theo mục tiêu** (AI prompt) + weekly pattern mẫu (intermediate):

| Goal | Rest gợi ý | Weekly pattern mẫu |
|---|---|---|
| muscle_gain | 60–90s (75s) | `[upper_push, lower, rest, upper_pull, lower, rest, rest]` |
| strength | 120–180s (150s) | `[lower, upper_push, rest, lower, upper_pull, rest, rest]` |
| weight_loss | 45–60s (52s) | `[full_body, cardio_core, full_body, rest, cardio_core, full_body, rest]` |
| endurance | 30–45s (38s) | `[full_body, cardio_core, full_body, cardio_core, rest, full_body, rest]` |

**Chiến lược chia buổi cá nhân hoá** (`_SPLIT_PATTERNS`): `upper_lower`,
`lower_focus`, `core_focus`, `full_body_lowimpact` (người lớn tuổi/ít va đập),
`light_general`… → cho phép bias vùng cơ thay vì ép full-body.

**Cân bằng đẩy–kéo:** guardrail Java đảm bảo buổi `upper_push` chỉ chứa ngực/vai/tay
sau, `upper_pull` chỉ lưng/tay trước; full_body phải đủ **push + pull + lower + core**
(mỗi nhóm ≥1 bài) → tránh mất cân đối cơ.

---

### 5.9 Chấm điểm tư thế real-time (Pose Service — MediaPipe)

Pose service (`fitness-ai-service`) chạy MediaPipe Pose (33 landmark), mỗi bài có
analyzer riêng (squat, push-up, pull-up, sit-up, plank). Quy trình mỗi frame:

**a) Tính góc khớp** (`utils/geometry.calculate_angle`) — góc tại đỉnh B của 3 điểm A-B-C:
```
θ = | atan2(Cy−By, Cx−Bx) − atan2(Ay−By, Ax−Bx) | × 180/π
nếu θ > 180 → θ = 360 − θ        (chuẩn hoá về 0–180°)
```
*VD squat: góc gối = angle(hip, knee, ankle); góc lưng = angle(shoulder, hip, knee).*

**b) Đếm rep — máy trạng thái có hysteresis + làm mượt** (`_check_rep_complete`):
- Góc được **trung bình trượt** cửa sổ 3 frame (`SMOOTH_WINDOW=3`) → giảm nhiễu landmark.
- Vào DOWN khi `góc < down_threshold`; tính **+1 rep** khi `góc > up_threshold`
  VÀ trước đó đã giữ DOWN ≥ `MIN_DOWN_FRAMES` (1) frame.
- 2 ngưỡng khác nhau tạo **hysteresis** tự nhiên → không đếm trùng khi tay run quanh ngưỡng.
- Điểm khớp đôi dùng **trung bình có trọng số theo visibility** → chính xác khi quay nghiêng.

**c) Điểm chất lượng form 0–100** (`_calculate_quality_score`), bắt đầu từ 100:
```
− 15 điểm / lỗi severity = error
−  8 điểm / lỗi severity = warning
−  3 điểm / lỗi severity = info
− min(độ_lệch_góc / 5, 10) cho mỗi góc lệch khỏi khoảng lý tưởng
− 10 điểm nếu chuyển trạng thái giật cục (>2 lần đổi state gần đây)
→ kẹp [0, 100], rồi LÀM MƯỢT EMA: score = 0.3×mới + 0.7×cũ
```
*VD squat lý tưởng: gối 85–95° (đáy ~90°), lưng 150–180°. Lỗi điển hình: gối vượt mũi
chân (error −15), lưng cong khi xuống <145° (warning −8), squat chưa đủ sâu >105° (warning −8).*

### 5.10 Bảo mật điểm — HMAC server-authoritative (`PoseResultVerifier`)

Điểm **phải do pose service ký**, client không thể tự khai reps/quality:
```
1. Pose service tạo token = base64url(JSON{reps, quality_score, exercise_type, issued_at})
2. Ký: sig = HMAC-SHA256(POSE_SIGNING_SECRET, token)  (hex)
3. Client chỉ chuyển tiếp {token, sig} cho backend
4. Backend verify:
   - tính lại HMAC, so sánh hằng-thời-gian (MessageDigest.isEqual) → chống timing attack
   - kiểm tra issued_at, |now − issued_at| ≤ 300s → token hết hạn sau 5 phút
   - reps/quality LẤY TỪ payload đã ký, KHÔNG từ input client
```
> `POSE_SIGNING_SECRET` là bí mật chia sẻ giữa backend và pose service. Đây là
> bất biến an toàn: **không có chữ ký hợp lệ ⇒ không có điểm**.

### 5.11 Dự đoán tiến độ cân nặng (Progress Prediction)

Từ chuỗi `(recordedAt, weightKg)` trong `BodyMetricHistory`:

**a) Tốc độ thay đổi** — hồi quy tuyến tính bình phương tối thiểu (đổi thời gian → tuần):
```
rate_kg_per_week = slope(weight ~ week);   R² → độ tin cậy
< 3 mốc → dùng 2 điểm: (last − first) / số_tuần  (nhãn "ước lượng sơ bộ")
```

**b) ETA đạt mục tiêu** (dùng `HealthProfile.goalWeightKg`):
```
weeks_to_goal = (currentWeight − targetWeightKg) / rate_kg_per_week
```
Chỉ hiển thị khi dấu của rate khớp hướng mục tiêu; ngược hướng → cảnh báo "đi sai hướng".

**c) Kỳ vọng theo cân bằng năng lượng** (đối chiếu thực tế ↔ kế hoạch):
```
expected_kg_per_week ≈ (intake_avg − TDEE) × 7 / 7700      (7700 kcal ≈ 1 kg mỡ)
```
→ kết luận: **đúng tiến độ | nhanh hơn | chậm hơn | chững lại (plateau)**.

**d) Ngưỡng an toàn:** giảm cân ~ −0.5 kg/tuần, tăng cơ ~ +0.25…+0.5 kg/tuần;
`|rate| > 1% thể trọng/tuần` → cảnh báo "thay đổi quá nhanh".

---

## 6. Ràng buộc & bất biến (Invariants) quan trọng

1. **An toàn y tế tuyệt đối:** Exercise có cờ chấn thương khớp với `current_injuries` → KHÔNG BAO GIỜ lọt vào catalog gửi cho AI. Java lọc TRƯỚC + validate ID SAU.
2. **Session coherence:** buổi `lower` chỉ chứa bài nhóm chân; `upper_push` chỉ ngực/vai/tay — guardrail Java đảm bảo bất kể AI sinh gì.
3. **Compound-first:** trong mỗi buổi, bài COMPOUND luôn xếp trước ISOLATION.
4. **Đồng bộ template ↔ personalized:** `PersonalizedPlanDetail.tpd_id` luôn trỏ TrainingPlanDetail hợp lệ; goal đồng bộ qua 2 bảng profile.
5. **Kinh tế điểm nguyên tử:** đổi thưởng trừ điểm + giảm stock trong 1 `@Transactional`; huỷ thì hoàn lại.
6. **BMI/BMR/TDEE tự tính:** mọi lần lưu body metric, backend tính lại (không tin client).
7. **Điểm tư thế do server ký:** reps/quality chỉ được chấp nhận khi có chữ ký HMAC-SHA256 hợp lệ từ pose service (`POSE_SIGNING_SECRET`), token hết hạn sau 5 phút → client không thể bịa điểm.
8. **Macro & calo do backend tính:** AI chỉ chọn `dish_id`/`exercise_id`; gram, macro, chi phí, calo đốt đều do Java tính từ dữ liệu thật (`foods.*_per_100g`, MET).

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
