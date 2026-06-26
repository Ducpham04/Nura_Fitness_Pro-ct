# Fitnit Challenge — CLAUDE.md

## Stack
| Layer | Tech | Port |
|---|---|---|
| Frontend | React + Vite + TypeScript | 5173 |
| Backend | Spring Boot 3 (Java 17) | 8080 |
| AI Service | Python 3 + FastAPI + Groq | 8001 |
| Database | PostgreSQL | 5432 |
| Adminer | DB UI | 8081 |

## Chạy local
```bash
./dev.sh          # khởi động toàn bộ (Docker Compose)
```
Env vars cần thiết: `JWT_SECRET`, `SPRING_DATASOURCE_PASSWORD`, `GROQ_API_KEY`

## Backend (`backend/`)
**Package gốc:** `com.example.fitchallenge`

**Layers:**
- `Entity/` — 35 JPA entities (Lombok + Builder pattern)
- `DTO/` — request/response objects (theo domain)
- `repository/` — Spring Data JPA
- `service/` + `service/impl/` — business logic
- `controller/Admin/`, `controller/User/`, `controller/UserChallenge/` — REST endpoints
- `Security/JWT/` — JWT auth, `SecurityConfig.java`, `CorsConfig.java`

**Key entities:**
User, HealthProfile, UserBodyProfile, Goals, TrainingPlan, TrainingPlanDetail, DailyTrainingLog, UserTraining, UserTrainingSession, PersonalizedNutritionPlan, PersonalizedMealItem, DailyNutritionLog, Challenges, UserChallenge, Reward, Transaction, Food, Dish, Inventory

**Conventions:**
- Service interface + `impl/` class pattern
- DTO đặt theo domain (vd: `DTO/TrainingPlanDTO/`)
- Controller trả `ResponseEntity<>`
- `ddl-auto=create-drop` local → schema tạo lại mỗi lần restart

**Config quan trọng:**
- `src/main/resources/application.properties` — tất cả config
- AI service URL: `ai.service.url=http://localhost:8001`
- Swagger: `http://localhost:8080/swagger-ui.html`

## AI Service (`ai-service/`)
**Entry:** `main.py` (FastAPI)  
**Key modules:**
- `app/ai/integrated_planner.py` — sinh kế hoạch ăn + tập luyện kết hợp
- `app/ai/workout_planner.py` — workout plan
- `app/ai/planner.py` — meal plan (AIPlanner)
- `app/schemas/` — Pydantic schemas: `full_plan.py`, `nutrition.py`, `workout.py`
- `app/core/analyzer.py` — BodyAnalyzer

## Frontend (`frontend/`)
**Entry:** `src/main.tsx` → `App.tsx`  
**Key dirs:**
- `src/components/` — UI components (WorkoutTab, DietTab, ChallengesView, TrainingPlansView, TrainingView, CyberpunkWorkoutModal, CyberpunkMealModal...)
- `src/pages/DashboardLayout.tsx` — layout chính
- `src/services/` — apiClient.ts, authService.ts, trainingService.ts, userService.ts
- `src/hooks/useAuth.ts` — auth state
- `src/config/api.ts` — API_BASE_URL + tất cả endpoints
- `src/context/` — React context

**API base:** `http://localhost:8080` (VITE_API_URL env)

## Luồng chính
1. User login → JWT token → lưu local
2. FE gọi BE `/api/*` với Bearer token
3. BE gọi AI service `http://localhost:8001` cho plan generation
4. AI service dùng Groq API để generate plan

## Files đang thay đổi (uncommitted)
BE: `integrated_planner.py`, `workout_planner.py`, schemas  
FE: App.tsx, nhiều components, services, hooks
