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
        preferences: List[str] = None
    ) -> List[WorkoutSession]:
        """
        Generate a comprehensive workout plan using AI
        """
        system_prompt = """You are an elite Strength & Conditioning Coach (CSCS). 
Your mission is to design a science-based training program tailored to the user's fitness level, equipment, and goal."""

        user_context = {
            "weight": user_profile.weight,
            "goal": user_profile.goal.value,
            "fitness_level": user_profile.fitness_level.value,
            "days_to_plan": days,
            "available_equipment": available_equipment or ["bodyweight"],
            "intensity_target": workout_intensity,
            "session_duration": duration_minutes,
            "preferences": preferences or []
        }

        prompt = f"""{system_prompt}

TASK: Generate a {days}-day workout plan.

USER CONTEXT:
{json.dumps(user_context, ensure_ascii=False)}

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
            
            workout_sessions = []
            for s in sessions_data:
                exercises = [Exercise(**ex) for ex in s.get("exercises", [])]
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
            
            return workout_sessions

        except Exception as e:
            print(f"❌ Workout Generation Error: {str(e)}")
            return self._get_fallback_sessions(days)

    def _parse_json_response(self, text: str) -> dict:
        try:
            return json.loads(text)
        except:
            for delimiter in ["```json", "```"]:
                if delimiter in text:
                    return json.loads(text.split(delimiter)[1].split("```")[0].strip())
            raise ValueError("Could not parse JSON from AI")

    def _get_fallback_sessions(self, days: int) -> List[WorkoutSession]:
        """Simple fallback if AI fails"""
        sessions = []
        for i in range(1, days + 1):
            is_rest = (i % 4 == 0)
            sessions.append(WorkoutSession(
                day=f"Day {i}",
                day_number=i,
                session_type=SessionType.REST if is_rest else SessionType.FULL_BODY,
                is_rest_day=is_rest,
                duration_minutes=0 if is_rest else 45,
                muscle_groups_targeted=[] if is_rest else ["Toàn thân"],
                estimated_calories_burned=0 if is_rest else 300,
                warmup=["Xoay các khớp", "Chạy nhẹ tại chỗ"] if not is_rest else [],
                exercises=[] if is_rest else [
                    Exercise(name="Pushups", muscle_group="Ngực", sets=3, reps="12", rest_seconds=60, equipment="Bodyweight")
                ],
                cooldown=["Căng cơ toàn thân"] if not is_rest else [],
                notes=["Uống đủ nước"]
            ))
        return sessions