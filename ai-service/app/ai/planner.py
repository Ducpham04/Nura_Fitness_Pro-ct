"""
AI Personal Coach (Model 2) - Meal Planning with Google Gemini
Handles intelligent meal planning with budget constraints
"""
import os
import json
from typing import List, Optional, Dict
import google.generativeai as genai
from ..schemas.nutrition import (
    UserProfile, NutritionPlanRequest, NutritionPlanResponse,
    DailyPlan, Meal, MealItem, MealType, GoalType
)
from ..core.analyzer import BodyAnalyzer
from ..core.validator import PlanValidator
from ..core.quality_scorer import QualityScorer


# System Prompt for Gemini - Specialist Fitness Coach
BASE_SYSTEM_PROMPT = """You are a Specialist Fitness Coach certified by ACSM (American College of Sports Medicine) with expertise in sports nutrition and meal planning for Vietnamese athletes.

YOUR EXPERTISE:
- Sports nutrition and meal timing
- Vietnamese cuisine and local ingredients
- Budget-conscious meal planning
- Macronutrient distribution for different fitness goals
- Food safety and preparation guidelines"""

# Goal-specific prompts
GOAL_PROMPTS = {
    "muscle_gain": """SPECIFIC FOCUS: MUSCLE GAIN (HYPERTROPHY)

CRITICAL EMPHASIS:
1. PROTEIN TIMING: Distribute protein evenly across 4-5 meals (20-30g per meal)
2. CARB TIMING: Higher carbs around workouts (pre/post-workout meals)
3. CALORIE SURPLUS: Ensure 200-300kcal surplus above TDEE
4. PROGRESSIVE OVERLOAD: Meal timing to support recovery and growth

PROTEIN SOURCES PRIORITY:
- Lean meats: Chicken breast, beef, fish, eggs
- Complete proteins: Quinoa, dairy, soy
- Post-workout: Fast-absorbing protein (whey, eggs, lean meat)

MEAL STRUCTURE:
- Breakfast: High protein + complex carbs (30% daily calories)
- Pre-workout: Moderate carbs, moderate protein (15% daily calories)
- Post-workout: High protein + fast carbs (25% daily calories)
- Dinner: High protein, moderate fat (30% daily calories)

AVOID: Empty calories, excessive sugar, processed foods""",
    
    "weight_loss": """SPECIFIC FOCUS: WEIGHT LOSS (FAT REDUCTION)

CRITICAL EMPHASIS:
1. CALORIE DEFICIT: Ensure 500kcal deficit below TDEE
2. HIGH SATIETY: Focus on high-volume, low-calorie foods
3. PROTEIN PRESERVATION: Maintain high protein (2.2g/kg) to preserve muscle
4. FIBER INTAKE: High fiber vegetables for fullness

PROTEIN SOURCES PRIORITY:
- Lean proteins: Chicken breast, fish, egg whites, tofu
- Plant-based: Legumes, lentils, tempeh
- Low-calorie: White fish, shellfish, lean pork

MEAL STRUCTURE:
- Breakfast: High protein, moderate carbs (25% daily calories)
- Lunch: High volume vegetables + lean protein (35% daily calories)
- Dinner: Light, protein-focused (25% daily calories)
- Snacks: High protein, low carb (15% daily calories)

AVOID: Processed foods, sugary drinks, excessive fats, large portions
EMPHASIZE: Vegetables, lean proteins, portion control, meal frequency""",
    
    "maintenance": """SPECIFIC FOCUS: MAINTENANCE (BODY COMPOSITION)

CRITICAL EMPHASIS:
1. CALORIE BALANCE: Match TDEE exactly
2. MACRO BALANCE: Balanced 40% protein, 40% carbs, 20% fat
3. NUTRIENT DENSITY: Focus on micronutrient-rich whole foods
4. SUSTAINABILITY: Flexible, enjoyable meal patterns

PROTEIN SOURCES PRIORITY:
- Variety of proteins: Meat, fish, dairy, plant-based
- Whole foods: Minimally processed
- Seasonal: Fresh, local ingredients

MEAL STRUCTURE:
- Balanced meals across all 4-5 meals
- Consistent meal timing
- Flexible food choices within macro targets

AVOID: Extreme restrictions, overly rigid meal timing
EMPHASIZE: Variety, balance, sustainability""",
    
    "endurance": """SPECIFIC FOCUS: ENDURANCE TRAINING

CRITICAL EMPHASIS:
1. CARB LOADING: Higher carbs for sustained energy
2. ELECTROLYTETE BALANCE: Potassium, sodium, magnesium rich foods
3. TIMING: Carbs before/after long sessions
4. HYDRATION SUPPORT: Water-rich foods

PROTEIN SOURCES PRIORITY:
- Moderate protein: 1.6g/kg bodyweight
- Recovery foods: Tart cherry, beet juice, antioxidant-rich foods
- Carb sources: Rice, pasta, oats, bananas, sweet potatoes

MEAL STRUCTURE:
- Pre-training: High carb, moderate protein (30% daily calories)
- During training: Quick carbs if sessions > 90min
- Post-training: Carb + protein recovery (25% daily calories)
- Rest days: Lower carb, higher fat (45% daily calories)

AVOID: Heavy fats before training, excessive fiber before long sessions
EMPHASIZE: Carb timing, hydration, electrolyte balance"""
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

OUTPUT FORMAT - STRICT JSON ONLY:
{
    "daily_plans": [
        {
            "day": "Day 1",
            "meals": [
                {
                    "meal_type": "breakfast",
                    "items": [
                        {
                            "name": "Tên món tiếng Việt",
                            "amount": "Serving size (e.g., '150g', '1 bowl')",
                            "calories": int,
                            "protein": float,
                            "carb": float,
                            "fat": float,
                            "estimated_cost": int (VND)
                        }
                    ]
                }
            ],
            "total_calories": int,
            "total_protein": float,
            "total_carb": float,
            "total_fat": float,
            "shopping_list": ["item1", "item2", ...],
            "estimated_cost": int
        }
    ],
    "recommendations": [
        "Tip 1 for user",
        "Tip 2 for user"
    ]
}

IMPORTANT:
- Output ONLY valid JSON, no markdown, no explanations
- All amounts in Vietnamese units (g, kg, bowl, plate, slice)
- All costs in VND
- Food names in Vietnamese
- Ensure JSON is properly formatted with double quotes
"""


class AIPlanner:
    """
    AI Personal Coach for meal planning using Google Gemini
    """
    
    def __init__(self):
        """Initialize Gemini client"""
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY environment variable not set")
        
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-3.1-flash-lite')
    
    def _parse_json_response(self, response_text: str) -> dict:
        """
        Parse JSON from Gemini response with fallback for markdown blocks
        """
        try:
            return json.loads(response_text)
        except json.JSONDecodeError:
            for delimiter in ["```json", "```"]:
                if delimiter in response_text:
                    json_str = response_text.split(delimiter)[1].split("```")[0].strip()
                    return json.loads(json_str)
            raise ValueError("Could not parse JSON from Gemini response")
    
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
                "dietary_restrictions": request.user_profile.dietary_restrictions
            },
            "target_calories": analysis["user_summary"]["target_calories"],
            "macro_targets": analysis["macro_targets"],
            "budget_tier": analysis["user_summary"]["budget_tier"],
            "meal_distribution": analysis["meal_distribution"],
            "days_to_plan": request.days,
            "budget_recommendations": analysis["budget_recommendations"],
            "lifestyle_context": lifestyle_context
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
        Generate nutrition plan using Gemini with day-by-day generation and validation
        """
        # Prepare context
        context = self._prepare_user_context(request)
        target_calories = context["target_calories"]
        target_protein = context["macro_targets"]["protein"]
        daily_budget = request.user_profile.budget_per_day
        
        daily_plans = []
        
        # Generate day by day to avoid truncation
        for day_num in range(1, request.days + 1):
            day_plan = self._generate_single_day(
                day_num=day_num,
                context=context,
                previous_days=daily_plans,
                target_calories=target_calories,
                target_protein=target_protein,
                daily_budget=daily_budget
            )
            daily_plans.append(day_plan)
        
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
    
    def _generate_single_day(
        self,
        day_num: int,
        context: Dict,
        previous_days: List[DailyPlan],
        target_calories: int,
        target_protein: float,
        daily_budget: int,
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
        
        for attempt in range(1, max_retries + 1):
            try:
                # Generate prompt with goal-specific instructions
                prompt = f"{system_prompt}\n\n{PROMPT_SUFFIX}\n\nUser Context:\n{json.dumps(day_context, ensure_ascii=False)}\n\nGenerate meal plan for Day {day_num} ONLY. Return ONLY valid JSON for 1 day."
                
                if attempt > 1:
                    prompt += "\n\nIMPORTANT: This is a retry attempt. Pay special attention to the target values."
                
                # Call Gemini
                response = self.model.generate_content(
                    prompt,
                    generation_config=genai.types.GenerationConfig(
                        temperature=0.7,
                        max_output_tokens=2000  # Smaller for single day
                    )
                )
                
                # Parse response
                ai_response = self._parse_json_response(response.text)
                
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
                        response = self.model.generate_content(
                            retry_prompt,
                            generation_config=genai.types.GenerationConfig(
                                temperature=0.5,
                                max_output_tokens=2000
                            )
                        )
                        ai_response = self._parse_json_response(response.text)
                        day_data = ai_response.get("daily_plans", [ai_response])[0] if "daily_plans" in ai_response else ai_response
                        day_plan = self._parse_daily_plan(day_data, day_num)
                        return day_plan
                    else:
                        # Use fallback template on final retry
                        return self._get_fallback_day_plan(day_num, target_calories, target_protein, daily_budget)
                        
            except Exception as e:
                if attempt == max_retries:
                    return self._get_fallback_day_plan(day_num, target_calories, target_protein, daily_budget)
                continue
        
        return self._get_fallback_day_plan(day_num, target_calories, target_protein, daily_budget)
    
    def _parse_daily_plan(self, day_data: dict, day_num: int) -> DailyPlan:
        """Parse daily plan data from AI response"""
        meals = []
        for meal_data in day_data.get("meals", []):
            items = [
                MealItem(**item) 
                for item in meal_data.get("items", [])
            ]
            meals.append(Meal(
                meal_type=MealType(meal_data["meal_type"]),
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
        user_profile: UserProfile
    ) -> Dict:
        """
        Adjust existing plan based on constraint (e.g., ingredient unavailable)
        """
        adjustment_prompt = f"""Adjust the following meal plan based on constraint: "{constraint}"

Current Plan:
{json.dumps(current_plan.dict(), ensure_ascii=False)}

User Budget: {user_profile.budget_per_day} VND/day
User Goal: {user_profile.goal.value}

RULES:
1. Replace only the affected meals/items
2. Maintain similar calories and macros
3. Stay within budget
4. Suggest alternatives with similar nutritional profile

OUTPUT JSON:
{{
    "changes_made": ["list of changes"],
    "adjusted_plan": {{modified daily plan}},
    "cost_difference": int (positive if more expensive, negative if cheaper),
    "alternative_suggestions": ["suggestion 1", "suggestion 2"]
}}
"""
        
        try:
            prompt = f"You are a nutrition expert. Output only valid JSON.\n\n{adjustment_prompt}"
            
            response = self.model.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.5,
                    max_output_tokens=2000
                )
            )
            
            response_text = response.text
            # Try to parse JSON
            try:
                return json.loads(response_text)
            except json.JSONDecodeError:
                if "```json" in response_text:
                    json_str = response_text.split("```json")[1].split("```")[0].strip()
                    return json.loads(json_str)
                elif "```" in response_text:
                    json_str = response_text.split("```")[1].strip()
                    return json.loads(json_str)
                else:
                    raise ValueError("Could not parse JSON from Gemini response")
            
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
            prompt = f"You are a supportive fitness coach. Output only valid JSON.\n\n{cheat_prompt}"
            
            response = self.model.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.6,
                    max_output_tokens=1500
                )
            )
            
            response_text = response.text
            # Try to parse JSON
            try:
                return json.loads(response_text)
            except json.JSONDecodeError:
                if "```json" in response_text:
                    json_str = response_text.split("```json")[1].split("```")[0].strip()
                    return json.loads(json_str)
                elif "```" in response_text:
                    json_str = response_text.split("```")[1].strip()
                    return json.loads(json_str)
                else:
                    raise ValueError("Could not parse JSON from Gemini response")
            
        except Exception as e:
            raise ValueError(f"Failed to handle cheat meal: {str(e)}")
