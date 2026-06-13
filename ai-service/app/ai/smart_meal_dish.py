"""
Groq gateway for Hybrid Smart Meal Planner.

Groq chooses dishes only. It never returns ingredient quantities, calories,
macros, or prices. Java validates dish_id and solves the nutrition math.
"""
import json
import os
import uuid
from typing import Dict, List, Set

import httpx
from openai import OpenAI

from app.schemas.smart_meal_dish import (
    DishCatalogItem,
    SelectedDay,
    SelectedDish,
    SelectedMeal,
    SmartDishPlanRequest,
    SmartDishPlanResponse,
)


MODEL_NAME = os.getenv("GROQ_DISH_MEAL_MODEL", "llama-3.1-8b-instant")

SYSTEM_PROMPT = """ROLE: Vietnamese family meal composer.

STRICT OUTPUT RULES:
1) Output ONLY valid JSON matching the schema. No markdown, comments, prose, or extra keys.
2) You may return dish_id values ONLY. Never return ingredients, quantities, calories, macros, or prices.
3) Every dish_id must exist in the provided catalog. Never invent dish_id.
4) Vietnamese meal structure:
   - BREAKFAST: exactly 1 ONE_POT dish.
   - LUNCH and DINNER: exactly 1 CARB_BASE + 1 MAIN_PROTEIN + 1 SOUP or VEGETABLE.
   - SNACK: optional; if present choose 1 suitable light dish.
5) Prefer dishes whose dish_name matches inventory phrases, but do not create new dishes.
6) Spread variety across days and avoid repeating the same dish too often.
7) Budget and user goal affect choice only. Java will calculate all grams and cost.

MEDICAL SAFETY (hard rules, never violate):
8) NEVER select a dish whose name contains any phrase in avoid_keywords (user allergies). The catalog is pre-filtered, but if any slips through, skip it.
9) Respect every constraint in diet_rules (medical conditions). When several dishes fit, choose the one safest for the listed conditions."""


def generate_smart_dish_plan(req: SmartDishPlanRequest) -> SmartDishPlanResponse:
    allowed_ids: Set[int] = {
        dish.dish_id
        for dishes in req.dish_catalog_by_role.values()
        for dish in dishes
    }
    if not allowed_ids:
        raise ValueError("dish_catalog_by_role is empty")

    # Use the OpenAI-compatible Groq endpoint to avoid requiring the separate
    # `groq` package in local environments.
    os.environ.pop("HTTP_PROXY", None)
    os.environ.pop("HTTPS_PROXY", None)
    os.environ.pop("ALL_PROXY", None)
    client = OpenAI(
        base_url="https://api.groq.com/openai/v1",
        api_key=api_key,
        http_client=httpx.Client(timeout=90.0),
    )
    context = {
        "days": req.days,
        "inventory": req.inventory,
        "user_goal": req.user_goal,
        "budget_per_day": req.budget_per_day,
        "avoid_keywords": req.avoid_keywords,
        "diet_rules": req.diet_rules,
        "medical_conditions": req.medical_conditions,
        "dish_catalog_by_role": {
            role: [dish.model_dump() for dish in dishes]
            for role, dishes in req.dish_catalog_by_role.items()
        },
        "schema": {
            "plan_id": "optional string",
            "days": [
                {
                    "day_number": 1,
                    "meals": [
                        {
                            "meal_type": "BREAKFAST|LUNCH|DINNER|SNACK",
                            "dishes": [{"dish_id": 123}],
                        }
                    ],
                }
            ],
        },
    }

    completion = client.chat.completions.create(
        model=MODEL_NAME,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": "CONTEXT_JSON:\n" + json.dumps(context, ensure_ascii=False),
            },
        ],
        response_format={"type": "json_object"},
        temperature=0.25,
    )

    raw = completion.choices[0].message.content or "{}"
    parsed = SmartDishPlanResponse.model_validate_json(raw)

    parsed = sanitize_or_rebuild_plan(parsed, req, allowed_ids)

    if not parsed.plan_id:
        parsed.plan_id = f"GROQ_DISH_{uuid.uuid4().hex[:16]}"
    return parsed


def sanitize_or_rebuild_plan(
    parsed: SmartDishPlanResponse,
    req: SmartDishPlanRequest,
    allowed_ids: Set[int],
) -> SmartDishPlanResponse:
    """
    Never let a hallucinated dish_id crash Java.

    We treat Groq output as a suggestion only. Unknown ids are dropped, then each
    day is normalized to the Vietnamese meal contract with deterministic catalog
    fallbacks.
    """
    by_role: Dict[str, List[DishCatalogItem]] = {
        role: dishes for role, dishes in req.dish_catalog_by_role.items()
    }

    def pick(role: str, day_number: int, offset: int = 0) -> SelectedDish:
        dishes = by_role.get(role) or []
        if not dishes:
            raise ValueError(f"No fallback dishes available for role={role}")
        dish = dishes[(day_number - 1 + offset) % len(dishes)]
        return SelectedDish(dish_id=dish.dish_id)

    original_by_day = {day.day_number: day for day in parsed.days}
    clean_days: List[SelectedDay] = []

    for day_number in range(1, req.days + 1):
        original_day = original_by_day.get(day_number)
        original_meals = original_day.meals if original_day else []
        known_by_type: Dict[str, List[int]] = {}
        for meal in original_meals:
            known_by_type.setdefault(meal.meal_type, [])
            for dish in meal.dishes:
                if dish.dish_id in allowed_ids:
                    known_by_type[meal.meal_type].append(dish.dish_id)

        breakfast_ids = known_by_type.get("BREAKFAST") or [pick("ONE_POT", day_number).dish_id]
        lunch_ids = compose_main_course_ids(known_by_type.get("LUNCH", []), by_role, day_number, 0)
        dinner_ids = compose_main_course_ids(known_by_type.get("DINNER", []), by_role, day_number, 1)

        clean_days.append(
            SelectedDay(
                day_number=day_number,
                meals=[
                    SelectedMeal(meal_type="BREAKFAST", dishes=[SelectedDish(dish_id=breakfast_ids[0])]),
                    SelectedMeal(meal_type="LUNCH", dishes=[SelectedDish(dish_id=dish_id) for dish_id in lunch_ids]),
                    SelectedMeal(meal_type="DINNER", dishes=[SelectedDish(dish_id=dish_id) for dish_id in dinner_ids]),
                ],
            )
        )

    parsed.days = clean_days
    return parsed


def compose_main_course_ids(
    suggested_ids: List[int],
    by_role: Dict[str, List[DishCatalogItem]],
    day_number: int,
    offset: int,
) -> List[int]:
    id_to_role = {
        dish.dish_id: role
        for role, dishes in by_role.items()
        for dish in dishes
    }
    selected: Dict[str, int] = {
        id_to_role[dish_id]: dish_id
        for dish_id in suggested_ids
        if id_to_role.get(dish_id) in {"CARB_BASE", "MAIN_PROTEIN", "SOUP", "VEGETABLE"}
    }

    def pick_id(role: str, fallback_offset: int = 0) -> int:
        dishes = by_role.get(role) or []
        if not dishes:
            raise ValueError(f"No fallback dishes available for role={role}")
        return dishes[(day_number - 1 + offset + fallback_offset) % len(dishes)].dish_id

    carb = selected.get("CARB_BASE") or pick_id("CARB_BASE")
    protein = selected.get("MAIN_PROTEIN") or pick_id("MAIN_PROTEIN")
    side = selected.get("SOUP") or selected.get("VEGETABLE")
    if side is None:
        side_role = "SOUP" if by_role.get("SOUP") else "VEGETABLE"
        side = pick_id(side_role)
    return [carb, protein, side]
