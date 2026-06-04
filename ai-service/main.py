"""
AI Service - FastAPI Entry Point
Combines Model 2 (Personal Coach/Planner) and Model 3 (AI Vision/Food Tracking)
"""
import os
import sys
import base64
import uuid
from datetime import datetime
from typing import List, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
# pyrefly: ignore [missing-import]
from fastapi.middleware.cors import CORSMiddleware
# pyrefly: ignore [missing-import]
from fastapi.responses import JSONResponse
import uvicorn

# Load environment variables from .env file
load_dotenv()

# Add app directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.schemas.smart_meal_catalog import SmartMealCatalogRequest
from app.ai.smart_meal_catalog import generate_smart_catalog_plan
from app.schemas.smart_meal_dish import SmartDishPlanRequest
from app.ai.smart_meal_dish import generate_smart_dish_plan
from app.schemas.nutrition import (
    UserProfile, NutritionPlanRequest, NutritionPlanResponse,
    DailyPlan, Meal, MealItem, FoodTrackingRequest, FoodTrackingResponse,
    GoalType, FitnessLevel, MealType, AdjustmentRequest, AdjustmentResponse,
    CheatMealRequest, CheatMealResponse, MealContextRequest, MealContextResponse
)
from app.schemas.workout import ProgramTemplate
from app.schemas.full_plan import FullPlanRequest, FullPlanResponse
from app.core.analyzer import BodyAnalyzer, NutritionValidator
from app.ai.planner import AIPlanner
from app.ai.vision import AIVision
from app.ai.integrated_planner import IntegratedPlanner
from app.core.preference_store import preference_store
from app.core.progression_tracker import progression_tracker
from app.core.price_database import PriceDatabase
from app.core.plan_versioning import plan_versioning
from app.core.be_integration import BEIntegration, be_integration, prepare_ai_request_context, save_ai_plan_to_be


# Initialize FastAPI app
app = FastAPI(
    title="Fitness AI Service",
    description="AI-powered nutrition planning and food tracking",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize AI components
planner = AIPlanner()
vision = AIVision()
integrated_planner = IntegratedPlanner()


@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "service": "Fitness AI Service",
        "version": "1.0.0",
        "models": {
            "model_2": "Personal Coach (Meal Planning)",
            "model_3": "AI Vision (Food Tracking)"
        },
        "endpoints": {
            "planner": "/plan",
            "food_tracking": "/track-food",
            "user_analysis": "/analyze-user",
            "adjust_plan": "/adjust-plan",
            "cheat_meal": "/cheat-meal"
        },
        "docs": "/docs"
    }


@app.post("/analyze-user", response_model=dict) # tạm thời không cần vì BE đang dùng công thức để tính.
async def analyze_user(user_profile: UserProfile):
    """
    Analyze user profile and return comprehensive metrics
    
    - Calculates BMR (Mifflin-St Jeor or Katch-McArdle)
    - Computes TDEE based on activity level
    - Determines calorie and macro targets
    - Validates budget
    - Provides budget-specific recommendations
    """
    try:
        # Validate budget
        is_valid, message, budget_tier = BodyAnalyzer.validate_budget(
            user_profile.budget_per_day
        )
        
        if not is_valid:
            raise HTTPException(status_code=400, detail=message)
        
        # Perform complete analysis
        analysis = BodyAnalyzer.analyze_user(user_profile)
        
        return {
            "success": True,
            "timestamp": datetime.now().isoformat(),
            "user_id": str(uuid.uuid4()),
            **analysis
        }
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@app.post("/smart-meal-plan", response_model=dict)
async def smart_meal_plan(request: SmartMealCatalogRequest):
    """
    Catalog-constrained Groq recommender: returns only meal slots with food_id + quantity (grams).
    Java recomputes nutrition and spend from foods master table.
    """
    try:
        outcome = generate_smart_catalog_plan(request)
        return outcome.model_dump()
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Smart meal generation failed: {str(e)}")


@app.post("/smart-meal-plan-dish", response_model=dict)
async def smart_meal_plan_dish(request: SmartDishPlanRequest):
    """
    Hybrid planner: Groq chooses dish_id only.

    Java performs recipe lookup, quantity solving, macro math, pricing, and
    inventory reconciliation.
    """
    try:
        outcome = generate_smart_dish_plan(request)
        return outcome.model_dump()
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Smart dish meal generation failed: {str(e)}")


@app.post("/plan", response_model=NutritionPlanResponse)
async def generate_plan(request: NutritionPlanRequest):
    """
    Generate personalized nutrition plan using GPT-4o
    
    - Creates 7-day meal plan based on user profile
    - Considers budget constraints
    - Optimizes for fitness goal
    - Provides shopping lists
    """
    try:
        # Validate budget first
        is_valid, message, _ = BodyAnalyzer.validate_budget(
            request.user_profile.budget_per_day
        )
        
        if not is_valid:
            raise HTTPException(status_code=400, detail=message)
        
        # Generate plan using AI
        plan = planner.generate_plan(request)
        
        return plan
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Plan generation failed: {str(e)}")

@app.post("/generate-meal-from-context", response_model=MealContextResponse)
async def generate_meal_from_context(request: MealContextRequest):
    """
    Generate a single daily meal plan from target calories, budget, and inventory
    """
    try:
        result = planner.generate_meal_from_context(
            target_calories=request.targetCalories,
            budget=request.budget,
            inventory=request.inventory
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate meal: {str(e)}")


@app.post("/track-food", response_model=FoodTrackingResponse)
async def track_food(
    image: UploadFile = File(...),
    meal_context: Optional[str] = Form(None),
    user_daily_target: Optional[int] = Form(None)
):
    """
    Analyze food image and track calories/macros using GPT-4o Vision
    
    - Accepts image upload (JPEG/PNG)
    - Recognizes Vietnamese dishes
    - Estimates portion sizes
    - Calculates nutritional content
    - Provides adjustment advice for high-calorie meals
    """
    try:
        # Read and encode image
        contents = await image.read()
        image_base64 = base64.b64encode(contents).decode('utf-8')
        
        # Create request
        request = FoodTrackingRequest(
            image_base64=image_base64,
            meal_context=meal_context,
            user_daily_target=user_daily_target
        )
        
        # Analyze with AI Vision
        result = vision.analyze_food(request)
        
        return result
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Food analysis failed: {str(e)}")


@app.post("/track-food-base64", response_model=FoodTrackingResponse)
async def track_food_base64(request: FoodTrackingRequest):
    """
    Track food from base64-encoded image
    
    Alternative to file upload for API clients that prefer base64
    """
    try:
        result = vision.analyze_food(request)
        return result
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Food analysis failed: {str(e)}")


@app.post("/adjust-plan")
async def adjust_plan(
    current_plan: DailyPlan,
    constraint: str,
    user_profile: UserProfile
):
    """
    Adjust existing meal plan based on constraints
    
    Example constraints:
    - "Siêu thị hết thịt bò"
    - "Tôi muốn giảm calories bữa tối"
    - "Thay thế bằng món chay"
    """
    try:
        result = planner.adjust_plan_for_constraint(
            current_plan=current_plan,
            constraint=constraint,
            user_profile=user_profile
        )
        
        return {
            "success": True,
            **result
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Plan adjustment failed: {str(e)}")


@app.post("/cheat-meal")
async def handle_cheat_meal(
    food_consumed: str,
    calories_consumed: int,
    user_daily_target: int,
    user_profile: UserProfile
):
    """
    Handle cheat meals with compensation advice
    
    Provides:
    - Remaining calorie budget
    - Meal adjustments for the rest of the day
    - Exercise compensation suggestions
    """
    try:
        result = planner.handle_cheat_meal(
            food_consumed=food_consumed,
            calories_consumed=calories_consumed,
            user_daily_target=user_daily_target,
            user_profile=user_profile
        )
        
        return {
            "success": True,
            "original_target": user_daily_target,
            "calories_consumed": calories_consumed,
            **result
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Cheat meal handling failed: {str(e)}")


@app.get("/budget-foods/{budget_tier}")
async def get_budget_foods(budget_tier: str):
    """
    Get food recommendations for specific budget tier
    
    Tiers: low (<80k), medium (80k-150k), high (>150k)
    """
    if budget_tier not in ["low", "medium", "high"]:
        raise HTTPException(status_code=400, detail="Budget tier must be: low, medium, or high")
    
    recommendations = BodyAnalyzer.get_budget_recommendations(budget_tier)
    
    return {
        "budget_tier": budget_tier,
        "recommendations": recommendations
    }


@app.get("/sample-profiles")
async def get_sample_profiles():
    """
    Get sample user profiles for testing
    """
    return {
        "student_budget": {
            "description": "Sinh viên - ngân sách 60k/ngày (Test Case 'Săn Deal')",
            "profile": {
                "weight": 65,
                "height": 170,
                "age": 22,
                "gender": "male",
                "activity_level": "moderate",
                "goal": "muscle_gain",
                "budget_per_day": 60000,
                "fitness_level": "intermediate"
            }
        },
        "standard_user": {
            "description": "Người đi làm - ngân sách 120k/ngày",
            "profile": {
                "weight": 60,
                "height": 160,
                "age": 28,
                "gender": "female",
                "activity_level": "light",
                "goal": "weight_loss",
                "budget_per_day": 120000,
                "fitness_level": "beginner"
            }
        },
        "premium_user": {
            "description": "Premium - ngân sách 200k/ngày",
            "profile": {
                "weight": 75,
                "height": 180,
                "age": 30,
                "gender": "male",
                "body_fat_percentage": 15,
                "activity_level": "very_active",
                "goal": "muscle_gain",
                "budget_per_day": 200000,
                "fitness_level": "advanced"
            }
        }
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "models": {
            "planner": "available" if planner else "unavailable",
            "vision": "available" if vision else "unavailable",
            "integrated_planner": "available" if integrated_planner else "unavailable"
        }
    }


@app.post("/full-plan", response_model=FullPlanResponse)
async def generate_full_plan(request: FullPlanRequest):
    """
    Generate integrated meal + workout plan
    - Meal plan adjusts macros based on workout calories burned
    - Workout plan tailored to fitness level and equipment
    - Takes user preferences into account
    """
    try:
        # Generate the integrated plan
        full_plan = integrated_planner.generate_full_plan(request)
        return full_plan
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Full plan generation failed: {str(e)}")


@app.post("/workout-plan", response_model=ProgramTemplate)
async def generate_workout_plan(request: FullPlanRequest):
    """
    Generate a compact workout program template.
    """
    try:
        from app.ai.workout_planner import WorkoutPlanner
        wp = WorkoutPlanner()
        template = wp.generate_template(
            user_profile=request.user_profile,
            days=request.days,
            week_number=request.week_number,
            total_weeks=request.total_weeks,
            available_equipment=request.available_equipment,
            workout_intensity=request.workout_intensity,
            duration_minutes=request.workout_duration_minutes,
            progression_phase=request.progression_phase,
            preferences=request.preferences,
            allowed_exercises=[item.model_dump() for item in request.allowed_exercises],
            current_injuries=request.current_injuries or "",
            prescription={
                "risk_tier": request.risk_tier or "A",
                "archetype": request.archetype or "general",
                "intensity_cap_pct": request.intensity_cap_pct or 85,
                "rep_range_hint": request.rep_range_hint or "",
                "impact_policy": request.impact_policy or "mixed",
                "split_strategy": request.split_strategy or "",
                "focus_areas": request.focus_areas or [],
                "include_mobility": bool(request.include_mobility),
                "include_balance": bool(request.include_balance),
                "education_level": request.education_level or "basic",
            },
        )
        return template
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Workout template generation failed: {str(e)}")


@app.post("/analyze-pose")
async def analyze_pose(
    media: UploadFile = File(...),
    exercise_type: str = Form(...),
    user_id: str = Form("unknown"),
):
    """
    v2.4 — Analyze a workout form snapshot with Groq Vision.

    This endpoint intentionally handles image snapshots only. Video/real-time
    pose estimation should stay in a dedicated MediaPipe pipeline.
    """
    import io as _io
    import json as _json
    from PIL import Image as _Image

    content_type = media.content_type or ""
    if not content_type.startswith("image/"):
        raise HTTPException(status_code=415, detail="Only image snapshots are supported for pose analysis")

    raw = await media.read()
    if not raw:
        raise HTTPException(status_code=400, detail="media file is required")
    if len(raw) > 8 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="media file is too large; max 8MB")

    try:
        image = _Image.open(_io.BytesIO(raw))
        if image.mode != "RGB":
            image = image.convert("RGB")
        original_size = {"width": image.width, "height": image.height}
        image.thumbnail((1024, 1024), _Image.Resampling.LANCZOS)
        buffer = _io.BytesIO()
        image.save(buffer, format="JPEG", quality=85, optimize=True)
        image_base64 = base64.b64encode(buffer.getvalue()).decode("utf-8")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid image file: {exc}")

    system_prompt = """You are a certified strength coach and exercise form analyst.
Analyze ONE still image from a workout set. Be conservative: if body joints or the exercise are not clearly visible, lower confidence and ask for a better angle.

Return ONLY JSON with this exact shape:
{
  "exercise_type": "string",
  "overall_score": 0,
  "risk_level": "low|medium|high",
  "rep_detected": true,
  "phase": "setup|eccentric|bottom|concentric|lockout|unknown",
  "key_findings": ["short finding"],
  "corrections": [
    {"issue": "short issue", "cue": "short coaching cue", "severity": "low|medium|high"}
  ],
  "confidence": 0.0,
  "notes": "short note"
}

Rules:
- Do not diagnose medical conditions.
- Do not claim exact joint angles unless clearly visible.
- Focus on alignment, range of motion, control, and safety.
- If the image does not show a person exercising, return overall_score 0, risk_level high, confidence 0.1."""

    user_prompt = f"""Exercise type: {exercise_type}
User ID: {user_id}
Analyze this snapshot and return strict JSON only."""

    try:
        model_name = os.getenv("GROQ_VISION_MODEL", getattr(vision, "model_name", "llama-3.2-11b-vision-preview"))
        response = vision.client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": user_prompt},
                        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_base64}"}},
                    ],
                },
            ],
            response_format={"type": "json_object"},
            temperature=0.1,
            max_tokens=700,
        )

        raw_text = response.choices[0].message.content or "{}"
        result = _json.loads(raw_text)
        result["exercise_type"] = result.get("exercise_type") or exercise_type
        result["model"] = model_name
        result["image_size"] = original_size
        result["analyzed_at"] = datetime.now().isoformat()
        return result
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Pose analysis failed: {exc}")


# ── v2.1: Natural Language Food Logging ─────────────────────────────────────
@app.post("/log-food-natural")
async def log_food_natural(body: dict):
    """
    v2.1 — Parse a free-text food log into structured nutrition data.
    Input:  { "text": "Sáng ăn 2 trứng luộc và 1 bát phở bò", "meal_time": "breakfast" }
    Output: { "items": [...], "total_calories": ..., "macros": {...}, "meal_time": "..." }
    """
    import json as _json, os as _os, httpx as _httpx
    from openai import OpenAI as _OAI

    text      = str(body.get("text", "")).strip()
    meal_time = str(body.get("meal_time", "unknown"))
    if not text:
        raise HTTPException(status_code=400, detail="text is required")

    api_key = _os.getenv("GROQ_API_KEY")
    client  = _OAI(base_url="https://api.groq.com/openai/v1", api_key=api_key,
                   http_client=_httpx.Client())

    system_prompt = """Bạn là chuyên gia dinh dưỡng. Phân tích đoạn text mô tả bữa ăn thành JSON.
RULES:
- Trả về ONLY JSON, không markdown.
- Với mỗi món ăn: name_vi (tên Việt), quantity_g (gram ước tính), calories, protein_g, carb_g, fat_g.
- Nếu không đủ thông tin khẩu phần, ước tính theo khẩu phần tiêu chuẩn Việt Nam.
- Tổng hợp macro toàn bữa vào "total".

OUTPUT FORMAT:
{"meal_time":"...","items":[{"name_vi":"...","quantity_g":...,"calories":...,"protein_g":...,"carb_g":...,"fat_g":...}],"total":{"calories":...,"protein_g":...,"carb_g":...,"fat_g":...},"confidence":"high|medium|low","notes":"..."}"""

    try:
        resp = client.chat.completions.create(
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": f"Bữa ăn ({meal_time}): {text}"},
            ],
            temperature=0.1,
            max_tokens=600,
        )
        raw = resp.choices[0].message.content
        # Strip markdown fences if any
        for fence in ["```json", "```"]:
            if fence in raw:
                raw = raw.split(fence)[1].split("```")[0].strip()
                break
        result = _json.loads(raw)
        result["meal_time"] = meal_time
        result["source_text"] = text
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Natural language parsing failed: {e}")


# ── v2.2: Auto-Regulation — adjust next week based on last week's performance ─
@app.post("/auto-regulate")
async def auto_regulate(body: dict):
    """
    v2.2 — Read last week's actual performance and suggest next week adjustments.
    Input: {
      "user_profile": {...},
      "last_week_log": [
        {"day": 1, "session": "upper_push", "completed_sets": 3, "rpe": 8,
         "notes": "vai đau nhẹ", "weight_change_kg": -0.3}
      ],
      "current_week": 2,
      "total_weeks": 4
    }
    Output: {
      "adjustments": [...],
      "template_patch": {"base_sets_delta": 0, "base_reps_delta": 0, "base_rest_seconds_delta": 0},
      "next_phase": "...",
      "deload_recommended": bool,
      "reasoning": "..."
    }
    """
    import json as _json, os as _os, httpx as _httpx
    from openai import OpenAI as _OAI

    user_profile     = body.get("user_profile", {})
    current_template = body.get("current_template", {})
    last_week        = body.get("last_week_log", [])
    week_summary     = body.get("week_summary", {})
    preferences      = body.get("preferences", {})
    current_week     = int(body.get("current_week", 1))
    total_weeks      = int(body.get("total_weeks", 4))

    if not last_week:
        raise HTTPException(status_code=400, detail="last_week_log is required")

    api_key = _os.getenv("GROQ_API_KEY")
    client  = _OAI(base_url="https://api.groq.com/openai/v1", api_key=api_key,
                   http_client=_httpx.Client())

    # Auto-derive next week's base phase
    from app.ai.workout_planner import WorkoutPlanner
    _, next_phase = WorkoutPlanner._get_phase(current_week + 1)

    system_prompt = f"""Bạn là HLV cá nhân (NSCA-CSCS). Phân tích log tuần {current_week} và đưa ra điều chỉnh cho tuần {current_week + 1}/{total_weeks}.
Phase tiếp theo mặc định: {next_phase}.

PHÂN TÍCH:
- RPE 1-10: 1-5 = quá nhẹ → tăng tải; 6-7 = vừa; 8-9 = vừa sức; 10 = quá nặng → giảm tải.
- Bỏ buổi (no session log) → note trong adjustments.
- Chấn thương/đau → đề xuất thay bài hoặc giảm tải nhóm cơ đó.
- Cân giảm > 1kg/tuần (weight_loss goal) → OK. > 1.5kg → khuyến nghị tăng calo.
- Cân tăng > 0.5kg/tuần (muscle_gain goal) → có thể tăng surplus.

PATCH RULES:
- Return bounded numeric deltas only. Do not rewrite the full template.
- base_sets_delta: integer from -1 to +1.
- base_reps_delta: integer from -2 to +2.
- base_rest_seconds_delta: one of -15, 0, +15, +30.
- If avg fatigue >= 8 or pain is mentioned: reduce sets or increase rest.
- If completion < 70%: simplify by reducing sets/reps.
- If completion > 90% and avg fatigue <= 6: add reps or reduce rest slightly.
- If preferences.skipped_exercises has repeated exercises: prefer exercise_swap instead of increasing load.
- If work_schedule or meal_prep_time suggests a busy user: keep volume realistic and favor adherence.

OUTPUT FORMAT (JSON only, no markdown):
{{"next_phase":"...","deload_recommended":false,"template_patch":{{"base_sets_delta":0,"base_reps_delta":0,"base_rest_seconds_delta":0}},"adjustments":[{{"area":"sets|reps|rest|exercise_swap|nutrition","change":"...","reason":"..."}}],"motivation_note":"...","reasoning":"..."}}"""

    try:
        resp = client.chat.completions.create(
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"User: {_json.dumps(user_profile, ensure_ascii=False)}\n\nPreferences:\n{_json.dumps(preferences, ensure_ascii=False)}\n\nWeek summary:\n{_json.dumps(week_summary, ensure_ascii=False)}\n\nCurrent template:\n{_json.dumps(current_template, ensure_ascii=False)}\n\nLog tuần {current_week}:\n{_json.dumps(last_week, ensure_ascii=False, indent=2)}"},
            ],
            temperature=0.3,
            max_tokens=700,
        )
        raw = resp.choices[0].message.content
        for fence in ["```json", "```"]:
            if fence in raw:
                raw = raw.split(fence)[1].split("```")[0].strip()
                break
        result = _json.loads(raw)
        result["current_week"] = current_week
        result["evaluated_week"] = current_week
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Auto-regulation failed: {e}")


# User Preference Endpoints
@app.post("/preferences/dislike-food")
async def dislike_food(user_id: str, food_name: str, reason: Optional[str] = None):
    """Mark a food as disliked"""
    preference_store.add_disliked_food(user_id, food_name, reason)
    return {"success": True, "message": f"Marked {food_name} as disliked"}


@app.post("/preferences/skip-exercise")
async def skip_exercise(user_id: str, exercise_name: str, reason: Optional[str] = None):
    """Mark an exercise as skipped"""
    preference_store.add_skipped_exercise(user_id, exercise_name, reason)
    return {"success": True, "message": f"Marked {exercise_name} as skipped"}


@app.post("/preferences/rate-plan")
async def rate_plan(user_id: str, plan_id: str, rating: int, feedback: Optional[str] = None):
    """Rate a generated plan (1-5 stars)"""
    if rating < 1 or rating > 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
    preference_store.rate_plan(user_id, plan_id, rating, feedback)
    return {"success": True, "message": f"Rated plan {plan_id} with {rating} stars"}


@app.post("/preferences/meal-feedback")
async def meal_feedback(user_id: str, meal_name: str, day: str, feedback: str):
    """Add feedback about a specific meal"""
    preference_store.add_meal_feedback(user_id, meal_name, day, feedback)
    return {"success": True, "message": "Meal feedback recorded"}


@app.post("/preferences/workout-feedback")
async def workout_feedback(user_id: str, exercise_name: str, day: str, feedback: str):
    """Add feedback about a specific workout/exercise"""
    preference_store.add_workout_feedback(user_id, exercise_name, day, feedback)
    return {"success": True, "message": "Workout feedback recorded"}


@app.get("/preferences/{user_id}")
async def get_preferences(user_id: str):
    """Get all preferences for a user"""
    return preference_store.get_user_preferences(user_id)


@app.get("/preferences/{user_id}/patterns")
async def get_preference_patterns(user_id: str):
    """Get negative feedback patterns for a user"""
    return preference_store.get_negative_feedback_patterns(user_id)


@app.delete("/preferences/{user_id}")
async def clear_preferences(user_id: str):
    """Clear all preferences for a user"""
    preference_store.clear_user_preferences(user_id)
    return {"success": True, "message": "All preferences cleared"}


# Progression Tracker Endpoints
@app.post("/progression/record-workout")
async def record_workout(
    user_id: str,
    day: str,
    exercises: List[dict],
    rating: Optional[int] = None,
    notes: Optional[str] = None
):
    """Record a completed workout with exercise details"""
    from app.schemas.workout import Exercise
    
    exercise_objects = [Exercise(**ex) for ex in exercises]
    progression_tracker.record_workout_completion(user_id, day, exercise_objects, rating, notes)
    return {"success": True, "message": "Workout recorded"}


@app.post("/progression/record-weight")
async def record_weight(user_id: str, weight: float, date: Optional[str] = None):
    """Record user weight for progress tracking"""
    progression_tracker.record_weight(user_id, weight, date)
    return {"success": True, "message": "Weight recorded"}


@app.post("/progression/advance-week")
async def advance_week(user_id: str):
    """Advance to next training week"""
    progression_tracker.advance_week(user_id)
    return {"success": True, "message": "Week advanced"}


@app.get("/progression/{user_id}")
async def get_progression(user_id: str):
    """Get progression data for a user"""
    return progression_tracker.get_user_progression(user_id)


@app.get("/progression/{user_id}/weekly-summary")
async def get_weekly_summary(user_id: str):
    """Get summary of current week's progress"""
    return progression_tracker.get_weekly_summary(user_id)


@app.get("/progression/{user_id}/adjustment/{exercise_name}")
async def get_exercise_adjustment(user_id: str, exercise_name: str):
    """Get progression adjustment for a specific exercise"""
    return progression_tracker.get_progression_adjustment(user_id, exercise_name)


# Price Database Endpoints
@app.get("/prices/ingredient")
async def get_ingredient_price(ingredient_name: str, amount: str = "100g"):
    """Get price for a specific ingredient"""
    price = PriceDatabase.get_price(ingredient_name, amount)
    if price is None:
        raise HTTPException(status_code=404, detail=f"Ingredient '{ingredient_name}' not found in database")
    return {"ingredient": ingredient_name, "amount": amount, "price_vnd": price}


@app.post("/prices/estimate-meal")
async def estimate_meal_cost(ingredients: List[dict]):
    """Estimate total cost for a meal's ingredients"""
    total_cost = PriceDatabase.estimate_meal_cost(ingredients)
    return {"ingredients": ingredients, "total_cost_vnd": total_cost}


@app.get("/prices/category/{category}")
async def get_ingredients_by_category(category: str, budget: int = 10000):
    """Get affordable ingredients within budget for a category"""
    ingredients = PriceDatabase.get_ingredients_by_category(category, budget)
    return {"category": category, "budget": budget, "affordable_ingredients": ingredients}


@app.get("/prices/alternative")
async def suggest_alternative(ingredient_name: str, budget: int):
    """Suggest a cheaper alternative ingredient within budget"""
    alternative = PriceDatabase.suggest_affordable_alternative(ingredient_name, budget)
    if alternative is None:
        raise HTTPException(status_code=404, detail=f"No affordable alternative found for '{ingredient_name}'")
    return {"original": ingredient_name, "budget": budget, "alternative": alternative}


# Plan Versioning Endpoints
@app.post("/plans/save")
async def save_plan_version(user_id: str, plan_id: str, plan_data: dict, parent_plan_id: Optional[str] = None, change_summary: Optional[str] = None):
    """Save a plan version"""
    version_id = plan_versioning.save_plan(user_id, plan_id, plan_data, parent_plan_id, change_summary)
    return {"success": True, "version_id": version_id}


@app.get("/plans/{user_id}/history/{plan_id}")
async def get_plan_history(user_id: str, plan_id: str):
    """Get all versions of a specific plan"""
    return plan_versioning.get_plan_history(user_id, plan_id)


@app.get("/plans/{user_id}")
async def get_all_user_plans(user_id: str):
    """Get all plans for a user"""
    return plan_versioning.get_all_user_plans(user_id)


@app.get("/plans/version/{version_id}")
async def get_plan_version(version_id: str):
    """Get a specific plan version"""
    version = plan_versioning.get_plan_version(version_id)
    if not version:
        raise HTTPException(status_code=404, detail="Plan version not found")
    return version


@app.get("/plans/compare")
async def compare_plans(version_id_1: str, version_id_2: str):
    """Compare two plan versions"""
    return plan_versioning.compare_plans(version_id_1, version_id_2)


@app.delete("/plans/{user_id}/{plan_id}")
async def delete_plan_history(user_id: str, plan_id: str):
    """Delete all versions of a plan"""
    success = plan_versioning.delete_plan_history(user_id, plan_id)
    if not success:
        raise HTTPException(status_code=404, detail="Plan not found")
    return {"success": True, "message": f"Deleted all versions of plan {plan_id}"}


@app.post("/chat")
async def chat(request: dict):
    """
    General AI Coach chat endpoint
    """
    try:
        user_id = request.get("user_id")
        message = request.get("message")
        history = request.get("history", [])
        user_context = request.get("user_context", {})
        
        if not message:
            raise HTTPException(status_code=400, detail="Message is required")
            
        # Get user preferences if available
        preferences = preference_store.get_user_preferences(user_id) if user_id else {}
        
        # Call planner for chat
        response = planner.chat(message, history, preferences, user_context)
        
        return {
            "success": True,
            "response": response,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat failed: {str(e)}")


@app.post("/suggest-dishes")
async def suggest_dishes(request: dict):
    """
    Gợi ý món ăn nấu được từ nguyên liệu người dùng nhập.
    Body: { "ingredients": "mực, hành, cà chua", "count": 4 }
    """
    try:
        ingredients = (request.get("ingredients") or "").strip()
        if not ingredients:
            raise HTTPException(status_code=400, detail="ingredients is required")
        count = int(request.get("count", 4) or 4)
        dishes = planner.suggest_dishes_from_ingredients(ingredients, count)
        return {"success": True, "dishes": dishes, "timestamp": datetime.now().isoformat()}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Suggest dishes failed: {str(e)}")


@app.post("/suggest-shopping")
async def suggest_shopping(request: dict):
    """
    Gợi ý nên mua thêm gì dựa trên tủ lạnh hiện có + ngân sách.
    Body: { "inventory": "trứng, gạo", "budget": 80000, "count": 6 }
    """
    try:
        inventory = (request.get("inventory") or "").strip()
        budget = int(request.get("budget", 0) or 0)
        count = int(request.get("count", 6) or 6)
        items = planner.suggest_shopping_list(inventory, budget, count)
        return {"success": True, "items": items, "timestamp": datetime.now().isoformat()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Suggest shopping failed: {str(e)}")


if __name__ == "__main__":
    print("🚀 Starting Fitness AI Service")
    print("🤖 AI Provider: Groq (Llama 3.3 & 3.2 Vision)")
    print("📡 Available endpoints:")
    print("  POST /analyze-user        - Analyze user profile")
    print("  POST /plan                - Generate nutrition plan (Model 2)")
    print("  POST /full-plan           - Generate integrated meal + workout plan")
    print("  POST /track-food          - Track food from image (Model 3)")
    print("  POST /track-food-base64   - Track food from base64 image")
    print("  POST /adjust-plan         - Adjust meal plan")
    print("  POST /cheat-meal          - Handle cheat meals")
    print("  GET  /budget-foods/{tier} - Get budget food recommendations")
    print("  GET  /sample-profiles     - Get test profiles")
    print("  GET  /health              - Health check")
    print()
    print("  POST /preferences/dislike-food       - Mark food as disliked")
    print("  POST /preferences/skip-exercise       - Mark exercise as skipped")
    print("  POST /preferences/rate-plan           - Rate a plan (1-5 stars)")
    print("  POST /preferences/meal-feedback       - Add meal feedback")
    print("  POST /preferences/workout-feedback    - Add workout feedback")
    print("  GET  /preferences/{user_id}           - Get user preferences")
    print("  GET  /preferences/{user_id}/patterns  - Get feedback patterns")
    print("  DELETE /preferences/{user_id}         - Clear preferences")
    print()
    print("  POST /progression/record-workout      - Record completed workout")
    print("  POST /progression/record-weight       - Record user weight")
    print("  POST /progression/advance-week        - Advance to next week")
    print("  GET  /progression/{user_id}            - Get progression data")
    print("  GET  /progression/{user_id}/weekly-summary - Get weekly summary")
    print("  GET  /progression/{user_id}/adjustment/{exercise} - Get exercise adjustment")
    print()
    print("  GET  /prices/ingredient               - Get ingredient price")
    print("  POST /prices/estimate-meal             - Estimate meal cost")
    print("  GET  /prices/category/{category}       - Get affordable ingredients")
    print("  GET  /prices/alternative              - Get cheaper alternative")
    print()
    print("  POST /plans/save                       - Save plan version")
    print("  GET  /plans/{user_id}                  - Get all user plans")
    print("  GET  /plans/{user_id}/history/{plan_id} - Get plan history")
    print("  GET  /plans/version/{version_id}       - Get specific version")
    print("  GET  /plans/compare                    - Compare two versions")
    print("  DELETE /plans/{user_id}/{plan_id}      - Delete plan history")
    print()
    print("  GET  /docs                - Swagger UI documentation")
    print()
    print("⚠️  Required environment variable:")
    print("  - GROQ_API_KEY: Your Groq API key")
    print("    Get from: https://console.groq.com/keys")
    print()
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8001,  # Use different port from Model 1
        reload=True,
        log_level="info"
    )
