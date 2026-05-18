"""
Structured I/O for Hybrid Smart Meal Planner.

The contract is intentionally strict: Groq may select dish_id values only.
Java owns recipe lookup, grams, macros, price, and inventory reconciliation.
"""
from typing import Dict, List, Literal

from pydantic import BaseModel, Field, field_validator


DishRole = Literal["MAIN_PROTEIN", "SOUP", "VEGETABLE", "CARB_BASE", "ONE_POT"]
MealType = Literal["BREAKFAST", "LUNCH", "DINNER", "SNACK"]


class DishCatalogItem(BaseModel):
    dish_id: int = Field(..., ge=1)
    dish_name: str = Field(..., min_length=1)
    dish_role: DishRole
    suitable_meal_types: str = ""


class SmartDishPlanRequest(BaseModel):
    days: int = Field(default=7, ge=1, le=14)
    inventory: List[str] = Field(default_factory=list)
    user_goal: str = "maintenance"
    budget_per_day: int = Field(..., ge=30000)
    dish_catalog_by_role: Dict[DishRole, List[DishCatalogItem]]


class SelectedDish(BaseModel):
    dish_id: int = Field(..., ge=1)


class SelectedMeal(BaseModel):
    meal_type: MealType
    dishes: List[SelectedDish] = Field(..., min_length=1)


class SelectedDay(BaseModel):
    day_number: int = Field(..., ge=1, le=14)
    meals: List[SelectedMeal] = Field(..., min_length=1)


class SmartDishPlanResponse(BaseModel):
    plan_id: str = ""
    days: List[SelectedDay] = Field(..., min_length=1)

    @field_validator("plan_id", mode="before")
    @classmethod
    def normalize_plan_id(cls, value):
        return "" if value is None else value
