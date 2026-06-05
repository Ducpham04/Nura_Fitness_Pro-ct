-- V10: Food Phase 2 — Fiber/Sugar/Sodium, Meal type tags, Vietnamese name, Cooking method, Allergens
-- ─────────────────────────────────────────────────────────────────────────────

-- New nutritional microfields
ALTER TABLE foods
    ADD COLUMN IF NOT EXISTS fiber_per_100g    DECIMAL(5,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS sugar_per_100g    DECIMAL(5,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS sodium_per_100mg  DECIMAL(7,2) DEFAULT 0,
    -- CSV of MealType: "BREAKFAST", "LUNCH", "DINNER", "SNACK" (can combine: "BREAKFAST,SNACK")
    -- AI meal planner reads this to avoid recommending Phở for BREAKFAST if not tagged
    ADD COLUMN IF NOT EXISTS meal_type_tags    VARCHAR(100) DEFAULT 'LUNCH,DINNER',
    ADD COLUMN IF NOT EXISTS vietnamese_name   VARCHAR(200),
    ADD COLUMN IF NOT EXISTS cooking_method    VARCHAR(20) DEFAULT 'COOKED';

-- Allergen table (@ElementCollection in Java)
CREATE TABLE IF NOT EXISTS food_allergens (
    food_id  BIGINT NOT NULL,
    allergen VARCHAR(50) NOT NULL,
    CONSTRAINT pk_food_allergens PRIMARY KEY (food_id, allergen),
    CONSTRAINT fk_food_allergens_food FOREIGN KEY (food_id) REFERENCES foods(food_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_food_allergens_food ON food_allergens(food_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Seed meal_type_tags for existing Vietnamese foods (by name pattern)
-- This is the most critical field — AI cannot recommend Phở for breakfast
-- without knowing its appropriate meal slots.
-- ─────────────────────────────────────────────────────────────────────────────

-- Breakfast foods (cháo, bánh mì, trứng, yến mạch, sữa)
UPDATE foods SET meal_type_tags = 'BREAKFAST,SNACK'
WHERE LOWER(name) LIKE '%chao%'       -- cháo
   OR LOWER(name) LIKE '%banh mi%'    -- bánh mì
   OR LOWER(name) LIKE '%bao%'        -- bánh bao
   OR LOWER(name) LIKE '%oat%'        -- yến mạch
   OR LOWER(name) LIKE '%yen mach%'
   OR LOWER(name) LIKE '%trung%'      -- trứng luộc/ốp la
   OR LOWER(name) LIKE '%egg%'
   OR LOWER(name) LIKE '%sua%'        -- sữa
   OR LOWER(name) LIKE '%milk%'
   OR LOWER(name) LIKE '%yogurt%';

-- Lunch & Dinner (cơm, phở, bún, mì, xôi)
UPDATE foods SET meal_type_tags = 'LUNCH,DINNER'
WHERE LOWER(name) LIKE '%com%'        -- cơm
   OR LOWER(name) LIKE '%pho%'        -- phở
   OR LOWER(name) LIKE '%bun%'        -- bún
   OR LOWER(name) LIKE '%mi%'         -- mì
   OR LOWER(name) LIKE '%xoi%'        -- xôi
   OR LOWER(name) LIKE '%hu tieu%';   -- hủ tiếu

-- All-day foods (thịt, cá, rau, đậu — protein & vegetables suit all meals)
UPDATE foods SET meal_type_tags = 'BREAKFAST,LUNCH,DINNER'
WHERE LOWER(name) LIKE '%thit%'       -- thịt (meat)
   OR LOWER(name) LIKE '%ca %'        -- cá (fish)
   OR LOWER(name) LIKE '%rau%'        -- rau (vegetables)
   OR LOWER(name) LIKE '%dau%'        -- đậu (beans/tofu)
   OR LOWER(name) LIKE '%tofu%'
   OR LOWER(name) LIKE '%ga%';        -- gà (chicken)

-- Snacks (trái cây, hạt, bánh snack)
UPDATE foods SET meal_type_tags = 'SNACK'
WHERE LOWER(name) LIKE '%chuoi%'      -- chuối
   OR LOWER(name) LIKE '%tao%'        -- táo
   OR LOWER(name) LIKE '%cam%'        -- cam
   OR LOWER(name) LIKE '%hat%'        -- hạt
   OR LOWER(name) LIKE '%nuts%'
   OR LOWER(name) LIKE '%fruit%';

-- Default for anything still NULL
UPDATE foods SET meal_type_tags = 'LUNCH,DINNER'
WHERE meal_type_tags IS NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- Seed cooking_method by category / name pattern
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE foods SET cooking_method = 'BOILED'
WHERE LOWER(name) LIKE '%luoc%'    -- luộc
   OR LOWER(name) LIKE '%boil%'
   OR LOWER(name) LIKE '%soup%'
   OR LOWER(name) LIKE '%canh%';   -- canh (soup)

UPDATE foods SET cooking_method = 'FRIED'
WHERE LOWER(name) LIKE '%chien%'   -- chiên
   OR LOWER(name) LIKE '%xao%'     -- xào (stir-fry)
   OR LOWER(name) LIKE '%fry%'
   OR LOWER(name) LIKE '%fried%';

UPDATE foods SET cooking_method = 'STEAMED'
WHERE LOWER(name) LIKE '%hap%'     -- hấp
   OR LOWER(name) LIKE '%steam%';

UPDATE foods SET cooking_method = 'GRILLED'
WHERE LOWER(name) LIKE '%nuong%'   -- nướng
   OR LOWER(name) LIKE '%grill%'
   OR LOWER(name) LIKE '%bbq%';

UPDATE foods SET cooking_method = 'RAW'
WHERE LOWER(name) LIKE '%song%'    -- sống
   OR LOWER(name) LIKE '%goi%'     -- gỏi (salad)
   OR LOWER(name) LIKE '%salad%';

-- Default
UPDATE foods SET cooking_method = 'COOKED'
WHERE cooking_method IS NULL OR cooking_method = '';

-- ─────────────────────────────────────────────────────────────────────────────
-- Seed vietnamese_name where name is already Vietnamese (copy name)
-- For foods with English names, leave NULL (will be filled manually)
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE foods SET vietnamese_name = name
WHERE vietnamese_name IS NULL
  AND (
       name ~ '[àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]'
    OR LOWER(name) LIKE '%com%'
    OR LOWER(name) LIKE '%pho%'
    OR LOWER(name) LIKE '%bun%'
    OR LOWER(name) LIKE '%thit%'
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_foods_meal_type_tags  ON foods(meal_type_tags);
CREATE INDEX IF NOT EXISTS idx_foods_cooking_method  ON foods(cooking_method);
CREATE INDEX IF NOT EXISTS idx_foods_vietnamese_name ON foods(vietnamese_name);
