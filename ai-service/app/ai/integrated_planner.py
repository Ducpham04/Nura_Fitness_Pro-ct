"""
Integrated Planner - Coordinates Meal and Workout plans
Adjusts macros based on workout intensity
"""
import os
import json
import re
from typing import List, Dict
from ..schemas.nutrition import UserProfile, NutritionPlanRequest
from ..schemas.workout import WorkoutSession, SessionType
from ..schemas.full_plan import FullPlanRequest, FullPlanResponse, IntegratedDailyPlan
from ..core.analyzer import BodyAnalyzer
from .planner import AIPlanner
from .workout_planner import WorkoutPlanner


# Bài giữ tư thế (đo bằng GIÂY, không đếm rep) — mirror ExerciseFormatUtil.java.
# Word-boundary để "hanging leg raise" không dính "hang"; loại biến thể động
# (plank jack, plank shoulder tap...) vì chúng vẫn đếm rep.
_TIME_BASED_RE = re.compile(r"\b(plank|wall sit|hold|l-sit|isometric|dead hang|superman)\b", re.I)
_DYNAMIC_VARIANT_RE = re.compile(r"\b(tap|jack|up-down|up down|walk|twist|rotation|reach|row|knee|crunch|to push)\b", re.I)


def _is_time_based(name: str) -> bool:
    if not name:
        return False
    return bool(_TIME_BASED_RE.search(name)) and not _DYNAMIC_VARIANT_RE.search(name)


class IntegratedPlanner:
    """
    Coordinates meal and workout planning with macro synchronization
    """
    
    def __init__(self):
        """Initialize component planners"""
        from ..core.llm import has_provider
        if not has_provider():
            raise ValueError("Chưa cấu hình provider LLM. Đặt GROQ_API_KEY (hoặc LLM_API_KEY).")

        self.meal_planner = AIPlanner()
        self.workout_planner = WorkoutPlanner()
    
    def generate_full_plan(self, request: FullPlanRequest) -> FullPlanResponse:
        """
        Generate integrated meal + workout plan
        
        Process:
        1. Generate workout plan first (to know calorie burn per day)
        2. Adjust meal targets based on workout calories
        3. Generate meal plan with adjusted targets
        4. Combine into integrated daily plans
        """
        # Step 1: Generate workout plan
        workout_sessions = self._generate_workout_plan(request)
        
        # Step 2: Calculate adjusted calorie targets per day
        adjusted_targets = self._calculate_adjusted_targets(
            request.user_profile,
            workout_sessions
        )
        
        # Step 3: Generate meal plan with adjusted targets
        meal_plan_request = NutritionPlanRequest(
            user_profile=request.user_profile,
            days=request.days,
            preferences=request.preferences,
            inventory=request.inventory if hasattr(request, 'inventory') else []
        )
        
        # Temporarily override target calculation with adjusted values
        daily_plans = []
        for day_num in range(1, request.days + 1):
            day_workout = workout_sessions[day_num - 1] if day_num <= len(workout_sessions) else None

            # Get adjusted targets for this day
            day_targets   = adjusted_targets.get(day_num, {})
            target_calories = day_targets.get("calories")
            target_protein  = day_targets.get("protein")
            carb_modifier   = day_targets.get("carb_modifier", 1.0)

            # Generate context and apply carb cycling — ACTUALLY modify the macro split
            context = self.meal_planner._prepare_user_context(meal_plan_request)
            context["target_calories"] = target_calories
            context["macro_targets"]["protein"] = target_protein

            # Carb cycling: shift carbs ↑ on training days, ↓ on rest days
            # Compensate with fat to keep total calories constant (ISSN 2023)
            base_carb = context["macro_targets"].get("carb", 0)
            base_fat  = context["macro_targets"].get("fat", 0)
            adjusted_carb = round(base_carb * carb_modifier, 1)
            # Fat absorbs the calorie difference to maintain total
            carb_kcal_delta = (adjusted_carb - base_carb) * 4
            adjusted_fat = round(base_fat - carb_kcal_delta / 9, 1)
            adjusted_fat = max(adjusted_fat, round(target_calories * 0.20 / 9, 1))  # floor 20% of kcal
            context["macro_targets"]["carb"] = adjusted_carb
            context["macro_targets"]["fat"]  = adjusted_fat
            context["carb_cycling_note"] = day_targets.get("reason", "")

            day_meal_plan = self.meal_planner._generate_single_day(
                day_num=day_num,
                context=context,
                previous_days=[dp.meal_plan for dp in daily_plans],
                target_calories=target_calories,
                target_protein=target_protein,
                daily_budget=request.user_profile.budget_per_day
            )
            
            # Create integrated daily plan
            integrated_day = IntegratedDailyPlan(
                day=f"Day {day_num}",
                day_number=day_num,
                meal_plan=day_meal_plan,
                workout_plan=day_workout,
                adjusted_calories=target_calories,
                adjusted_protein=target_protein,
                adjustment_reason=self._get_adjustment_reason(day_workout)
            )
            
            daily_plans.append(integrated_day)
        
        # Step 4: Generate weekly summary
        weekly_summary = self._generate_weekly_summary(daily_plans, request.user_profile)
        
        # Step 5: Generate recommendations
        recommendations = self._generate_recommendations(daily_plans, request)
        
        return FullPlanResponse(
            plan_id=f"full_plan_{request.user_profile.goal.value}_{id(request)}",
            version=1,
            user_profile=request.user_profile,
            daily_plans=daily_plans,
            weekly_summary=weekly_summary,
            recommendations=recommendations
        )
    
    def _generate_workout_plan(self, request: FullPlanRequest) -> List[WorkoutSession]:
        """
        Generate workout sessions from the template-only WorkoutPlanner.
        Main production workout expansion lives in Spring Boot; this adapter keeps
        the legacy integrated meal+workout endpoint functional.
        """
        template = self.workout_planner.generate_template(
            user_profile=request.user_profile,
            days=request.days,
            available_equipment=request.available_equipment,
            workout_intensity=request.workout_intensity,
            duration_minutes=request.workout_duration_minutes,
            progression_phase=request.progression_phase,
            preferences=request.preferences,
            allowed_exercises=[item.model_dump() for item in request.allowed_exercises],
            current_injuries=request.current_injuries or ""
        )

        catalog = {item.exercise_id: item for item in request.allowed_exercises}
        sessions = []
        for day in range(1, request.days + 1):
            week_day = (day - 1) % 7
            session_type = template.weekly_pattern[week_day]
            if session_type in {"rest", "rest_day"}:
                sessions.append(WorkoutSession(
                    day=f"Day {day}",
                    day_number=day,
                    session_type=SessionType.REST_DAY,
                    is_rest_day=True,
                    duration_minutes=0,
                    muscle_groups_targeted=[],
                    estimated_calories_burned=0,
                    warmup=[],
                    exercises=[],
                    cardio=None,
                    cooldown=["Mobility work", "Light stretching"],
                    notes=["Recovery day"]
                ))
                continue

            exercise_ids = template.exercise_pool.get(session_type, [])
            exercises = []
            for exercise_id in exercise_ids:
                item = catalog.get(exercise_id)
                if item is None:
                    continue
                time_based = _is_time_based(item.exercise_name)
                # Bài giữ tư thế: reps = SỐ GIÂY (default_reps của master data đã là giây),
                # tempo 0-0-0 đánh dấu isometric. Bài thường: rep theo template.
                hold_seconds = max(15, min(120, item.default_reps or 30))
                exercises.append(Exercise(
                    exercise_id=item.exercise_id,
                    name=item.exercise_name,
                    muscle_group=item.primary_muscle or "Full Body",
                    sets=template.base_sets,
                    reps=str(hold_seconds) if time_based else str(template.base_reps),
                    rest_seconds=template.base_rest_seconds,
                    equipment=item.required_equipment,
                    tempo="0-0-0" if time_based else "3-0-1",
                    notes="Giữ tư thế đủ số giây mỗi hiệp." if time_based
                          else "Generated from ProgramTemplate for integrated planning."
                ))

            workout_session_type = SessionType.FULL_BODY
            if session_type in {"upper_push", "upper_pull"}:
                workout_session_type = SessionType.UPPER_BODY
            elif session_type == "lower":
                workout_session_type = SessionType.LOWER_BODY
            elif session_type == "cardio_core":
                workout_session_type = SessionType.CARDIO

            calories_burned = self._estimate_calories_burned(
                workout_session_type,
                request.workout_duration_minutes,
                request.workout_intensity,
            )

            sessions.append(WorkoutSession(
                day=f"Day {day}",
                day_number=day,
                session_type=workout_session_type,
                is_rest_day=False,
                duration_minutes=request.workout_duration_minutes,
                muscle_groups_targeted=[session_type],
                estimated_calories_burned=calories_burned,
                warmup=["Shoulder circles", "Hip circles", "Bodyweight squat"],
                exercises=exercises,
                cardio=None,
                cooldown=["Full body stretching"],
                notes=["Generated from ProgramTemplate"]
            ))

        return sessions
    
    def _calculate_adjusted_targets(
        self,
        user_profile: UserProfile,
        workout_sessions: List[WorkoutSession]
    ) -> Dict[int, Dict]:
        """
        Calculate adjusted calorie and macro targets per day.

        Science basis (NSCA/ISSN):
        - Workout days: calories = TDEE + exercise_kcal_burned
        - Rest days:    calories = TDEE (no addition, no subtraction)
        - Protein:      CONSTANT across all days — Muscle Protein Synthesis (MPS)
                        peaks 24-48h AFTER exercise (i.e. during rest days).
                        Cutting protein on rest days reduces recovery quality.
        - Carbs:        Higher on workout days (fuel), lower on rest days.
                        Carbs are the primary energy lever, not protein.
        """
        analysis = BodyAnalyzer.analyze_user(user_profile)
        base_calories = analysis["user_summary"]["target_calories"]
        base_protein = analysis["macro_targets"]["protein"]

        adjusted = {}

        for day_num, session in enumerate(workout_sessions, 1):
            calories_burned = session.estimated_calories_burned

            if session.is_rest_day:
                # Rest day: TDEE only — no exercise calories added
                # Carbs reduced ~15% (less fuel needed), protein unchanged
                adjusted_calories = base_calories
                adjusted_protein = base_protein          # protein UNCHANGED
                carb_modifier = 0.85                     # 15% fewer carbs
                reason = "Rest day — TDEE only, protein maintained for MPS, carbs reduced"
            else:
                # Workout day: TDEE + exercise burn
                # Carbs increased ~15% to fuel performance and replenish glycogen
                adjusted_calories = int(base_calories + calories_burned)
                adjusted_protein = base_protein          # protein UNCHANGED
                carb_modifier = 1.15                     # 15% more carbs
                reason = f"Workout day — +{calories_burned} kcal from exercise, carbs increased for fuel"

            adjusted[day_num] = {
                "calories": adjusted_calories,
                "protein": round(adjusted_protein, 1),
                "carb_modifier": carb_modifier,
                "reason": reason,
            }

        return adjusted
    
    def _get_adjustment_reason(self, workout: WorkoutSession) -> str:
        if workout.is_rest_day:
            return "Rest day — TDEE only, protein maintained, carbs -15%"
        return f"Workout day — +{workout.estimated_calories_burned} kcal exercise, carbs +15%, protein unchanged"
    
    def _estimate_calories_burned(self, session_type: SessionType, duration: int, intensity: str) -> int:
        """
        Estimate calories burned per workout session.
        Uses kcal/min approximations derived from MET values (Compendium of Physical Activities 2024).
        The Java backend uses GoalMapper.calcCaloriesPerSession() with the same MET approach.
        """
        base_kcal_per_min = {
            SessionType.UPPER_BODY: 4.5,
            SessionType.LOWER_BODY: 5.5,
            SessionType.FULL_BODY:  5.0,
            SessionType.CARDIO:     7.0,
        }.get(session_type, 5.0)

        intensity_multiplier = {"low": 0.8, "moderate": 1.0, "high": 1.3}.get(intensity, 1.0)
        return int(base_kcal_per_min * duration * intensity_multiplier)
    
    def _generate_weekly_summary(self, daily_plans: List[IntegratedDailyPlan], user_profile: UserProfile) -> Dict:
        """Generate weekly summary of meal + workout plan"""
        total_meal_calories = sum(d.meal_plan.total_calories for d in daily_plans)
        total_workout_calories = sum(d.workout_plan.estimated_calories_burned for d in daily_plans if d.workout_plan)
        total_protein = sum(d.meal_plan.total_protein for d in daily_plans)
        total_cost = sum(d.meal_plan.estimated_cost for d in daily_plans)
        
        workout_days = sum(1 for d in daily_plans if d.workout_plan and not d.workout_plan.is_rest_day)
        rest_days = len(daily_plans) - workout_days
        
        return {
            "total_meal_calories": total_meal_calories,
            "total_workout_calories_burned": total_workout_calories,
            "net_calories": total_meal_calories - total_workout_calories,
            "total_protein": round(total_protein, 1),
            "avg_daily_protein": round(total_protein / len(daily_plans), 1),
            "total_cost": total_cost,
            "workout_days": workout_days,
            "rest_days": rest_days,
            "workout_intensity_distribution": {
                "push": sum(1 for d in daily_plans if d.workout_plan and d.workout_plan.session_type == SessionType.PUSH),
                "pull": sum(1 for d in daily_plans if d.workout_plan and d.workout_plan.session_type == SessionType.PULL),
                "legs": sum(1 for d in daily_plans if d.workout_plan and d.workout_plan.session_type == SessionType.LEGS),
            }
        }
    
    def _generate_recommendations(self, daily_plans: List[IntegratedDailyPlan], request: FullPlanRequest) -> List[str]:
        """Generate recommendations based on integrated plan"""
        recommendations = [
            "💪 Protein giữ nguyên mỗi ngày — MPS đạt đỉnh 24-48h sau tập (tức ngày nghỉ)",
            "🍚 Tăng carbs ngày tập để cung cấp năng lượng, giảm carbs ngày nghỉ",
            "⏰ Ăn bữa chính 2-3 tiếng trước khi tập, bổ sung protein 30 phút sau tập",
            "💧 Uống 500ml nước trước tập, 200ml mỗi 15-20 phút trong khi tập",
        ]
        
        # Add goal-specific recommendations
        if request.user_profile.goal.value == "muscle_gain":
            recommendations.append("🏋️ Tập trung vào progressive overload mỗi tuần")
        elif request.user_profile.goal.value == "weight_loss":
            recommendations.append("🔥 Tăng cardio vào ngày nghỉ để tăng đốt mỡ")
        
        return recommendations
