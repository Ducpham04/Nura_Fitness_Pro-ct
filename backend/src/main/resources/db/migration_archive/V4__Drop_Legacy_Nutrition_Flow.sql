ALTER TABLE personalized_nutrition_plans DROP COLUMN IF EXISTS template_plan_id;

DROP TABLE IF EXISTS meal_foods;
DROP TABLE IF EXISTS meals;
DROP TABLE IF EXISTS user_nutrition;
DROP TABLE IF EXISTS nutrition_plans;
