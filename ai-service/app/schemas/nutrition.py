"""
Pydantic Schemas for AI Service (Models 2 & 3)
Defines data structures for meal planning and food tracking
"""
from pydantic import BaseModel, Field, validator
from typing import List, Optional, Literal, Dict
from enum import Enum


class GoalType(str, Enum):
    """Fitness goals supported by the system"""
    WEIGHT_LOSS = "weight_loss"
    MUSCLE_GAIN = "muscle_gain"
    MAINTENANCE = "maintenance"
    ENDURANCE = "endurance"


class FitnessLevel(str, Enum):
    """User fitness experience levels"""
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"


class ActivityLevel(str, Enum):
    """User daily activity levels"""
    SEDENTARY = "sedentary"
    LIGHTLY_ACTIVE = "lightly_active"
    MODERATE = "moderate"
    VERY_ACTIVE = "very_active"
    EXTRA_ACTIVE = "extra_active"


class MealType(str, Enum):
    """Types of meals in a daily plan"""
    BREAKFAST = "breakfast"
    LUNCH = "lunch"
    DINNER = "dinner"
    SNACK = "snack"


class MealItem(BaseModel):
    """Individual food item in a meal"""
    name: str = Field(..., description="Food name in Vietnamese")
    amount: str = Field(..., description="Portion size (e.g., '150g', '1 bowl')")
    calories: int = Field(..., ge=0, description="Calories in kcal")
    protein: float = Field(..., ge=0, description="Protein in grams")
    carb: float = Field(..., ge=0, description="Carbohydrates in grams")
    fat: float = Field(..., ge=0, description="Fat in grams")
    estimated_cost: int = Field(default=0, ge=0, description="Cost in VND")


class Meal(BaseModel):
    """A complete meal with multiple items"""
    meal_type: MealType
    items: List[MealItem]
    
    @property
    def total_calories(self) -> int:
        return sum(item.calories for item in self.items)
    
    @property
    def total_protein(self) -> float:
        return sum(item.protein for item in self.items)
    
    @property
    def total_cost(self) -> int:
        return sum(item.estimated_cost for item in self.items)


class DailyPlan(BaseModel):
    """Complete daily meal plan"""
    day: str = Field(..., description="Day of week or day number")
    meals: List[Meal]
    total_calories: int = Field(..., ge=0)
    total_protein: float = Field(..., ge=0)
    total_carb: float = Field(..., ge=0)
    total_fat: float = Field(..., ge=0)
    shopping_list: List[str] = Field(default_factory=list)
    estimated_cost: int = Field(..., ge=0, description="Total daily cost in VND")
    
    class Config:
        json_schema_extra = {
            "example": {
                "day": "Monday",
                "meals": [
                    {
                        "meal_type": "breakfast",
                        "items": [
                            {
                                "name": "Cháo yến mạch",
                                "amount": "1 bowl",
                                "calories": 300,
                                "protein": 12.0,
                                "carb": 45.0,
                                "fat": 8.0,
                                "estimated_cost": 15000
                            }
                        ]
                    }
                ],
                "total_calories": 2000,
                "total_protein": 120.0,
                "total_carb": 200.0,
                "total_fat": 60.0,
                "shopping_list": ["Yến mạch", "Sữa tươi", "Chuối"],
                "estimated_cost": 60000
            }
        }


class UserProfile(BaseModel):
    """User physical profile and fitness goals"""
    weight: float = Field(..., gt=20, lt=300, description="Weight in kg")
    height: float = Field(..., gt=100, lt=250, description="Height in cm")
    age: int = Field(..., gt=10, lt=100, description="Age in years")
    gender: str = Field(..., description="male or female")
    body_fat_percentage: Optional[float] = Field(None, ge=0, le=50, description="Body fat percentage")
    activity_level: ActivityLevel = Field(default=ActivityLevel.MODERATE)
    goal: GoalType = Field(default=GoalType.MAINTENANCE)
    budget_per_day: int = Field(default=80000, ge=30000, le=500000, description="Daily budget in VND")
    fitness_level: FitnessLevel = Field(default=FitnessLevel.BEGINNER)
    dietary_restrictions: List[str] = Field(default_factory=list)
    
    # Lifestyle context
    meal_prep_time: Optional[int] = Field(None, ge=5, le=120, description="Max meal prep time in minutes")
    cooking_equipment: List[str] = Field(default_factory=list, description="Available equipment: ['nồi', 'chảo', 'nồi chiên không dính', 'lò nướng', 'nồi áp suất']")
    work_schedule: Optional[str] = Field(None, description="Work schedule: 'office_8to5', 'shift_work', 'flexible', 'student', 'freelance'")
    has_kitchen_at_work: Optional[bool] = Field(None, description="Whether user has kitchen access at work")
    preferred_meal_times: Optional[Dict[str, str]] = Field(None, description="Preferred meal times e.g., {'breakfast': '7:00', 'lunch': '12:00', 'dinner': '19:00'}")
    
    @validator('budget_per_day')
    def validate_budget(cls, v):
        if v < 50000:
            raise ValueError('Budget must be at least 50,000 VND per day')
        return v


class NutritionPlanRequest(BaseModel):
    """Request body for generating nutrition plan"""
    user_profile: UserProfile
    days: int = Field(default=7, ge=1, le=14, description="Number of days to plan")
    preferences: Optional[List[str]] = Field(default_factory=list)
    inventory: Optional[List[str]] = Field(default_factory=list, description="List of items currently in user's kitchen")


class NutritionPlanResponse(BaseModel):
    """Response containing complete nutrition plan"""
    plan_id: str
    user_profile: UserProfile
    daily_plans: List[DailyPlan]
    weekly_totals: dict
    recommendations: List[str]
    
    
class FoodRecognitionResult(BaseModel):
    """Result from AI Vision food recognition"""
    food_name: str = Field(..., description="Recognized food name in Vietnamese")
    confidence: float = Field(..., ge=0, le=1)
    estimated_weight: str = Field(..., description="Estimated portion weight")
    calories: int = Field(..., ge=0)
    protein: float = Field(..., ge=0)
    carb: float = Field(..., ge=0)
    fat: float = Field(..., ge=0)
    adjust_advice: Optional[str] = Field(None, description="Adjustment advice if calories exceed threshold")


class FoodTrackingRequest(BaseModel):
    """Request for food tracking via image"""
    image_base64: str = Field(..., description="Base64 encoded JPEG image (max 800x800)")
    meal_context: Optional[str] = Field(None, description="Breakfast/Lunch/Dinner context")
    user_daily_target: Optional[int] = Field(None, description="User's daily calorie target")


class FoodTrackingResponse(BaseModel):
    """Response from food tracking"""
    recognized_foods: List[FoodRecognitionResult]
    total_calories: int
    remaining_calories: Optional[int] = None
    meal_advice: Optional[str] = None
    alternative_suggestions: Optional[List[str]] = None


class AdjustmentRequest(BaseModel):
    """Request for adjusting meal plan"""
    current_plan: DailyPlan
    constraint: str = Field(..., description="Constraint to adjust for (e.g., 'Supermarket out of beef')")
    user_profile: UserProfile


class AdjustmentResponse(BaseModel):
    """Response with adjusted meal plan"""
    original_plan: DailyPlan
    adjusted_plan: DailyPlan
    changes_made: List[str]
    cost_difference: int


class CheatMealRequest(BaseModel):
    """Request for handling cheat meals"""
    food_consumed: str = Field(..., description="Description of food consumed")
    calories_consumed: int = Field(..., ge=0)
    user_daily_target: int = Field(..., ge=0)
    user_profile: UserProfile


class CheatMealResponse(BaseModel):
    """Response with compensation advice"""
    original_target: int
    remaining_calories: int
    compensation_plan: str
    exercise_compensation: Optional[str] = None
    meal_adjustments: List[str]

class MealContextRequest(BaseModel):
    """Request from Spring Boot with context for meal generation"""
    targetCalories: int
    budget: int
    inventory: List[str]

class MealContextResponse(BaseModel):
    """Response returned to Spring Boot"""
    meals: List[Meal]
    total_calories: int
    total_cost: int
    shopping_list: List[str]
