"""
User Preference Store - Tracks user feedback and preferences
Learns from skipped meals/exercises and user ratings
"""
import json
from typing import List, Dict, Optional, Set
from datetime import datetime
from pathlib import Path


class UserPreferenceStore:
    """
    Simple in-memory store for user preferences
    In production, this would be a database
    """
    
    def __init__(self, storage_path: str = "user_preferences.json"):
        self.storage_path = Path(storage_path)
        self.preferences: Dict[str, Dict] = {}
        self._load_from_disk()
    
    def _load_from_disk(self):
        """Load preferences from JSON file"""
        if self.storage_path.exists():
            try:
                with open(self.storage_path, 'r', encoding='utf-8') as f:
                    self.preferences = json.load(f)
            except Exception:
                self.preferences = {}
    
    def _save_to_disk(self):
        """Save preferences to JSON file"""
        try:
            with open(self.storage_path, 'w', encoding='utf-8') as f:
                json.dump(self.preferences, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"Warning: Could not save preferences: {e}")
    
    def get_user_preferences(self, user_id: str) -> Dict:
        """Get all preferences for a user"""
        if user_id not in self.preferences:
            self.preferences[user_id] = {
                "disliked_foods": [],
                "skipped_exercises": [],
                "plan_ratings": [],
                "meal_feedback": [],
                "workout_feedback": [],
                "created_at": datetime.now().isoformat(),
                "last_updated": datetime.now().isoformat()
            }
        return self.preferences[user_id]
    
    def add_disliked_food(self, user_id: str, food_name: str, reason: Optional[str] = None):
        """Mark a food as disliked"""
        prefs = self.get_user_preferences(user_id)
        
        # Check if already disliked
        for item in prefs["disliked_foods"]:
            if item["name"].lower() == food_name.lower():
                return
        
        prefs["disliked_foods"].append({
            "name": food_name,
            "reason": reason,
            "added_at": datetime.now().isoformat()
        })
        prefs["last_updated"] = datetime.now().isoformat()
        self._save_to_disk()
    
    def add_skipped_exercise(self, user_id: str, exercise_name: str, reason: Optional[str] = None):
        """Mark an exercise as skipped"""
        prefs = self.get_user_preferences(user_id)
        
        # Check if already skipped
        for item in prefs["skipped_exercises"]:
            if item["name"].lower() == exercise_name.lower():
                return
        
        prefs["skipped_exercises"].append({
            "name": exercise_name,
            "reason": reason,
            "added_at": datetime.now().isoformat()
        })
        prefs["last_updated"] = datetime.now().isoformat()
        self._save_to_disk()
    
    def rate_plan(self, user_id: str, plan_id: str, rating: int, feedback: Optional[str] = None):
        """Rate a generated plan (1-5 stars)"""
        prefs = self.get_user_preferences(user_id)
        
        prefs["plan_ratings"].append({
            "plan_id": plan_id,
            "rating": rating,
            "feedback": feedback,
            "rated_at": datetime.now().isoformat()
        })
        prefs["last_updated"] = datetime.now().isoformat()
        self._save_to_disk()
    
    def add_meal_feedback(self, user_id: str, meal_name: str, day: str, feedback: str):
        """Add feedback about a specific meal"""
        prefs = self.get_user_preferences(user_id)
        
        prefs["meal_feedback"].append({
            "meal_name": meal_name,
            "day": day,
            "feedback": feedback,
            "added_at": datetime.now().isoformat()
        })
        prefs["last_updated"] = datetime.now().isoformat()
        self._save_to_disk()
    
    def add_workout_feedback(self, user_id: str, exercise_name: str, day: str, feedback: str):
        """Add feedback about a specific workout/exercise"""
        prefs = self.get_user_preferences(user_id)
        
        prefs["workout_feedback"].append({
            "exercise_name": exercise_name,
            "day": day,
            "feedback": feedback,
            "added_at": datetime.now().isoformat()
        })
        prefs["last_updated"] = datetime.now().isoformat()
        self._save_to_disk()
    
    def get_disliked_foods(self, user_id: str) -> Set[str]:
        """Get set of disliked food names"""
        prefs = self.get_user_preferences(user_id)
        return set(item["name"].lower() for item in prefs["disliked_foods"])
    
    def get_skipped_exercises(self, user_id: str) -> Set[str]:
        """Get set of skipped exercise names"""
        prefs = self.get_user_preferences(user_id)
        return set(item["name"].lower() for item in prefs["skipped_exercises"])
    
    def get_average_rating(self, user_id: str) -> Optional[float]:
        """Get average plan rating for user"""
        prefs = self.get_user_preferences(user_id)
        ratings = [r["rating"] for r in prefs["plan_ratings"]]
        
        if not ratings:
            return None
        
        return sum(ratings) / len(ratings)
    
    def get_negative_feedback_patterns(self, user_id: str) -> Dict:
        """Analyze patterns in negative feedback"""
        prefs = self.get_user_preferences(user_id)
        
        patterns = {
            "frequent_dislikes": {},
            "frequent_skips": {},
            "common_complaints": []
        }
        
        # Count disliked foods
        for food in prefs["disliked_foods"]:
            name = food["name"].lower()
            patterns["frequent_dislikes"][name] = patterns["frequent_dislikes"].get(name, 0) + 1
        
        # Count skipped exercises
        for exercise in prefs["skipped_exercises"]:
            name = exercise["name"].lower()
            patterns["frequent_skips"][name] = patterns["frequent_skips"].get(name, 0) + 1
        
        # Analyze feedback text for common complaints
        all_feedback = (
            [f["feedback"] for f in prefs["meal_feedback"] if f["feedback"]] +
            [f["feedback"] for f in prefs["workout_feedback"] if f["feedback"]]
        )
        
        # Simple keyword analysis
        complaint_keywords = {
            "nặng": 0, "quá nặng": 0, "tập không hết": 0,
            "dở": 0, "không thích": 0, "không ăn được": 0,
            "đắt": 0, "vượt ngân sách": 0,
            "đơn điệu": 0, "lặp": 0, "chán": 0
        }
        
        for feedback in all_feedback:
            for keyword in complaint_keywords:
                if keyword in feedback.lower():
                    complaint_keywords[keyword] += 1
        
        patterns["common_complaints"] = [
            {"keyword": k, "count": v} 
            for k, v in complaint_keywords.items() if v > 0
        ]
        
        return patterns
    
    def generate_prompt_constraints(self, user_id: str) -> str:
        """
        Generate prompt constraints based on user preferences
        to be included in AI generation context
        """
        disliked_foods = self.get_disliked_foods(user_id)
        skipped_exercises = self.get_skipped_exercises(user_id)
        patterns = self.get_negative_feedback_patterns(user_id)
        
        constraints = []
        
        if disliked_foods:
            constraints.append(f"Avoid these foods: {', '.join(disliked_foods)}")
        
        if skipped_exercises:
            constraints.append(f"Avoid these exercises: {', '.join(skipped_exercises)}")
        
        # Add constraints based on complaints
        for complaint in patterns["common_complaints"]:
            keyword = complaint["keyword"]
            if keyword in ["nặng", "quá nặng", "tập không hết"]:
                constraints.append("Reduce workout intensity and volume")
            elif keyword in ["dở", "không thích", "không ăn được"]:
                constraints.append("Use simpler, more familiar dishes")
            elif keyword in ["đắt", "vượt ngân sách"]:
                constraints.append("Use cheaper ingredients and reduce portions")
            elif keyword in ["đơn điệu", "lặp", "chán"]:
                constraints.append("Increase food and exercise variety")
        
        if constraints:
            return "User Preferences:\n" + "\n".join(f"- {c}" for c in constraints)
        
        return ""
    
    def clear_user_preferences(self, user_id: str):
        """Clear all preferences for a user"""
        if user_id in self.preferences:
            del self.preferences[user_id]
            self._save_to_disk()


# Global instance
preference_store = UserPreferenceStore()
