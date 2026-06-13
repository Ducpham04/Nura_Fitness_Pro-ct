"""
Structured I/O for Master-Data Smart Meal Planner (Groq recommends food_id + quantity only).
Backend Java owns calories & price; AI must not invent macros.
"""
from typing import List, Literal

from pydantic import BaseModel, Field, field_validator


class FoodCatalogItem(BaseModel):
    food_id: int = Field(..., ge=1)
    name: str = Field(..., min_length=1, description="Canonical food name from DB")


class SmartMealCatalogRequest(BaseModel):
    days: int = Field(default=7, ge=1, le=14)
    budget_per_day: int = Field(..., ge=30000, description="VND per day")
    target_calories_daily: int = Field(default=2000, ge=800, le=6000)
    inventory: List[str] = Field(default_factory=list, description="User fridge phrases (Vietnamese)")
    preferences_negative: List[str] = Field(
        default_factory=list, description="Foods user dislikes — avoid matching catalog names"
    )
    diet_rules: List[str] = Field(
        default_factory=list,
        description="Medical diet constraints resolved by Java (Vietnamese, prompt-ready)",
    )
    medical_conditions: List[str] = Field(default_factory=list)
    user_profile: dict = Field(default_factory=dict)
    food_catalog: List[FoodCatalogItem] = Field(
        ..., min_length=1, description="Subset of master foods (id + name only)"
    )


class RecommendedFoodQty(BaseModel):
    food_id: int = Field(..., ge=1)
    quantity: float = Field(
        ...,
        gt=0,
        le=5000,
        description="Portion in GRAMS for scaling per-100g master data on the server",
    )


MealTypeGate = Literal["BREAKFAST", "LUNCH", "DINNER", "SNACK"]


class PlannedMealSlot(BaseModel):
    day_number: int = Field(..., ge=1, le=14)
    meal_type: MealTypeGate
    items: List[RecommendedFoodQty] = Field(..., min_length=1)


class SmartMealCatalogResponse(BaseModel):
    plan_id: str = Field(default="")
    meals: List[PlannedMealSlot] = Field(..., min_length=1)

    @field_validator("plan_id", mode="before")
    @classmethod
    def normalize_plan_id(cls, value):
        return "" if value is None else value
