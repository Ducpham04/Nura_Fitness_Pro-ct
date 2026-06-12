"""
AI Workout Planner - produces compact program templates only.
"""
import json
import os
import time
from typing import Dict, List

from ..schemas.nutrition import UserProfile
from ..schemas.workout import ProgramTemplate


class WorkoutPlanner:
    """AI Personal Trainer powered by Groq."""

    SESSION_TYPES = ["upper_push", "lower", "rest", "upper_pull", "full_body", "cardio_core", "rest"]
    MIN_POOL_SIZE = {
        "upper_push": 5,
        "upper_pull": 5,
        "upper": 6,          # thân trên = đẩy + kéo (cân bằng)
        "lower": 5,
        "push": 5,
        "pull": 5,
        "core": 4,
        "full_body": 6,
        "cardio_core": 5,
    }
    MAX_CATALOG_SIZE = 35

    # ── NSCA Linear Periodization — 4-week cycle ────────────────────────────
    # Source: NSCA Essentials of Strength Training & Conditioning (4th ed.)
    # Week 1=foundation (adaptation), 2=volume, 3=intensity, 4=deload → repeat
    _PHASE_PARAMS = {
        "foundation": {"sets": 3, "rep_range": "12-15", "rest": 75,  "intensity_pct": 65},
        "volume":     {"sets": 4, "rep_range": "10-12", "rest": 75,  "intensity_pct": 70},
        "intensity":  {"sets": 4, "rep_range": "6-8",   "rest": 90,  "intensity_pct": 80},
        "deload":     {"sets": 2, "rep_range": "12-15", "rest": 60,  "intensity_pct": 55},
        "build":      {"sets": 4, "rep_range": "8-10",  "rest": 90,  "intensity_pct": 75},
        "overload":   {"sets": 5, "rep_range": "4-6",   "rest": 120, "intensity_pct": 85},
    }

    # ── Level-based weekly patterns (NSCA frequency guidelines) ─────────────
    # beginner  = 3×/week full-body (neuromuscular adaptation phase)
    # intermediate = 4×/week upper/lower split
    # advanced   = 5×/week more frequency per muscle group
    _LEVEL_PATTERNS = {
        "beginner": {
            "muscle_gain":  ["full_body", "rest", "full_body", "rest", "full_body", "rest", "rest"],
            "strength":     ["full_body", "rest", "full_body", "rest", "full_body", "rest", "rest"],
            "weight_loss":  ["full_body", "cardio_core", "rest", "full_body", "cardio_core", "rest", "rest"],
            "endurance":    ["full_body", "cardio_core", "rest", "full_body", "cardio_core", "rest", "rest"],
            "maintenance":  ["full_body", "rest", "full_body", "rest", "full_body", "rest", "rest"],
        },
        "intermediate": {
            "muscle_gain":  ["upper_push", "lower", "rest", "upper_pull", "lower", "rest", "rest"],
            "strength":     ["lower", "upper_push", "rest", "lower", "upper_pull", "rest", "rest"],
            "weight_loss":  ["full_body", "cardio_core", "full_body", "rest", "cardio_core", "full_body", "rest"],
            "endurance":    ["full_body", "cardio_core", "full_body", "cardio_core", "rest", "full_body", "rest"],
            "maintenance":  ["full_body", "rest", "full_body", "rest", "full_body", "rest", "rest"],
        },
        "advanced": {
            "muscle_gain":  ["upper_push", "lower", "upper_pull", "rest", "upper_push", "lower", "rest"],
            "strength":     ["lower", "upper_push", "rest", "lower", "upper_pull", "lower", "rest"],
            "weight_loss":  ["full_body", "cardio_core", "upper_pull", "full_body", "cardio_core", "lower", "rest"],
            "endurance":    ["cardio_core", "full_body", "cardio_core", "full_body", "cardio_core", "full_body", "rest"],
            "maintenance":  ["upper_push", "lower", "rest", "upper_pull", "full_body", "rest", "rest"],
        },
    }

    # ── Pattern theo CHIẾN LƯỢC chia buổi (ưu tiên hơn _LEVEL_PATTERNS khi có) ──
    # Cho phép cá nhân hóa thật: không ép full-body, bias vùng cơ, chế độ nhẹ cho người lớn tuổi.
    _SPLIT_PATTERNS = {
        "full_body_lowimpact": ["full_body", "rest", "full_body", "rest", "full_body", "rest", "rest"],
        "lower_focus":         ["lower", "upper_push", "rest", "lower", "core", "rest", "rest"],
        "core_focus":          ["core", "full_body", "rest", "core", "cardio_core", "rest", "rest"],
        "upper_lower":         ["upper_push", "lower", "rest", "upper_pull", "lower", "rest", "rest"],
        "full_body":           ["full_body", "rest", "full_body", "rest", "full_body", "rest", "rest"],
        "light_general":       ["full_body", "rest", "cardio_core", "rest", "full_body", "rest", "rest"],
    }

    def __init__(self):
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise ValueError("GROQ_API_KEY environment variable not set")

        import httpx
        from openai import OpenAI

        os.environ.pop("HTTP_PROXY", None)
        os.environ.pop("HTTPS_PROXY", None)
        os.environ.pop("ALL_PROXY", None)

        self.client = OpenAI(
            base_url="https://api.groq.com/openai/v1",
            api_key=api_key,
            http_client=httpx.Client(timeout=90.0),
        )
        # ── Fallback chain — tất cả text-gen models free của Groq ──────────────
        # Thứ tự: mới/mạnh nhất trước, nhỏ/cũ nhất sau.
        # Khi một model bị 429 rate-limit, tự động chuyển sang model tiếp theo.
        self.model_name = "meta-llama/llama-4-scout-17b-16e-instruct"
        self.fallback_models = [
            "llama-3.3-70b-versatile",       # Meta 70B — chất lượng cao
            "openai/gpt-oss-120b",            # 120B model trên Groq
            "openai/gpt-oss-20b",             # 20B model trên Groq
            "qwen/qwen3-32b",                 # Alibaba Qwen 32B
            "groq/compound",                  # Groq compound model
            "groq/compound-mini",             # Groq compound mini
            "llama-3.1-8b-instant",           # backup nhỏ nhất (~2.2K tokens/request)
        ]

    @staticmethod
    def _get_phase(week_number: int, progression_phase: str = "foundation") -> dict:
        """Auto-derive periodization phase from week number.
        4-week NSCA cycle: W1=foundation, W2=volume, W3=intensity, W4=deload → repeat.
        Explicit progression_phase overrides auto-detection when it's not the default.
        """
        cycle_phases = {1: "foundation", 2: "volume", 3: "intensity", 4: "deload"}
        auto_phase = cycle_phases.get((week_number - 1) % 4 + 1, "foundation")
        resolved = progression_phase if progression_phase not in ("foundation", "") else auto_phase
        return WorkoutPlanner._PHASE_PARAMS.get(resolved, WorkoutPlanner._PHASE_PARAMS["foundation"]), resolved

    def generate_template(
        self,
        user_profile: UserProfile,
        days: int,
        week_number: int = 1,
        total_weeks: int = 4,
        available_equipment: List[str] = None,
        workout_intensity: str = "moderate",
        duration_minutes: int = 45,
        progression_phase: str = "foundation",
        preferences: List[str] = None,
        allowed_exercises: List[Dict] = None,
        current_injuries: str = "",
        prescription: Dict = None,
    ) -> ProgramTemplate:
        allowed_exercises = allowed_exercises or []
        if not allowed_exercises:
            raise ValueError("allowed_exercises is required; Java must pre-filter the medical exercise catalog")

        prompt_exercises = self._build_prompt_exercise_catalog(allowed_exercises)

        goal_key = user_profile.goal.value if hasattr(user_profile.goal, "value") else str(user_profile.goal)
        level_key = user_profile.fitness_level.value if hasattr(user_profile.fitness_level, "value") else str(user_profile.fitness_level)
        level_key = level_key if level_key in self._LEVEL_PATTERNS else "intermediate"

        # Resolve periodization phase from week_number
        phase_params, phase_name = self._get_phase(week_number, progression_phase)
        base_sets     = phase_params["sets"]
        rep_range     = phase_params["rep_range"]
        rest_rec      = phase_params["rest"]
        intensity_pct = phase_params["intensity_pct"]

        # ── Áp "đơn tập" cá nhân hóa (ràng buộc cứng từ backend) ────────────────
        rx = prescription or {}
        cap = int(rx.get("intensity_cap_pct") or 100)
        if intensity_pct > cap:
            intensity_pct = cap                      # cap cường độ theo tuổi/rủi ro
        if rx.get("rep_range_hint"):
            rep_range = rx["rep_range_hint"]         # rep cao hơn cho nhóm thận trọng
        split_strategy = (rx.get("split_strategy") or "").strip()
        focus_areas    = rx.get("focus_areas") or []
        impact_policy  = rx.get("impact_policy") or "mixed"
        archetype      = rx.get("archetype") or "general"
        edu_level      = rx.get("education_level") or "basic"

        # Pattern: ưu tiên lịch 7 ngày backend đã quyết → KHÔNG ép full-body
        rx_pattern = rx.get("weekly_pattern") or []
        if isinstance(rx_pattern, list) and len(rx_pattern) == 7:
            pattern_hint = json.dumps(rx_pattern)
        elif split_strategy in self._SPLIT_PATTERNS:
            pattern_hint = json.dumps(self._SPLIT_PATTERNS[split_strategy])
        else:
            pattern_hint = json.dumps(
                self._LEVEL_PATTERNS.get(level_key, self._LEVEL_PATTERNS["intermediate"])
                                     .get(goal_key, self._LEVEL_PATTERNS["intermediate"]["muscle_gain"])
            )

        # Ràng buộc cá nhân hóa thêm vào prompt
        rx_rules = []
        if impact_policy == "low_impact_only":
            rx_rules.append('- LOW-IMPACT ONLY: tuyệt đối KHÔNG bài nhảy/plyometric/chạy mạnh (high_impact).')
        if focus_areas:
            rx_rules.append(f'- FOCUS: ưu tiên NHIỀU set/bài cho nhóm cơ {focus_areas} (vẫn giữ cân bằng cơ đối kháng).')
        if rx.get("include_mobility"):
            rx_rules.append('- Thêm khởi động/độ linh hoạt (mobility) đầu buổi.')
        if rx.get("include_balance"):
            rx_rules.append('- Thêm bài thăng bằng/ổn định (phòng té ngã cho người lớn tuổi).')
        rx_rules.append(f'- Cường độ KHÔNG vượt {intensity_pct}% 1RM (đã cap theo hồ sơ).')
        if edu_level == "detailed":
            rx_rules.append('- adaptation_notes: 3–5 ghi chú NGẮN bằng TIẾNG VIỆT giải thích VÌ SAO kế hoạch phù hợp '
                            '(cường độ, vùng cơ, an toàn). KHÔNG hứa "giảm mỡ điểm"/làm to vòng 1.')
        else:
            rx_rules.append('- adaptation_notes: 2–3 ghi chú ngắn tiếng Việt về trọng tâm & cách tiến bộ an toàn.')
        rx_rules_str = "\n".join(rx_rules)

        # NSCA weekly volume targets per muscle group (sets/week for hypertrophy)
        volume_guideline = {
            "beginner":     "8-12 sets/muscle/week",
            "intermediate": "12-16 sets/muscle/week",
            "advanced":     "16-20 sets/muscle/week",
        }.get(level_key, "12-16 sets/muscle/week")

        system_prompt = f"""You are a certified personal trainer (NSCA-CSCS). Output ONLY a JSON ProgramTemplate. No markdown.

PERIODIZATION: Week {week_number} → Phase={phase_name} | Sets={base_sets} | Reps={rep_range} | Rest={rest_rec}s | Intensity≈{intensity_pct}% 1RM
VOLUME TARGET: {volume_guideline} (distribute across sessions)

RULES:
1. weekly_pattern: exactly 7 entries, ≥2 "rest" days.
2. exercise_pool: only session types used in weekly_pattern.
3. ONLY use "id" values from ALLOWED EXERCISES catalog. Never invent IDs.
4. Pool sizes: 1×/week→≥5 IDs, 2×/week→≥10 IDs (first 5=Session-A, next 5=Session-B).
5. full_body pool MUST cover: push + pull + lower + core (at least 1 each).
6. COMPOUND exercises (press, row, deadlift, squat) listed BEFORE isolation in pool.
7. Session types: upper = MUST include BOTH PUSH and PULL (ngực+lưng+vai+tay, cân bằng đẩy/kéo);
   lower = LEGS (squat/hinge/lunge + glutes/calves); push=PUSH; pull=PULL; core=CORE; cardio_core=CARDIO/CORE.

RECOVERY: upper_push & upper_pull → never consecutive. lower → not back-to-back.

PERSONALIZATION (archetype={archetype}, risk_tier={rx.get("risk_tier", "A")}) — RÀNG BUỘC CỨNG:
{rx_rules_str}

OUTPUT:
{{"goal":"...","weekly_pattern":[...],"exercise_pool":{{...}},"base_sets":{base_sets},"base_reps":{rep_range.split("-")[0]},"base_rest_seconds":{rest_rec},"progression_rate":0.05,"duration_minutes":{duration_minutes},"intensity":"{workout_intensity}","adaptation_notes":[]}}"""

        prompt = f"""User: {user_profile.weight}kg/{user_profile.height}cm/{user_profile.age}y {user_profile.gender}
Goal={goal_key} | Level={level_key} | Week={week_number}/{total_weeks} | Phase={phase_name}
Equipment: {json.dumps(available_equipment or ["bodyweight"])} | Injuries: {current_injuries or "none"}
Duration: {duration_minutes}min | Rest: {rest_rec}s | Sets: {base_sets} | Reps: {rep_range}

Prescription: split={split_strategy or "auto"} | focus={focus_areas} | impact={impact_policy} | cap={intensity_pct}%1RM
Use EXACTLY this weekly pattern: {pattern_hint}

ALLOWED EXERCISES:
{json.dumps(prompt_exercises, ensure_ascii=False)}

Catalog fields: id=exercise_id, n=name, t=exercise_type, m=primary_muscle, eq=equipment, ft=force_type, cat=exercise_category, met=MET.
Use ft for grouping: PUSH→push/upper/full_body, PULL→pull/upper/full_body, LEGS→lower/full_body, CORE→core/cardio_core/full_body, CARDIO→cardio_core.
For "upper" sessions you MUST mix PUSH and PULL exercises (balance đẩy/kéo).

Return ONLY the ProgramTemplate JSON."""

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt},
        ]

        print(f"[WorkoutPlanner] Week={week_number}/{total_weeks} Phase={phase_name} Level={level_key} Sets={base_sets} Reps={rep_range}")
        return self._call_with_retry(messages, allowed_exercises)

    def _call_with_retry(self, messages: List[Dict], allowed_exercises: List[Dict]) -> ProgramTemplate:
        """
        Gọi AI với fallback chain tự động:
        - 429 rate-limit trên model hiện tại → chờ ngắn rồi thử model tiếp theo
        - Validation fail → gửi correction message và retry cùng model
        - Kết quả KHÔNG bị ảnh hưởng về chất lượng vì task là JSON selection đơn giản
        """
        all_models = [self.model_name] + self.fallback_models
        last_error = None
        raw = ""

        for model_idx, model in enumerate(all_models):
            print(f"[WorkoutPlanner] Trying model {model_idx+1}/{len(all_models)}: {model}")
            current_messages = list(messages)  # fresh copy per model

            for attempt in range(2):  # max 2 attempts per model (1 initial + 1 correction)
                try:
                    response = self.client.chat.completions.create(
                        model=model,
                        messages=current_messages,
                        temperature=0.2 if attempt == 0 else 0.1,
                        max_tokens=800,
                    )
                    raw = response.choices[0].message.content
                    parsed = self._parse_json_response(raw)
                    if parsed.get("error"):
                        raise ValueError(str(parsed["error"]))

                    template = ProgramTemplate(**parsed)
                    self._validate_template(template, allowed_exercises)
                    print(f"[WorkoutPlanner] ✅ Success with model: {model}")
                    return template

                except Exception as exc:
                    error_str = str(exc)
                    last_error = exc

                    # ── Rate limit: chuyển ngay sang model tiếp theo ──────────
                    if "rate_limit_exceeded" in error_str or "429" in error_str:
                        wait = 5  # chờ ngắn trước khi thử model khác
                        print(f"[WorkoutPlanner] ⚠️  Rate limit on '{model}', switching model in {wait}s...")
                        time.sleep(wait)
                        break  # break inner loop → try next model

                    # ── Validation fail: gửi correction và retry cùng model ──
                    if attempt == 0:
                        print(f"[WorkoutPlanner] Validation failed on {model}: {exc} — retrying with correction")
                        current_messages.append({"role": "assistant", "content": raw})
                        current_messages.append({
                            "role": "user",
                            "content": (
                                f"Fix this error: {exc}\n"
                                "Rules: all IDs must be from ALLOWED EXERCISES. "
                                "full_body needs push+pull+lower+core. "
                                "Return corrected JSON only."
                            ),
                        })
                        continue

                    # ── Other error: thử model tiếp ─────────────────────────
                    print(f"[WorkoutPlanner] ❌ Model '{model}' failed: {exc}")
                    break

        raise ValueError(f"Workout template generation failed after trying {len(all_models)} models. Last error: {last_error}")

    def _validate_template(self, template: ProgramTemplate, allowed_exercises: List[Dict]) -> None:
        allowed_ids = {int(e["exercise_id"]) for e in allowed_exercises}
        # Backend (PersonalizationResolver) đã quyết số ngày nghỉ đúng theo tầng:
        # người mới/lớn tuổi → full-body nhiều ngày nghỉ; trung cấp+ 6 buổi → 1 nghỉ (hợp lệ).
        # Chỉ cần sàn an toàn ≥1 ngày nghỉ.
        if template.weekly_pattern.count("rest") < 1:
            raise ValueError("weekly_pattern must include at least 1 rest day")

        for s in template.weekly_pattern:
            if s != "rest" and s not in self.MIN_POOL_SIZE:
                raise ValueError(f"Unsupported session type: {s}")

        from collections import Counter
        type_frequency = Counter(s for s in template.weekly_pattern if s != "rest")
        for session_type, freq in type_frequency.items():
            base_min = self.MIN_POOL_SIZE.get(session_type, 0)
            # Pool dùng lại qua các buổi cùng loại → cần đa dạng (base_min), thêm chút khi tập 2×/tuần
            # (Session A/B). KHÔNG nhân theo số buổi (split lặp lại không cần N× số bài.)
            min_count = base_min if freq <= 1 else base_min + 2
            ids = template.exercise_pool.get(session_type, [])
            if min_count > 0 and len(ids) < min_count:
                raise ValueError(
                    f"exercise_pool.{session_type} needs ≥{min_count} IDs (variety for {freq}×/week)"
                )
            unknown = [i for i in ids if int(i) not in allowed_ids]
            if unknown:
                raise ValueError(f"exercise_pool.{session_type} has unknown IDs: {unknown}")

        if "full_body" in type_frequency:
            by_id = {int(e["exercise_id"]): e for e in allowed_exercises}
            full_ids = template.exercise_pool.get("full_body", [])
            missing = [
                cat for cat in ["push", "pull", "lower", "core"]
                if not any(self._catalog_matches_category(by_id[int(i)], cat) for i in full_ids if int(i) in by_id)
            ]
            if missing:
                raise ValueError(f"exercise_pool.full_body missing: {missing}")

    def _build_prompt_exercise_catalog(self, allowed_exercises: List[Dict]) -> List[Dict]:
        """
        Pick a balanced set of exercises ≤ MAX_CATALOG_SIZE.

        CÂN BẰNG theo NHÓM CƠ + DỤNG CỤ (round-robin) thay vì lấy theo thứ tự ID.
        Tránh việc bài ID thấp (bodyweight/dumbbell cũ) lấp hết slot khiến bài gym
        (barbell/machine/cable) không bao giờ tới AI → kế hoạch toàn dumbbell.
        """
        categories = ["push", "pull", "lower", "core", "cardio"]

        # Phân bài vào bucket theo nhóm cơ (mỗi bài gán vào category khớp đầu tiên)
        buckets = {c: [] for c in categories}
        other = []
        for ex in allowed_exercises:
            placed = False
            for c in categories:
                if self._catalog_matches_category(ex, c):
                    buckets[c].append(ex)
                    placed = True
                    break
            if not placed:
                other.append(ex)

        # Trong mỗi bucket: xen kẽ DỤNG CỤ để không bị toàn dumbbell lên đầu
        for c in categories:
            buckets[c] = self._diversify_by_equipment(buckets[c])

        selected = []
        seen_ids = set()
        idx = {c: 0 for c in categories}

        # Round-robin qua các nhóm cơ → lấy đều mỗi nhóm, đa dạng dụng cụ
        progressed = True
        while len(selected) < self.MAX_CATALOG_SIZE and progressed:
            progressed = False
            for c in categories:
                while idx[c] < len(buckets[c]):
                    ex = buckets[c][idx[c]]
                    idx[c] += 1
                    eid = int(ex["exercise_id"])
                    if eid not in seen_ids:
                        selected.append(ex)
                        seen_ids.add(eid)
                        progressed = True
                        break
                if len(selected) >= self.MAX_CATALOG_SIZE:
                    break

        # Lấp nốt từ 'other' nếu còn slot
        for ex in other:
            if len(selected) >= self.MAX_CATALOG_SIZE:
                break
            eid = int(ex["exercise_id"])
            if eid not in seen_ids:
                selected.append(ex)
                seen_ids.add(eid)

        # Compact representation — drop fields the AI doesn't need
        return [
            {
                "id": int(e["exercise_id"]),
                "n": e.get("exercise_name", ""),           # name
                "t": e.get("exercise_type", ""),           # type
                "m": e.get("primary_muscle", ""),          # muscle
                "eq": e.get("required_equipment", "BW"),   # equipment
                "ft": e.get("force_type", ""),             # force type
                "cat": e.get("exercise_category", ""),     # compound/isolation/mobility
                "met": e.get("met_value", None),           # calorie calculation metadata
            }
            for e in selected
        ]

    def _diversify_by_equipment(self, exercises: List[Dict]) -> List[Dict]:
        """Xen kẽ bài theo dụng cụ để mỗi loại (dumbbell/barbell/machine/cable/bodyweight)
        đều có cơ hội được chọn, thay vì dồn một loại lên đầu."""
        if not exercises:
            return exercises
        by_eq: Dict[str, List[Dict]] = {}
        order: List[str] = []
        for ex in exercises:
            eq = str(ex.get("required_equipment", "BODYWEIGHT")).upper()
            if eq not in by_eq:
                by_eq[eq] = []
                order.append(eq)
            by_eq[eq].append(ex)
        # Round-robin qua các loại dụng cụ
        result: List[Dict] = []
        i = 0
        while len(result) < len(exercises):
            eq = order[i % len(order)]
            if by_eq[eq]:
                result.append(by_eq[eq].pop(0))
            i += 1
            if all(len(v) == 0 for v in by_eq.values()):
                break
        return result

    def _catalog_matches_category(self, catalog_exercise: Dict, category: str) -> bool:
        force_type = str(catalog_exercise.get("force_type", "")).lower()
        force_matches = {
            "push": "push",
            "pull": "pull",
            "lower": "legs",
            "core": "core",
            "cardio": "cardio",
            "upper": None,
        }
        expected_force = force_matches.get(category)
        if expected_force and force_type == expected_force:
            return True
        if category == "upper" and force_type in {"push", "pull"}:
            return True

        text = " ".join([
            str(catalog_exercise.get("exercise_name", "")),
            str(catalog_exercise.get("exercise_type", "")),
            str(catalog_exercise.get("movement_pattern", "")),
            str(catalog_exercise.get("primary_muscle", "")),
            str(catalog_exercise.get("secondary_muscles", "")),
            str(catalog_exercise.get("force_type", "")),
            str(catalog_exercise.get("exercise_category", "")),
        ]).lower()
        category_terms = {
            "push":   ["push", "press", "chest", "tricep"],
            "pull":   ["pull", "row", "back", "lat", "bicep"],
            "lower":  ["leg", "quad", "hamstring", "glute", "calf", "squat", "hinge", "lunge", "bridge", "deadlift"],
            "core":   ["core", "abs", "abdominal", "plank", "crunch", "dead bug"],
            "upper":  ["push", "pull", "press", "row", "chest", "back", "shoulder", "tricep", "bicep", "lat"],
            "cardio": ["cardio", "run", "bike", "climber", "burpee", "jump"],
        }
        return any(term in text for term in category_terms.get(category, []))

    def _parse_json_response(self, text: str) -> Dict:
        try:
            return json.loads(text)
        except Exception:
            for delimiter in ["```json", "```"]:
                if delimiter in text:
                    return json.loads(text.split(delimiter)[1].split("```")[0].strip())
            raise ValueError("Could not parse JSON from AI")
