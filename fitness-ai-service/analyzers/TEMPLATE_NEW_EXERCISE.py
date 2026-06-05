"""
{EXERCISE_NAME} exercise analyzer
Template for creating new exercise analyzers

INSTRUCTIONS:
1. Copy this file and rename to {exercise_name}.py (e.g., lunge.py)
2. Replace {EXERCISE_NAME} with your exercise name (e.g., Lunge)
3. Replace {exercise_name} with lowercase exercise name (e.g., lunge)
4. Implement analyze() and validate_form() methods
5. Register in factory.py
"""
from typing import Dict, List, Tuple
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.schemas import ExerciseMetrics, FormError, ExerciseState
from analyzers.base import ExerciseAnalyzer


class {EXERCISE_NAME}Analyzer(ExerciseAnalyzer):
    """Analyzer for {exercise_name} exercises"""
    
    # MediaPipe landmark indices
    # Reference: https://google.github.io/mediapipe/solutions/pose#pose-landmark-model-blazepose-ghum-7d
    LEFT_SHOULDER = 11
    RIGHT_SHOULDER = 12
    LEFT_ELBOW = 13
    RIGHT_ELBOW = 14
    LEFT_WRIST = 15
    RIGHT_WRIST = 16
    LEFT_HIP = 23
    RIGHT_HIP = 24
    LEFT_KNEE = 25
    RIGHT_KNEE = 26
    LEFT_ANKLE = 27
    RIGHT_ANKLE = 28
    # Add more landmarks as needed
    
    def analyze(self, landmarks: List[Tuple[float, float, float]], 
                image_width: int, image_height: int) -> ExerciseMetrics:
        """
        Analyze {exercise_name} form and count reps
        
        Args:
            landmarks: List of (x, y, z) landmark coordinates from MediaPipe
            image_width: Image width in pixels
            image_height: Image height in pixels
        
        Returns:
            ExerciseMetrics object with reps, state, quality_score, form_errors, etc.
        """
        
        # 1. Check if we have enough landmarks
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
        
        # 2. Extract key points from landmarks
        # TODO: Choose relevant landmarks for your exercise
        left_shoulder = landmarks[self.LEFT_SHOULDER]
        right_shoulder = landmarks[self.RIGHT_SHOULDER]
        left_hip = landmarks[self.LEFT_HIP]
        right_hip = landmarks[self.RIGHT_HIP]
        left_knee = landmarks[self.LEFT_KNEE]
        right_knee = landmarks[self.RIGHT_KNEE]
        left_ankle = landmarks[self.LEFT_ANKLE]
        right_ankle = landmarks[self.RIGHT_ANKLE]
        
        # 3. Calculate average points (if using left/right average)
        shoulder = ((left_shoulder[0] + right_shoulder[0]) / 2,
                   (left_shoulder[1] + right_shoulder[1]) / 2)
        hip = ((left_hip[0] + right_hip[0]) / 2,
              (left_hip[1] + right_hip[1]) / 2)
        knee = ((left_knee[0] + right_knee[0]) / 2,
               (left_knee[1] + right_knee[1]) / 2)
        ankle = ((left_ankle[0] + right_ankle[0]) / 2,
                (left_ankle[1] + right_ankle[1]) / 2)
        
        # 4. Calculate key angles for your exercise
        # TODO: Calculate angles specific to your exercise
        # Example: knee_angle = self.calculate_angle(hip, knee, ankle)
        key_angle = self.calculate_angle(hip, knee, ankle)  # Replace with your angle calculation
        
        # 5. Check for rep completion
        # TODO: Adjust thresholds based on your exercise
        # down_threshold: angle when exercise is at lowest point
        # up_threshold: angle when exercise is at highest point
        # Example: if self._check_rep_complete(90.0, 160.0, key_angle):
        if self._check_rep_complete(90.0, 160.0, key_angle):  # Adjust thresholds
            self.reps += 1
        
        # 6. Validate form
        is_valid, form_errors = self.validate_form(landmarks, image_width, image_height)
        
        # 7. Calculate angles dict (for UI display)
        angles = {
            "key_angle": key_angle,  # Replace with your angle names
            # Add more angles as needed
        }
        
        # 8. Calculate quality score
        # TODO: Define ideal angle ranges for your exercise
        ideal_angles = {
            "key_angle": (85.0, 95.0),  # (min, max) ideal range
            # Add more ideal angles
        }
        quality_score = self._calculate_quality_score(form_errors, angles, ideal_angles)
        
        # 9. Return metrics
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
        """
        Validate {exercise_name} form
        
        Args:
            landmarks: List of (x, y, z) landmark coordinates
            image_width: Image width in pixels
            image_height: Image height in pixels
        
        Returns:
            Tuple of (is_valid, list_of_form_errors)
        """
        errors = []
        
        # 1. Check if we have enough landmarks
        if len(landmarks) < 33:
            return False, [FormError(
                type="insufficient_landmarks",
                message="Not enough body landmarks detected",
                severity="error"
            )]
        
        # 2. Extract key points (same as in analyze())
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
        
        # 3. TODO: Add form validation rules specific to your exercise
        # Examples:
        
        # Example 1: Check body alignment
        # body_angle = self.calculate_angle(shoulder, hip, ankle)
        # if body_angle < 160.0:
        #     errors.append(FormError(
        #         type="body_alignment",
        #         message=f"Keep your body straight. Current angle: {body_angle:.1f}°",
        #         severity="error"
        #     ))
        
        # Example 2: Check knee position
        # knee_angle = self.calculate_angle(hip, knee, ankle)
        # if knee_angle < 160.0:
        #     errors.append(FormError(
        #         type="knee_position",
        #         message="Keep your legs straight",
        #         severity="error"
        #     ))
        
        # Example 3: Check depth when DOWN
        # if self.current_state == ExerciseState.DOWN:
        #     key_angle = self.calculate_angle(hip, knee, ankle)
        #     if key_angle > 100.0:
        #         errors.append(FormError(
        #             type="depth",
        #             message="Go deeper",
        #             severity="warning"
        #         ))
        
        # Example 4: Check position relative to image
        # knee_forward = knee[0] - ankle[0]  # Positive = knee forward
        # if knee_forward > 0.1 * image_width:
        #     errors.append(FormError(
        #         type="knee_position",
        #         message="Keep your knees behind your toes",
        #         severity="error"
        #     ))
        
        # 4. Return validation result
        # Form is valid if there are no "error" severity errors
        return len([e for e in errors if e.severity == "error"]) == 0, errors


