"""
Price Database - Real ingredient prices for accurate cost estimation
Vietnam market prices (2024)
"""
from typing import Dict, List, Optional
from dataclasses import dataclass


@dataclass
class IngredientPrice:
    """Price information for an ingredient"""
    name: str
    unit: str  # "100g", "1kg", "1 quả", "1 bìa", etc.
    price_vnd: int
    calories_per_unit: Optional[int] = None
    protein_per_unit: Optional[float] = None
    category: str = "other"  # protein, carb, veg, fat, fruit


class PriceDatabase:
    """
    Database of real ingredient prices in Vietnam
    Used to calculate accurate meal costs instead of AI estimates
    """
    
    # Vietnam market prices (2024 estimates)
    PRICES: Dict[str, IngredientPrice] = {
        # Proteins
        "chicken_breast": IngredientPrice("ức gà", "100g", 25000, 165, 31, "protein"),
        "chicken_thigh": IngredientPrice("đùi gà", "100g", 20000, 200, 25, "protein"),
        "beef_lean": IngredientPrice("thịt bò nạc", "100g", 35000, 250, 26, "protein"),
        "pork_tenderloin": IngredientPrice("thịt lợn thăn", "100g", 30000, 220, 24, "protein"),
        "salmon": IngredientPrice("cá hồi", "100g", 60000, 200, 20, "protein"),
        "mackerel": IngredientPrice("cá thu", "100g", 25000, 180, 20, "protein"),
        "sardines": IngredientPrice("cá cơm/nục", "100g", 20000, 180, 20, "protein"),
        "tilapia": IngredientPrice("cá rô phi", "100g", 20000, 120, 20, "protein"),
        "tofu": IngredientPrice("đậu phụ", "1 bìa (150g)", 8000, 120, 12, "protein"),
        "eggs": IngredientPrice("trứng gà", "10 quả", 35000, 70, 12, "protein"),
        "egg_whites": IngredientPrice("trứng trắng", "10 quả", 20000, 50, 10, "protein"),
        "shrimp": IngredientPrice("tôm", "100g", 80000, 100, 24, "protein"),
        "pork": IngredientPrice("thịt ba chỉ", "100g", 30000, 250, 15, "protein"),
        "ground_pork": IngredientPrice("thịt heo băm", "100g", 28000, 290, 17, "protein"),
        
        # Carbohydrates
        "rice_white": IngredientPrice("cơm trắng", "1 bát (150g)", 3000, 200, 4, "carb"),
        "rice_brown": IngredientPrice("cơm gạo lứt", "1 bát (150g)", 5000, 180, 4, "carb"),
        "rice_raw": IngredientPrice("gạo trắng", "1kg", 20000, 3500, 70, "carb"),
        "brown_rice_raw": IngredientPrice("gạo lứt", "1kg", 35000, 3600, 80, "carb"),
        "sweet_potato": IngredientPrice("khoai lang", "200g", 5000, 180, 4, "carb"),
        "oats": IngredientPrice("yến mạch", "100g", 8000, 380, 12, "carb"),
        "bread": IngredientPrice("bánh mì", "2 lát", 5000, 160, 6, "carb"),
        "noodles_rice": IngredientPrice("bún", "100g", 3000, 110, 3, "carb"),
        "noodles_egg": IngredientPrice("mì gói", "1 gói", 4000, 350, 9, "carb"),
        "potato": IngredientPrice("khoai tây", "200g", 4000, 170, 4, "carb"),
        "corn": IngredientPrice("ngô", "1 bắp", 5000, 100, 3, "carb"),
        
        # Vegetables
        "mixed_veg": IngredientPrice("rau củ hỗn hợp", "200g", 8000, 60, 2, "veg"),
        "broccoli": IngredientPrice("súp lơ xanh", "200g", 10000, 70, 5, "veg"),
        "spinach": IngredientPrice("rau chân vịt", "200g", 6000, 50, 3, "veg"),
        "carrots": IngredientPrice("cà rốt", "200g", 5000, 80, 2, "veg"),
        "cabbage": IngredientPrice("bắp cải", "200g", 4000, 50, 2, "veg"),
        "lettuce": IngredientPrice("xà lách", "200g", 6000, 30, 2, "veg"),
        "cucumber": IngredientPrice("dưa chuột", "1 quả", 5000, 45, 2, "veg"),
        "tomato": IngredientPrice("cà chua", "1 quả", 4000, 25, 1, "veg"),
        "bok_choy": IngredientPrice("cải xanh", "200g", 5000, 40, 2, "veg"),
        "mushrooms": IngredientPrice("nấm", "200g", 15000, 30, 3, "veg"),
        
        # Fruits
        "banana": IngredientPrice("chuối", "1 quả", 3000, 105, 1, "fruit"),
        "apple": IngredientPrice("táo", "1 quả", 8000, 95, 0.5, "fruit"),
        "orange": IngredientPrice("cam", "1 quả", 6000, 70, 1, "fruit"),
        "dragon_fruit": IngredientPrice("thanh long", "1 quả", 10000, 60, 1, "fruit"),
        "mango": IngredientPrice("xoài", "1 quả", 12000, 100, 1, "fruit"),
        "papaya": IngredientPrice("đu đủ", "200g", 8000, 80, 1, "fruit"),
        "pineapple": IngredientPrice("thơm", "200g", 10000, 82, 1, "fruit"),
        
        # Dairy & Alternatives
        "milk": IngredientPrice("sữa tươi", "1 ly (250ml)", 8000, 150, 8, "protein"),
        "yogurt": IngredientPrice("sữa chua", "1 hộp", 5000, 70, 5, "protein"),
        "cheese": IngredientPrice("phô mai lát", "1 lát", 5000, 80, 5, "protein"),
        "soy_milk": IngredientPrice("sữa đậu nành", "1 ly (250ml)", 6000, 100, 7, "protein"),
        
        # Fats & Oils
        "cooking_oil": IngredientPrice("dầu ăn", "1 thìa (15ml)", 500, 120, 0, "fat"),
        "olive_oil": IngredientPrice("dầu ô liu", "1 thìa (15ml)", 2000, 120, 0, "fat"),
        "peanut_butter": IngredientPrice("bơ đậu phộng", "1 thìa", 2000, 90, 4, "fat"),
        "avocado": IngredientPrice("bơ", "1 nửa", 8000, 160, 2, "fat"),
        "nuts_mixed": IngredientPrice("hạt hỗn hợp", "30g", 5000, 180, 5, "fat"),
        "almonds": IngredientPrice("hạnh nhân", "30g", 6000, 170, 6, "fat"),
        "cashews": IngredientPrice("hạt điều", "30g", 7000, 160, 5, "fat"),
        
        # Common Vietnamese Dishes (prepared)
        "pho": IngredientPrice("phở bò", "1 bát", 35000, 450, 25, "protein"),
        "bun_cha": IngredientPrice("bún chả", "1 suất", 40000, 500, 30, "protein"),
        "com_tam": IngredientPrice("cơm tấm", "1 suất", 35000, 600, 25, "protein"),
        "banh_mi": IngredientPrice("bánh mì thịt", "1 cái", 20000, 400, 15, "protein"),
        "goi_cuon": IngredientPrice("gỏi cuốn", "1 cuốn", 5000, 50, 3, "protein"),
        "spring_rolls": IngredientPrice("chả giò", "1 cái", 5000, 80, 2, "protein"),
    }
    
    @classmethod
    def get_price(cls, ingredient_name: str, amount: str) -> Optional[int]:
        """
        Get price for an ingredient
        
        Args:
            ingredient_name: Name of ingredient (e.g., "chicken breast", "rice")
            amount: Amount string (e.g., "150g", "1 bowl", "2 eggs")
        
        Returns:
            Price in VND, or None if ingredient not found
        """
        # Normalize ingredient name
        normalized_name = cls._normalize_name(ingredient_name)
        
        if normalized_name not in cls.PRICES:
            return None
        
        price_info = cls.PRICES[normalized_name]
        
        # Parse amount and calculate price
        multiplier = cls._parse_amount_multiplier(amount, price_info.unit)
        
        return int(price_info.price_vnd * multiplier)
    
    @classmethod
    def _normalize_name(cls, name: str) -> str:
        """Normalize ingredient name to match database keys"""
        name_lower = name.lower().strip()
        
        # Common mappings
        mappings = {
            "chicken breast": "chicken_breast",
            "chicken": "chicken_breast",
            "beef": "beef_lean",
            "pork": "pork_tenderloin",
            "rice": "rice_white",
            "brown rice": "rice_brown",
            "eggs": "eggs",
            "egg": "eggs",
            "tofu": "tofu",
            "salmon": "salmon",
            "milk": "milk",
            "yogurt": "yogurt",
            "bread": "bread",
            "banana": "banana",
            "apple": "apple",
            "avocado": "avocado",
        }
        
        for key, value in mappings.items():
            if key in name_lower:
                return value
        
        return name_lower.replace(" ", "_")
    
    @classmethod
    def _parse_amount_multiplier(cls, amount: str, unit: str) -> float:
        """
        Parse amount string and return multiplier based on unit
        
        Examples:
            amount="150g", unit="100g" -> 1.5
            amount="2 eggs", unit="10 quả" -> 0.2
            amount="1 bowl", unit="1 bát" -> 1.0
        """
        amount_lower = amount.lower()
        
        # Extract number from amount
        import re
        number_match = re.search(r'(\d+\.?\d*)', amount_lower)
        if not number_match:
            return 1.0
        
        amount_value = float(number_match.group(1))
        
        # Handle grams
        if "g" in amount_lower and "g" in unit:
            # Extract unit grams
            unit_match = re.search(r'(\d+)g', unit)
            if unit_match:
                unit_grams = int(unit_match.group(1))
                return amount_value / unit_grams
        
        # Handle pieces/units
        if "quả" in unit or "cái" in unit or "bát" in unit or "bìa" in unit:
            if "10" in unit:
                return amount_value / 10
            return amount_value
        
        # Default
        return 1.0
    
    @classmethod
    def estimate_meal_cost(cls, ingredients: List[dict]) -> int:
        """
        Estimate total cost for a meal's ingredients
        
        Args:
            ingredients: List of {"name": str, "amount": str} dicts
        
        Returns:
            Total cost in VND
        """
        total_cost = 0
        
        for ingredient in ingredients:
            name = ingredient.get("name", "")
            amount = ingredient.get("amount", "100g")
            
            price = cls.get_price(name, amount)
            if price:
                total_cost += price
            else:
                # Fallback estimation if ingredient not in database
                total_cost += cls._fallback_estimate(ingredient)
        
        return total_cost
    
    @classmethod
    def _fallback_estimate(cls, ingredient: dict) -> int:
        """
        Fallback price estimation for unknown ingredients
        Based on category heuristics
        """
        name = ingredient.get("name", "").lower()
        amount = ingredient.get("amount", "100g")
        
        # Extract number from amount
        import re
        number_match = re.search(r'(\d+\.?\d*)', amount)
        multiplier = float(number_match.group(1)) if number_match else 1.0
        
        # Category-based estimates per 100g
        category_estimates = {
            "protein": 25000,  # ~25k for 100g protein
            "carb": 5000,     # ~5k for 100g carb
            "veg": 6000,      # ~6k for 100g veg
            "fruit": 10000,   # ~10k for 100g fruit
            "fat": 15000,     # ~15k for 100g fat
        }
        
        # Guess category from name
        if any(word in name for word in ["gà", "bò", "thịt", "cá", "trứng", "tôm"]):
            category = "protein"
        elif any(word in name for word in ["cơm", "gạo", "mì", "bánh", "khoai"]):
            category = "carb"
        elif any(word in name for word in ["rau", "cải", "bắp", "cà"]):
            category = "veg"
        elif any(word in name for word in ["trái", "quả", "cây"]):
            category = "fruit"
        elif any(word in name for word in ["dầu", "bơ", "hạt"]):
            category = "fat"
        else:
            category = "other"
        
        base_price = category_estimates.get(category, 15000)
        
        # Adjust for multiplier (assuming 100g base)
        if "g" in amount:
            return int(base_price * multiplier / 100)
        
        return int(base_price)
    
    @classmethod
    def get_ingredients_by_category(cls, category: str, budget: int) -> List[str]:
        """
        Get affordable ingredients within budget for a category
        
        Args:
            category: "protein", "carb", "veg", "fruit", "fat"
            budget: Budget in VND per 100g serving
        
        Returns:
            List of affordable ingredient names
        """
        affordable = []
        
        for key, price_info in cls.PRICES.items():
            if price_info.category == category:
                # Calculate price per 100g equivalent
                if "100g" in price_info.unit:
                    price = price_info.price_vnd
                elif "1kg" in price_info.unit:
                    price = price_info.price_vnd / 10
                elif "10 quả" in price_info.unit:
                    price = price_info.price_vnd / 10
                else:
                    price = price_info.price_vn  # Assume per unit
                
                if price <= budget:
                    affordable.append(price_info.name)
        
        return affordable
    
    @classmethod
    def suggest_affordable_alternative(cls, ingredient_name: str, budget: int) -> Optional[str]:
        """
        Suggest a cheaper alternative ingredient within budget
        
        Args:
            ingredient_name: Original ingredient name
            budget: Budget in VND
        
        Returns:
            Suggested alternative name, or None if no suitable alternative
        """
        # Get category of original ingredient
        normalized_name = cls._normalize_name(ingredient_name)
        
        if normalized_name not in cls.PRICES:
            return None
        
        original_info = cls.PRICES[normalized_name]
        category = original_info.category
        
        # Find cheaper alternatives in same category
        alternatives = []
        for key, price_info in cls.PRICES.items():
            if price_info.category == category and price_info.price_vnd <= budget:
                alternatives.append((price_info.name, price_info.price_vnd))
        
        # Sort by price (cheapest first)
        alternatives.sort(key=lambda x: x[1])
        
        if alternatives:
            return alternatives[0][0]
        
        return None


# Global instance
price_db = PriceDatabase()
