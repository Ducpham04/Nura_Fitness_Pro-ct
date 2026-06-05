"""
Squat exercise analyzer
"""
from typing import Dict, List, Tuple
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.schemas import ExerciseMetrics, FormError, ExerciseState
from analyzers.base import ExerciseAnalyzer


class SquatAnalyzer(ExerciseAnalyzer):
    """Analyzer for squat exercises"""
    
    # MediaPipe landmark indices
    LEFT_SHOULDER = 11
    RIGHT_SHOULDER = 12
    LEFT_HIP = 23
    RIGHT_HIP = 24
    LEFT_KNEE = 25
    RIGHT_KNEE = 26
    LEFT_ANKLE = 27
    RIGHT_ANKLE = 28
    
    def analyze(self, landmarks: List[Tuple[float, float, float]], 
                image_width: int, image_height: int) -> ExerciseMetrics:
        """Analyze squat form and count reps"""
        
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
        left_shoulder = landmarks[self.LEFT_SHOULDER]
        right_shoulder = landmarks[self.RIGHT_SHOULDER]
        left_hip = landmarks[self.LEFT_HIP]
        right_hip = landmarks[self.RIGHT_HIP]
        left_knee = landmarks[self.LEFT_KNEE]
        right_knee = landmarks[self.RIGHT_KNEE]
        left_ankle = landmarks[self.LEFT_ANKLE]
        right_ankle = landmarks[self.RIGHT_ANKLE]
        
        # Calculate average points
        shoulder = ((left_shoulder[0] + right_shoulder[0]) / 2,
                   (left_shoulder[1] + right_shoulder[1]) / 2)
        hip = ((left_hip[0] + right_hip[0]) / 2,
              (left_hip[1] + right_hip[1]) / 2)
        knee = ((left_knee[0] + right_knee[0]) / 2,
               (left_knee[1] + right_knee[1]) / 2)
        ankle = ((left_ankle[0] + right_ankle[0]) / 2,
                (left_ankle[1] + right_ankle[1]) / 2)
        
        # Calculate key angles
        knee_angle = self.calculate_angle(hip, knee, ankle)
        back_angle = self.calculate_angle(shoulder, hip, knee)
        
        # Check for rep completion
        if self._check_rep_complete(90.0, 160.0, knee_angle):
            self.reps += 1
        
        # Validate form
        is_valid, form_errors = self.validate_form(landmarks, image_width, image_height)
        
        # Calculate angles dict
        angles = {
            "knee": knee_angle,
            "back": back_angle
        }
        
        # Calculate quality score
        ideal_angles = {
            "knee": (85.0, 95.0),  # When down, should be ~90°
            "back": (150.0, 180.0)  # Back should be straight
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
        """Validate squat form"""
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
        shoulder = ((left_shoulder[0] + right_shoulder[0]) / 2,
                   (left_shoulder[1] + right_shoulder[1]) / 2)
        hip = ((left_hip[0] + right_hip[0]) / 2,
              (left_hip[1] + right_hip[1]) / 2)
        knee = ((left_knee[0] + right_knee[0]) / 2,
               (left_knee[1] + right_knee[1]) / 2)
        ankle = ((left_ankle[0] + right_ankle[0]) / 2,
                (left_ankle[1] + right_ankle[1]) / 2)
        
        # Check knee position (knee should not go past toes)
        # In 2D, we check if knee.x is forward of ankle.x
        knee_forward = knee[0] - ankle[0]  # Positive = knee forward
        if knee_forward > 0.1 * image_width:  # More than 10% of image width
            errors.append(FormError(
                type="knee_position",
                message="Keep your knees behind your toes. Don't let knees go forward.",
                severity="error"
            ))
        
        # Check back alignment (shoulder-hip-knee should be > 150°)
        back_angle = self.calculate_angle(shoulder, hip, knee)
        if back_angle < 150.0:
            errors.append(FormError(
                type="back_alignment",
                message=f"Keep your back straight. Current angle: {back_angle:.1f}°",
                severity="error"
            ))
        
        # Check squat depth when DOWN (knee angle should be ~90°)
        knee_angle = self.calculate_angle(hip, knee, ankle)
        if self.current_state == ExerciseState.DOWN:
            if knee_angle > 100.0:
                errors.append(FormError(
                    type="squat_depth",
                    message="Go deeper. Your thighs should be parallel to the floor.",
                    severity="warning"
                ))
        
        # Check foot width (should be about shoulder width)
        shoulder_width = self.calculate_distance(
            (left_shoulder[0], left_shoulder[1]),
            (right_shoulder[0], right_shoulder[1])
        )
        ankle_width = self.calculate_distance(
            (left_ankle[0], left_ankle[1]),
            (right_ankle[0], right_ankle[1])
        )
        if shoulder_width > 0:
            ratio = ankle_width / shoulder_width
            if ratio < 0.8:
                errors.append(FormError(
                    type="foot_width",
                    message="Place your feet wider, about shoulder width apart",
                    severity="info"
                ))
        
        return len([e for e in errors if e.severity == "error"]) == 0, errors

