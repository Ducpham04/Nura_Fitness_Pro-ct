"""
Groq recommender: returns only food_id + quantity + meal scheduling.
Backend Java owns calories & price; this module only chooses catalog foods.
"""
import json
import os
import uuid
from typing import Any, Dict, List

from app.schemas.smart_meal_catalog import (
    FoodCatalogItem,
    SmartMealCatalogRequest,
    SmartMealCatalogResponse,
)

SMART_MEAL_SYSTEM_PROMPT = """ROLE: Meal recommender (catalog-constrained). NOT a nutrition calculator.

STRICT RULES:
1) Output ONLY valid JSON matching the response schema. No markdown, no prose, no comments, no extra keys.
2) Each slot has: day_number, meal_type (BREAKFAST|LUNCH|DINNER|SNACK), items: [{food_id, quantity}].
   For every day_number, prefer one BREAKFAST, one LUNCH, one DINNER, and one SNACK slot.
3) quantity = portion size in GRAMS (positive float). Prefer realistic Vietnamese home portions (e.g. rice 150–220g, meat/fish 80–150g).
4) NEVER output calories, protein, carbs, fat, prices, descriptions, recipes, or shopping text.
5) You may ONLY use food_id values that appear in the provided FOOD_CATALOG. Never invent ids.
6) INVENTORY / TỦ LẠNH:
   - You receive Vietnamese phrases describing what the user already has at home.
   - If a fridge item clearly matches one catalog row (substring / synonym), PRIORITIZE that food_id in the plan across {days} days.
   - The server treats matched inventory foods as 0đ when reconciling budget; your job is selection & portions, not costing.
7) Respect budget_per_day and target_calories_daily only through PORTION SIZE and CHEAPER catalog choices — do not invent money or kcal numbers.
8) Spread variety across days; avoid repeating identical meals every day unless inventory forces it.
9) respect preferences_negative: avoid catalog names that obviously match those dislikes.

MEDICAL SAFETY (hard rules, never violate):
10) disliked_foods_or_keywords may contain ALLERGENS — NEVER pick a catalog food whose name matches any of them.
11) Respect every constraint in diet_rules (medical conditions, Vietnamese). Examples: diabetes → avoid sugary foods and do not under-portion to extremes; hypertension → avoid salty/processed picks; kidney disease → do not stack high-protein items. When several foods fit, choose the safest for the listed medical_conditions."""

MODEL_NAME = os.getenv("GROQ_SMART_MEAL_MODEL", "llama-3.1-8b-instant")


def _catalog_lines(catalog: List[FoodCatalogItem], max_preview: int = 400) -> str:
    slim = [{"food_id": c.food_id, "name": c.name} for c in catalog[:max_preview]]
    return json.dumps(slim, ensure_ascii=False)


def generate_smart_catalog_plan(req: SmartMealCatalogRequest) -> SmartMealCatalogResponse:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise ValueError("GROQ_API_KEY is not set")

    import httpx
    from openai import OpenAI

    os.environ.pop("HTTP_PROXY", None)
    os.environ.pop("HTTPS_PROXY", None)
    os.environ.pop("ALL_PROXY", None)

    client = OpenAI(
        base_url="https://api.groq.com/openai/v1",
        api_key=api_key,
        http_client=httpx.Client(timeout=90.0),
    )

    user_blob: Dict[str, Any] = {
        "days": req.days,
        "budget_per_day_vnd": req.budget_per_day,
        "target_calories_daily": req.target_calories_daily,
        "inventory_phrases": req.inventory,
        "disliked_foods_or_keywords": req.preferences_negative,
        "diet_rules": req.diet_rules,
        "medical_conditions": req.medical_conditions,
        "user_profile": req.user_profile,
        "food_catalog_preview": json.loads(_catalog_lines(req.food_catalog)),
    }
    prompt = (
        SMART_MEAL_SYSTEM_PROMPT.replace("{days}", str(req.days))
        + "\n\nCONTEXT_JSON:\n"
        + json.dumps(user_blob, ensure_ascii=False)
        + "\n\nReturn ONLY the JSON object matching schema fields: plan_id (optional uuid string), meals[]."
    )

    response = client.chat.completions.create(
        model=MODEL_NAME,
        messages=[
            {
                "role": "system",
                "content": (
                    "You output JSON only. Never include calories or costs. "
                    "Use only BREAKFAST,LUNCH,DINNER,SNACK for meal_type."
                ),
            },
            {"role": "user", "content": prompt},
        ],
        response_format={"type": "json_object"},
        temperature=0.35,
    )

    text = response.choices[0].message.content or ""

    data = json.loads(text)
    parsed = SmartMealCatalogResponse.model_validate(data)

    catalog_ids = {c.food_id for c in req.food_catalog}
    for meal in parsed.meals:
        for item in meal.items:
            if item.food_id not in catalog_ids:
                raise ValueError(f"Model returned unknown food_id={item.food_id} (not in request catalog)")

    if not parsed.plan_id:
        parsed.plan_id = f"GROQ_{uuid.uuid4().hex[:16]}"
    return parsed
