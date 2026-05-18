# 🤖 Fitness AI Service

AI-powered nutrition planning and food tracking service for Fitnit Challenge.

## Overview

This service implements **Model 2 (Personal Coach/Planner)** and **Model 3 (AI Vision/Food Tracking)** from the Fitness AI architecture.

### Models

| Model | Name | Description | Technology |
|-------|------|-------------|------------|
| **Model 2** | Personal Coach | Meal planning with budget constraints | Groq + Rule-based |
| **Model 3** | AI Vision | Food recognition & calorie estimation | Groq Vision |

---

## 🏗️ Architecture

```
ai-service/
├── app/
│   ├── core/           # Business logic (Rule-based calculations)
│   │   └── analyzer.py     # BMR, TDEE, macro calculations
│   ├── ai/             # AI integrations (GPT-4o)
│   │   ├── planner.py      # Model 2: Meal planning
│   │   └── vision.py       # Model 3: Food tracking
│   ├── schemas/        # Data models (Pydantic)
│   │   └── nutrition.py    # All data schemas
│   └── mock_data/      # Mock database
│       └── food_db.json    # Vietnamese food database
├── main.py             # FastAPI entry point
└── requirements.txt
```

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd ai-service
pip install -r requirements.txt
```

### 2. Configure Environment Variables

**Option A: Using .env file (Recommended)**

```bash
# Copy the example file
cp .env.example .env

# Edit .env and add your Groq API key
GROQ_API_KEY=your_groq_api_key_here
```

**Option B: Export directly**

```bash
export GROQ_API_KEY="your_groq_api_key_here"
```

### 3. Run Server

```bash
python main.py
```

Server runs on **http://localhost:8001**

### 4. Access API Documentation

- **Swagger UI**: http://localhost:8001/docs
- **ReDoc**: http://localhost:8001/redoc

---

## 📡 API Endpoints

### Model 2: Personal Coach (Meal Planning)

#### POST `/analyze-user`
Analyze user profile and calculate metrics (BMR, TDEE, macros, budget tier).

**Request:**
```json
{
  "weight": 65,
  "height": 170,
  "age": 22,
  "gender": "male",
  "activity_level": "moderate",
  "goal": "muscle_gain",
  "budget_per_day": 60000,
  "fitness_level": "intermediate"
}
```

**Response:**
```json
{
  "user_summary": {
    "bmr": 1650,
    "tdee": 2557,
    "target_calories": 2857,
    "budget_tier": "low"
  },
  "macro_targets": {
    "protein": 130,
    "carb": 350,
    "fat": 70
  },
  "budget_recommendations": ["Trứng gà: 3,500đ/quả", "..."]
}
```

#### POST `/plan`
Generate personalized 7-day meal plan.

**Request:**
```json
{
  "user_profile": { ... },
  "days": 7,
  "preferences": ["high_protein", "vietnamese_cuisine"]
}
```

**Response:** `NutritionPlanResponse` with daily meal plans, shopping lists, and cost estimates.

#### POST `/adjust-plan`
Adjust existing plan based on constraints (e.g., "Supermarket out of beef").

#### POST `/cheat-meal`
Handle cheat meals with compensation advice.

### Model 3: AI Vision (Food Tracking)

#### POST `/track-food`
Analyze food image and track nutrition.

**Form Data:**
- `image`: Image file (JPEG/PNG)
- `meal_context`: breakfast/lunch/dinner/snack (optional)
- `user_daily_target`: Daily calorie target (optional)

**Response:**
```json
{
  "recognized_foods": [
    {
      "food_name": "Cơm tấm sườn nướng",
      "confidence": 0.92,
      "estimated_weight": "1 plate (~300g)",
      "calories": 700,
      "protein": 25,
      "carb": 80,
      "fat": 25,
      "adjust_advice": "⚠️ Calorie cao - Giảm 1/2 bát cơm bữa tối"
    }
  ],
  "total_calories": 700,
  "remaining_calories": 1300,
  "alternative_suggestions": ["Thay đùi gà bằng ức gà để giảm 100 kcal"]
}
```

### Utility Endpoints

- `GET /sample-profiles` - Get test user profiles
- `GET /budget-foods/{tier}` - Get food recommendations by budget tier
- `GET /health` - Health check
- `GET /docs` - Swagger UI

---

## 🧪 Test Cases

### Test Case 1: "Săn Deal" (Student Budget)

```bash
# Get sample profile
curl http://localhost:8001/sample-profiles

# Generate plan for student with 60k/day budget
curl -X POST http://localhost:8001/plan \
  -H "Content-Type: application/json" \
  -d '{
    "user_profile": {
      "weight": 65,
      "height": 170,
      "age": 22,
      "gender": "male",
      "activity_level": "moderate",
      "goal": "muscle_gain",
      "budget_per_day": 60000,
      "fitness_level": "intermediate"
    },
    "days": 7
  }'
```

**Expected:** AI should suggest eggs, tofu, chicken breast (bulk buy), sweet potatoes.

### Test Case 2: "Ăn Bậy" (Cheat Meal)

```bash
curl -X POST http://localhost:8001/cheat-meal \
  -H "Content-Type: application/json" \
  -d '{
    "food_consumed": "Tôi vừa ăn 1 bát mì tôm 400 kcal",
    "calories_consumed": 400,
    "user_daily_target": 2000,
    "user_profile": { ... }
  }'
```

**Expected:** Compensation plan to reduce dinner calories and add 15-min plank.

### Test Case 3: "Đổi Món" (Ingredient Substitution)

```bash
curl -X POST http://localhost:8001/adjust-plan \
  -H "Content-Type: application/json" \
  -d '{
    "current_plan": { ... },
    "constraint": "Siêu thị hết thịt bò",
    "user_profile": { ... }
  }'
```

**Expected:** Suggest 150g cá rô phi, save 15,000đ.

---

## 🧠 AI Technology

This service uses **Groq-hosted Llama models** for:
- Meal planning with natural language understanding
- Vietnamese food recognition from images
- Calorie estimation and portion analysis

### Why Groq?
- Fast OpenAI-compatible API
- Supports Llama text and vision models
- One `GROQ_API_KEY` for meal planning, workout planning, and vision flows

---

## 🧮 Core Logic (Model 2)

### BMR Calculation

**Mifflin-St Jeor Equation:**
```
Men:   BMR = (10 × weight) + (6.25 × height) - (5 × age) + 5
Women: BMR = (10 × weight) + (6.25 × height) - (5 × age) - 161
```

**Katch-McArdle (if body fat % known):**
```
BMR = 370 + (21.6 × Lean Body Mass)
LBM = Weight × (1 - Body Fat %)
```

### TDEE Calculation

```
TDEE = BMR × Activity Multiplier

Activity Levels:
- Sedentary: 1.2
- Light: 1.375
- Moderate: 1.55
- Active: 1.725
- Very Active: 1.9
```

### Budget Validation

```python
MIN_BUDGET = 50_000  # VND/day

if budget < MIN_BUDGET:
    raise Error("Budget must be at least 50,000 VND")
```

---

## 🖼️ AI Vision (Model 3)

### Image Preprocessing

1. **Resize**: Max 800×800 pixels
2. **Format**: JPEG compression (quality 85)
3. **Encoding**: Base64 for API transport

### Vietnamese Food Database

The AI has been trained on 50+ Vietnamese dishes:

| Dish | Calories | Protein | Carbs | Fat |
|------|----------|---------|-------|-----|
| Cơm tấm sườn nướng | 700 | 25g | 80g | 25g |
| Phở bò | 450 | 20g | 65g | 12g |
| Bún chả | 550 | 25g | 70g | 15g |
| Cơm gà Hải Nam | 650 | 35g | 75g | 20g |
| Bánh mì thịt | 450 | 20g | 50g | 18g |

---

## 💰 Budget Tiers

### Low Budget (< 80,000 VND/day)
- **Proteins**: Eggs, tofu, chicken breast (bulk), mackerel
- **Carbs**: White rice, sweet potato, oats
- **Tips**: Buy chicken breast in bulk (save 20%)

### Medium Budget (80,000 - 150,000 VND/day)
- **Proteins**: Chicken thigh, salmon portions, shrimp
- **Carbs**: Brown rice, oats, bread
- **Extras**: Fresh milk, mixed nuts, seasonal fruits

### High Budget (> 150,000 VND/day)
- **Proteins**: Beef cuts, fresh salmon, whey protein
- **Supplements**: Creatine, multivitamins
- **Organic**: Premium nuts, organic vegetables

---

## ⚙️ Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GROQ_API_KEY` | Yes | Groq API key |
| `GROQ_SMART_MEAL_MODEL` | No | Smart meal model (default: `llama-3.1-8b-instant`) |
| `PORT` | No | Server port (default: 8001) |

---

## 📁 Project Structure

```
FitnitChallenge/
├── ai-service/              # ⭐ This service (Models 2 & 3)
│   ├── app/
│   │   ├── core/
│   │   │   └── analyzer.py      # BMR/TDEE calculations
│   │   ├── ai/
│   │   │   ├── planner.py       # GPT-4o meal planning
│   │   │   └── vision.py        # GPT-4o Vision food tracking
│   │   ├── schemas/
│   │   │   └── nutrition.py     # Pydantic models
│   │   └── mock_data/
│   │       └── food_db.json     # Vietnamese food database
│   ├── main.py                 # FastAPI entry
│   └── requirements.txt
│
├── fitness-ai-service/        # Model 1 (separate)
│   └── ... (pose detection)
│
└── README.md
```

---

## 🤝 Integration with Model 1

The three models work together:

```
Model 1 (Pose Detection)     Model 2 (Meal Planning)      Model 3 (Food Tracking)
       │                               │                              │
       │  Exercise data                │  Nutrition plan               │  Food log
       │  (squats, reps)               │  (calories, macros)           │  (calories consumed)
       │                               │                              │
       └───────────────┬───────────────┴───────────────┬──────────────┘
                       │                               │
                       ▼                               ▼
                    Unified Dashboard with complete health picture
```

---

## 📄 License

Internal use for Fitnit Challenge project.

---

## 👥 Team

- **AI Engineering**: GPT-4o integration
- **Nutrition Consultant**: Vietnamese diet database
- **Backend**: FastAPI development

---

*Last updated: May 2026*
