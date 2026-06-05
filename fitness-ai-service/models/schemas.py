from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum


class ExerciseType(str, Enum):
    PUSH_UP = "push-up"
    SQUAT = "squat"
    PULL_UP = "pull-up"
    SIT_UP = "sit-up"
    PLANK = "plank"


class ExerciseState(str, Enum):
    UP = "up"
    DOWN = "down"
    HOLDING = "holding"
    REST = "rest"
    UNKNOWN = "unknown"


class FormError(BaseModel):
    """Form validation error"""
    type: str = Field(..., description="Error type (e.g., 'body_alignment', 'knee_position')")
    message: str = Field(..., description="Human-readable error message")
    severity: str = Field(default="warning", description="Error severity: 'error', 'warning', 'info'")


class ExerciseMetrics(BaseModel):
    """Metrics for exercise analysis"""
    reps: int = Field(default=0, description="Number of completed repetitions")
    state: ExerciseState = Field(default=ExerciseState.UNKNOWN, description="Current exercise state")
    quality_score: float = Field(default=0.0, ge=0.0, le=100.0, description="Quality score 0-100")
    form_errors: List[FormError] = Field(default_factory=list, description="List of form errors")
    angles: Dict[str, float] = Field(default_factory=dict, description="Key body angles in degrees")
    is_valid_form: bool = Field(default=False, description="Whether current form is valid")
    timestamp: Optional[float] = Field(default=None, description="Timestamp of analysis")


class AnalyzeFrameRequest(BaseModel):
    """Request model for frame analysis"""
    exercise_type: ExerciseType = Field(..., description="Type of exercise to analyze")
    timestamp: Optional[float] = Field(default=None, description="Frame timestamp")


class AnalyzeFrameResponse(BaseModel):
    """Response model matching Spring Boot NotificationResponse format"""
    success: bool = Field(..., description="Whether the analysis was successful")
    message: str = Field(default="Analysis completed", description="Response message")
    data: Optional[ExerciseMetrics] = Field(default=None, description="Exercise metrics data")
    timestamp: Optional[float] = Field(default=None, description="Response timestamp")


class HealthResponse(BaseModel):
    """Health check response"""
    status: str = Field(default="healthy", description="Service status")
    service: str = Field(default="fitness-ai", description="Service name")
    version: str = Field(default="1.0.0", description="Service version")


class ExercisesResponse(BaseModel):
    """Available exercises response"""
    success: bool = Field(default=True)
    message: str = Field(default="Exercises retrieved successfully")
    data: Dict[str, List[str]] = Field(
        default_factory=lambda: {"exercises": ["push-up", "squat", "pull-up", "sit-up", "plank"]}
    )


class WebSocketMessage(BaseModel):
    """WebSocket message from client"""
    frame: str = Field(..., description="Base64 encoded image frame")
    timestamp: float = Field(..., description="Frame timestamp")
    exercise_type: Optional[ExerciseType] = Field(default=None, description="Exercise type")


class WebSocketResponse(BaseModel):
    """WebSocket response to client"""
    success: bool = Field(..., description="Whether the analysis was successful")
    data: Optional[ExerciseMetrics] = Field(default=None, description="Exercise metrics")
    timestamp: float = Field(..., description="Response timestamp")
    error: Optional[str] = Field(default=None, description="Error message if any")






