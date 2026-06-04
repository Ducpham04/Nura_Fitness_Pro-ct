"""
Integrated schema for combined meal + workout plan
"""
from pydantic import BaseModel, Field, validator
from typing import List, Optional
from datetime import datetime
from .nutrition import DailyPlan, UserProfile
from .workout import WorkoutSession, SessionType

# Minimum exercise count rules (must stay in sync with AI system prompt)
_MIN_EXERCISE_COUNT = {
    "full_body":   4,
    "upper_body":  3,
    "upper":       3,
    "lower_body":  3,
    "lower":       3,
    "legs":        3,
    "cardio":      2,
}


class AllowedWorkoutExercise(BaseModel):
    exercise_id: int = Field(..., ge=1)
    exercise_name: str = Field(..., min_length=1)
    exercise_type: str = ""
    movement_pattern: str = ""
    primary_muscle: str = ""
    difficulty_level: str = ""
    required_equipment: str = "BODYWEIGHT"
    default_sets: int = Field(..., ge=1)
    default_reps: int = Field(..., ge=1)
    default_rest_seconds: int = Field(..., ge=1)


class IntegratedDailyPlan(BaseModel):
    """Combined daily meal and workout plan"""
    day: str
    day_number: int
    
    # Meal plan
    meal_plan: DailyPlan
    
    # Workout plan
    workout_plan: Optional[WorkoutSession] = None
    
    # Adjusted macros based on workout
    adjusted_calories: Optional[int] = None
    adjusted_protein: Optional[float] = None
    adjustment_reason: Optional[str] = None  # e.g., "High intensity workout +200kcal"


class FullPlanRequest(BaseModel):
    """Request for generating integrated meal + workout plan"""
    user_id: str = Field(..., description="Unique identifier for the user")
    user_profile: UserProfile
    days: int = Field(default=7, ge=1, le=84)  # up to 12 weeks × 7 days
    preferences: Optional[List[str]] = Field(default_factory=list)
    
    # Workout preferences
    workout_intensity: str = Field(default="moderate", description="low, moderate, high")
    available_equipment: List[str] = Field(default_factory=list, description="List of available equipment: Tạ đôi, Máy cáp, Không cần")
    workout_duration_minutes: int = Field(default=45, ge=15, le=120)
    progression_phase: str = Field(default="foundation", description="foundation, volume, intensity, deload, build, overload")
    # Periodization: week_number drives auto phase detection (W1=foundation, W2=volume, W3=intensity, W4=deload)
    week_number: int = Field(default=1, ge=1, le=52, description="Current week in the program (drives periodization phase)")
    total_weeks: int = Field(default=4, ge=1, le=12, description="Total program duration in weeks")
    inventory: Optional[List[str]] = Field(default_factory=list, description="List of items currently in user's kitchen")
    current_injuries: Optional[str] = ""
    allowed_exercises: List[AllowedWorkoutExercise] = Field(default_factory=list)

    # ── Đơn tập cá nhân hóa (từ PersonalizationResolver ở backend) ──────────────
    # Ràng buộc cứng theo guideline ACSM/NSCA/WHO. AI tôn trọng, không tự đoán.
    risk_tier: Optional[str] = Field(default="A", description="A=khỏe / B=thận trọng / C=bệnh lý")
    archetype: Optional[str] = Field(default="general")
    intensity_cap_pct: Optional[int] = Field(default=85, description="Trần cường độ %1RM")
    rep_range_hint: Optional[str] = Field(default="", description="vd '12-15'")
    impact_policy: Optional[str] = Field(default="mixed", description="mixed | low_impact_only")
    split_strategy: Optional[str] = Field(default="", description="full_body_lowimpact|lower_focus|core_focus|upper_lower|full_body|light_general")
    focus_areas: Optional[List[str]] = Field(default_factory=list, description="Vùng cơ ưu tiên (primary muscle)")
    include_mobility: Optional[bool] = False
    include_balance: Optional[bool] = False
    education_level: Optional[str] = Field(default="basic", description="basic | detailed")


class FullPlanResponse(BaseModel):
    """Complete integrated response with meal + workout"""
    plan_id: str
    version: int = 1
    created_at: datetime = Field(default_factory=datetime.now)
    user_profile: UserProfile
    
    daily_plans: List[IntegratedDailyPlan]
    
    weekly_summary: dict
    recommendations: List[str]
    
    # Validation info
    validation_report: Optional[dict] = None
    
    # Versioning metadata
    parent_plan_id: Optional[str] = None  # If this is a revision of another plan
    change_summary: Optional[str] = None   # Description of changes from parent
