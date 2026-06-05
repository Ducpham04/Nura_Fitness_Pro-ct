"""
Base abstract class for exercise analyzers
"""
from abc import ABC, abstractmethod
from typing import Dict, List, Tuple, Optional
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.schemas import ExerciseMetrics, FormError, ExerciseState
from utils.geometry import calculate_angle, calculate_distance, calculate_3d_distance


class ExerciseAnalyzer(ABC):
    """Base class for all exercise analyzers"""
    
    def __init__(self):
        self.reps = 0
        self.current_state = ExerciseState.UNKNOWN
        self.previous_state = ExerciseState.UNKNOWN
        self.state_history: List[ExerciseState] = []
        self.quality_scores: List[float] = []
    
    @abstractmethod
    def analyze(self, landmarks: List[Tuple[float, float, float]], 
                image_width: int, image_height: int) -> ExerciseMetrics:
        """
        Analyze landmarks and return metrics
        
        Args:
            landmarks: List of (x, y, z) landmark coordinates
            image_width: Image width
            image_height: Image height
        
        Returns:
            ExerciseMetrics object
        """
        pass
    
    @abstractmethod
    def validate_form(self, landmarks: List[Tuple[float, float, float]], 
                     image_width: int, image_height: int) -> Tuple[bool, List[FormError]]:
        """
        Validate exercise form
        
        Args:
            landmarks: List of (x, y, z) landmark coordinates
            image_width: Image width
            image_height: Image height
        
        Returns:
            Tuple of (is_valid, list_of_errors)
        """
        pass
    
    def reset(self):
        """Reset counter and state"""
        self.reps = 0
        self.current_state = ExerciseState.UNKNOWN
        self.previous_state = ExerciseState.UNKNOWN
        self.state_history = []
        self.quality_scores = []
    
    def calculate_angle(self, point_a: Tuple[float, float], 
                       point_b: Tuple[float, float], 
                       point_c: Tuple[float, float]) -> float:
        """Calculate angle at point_b"""
        return calculate_angle(point_a, point_b, point_c)
    
    def calculate_distance(self, point1: Tuple[float, float], 
                          point2: Tuple[float, float]) -> float:
        """Calculate distance between two points"""
        return calculate_distance(point1, point2)
    
    def calculate_3d_distance(self, point1: Tuple[float, float, float], 
                              point2: Tuple[float, float, float]) -> float:
        """Calculate 3D distance between two points"""
        return calculate_3d_distance(point1, point2)
    
    def _update_state(self, new_state: ExerciseState):
        """Update state and track history"""
        self.previous_state = self.current_state
        self.current_state = new_state
        self.state_history.append(new_state)
        
        # Keep only last 10 states
        if len(self.state_history) > 10:
            self.state_history.pop(0)
    
    def _check_rep_complete(self, down_threshold: float, up_threshold: float, 
                           current_angle: float) -> bool:
        """
        Check if a rep is complete based on state transitions
        
        Args:
            down_threshold: Angle threshold for DOWN state
            up_threshold: Angle threshold for UP state
            current_angle: Current angle value
        
        Returns:
            True if rep completed
        """
        # Transition to DOWN
        if current_angle < down_threshold and self.current_state != ExerciseState.DOWN:
            self._update_state(ExerciseState.DOWN)
        
        # Transition to UP (rep complete)
        elif current_angle > up_threshold and self.current_state == ExerciseState.DOWN:
            self._update_state(ExerciseState.UP)
            return True
        
        return False
    
    def _calculate_quality_score(self, form_errors: List[FormError], 
                                 angles: Dict[str, float],
                                 ideal_angles: Dict[str, Tuple[float, float]]) -> float:
        """
        Calculate quality score (0-100)
        
        Args:
            form_errors: List of form errors
            angles: Current angles
            ideal_angles: Dict of {angle_name: (min, max)} ideal ranges
        
        Returns:
            Quality score 0-100
        """
        score = 100.0
        
        # Deduct for form errors
        for error in form_errors:
            if error.severity == "error":
                score -= 15
            elif error.severity == "warning":
                score -= 8
            else:
                score -= 3
        
        # Deduct for angle deviations
        for angle_name, (min_val, max_val) in ideal_angles.items():
            if angle_name in angles:
                angle = angles[angle_name]
                if angle < min_val or angle > max_val:
                    deviation = min(abs(angle - min_val), abs(angle - max_val))
                    score -= min(deviation / 5, 10)  # Max 10 points per angle
        
        # Deduct for jerky movement (if state changes too frequently)
        if len(self.state_history) >= 3:
            recent_changes = sum(
                1 for i in range(len(self.state_history) - 1)
                if self.state_history[i] != self.state_history[i + 1]
            )
            if recent_changes > 2:
                score -= 10
        
        return max(0.0, min(100.0, score))

