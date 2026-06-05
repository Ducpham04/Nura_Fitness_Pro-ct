"""
Plank exercise analyzer
"""
from typing import Dict, List, Tuple, Optional
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.schemas import ExerciseMetrics, FormError, ExerciseState
from analyzers.base import ExerciseAnalyzer
import thresholds as T
import time


class PlankAnalyzer(ExerciseAnalyzer):
    """Analyzer for plank exercises (time-based, not rep-based)"""
    
    # MediaPipe landmark indices
    LEFT_SHOULDER = 11
    RIGHT_SHOULDER = 12
    LEFT_ELBOW = 13
    RIGHT_ELBOW = 14
    LEFT_HIP = 23
    RIGHT_HIP = 24
    LEFT_ANKLE = 27
    RIGHT_ANKLE = 28
    NOSE = 0
    
    def __init__(self):
        super().__init__()
        self.start_time: Optional[float] = None
        self.hold_time: float = 0.0
        self.is_holding: bool = False
    
    def analyze(self, landmarks: List[Tuple[float, float, float]], 
                image_width: int, image_height: int) -> ExerciseMetrics:
        """Analyze plank form and track hold time"""
        
        if len(landmarks) < 33:
            return ExerciseMetrics(
                reps=0,  # Plank doesn't count reps
                state=self.current_state,
                quality_score=0.0,
                form_errors=[FormError(
                    type="insufficient_landmarks",
                    message="Not enough body landmarks detected",
                    severity="error"
                )]
            )
        
        # Get key points
        nose = landmarks[self.NOSE]
        left_shoulder = landmarks[self.LEFT_SHOULDER]
        right_shoulder = landmarks[self.RIGHT_SHOULDER]
        left_elbow = landmarks[self.LEFT_ELBOW]
        right_elbow = landmarks[self.RIGHT_ELBOW]
        left_hip = landmarks[self.LEFT_HIP]
        right_hip = landmarks[self.RIGHT_HIP]
        left_ankle = landmarks[self.LEFT_ANKLE]
        right_ankle = landmarks[self.RIGHT_ANKLE]
        
        # Calculate average points
        shoulder = self.mid(left_shoulder, right_shoulder)
        elbow = self.mid(left_elbow, right_elbow)
        hip = self.mid(left_hip, right_hip)
        ankle = self.mid(left_ankle, right_ankle)
        
        # Calculate key angles
        body_angle = self.calculate_angle(shoulder, hip, ankle)
        hip_angle = self.calculate_angle(shoulder, hip, ankle)
        
        # Validate form
        is_valid, form_errors = self.validate_form(landmarks, image_width, image_height)
        
        # Update state based on form validity
        if is_valid and body_angle > T.PLANK_HOLD:
            if not self.is_holding:
                self.is_holding = True
                self.start_time = time.time()
            self._update_state(ExerciseState.HOLDING)
            
            # Update hold time
            if self.start_time:
                self.hold_time = time.time() - self.start_time
        else:
            self.is_holding = False
            self.start_time = None
            self._update_state(ExerciseState.REST)
        
        # Calculate angles dict
        angles = {
            "body": body_angle,
            "hip": hip_angle
        }
        
        # Calculate quality score
        ideal_angles = {
            "body": (160.0, 180.0),  # Body should be straight
            "hip": (160.0, 180.0)  # Hip should be in line
        }
        quality_score = self._calculate_quality_score(form_errors, angles, ideal_angles)
        
        # For plank, we use hold_time as a metric instead of reps
        # Store it in angles for now
        angles["hold_time_seconds"] = self.hold_time
        
        return ExerciseMetrics(
            reps=int(self.hold_time),  # Convert seconds to "reps" for display
            state=self.current_state,
            quality_score=quality_score,
            form_errors=form_errors,
            angles=angles,
            is_valid_form=is_valid
        )
    
    def validate_form(self, landmarks: List[Tuple[float, float, float]], 
                     image_width: int, image_height: int) -> Tuple[bool, List[FormError]]:
        """Validate plank form"""
        errors = []
        
        if len(landmarks) < 33:
            return False, [FormError(
                type="insufficient_landmarks",
                message="Not enough body landmarks detected",
                severity="error"
            )]
        
        # Get key points
        nose = landmarks[self.NOSE]
        left_shoulder = landmarks[self.LEFT_SHOULDER]
        right_shoulder = landmarks[self.RIGHT_SHOULDER]
        left_elbow = landmarks[self.LEFT_ELBOW]
        right_elbow = landmarks[self.RIGHT_ELBOW]
        left_hip = landmarks[self.LEFT_HIP]
        right_hip = landmarks[self.RIGHT_HIP]
        left_ankle = landmarks[self.LEFT_ANKLE]
        right_ankle = landmarks[self.RIGHT_ANKLE]
        
        # Average points
        shoulder = self.mid(left_shoulder, right_shoulder)
        elbow = self.mid(left_elbow, right_elbow)
        hip = self.mid(left_hip, right_hip)
        ankle = self.mid(left_ankle, right_ankle)
        
        # Check body alignment (shoulder-hip-ankle should be straight > 160°)
        body_angle = self.calculate_angle(shoulder, hip, ankle)
        if body_angle < 160.0:
            errors.append(FormError(
                type="body_alignment",
                message=f"Keep your body straight. Current angle: {body_angle:.1f}°",
                severity="error"
            ))
        
        # Check hip position (should not be too high or too low)
        # Hip should be roughly in line with shoulder and ankle
        hip_height_relative = (hip[1] - shoulder[1]) / image_height
        if hip_height_relative < -0.05:  # Hip too high (butt up)
            errors.append(FormError(
                type="hip_position",
                message="Lower your hips. Don't raise your butt.",
                severity="error"
            ))
        elif hip_height_relative > 0.1:  # Hip too low (butt sagging)
            errors.append(FormError(
                type="hip_position",
                message="Raise your hips. Don't let your butt sag.",
                severity="error"
            ))
        
        # Check elbow position (should be under shoulders)
        elbow_shoulder_alignment = abs(elbow[0] - shoulder[0]) / image_width
        if elbow_shoulder_alignment > 0.1:  # More than 10% offset
            errors.append(FormError(
                type="elbow_position",
                message="Keep your elbows directly under your shoulders",
                severity="warning"
            ))
        
        # Check neck alignment (nose should be in line with body)
        neck_angle = self.calculate_angle(
            (nose[0], nose[1]),
            shoulder,
            hip
        )
        if neck_angle < 150.0:
            errors.append(FormError(
                type="neck_alignment",
                message="Keep your neck straight with your back. Don't look up or down.",
                severity="warning"
            ))
        
        return len([e for e in errors if e.severity == "error"]) == 0, errors
    
    def reset(self):
        """Reset counter and state"""
        super().reset()
        self.start_time = None
        self.hold_time = 0.0
        self.is_holding = False

