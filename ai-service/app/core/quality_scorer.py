"""
Quality Scorer - Evaluates generated plans for quality metrics
Scores diversity, protein sufficiency, recovery adequacy
"""
from typing import Dict, List, Optional
from collections import Counter
from ..schemas.nutrition import DailyPlan, NutritionPlanResponse
from ..schemas.workout import WorkoutSession, SessionType


class QualityScorer:
    """
    Scores meal and workout plans on various quality metrics
    """
    
    @staticmethod
    def score_meal_diversity(daily_plans: List[DailyPlan]) -> Dict:
        """
        Score food diversity across the plan
        
        Metrics:
        - Food variety (unique foods / total food mentions)
        - Meal type variety (different meal types used)
        - Cuisine diversity (if detectable)
        """
        all_foods = []
        meal_types_used = set()
        
        for day_plan in daily_plans:
            for meal in day_plan.meals:
                meal_types_used.add(meal.meal_type.value)
                for item in meal.items:
                    all_foods.append(item.name.lower())
        
        total_mentions = len(all_foods)
        unique_foods = len(set(all_foods))
        
        # Calculate diversity score (0-1)
        diversity_score = unique_foods / total_mentions if total_mentions > 0 else 0
        
        # Check for excessive repetition
        food_counts = Counter(all_foods)
        overused_foods = [food for food, count in food_counts.items() if count > len(daily_plans)]
        
        return {
            "diversity_score": round(diversity_score, 2),
            "unique_foods": unique_foods,
            "total_food_mentions": total_mentions,
            "meal_types_used": len(meal_types_used),
            "overused_foods": overused_foods,
            "rating": QualityScorer._get_diversity_rating(diversity_score),
            "recommendations": QualityScorer._get_diversity_recommendations(diversity_score, overused_foods)
        }
    
    @staticmethod
    def _get_diversity_rating(score: float) -> str:
        if score >= 0.8:
            return "Excellent - Great variety"
        elif score >= 0.6:
            return "Good - Acceptable variety"
        elif score >= 0.4:
            return "Fair - Some repetition"
        else:
            return "Poor - Too repetitive"
    
    @staticmethod
    def _get_diversity_recommendations(score: float, overused_foods: List[str]) -> List[str]:
        recommendations = []
        
        if score < 0.5:
            recommendations.append("Increase food variety - too many repeats")
        
        if overused_foods:
            recommendations.append(f"Reduce frequency of: {', '.join(overused_foods[:3])}")
        
        if not recommendations:
            recommendations.append("Good variety maintained")
        
        return recommendations
    
    @staticmethod
    def score_protein_adequacy(
        daily_plans: List[DailyPlan],
        target_protein: float,
        days: int
    ) -> Dict:
        """
        Score protein adequacy across the plan
        
        Metrics:
        - Total protein vs target
        - Daily protein consistency
        - Protein distribution across meals
        """
        total_protein = sum(d.total_protein for d in daily_plans)
        target_total = target_protein * days
        
        # Calculate adequacy
        adequacy_ratio = total_protein / target_total if target_total > 0 else 0
        
        # Check daily consistency
        daily_proteins = [d.total_protein for d in daily_plans]
        avg_daily = sum(daily_proteins) / len(daily_proteins) if daily_proteins else 0
        variance = sum((p - avg_daily) ** 2 for p in daily_proteins) / len(daily_proteins) if daily_proteins else 0
        std_dev = variance ** 0.5
        
        # Check protein distribution (ideally 4-5 meals with protein)
        protein_per_meal_scores = []
        for day_plan in daily_plans:
            protein_meals = sum(1 for meal in day_plan.meals if sum(item.protein for item in meal.items) > 10)
            protein_per_meal_scores.append(protein_meals / len(day_plan.meals) if day_plan.meals else 0)
        
        avg_protein_meals = sum(protein_per_meal_scores) / len(protein_per_meal_scores) if protein_per_meal_scores else 0
        
        return {
            "total_protein": round(total_protein, 1),
            "target_total": round(target_total, 1),
            "adequacy_ratio": round(adequacy_ratio, 2),
            "avg_daily_protein": round(avg_daily, 1),
            "protein_std_dev": round(std_dev, 1),
            "avg_protein_meals": round(avg_protein_meals, 2),
            "rating": QualityScorer._get_protein_rating(adequacy_ratio),
            "recommendations": QualityScorer._get_protein_recommendations(adequacy_ratio, std_dev, avg_protein_meals)
        }
    
    @staticmethod
    def _get_protein_rating(ratio: float) -> str:
        if ratio >= 1.0:
            return "Excellent - Meets or exceeds target"
        elif ratio >= 0.9:
            return "Good - Slightly below target"
        elif ratio >= 0.8:
            return "Fair - May need supplementation"
        else:
            return "Poor - Insufficient protein"
    
    @staticmethod
    def _get_protein_recommendations(ratio: float, std_dev: float, avg_protein_meals: float) -> List[str]:
        recommendations = []
        
        if ratio < 0.9:
            recommendations.append("Increase total protein intake")
        
        if std_dev > 20:
            recommendations.append("Balance daily protein more consistently")
        
        if avg_protein_meals < 0.8:
            recommendations.append("Distribute protein across more meals")
        
        if not recommendations:
            recommendations.append("Protein targets well-met")
        
        return recommendations
    
    @staticmethod
    def score_recovery_adequacy(workout_sessions: List[WorkoutSession]) -> Dict:
        """
        Score recovery adequacy in workout plan
        
        Metrics:
        - Rest days vs training days
        - Rest day distribution
        - Deload frequency
        """
        total_days = len(workout_sessions)
        rest_days = sum(1 for s in workout_sessions if s.is_rest_day)
        training_days = total_days - rest_days
        
        # Ideal rest day ratio depends on training frequency
        if total_days >= 7:
            ideal_rest = 2  # 2 rest days per week
        else:
            ideal_rest = int(total_days * 0.3)  # ~30% rest days
        
        rest_adequacy = rest_days / ideal_rest if ideal_rest > 0 else 0
        
        # Check rest day distribution (should be spread out)
        rest_positions = [i for i, s in enumerate(workout_sessions) if s.is_rest_day]
        consecutive_rest = 0
        max_consecutive_rest = 0
        for i, pos in enumerate(rest_positions):
            if i > 0 and pos == rest_positions[i-1] + 1:
                consecutive_rest += 1
                max_consecutive_rest = max(max_consecutive_rest, consecutive_rest)
            else:
                consecutive_rest = 0
        
        # Check for adequate cooldowns
        cooldowns_present = sum(1 for s in workout_sessions if s.cooldown and len(s.cooldown) > 0)
        cooldown_ratio = cooldowns_present / training_days if training_days > 0 else 0
        
        return {
            "total_days": total_days,
            "rest_days": rest_days,
            "training_days": training_days,
            "rest_day_ratio": round(rest_days / total_days, 2) if total_days > 0 else 0,
            "ideal_rest_days": ideal_rest,
            "rest_adequacy": round(rest_adequacy, 2),
            "max_consecutive_rest_days": max_consecutive_rest,
            "cooldown_ratio": round(cooldown_ratio, 2),
            "rating": QualityScorer._get_recovery_rating(rest_adequacy, max_consecutive_rest, cooldown_ratio),
            "recommendations": QualityScorer._get_recovery_recommendations(rest_adequacy, max_consecutive_rest, cooldown_ratio)
        }
    
    @staticmethod
    def _get_recovery_rating(rest_adequacy: float, max_consecutive: int, cooldown_ratio: float) -> str:
        if rest_adequacy >= 0.9 and max_consecutive <= 1 and cooldown_ratio >= 0.8:
            return "Excellent - Optimal recovery"
        elif rest_adequacy >= 0.7 and max_consecutive <= 2 and cooldown_ratio >= 0.5:
            return "Good - Adequate recovery"
        elif rest_adequacy >= 0.5:
            return "Fair - May need more rest"
        else:
            return "Poor - Risk of overtraining"
    
    @staticmethod
    def _get_recovery_recommendations(rest_adequacy: float, max_consecutive: int, cooldown_ratio: float) -> List[str]:
        recommendations = []
        
        if rest_adequacy < 0.7:
            recommendations.append("Add more rest days for recovery")
        
        if max_consecutive > 2:
            recommendations.append("Spread out rest days - avoid consecutive rest")
        
        if cooldown_ratio < 0.5:
            recommendations.append("Add cooldown stretches after workouts")
        
        if not recommendations:
            recommendations.append("Recovery schedule is well-planned")
        
        return recommendations
    
    @staticmethod
    def score_overall_quality(
        meal_response: NutritionPlanResponse,
        workout_sessions: Optional[List[WorkoutSession]] = None
    ) -> Dict:
        """
        Generate overall quality score for the entire plan
        """
        scores = {}
        
        # Meal diversity
        scores["meal_diversity"] = QualityScorer.score_meal_diversity(meal_response.daily_plans)
        
        # Protein adequacy
        target_protein = meal_response.weekly_totals.get("total_protein", 0) / len(meal_response.daily_plans)
        scores["protein_adequacy"] = QualityScorer.score_protein_adequacy(
            meal_response.daily_plans,
            target_protein,
            len(meal_response.daily_plans)
        )
        
        # Recovery (if workout sessions provided)
        if workout_sessions:
            scores["recovery_adequacy"] = QualityScorer.score_recovery_adequacy(workout_sessions)
        
        # Calculate overall score (0-100)
        diversity_score = scores["meal_diversity"]["diversity_score"] * 100
        protein_score = scores["protein_adequacy"]["adequacy_ratio"] * 100
        
        overall_score = (diversity_score + protein_score) / 2
        
        if "recovery_adequacy" in scores:
            recovery_score = scores["recovery_adequacy"]["rest_adequacy"] * 100
            overall_score = (diversity_score + protein_score + recovery_score) / 3
        
        scores["overall"] = {
            "score": round(overall_score, 1),
            "grade": QualityScorer._get_grade(overall_score),
            "summary": QualityScorer._get_summary(scores)
        }
        
        return scores
    
    @staticmethod
    def _get_grade(score: float) -> str:
        if score >= 90:
            return "A"
        elif score >= 80:
            return "B"
        elif score >= 70:
            return "C"
        elif score >= 60:
            return "D"
        else:
            return "F"
    
    @staticmethod
    def _get_summary(scores: Dict) -> str:
        """Generate a human-readable summary"""
        parts = []
        
        diversity = scores["meal_diversity"]["rating"]
        protein = scores["protein_adequacy"]["rating"]
        
        parts.append(f"Food variety: {diversity}")
        parts.append(f"Protein adequacy: {protein}")
        
        if "recovery_adequacy" in scores:
            recovery = scores["recovery_adequacy"]["rating"]
            parts.append(f"Recovery: {recovery}")
        
        return " | ".join(parts)


# Global instance
quality_scorer = QualityScorer()
