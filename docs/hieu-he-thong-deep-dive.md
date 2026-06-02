# HIỂU HỆ THỐNG FITNIT CHALLENGE — DEEP DIVE

> Tài liệu giúp **hiểu hệ thống chạy thế nào** qua từng luồng cụ thể, có ví dụ thật + tên file/class để tra cứu code.
> Đọc kèm: `bao-cao-ky-thuat-he-thong.md` (tham chiếu entity/công thức).

---

## 0. Bản đồ tổng thể — 3 thành phần nói chuyện với nhau

```
┌─────────────┐    REST /api/*     ┌──────────────┐   HTTP    ┌─────────────┐
│  FRONTEND   │ ─────────────────► │   BACKEND    │ ────────► │ AI SERVICE  │
│ React:5173  │ ◄───────────────── │ Spring:8080  │ ◄──────── │ FastAPI:8001│
└─────────────┘   JSON + JWT       └──────┬───────┘  JSON     └──────┬──────┘
                                          │                          │
                                   ┌──────▼──────┐            ┌──────▼──────┐
                                   │ PostgreSQL  │            │  Groq LLM   │
                                   │  :5432      │            │ (Llama 4)   │
                                   └─────────────┘            └─────────────┘
```

**Quy tắc vàng:** AI = phán đoán (chọn bài, chia lịch). Java = thực thi (lọc an toàn, tính toán, lưu). Frontend = hiển thị + thu thập input.

---

## 1. LUỒNG TẠO WORKOUT PLAN (chi tiết nhất)

### 1.1 Ví dụ xuyên suốt
> User **hien**: nam, 66kg, 170cm, 22 tuổi, mục tiêu **muscle_gain**, dụng cụ **full gym**, chấn thương **knee (gối)**.

### 1.2 Sơ đồ luồng đầy đủ
```
FE: CyberpunkWorkoutModal  ──POST /ai-plans/generate-workout──► AIGatewayController
       (chọn goal, equipment, duration)                              │
                                                                     ▼
                                              AIGatewayServiceImpl.generateWorkoutPlan()
   ┌──────────────────────────────────────────────────────────────────────────────┐
   │ B1. findSafeExercisesForAi(profile)   → LỌC AN TOÀN (SQL)                       │
   │ B2. resolveEquipment + assessCatalog  → đủ bài chưa?                            │
   │ B3. gọi AI service /workout-plan      → AI sinh ProgramTemplate                 │
   │ B4. validateProgramTemplate           → chống ID ảo                             │
   │ B5. WorkoutDailyPlanGenerator.generate→ BUNG + GUARDRAIL                         │
   │ B6. lưu TrainingPlanDetail + DailyTrainingLog(planned)                          │
   │ B7. createPersonalizedPlanDetails     → CÁ NHÂN HOÁ                              │
   └──────────────────────────────────────────────────────────────────────────────┘
                                                                     ▼
                                              PersonalizedPlanDetail (user thực sự thấy)
```

### 1.3 Bóc từng bước (file: `AIGatewayServiceImpl.java`)

**B1 — Lọc an toàn y tế** `findSafeExercisesForAi()`
```
injuries = "knee"  →  kneeRisk = true
SQL findSafeExercises(equipment, spineRisk, KNEE, shoulderRisk, KNEE, wristRisk)
   → loại mọi Exercise có knee_dominant=true HOẶC high_impact=true
   → kết quả: squat/lunge/jump bị loại; còn deadlift/hip-thrust/leg-curl
```
*Đây là chốt chặn quan trọng nhất — AI không bao giờ "nhìn thấy" bài hại gối.*

**B2 — Lọc theo dụng cụ + cân bằng catalog**
```
equipment "full gym" → [dumbbell, barbell, machine, cable, ...]  (loại bodyweight)
_build_prompt_exercise_catalog: chọn ≤35 bài, round-robin nhóm cơ + xen kẽ dụng cụ
   → tránh gửi AI toàn dumbbell → kế hoạch đa dạng
```

**B3 — AI sinh chiến lược** (file AI: `workout_planner.py`)
```
Gửi AI: {profile, allowed_exercises[≤35], goal=muscle_gain}
AI trả ProgramTemplate (JSON gọn):
{
  "weekly_pattern": ["upper_push","lower","rest","upper_pull","lower","rest","rest"],
  "exercise_pool": {"upper_push":[1,24,29,...], "lower":[12,48,...], "upper_pull":[...]},
  "base_sets": 3, "base_reps": 12, "base_rest_seconds": 75
}
```
*AI chỉ chọn ID từ catalog — luật prompt: "Never invent IDs".*

**B4 — Java validate** `validateProgramTemplate()`
```
Mọi exercise_id trong pool PHẢI thuộc allowed_exercises → nếu không, reject
```

**B5 — Bung thành lịch ngày** (file: `WorkoutDailyPlanGenerator.java`)
```
Với mỗi ngày trong weekly_pattern:
  - GUARDRAIL 1: lọc pool đúng nhóm cơ session
       sessionAllowsMuscle("lower", muscle) → chỉ Glutes/Quads/Hamstrings/Calves
  - GUARDRAIL 2: compoundRank → COMPOUND lên đầu, ISOLATION cuối
  - volumeForWeek(week): tính sets/reps theo block 4 tuần
  - calcCaloriesPerSession: MET × kg × phút / 60
→ ghi TrainingPlanDetail{day, exercise_id, sets, reps, rest}
```

**B7 — Cá nhân hoá** (file: `PersonalizationServiceImpl.java`)
```
Với mỗi TrainingPlanDetail:
  resolveSafeExercise(bài gốc, pool an toàn, profile):
    - nếu bài gốc OK + đúng dụng cụ → giữ
    - nếu cần đổi → tìm bài CÙNG primary_muscle, ưu tiên dụng cụ gym
    VD: Knee Push Up → Dumbbell Bench Press (cùng Chest, có dumbbell)
→ ghi PersonalizedPlanDetail (cái user mở app thấy)
```

### 1.4 Kết quả thật (đã verify trên UI)
> Day 1 (upper_push) = Barbell Bench Press → Incline Bench → ... (toàn Chest/Shoulders, compound trước, dùng barbell ~30kg). 0 bài hại gối trong cả 4 tuần.

### 1.5 Tuần kế tiếp — KHÔNG gọi lại AI
```
generate-next-week → WorkoutWeekGenerationService → WorkoutDailyPlanGenerator
   (dùng lại ProgramTemplate đã lưu + volumeForWeek tăng tiến)
→ AI chỉ tốn 1 lần gọi cho cả chương trình 12 tuần
```

---

## 2. LUỒNG MEAL PLAN

### 2.1 Hai chế độ
| Chế độ | Endpoint | Cách hoạt động |
|---|---|---|
| Chuẩn | `/ai-plans/generate-meal` | AI gợi ý món + macro trực tiếp |
| **Hybrid Smart Meal** | `/ai-plans/generate-meal-hybrid` | AI chọn `dish_id`, Java giải macro/chi phí thật |

### 2.2 Hybrid — luồng chi tiết (điểm khác biệt)
```
1. Java: lấy TDEE → mục tiêu calo/ngày → phân bổ protein/carb/fat theo goal
2. Java: gửi AI catalog món (Dish) + ngân sách + sở thích
3. AI: chỉ chọn dish_id phù hợp bữa (sáng/trưa/tối) — KHÔNG bịa món
4. Java (SmartMealService): với mỗi dish:
       macro = Σ(DishIngredient → Food.calories/protein/... × gram)
       chi phí = Σ(nguyên liệu × giá)
       điều chỉnh gram để khớp mục tiêu calo
5. Trả: daily_plans + weekly_totals + shopping_list + chi phí
```
*Vì macro tính từ nguyên liệu THẬT → thực đơn luôn nấu được, không "ảo".*

### 2.3 File liên quan
- `integrated_planner.py`, `smart_meal_dish.py` (AI service)
- `Food`, `Dish`, `DishIngredient` (entity — công thức món)
- `BudgetTracking` (theo dõi chi phí)

---

## 3. LUỒNG TRACKING & PROFILE

### 3.1 Log buổi tập
```
User hoàn thành buổi → FE POST /user/daily-training-logs
   ?trainingPlanId&dayNumber&challengeId&status=COMPLETED
   body: {actualDurationMinutes, caloriesBurned, setsCompleted, repsCompleted}
        ↓
DailyTrainingLogServiceImpl → cập nhật DailyTrainingLog{status, *_completed, calories}
        ↓
Dashboard/Logbook/Profile tổng hợp:
   - số buổi tuần này  = COUNT(DailyTrainingLog WHERE status=COMPLETED, tuần này)
   - calo đốt          = SUM(calories_burned)
   - completion %      = buổi hoàn thành / tổng buổi plan
```

### 3.2 Báo cáo cơ thể (Body Metrics)
```
User nhập số đo → POST /user/body-metric {weight, height, waist, hip, ...}
        ↓
BodyMetricHistoryServiceImpl.createBodyMetric():
   - BMI  = weight / height²
   - BMR  = Mifflin-St Jeor (lấy age/gender từ UserBodyProfile)
   - TDEE = BMR × activity_level
   - WHR  = waist / hip
   - lưu BodyMetricHistory (1 mốc thời gian)
        ↓
Profile hiển thị: cân nặng/chiều cao/BMI + tuổi/giới tính/mục tiêu/chấn thương
Lịch sử nhiều mốc → biểu đồ xu hướng (cân 68→66, mỡ 18→16...)
```

### 3.3 Vòng lặp Auto-Regulation (nối tracking → AI)
```
Cuối tuần:
  Backend gom: ProgramTemplate + log tuần (sets/reps hoàn thành, skipped, RPE) + preferences
        ↓
  AI /auto-regulate: phân tích → đề xuất điều chỉnh template (tăng/giảm volume)
        ↓
  Backend: lưu template version mới → sinh tuần kế tiếp (engine Java)
```
*Đây là chỗ tracking "nuôi" lại AI — càng tập nhiều, kế hoạch càng khít.*

---

## 4. BẢN ĐỒ CODE — tìm gì ở đâu

| Chức năng | File chính |
|---|---|
| Sinh workout (điều phối) | `service/impl/AIGatewayServiceImpl.java` |
| Lọc an toàn y tế | `AIGatewayServiceImpl.findSafeExercisesForAi()` |
| Bung lịch + guardrail | `service/impl/WorkoutDailyPlanGenerator.java` |
| Cá nhân hoá (swap bài) | `service/impl/PersonalizationServiceImpl.java` |
| Tuần kế tiếp | `service/impl/WorkoutWeekGenerationService.java` |
| AI sinh template | `ai-service/app/ai/workout_planner.py` |
| Meal hybrid | `ai-service/app/ai/smart_meal_dish.py` |
| Công thức cơ thể | `utils/BodyMetricsCalculator.java` |
| Công thức calo/goal | `utils/GoalMapper.java` |
| Tracking buổi tập | `service/impl/DailyTrainingLogServiceImpl.java` |
| Body metrics | `service/impl/BodyMetricHistoryServiceImpl.java` |
| API gateway (mọi AI endpoint) | `controller/AIGatewayController.java` |

---

## 5. CÁC "BÍ MẬT THIẾT KẾ" cần nhớ

1. **AI gọi 1 lần, dùng 12 tuần** — `ProgramTemplate` lưu lại, các tuần sau Java tự bung. Tiết kiệm chi phí AI cực lớn.
2. **Java là chốt chặn 2 đầu** — lọc an toàn TRƯỚC khi AI thấy + validate ID SAU khi AI trả. AI sai cũng không lọt.
3. **Guardrail đảm bảo chuẩn kỹ thuật** — buổi đúng nhóm cơ + compound-first, bất kể AI sinh gì.
4. **Hybrid Meal = AI chọn, Java giải số** — thực đơn luôn khả thi (không ảo giác).
5. **Tracking là data flywheel** — log buổi tập + body metrics → auto-regulation học → cá nhân hoá tốt hơn.
6. **Mọi tính toán ở Java** (BMI/BMR/TDEE/calo) — không tin client, chính xác & kiểm thử được.

---

*— Tài liệu hiểu hệ thống Fitnit Challenge —*
