"""
Plan Versioning - Tracks plan history and versions
Allows users to compare and revert to previous plans
"""
import json
from typing import List, Dict, Optional
from datetime import datetime
from pathlib import Path
from uuid import uuid4


class PlanVersioning:
    """
    Manages plan versioning and history
    """
    
    def __init__(self, storage_path: str = "plan_versions.json"):
        self.storage_path = Path(storage_path)
        self.versions: Dict[str, List[Dict]] = {}  # user_id -> list of plan versions
        self._load_from_disk()
    
    def _load_from_disk(self):
        """Load version history from JSON file"""
        if self.storage_path.exists():
            try:
                with open(self.storage_path, 'r', encoding='utf-8') as f:
                    self.versions = json.load(f)
            except Exception:
                self.versions = {}
    
    def _save_to_disk(self):
        """Save version history to JSON file"""
        try:
            with open(self.storage_path, 'w', encoding='utf-8') as f:
                json.dump(self.versions, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"Warning: Could not save plan versions: {e}")
    
    def save_plan(
        self,
        user_id: str,
        plan_id: str,
        plan_data: dict,
        parent_plan_id: Optional[str] = None,
        change_summary: Optional[str] = None
    ) -> str:
        """
        Save a plan version
        
        Returns:
            version_id for the saved plan
        """
        version_id = f"{plan_id}_v{uuid4().hex[:8]}"
        
        version_record = {
            "version_id": version_id,
            "plan_id": plan_id,
            "parent_plan_id": parent_plan_id,
            "change_summary": change_summary,
            "plan_data": plan_data,
            "created_at": datetime.now().isoformat(),
            "version_number": self._get_next_version_number(user_id, plan_id)
        }
        
        if user_id not in self.versions:
            self.versions[user_id] = []
        
        self.versions[user_id].append(version_record)
        self._save_to_disk()
        
        return version_id
    
    def _get_next_version_number(self, user_id: str, plan_id: str) -> int:
        """Get next version number for a plan"""
        if user_id not in self.versions:
            return 1
        
        plan_versions = [v for v in self.versions[user_id] if v["plan_id"] == plan_id]
        return len(plan_versions) + 1
    
    def get_plan_history(self, user_id: str, plan_id: str) -> List[Dict]:
        """Get all versions of a specific plan"""
        if user_id not in self.versions:
            return []
        
        return [
            {
                "version_id": v["version_id"],
                "plan_id": v["plan_id"],
                "parent_plan_id": v["parent_plan_id"],
                "change_summary": v["change_summary"],
                "created_at": v["created_at"],
                "version_number": v["version_number"]
            }
            for v in self.versions[user_id]
            if v["plan_id"] == plan_id
        ]
    
    def get_plan_version(self, version_id: str) -> Optional[Dict]:
        """Get a specific plan version by version_id"""
        for user_versions in self.versions.values():
            for version in user_versions:
                if version["version_id"] == version_id:
                    return version
        return None
    
    def get_latest_plan(self, user_id: str, plan_id: str) -> Optional[Dict]:
        """Get the latest version of a plan"""
        history = self.get_plan_history(user_id, plan_id)
        if not history:
            return None
        
        latest = max(history, key=lambda x: x["version_number"])
        return self.get_plan_version(latest["version_id"])
    
    def compare_plans(self, version_id_1: str, version_id_2: str) -> Dict:
        """
        Compare two plan versions
        
        Returns:
            Comparison summary with differences
        """
        plan_1 = self.get_plan_version(version_id_1)
        plan_2 = self.get_plan_version(version_id_2)
        
        if not plan_1 or not plan_2:
            return {"error": "One or both versions not found"}
        
        data_1 = plan_1["plan_data"]
        data_2 = plan_2["plan_data"]
        
        comparison = {
            "version_1": {
                "version_id": version_id_1,
                "created_at": plan_1["created_at"],
                "version_number": plan_1["version_number"]
            },
            "version_2": {
                "version_id": version_id_2,
                "created_at": plan_2["created_at"],
                "version_number": plan_2["version_number"]
            },
            "differences": self._calculate_differences(data_1, data_2)
        }
        
        return comparison
    
    def _calculate_differences(self, plan_1: dict, plan_2: dict) -> Dict:
        """Calculate differences between two plans"""
        differences = {
            "calories": {},
            "cost": {},
            "meals": []
        }
        
        # Compare weekly totals
        if "weekly_totals" in plan_1 and "weekly_totals" in plan_2:
            diff_cal = plan_2["weekly_totals"].get("total_calories", 0) - plan_1["weekly_totals"].get("total_calories", 0)
            diff_cost = plan_2["weekly_totals"].get("total_cost", 0) - plan_1["weekly_totals"].get("total_cost", 0)
            
            differences["calories"] = {
                "old": plan_1["weekly_totals"].get("total_calories"),
                "new": plan_2["weekly_totals"].get("total_calories"),
                "difference": diff_cal
            }
            
            differences["cost"] = {
                "old": plan_1["weekly_totals"].get("total_cost"),
                "new": plan_2["weekly_totals"].get("total_cost"),
                "difference": diff_cost
            }
        
        # Compare meal items
        if "daily_plans" in plan_1 and "daily_plans" in plan_2:
            meals_1 = [item for day in plan_1["daily_plans"] for meal in day.get("meals", []) for item in meal.get("items", [])]
            meals_2 = [item for day in plan_2["daily_plans"] for meal in day.get("meals", []) for item in meal.get("items", [])]
            
            foods_1 = set(item["name"] for item in meals_1)
            foods_2 = set(item["name"] for item in meals_2)
            
            differences["meals"] = {
                "added": list(foods_2 - foods_1),
                "removed": list(foods_1 - foods_2),
                "unchanged": list(foods_1 & foods_2)
            }
        
        return differences
    
    def get_all_user_plans(self, user_id: str) -> List[Dict]:
        """Get all plans for a user"""
        if user_id not in self.versions:
            return []
        
        # Group by plan_id and get latest version
        plan_groups = {}
        for version in self.versions[user_id]:
            plan_id = version["plan_id"]
            if plan_id not in plan_groups or version["version_number"] > plan_groups[plan_id]["version_number"]:
                plan_groups[plan_id] = version
        
        return [
            {
                "plan_id": plan_id,
                "version_id": v["version_id"],
                "version_number": v["version_number"],
                "created_at": v["created_at"],
                "change_summary": v["change_summary"]
            }
            for plan_id, v in plan_groups.items()
        ]
    
    def delete_plan_history(self, user_id: str, plan_id: str) -> bool:
        """Delete all versions of a plan"""
        if user_id not in self.versions:
            return False
        
        original_count = len(self.versions[user_id])
        self.versions[user_id] = [v for v in self.versions[user_id] if v["plan_id"] != plan_id]
        
        if len(self.versions[user_id]) < original_count:
            self._save_to_disk()
            return True
        
        return False
    
    def delete_user_history(self, user_id: str) -> bool:
        """Delete all plan history for a user"""
        if user_id in self.versions:
            del self.versions[user_id]
            self._save_to_disk()
            return True
        return False


# Global instance
plan_versioning = PlanVersioning()
