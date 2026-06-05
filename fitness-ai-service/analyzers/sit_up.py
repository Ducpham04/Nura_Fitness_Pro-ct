"""
Sit-up exercise analyzer
"""
from typing import Dict, List, Tuple
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.schemas import ExerciseMetrics, FormError, ExerciseState
from analyzers.base import ExerciseAnalyzer
import thresholds as T


class SitUpAnalyzer(ExerciseAnalyzer):
    """Analyzer for sit-up exercises"""
    
    # MediaPipe landmark indices
    LEFT_SHOULDER = 11
    RIGHT_SHOULDER = 12
    LEFT_HIP = 23
    RIGHT_HIP = 24
    LEFT_KNEE = 25
    RIGHT_KNEE = 26
    LEFT_ANKLE = 27
    RIGHT_ANKLE = 28
    NOSE = 0
    
    def analyze(self, landmarks: List[Tuple[float, float, float]], 
                image_width: int, image_height: int) -> ExerciseMetrics:
        """Analyze sit-up form and count reps"""
        
        if len(landmarks) < 33:
            return ExerciseMetrics(
                reps=self.reps,
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
        left_hip = landmarks[self.LEFT_HIP]
        right_hip = landmarks[self.RIGHT_HIP]
        left_knee = landmarks[self.LEFT_KNEE]
        right_knee = landmarks[self.RIGHT_KNEE]
        left_ankle = landmarks[self.LEFT_ANKLE]
        right_ankle = landmarks[self.RIGHT_ANKLE]
        
        # Calculate average points
        shoulder = self.mid(left_shoulder, right_shoulder)
        hip = self.mid(left_hip, right_hip)
        knee = self.mid(left_knee, right_knee)
        ankle = self.mid(left_ankle, right_ankle)
        
        # Calculate torso angle (shoulder-hip-knee)
        torso_angle = self.calculate_angle(shoulder, hip, knee)
        knee_angle = self.calculate_angle(hip, knee, ankle)
        
        # Check for rep completion
        # UP: torso angle < 60° (body folded)
        # DOWN: torso angle > 140° (back on floor)
        torso_s = self._smooth("rep", torso_angle)  # làm mượt giảm nhiễu
        if torso_s < T.SITUP_UP and self.current_state != ExerciseState.UP:
            self._update_state(ExerciseState.UP)
        elif torso_s > T.SITUP_DOWN and self.current_state == ExerciseState.UP:
            self._update_state(ExerciseState.DOWN)
            self.reps += 1
        
        # Validate form
        is_valid, form_errors = self.validate_form(landmarks, image_width, image_height)
        
        # Calculate angles dict
        angles = {
            "torso": torso_angle,
            "knee": knee_angle
        }
        
        # Calculate quality score
        ideal_angles = {
            "torso": (60.0, 140.0),  # Range during movement
            "knee": (85.0, 95.0)  # Knees should be ~90°
        }
        quality_score = self._calculate_quality_score(form_errors, angles, ideal_angles)
        
        return ExerciseMetrics(
            reps=self.reps,
            state=self.current_state,
            quality_score=quality_score,
            form_errors=form_errors,
            angles=angles,
            is_valid_form=is_valid
        )
    
    def validate_form(self, landmarks: List[Tuple[float, float, float]], 
                     image_width: int, image_height: int) -> Tuple[bool, List[FormError]]:
        """Validate sit-up form"""
        errors = []
        
        if len(landmarks) < 33:
            return False, [FormError(
                type="insufficient_landmarks",
                message="Not enough body landmarks detected",
                severity="error"
            )]
        
        # Get key points
        left_shoulder = landmarks[self.LEFT_SHOULDER]
        right_shoulder = landmarks[self.RIGHT_SHOULDER]
        left_hip = landmarks[self.LEFT_HIP]
        right_hip = landmarks[self.RIGHT_HIP]
        left_knee = landmarks[self.LEFT_KNEE]
        right_knee = landmarks[self.RIGHT_KNEE]
        left_ankle = landmarks[self.LEFT_ANKLE]
        right_ankle = landmarks[self.RIGHT_ANKLE]
        
        # Average points
        shoulder = self.mid(left_shoulder, right_shoulder)
        hip = self.mid(left_hip, right_hip)
        knee = self.mid(left_knee, right_knee)
        ankle = self.mid(left_ankle, right_ankle)
        
        # Check knee angle (should be ~90°)
        knee_angle = self.calculate_angle(hip, knee, ankle)
        if knee_angle < 80.0 or knee_angle > 100.0:
            errors.append(FormError(
                type="knee_angle",
                message="Keep your knees bent at 90 degrees",
                severity="warning"
            ))
        
        # Check if using hands to pull head (nose too close to knees when UP)
        if self.current_state == ExerciseState.UP:
            nose = landmarks[self.NOSE]
            nose_to_knee_distance = self.calculate_distance(
                (nose[0], nose[1]),
                (knee[0], knee[1])
            )
            shoulder_to_knee_distance = self.calculate_distance(
                (shoulder[0], shoulder[1]),
                (knee[0], knee[1])
            )
            if nose_to_knee_distance < 0.3 * shoulder_to_knee_distance:
                errors.append(FormError(
                    type="hand_pull",
                    message="Don't use your hands to pull your head. Use your core muscles.",
                    severity="error"
                ))
        
        # Check back contact when DOWN (should be on floor)
        torso_angle = self.calculate_angle(shoulder, hip, knee)
        if self.current_state == ExerciseState.DOWN and torso_angle < 140.0:
            errors.append(FormError(
                type="back_contact",
                message="Lower your back completely to the floor",
                severity="warning"
            ))
        
        return len([e for e in errors if e.severity == "error"]) == 0, errors

