"""
Backend Integration Module
Handles communication between AI Service and Java Backend
Converts between Pydantic schemas and BE entities
"""
import json
from typing import Dict, List, Optional, Any
from datetime import datetime, date
from dataclasses import dataclass


@dataclass
class BEUserContext:
    """User context from Backend Entity"""
    user_id: str
    email: str
    weight: float
    height: float
    age: int
    gender: str
    body_fat_percentage: Optional[float]
    activity_level: str
    goal: str
    budget_per_day: int
    fitness_level: str
    dietary_restrictions: List[str]
    # New fields from entity improvements
    meal_prep_time: Optional[int] = None
    cooking_equipment: List[str] = None
    work_schedule: Optional[str] = None
    has_kitchen_at_work: Optional[bool] = None
    preferred_meal_times: Optional[Dict[str, str]] = None


@dataclass
class BEInventoryItem:
    """Inventory item from Backend Entity"""
    inventory_id: int
    food_name: str
    quantity_grams: float
    unit: str
    status: str  # AVAILABLE, EXPIRED, CONSUMED, RESERVED
    expiry_date: Optional[date]
    used_in_plan: bool


@dataclass
class BEPersonalizedPlan:
    """Personalized plan to save to Backend"""
    user_id: str
    template_plan_id: Optional[int]
    ai_plan_id: str
    version: int
    start_date: date
    duration_days: int
    target_budget_per_day: int
    target_calories: float
    target_protein: float
    target_carbs: float
    target_fat: float
    estimated_total_cost: int
    ai_generation_context: Dict[str, Any]
    meal_details: List[Dict[str, Any]]


class BEIntegration:
    """
    Integration layer between AI Service and Java Backend
    
    Note: In production, this would make HTTP requests to the BE API
    For now, it provides the data structures and conversion methods
    """
    
    @staticmethod
    def convert_be_user_to_profile(be_user: Dict[str, Any]) -> Dict[str, Any]:
        """
        Convert Backend User entity to AI Service UserProfile format
        
        BE User Entity -> AI UserProfile schema
        """
        # Map BE activity level to AI activity level
        activity_mapping = {
            "sedentary": "sedentary",
            "lightly_active": "light",
            "moderately_active": "moderate",
            "very_active": "active",
            "extra_active": "very_active"
        }
        
        # Map BE goal to AI goal
        goal_mapping = {
            "lose_weight": "weight_loss",
            "build_muscle": "muscle_gain",
            "lose_fat": "weight_loss",
            "maintain_health": "maintenance",
            "prepare_event": "endurance",
            "WEIGHT_LOSS": "weight_loss",
            "MUSCLE_GAIN": "muscle_gain",
            "MAINTENANCE": "maintenance",
            "ENDURANCE": "endurance"
        }
        
        # Map fitness level
        fitness_mapping = {
            "BEGINNER": "beginner",
            "INTERMEDIATE": "intermediate",
            "ADVANCED": "advanced",
            "beginner": "beginner",
            "intermediate": "intermediate",
            "advanced": "advanced"
        }
        
        activity_level = be_user.get("activity_level", "moderate")
        ai_activity = activity_mapping.get(activity_level.lower(), activity_level.lower())
        
        goal = be_user.get("goal", "maintenance")
        ai_goal = goal_mapping.get(goal, goal.lower())
        
        fitness_level = be_user.get("fitness_level", "beginner")
        ai_fitness = fitness_mapping.get(fitness_level, fitness_level.lower())
        
        # Build UserProfile compatible structure
        profile = {
            "weight": float(be_user.get("weight", 70)),
            "height": float(be_user.get("height", 170)),
            "age": int(be_user.get("age", 30)),
            "gender": be_user.get("gender", "male").lower(),
            "body_fat_percentage": be_user.get("body_fat_percentage"),
            "activity_level": ai_activity,
            "goal": ai_goal,
            "budget_per_day": int(be_user.get("budget_per_day", 80000)),
            "fitness_level": ai_fitness,
            "dietary_restrictions": be_user.get("dietary_restrictions", []),
            # New lifestyle fields
            "meal_prep_time": be_user.get("meal_prep_time"),
            "cooking_equipment": be_user.get("cooking_equipment", []),
            "work_schedule": be_user.get("work_schedule"),
            "has_kitchen_at_work": be_user.get("has_kitchen_at_work"),
            "preferred_meal_times": be_user.get("preferred_meal_times")
        }
        
        return profile
    
    @staticmethod
    def convert_inventory_to_prompt_context(inventory_items: List[BEInventoryItem]) -> str:
        """
        Convert inventory items to prompt context for AI
        """
        if not inventory_items:
            return "No items in inventory"
        
        available_items = [item for item in inventory_items if item.status == "AVAILABLE"]
        
        if not available_items:
            return "No available items in inventory"
        
        context_lines = ["USER INVENTORY (Items available to use):"]
        for item in available_items:
            expiry_info = ""
            if item.expiry_date:
                days_until = (item.expiry_date - date.today()).days
                if days_until <= 3:
                    expiry_info = f" [Expires in {days_until} days - PRIORITY USE]"
                else:
                    expiry_info = f" [Expires in {days_until} days]"
            
            context_lines.append(f"- {item.food_name}: {item.quantity_grams}g{item.expiry_info}")
        
        return "\n".join(context_lines)
    
    @staticmethod
    def convert_ai_plan_to_be_format(
        ai_response: Dict[str, Any],
        user_id: str,
        template_id: Optional[int],
        request_context: Dict[str, Any]
    ) -> BEPersonalizedPlan:
        """
        Convert AI-generated plan to Backend entity format
        """
        daily_plans = ai_response.get("daily_plans", [])
        
        # Calculate totals
        total_cost = sum(day.get("estimated_cost", 0) for day in daily_plans)
        
        # Convert meal details
        meal_details = []
        for day_plan in daily_plans:
            day_num = day_plan.get("day", "Day 1").replace("Day ", "")
            try:
                day_number = int(day_num)
            except:
                day_number = 1
            
            for meal in day_plan.get("meals", []):
                meal_detail = {
                    "day_number": day_number,
                    "meal_type": meal.get("meal_type", "lunch").upper(),
                    "meal_items_json": json.dumps(meal.get("items", [])),
                    "total_calories": meal.get("total_calories", 0),
                    "total_protein": meal.get("total_protein", 0),
                    "total_carbs": meal.get("total_carb", 0),
                    "total_fat": meal.get("total_fat", 0),
                    "estimated_cost": meal.get("estimated_cost", 0),
                    "prep_time_minutes": meal.get("prep_time_minutes", 30),
                    "cooking_instructions": meal.get("cooking_instructions", ""),
                    "ai_prompt_version": "v1.0"
                }
                meal_details.append(meal_detail)
        
        # Build AI generation context
        ai_context = {
            "generated_at": datetime.now().isoformat(),
            "model": "gemini-3.1-flash-lite",
            "user_preferences": request_context.get("preferences", {}),
            "inventory_used": request_context.get("inventory_used", []),
            "budget_tier": request_context.get("budget_tier", "medium"),
            "goal": request_context.get("goal", "maintenance")
        }
        
        plan = BEPersonalizedPlan(
            user_id=user_id,
            template_plan_id=template_id,
            ai_plan_id=f"ai_plan_{uuid.uuid4().hex[:8]}",
            version=1,
            start_date=request_context.get("start_date", date.today()),
            duration_days=len(daily_plans),
            target_budget_per_day=request_context.get("budget_per_day", 80000),
            target_calories=request_context.get("target_calories", 2000),
            target_protein=request_context.get("target_protein", 120),
            target_carbs=request_context.get("target_carbs", 200),
            target_fat=request_context.get("target_fat", 60),
            estimated_total_cost=total_cost,
            ai_generation_context=ai_context,
            meal_details=meal_details
        )
        
        return plan
    
    @staticmethod
    def build_complete_prompt_context(
        user_profile: Dict[str, Any],
        inventory_items: List[BEInventoryItem],
        preferences: Dict[str, Any]
    ) -> str:
        """
        Build complete context string for AI prompt including:
        - User profile
        - Inventory items
        - Preferences (disliked foods, cooking equipment, etc.)
        """
        context_parts = []
        
        # User profile summary
        context_parts.append(f"""
USER PROFILE:
- Goal: {user_profile.get('goal', 'maintenance')}
- Budget: {user_profile.get('budget_per_day', 80000):,} VND/day
- Activity Level: {user_profile.get('activity_level', 'moderate')}
- Fitness Level: {user_profile.get('fitness_level', 'beginner')}
- Dietary Restrictions: {', '.join(user_profile.get('dietary_restrictions', [])) or 'None'}
""")
        
        # Meal prep time
        prep_time = user_profile.get('meal_prep_time')
        if prep_time:
            context_parts.append(f"- Max Prep Time: {prep_time} minutes per meal")
        
        # Cooking equipment
        equipment = user_profile.get('cooking_equipment', [])
        if equipment:
            context_parts.append(f"- Cooking Equipment: {', '.join(equipment)}")
        
        # Work schedule
        work_schedule = user_profile.get('work_schedule')
        if work_schedule:
            context_parts.append(f"- Work Schedule: {work_schedule}")
        
        # Inventory
        if inventory_items:
            context_parts.append("\n" + BEIntegration.convert_inventory_to_prompt_context(inventory_items))
        
        # Preferences - Foods to avoid
        disliked_foods = preferences.get('disliked_foods', [])
        if disliked_foods:
            context_parts.append(f"\nAVOID THESE FOODS: {', '.join(disliked_foods)}")
        
        # Preferences - Foods to prioritize
        liked_foods = preferences.get('liked_foods', [])
        if liked_foods:
            context_parts.append(f"\nPRIORITIZE THESE FOODS: {', '.join(liked_foods)}")
        
        # Skipped exercises (for workout plans)
        skipped_exercises = preferences.get('skipped_exercises', [])
        if skipped_exercises:
            exercise_names = [ex.get('name', '') for ex in skipped_exercises]
            context_parts.append(f"\nAVOID THESE EXERCISES (user skips them): {', '.join(exercise_names)}")
        
        return "\n".join(context_parts)


# Global instance
be_integration = BEIntegration()


# Convenience functions for API usage
def prepare_ai_request_context(
    user_id: str,
    be_user_data: Dict[str, Any],
    inventory_items: List[Dict[str, Any]],
    preferences: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Prepare complete context for AI plan generation
    To be called from the API endpoint before calling AI
    """
    # Convert BE user to profile
    profile = BEIntegration.convert_be_user_to_profile(be_user_data)
    
    # Convert inventory
    inventory = [
        BEInventoryItem(
            inventory_id=item.get('inventory_id', 0),
            food_name=item.get('food_name', ''),
            quantity_grams=item.get('quantity_grams', 0),
            unit=item.get('unit', 'g'),
            status=item.get('status', 'AVAILABLE'),
            expiry_date=item.get('expiry_date'),
            used_in_plan=item.get('used_in_plan', False)
        )
        for item in inventory_items
    ]
    
    # Build prompt context
    prompt_context = BEIntegration.build_complete_prompt_context(profile, inventory, preferences)
    
    return {
        "user_id": user_id,
        "profile": profile,
        "inventory": inventory,
        "preferences": preferences,
        "prompt_context": prompt_context
    }


def save_ai_plan_to_be(
    ai_response: Dict[str, Any],
    user_id: str,
    template_id: Optional[int],
    request_context: Dict[str, Any]
) -> BEPersonalizedPlan:
    """
    Convert and prepare AI plan for saving to Backend
    
    In production, this would make HTTP POST to BE API
    """
    plan = BEIntegration.convert_ai_plan_to_be_format(
        ai_response, user_id, template_id, request_context
    )
    
    # TODO: Make HTTP POST to BE API
    # response = requests.post(
    #     f"{BE_API_URL}/api/personalized-plans/{user_id}/create",
    #     json={...plan data...}
    # )
    
    return plan
