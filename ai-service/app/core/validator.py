"""
Post-generation validation for meal plans
Validates calorie, protein, and budget constraints
"""
from typing import Dict, List, Optional
from ..schemas.nutrition import DailyPlan, UserProfile


class PlanValidator:
    """
    Validates generated meal plans against constraints
    Auto-retries if validation fails
    """
    
    CALORIE_TOLERANCE = 0.10  # ±10%
    PROTEIN_TOLERANCE = 0.15  # ±15%
    
    @staticmethod
    def validate_daily_plan(
        daily_plan: DailyPlan,
        target_calories: int,
        target_protein: float,
        budget: int
    ) -> tuple[bool, List[str]]:
        """
        Validate a single day plan against targets
        
        Returns:
            (is_valid, list_of_errors)
        """
        errors = []
        
        # Check calories
        actual_calories = daily_plan.total_calories
        cal_lower = target_calories * (1 - PlanValidator.CALORIE_TOLERANCE)
        cal_upper = target_calories * (1 + PlanValidator.CALORIE_TOLERANCE)
        
        if actual_calories < cal_lower:
            errors.append(
                f"Calories quá thấp: {actual_calories} (target: {target_calories}, "
                f"min: {int(cal_lower)})"
            )
        elif actual_calories > cal_upper:
            errors.append(
                f"Calories quá cao: {actual_calories} (target: {target_calories}, "
                f"max: {int(cal_upper)})"
            )
        
        # Check protein
        actual_protein = daily_plan.total_protein
        protein_lower = target_protein * (1 - PlanValidator.PROTEIN_TOLERANCE)
        
        if actual_protein < protein_lower:
            errors.append(
                f"Protein quá thấp: {actual_protein}g (target: {target_protein}g, "
                f"min: {int(protein_lower)}g)"
            )
        
        # Check budget
        actual_cost = daily_plan.estimated_cost
        if actual_cost > budget:
            errors.append(
                f"Vượt ngân sách: {actual_cost:,}đ (budget: {budget:,}đ)"
            )
        
        # Check meal variety (no duplicate meal names)
        meal_names = [meal.meal_type.value for meal in daily_plan.meals]
        if len(meal_names) != len(set(meal_names)):
            errors.append("Có bữa bị trùng tên")
        
        # Check minimum meals (at least 3: breakfast, lunch, dinner)
        if len(daily_plan.meals) < 3:
            errors.append(f"Quá ít bữa: chỉ {len(daily_plan.meals)} bữa (tối thiểu 3)")
        
        return (len(errors) == 0), errors
    
    @staticmethod
    def validate_weekly_plan(
        daily_plans: List[DailyPlan],
        target_calories: int,
        target_protein: float,
        weekly_budget: int
    ) -> tuple[bool, Dict[str, any]]:
        """
        Validate entire weekly plan
        
        Returns:
            (is_valid, validation_report)
        """
        report = {
            "total_days": len(daily_plans),
            "total_calories": sum(d.total_calories for d in daily_plans),
            "total_protein": sum(d.total_protein for d in daily_plans),
            "total_cost": sum(d.estimated_cost for d in daily_plans),
            "daily_errors": [],
            "weekly_errors": [],
            "food_diversity_score": 0.0
        }
        
        # Validate each day
        for day_plan in daily_plans:
            daily_budget = weekly_budget / len(daily_plans)
            is_valid, errors = PlanValidator.validate_daily_plan(
                day_plan, target_calories, target_protein, daily_budget
            )
            
            if not is_valid:
                report["daily_errors"].append({
                    "day": day_plan.day,
                    "errors": errors
                })
        
        # Weekly totals validation
        expected_weekly_calories = target_calories * len(daily_plans)
        actual_weekly_calories = report["total_calories"]
        
        cal_diff_pct = abs(actual_weekly_calories - expected_weekly_calories) / expected_weekly_calories
        if cal_diff_pct > PlanValidator.CALORIE_TOLERANCE:
            report["weekly_errors"].append(
                f"Tổng calories tuần sai: {actual_weekly_calories} "
                f"(target: {expected_weekly_calories}, lệch: {cal_diff_pct*100:.1f}%)"
            )
        
        # Budget check
        if report["total_cost"] > weekly_budget:
            report["weekly_errors"].append(
                f"Tổng chi phí tuần vượt: {report['total_cost']:,}đ "
                f"(budget: {weekly_budget:,}đ)"
            )
        
        # Calculate food diversity score
        all_foods = []
        for day in daily_plans:
            for meal in day.meals:
                for item in meal.items:
                    all_foods.append(item.name.lower())
        
        unique_foods = len(set(all_foods))
        total_items = len(all_foods)
        if total_items > 0:
            report["food_diversity_score"] = unique_foods / total_items
        
        is_valid = (len(report["daily_errors"]) == 0 and len(report["weekly_errors"]) == 0)
        
        return is_valid, report
    
    @staticmethod
    def generate_retry_prompt(
        validation_errors: List[str],
        day_context: Dict,
        attempt: int
    ) -> str:
        """
        Generate retry prompt with specific constraints based on validation errors
        """
        retry_instruction = f"""
RETRY ATTEMPT {attempt}

The previous plan had the following issues:
{chr(10).join(f"- {err}" for err in validation_errors)}

PLEASE FIX THESE ISSUES:
"""
        
        for error in validation_errors:
            if "Calories quá thấp" in error:
                retry_instruction += "\n- INCREASE portion sizes or add calorie-dense foods"
            elif "Calories quá cao" in error:
                retry_instruction += "\n- REDUCE portion sizes or use lower-calorie alternatives"
            elif "Protein quá thấp" in error:
                retry_instruction += "\n- ADD more protein sources (eggs, chicken, tofu, fish)"
            elif "Vượt ngân sách" in error:
                retry_instruction += "\n- USE cheaper ingredients (eggs, seasonal vegetables, bulk chicken)"
            elif "trùng tên" in error or "Quá ít bữa" in error:
                retry_instruction += "\n- ENSURE all 4 meal types: breakfast, lunch, dinner, snack"
        
        retry_instruction += f"""

USER CONTEXT (unchanged):
{day_context}

Generate a NEW plan that addresses all the issues above.
Return ONLY valid JSON.
"""
        
        return retry_instruction
