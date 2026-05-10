"""
Progression Tracker - Tracks user progress and auto-adjusts workout parameters
"""
import json
from typing import Dict, List, Optional
from datetime import datetime
from pathlib import Path
from ..schemas.workout import Exercise


class ProgressionTracker:
    """
    Tracks workout progression and automatically adjusts sets/reps/weight
    """
    
    def __init__(self, storage_path: str = "progression_data.json"):
        self.storage_path = Path(storage_path)
        self.progression_data: Dict[str, Dict] = {}
        self._load_from_disk()
    
    def _load_from_disk(self):
        """Load progression data from JSON file"""
        if self.storage_path.exists():
            try:
                with open(self.storage_path, 'r', encoding='utf-8') as f:
                    self.progression_data = json.load(f)
            except Exception:
                self.progression_data = {}
    
    def _save_to_disk(self):
        """Save progression data to JSON file"""
        try:
            with open(self.storage_path, 'w', encoding='utf-8') as f:
                json.dump(self.progression_data, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"Warning: Could not save progression data: {e}")
    
    def get_user_progression(self, user_id: str) -> Dict:
        """Get progression data for a user"""
        if user_id not in self.progression_data:
            self.progression_data[user_id] = {
                "current_week": 1,
                "current_cycle": 1,
                "exercise_history": [],
                "weight_history": [],
                "completed_workouts": [],
                "last_updated": datetime.now().isoformat()
            }
        return self.progression_data[user_id]
    
    def record_workout_completion(
        self,
        user_id: str,
        day: str,
        exercises: List[Exercise],
        rating: Optional[int] = None,
        notes: Optional[str] = None
    ):
        """Record a completed workout with exercise details"""
        progression = self.get_user_progression(user_id)
        
        workout_record = {
            "day": day,
            "date": datetime.now().isoformat(),
            "week": progression["current_week"],
            "exercises": [
                {
                    "name": ex.name,
                    "sets": ex.sets,
                    "reps": ex.reps,
                    "rating": rating
                }
                for ex in exercises
            ],
            "rating": rating,
            "notes": notes
        }
        
        progression["completed_workouts"].append(workout_record)
        progression["last_updated"] = datetime.now().isoformat()
        self._save_to_disk()
    
    def record_weight(self, user_id: str, weight: float, date: Optional[str] = None):
        """Record user weight for progress tracking"""
        progression = self.get_user_progression(user_id)
        
        weight_record = {
            "weight": weight,
            "date": date or datetime.now().isoformat()
        }
        
        progression["weight_history"].append(weight_record)
        progression["last_updated"] = datetime.now().isoformat()
        self._save_to_disk()
    
    def advance_week(self, user_id: str):
        """Advance to next training week"""
        progression = self.get_user_progression(user_id)
        progression["current_week"] += 1
        progression["last_updated"] = datetime.now().isoformat()
        self._save_to_disk()
    
    def get_progression_adjustment(self, user_id: str, exercise_name: str) -> Dict:
        """
        Calculate progression adjustment for an exercise based on history
        Returns suggested sets, reps, and weight changes
        """
        progression = self.get_user_progression(user_id)
        
        # Find exercise history
        exercise_history = [
            w for w in progression["completed_workouts"]
            for ex in w["exercises"]
            if ex["name"].lower() == exercise_name.lower()
        ]
        
        if not exercise_history:
            return {
                "sets": 3,
                "reps": "8-12",
                "weight_change": 0,
                "reason": "First time doing this exercise - start with baseline"
            }
        
        # Get last 3 sessions for this exercise
        recent_sessions = exercise_history[-3:]
        
        # Calculate average rating
        ratings = [s.get("rating") for s in recent_sessions if s.get("rating")]
        avg_rating = sum(ratings) / len(ratings) if ratings else 3
        
        # Get last session details
        last_session = recent_sessions[-1]
        last_exercise = last_session["exercises"][0]
        
        # Progression logic
        current_week = progression["current_week"]
        
        # Every 4 weeks, reset to deload
        if current_week % 4 == 0:
            return {
                "sets": last_exercise["sets"] - 1 if last_exercise["sets"] > 2 else 2,
                "reps": self._reduce_reps(last_exercise["reps"]),
                "weight_change": -0.1,  # Reduce weight by 10%
                "reason": "Deload week - reduce intensity for recovery"
            }
        
        # If rating is high (4-5), increase intensity
        if avg_rating >= 4:
            return {
                "sets": last_exercise["sets"],
                "reps": last_exercise["reps"],
                "weight_change": 0.05,  # Increase weight by 5%
                "reason": "Good progress - increase weight slightly"
            }
        
        # If rating is low (1-2), maintain or reduce
        if avg_rating <= 2:
            return {
                "sets": last_exercise["sets"],
                "reps": last_exercise["reps"],
                "weight_change": 0,
                "reason": "Struggling - maintain current weight"
            }
        
        # Default - maintain
        return {
            "sets": last_exercise["sets"],
            "reps": last_exercise["reps"],
            "weight_change": 0,
            "reason": "Maintain current parameters"
        }
    
    def _reduce_reps(self, reps_str: str) -> str:
        """Reduce rep range for deload"""
        if "-" in reps_str:
            low, high = reps_str.split("-")
            try:
                new_low = max(int(low) - 2, 6)
                new_high = max(int(high) - 2, 8)
                return f"{new_low}-{new_high}"
            except:
                return reps_str
        return reps_str
    
    def get_weekly_summary(self, user_id: str) -> Dict:
        """Get summary of current week's progress"""
        progression = self.get_user_progression(user_id)
        
        current_week = progression["current_week"]
        week_workouts = [
            w for w in progression["completed_workouts"]
            if w.get("week") == current_week
        ]
        
        if not week_workouts:
            return {
                "week": current_week,
                "workouts_completed": 0,
                "total_exercises": 0,
                "average_rating": None,
                "weight_change": 0
            }
        
        total_exercises = sum(len(w["exercises"]) for w in week_workouts)
        ratings = [w.get("rating") for w in week_workouts if w.get("rating")]
        avg_rating = sum(ratings) / len(ratings) if ratings else None
        
        # Calculate weight change this week
        weight_history = progression["weight_history"]
        if len(weight_history) >= 2:
            weight_change = weight_history[-1]["weight"] - weight_history[0]["weight"]
        else:
            weight_change = 0
        
        return {
            "week": current_week,
            "workouts_completed": len(week_workouts),
            "total_exercises": total_exercises,
            "average_rating": avg_rating,
            "weight_change": round(weight_change, 1)
        }
    
    def get_progression_prompt(self, user_id: str) -> str:
        """
        Generate prompt context about progression for AI
        """
        progression = self.get_user_progression(user_id)
        summary = self.get_weekly_summary(user_id)
        
        prompt_parts = [
            f"Current Training Week: {progression['current_week']}",
            f"Workouts Completed This Week: {summary['workouts_completed']}",
        ]
        
        if summary["average_rating"]:
            prompt_parts.append(f"Average Workout Rating: {summary['average_rating']}/5")
        
        if summary["weight_change"] != 0:
            change = summary["weight_change"]
            prompt_parts.append(f"Weight Change: {'+' if change > 0 else ''}{change}kg")
        
        # Get progression adjustments for common exercises
        common_exercises = ["Squats", "Bench Press", "Deadlift", "Overhead Press"]
        adjustments = []
        for ex in common_exercises:
            adj = self.get_progression_adjustment(user_id, ex)
            adjustments.append(f"{ex}: {adj['reason']}")
        
        if adjustments:
            prompt_parts.append("\nExercise Progression:")
            prompt_parts.extend(adjustments)
        
        return "\n".join(prompt_parts)


# Global instance
progression_tracker = ProgressionTracker()
