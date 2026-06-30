"""
AI Personal Coach (Model 2) - Meal Planning with Groq
Handles intelligent meal planning with budget constraints
"""
import os
import json
import time
from typing import List, Optional, Dict
from ..schemas.nutrition import (
    UserProfile, NutritionPlanRequest, NutritionPlanResponse,
    DailyPlan, Meal, MealItem, MealType, GoalType
)
from ..core.analyzer import BodyAnalyzer
from ..core.validator import PlanValidator
from ..core.quality_scorer import QualityScorer


# System Prompt for Groq - Master Chef & Nutrition Expert
BASE_SYSTEM_PROMPT = """Bạn là Chuyên gia Dinh dưỡng & Đầu bếp am hiểu ẩm thực Việt Nam.
BẮT BUỘC: Tên món ăn phải bằng tiếng Việt (ví dụ: Cơm tấm sườn nướng, Phở bò, Ức gà áp chảo, Rau muống xào tỏi).
Quy tắc: Ngon miệng, Không lãng phí, Dinh dưỡng chính xác.

AN TOÀN Y TẾ (quy tắc cứng, KHÔNG ĐƯỢC vi phạm):
1. TUYỆT ĐỐI không dùng thực phẩm nằm trong dietary_restrictions (dị ứng/kiêng) — kể cả làm nguyên liệu phụ.
2. Tuân thủ mọi quy tắc trong diet_rules (ràng buộc bệnh nền do hệ thống cung cấp).
3. Không bao giờ đề xuất nhịn ăn, detox, hay cắt giảm dưới 1200 kcal/ngày.
4. Nếu user có medical_conditions, ưu tiên lựa chọn an toàn nhất cho các bệnh đó."""

# Goal-specific prompts
GOAL_PROMPTS = {
    "muscle_gain": """Goal: Hypertrophy. Rules: Even protein (25g+ per meal), 300kcal surplus, high carb pre/post workout.""",
    
    "weight_loss": """Goal: Fat loss. Rules: 500kcal deficit, high satiety (fiber/volume), protein 2.2g/kg, low calorie density.""",
    
    "maintenance": """Goal: Balance. Rules: Maintenance calories, 40/40/20 macro split, nutrient dense whole foods.""",
    
    "endurance": """Goal: Performance. Rules: High carbs for glycogen, electrolyte balance (K, Na, Mg), timing around training."""
}


def get_system_prompt(goal: str) -> str:
    """Get goal-specific system prompt"""
    goal_key = goal.lower() if isinstance(goal, str) else goal.value
    goal_prompt = GOAL_PROMPTS.get(goal_key, "")
    return f"{BASE_SYSTEM_PROMPT}\n\n{goal_prompt}"


# Common prompt suffix (added to all goal-specific prompts)
PROMPT_SUFFIX = """

INPUT FORMAT:
{
    "user_profile": {
        "weight": float (kg),
        "height": float (cm),
        "age": int,
        "gender": "male" | "female",
        "body_fat_percentage": float | null,
        "activity_level": "sedentary" | "light" | "moderate" | "active" | "very_active",
        "goal": "weight_loss" | "muscle_gain" | "maintenance" | "endurance",
        "budget_per_day": int (VND, minimum 50,000),
        "fitness_level": "beginner" | "intermediate" | "advanced",
        "dietary_restrictions": [string]
    },
    "target_calories": int,
    "macro_targets": {"protein": float, "carb": float, "fat": float},
    "budget_tier": "low" | "medium" | "high",
    "days_to_plan": int (1-14)
}

BUDGET STRATEGY:
- LOW BUDGET (<80,000 VND/day): Prioritize eggs, tofu, chicken breast (bulk), sweet potatoes, seasonal vegetables, small fish (mackerel, sardines)
- MEDIUM BUDGET (80,000-150,000 VND/day): Add chicken thigh, salmon portions, oats, milk, mixed nuts, seasonal fruits
- HIGH BUDGET (>150,000 VND/day): Include beef cuts, fresh salmon, whey protein, premium nuts, organic vegetables, supplements

VIETNAMESE FOOD DATABASE (Calories per typical serving):
Proteins:
- Chicken breast (100g): 165 kcal, 31g protein
- Chicken thigh (100g): 200 kcal, 25g protein
- Beef (lean, 100g): 250 kcal, 26g protein
- Pork tenderloin (100g): 220 kcal, 24g protein
- Salmon (100g): 200 kcal, 20g protein, 13g fat
- Tofu (1 bìa, 150g): 120 kcal, 12g protein
- Eggs (2 quả): 140 kcal, 12g protein
- Cá thu/nục (100g): 180 kcal, 20g protein

Carbs:
- Rice (1 bowl, 150g): 200 kcal, 45g carb
- Brown rice (1 bowl, 150g): 180 kcal, 40g carb
- Sweet potato (200g): 180 kcal, 40g carb
- Oats (50g): 190 kcal, 33g carb, 6g protein
- Rice noodles (bún, 100g): 110 kcal, 25g carb
- Bread (2 slices): 160 kcal, 30g carb

CONSTRAINTS:
1. Budget: Total daily cost MUST NOT exceed user's budget_per_day
2. Calories: Daily total must be within 10% of target_calories
3. Protein: Must meet or exceed macro_targets.protein
4. Variety: Rotate foods across days, avoid repetition
5. Practicality: Use commonly available ingredients in Vietnamese markets

INVENTORY STRATEGY:
- Priority 1: Sử dụng tối đa các nguyên liệu trong DANH SÁCH CÓ SẴN.
- Priority 2: Nếu dùng đồ có sẵn, 'estimated_cost' BẮT BUỘC phải là 0 VND.
- Priority 3: Chỉ mua thêm đồ mới nếu đồ có sẵn không đủ đáp ứng dinh dưỡng.
- Chi phí: 'estimated_cost' của thực đơn = Tổng tiền mua đồ mới. Tổng này <= budget_per_day.

OUTPUT FORMAT (STRICT JSON):
{
    "daily_plans": [
        {
            "day": "Day X",
            "meals": [
                {
                    "meal_type": "breakfast",
                    "items": [
                        {
                            "name": "Món ăn",
                            "amount": "150g",
                            "calories": 400,
                            "protein": 30.5,
                            "carb": 40.0,
                            "fat": 10.0,
                            "estimated_cost": 30000
                        }
                    ]
                }
            ],
            "total_calories": 2000,
            "total_protein": 150.0,
            "total_carb": 200.0,
            "total_fat": 60.0,
            "shopping_list": ["item1", "item2"],
            "estimated_cost": 100000
        }
    ],
    "recommendations": ["Tip 1", "Tip 2"]
}

IMPORTANT:
- Output ONLY valid JSON, no markdown, no explanations.
- All amounts in Vietnamese units (g, kg, bowl, plate, slice).
- All costs in VND (integer only).
- Food names in Vietnamese.
- meal_type MUST be exactly one of: "breakfast", "lunch", "dinner", "snack".
- Nutritional values (calories, protein, carb, fat) MUST be NUMBERS only. DO NOT include "g" or "kcal" units in the values.
- Ensure JSON is properly formatted with double quotes.
"""


class AIPlanner:
    """
    AI Personal Coach for meal planning using Groq
    """
    
    def __init__(self):
        """Initialize LLM client (provider-agnostic, env-driven, auto fail-over)"""
        try:
            from ..core.llm import make_client
            self.client_type = "llm"
            self.client = make_client(timeout=90.0)
            self.model_name = os.getenv("LLM_MEAL_MODEL", "llama-3.1-8b-instant")
        except Exception as e:
            print(f"❌ Could not initialize LLM client: {e}")
            raise e
    
    def _parse_json_response(self, response_text: str) -> dict:
        """
        Parse JSON from Groq response with fallback for markdown blocks
        """
        try:
            return json.loads(response_text)
        except json.JSONDecodeError:
            for delimiter in ["```json", "```"]:
                if delimiter in response_text:
                    json_str = response_text.split(delimiter)[1].split("```")[0].strip()
                    return json.loads(json_str)
            raise ValueError("Could not parse JSON from Groq response")
    
    def _prepare_user_context(self, request: NutritionPlanRequest) -> Dict:
        """
        Prepare comprehensive user context for AI
        """
        # Analyze user with BodyAnalyzer
        analysis = BodyAnalyzer.analyze_user(request.user_profile)
        
        # Build lifestyle context
        lifestyle_context = self._build_lifestyle_context(request.user_profile)
        
        return {
            "user_profile": {
                "weight": request.user_profile.weight,
                "height": request.user_profile.height,
                "age": request.user_profile.age,
                "gender": request.user_profile.gender,
                "body_fat_percentage": request.user_profile.body_fat_percentage,
                "activity_level": request.user_profile.activity_level.value,
                "goal": request.user_profile.goal.value,
                "budget_per_day": request.user_profile.budget_per_day,
                "fitness_level": request.user_profile.fitness_level.value,
                "dietary_restrictions": request.user_profile.dietary_restrictions,
                "medical_conditions": request.user_profile.medical_conditions,
                "diet_rules": request.user_profile.diet_rules
            },
            "target_calories": analysis["user_summary"]["target_calories"],
            "macro_targets": analysis["macro_targets"],
            "budget_tier": analysis["user_summary"]["budget_tier"],
            "meal_distribution": analysis["meal_distribution"],
            "days_to_plan": request.days,
            "budget_recommendations": analysis["budget_recommendations"],
            "lifestyle_context": lifestyle_context,
            "inventory": request.inventory if hasattr(request, 'inventory') else []
        }
    
    def _build_lifestyle_context(self, profile: UserProfile) -> Dict:
        """Build lifestyle context from user profile"""
        context = {}
        
        if profile.meal_prep_time:
            context["meal_prep_time"] = f"{profile.meal_prep_time} minutes max"
            context["prep_constraint"] = "quick and easy meals" if profile.meal_prep_time < 30 else "moderate prep time allowed"
        
        if profile.cooking_equipment:
            context["cooking_equipment"] = profile.cooking_equipment
            context["cooking_method"] = self._suggest_cooking_methods(profile.cooking_equipment)
        
        if profile.work_schedule:
            context["work_schedule"] = profile.work_schedule
            context["meal_timing"] = self._suggest_meal_timing(profile.work_schedule, profile.has_kitchen_at_work)
        
        if profile.preferred_meal_times:
            context["preferred_meal_times"] = profile.preferred_meal_times
        
        return context
    
    def _suggest_cooking_methods(self, equipment: List[str]) -> str:
        """Suggest cooking methods based on available equipment"""
        methods = []
        
        equipment_lower = [e.lower() for e in equipment]
        
        if "lò nướng" in equipment_lower or "nồi chiên không dính" in equipment_lower:
            methods.append("grilling, baking")
        if "nồi" in equipment_lower or "nồi áp suất" in equipment_lower:
            methods.append("boiling, steaming, stewing")
        if "chảo" in equipment_lower or "nồi chiên không dính" in equipment_lower:
            methods.append("stir-frying, sautéing")
        
        if not methods:
            methods.append("simple cooking methods")
        
        return ", ".join(methods)
    
    def _suggest_meal_timing(self, schedule: str, has_kitchen: Optional[bool]) -> str:
        """Suggest meal timing based on work schedule"""
        timing_suggestions = {
            "office_8to5": "Breakfast: 7:00, Lunch: 12:00 (prepare ahead), Dinner: 19:00",
            "shift_work": "Flexible meal timing, meal prep recommended",
            "flexible": "Flexible meal timing based on preference",
            "student": "Quick meals, campus-friendly options",
            "freelance": "Flexible timing, focus on consistency"
        }
        
        suggestion = timing_suggestions.get(schedule, "Standard meal timing")
        
        if has_kitchen:
            suggestion += ", can cook at work for lunch"
        else:
            suggestion += ", pack lunch from home"
        
        return suggestion
    
    def generate_plan(self, request: NutritionPlanRequest) -> NutritionPlanResponse:
        """
        Generate nutrition plan using Groq with day-by-day generation and validation
        """
        # Prepare context
        context = self._prepare_user_context(request)
        target_calories = context["target_calories"]
        target_protein = context["macro_targets"]["protein"]
        daily_budget = request.user_profile.budget_per_day
        
        # State tracking for inventory across days
        current_inventory = context.get("inventory", [])
        daily_plans = []
        
        # Generate multi-day plan in one shot to save tokens and time
        print(f"🍱 [AI Planner] Generating {request.days}-day plan at once...")
        daily_plans = self._generate_multi_day_plan(
            request=request,
            context=context,
            target_calories=target_calories,
            target_protein=target_protein,
            daily_budget=daily_budget
        )
        
        # Validate entire week
        weekly_budget = daily_budget * request.days
        is_valid, validation_report = PlanValidator.validate_weekly_plan(
            daily_plans=daily_plans,
            target_calories=target_calories,
            target_protein=target_protein,
            weekly_budget=weekly_budget
        )
        
        # Calculate weekly totals
        count = len(daily_plans) or 1
        weekly_totals = {
            "total_calories": sum(d.total_calories for d in daily_plans),
            "avg_daily_calories": sum(d.total_calories for d in daily_plans) / count,
            "total_cost": sum(d.estimated_cost for d in daily_plans),
            "avg_daily_cost": sum(d.estimated_cost for d in daily_plans) / count,
            "total_protein": sum(d.total_protein for d in daily_plans)
        }
        
        # Add validation info to recommendations
        recommendations = [
            f"Food diversity score: {validation_report.get('food_diversity_score', 0):.2%}"
        ]
        
        if validation_report["daily_errors"]:
            recommendations.append(f"⚠️ {len(validation_report['daily_errors'])} day(s) had validation issues")
        
        # Add quality scoring
        quality_scores = QualityScorer.score_meal_diversity(daily_plans)
        protein_scores = QualityScorer.score_protein_adequacy(
            daily_plans,
            target_protein,
            request.days
        )
        
        recommendations.append(f"Quality: {quality_scores['rating']}")
        recommendations.append(f"Protein: {protein_scores['rating']}")
        
        return NutritionPlanResponse(
            plan_id=f"plan_{request.user_profile.goal.value}_{id(request)}",
            user_profile=request.user_profile,
            daily_plans=daily_plans,
            weekly_totals=weekly_totals,
            recommendations=recommendations
        )
    
    def _generate_multi_day_plan(
        self,
        request: NutritionPlanRequest,
        context: Dict,
        target_calories: int,
        target_protein: float,
        daily_budget: int,
        max_retries: int = 2
    ) -> List[DailyPlan]:
        """Generate entire multi-day plan in one shot"""
        goal = context.get("user_profile", {}).get("goal", "maintenance")
        system_prompt = get_system_prompt(goal)
        
        # Build compact inventory list
        inventory_str = ", ".join(request.preferences) if request.preferences else "None"
        
        restrictions = request.user_profile.dietary_restrictions
        diet_rules = request.user_profile.diet_rules
        safety_lines = ""
        if restrictions:
            safety_lines += f"\n6. TUYỆT ĐỐI KHÔNG dùng (dị ứng/kiêng): {', '.join(restrictions)}."
        if diet_rules:
            safety_lines += "\n7. Ràng buộc bệnh nền: " + " | ".join(diet_rules)

        prompt = f"""Lập kế hoạch ăn uống trong {request.days} ngày.
BẮT BUỘC:
1. Đủ {request.days} ngày. Đánh số Day 1, Day 2, ...
2. KHÔNG LẶP LẠI món ăn giữa các ngày.
3. ƯU TIÊN DÙNG đồ có sẵn: {inventory_str}. Nếu dùng, estimated_cost = 0.
4. Ngân sách: {daily_budget} VND/ngày.
5. Mục tiêu: {target_calories} kcal, {target_protein}g protein mỗi ngày.{safety_lines}

User Profile: {json.dumps(context['user_profile'], ensure_ascii=False)}

Trả về ONLY JSON trong mảng 'daily_plans'."""

        for attempt in range(1, max_retries + 1):
            try:
                response = self.client.chat.completions.create(
                    model=self.model_name,
                    messages=[
                        {"role": "system", "content": system_prompt + "\n" + PROMPT_SUFFIX},
                        {"role": "user", "content": prompt}
                    ],
                    response_format={"type": "json_object"},
                    temperature=0.7
                )
                response_text = response.choices[0].message.content
                ai_response = self._parse_json_response(response_text)
                
                # Extract and normalize plans
                plans_data = ai_response.get("daily_plans", [])
                
                # If AI returned a single object instead of list (happens sometimes)
                if isinstance(plans_data, dict):
                    plans_data = [plans_data]
                
                daily_plans = []
                for i, p_data in enumerate(plans_data):
                    day_num = i + 1
                    # Use existing robust parser
                    p_obj = self._parse_daily_plan(p_data, day_num)
                    daily_plans.append(p_obj)
                
                return daily_plans

            except Exception as e:
                print(f"❌ Multi-day attempt {attempt} failed: {str(e)}")
                if attempt == max_retries:
                    # Final fallback: empty list (will trigger validation error later)
                    return []
                time.sleep(1)
    def _generate_single_day(
        self,
        day_num: int,
        context: Dict,
        previous_days: List[DailyPlan],
        target_calories: int,
        target_protein: float,
        daily_budget: int,
        inventory: List[str] = None,
        max_retries: int = 3
    ) -> DailyPlan:
        """
        Generate a single day's plan with validation and retry
        """
        # Build context with previous days to avoid repetition
        day_context = {
            **context,
            "current_day": day_num,
            "previous_days": [
                {
                    "day": d.day,
                    "foods": [item.name for meal in d.meals for item in meal.items]
                }
                for d in previous_days
            ]
        }
        
        # Get goal-specific system prompt
        goal = context.get("user_profile", {}).get("goal", "maintenance")
        system_prompt = get_system_prompt(goal)
        
        # Get goal-specific system prompt
        goal = context.get("user_profile", {}).get("goal", "maintenance")
        system_prompt = get_system_prompt(goal)
        
        # Build inventory context
        inventory_str = " - ".join(inventory) if inventory else "Không có"
        
        # Build the prompt
        prompt = f"""BẮT BUỘC:
1. KHÔNG ĐƯỢC LẶP LẠI các món đã ăn ở các ngày trước: {json.dumps(day_context.get('previous_days', []), ensure_ascii=False)}
2. ƯU TIÊN SỬ DỤNG kho đồ có sẵn: {inventory_str}
3. Nếu dùng đồ có sẵn, 'estimated_cost' PHẢI BẰNG 0.
4. Tổng chi phí mua mới không quá {daily_budget} VND.

User Context:
{json.dumps(day_context, ensure_ascii=False)}

Nhiệm vụ: Hãy là một đầu bếp sáng tạo. Lên thực đơn cho Day {day_num} sao cho ngon miệng, đủ chất và KHÔNG trùng lặp.
Nếu đồ có sẵn trong kho ({inventory_str}) có thể nấu được món gì, hãy ưu tiên món đó ngay.

Return ONLY valid JSON for Day {day_num}."""

        for attempt in range(1, max_retries + 1):
            try:
                # Add delay to avoid Groq Rate Limits
                if day_num > 1:
                    time.sleep(1.0)
                
                # Call AI
                response = self.client.chat.completions.create(
                    model=self.model_name,
                    messages=[
                        {"role": "system", "content": system_prompt + "\n" + PROMPT_SUFFIX},
                        {"role": "user", "content": prompt}
                    ],
                    response_format={"type": "json_object"},
                    temperature=0.7
                )
                response_text = response.choices[0].message.content
                
                # Parse response
                ai_response = self._parse_json_response(response_text)
                
                # Convert to DailyPlan
                day_data = ai_response.get("daily_plans", [ai_response])[0] if "daily_plans" in ai_response else ai_response
                day_plan = self._parse_daily_plan(day_data, day_num)
                
                # Validate
                is_valid, errors = PlanValidator.validate_daily_plan(
                    day_plan, target_calories, target_protein, daily_budget
                )
                
                if is_valid:
                    return day_plan
                else:
                    if attempt < max_retries:
                        # Retry with error feedback
                        retry_prompt = PlanValidator.generate_retry_prompt(
                            errors, day_context, attempt
                        )
                        
                        response = self.client.chat.completions.create(
                            model=self.model_name,
                            messages=[
                                {"role": "user", "content": retry_prompt}
                            ],
                            response_format={"type": "json_object"},
                            temperature=0.5
                        )
                        response_text = response.choices[0].message.content

                        ai_response = self._parse_json_response(response_text)
                        day_data = ai_response.get("daily_plans", [ai_response])[0] if "daily_plans" in ai_response else ai_response
                        day_plan = self._parse_daily_plan(day_data, day_num)
                        return day_plan
                    else:
                        return self._get_fallback_day_plan(day_num, target_calories, target_protein, daily_budget)
                        
            except Exception as e:
                print(f"❌ Attempt {attempt} failed for Day {day_num}: {str(e)}")
                if attempt == max_retries:
                    return self._get_fallback_day_plan(day_num, target_calories, target_protein, daily_budget)
                continue
        
        return self._get_fallback_day_plan(day_num, target_calories, target_protein, daily_budget)
    
    def _update_inventory(self, current_inventory: List[str], day_plan: DailyPlan) -> List[str]:
        """
        Update inventory by removing items used in the daily plan.
        Very simplified logic: if an item name or keyword from inventory matches a meal item, remove it.
        """
        if not current_inventory:
            return []
            
        new_inventory = current_inventory.copy()
        used_items = []
        
        for meal in day_plan.meals:
            for item in meal.items:
                # Flexible check: cost is 0 OR item name is mentioned in inventory
                is_from_inventory = item.estimated_cost == 0
                if not is_from_inventory:
                    for inv_item in current_inventory:
                        if inv_item.lower() in item.name.lower():
                            is_from_inventory = True
                            break
                
                if is_from_inventory:
                    used_items.append(item.name.lower())
        
        # Remove matched items (simple heuristic)
        for used in used_items:
            for inv_item in new_inventory[:]:
                if used in inv_item.lower() or inv_item.lower() in used:
                    new_inventory.remove(inv_item)
                    break
        
        return new_inventory

    def _parse_daily_plan(self, day_data: dict, day_num: int) -> DailyPlan:
        """Parse daily plan data from AI response"""
        meals = []
        for meal_data in day_data.get("meals", []):
            raw_meal_type = meal_data.get("meal_type", "")
            normalized_type = self._normalize_meal_type(raw_meal_type)
            
            items = [
                MealItem(**item) 
                for item in meal_data.get("items", [])
            ]
            meals.append(Meal(
                meal_type=MealType(normalized_type),
                items=items
            ))
        
        return DailyPlan(
            day=day_data.get("day", f"Day {day_num}"),
            meals=meals,
            total_calories=day_data.get("total_calories", 0),
            total_protein=day_data.get("total_protein", 0),
            total_carb=day_data.get("total_carb", 0),
            total_fat=day_data.get("total_fat", 0),
            shopping_list=day_data.get("shopping_list", []),
            estimated_cost=day_data.get("estimated_cost", 0)
        )
    
    def _normalize_meal_type(self, raw_type: str) -> str:
        """Normalize Vietnamese meal types to English for Enum compatibility"""
        val = str(raw_type).lower().strip()
        mapping = {
            "sáng": "breakfast",
            "trưa": "lunch",
            "tối": "dinner",
            "phụ": "snack",
            "bữa sáng": "breakfast",
            "bữa trưa": "lunch",
            "bữa tối": "dinner",
            "bữa phụ": "snack",
            "snack": "snack",
            "breakfast": "breakfast",
            "lunch": "lunch",
            "dinner": "dinner"
        }
        return mapping.get(val, val)

    def _get_fallback_day_plan(
        self, day_num: int, target_calories: int, target_protein: float, budget: int
    ) -> DailyPlan:
        """Fallback template when AI fails"""
        # Simple fallback - use basic foods
        protein_per_meal = target_protein / 3
        cal_per_meal = target_calories / 3
        
        breakfast_items = [
            MealItem(name="Trứng luộc", amount="2 quả", calories=140, protein=12, carb=1, fat=10, estimated_cost=7000),
            MealItem(name="Yến mạch", amount="50g", calories=190, protein=6, carb=33, fat=6, estimated_cost=8000),
        ]
        
        lunch_items = [
            MealItem(name="Cơm trắng", amount="150g", calories=195, protein=4, carb=42, fat=0.5, estimated_cost=3000),
            MealItem(name="Ức gà", amount="150g", calories=247, protein=46, carb=0, fat=5, estimated_cost=12000),
            MealItem(name="Rau xào", amount="100g", calories=50, protein=2, carb=8, fat=2, estimated_cost=5000),
        ]
        
        dinner_items = [
            MealItem(name="Cá kho", amount="100g", calories=150, protein=20, carb=5, fat=6, estimated_cost=10000),
            MealItem(name="Cơm", amount="100g", calories=130, protein=2.5, carb=28, fat=0.3, estimated_cost=2000),
        ]
        
        meals = [
            Meal(meal_type=MealType.BREAKFAST, items=breakfast_items),
            Meal(meal_type=MealType.LUNCH, items=lunch_items),
            Meal(meal_type=MealType.DINNER, items=dinner_items),
        ]
        
        total_cal = sum(item.calories for meal in meals for item in meal.items)
        total_prot = sum(item.protein for meal in meals for item in meal.items)
        total_cost = sum(item.estimated_cost for meal in meals for item in meal.items)
        
        return DailyPlan(
            day=f"Day {day_num}",
            meals=meals,
            total_calories=int(total_cal),
            total_protein=round(total_prot, 1),
            total_carb=0,
            total_fat=0,
            shopping_list=["Trứng", "Yến mạch", "Cơm", "Ức gà", "Rau", "Cá"],
            estimated_cost=int(total_cost)
        )
    
    def adjust_plan_for_constraint(
        self, 
        current_plan: DailyPlan,
        constraint: str,
        user_profile: UserProfile,
        inventory: List[str] = None
    ) -> Dict:
        """
        Adjust existing plan based on constraint (e.g., ingredient unavailable)
        """
        inventory_str = " - ".join(inventory) if inventory else "Không có"
        
        adjustment_prompt = f"""Adjust the following meal plan based on constraint: "{constraint}"

Current Plan:
{json.dumps(current_plan.dict(), ensure_ascii=False)}

NGUYÊN LIỆU ĐANG CÓ SẴN (Giá 0đ): {inventory_str}

User Budget: {user_profile.budget_per_day} VND/day
User Goal: {user_profile.goal.value}

RULES:
1. Master Chef Mode: Use the updated Inventory to replace the affected meals/items.
2. Resourcefulness: Prioritize using available ingredients to keep the cost difference low.
3. If an item from inventory is used, set its 'estimated_cost' to 0.
4. Maintain similar calories and macros.
5. Stay within budget.
6. Suggest alternatives with similar nutritional profile.

OUTPUT JSON:
{{
    "changes_made": ["list of changes"],
    "adjusted_plan": {{modified daily plan}},
    "cost_difference": int (positive if more expensive, negative if cheaper),
    "alternative_suggestions": ["suggestion 1", "suggestion 2"]
}}
"""
        
        try:
            prompt_content = f"You are a nutrition expert. Output only valid JSON.\n\n{adjustment_prompt}"
            
            response = self.client.chat.completions.create(
                model=self.model_name,
                messages=[{"role": "user", "content": prompt_content}],
                response_format={"type": "json_object"},
                temperature=0.5
            )
            
            response_text = response.choices[0].message.content
            return json.loads(response_text)
            
        except Exception as e:
            raise ValueError(f"Failed to adjust plan: {str(e)}")
    
    def handle_cheat_meal(
        self,
        food_consumed: str,
        calories_consumed: int,
        user_daily_target: int,
        user_profile: UserProfile
    ) -> Dict:
        """
        Handle cheat meals with compensation advice
        """
        remaining = user_daily_target - calories_consumed
        
        cheat_prompt = f"""User consumed: "{food_consumed}" ({calories_consumed} kcal)
Daily target: {user_daily_target} kcal
Remaining calories: {remaining} kcal
Goal: {user_profile.goal.value}

Provide compensation strategy:

OUTPUT JSON:
{{
    "compensation_plan": "brief strategy description in Vietnamese",
    "meal_adjustments": ["adjustment 1", "adjustment 2"],
    "exercise_compensation": "suggested exercise to burn extra calories",
    "remaining_meal_suggestions": ["light meal option 1", "light meal option 2"]
}}
"""
        
        try:
            prompt_content = f"You are a supportive fitness coach. Output only valid JSON.\n\n{cheat_prompt}"
            
            response = self.client.chat.completions.create(
                model=self.model_name,
                messages=[{"role": "user", "content": prompt_content}],
                response_format={"type": "json_object"},
                temperature=0.6
            )
            
            response_text = response.choices[0].message.content
            return json.loads(response_text)
            
        except Exception as e:
            raise ValueError(f"Failed to handle cheat meal: {str(e)}")

    def generate_meal_from_context(self, target_calories: int, budget: int, inventory: List[str]) -> Dict:
        """
        Generate a single daily meal plan directly from context (target calories, budget, inventory)
        """
        inventory_str = ", ".join(inventory) if inventory else "Không có"
        
        prompt = f"""Đóng vai trò là chuyên gia dinh dưỡng. Hãy tạo thực đơn 3 bữa tổng cộng khoảng {target_calories} kcal. 
Bắt buộc phải sử dụng hết các nguyên liệu có sẵn sau: {inventory_str} (giá 0đ). 
Các nguyên liệu phải mua thêm không được vượt quá {budget} VND. 
Trả về định dạng JSON nghiêm ngặt.

OUTPUT JSON FORMAT:
{{
    "meals": [
        {{
            "meal_type": "breakfast",
            "items": [
                {{
                    "name": "Tên món tiếng Việt",
                    "amount": "Serving size",
                    "calories": int,
                    "protein": float,
                    "carb": float,
                    "fat": float,
                    "estimated_cost": int (0 nếu là nguyên liệu có sẵn)
                }}
            ]
        }},
        ...
    ],
    "total_calories": int,
    "total_cost": int,
    "shopping_list": ["item1", "item2"]
}}

IMPORTANT:
- Output ONLY valid JSON, no markdown, no explanations.
- All amounts in Vietnamese units (g, kg, bowl).
- All costs in VND.
- Ensure the JSON is properly formatted.
"""
        try:
            response = self.client.chat.completions.create(
                model=self.model_name,
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"},
                temperature=0.7
            )
            return self._parse_json_response(response.choices[0].message.content)
        except Exception as e:
            raise ValueError(f"Failed to generate meal from context: {str(e)}")
    def chat(self, message: str, history: List[Dict] = [], preferences: Dict = {}, user_context: Dict = None) -> str:
        """
        General fitness coach chat
        """
        system_prompt = """Bạn là Huấn luyện viên thể hình AI của ứng dụng Fitnit.
        LUÔN trả lời bằng TIẾNG VIỆT, ngắn gọn, dễ hiểu, dựa trên khoa học và mang tính động viên.
        Tư vấn về tập luyện, dinh dưỡng và phục hồi. Giọng điệu thân thiện, chuyên nghiệp, gần gũi.
        Nếu người dùng hỏi về bữa ăn hay bài tập cụ thể, hãy dùng thông tin hồ sơ/sở thích nếu có.
        Không bịa số liệu; nếu thiếu dữ liệu thì đưa lời khuyên tổng quát và gợi ý người dùng cập nhật hồ sơ."""

        if preferences:
            system_prompt += f"\nSở thích người dùng: {json.dumps(preferences, ensure_ascii=False)}"

        if user_context:
            system_prompt += (
                "\nNgữ cảnh người dùng từ dữ liệu app (dùng khi liên quan, không tiết lộ JSON thô trừ khi được hỏi):\n"
                + json.dumps(user_context, ensure_ascii=False)
            )

        messages = [{"role": "system", "content": system_prompt}]

        # Chuẩn hóa role về giá trị Groq chấp nhận: 'assistant' hoặc 'user'
        def _norm_role(r: str) -> str:
            return "assistant" if str(r).lower() in ("ai", "assistant", "bot", "coach") else "user"

        # Add history
        for msg in history[-10:]: # Last 10 messages for context
            content = msg.get("content", "")
            if not content:
                continue
            messages.append({"role": _norm_role(msg.get("role", "user")), "content": content})

        # Add current message
        messages.append({"role": "user", "content": message})
        
        try:
            # Groq chat with history
            response = self.client.chat.completions.create(
                model=self.model_name,
                messages=messages,
                temperature=0.7,
                max_tokens=1000
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"[AI Coach chat error] {e}")
            return "Xin lỗi, hiện mình chưa kết nối được để phản hồi. Bạn thử lại sau giây lát nhé — trong lúc đó cứ bám theo kế hoạch hiện tại của bạn."

    def suggest_dishes_from_ingredients(self, ingredients: str, count: int = 4) -> list:
        """
        Gợi ý món ăn Việt nấu được từ nguyên liệu người dùng có.
        Trả về list[dict]: {name, ingredients[], est_calories, how_to}.
        """
        system_prompt = (
            "Bạn là đầu bếp AI người Việt. Dựa trên nguyên liệu người dùng đang có, "
            "gợi ý các MÓN ĂN VIỆT thực tế có thể nấu. "
            "CHỈ trả về JSON array hợp lệ, không thêm chữ nào ngoài JSON. "
            "Mỗi phần tử: {\"name\": tên món tiếng Việt, "
            "\"ingredients\": [danh sách nguyên liệu chính], "
            "\"est_calories\": số kcal ước tính mỗi khẩu phần (số nguyên), "
            "\"how_to\": cách làm ngắn gọn 1 câu}."
        )
        user_prompt = f"Nguyên liệu đang có: {ingredients}. Hãy gợi ý {count} món."
        try:
            response = self.client.chat.completions.create(
                model=self.model_name,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.6,
                max_tokens=900,
            )
            raw = response.choices[0].message.content.strip()
            # Bóc JSON (phòng khi model bọc trong ```json ... ```)
            if "```" in raw:
                raw = raw.split("```")[1].replace("json", "", 1).strip() if raw.count("```") >= 2 else raw
            start, end = raw.find("["), raw.rfind("]")
            if start != -1 and end != -1:
                raw = raw[start:end + 1]
            dishes = json.loads(raw)
            # Chuẩn hóa
            out = []
            for d in dishes[:count]:
                out.append({
                    "name": str(d.get("name", "")).strip(),
                    "ingredients": d.get("ingredients", []) if isinstance(d.get("ingredients"), list) else [],
                    "est_calories": int(d.get("est_calories", 0) or 0),
                    "how_to": str(d.get("how_to", "")).strip(),
                })
            return [d for d in out if d["name"]]
        except Exception as e:
            print(f"[suggest_dishes error] {e}")
            return []

    def suggest_shopping_list(self, inventory: str, budget: int = 0, count: int = 6) -> list:
        """
        Gợi ý nên MUA THÊM gì dựa trên nguyên liệu đang có + ngân sách.
        Trả về list[dict]: {name, reason}.
        """
        system_prompt = (
            "Bạn là trợ lý dinh dưỡng người Việt. Dựa trên nguyên liệu người dùng ĐANG CÓ "
            "và ngân sách, gợi ý những thứ NÊN MUA THÊM để bữa ăn đa dạng, đủ đạm-rau-tinh bột. "
            "Ưu tiên thực phẩm phổ biến, hợp túi tiền. Đừng gợi ý thứ họ đã có. "
            "CHỈ trả về JSON array hợp lệ, không thêm chữ nào ngoài JSON. "
            "Mỗi phần tử: {\"name\": tên thực phẩm, \"reason\": lý do ngắn nên mua}."
        )
        budget_txt = f"Ngân sách khoảng {budget:,}đ/ngày. " if budget else ""
        user_prompt = f"Đang có: {inventory or 'chưa có gì'}. {budget_txt}Gợi ý {count} thứ nên mua thêm."
        try:
            response = self.client.chat.completions.create(
                model=self.model_name,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.6,
                max_tokens=700,
            )
            raw = response.choices[0].message.content.strip()
            if "```" in raw and raw.count("```") >= 2:
                raw = raw.split("```")[1].replace("json", "", 1).strip()
            start, end = raw.find("["), raw.rfind("]")
            if start != -1 and end != -1:
                raw = raw[start:end + 1]
            items = json.loads(raw)
            out = []
            for it in items[:count]:
                out.append({"name": str(it.get("name", "")).strip(), "reason": str(it.get("reason", "")).strip()})
            return [i for i in out if i["name"]]
        except Exception as e:
            print(f"[suggest_shopping error] {e}")
            return []
