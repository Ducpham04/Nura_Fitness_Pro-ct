from enum import Enum
from pydantic import BaseModel, Field
from typing import List, Optional

class SessionType(str, Enum):
    PUSH = "push"
    PULL = "pull"
    LEGS = "legs"
    FULL_BODY = "full_body"
    UPPER = "upper"
    LOWER = "lower"
    CARDIO = "cardio"
    REST = "rest"

class Exercise(BaseModel):
    name: str
    muscle_group: str
    sets: int
    reps: str
    rest_seconds: int
    equipment: str
    notes: Optional[str] = None

class CardioBlock(BaseModel):
    type: str
    duration_minutes: int
    intensity: str
    notes: Optional[str] = None

class WorkoutSession(BaseModel):
    day: str
    day_number: int
    session_type: SessionType
    is_rest_day: bool
    duration_minutes: int
    muscle_groups_targeted: List[str]
    estimated_calories_burned: int
    warmup: List[str]
    exercises: List[Exercise]
    cardio: Optional[CardioBlock] = None
    cooldown: List[str]
    notes: List[str]
