"""
Factory pattern for creating exercise analyzers
"""
from typing import Dict
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.schemas import ExerciseType
from analyzers.base import ExerciseAnalyzer
from analyzers.push_up import PushUpAnalyzer
from analyzers.squat import SquatAnalyzer
from analyzers.pull_up import PullUpAnalyzer
from analyzers.sit_up import SitUpAnalyzer
from analyzers.plank import PlankAnalyzer


class ExerciseFactory:
    """Factory for creating exercise analyzers"""
    
    _analyzers: Dict[ExerciseType, type] = {
        ExerciseType.PUSH_UP: PushUpAnalyzer,
        ExerciseType.SQUAT: SquatAnalyzer,
        ExerciseType.PULL_UP: PullUpAnalyzer,
        ExerciseType.SIT_UP: SitUpAnalyzer,
        ExerciseType.PLANK: PlankAnalyzer,
    }
    
    _instances: Dict[ExerciseType, ExerciseAnalyzer] = {}
    
    @classmethod
    def create(cls, exercise_type: ExerciseType) -> ExerciseAnalyzer:
        """
        Create or get analyzer instance for exercise type
        
        Args:
            exercise_type: Type of exercise
        
        Returns:
            ExerciseAnalyzer instance
        
        Raises:
            ValueError: If exercise type is not supported
        """
        if exercise_type not in cls._analyzers:
            raise ValueError(f"Unsupported exercise type: {exercise_type}")
        
        # Return existing instance or create new one
        if exercise_type not in cls._instances:
            analyzer_class = cls._analyzers[exercise_type]
            cls._instances[exercise_type] = analyzer_class()
        
        return cls._instances[exercise_type]
    
    @classmethod
    def reset(cls, exercise_type: ExerciseType):
        """
        Reset analyzer for specific exercise type
        
        Args:
            exercise_type: Type of exercise
        """
        if exercise_type in cls._instances:
            cls._instances[exercise_type].reset()
    
    @classmethod
    def reset_all(cls):
        """Reset all analyzers"""
        for analyzer in cls._instances.values():
            analyzer.reset()

