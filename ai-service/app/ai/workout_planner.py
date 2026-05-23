"""
AI Workout Planner - Generates training schedules with Groq (Llama 3)
"""
import os
import json
import time
from typing import List, Dict, Optional
from ..schemas.workout import WorkoutSession, SessionType, Exercise, CardioBlock
from ..schemas.nutrition import UserProfile

class WorkoutPlanner:
    """
    AI Personal Trainer powered by Groq (Llama 3 70B)
    """
    
    def __init__(self):
        """Initialize Groq client"""
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise ValueError("GROQ_API_KEY environment variable not set")
        
        try:
            import httpx
            from openai import OpenAI
            # Ensure no proxy environment variables interfere with OpenAI client
            os.environ.pop("HTTP_PROXY", None)
            os.environ.pop("HTTPS_PROXY", None)
            os.environ.pop("ALL_PROXY", None)
            
            self.client_type = "groq"
            self.client = OpenAI(
                base_url="https://api.groq.com/openai/v1",
                api_key=api_key,
                http_client=httpx.Client()
            )
            self.model_name = "llama-3.1-8b-instant"
        except Exception as e:
            print(f"❌ Could not initialize Groq client for workout planner: {e}")
            raise e

    def generate_plan(
        self, 
        user_profile: UserProfile, 
        days: int,
        available_equipment: List[str] = None,
        workout_intensity: str = "moderate",
        duration_minutes: int = 45,
        preferences: List[str] = None,
        allowed_exercises: List[Dict] = None,
        current_injuries: str = ""
    ) -> List[WorkoutSession]:
        """
        Generate a comprehensive workout plan using AI
        """
        allowed_exercises = allowed_exercises or []
        if not allowed_exercises:
            raise ValueError("allowed_exercises is required; Java must pre-filter the medical exercise catalog")

        system_prompt = """You are an elite Strength & Conditioning Coach (CSCS).
Your mission is to arrange a training schedule from a medically pre-filtered exercise catalog.
You must NOT invent exercises. Use exercise_id values only from ALLOWED_EXERCISES.
Sets, reps, and rest_seconds must be copied from the catalog baseline unless you reduce volume for safety.
You must return exactly the requested number of sessions. Each session must have day_number from 1 to days_to_plan."""

        user_context = {
            "weight": user_profile.weight,
            "goal": user_profile.goal.value,
            "fitness_level": user_profile.fitness_level.value,
            "days_to_plan": days,
            "available_equipment": available_equipment or ["bodyweight"],
            "intensity_target": workout_intensity,
            "session_duration": duration_minutes,
            "preferences": preferences or [],
            "current_injuries": current_injuries or "",
        }

        prompt = f"""{system_prompt}

TASK: Generate exactly {days} sessions for a {days}-day workout plan. Missing days are invalid.

USER CONTEXT:
{json.dumps(user_context, ensure_ascii=False)}

ALLOWED_EXERCISES - USE ONLY THESE IDS:
{json.dumps(allowed_exercises, ensure_ascii=False)}

OUTPUT FORMAT - STRICT JSON ONLY:
{{
    "sessions": [
        {{
            "day": "Thứ Hai",
            "day_number": 1,
            "session_type": "push",
            "is_rest_day": false,
            "duration_minutes": 60,
            "muscle_groups_targeted": ["Chest", "Shoulders", "Triceps"],
            "estimated_calories_burned": 400,
            "warmup": ["5m light cardio", "Arm circles"],
            "exercises": [
                {{
                    "exercise_id": 101,
                    "name": "Bench Press",
                    "muscle_group": "Chest",
                    "sets": 3,
                    "reps": "8-10",
                    "rest_seconds": 90,
                    "equipment": "Barbell",
                    "notes": "Control the weight"
                }}
            ],
            "cardio": null,
            "cooldown": ["Stretching"],
            "notes": ["Focus on form"]
        }}
    ]
 }}
"""

        try:
            response = self.client.chat.completions.create(
                model=self.model_name,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"},
                temperature=0.7
            )
            response_text = response.choices[0].message.content
            
            ai_response = self._parse_json_response(response_text)
            sessions_data = ai_response.get("sessions", [])
            allowed_by_id = {int(e["exercise_id"]): e for e in allowed_exercises}
            
            workout_sessions = []
            for s in sessions_data:
                exercises = []
                for ex in s.get("exercises", []):
                    exercise_id = ex.get("exercise_id")
                    if exercise_id is None or int(exercise_id) not in allowed_by_id:
                        continue
                    catalog_ex = allowed_by_id[int(exercise_id)]
                    exercises.append(Exercise(
                        exercise_id=int(exercise_id),
                        name=catalog_ex.get("exercise_name") or ex.get("name"),
                        muscle_group=catalog_ex.get("primary_muscle") or ex.get("muscle_group") or "Full Body",
                        sets=max(1, min(int(ex.get("sets", catalog_ex.get("default_sets", 1))), int(catalog_ex.get("default_sets", 1)))),
                        reps=str(ex.get("reps", catalog_ex.get("default_reps", 1))),
                        rest_seconds=max(int(ex.get("rest_seconds", catalog_ex.get("default_rest_seconds", 60))), int(catalog_ex.get("default_rest_seconds", 60))),
                        equipment=catalog_ex.get("required_equipment") or ex.get("equipment") or "BODYWEIGHT",
                        notes=ex.get("notes")
                    ))
                if not s.get("is_rest_day") and not exercises:
                    continue
                cardio = CardioBlock(**s["cardio"]) if s.get("cardio") else None
                
                workout_sessions.append(WorkoutSession(
                    day=s["day"],
                    day_number=s["day_number"],
                    session_type=SessionType(s["session_type"]),
                    is_rest_day=s["is_rest_day"],
                    duration_minutes=s["duration_minutes"],
                    muscle_groups_targeted=s["muscle_groups_targeted"],
                    estimated_calories_burned=s["estimated_calories_burned"],
                    warmup=s["warmup"],
                    exercises=exercises,
                    cardio=cardio,
                    cooldown=s["cooldown"],
                    notes=s["notes"]
                ))
            
            return self._ensure_session_count(workout_sessions, days, allowed_exercises)

        except Exception as e:
            print(f"❌ Workout Generation Error: {str(e)}")
            return self._get_fallback_sessions(days, allowed_exercises)

    def _ensure_session_count(
        self,
        sessions: List[WorkoutSession],
        days: int,
        allowed_exercises: List[Dict]
    ) -> List[WorkoutSession]:
        """Guarantee the API returns exactly one session per requested day."""
        by_day = {
            int(session.day_number): session
            for session in sessions
            if 1 <= int(session.day_number) <= days
        }
        fallback_by_day = {
            session.day_number: session
            for session in self._get_fallback_sessions(days, allowed_exercises)
        }
        normalized = []
        for day in range(1, days + 1):
            session = by_day.get(day) or fallback_by_day[day]
            session.day_number = day
            if not session.day:
                session.day = f"Day {day}"
            normalized.append(session)
        return normalized

    def _parse_json_response(self, text: str) -> dict:
        try:
            return json.loads(text)
        except:
            for delimiter in ["```json", "```"]:
                if delimiter in text:
                    return json.loads(text.split(delimiter)[1].split("```")[0].strip())
            raise ValueError("Could not parse JSON from AI")

    def _get_fallback_sessions(self, days: int, allowed_exercises: List[Dict] = None) -> List[WorkoutSession]:
        """Simple fallback if AI fails"""
        allowed_exercises = allowed_exercises or []
        fallback = allowed_exercises[0] if allowed_exercises else None
        sessions = []
        for i in range(1, days + 1):
            is_rest = (i % 4 == 0)
            fallback_exercise = []
            if not is_rest and fallback:
                fallback_exercise = [
                    Exercise(
                        exercise_id=int(fallback["exercise_id"]),
                        name=fallback.get("exercise_name", "Safe Exercise"),
                        muscle_group=fallback.get("primary_muscle") or "Full Body",
                        sets=int(fallback.get("default_sets", 1)),
                        reps=str(fallback.get("default_reps", 1)),
                        rest_seconds=int(fallback.get("default_rest_seconds", 60)),
                        equipment=fallback.get("required_equipment") or "BODYWEIGHT",
                    )
                ]
            sessions.append(WorkoutSession(
                day=f"Day {i}",
                day_number=i,
                session_type=SessionType.REST if is_rest else SessionType.FULL_BODY,
                is_rest_day=is_rest,
                duration_minutes=0 if is_rest else 45,
                muscle_groups_targeted=[] if is_rest else ["Toàn thân"],
                estimated_calories_burned=0 if is_rest else 300,
                warmup=["Xoay các khớp", "Chạy nhẹ tại chỗ"] if not is_rest else [],
                exercises=[] if is_rest else fallback_exercise,
                cooldown=["Căng cơ toàn thân"] if not is_rest else [],
                notes=["Uống đủ nước"]
            ))
        return sessions
