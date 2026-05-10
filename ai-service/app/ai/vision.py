"""
AI Vision (Model 3) - Food Recognition and Calorie Estimation
Uses Google Gemini for analyzing food images
"""
import os
import io
import base64
import json
from typing import List, Optional, Tuple
from PIL import Image
import google.generativeai as genai
from ..schemas.nutrition import (
    FoodTrackingRequest, FoodTrackingResponse, FoodRecognitionResult
)


# System Prompt for Gemini Vision - Food Recognition
VISION_SYSTEM_PROMPT = """You are a nutrition expert specializing in Vietnamese cuisine. Analyze food images and provide accurate nutritional estimates.

TASK:
1. Identify the Vietnamese dish(es) in the image
2. Estimate portion size/weight
3. Calculate approximate calories and macros
4. Provide adjustment advice if the meal is too high in calories

VIETNAMESE FOOD KNOWLEDGE BASE:

Rice & Noodle Dishes:
- Cơm tấm sườn nướng (1 plate): ~700 kcal, 25g P, 80g C, 25g F
- Cơm gà Hải Nam (1 plate): ~650 kcal, 35g P, 75g C, 20g F
- Phở bò (1 bowl): ~450 kcal, 20g P, 65g C, 12g F
- Bún chả (1 bowl): ~550 kcal, 25g P, 70g C, 15g F
- Bún bò Huế (1 bowl): ~600 kcal, 30g P, 65g C, 20g F
- Hủ tiếu (1 bowl): ~400 kcal, 15g P, 60g C, 10g F
- Cơm chiên (1 plate): ~550 kcal, 15g P, 70g C, 22g F

Protein Dishes:
- Cá kho (1 piece + sauce, 150g): ~250 kcal, 25g P, 10g C, 12g F
- Thịt kho trứng (1 serving): ~400 kcal, 25g P, 15g C, 25g F
- Gà kho gừng (100g meat): ~200 kcal, 28g P, 5g C, 8g F
- Tôm rang (100g): ~120 kcal, 24g P, 2g C, 2g F
- Đậu phụ rán (1 bìa): ~150 kcal, 12g P, 8g C, 8g F

Vegetable Dishes:
- Rau muống xào tỏi (1 đĩa): ~120 kcal, 4g P, 10g C, 8g F
- Canh chua (1 bowl): ~80 kcal, 8g P, 12g C, 2g F
- Canh bí đỏ (1 bowl): ~70 kcal, 3g P, 15g C, 1g F
- Đậu bắp luộc (100g): ~35 kcal, 2g P, 7g C, 0g F

Beverages:
- Cà phê sữa đá: ~120 kcal, 4g P, 16g C, 4g F
- Sinh tố bơ: ~300 kcal, 4g P, 30g C, 18g F
- Nước mía: ~180 kcal, 0g P, 45g C, 0g F
- Trà sữa trân châu: ~350 kcal, 4g P, 60g C, 10g F

Snacks:
- Bánh mì thịt (1 ổ): ~450 kcal, 20g P, 50g C, 18g F
- Xôi xéo (1 gói): ~300 kcal, 8g P, 50g C, 8g F
- Bánh bao (1 cái): ~280 kcal, 8g P, 45g C, 8g F
- Chè các loại (1 bowl): ~250 kcal, 4g P, 50g C, 4g F

Fast Food:
- Mì tôm (1 gói): ~350 kcal, 8g P, 50g C, 14g F
- Bánh pizza (1 slice): ~280 kcal, 12g P, 32g C, 10g F
- Hamburger: ~450 kcal, 20g P, 40g C, 22g F
- Gà rán KFC (1 miếng): ~320 kcal, 18g P, 12g C, 22g F
- Khoai tây chiên (1 phần nhỏ): ~220 kcal, 3g P, 28g C, 11g F

ANALYSIS GUIDELINES:
1. Consider portion size relative to standard bowl/plate
2. Account for cooking oil (1 tbsp ~ 120 kcal)
3. Include all visible components (sauce, toppings, side dishes)
4. Consider typical preparation methods for Vietnamese dishes
5. Note if food appears oily/fried vs steamed/boiled

OUTPUT FORMAT - STRICT JSON:
{
    "recognized_foods": [
        {
            "food_name": "Vietnamese dish name",
            "confidence": float (0.0-1.0),
            "estimated_weight": "estimated weight (e.g., '200g', '1 bowl')",
            "calories": int,
            "protein": float,
            "carb": float,
            "fat": float,
            "adjust_advice": "adjustment advice if calories high, otherwise null"
        }
    ],
    "total_calories": int (sum of all items),
    "meal_advice": "general advice about this meal",
    "alternative_suggestions": ["healthier alternative 1", "alternative 2"]
}

IMPORTANT:
- Output ONLY valid JSON
- Food names in Vietnamese
- Realistic calorie estimates for Vietnamese cuisine
- Flag high-calorie items with adjustment advice
"""


class AIVision:
    """
    AI Vision for food recognition using Google Gemini
    """
    
    def __init__(self):
        """Initialize Gemini client"""
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY environment variable not set")
        
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-3.1-pro-preview')
        
        # Calorie thresholds for advice
        self.CALORIE_THRESHOLDS = {
            "breakfast": 500,
            "lunch": 800,
            "dinner": 700,
            "snack": 200
        }
    
    def _preprocess_image(self, image_base64: str) -> Tuple[str, Tuple[int, int]]:
        """
        Preprocess image: resize if needed, validate format
        
        Returns:
            (processed_base64, (width, height))
        """
        try:
            # Decode base64
            image_data = base64.b64decode(image_base64)
            image = Image.open(io.BytesIO(image_data))
            
            # Convert to RGB if necessary
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            original_size = image.size
            
            # Resize if larger than 800x800
            max_size = (800, 800)
            if image.width > max_size[0] or image.height > max_size[1]:
                image.thumbnail(max_size, Image.Resampling.LANCZOS)
            
            # Compress and convert to base64
            buffer = io.BytesIO()
            image.save(buffer, format='JPEG', quality=85, optimize=True)
            processed_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
            
            return processed_base64, original_size
            
        except Exception as e:
            raise ValueError(f"Image preprocessing failed: {str(e)}")
    
    def _preprocess_image_to_bytes(self, image_base64: str) -> Tuple[bytes, Tuple[int, int]]:
        """
        Preprocess image and return bytes for Gemini API
        
        Returns:
            (image_bytes, (width, height))
        """
        try:
            # Decode base64
            image_data = base64.b64decode(image_base64)
            image = Image.open(io.BytesIO(image_data))
            
            # Convert to RGB if necessary
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            original_size = image.size
            
            # Resize if larger than 800x800
            max_size = (800, 800)
            if image.width > max_size[0] or image.height > max_size[1]:
                image.thumbnail(max_size, Image.Resampling.LANCZOS)
            
            # Save to bytes
            buffer = io.BytesIO()
            image.save(buffer, format='JPEG', quality=85, optimize=True)
            image_bytes = buffer.getvalue()
            
            return image_bytes, original_size
            
        except Exception as e:
            raise ValueError(f"Image preprocessing failed: {str(e)}")
    
    def _check_calorie_threshold(
        self, 
        calories: int, 
        meal_context: Optional[str]
    ) -> Optional[str]:
        """
        Check if calories exceed threshold for meal type
        """
        if not meal_context:
            return None
        
        threshold = self.CALORIE_THRESHOLDS.get(meal_context.lower(), 600)
        
        if calories > threshold * 1.5:
            return f"⚠️ Calorie quá cao ({calories} > {threshold}). Ăn ít cơm/tinh bột hơn vào bữa tối nay hoặc tập thêm 30 phút cardio."
        elif calories > threshold * 1.2:
            return f"⚡ Calorie hơi cao ({calories}). Nên giảm 1/2 bát cơm bữa tối hoặc tập thêm 15 phút."
        
        return None
    
    def analyze_food(
        self, 
        request: FoodTrackingRequest
    ) -> FoodTrackingResponse:
        """
        Analyze food image and return nutritional information using Gemini
        """
        # Preprocess image
        processed_image_bytes, original_size = self._preprocess_image_to_bytes(request.image_base64)
        
        # Build prompt with context
        context_info = ""
        if request.meal_context:
            context_info = f"\nMeal context: {request.meal_context}"
        if request.user_daily_target:
            context_info += f"\nUser daily calorie target: {request.user_daily_target} kcal"
        
        prompt_text = f"{VISION_SYSTEM_PROMPT}\n\nAnalyze this Vietnamese food image and provide nutritional information.{context_info}\n\nReturn ONLY valid JSON."
        
        try:
            # Call Gemini Vision
            response = self.model.generate_content(
                [prompt_text, processed_image_bytes],
                generation_config=genai.types.GenerationConfig(
                    temperature=0.3,
                    max_output_tokens=2000
                )
            )
            
            # Parse response - extract JSON
            response_text = response.text
            try:
                result = json.loads(response_text)
            except json.JSONDecodeError:
                # Try to extract JSON from markdown code blocks
                if "```json" in response_text:
                    json_str = response_text.split("```json")[1].split("```")[0].strip()
                    result = json.loads(json_str)
                elif "```" in response_text:
                    json_str = response_text.split("```")[1].strip()
                    result = json.loads(json_str)
                else:
                    raise ValueError("Could not parse JSON from Gemini response")
            
            # Process recognized foods
            foods = []
            total_calories = 0
            
            for food_data in result.get("recognized_foods", []):
                # Check calorie threshold
                adjust_advice = self._check_calorie_threshold(
                    food_data.get("calories", 0),
                    request.meal_context
                )
                
                # If AI already provided advice, use that instead
                if food_data.get("adjust_advice"):
                    adjust_advice = food_data["adjust_advice"]
                
                food_result = FoodRecognitionResult(
                    food_name=food_data["food_name"],
                    confidence=food_data.get("confidence", 0.8),
                    estimated_weight=food_data["estimated_weight"],
                    calories=food_data["calories"],
                    protein=food_data.get("protein", 0),
                    carb=food_data.get("carb", 0),
                    fat=food_data.get("fat", 0),
                    adjust_advice=adjust_advice
                )
                
                foods.append(food_result)
                total_calories += food_data["calories"]
            
            # Calculate remaining calories
            remaining = None
            if request.user_daily_target:
                remaining = request.user_daily_target - total_calories
            
            # Get alternative suggestions
            alternatives = result.get("alternative_suggestions", [])
            if not alternatives:
                alternatives = self._suggest_alternatives(foods)
            
            return FoodTrackingResponse(
                recognized_foods=foods,
                total_calories=total_calories,
                remaining_calories=remaining,
                meal_advice=result.get("meal_advice"),
                alternative_suggestions=alternatives
            )
            
        except Exception as e:
            raise ValueError(f"Food analysis failed: {str(e)}")
    
    def _suggest_alternatives(self, foods: List[FoodRecognitionResult]) -> List[str]:
        """
        Suggest healthier alternatives based on recognized foods
        """
        alternatives = []
        
        high_calorie_foods = [f for f in foods if f.calories > 400]
        
        for food in high_calorie_foods:
            name_lower = food.food_name.lower()
            
            if "chiên" in name_lower or "rán" in name_lower:
                alternatives.append(f"Thay {food.food_name} bằng phiên bản hấp/luộc để giảm {int(food.calories * 0.3)} kcal")
            
            if "cơm" in name_lower and food.calories > 500:
                alternatives.append(f"Giảm 1/2 bát cơm, thêm rau để no lâu hơn với ít kcal hơn")
            
            if "nước" in name_lower or "trà sữa" in name_lower or "sinh tố" in name_lower:
                alternatives.append(f"Thay đồ uống có đường bằng trà đá/trà không đường")
            
            if "bánh" in name_lower or "bánh mì" in name_lower:
                alternatives.append(f"Thay bánh mì bằng bánh mì đen/đa lúa mì để giảm carbs")
        
        if not alternatives:
            alternatives = [
                "Thêm rau xanh để tăng cảm giác no",
                "Uống nước trước bữa ăn để giảm lượng thức ăn",
                "Ăn chậm và nhai kỹ để tiêu hóa tốt hơn"
            ]
        
        return alternatives[:3]  # Return max 3 suggestions
    
    def estimate_portion(
        self,
        food_name: str,
        image_base64: str
    ) -> dict:
        """
        Estimate portion size of a specific food item using Gemini
        """
        processed_image_bytes, _ = self._preprocess_image_to_bytes(image_base64)
        
        prompt = f"""Estimate the portion size of {food_name} in this image.

OUTPUT JSON:
{{
    "estimated_weight": "weight in grams (e.g., '150g')",
    "estimated_volume": "volume description (e.g., '1 bowl', '1 plate')",
    "serving_comparison": "comparison to standard serving (e.g., '1.5x standard serving')",
    "confidence": float (0.0-1.0)
}}
"""
        
        try:
            response = self.model.generate_content(
                [prompt, processed_image_bytes],
                generation_config=genai.types.GenerationConfig(
                    temperature=0.3,
                    max_output_tokens=500
                )
            )
            
            response_text = response.text
            try:
                return json.loads(response_text)
            except json.JSONDecodeError:
                if "```json" in response_text:
                    json_str = response_text.split("```json")[1].split("```")[0].strip()
                    return json.loads(json_str)
                elif "```" in response_text:
                    json_str = response_text.split("```")[1].strip()
                    return json.loads(json_str)
                else:
                    raise ValueError("Could not parse JSON from Gemini response")
            
        except Exception as e:
            raise ValueError(f"Portion estimation failed: {str(e)}")
