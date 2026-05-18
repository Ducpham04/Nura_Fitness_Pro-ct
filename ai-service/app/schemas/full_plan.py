"""
Integrated schema for combined meal + workout plan
"""
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from .nutrition import DailyPlan, UserProfile
from .workout import WorkoutSession, SessionType


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
    days: int = Field(default=7, ge=1, le=14)
    preferences: Optional[List[str]] = Field(default_factory=list)
    
    # Workout preferences
    workout_intensity: str = Field(default="moderate", description="low, moderate, high")
    available_equipment: List[str] = Field(default_factory=list, description="List of available equipment: Tạ đôi, Máy cáp, Không cần")
    workout_duration_minutes: int = Field(default=45, ge=15, le=120)
    inventory: Optional[List[str]] = Field(default_factory=list, description="List of items currently in user's kitchen")


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