"""
Integrated Planner - Coordinates Meal and Workout plans
Adjusts macros based on workout intensity
"""
import os
import json
from typing import List, Dict
import google.generativeai as genai
from ..schemas.nutrition import UserProfile, NutritionPlanRequest
from ..schemas.workout import WorkoutSession, SessionType
from ..schemas.full_plan import FullPlanRequest, FullPlanResponse, IntegratedDailyPlan
from ..core.analyzer import BodyAnalyzer
from .planner import AIPlanner
from .workout_planner import WorkoutPlanner


class IntegratedPlanner:
    """
    Coordinates meal and workout planning with macro synchronization
    """
    
    def __init__(self):
        """Initialize component planners"""
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY environment variable not set")
        
        genai.configure(api_key=api_key)
        
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
            preferences=request.preferences
        )
        
        # Temporarily override target calculation with adjusted values
        daily_plans = []
        for day_num in range(1, request.days + 1):
            day_workout = workout_sessions[day_num - 1] if day_num <= len(workout_sessions) else None
            
            # Get adjusted targets for this day
            target_calories = adjusted_targets.get(day_num, {}).get("calories")
            target_protein = adjusted_targets.get(day_num, {}).get("protein")
            
            # Generate single day meal plan with adjusted targets
            context = self.meal_planner._prepare_user_context(meal_plan_request)
            context["target_calories"] = target_calories
            context["macro_targets"]["protein"] = target_protein
            
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
        """Generate workout sessions for the week"""
        # Use workout planner to generate sessions
        # For now, create template based on fitness level
        sessions = []
        
        split = self._get_workout_split(request.user_profile.fitness_level.value)
        
        for day_num in range(1, request.days + 1):
            session_type = split[(day_num - 1) % len(split)]
            
            if session_type == SessionType.REST:
                session = WorkoutSession(
                    day=f"Day {day_num}",
                    day_number=day_num,
                    session_type=SessionType.REST,
                    is_rest_day=True,
                    duration_minutes=0,
                    muscle_groups_targeted=[],
                    estimated_calories_burned=0,
                    warmup=[],
                    exercises=[],
                    cardio=None,
                    cooldown=[],
                    notes=["Ngày nghỉ ngơi phục hồi"]
                )
            else:
                session = WorkoutSession(
                    day=f"Day {day_num}",
                    day_number=day_num,
                    session_type=session_type,
                    is_rest_day=False,
                    duration_minutes=request.workout_duration_minutes,
                    muscle_groups_targeted=self._get_muscle_groups(session_type),
                    estimated_calories_burned=self._estimate_calories_burned(
                        session_type, 
                        request.workout_duration_minutes,
                        request.workout_intensity
                    ),
                    warmup=self._get_warmup_routine(),
                    exercises=self._get_exercises_template(session_type),
                    cardio=None,
                    cooldown=self._get_cooldown_routine(),
                    notes=[f"Intensity: {request.workout_intensity}"]
                )
            
            sessions.append(session)
        
        return sessions
    
    def _calculate_adjusted_targets(
        self, 
        user_profile: UserProfile,
        workout_sessions: List[WorkoutSession]
    ) -> Dict[int, Dict]:
        """
        Calculate adjusted calorie and protein targets based on workout calories burned
        """
        # Get base targets
        analysis = BodyAnalyzer.analyze_user(user_profile)
        base_calories = analysis["user_summary"]["target_calories"]
        base_protein = analysis["macro_targets"]["protein"]
        
        adjusted = {}
        
        for day_num, session in enumerate(workout_sessions, 1):
            calories_burned = session.estimated_calories_burned
            
            # On workout days, add calories burned to target
            # On rest days, reduce slightly
            if session.is_rest_day:
                adjusted_calories = int(base_calories * 0.9)  # 10% less on rest
                adjusted_protein = base_protein * 0.9
                reason = "Rest day - reduced intake"
            else:
                adjusted_calories = int(base_calories + calories_burned)
                # Extra protein on workout days for recovery
                adjusted_protein = base_protein * 1.15
                reason = f"Workout day +{calories_burned}kcal burned"
            
            adjusted[day_num] = {
                "calories": adjusted_calories,
                "protein": round(adjusted_protein, 1),
                "reason": reason
            }
        
        return adjusted
    
    def _get_adjustment_reason(self, workout: WorkoutSession) -> str:
        """Get explanation for macro adjustment"""
        if workout.is_rest_day:
            return "Rest day - reduced 10% calories"
        else:
            return f"Workout day +{workout.estimated_calories_burned}kcal, +15% protein"
    
    def _get_workout_split(self, fitness_level: str) -> List[SessionType]:
        """Get workout split based on fitness level"""
        splits = {
            "beginner":     [SessionType.FULL_BODY, SessionType.REST, SessionType.FULL_BODY, SessionType.REST, SessionType.FULL_BODY, SessionType.REST, SessionType.REST],
            "intermediate": [SessionType.PUSH, SessionType.PULL, SessionType.LEGS, SessionType.REST, SessionType.PUSH, SessionType.PULL, SessionType.REST],
            "advanced":     [SessionType.PUSH, SessionType.PULL, SessionType.LEGS, SessionType.REST, SessionType.PUSH, SessionType.PULL, SessionType.LEGS],
        }
        return splits.get(fitness_level, splits["intermediate"])
    
    def _get_muscle_groups(self, session_type: SessionType) -> List[str]:
        """Get muscle groups targeted by session type"""
        groups = {
            SessionType.PUSH: ["Ngực", "Vai trước", "Tay sau"],
            SessionType.PULL: ["Lưng", "Vai sau", "Tay sau"],
            SessionType.LEGS: ["Đùi trước", "Đùi sau", "Mông", "Bắp chân"],
            SessionType.FULL_BODY: ["Ngực", "Lưng", "Chân", "Vai"],
            SessionType.UPPER: ["Ngực", "Lưng", "Vai", "Tay"],
            SessionType.LOWER: ["Đùi", "Mông", "Bắp chân"],
            SessionType.CARDIO: ["Toàn thân"],
        }
        return groups.get(session_type, [])
    
    def _estimate_calories_burned(self, session_type: SessionType, duration: int, intensity: str) -> int:
        """Estimate calories burned based on workout"""
        base_cal_per_minute = {
            SessionType.PUSH: 8,
            SessionType.PULL: 9,
            SessionType.LEGS: 10,
            SessionType.FULL_BODY: 9,
            SessionType.CARDIO: 12,
        }.get(session_type, 8)
        
        intensity_multiplier = {
            "low": 0.8,
            "moderate": 1.0,
            "high": 1.3
        }.get(intensity, 1.0)
        
        return int(base_cal_per_minute * duration * intensity_multiplier)
    
    def _get_warmup_routine(self) -> List[str]:
        return ["Chạy bộ nhẹ 5 phút", "Xoay khớp vai 30 giây", "Xoay khớp hông 30 giây"]
    
    def _get_cooldown_routine(self) -> List[str]:
        return ["Giãn cơ toàn thân 5 phút", "Hít thở sâu 1 phút"]
    
    def _get_exercises_template(self, session_type: SessionType) -> List:
        """Get template exercises - in real implementation, this would come from AI"""
        from ..schemas.workout import Exercise, CardioBlock
        
        exercises = {
            SessionType.PUSH: [
                Exercise(name="Bench Press", muscle_group="Ngực", sets=3, reps="8-12", rest_seconds=90, equipment="Tạ đôi", notes="Hạ chậm 2 giây"),
                Exercise(name="Overhead Press", muscle_group="Vai", sets=3, reps="8-12", rest_seconds=90, equipment="Tạ đôi", notes="Giữ lõi"),
                Exercise(name="Triceps Pushdown", muscle_group="Tay sau", sets=3, reps="12-15", rest_seconds=60, equipment="Máy cáp", notes="Căng cơ ở vị trí dưới cùng"),
            ],
            SessionType.PULL: [
                Exercise(name="Pull-ups", muscle_group="Lưng", sets=3, reps="AMRAP", rest_seconds=120, equipment="Xà đơn", notes="Full range of motion"),
                Exercise(name="Barbell Row", muscle_group="Lưng", sets=3, reps="8-12", rest_seconds=90, equipment="Tạ đòn", notes="Giữ lưng thẳng"),
                Exercise(name="Bicep Curls", muscle_group="Tay trước", sets=3, reps="12-15", rest_seconds=60, equipment="Tạ đơn", notes="Không đung người"),
            ],
            SessionType.LEGS: [
                Exercise(name="Squats", muscle_group="Đùi", sets=3, reps="8-12", rest_seconds=120, equipment="Tạ đòn", notes="Parallel hoặc sâu hơn"),
                Exercise(name="Romanian Deadlift", muscle_group="Đùi sau", sets=3, reps="8-12", rest_seconds=90, equipment="Tạ đòn", notes="Giữ lưng thẳng"),
                Exercise(name="Calf Raises", muscle_group="Bắp chân", sets=4, reps="15-20", rest_seconds=45, equipment="Tạ đơn", notes="Full range"),
            ],
            SessionType.FULL_BODY: [
                Exercise(name="Squats", muscle_group="Đùi", sets=3, reps="10-12", rest_seconds=90, equipment="Tạ đòn", notes=""),
                Exercise(name="Bench Press", muscle_group="Ngực", sets=3, reps="10-12", rest_seconds=90, equipment="Tạ đôi", notes=""),
                Exercise(name="Bent-over Row", muscle_group="Lưng", sets=3, reps="10-12", rest_seconds=90, equipment="Tạ đòn", notes=""),
            ],
        }
        
        return exercises.get(session_type, [])
    
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
            "💪 Tăng protein 15% vào ngày tập để phục hồi cơ bắp",
            "🥗 Giảm 10% calories vào ngày nghỉ để tránh dư thừa",
            "⏰ Ăn bữa chính 2-3 tiếng trước khi tập",
            "💧 Uống đủ nước trong và sau buổi tập"
        ]
        
        # Add goal-specific recommendations
        if request.user_profile.goal.value == "muscle_gain":
            recommendations.append("🏋️ Tập trung vào progressive overload mỗi tuần")
        elif request.user_profile.goal.value == "weight_loss":
            recommendations.append("🔥 Tăng cardio vào ngày nghỉ để tăng đốt mỡ")
        
        return recommendations
