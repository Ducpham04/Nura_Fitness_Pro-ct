# Kiến trúc: Workout cá nhân hóa đa đối tượng

> Tài liệu kiến trúc/thiết kế. Mục tiêu: giáo án phù hợp **nhiều đối tượng** (người lớn
> tuổi tập nhẹ giữ sức khỏe, nữ muốn eo thon/mông–đùi, người mới…), **bỏ ép full-body**,
> **cá nhân hóa theo vùng cơ**, và **cung cấp kiến thức** cho người tập.

---

## 1. Pipeline hiện tại (end-to-end)

```
[FE] CyberpunkWorkoutModal (tạo plan)  →  trainingService
        │  goal, equipment, duration, intensity, totalWeeks
        ▼
[BE] AIGatewayServiceImpl.generateWorkoutProgram()
        │  1) Lấy UserBodyProfile + HealthProfile
        │  2) findSafeExercisesForAi(healthProfile, equipment)   ← LỌC EXERCISE
        │       • chỉ loại theo CHẤN THƯƠNG (back/knee/shoulder/wrist) + THIẾT BỊ
        │       • KHÔNG xét tuổi, KHÔNG xét vùng cơ mong muốn
        │  3) isAiReadyExercise() + assessCatalogReadiness()
        │  4) Dựng aiRequest: user_profile{age,gender,goal,fitness_level},
        │       allowed_exercises[], equipment, injuries, week_number…
        ▼
[AI] workout_planner.WorkoutPlanner.generate_template()
        │  • _PHASE_PARAMS  → chu kỳ NSCA 4 tuần (foundation→volume→intensity→deload)
        │       GIỐNG NHAU cho mọi người (tuần 3 = 80% 1RM, 6–8 rep)
        │  • _LEVEL_PATTERNS[level][goal] → weekly_pattern 7 ngày
        │       beginner & maintenance ⇒ "full_body" (ÉP FULL-BODY)
        │  • Prompt + ALLOWED EXERCISES → Groq → ProgramTemplate(JSON)
        ▼
[BE] Validate exercise_pool ⊆ allowed_exercises → lưu ProgramTemplate
        ▼
[BE] WorkoutWeekGenerationService + WorkoutDailyPlanGenerator
        │  • Khai triển template → các buổi/ngày (PersonalizedPlanDetail)
        ▼
[BE] PersonalizationServiceImpl → lưu chi tiết theo user/ngày
        ▼
[FE] TrainingView hiển thị lịch + bài tập (+ parseNotes: benefit/tempo)
```

**Tóm tắt vai trò từng lớp**
| Lớp | Trách nhiệm hiện tại |
|---|---|
| FE | Thu input (goal, equipment, duration) + hiển thị |
| BE Gateway | Lọc exercise an toàn, dựng request, validate, persist |
| AI planner | Chọn split + periodization + chọn bài từ catalog |
| BE Personalization | Khai triển template → lịch chi tiết |

---

## 2. Nơi cá nhân hóa bị mất (gap → đúng phàn nàn)

| Phàn nàn | Mất ở đâu |
|---|---|
| **Ép full-body** | `_LEVEL_PATTERNS`: beginner + maintenance = full_body; không có nhánh "ưu tiên vùng cơ". |
| **Người lớn tuổi cần nhẹ** | `_PHASE_PARAMS` cố định, **không cap theo tuổi**; `findSafeExercisesForAi` **không lọc high-impact theo tuổi**. |
| **Nữ: eo thon, mông/đùi** | **Không có khái niệm `focus_areas`** ở bất kỳ lớp nào; GoalType chỉ 5 loại, thiếu mục tiêu thẩm mỹ vùng cơ. |
| **Thiếu kiến thức** | `adaptation_notes` sơ sài; không sinh giải thích "vì sao/lưu ý/lợi ích". |

→ **Nguyên lý lỗi**: cá nhân hóa đang **ngầm định** (dựa age/gender trong prompt) thay vì **tường minh** (rule + dữ liệu vào). Cần biến nó thành tầng quyết định rõ ràng.

---

## 3. Kiến trúc đích

Thêm **một tầng quyết định tường minh** — *Personalization Resolver* — ở BE, biến hồ sơ
người dùng thành **"đơn thuốc tập luyện" (training prescription)** có cấu trúc, rồi đẩy
xuống AI như ràng buộc cứng (không để AI tự đoán).

```
[FE] chọn: Mục tiêu (mở rộng) + Vùng cơ ưu tiên + (auto) tuổi/giới/thể trạng
        ▼
[BE] PersonalizationResolver.resolve(profile) → TrainingPrescription {
        archetype:       "older_adult" | "general" | "athletic" ...   (suy từ tuổi/level)
        split_strategy:  full_body | upper_lower | lower_focus | glute_core_focus ...
        focus_areas:     [glutes, thighs, core_waist, ...]            (từ FE hoặc suy ra)
        intensity_cap:   %1RM trần (vd ≥55t → ≤70%)
        impact_policy:   low_impact_only | mixed
        include:         [mobility, balance, warmup]                  (older adult)
        volume_bias:     { lower: 1.4, core: 1.2, upper: 0.8 }        (theo focus)
        education_level: basic | detailed
     }
        │  + lọc exercise: findSafeExercisesForAi  MỞ RỘNG
        │       → loại high-impact nếu impact_policy=low_impact_only
        │       → ưu tiên bài thuộc focus_areas
        ▼
[AI] generate_template(prescription, allowed_exercises)
        │  • weekly_pattern theo split_strategy (KHÔNG ép full-body)
        │  • intensity/sets/reps tôn trọng intensity_cap + archetype
        │  • phân bổ volume theo volume_bias (mông/đùi/eo nhiều hơn)
        │  • adaptation_notes = GIÁO DỤC (vì sao bài này, lưu ý an toàn, lợi ích)
        ▼
[BE/FE] như cũ + FE hiển thị khối "Kiến thức buổi tập"
```

### 3.1 Hợp đồng dữ liệu (data contract) cần thêm
- **FE → BE** (lúc tạo plan): `focusAreas: string[]`, `goal` (mở rộng).
- **BE → AI** (`aiRequest`): thêm `focus_areas`, `intensity_cap_pct`, `impact_policy`,
  `archetype`, `volume_bias`, `education_level`.
- **AI schema** (`UserProfile`/request): thêm `focus_areas: List[str]`,
  `intensity_cap_pct: Optional[int]`, `impact_policy: str`, `archetype: str`.
- **GoalType** (mở rộng, ánh xạ tiếng Việt): thêm `toning` (thon gọn/định hình),
  `general_health` (sức khỏe tổng quát/người lớn tuổi). Giữ tương thích 5 goal cũ.

### 3.2 Logic quyết định (đặt ở BE — 1 chỗ, dễ kiểm thử)
- **archetype**: `age ≥ 55` (hoặc có hạn chế) → `older_adult`; người mới + trẻ → `general`…
- **split_strategy**:
  - focus mông/đùi → `lower_focus`; focus eo/core → `core_focus`;
  - older_adult → `full_body_lowimpact` (nhẹ, đều, nhiều mobility);
  - không focus → theo goal/level như cũ.
- **intensity_cap**: older_adult ≤ 70% 1RM, ưu tiên rep cao (12–15), nghỉ dài hơn.
- **impact_policy**: older_adult / khớp yếu → `low_impact_only` (loại nhảy, plyo, chạy mạnh).
- **volume_bias**: nhân hệ số set theo `focus_areas`.

### 3.3 Vì sao đặt Resolver ở BE (không ở AI)
- An toàn & nhất quán: ngưỡng tuổi/cường độ là **rule y học**, không nên để LLM tự đoán.
- Dễ test bằng unit test thuần (không tốn token AI).
- AI chỉ còn việc "chọn bài hợp lý trong ràng buộc" → ổn định, rẻ.

---

## 4. Thay đổi theo lớp

| Lớp | Thay đổi |
|---|---|
| **AI** `workout_planner.py` | Nhận prescription; bỏ ép full-body (pattern theo split_strategy); cap cường độ; phân bổ volume theo bias; sinh `adaptation_notes` giáo dục. Schema thêm field. |
| **AI** `schemas/nutrition.py` | `UserProfile` + request: `focus_areas`, `intensity_cap_pct`, `impact_policy`, `archetype`; `GoalType` thêm `toning`, `general_health`. |
| **BE** `AIGatewayServiceImpl` | Thêm `PersonalizationResolver`; mở rộng `findSafeExercisesForAi` (lọc high-impact theo tuổi, ưu tiên focus); đẩy field mới vào `aiRequest`. |
| **BE** `HealthProfile`/`UserBodyProfile` | (tùy) lưu `focusAreas` để tái dùng các lần sinh sau. |
| **FE** tạo plan + Onboarding | Chọn **vùng cơ ưu tiên** + mục tiêu mở rộng. |
| **FE** `TrainingView` | Khối **"Kiến thức buổi tập"** từ `adaptation_notes`/notes. |

---

## 5. Điểm quyết định sản phẩm (cần bạn chốt)
1. **Danh sách vùng cơ** phơi ra cho người dùng: gợi ý — *Mông, Đùi, Eo/Bụng, Lưng, Vai/Tay, Toàn thân*.
2. **Mục tiêu mở rộng**: có thêm "Định hình/thon gọn" và "Sức khỏe người lớn tuổi" không?
3. **Ngưỡng tuổi** cho chế độ nhẹ: 55? 60? (đề xuất ≥55 bật `older_adult`).
4. **UI chọn vùng cơ**: thêm ngay (trọn 3 lớp) hay tạm suy từ goal/giới (chỉ AI+BE trước)?

## 6. Thứ tự triển khai đề xuất
1. **BE Resolver + mở rộng filter** (rule thuần, test nhanh) — *nền móng*.
2. **AI planner** dùng prescription (bỏ ép full-body, cap cường độ, volume bias, notes giáo dục).
3. **Verify API** 3 ca: nữ 55t giữ sức khỏe · nữ trẻ focus mông–đùi · người mới.
4. **FE**: UI chọn vùng cơ/mục tiêu + khối kiến thức.

> Có thể chạy **bước 1–3 trước** (cải thiện thấy ngay, verify bằng API thật, chưa đụng UI),
> rồi mới làm **bước 4** khi đã chốt danh sách vùng cơ/mục tiêu ở mục 5.
