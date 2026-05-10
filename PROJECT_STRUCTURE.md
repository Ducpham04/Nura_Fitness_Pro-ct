# 🏗️ Fitnit Challenge - Project Structure

## Overview

Project được tổ chức thành **3 modules độc lập**, mỗi module có thể chạy riêng và tích hợp sau.

```
FitnitChallenge/
├── model1-pose-service/          # ✅ ĐÃ TÁCH - Pose Detection
├── ai-service/                    # ⭐ MỚI - Nutrition & Food AI
└── PROJECT_STRUCTURE.md           # 📄 File này
```

---

## 📦 Module 1: Pose Detection Service (Đã Hoàn Thành)

**Vị trí:** `fitness-ai-service/` (giữ nguyên)

### Chức năng
- Nhận diện 16 bài tập thể hình real-time
- Đếm số rep tự động
- Phân tích form đúng/sai

### Tech Stack
- MediaPipe Pose (33 landmarks)
- RandomForest Classifier
- OpenCV + FastAPI

### File chính
```
fitness-ai-service/
├── scripts/
│   └── form_trainer.py          # ⭐ Main script để chạy
├── src/
│   ├── model/
│   │   ├── classifier.py        # RandomForest
│   │   ├── rep_counter.py     # Đếm rep
│   │   └── form_checker.py     # Check form
│   └── api/
│       └── fast_api.py          # API endpoint
└── models/
    └── classifier.pkl           # Trained model
```

### Chạy
```bash
cd fitness-ai-service
python scripts/form_trainer.py          # CLI mode
python src/api/fast_api.py              # API mode (port 8000)
```

---

## 📦 Module 2 & 3: AI Service (Vừa Tạo)

**Vị trí:** `ai-service/` (mới)

### Chức năng

#### Model 2: Personal Coach (Meal Planning)
- Tính BMR/TDEE
- Tạo thực đơn 7 ngày
- Tối ưu theo ngân sách (50k-200k/ngày)

#### Model 3: AI Vision (Food Tracking)
- Nhận diện món ăn từ ảnh
- Tính calories tự động
- Gợi ý điều chỉnh khi ăn quá nhiều

### Tech Stack
- FastAPI
- GPT-4o (OpenAI)
- Pydantic
- Pillow (image processing)

### File chính
```
ai-service/
├── app/
│   ├── core/
│   │   └── analyzer.py           # BMR/TDEE calculations
│   ├── ai/
│   │   ├── planner.py            # GPT-4o meal planning ⭐ Model 2
│   │   └── vision.py             # GPT-4o Vision ⭐ Model 3
│   ├── schemas/
│   │   └── nutrition.py          # Pydantic models
│   └── mock_data/
│       └── food_db.json          # Vietnamese food DB
├── main.py                       # FastAPI entry point
├── requirements.txt
└── README.md
```

### Chạy
```bash
cd ai-service
pip install -r requirements.txt
export OPENAI_API_KEY="your-key"
python main.py                      # Port 8001
```

### API Endpoints
```
POST /analyze-user        # Tính BMR/TDEE
POST /plan                # Tạo thực đơn ⭐ Model 2
POST /track-food          # Nhận diện đồ ăn ⭐ Model 3
POST /adjust-plan         # Điều chỉnh thực đơn
POST /cheat-meal          # Xử lý "ăn bậy"
GET  /sample-profiles     # Test data
GET  /docs                # Swagger UI
```

---

## 🔌 Integration Guide

### Cách tích hợp 3 modules

```python
# Sau này khi muốn ghép lại:

# Module 1: Lấy dữ liệu tập luyện
exercise_data = requests.get("http://localhost:8000/api/exercise-stats")
calories_burned = exercise_data["total_calories_burned"]

# Module 2: Tạo thực đơn bù vào calories đã đốt
meal_plan = requests.post("http://localhost:8001/plan", json={
    "user_profile": { ... },
    "target_calories": tdee + calories_burned
})

# Module 3: Track đồ ăn thực tế
food_log = requests.post("http://localhost:8001/track-food", 
    files={"image": open("lunch.jpg", "rb")}
)
```

---

## 🧪 Test Cases

### Model 1 Test
```bash
cd fitness-ai-service
python scripts/form_trainer.py
# Chọn 11 (Hammer Curl)
# Tập với webcam để test đếm rep
```

### Model 2 Test (API)
```bash
# Test "Săn Deal" - Sinh viên 60k/ngày
curl -X POST http://localhost:8001/plan \
  -H "Content-Type: application/json" \
  -d '{
    "user_profile": {
      "weight": 65, "height": 170, "age": 22,
      "gender": "male", "activity_level": "moderate",
      "goal": "muscle_gain", "budget_per_day": 60000
    },
    "days": 7
  }'
```

### Model 3 Test (API)
```bash
# Test nhận diện đồ ăn
curl -X POST http://localhost:8001/track-food \
  -F "image=@com_tam.jpg" \
  -F "meal_context=lunch" \
  -F "user_daily_target=2000"
```

---

## 📝 Checklist Tiến Độ

### Model 1 (Pose Detection) ✅
- [x] Pose estimation (MediaPipe)
- [x] Exercise classification (RandomForest)
- [x] Rep counting
- [x] Form checking
- [x] CLI interface
- [x] Web API

### Model 2 (Meal Planning) ✅
- [x] BMR/TDEE calculation
- [x] Budget validation (50k min)
- [x] GPT-4o integration
- [x] 7-day meal plan generation
- [x] Vietnamese food database
- [x] Macro calculation
- [x] Shopping list generation

### Model 3 (Food Tracking) ✅
- [x] Image preprocessing
- [x] GPT-4o Vision integration
- [x] Vietnamese food recognition
- [x] Calorie estimation
- [x] Adjustment advice
- [x] Alternative suggestions

---

## 🚀 Next Steps

### Tuần này
1. Test Model 2 & 3 endpoints qua Swagger UI
2. Verify JSON output chuẩn 100%
3. Cài thư viện OpenAI: `pip install openai`

### Sprint tiếp theo
1. Tích hợp 3 models vào unified dashboard
2. Thêm authentication
3. Database integration (PostgreSQL)
4. Mobile app wrapper

---

## 💡 Notes

### Port Allocation
- **8000**: Model 1 (Pose Detection API)
- **8001**: Model 2 & 3 (AI Service API)

### Environment Variables
```bash
# Model 1 (không cần)

# Model 2 & 3 (bắt buộc)
export OPENAI_API_KEY="sk-..."
```

### Dependencies
```bash
# Model 1
cd fitness-ai-service
# Already has: opencv-python, mediapipe, scikit-learn, fastapi

# Model 2 & 3
cd ai-service
pip install -r requirements.txt  # openai, fastapi, pydantic, pillow
```

---

## 📞 Support

### Model 1 Issues
- File: `scripts/form_trainer.py`
- Port: 8000
- Log: Terminal output

### Model 2 & 3 Issues
- File: `ai-service/main.py`
- Port: 8001
- Log: `/docs` endpoint

---

*Structure Version: 1.1*
*Last Updated: May 2026*
