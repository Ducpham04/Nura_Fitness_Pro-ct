from enum import Enum
from pydantic import BaseModel, Field, validator
from typing import Dict, List, Optional

class SessionType(str, Enum):
    PUSH = "push"
    PULL = "pull"
    LEGS = "legs"
    FULL_BODY = "full_body"
    UPPER = "upper"
    UPPER_BODY = "upper_body"
    LOWER = "lower"
    LOWER_BODY = "lower_body"
    CARDIO = "cardio"
    REST = "rest"
    REST_DAY = "rest_day"

# Minimum exercise count per session type (matches GoalMapper.java + system prompt)
_MIN_EXERCISES: dict = {
    SessionType.FULL_BODY:   4,
    SessionType.UPPER:       3,
    SessionType.UPPER_BODY:  3,
    SessionType.LOWER:       3,
    SessionType.LOWER_BODY:  3,
    SessionType.LEGS:        3,
    SessionType.CARDIO:      2,
}

class Exercise(BaseModel):
    exercise_id: Optional[int] = None
    name: str
    muscle_group: str
    sets: int
    reps: str
    rest_seconds: int
    equipment: str
    tempo: str = "3-0-1"
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

    @validator("exercises", always=True)
    def validate_exercise_count(cls, exercises, values):
        """Reject sessions that violate minimum exercise count rules.

        Rest days are exempt. Called at schema parse time so bad AI
        responses never reach the business logic or database.
        """
        session_type = values.get("session_type")
        is_rest = values.get("is_rest_day", False)

        if is_rest or session_type is None:
            return exercises

        min_count = _MIN_EXERCISES.get(session_type, 0)
        if min_count > 0 and len(exercises) < min_count:
            raise ValueError(
                f"session_type={session_type.value} requires at least {min_count} exercises, "
                f"but only {len(exercises)} provided. "
                f"The API must fail clearly instead of returning an unsafe fallback."
            )
        return exercises

class ProgramTemplate(BaseModel):
    goal: str
    weekly_pattern: List[str] = Field(..., min_items=7, max_items=7)
    exercise_pool: Dict[str, List[int]]
    base_sets: int = Field(default=3, ge=1, le=6)
    base_reps: int = Field(default=12, ge=1, le=30)
    base_rest_seconds: int = Field(default=75, ge=15, le=300)
    progression_rate: float = Field(default=0.10, ge=0, le=0.30)
    duration_minutes: int = Field(default=45, ge=15, le=120)
    intensity: str = "moderate"
    adaptation_notes: List[str] = Field(default_factory=list)
