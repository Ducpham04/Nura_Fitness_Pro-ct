"""
Pull-up exercise analyzer
"""
from typing import Dict, List, Tuple
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.schemas import ExerciseMetrics, FormError, ExerciseState
from analyzers.base import ExerciseAnalyzer
import thresholds as T


class PullUpAnalyzer(ExerciseAnalyzer):
    """Analyzer for pull-up exercises"""
    
    # MediaPipe landmark indices
    LEFT_SHOULDER = 11
    RIGHT_SHOULDER = 12
    LEFT_ELBOW = 13
    RIGHT_ELBOW = 14
    LEFT_WRIST = 15
    RIGHT_WRIST = 16
    LEFT_HIP = 23
    RIGHT_HIP = 24
    NOSE = 0
    LEFT_EAR = 7
    RIGHT_EAR = 8
    
    def analyze(self, landmarks: List[Tuple[float, float, float]], 
                image_width: int, image_height: int) -> ExerciseMetrics:
        """Analyze pull-up form and count reps"""
        
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
        left_elbow = landmarks[self.LEFT_ELBOW]
        right_elbow = landmarks[self.RIGHT_ELBOW]
        left_wrist = landmarks[self.LEFT_WRIST]
        right_wrist = landmarks[self.RIGHT_WRIST]
        left_hip = landmarks[self.LEFT_HIP]
        right_hip = landmarks[self.RIGHT_HIP]
        
        # Calculate average points (2D for angles, 3D for distance)
        shoulder = self.mid(left_shoulder, right_shoulder)
        elbow = self.mid(left_elbow, right_elbow)
        wrist = self.mid(left_wrist, right_wrist)
        hip = self.mid(left_hip, right_hip)
        
        # Calculate 3D average points for distance calculation
        wrist_3d = ((left_wrist[0] + right_wrist[0]) / 2,
                   (left_wrist[1] + right_wrist[1]) / 2,
                   (left_wrist[2] + right_wrist[2]) / 2)
        
        # Calculate key angles
        elbow_angle = self.calculate_angle(shoulder, elbow, wrist)
        body_angle = self.calculate_angle(shoulder, hip, (hip[0], hip[1] + 100))  # Vertical reference
        
        # Calculate chin-to-hand distance (for rep detection) - using 3D coordinates
        chin_to_hand_distance = self.calculate_3d_distance(
            (nose[0], nose[1], nose[2]),
            wrist_3d
        )
        
        # Check for rep completion
        # UP: chin above hands (chin.y < wrist.y) and elbow < 90°
        # DOWN: elbow > 160°
        elbow_s = self._smooth("rep", elbow_angle)  # làm mượt giảm nhiễu
        if elbow_s < T.PULLUP_CONTRACT and nose[1] < wrist[1] and self.current_state != ExerciseState.UP:
            self._update_state(ExerciseState.UP)
        elif elbow_s > T.PULLUP_EXTEND and self.current_state == ExerciseState.UP:
            self._update_state(ExerciseState.DOWN)
            self.reps += 1
        
        # Validate form
        is_valid, form_errors = self.validate_form(landmarks, image_width, image_height)
        
        # Calculate angles dict
        angles = {
            "elbow": elbow_angle,
            "body": body_angle,
            "chin_to_hand_distance": chin_to_hand_distance
        }
        
        # Calculate quality score
        ideal_angles = {
            "elbow": (0.0, 180.0),
            "body": (170.0, 180.0)  # Body should be straight
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
        """Validate pull-up form"""
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
        left_wrist = landmarks[self.LEFT_WRIST]
        right_wrist = landmarks[self.RIGHT_WRIST]
        left_hip = landmarks[self.LEFT_HIP]
        right_hip = landmarks[self.RIGHT_HIP]
        
        # Average points (2D for form validation)
        shoulder = self.mid(left_shoulder, right_shoulder)
        elbow = self.mid(left_elbow, right_elbow)
        wrist = self.mid(left_wrist, right_wrist)
        hip = self.mid(left_hip, right_hip)
        
        # Check body alignment (should be straight, no swinging)
        body_angle = self.calculate_angle(shoulder, hip, (hip[0], hip[1] + 100))
        if body_angle < 170.0:
            errors.append(FormError(
                type="body_alignment",
                message="Keep your body straight. Don't swing.",
                severity="error"
            ))
        
        # Check elbow position (should pull to sides, not forward)
        elbow_forward = abs(elbow[0] - shoulder[0])  # Horizontal distance
        if elbow_forward < 0.05 * image_width:  # Too close to body
            errors.append(FormError(
                type="elbow_position",
                message="Pull your elbows to the sides, not forward",
                severity="warning"
            ))
        
        # Check shoulder position when UP (shoulders should be down)
        if self.current_state == ExerciseState.UP:
            shoulder_height = shoulder[1]
            if shoulder_height > wrist[1] + 0.1 * image_height:
                errors.append(FormError(
                    type="shoulder_position",
                    message="Pull your shoulders down when at the top",
                    severity="warning"
                ))
        
        # Check full extension when DOWN (elbow should be > 160°)
        if self.current_state == ExerciseState.DOWN:
            elbow_angle = self.calculate_angle(shoulder, elbow, wrist)
            if elbow_angle < 160.0:
                errors.append(FormError(
                    type="full_extension",
                    message="Fully extend your arms at the bottom",
                    severity="warning"
                ))
        
        return len([e for e in errors if e.severity == "error"]) == 0, errors

