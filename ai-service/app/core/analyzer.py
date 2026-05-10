"""
Core Logic Analyzer for AI Service (Model 2)
Handles BMR calculation, TDEE computation, and budget validation
"""
from typing import Dict, Literal, Tuple
from ..schemas.nutrition import UserProfile, GoalType


class BodyAnalyzer:
    """
    Nutrition and body composition analyzer
    Implements standard formulas for metabolic calculations
    """
    
    # Activity multipliers for TDEE calculation
    ACTIVITY_MULTIPLIERS = {
        "sedentary": 1.2,      # Little to no exercise
        "light": 1.375,        # Light exercise 1-3 days/week
        "moderate": 1.55,      # Moderate exercise 3-5 days/week
        "active": 1.725,       # Heavy exercise 6-7 days/week
        "very_active": 1.9     # Very heavy exercise, physical job
    }
    
    # Goal-based calorie adjustments
    GOAL_ADJUSTMENTS = {
        GoalType.WEIGHT_LOSS: -500,      # 500 kcal deficit for ~0.5kg/week loss
        GoalType.MUSCLE_GAIN: 300,     # 300 kcal surplus for lean muscle gain
        GoalType.MAINTENANCE: 0,        # No adjustment
        GoalType.ENDURANCE: 200         # Slight surplus for performance
    }
    
    # Budget tiers in VND
    BUDGET_TIERS = {
        "low": (50000, 80000),         # Student budget
        "medium": (80000, 150000),     # Standard budget
        "high": (150000, float('inf')) # Premium budget
    }
    
    @staticmethod
    def calculate_bmr_mifflin_st_jeor(
        weight: float, 
        height: float, 
        age: int, 
        gender: Literal["male", "female"]
    ) -> float:
        """
        Calculate Basal Metabolic Rate using Mifflin-St Jeor Equation
        Most accurate for general population
        
        Formula:
        Men: BMR = (10 × weight in kg) + (6.25 × height in cm) - (5 × age in years) + 5
        Women: BMR = (10 × weight in kg) + (6.25 × height in cm) - (5 × age in years) - 161
        """
        base = (10 * weight) + (6.25 * height) - (5 * age)
        
        if gender == "male":
            return base + 5
        else:
            return base - 161
    
    @staticmethod
    def calculate_bmr_katch_mcardle(
        weight: float, 
        body_fat_percentage: float
    ) -> float:
        """
        Calculate BMR using Katch-McArdle Formula
        More accurate if body fat percentage is known
        
        Formula: BMR = 370 + (21.6 × Lean Body Mass in kg)
        LBM = Weight × (1 - Body Fat %)
        """
        lean_body_mass = weight * (1 - body_fat_percentage / 100)
        return 370 + (21.6 * lean_body_mass)
    
    @classmethod
    def calculate_tdee(cls, user_profile: UserProfile) -> float:
        """
        Calculate Total Daily Energy Expenditure
        TDEE = BMR × Activity Multiplier
        """
        # Use Katch-McArdle if body fat % available, otherwise Mifflin-St Jeor
        if user_profile.body_fat_percentage is not None:
            bmr = cls.calculate_bmr_katch_mcardle(
                user_profile.weight, 
                user_profile.body_fat_percentage
            )
        else:
            bmr = cls.calculate_bmr_mifflin_st_jeor(
                user_profile.weight,
                user_profile.height,
                user_profile.age,
                user_profile.gender
            )
        
        multiplier = cls.ACTIVITY_MULTIPLIERS.get(user_profile.activity_level, 1.55)
        return bmr * multiplier
    
    @classmethod
    def calculate_target_calories(cls, user_profile: UserProfile) -> int:
        """
        Calculate daily calorie target based on TDEE and goal
        """
        tdee = cls.calculate_tdee(user_profile)
        adjustment = cls.GOAL_ADJUSTMENTS.get(user_profile.goal, 0)
        return int(tdee + adjustment)
    
    @classmethod
    def calculate_macros(
        cls, 
        target_calories: int, 
        weight: float, 
        goal: GoalType
    ) -> Dict[str, float]:
        """
        Calculate macronutrient targets based on goal
        
        Returns dict with protein, carb, fat in grams
        """
        # Protein: 1.6-2.2g per kg bodyweight depending on goal
        if goal == GoalType.MUSCLE_GAIN:
            protein_per_kg = 2.0
        elif goal == GoalType.WEIGHT_LOSS:
            protein_per_kg = 2.2  # Higher protein for satiety and muscle preservation
        else:
            protein_per_kg = 1.6
        
        protein = weight * protein_per_kg
        protein_calories = protein * 4
        
        # Fat: 20-30% of total calories
        fat_percentage = 0.25
        fat_calories = target_calories * fat_percentage
        fat = fat_calories / 9
        
        # Carbs: remaining calories
        remaining_calories = target_calories - protein_calories - fat_calories
        carb = remaining_calories / 4
        
        return {
            "protein": round(protein, 1),
            "carb": round(carb, 1),
            "fat": round(fat, 1),
            "protein_pct": round(protein_calories / target_calories * 100, 1),
            "carb_pct": round(remaining_calories / target_calories * 100, 1),
            "fat_pct": round(fat_percentage * 100, 1)
        }
    
    @classmethod
    def validate_budget(cls, budget: int) -> Tuple[bool, str, str]:
        """
        Validate if budget meets minimum requirements
        
        Returns:
            (is_valid, message, budget_tier)
        """
        MIN_BUDGET = 50000  # 50,000 VND
        
        if budget < MIN_BUDGET:
            return (
                False, 
                f"Budget must be at least {MIN_BUDGET:,} VND per day. Current: {budget:,} VND",
                "invalid"
            )
        
        # Determine budget tier
        if budget <= 80000:
            tier = "low"
        elif budget <= 150000:
            tier = "medium"
        else:
            tier = "high"
        
        return True, "Budget valid", tier
    
    @classmethod
    def get_budget_recommendations(cls, budget_tier: str) -> list:
        """
        Get food recommendations based on budget tier
        """
        recommendations = {
            "low": [
                "Trứng gà: 3,500đ/quả - Protein chất lượng cao",
                "Đậu phụ: 5,000đ/bìa - Protein thực vật giá rẻ",
                "Ức gà: 80,000đ/kg - Mua sỉ để tiết kiệm",
                "Khoai lang: 15,000đ/kg - Carbohydrate lành mạnh",
                "Cá nục/Thu: 60,000đ/kg - Omega-3 giá rẻ",
                "Rau xanh theo mùa: Giá thấp nhất"
            ],
            "medium": [
                "Ức gà hữu cơ: 120,000đ/kg",
                "Cá hồi nhập khẩu: 200,000đ/kg",
                "Yến mạch nhập khẩu: 80,000đ/kg",
                "Sữa tươi không đường: 25,000đ/hộp",
                "Hạnh nhân/Various nuts: 150,000đ/kg",
                "Trái cây theo mùa: Chuối, bơ, táo"
            ],
            "high": [
                "Thịt bò Mỹ/Australia: 300,000đ/kg - Protein cao cấp",
                "Cá hồi tươi: 400,000đ/kg",
                "Whey protein isolate: 1,500,000đ/kg",
                "Quả óc chó Mỹ: 300,000đ/kg",
                "Yến sào/Supplements cao cấp",
                "Organic vegetables: Rau hữu cơ đắt tiền"
            ]
        }
        
        return recommendations.get(budget_tier, recommendations["medium"])
    
    @classmethod
    def analyze_user(cls, user_profile: UserProfile) -> Dict:
        """
        Complete user analysis with all metrics
        """
        # Validate budget
        is_valid, message, budget_tier = cls.validate_budget(user_profile.budget_per_day)
        
        if not is_valid:
            raise ValueError(message)
        
        # Calculate all metrics
        tdee = cls.calculate_tdee(user_profile)
        target_calories = cls.calculate_target_calories(user_profile)
        macros = cls.calculate_macros(target_calories, user_profile.weight, user_profile.goal)
        
        # Get budget recommendations
        budget_foods = cls.get_budget_recommendations(budget_tier)
        
        return {
            "user_summary": {
                "bmr_method": "Katch-McArdle" if user_profile.body_fat_percentage else "Mifflin-St Jeor",
                "bmr": round(tdee / cls.ACTIVITY_MULTIPLIERS[user_profile.activity_level], 0),
                "tdee": round(tdee, 0),
                "target_calories": target_calories,
                "budget_tier": budget_tier,
                "daily_budget": user_profile.budget_per_day
            },
            "macro_targets": macros,
            "budget_recommendations": budget_foods,
            "meal_distribution": {
                "breakfast_pct": 0.30,  # 30% of daily calories
                "lunch_pct": 0.40,      # 40% of daily calories
                "dinner_pct": 0.25,     # 25% of daily calories
                "snack_pct": 0.05       # 5% of daily calories
            }
        }


class NutritionValidator:
    """
    Validates nutrition plans against user constraints
    """
    
    @staticmethod
    def validate_meal_cost(daily_plan: dict, budget: int) -> Tuple[bool, str]:
        """
        Check if meal plan fits within budget
        """
        total_cost = daily_plan.get('estimated_cost', 0)
        
        if total_cost > budget:
            return False, f"Meal plan cost ({total_cost:,}đ) exceeds budget ({budget:,}đ)"
        
        if total_cost > budget * 1.1:  # Within 10% tolerance
            return True, f"Warning: Cost ({total_cost:,}đ) is close to budget limit"
        
        return True, f"Meal plan cost ({total_cost:,}đ) within budget ({budget:,}đ)"
    
    @staticmethod
    def validate_nutrition_targets(
        daily_plan: dict, 
        target_calories: int,
        tolerance: float = 0.15
    ) -> Tuple[bool, str]:
        """
        Check if meal plan meets nutrition targets within tolerance
        """
        actual_calories = daily_plan.get('total_calories', 0)
        
        lower_bound = target_calories * (1 - tolerance)
        upper_bound = target_calories * (1 + tolerance)
        
        if actual_calories < lower_bound:
            return False, f"Calories too low: {actual_calories} vs target {target_calories}"
        
        if actual_calories > upper_bound:
            return False, f"Calories too high: {actual_calories} vs target {target_calories}"
        
        return True, f"Calories on target: {actual_calories} vs {target_calories}"
