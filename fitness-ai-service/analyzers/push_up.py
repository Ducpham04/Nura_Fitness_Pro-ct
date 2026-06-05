"""
Push-up exercise analyzer
"""
from typing import Dict, List, Tuple
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.schemas import ExerciseMetrics, FormError, ExerciseState
from analyzers.base import ExerciseAnalyzer


class PushUpAnalyzer(ExerciseAnalyzer):
    """Analyzer for push-up exercises"""
    
    # MediaPipe landmark indices
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
    
    def analyze(self, landmarks: List[Tuple[float, float, float]], 
                image_width: int, image_height: int) -> ExerciseMetrics:
        """Analyze push-up form and count reps"""
        
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
        
        # Get key points (use average of left/right)
        left_shoulder = landmarks[self.LEFT_SHOULDER]
        right_shoulder = landmarks[self.RIGHT_SHOULDER]
        left_elbow = landmarks[self.LEFT_ELBOW]
        right_elbow = landmarks[self.RIGHT_ELBOW]
        left_wrist = landmarks[self.LEFT_WRIST]
        right_wrist = landmarks[self.RIGHT_WRIST]
        left_hip = landmarks[self.LEFT_HIP]
        right_hip = landmarks[self.RIGHT_HIP]
        left_knee = landmarks[self.LEFT_KNEE]
        right_knee = landmarks[self.RIGHT_KNEE]
        left_ankle = landmarks[self.LEFT_ANKLE]
        right_ankle = landmarks[self.RIGHT_ANKLE]
        
        # Calculate average points
        shoulder = ((left_shoulder[0] + right_shoulder[0]) / 2,
                   (left_shoulder[1] + right_shoulder[1]) / 2)
        elbow = ((left_elbow[0] + right_elbow[0]) / 2,
                (left_elbow[1] + right_elbow[1]) / 2)
        wrist = ((left_wrist[0] + right_wrist[0]) / 2,
                (left_wrist[1] + right_wrist[1]) / 2)
        hip = ((left_hip[0] + right_hip[0]) / 2,
              (left_hip[1] + right_hip[1]) / 2)
        knee = ((left_knee[0] + right_knee[0]) / 2,
               (left_knee[1] + right_knee[1]) / 2)
        ankle = ((left_ankle[0] + right_ankle[0]) / 2,
                (left_ankle[1] + right_ankle[1]) / 2)
        
        # Calculate key angles
        elbow_angle = self.calculate_angle(shoulder, elbow, wrist)
        body_angle = self.calculate_angle(shoulder, hip, ankle)
        knee_angle = self.calculate_angle(hip, knee, ankle)
        
        # Calculate hand width
        hand_width = self.calculate_distance(
            (left_wrist[0], left_wrist[1]),
            (right_wrist[0], right_wrist[1])
        )
        shoulder_width = self.calculate_distance(
            (left_shoulder[0], left_shoulder[1]),
            (right_shoulder[0], right_shoulder[1])
        )
        hand_to_shoulder_ratio = hand_width / shoulder_width if shoulder_width > 0 else 0
        
        # Check for rep completion
        if self._check_rep_complete(90.0, 160.0, elbow_angle):
            self.reps += 1
        
        # Validate form
        is_valid, form_errors = self.validate_form(landmarks, image_width, image_height)
        
        # Calculate angles dict
        angles = {
            "elbow": elbow_angle,
            "body": body_angle,
            "knee": knee_angle,
            "hand_to_shoulder_ratio": hand_to_shoulder_ratio
        }
        
        # Calculate quality score
        ideal_angles = {
            "elbow": (90.0, 180.0),
            "body": (160.0, 180.0),
            "knee": (160.0, 180.0)
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
        """Validate push-up form"""
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
        left_elbow = landmarks[self.LEFT_ELBOW]
        right_elbow = landmarks[self.RIGHT_ELBOW]
        left_wrist = landmarks[self.LEFT_WRIST]
        right_wrist = landmarks[self.RIGHT_WRIST]
        left_hip = landmarks[self.LEFT_HIP]
        right_hip = landmarks[self.RIGHT_HIP]
        left_knee = landmarks[self.LEFT_KNEE]
        right_knee = landmarks[self.RIGHT_KNEE]
        left_ankle = landmarks[self.LEFT_ANKLE]
        right_ankle = landmarks[self.RIGHT_ANKLE]
        
        # Average points
        shoulder = ((left_shoulder[0] + right_shoulder[0]) / 2,
                   (left_shoulder[1] + right_shoulder[1]) / 2)
        elbow = ((left_elbow[0] + right_elbow[0]) / 2,
                (left_elbow[1] + right_elbow[1]) / 2)
        wrist = ((left_wrist[0] + right_wrist[0]) / 2,
                (left_wrist[1] + right_wrist[1]) / 2)
        hip = ((left_hip[0] + right_hip[0]) / 2,
              (left_hip[1] + right_hip[1]) / 2)
        knee = ((left_knee[0] + right_knee[0]) / 2,
               (left_knee[1] + right_knee[1]) / 2)
        ankle = ((left_ankle[0] + right_ankle[0]) / 2,
                (left_ankle[1] + right_ankle[1]) / 2)
        
        # Check body alignment (shoulder-hip-ankle should be straight > 160°)
        body_angle = self.calculate_angle(shoulder, hip, ankle)
        if body_angle < 160.0:
            errors.append(FormError(
                type="body_alignment",
                message=f"Keep your body straight. Current angle: {body_angle:.1f}°",
                severity="error"
            ))
        
        # Check knee position (knees should be straight > 160°)
        knee_angle = self.calculate_angle(hip, knee, ankle)
        if knee_angle < 160.0:
            errors.append(FormError(
                type="knee_position",
                message="Keep your legs straight. Don't bend your knees.",
                severity="error"
            ))
        
        # Check elbow bend when DOWN (should be ~90°)
        elbow_angle = self.calculate_angle(shoulder, elbow, wrist)
        if self.current_state == ExerciseState.DOWN and elbow_angle > 100.0:
            errors.append(FormError(
                type="elbow_bend",
                message="Bend your elbows more. Go lower.",
                severity="warning"
            ))
        
        # Check hand width (should be 1.2-1.5x shoulder width)
        hand_width = self.calculate_distance(
            (left_wrist[0], left_wrist[1]),
            (right_wrist[0], right_wrist[1])
        )
        shoulder_width = self.calculate_distance(
            (left_shoulder[0], left_shoulder[1]),
            (right_shoulder[0], right_shoulder[1])
        )
        if shoulder_width > 0:
            ratio = hand_width / shoulder_width
            if ratio < 1.2:
                errors.append(FormError(
                    type="hand_width",
                    message="Place your hands wider, about 1.2-1.5x shoulder width",
                    severity="info"
                ))
            elif ratio > 1.5:
                errors.append(FormError(
                    type="hand_width",
                    message="Your hands are too wide. Bring them closer.",
                    severity="info"
                ))
        
        return len([e for e in errors if e.severity == "error"]) == 0, errors

