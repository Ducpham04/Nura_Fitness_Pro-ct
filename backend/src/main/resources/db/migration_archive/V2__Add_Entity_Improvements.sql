-- Migration: Entity Improvements for AI Service Integration
-- Date: May 2026
-- Description: Add new tables and columns to support Smart Inventory, Personalized Plans, Budget Tracking

-- =============================================
-- 1. ALTER EXISTING TABLES (Soft Delete + New Columns)
-- =============================================

-- Add soft delete to DailyTrainingLog
ALTER TABLE daily_training_logs
ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE,
ADD COLUMN deleted_at TIMESTAMP NULL;

-- Add budget tracking to NutritionPlan
ALTER TABLE nutrition_plans
ADD COLUMN suggested_budget_per_day INT NULL COMMENT 'Ngân sách gợi ý mỗi ngày (VND)',
ADD COLUMN budget_tier VARCHAR(20) NULL COMMENT 'LOW, MEDIUM, HIGH',
ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE,
ADD COLUMN deleted_at TIMESTAMP NULL;

-- Add market price to Food
ALTER TABLE foods
ADD COLUMN average_market_price_vnd INT NULL COMMENT 'Giá trung bình trên thị trường VN (VND)',
ADD COLUMN category VARCHAR(30) NULL COMMENT 'PROTEIN, CARB, VEGETABLE, FRUIT, FAT, DAIRY';

-- Add body metrics to BodyMetricHistory
ALTER TABLE body_metric_history
ADD COLUMN waist_cm DECIMAL(5,2) NULL COMMENT 'Vòng eo (cm)',
ADD COLUMN hip_cm DECIMAL(5,2) NULL COMMENT 'Vòng hông (cm)',
ADD COLUMN chest_cm DECIMAL(5,2) NULL COMMENT 'Vòng ngực (cm)',
ADD COLUMN arm_cm DECIMAL(5,2) NULL COMMENT 'Vòng tay (cm)',
ADD COLUMN thigh_cm DECIMAL(5,2) NULL COMMENT 'Vòng đùi (cm)',
ADD COLUMN waist_hip_ratio DECIMAL(4,2) NULL COMMENT 'Tỷ lệ eo/hông',
ADD COLUMN bmr_calculated DECIMAL(7,2) NULL COMMENT 'BMR tính toán',
ADD COLUMN tdee_calculated DECIMAL(7,2) NULL COMMENT 'TDEE tính toán',
ADD COLUMN source VARCHAR(30) NULL COMMENT 'USER_INPUT, DEVICE_SYNC, AI_ESTIMATE',
ADD COLUMN device_id VARCHAR(100) NULL COMMENT 'ID thiết bị (smart scale/watch)',
ADD COLUMN updated_at TIMESTAMP NULL,
ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE,
ADD COLUMN deleted_at TIMESTAMP NULL;

-- Add soft delete to TrainingPlan
ALTER TABLE training_plans
ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE,
ADD COLUMN deleted_at TIMESTAMP NULL;

-- Add soft delete to UserChallenge
ALTER TABLE user_challenges
ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE,
ADD COLUMN deleted_at TIMESTAMP NULL;

-- Add soft delete to HealthProfile
ALTER TABLE health_profile
ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE,
ADD COLUMN deleted_at TIMESTAMP NULL;

-- =============================================
-- 2. CREATE NEW TABLES
-- =============================================

-- Table: user_inventory (Smart Inventory / Tủ lạnh cá nhân)
CREATE TABLE user_inventory (
    inventory_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    food_id BIGINT NULL,
    food_name VARCHAR(255) NULL COMMENT 'Tên thực phẩm (cho custom entries)',
    quantity_grams DECIMAL(10,2) NULL COMMENT 'Số lượng (gram)',
    unit VARCHAR(50) NULL COMMENT 'Đơn vị: g, kg, piece, bowl',
    status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE' COMMENT 'AVAILABLE, EXPIRED, CONSUMED, RESERVED',
    expiry_date DATE NULL,
    used_in_plan BOOLEAN DEFAULT FALSE COMMENT 'Đã được AI suggest dùng trong plan',
    ai_suggestion_note TEXT NULL,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP NULL,
    
    FOREIGN KEY (user_id) REFERENCES User(User_Id),
    FOREIGN KEY (food_id) REFERENCES foods(food_id),
    
    INDEX idx_ui_user_status (user_id, status),
    INDEX idx_ui_expiry (expiry_date),
    INDEX idx_ui_food (food_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Tủ lạnh cá nhân - thực phẩm user có sẵn để AI optimize meal plans';

-- Table: personalized_nutrition_plans (AI-generated meal plans)
CREATE TABLE personalized_nutrition_plans (
    pnp_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    template_plan_id BIGINT NULL COMMENT 'Tham chiếu đến template (nếu có)',
    ai_plan_id VARCHAR(100) NULL COMMENT 'ID từ AI Service',
    version INT DEFAULT 1,
    start_date DATE NULL,
    end_date DATE NULL,
    duration_days INT NULL,
    
    -- Budget tracking
    target_budget_per_day INT NULL COMMENT 'Ngân sách mục tiêu (VND)',
    estimated_total_cost INT NULL COMMENT 'Chi phí AI ước tính',
    actual_total_cost INT NULL COMMENT 'Chi phí thực tế',
    
    -- Nutrition targets
    target_calories DECIMAL(10,2) NULL,
    target_protein DECIMAL(10,2) NULL,
    target_carbs DECIMAL(10,2) NULL,
    target_fat DECIMAL(10,2) NULL,
    
    -- AI context
    ai_generation_context TEXT NULL COMMENT 'Context JSON để AI điều chỉnh sau',
    
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' COMMENT 'ACTIVE, COMPLETED, CANCELLED, ARCHIVED, EXPIRED',
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL,
    
    FOREIGN KEY (user_id) REFERENCES User(User_Id),
    FOREIGN KEY (template_plan_id) REFERENCES nutrition_plans(plan_id),
    
    INDEX idx_pnp_user_status (user_id, status),
    INDEX idx_pnp_dates (start_date, end_date),
    INDEX idx_pnp_ai_id (ai_plan_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='AI-generated meal plans - tách biệt với template để tránh bảng bị nổ tung';

-- Table: personalized_meal_details (Chi tiết bữa ăn AI-generated)
CREATE TABLE personalized_meal_details (
    pmd_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    pnp_id BIGINT NOT NULL,
    day_number INT NOT NULL COMMENT 'Ngày thứ mấy trong plan',
    meal_type VARCHAR(20) NOT NULL COMMENT 'BREAKFAST, LUNCH, DINNER, SNACK',
    meal_items_json TEXT NULL COMMENT 'JSON array các món ăn',
    total_calories DECIMAL(10,2) NULL,
    total_protein DECIMAL(10,2) NULL,
    total_carbs DECIMAL(10,2) NULL,
    total_fat DECIMAL(10,2) NULL,
    estimated_cost INT NULL COMMENT 'Chi phí ước tính (VND)',
    prep_time_minutes INT NULL COMMENT 'Thời gian chuẩn bị',
    cooking_instructions TEXT NULL,
    was_eaten BOOLEAN NULL COMMENT 'User có ăn không?',
    user_rating INT NULL COMMENT '1-5 sao',
    user_feedback TEXT NULL,
    skip_reason VARCHAR(255) NULL,
    ai_prompt_version VARCHAR(50) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL,
    
    FOREIGN KEY (pnp_id) REFERENCES personalized_nutrition_plans(pnp_id) ON DELETE CASCADE,
    
    INDEX idx_pmd_plan_day (pnp_id, day_number),
    INDEX idx_pmd_meal_type (meal_type),
    INDEX idx_pmd_eaten (was_eaten)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Chi tiết từng bữa ăn trong AI-generated meal plan';

-- Table: budget_tracking (Theo dõi ngân sách thực tế)
CREATE TABLE budget_tracking (
    bt_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    pnp_id BIGINT NULL COMMENT 'Tham chiếu đến plan',
    tracking_date DATE NOT NULL,
    week_start_date DATE NULL,
    daily_budget INT NULL,
    actual_spent INT NULL,
    variance INT NULL COMMENT 'Chênh lệch (actual - budget)',
    weekly_budget INT NULL,
    weekly_spent INT NULL,
    weekly_remaining INT NULL,
    ai_stayed_within_budget BOOLEAN NULL COMMENT 'AI có tuân thủ budget không?',
    budget_notes TEXT NULL,
    purchased_items_json TEXT NULL COMMENT 'JSON danh sách items đã mua',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL,
    
    FOREIGN KEY (user_id) REFERENCES User(User_Id),
    FOREIGN KEY (pnp_id) REFERENCES personalized_nutrition_plans(pnp_id),
    
    INDEX idx_bt_user_date (user_id, tracking_date),
    INDEX idx_bt_week (user_id, week_start_date),
    INDEX idx_bt_ai_compliance (ai_stayed_within_budget),
    UNIQUE KEY unique_user_date (user_id, tracking_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Theo dõi chi tiêu thực tế vs ngân sách AI ước tính';

-- Table: user_preferences (Preferences cho AI)
CREATE TABLE user_preferences (
    up_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    preference_type VARCHAR(30) NOT NULL COMMENT 'DISLIKED_FOOD, LIKED_FOOD, SKIPPED_EXERCISE, etc.',
    item_name VARCHAR(255) NULL,
    preference_value TEXT NULL,
    priority INT DEFAULT 5 COMMENT '1-10, cao hơn = quan trọng hơn',
    occurrence_count INT DEFAULT 1,
    challenge_id BIGINT NULL,
    food_id BIGINT NULL,
    context_json TEXT NULL,
    expires_at TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL,
    
    FOREIGN KEY (user_id) REFERENCES User(User_Id),
    FOREIGN KEY (challenge_id) REFERENCES Challenges(challenge_id),
    FOREIGN KEY (food_id) REFERENCES foods(food_id),
    
    INDEX idx_up_user_type (user_id, preference_type),
    INDEX idx_up_item (item_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Lưu preferences và feedback của user cho AI cải thiện plan';

-- Table: plan_version_history (Lịch sử version của plans)
CREATE TABLE plan_version_history (
    pvh_id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    plan_type VARCHAR(20) NOT NULL COMMENT 'NUTRITION, WORKOUT, TRAINING',
    plan_id BIGINT NOT NULL,
    version_number INT NOT NULL,
    ai_version_id VARCHAR(100) NULL,
    parent_version_id BIGINT NULL,
    change_summary TEXT NULL,
    plan_data_json LONGTEXT NULL COMMENT 'Snapshot đầy đủ của plan',
    diff_json TEXT NULL COMMENT 'Diff so với version trước',
    estimated_cost INT NULL,
    target_calories DECIMAL(10,2) NULL,
    target_protein DECIMAL(10,2) NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE' COMMENT 'ACTIVE, ARCHIVED, REVERTED',
    is_current BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES User(User_Id),
    FOREIGN KEY (parent_version_id) REFERENCES plan_version_history(pvh_id),
    
    INDEX idx_pvh_user_plan (user_id, plan_type, plan_id),
    INDEX idx_pvh_version (version_number),
    INDEX idx_pvh_parent (parent_version_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Lưu lịch sử version để compare và revert plans';

-- =============================================
-- 3. ADD INDEXES FOR PERFORMANCE
-- =============================================

-- Index for soft delete queries
CREATE INDEX idx_daily_training_logs_deleted ON daily_training_logs(is_deleted);
CREATE INDEX idx_nutrition_plans_deleted ON nutrition_plans(is_deleted);
CREATE INDEX idx_body_metric_history_deleted ON body_metric_history(is_deleted);
CREATE INDEX idx_training_plans_deleted ON training_plans(is_deleted);
CREATE INDEX idx_user_challenges_deleted ON user_challenges(is_deleted);
CREATE INDEX idx_health_profile_deleted ON health_profile(is_deleted);

-- =============================================
-- 4. DATA MIGRATION (Optional - run manually if needed)
-- =============================================

-- Migrate data from UserBodyProfile to BodyMetricHistory (if needed)
-- INSERT INTO body_metric_history (user_id, weight_kg, height_cm, age, body_fat_pct, recorded_at, source)
-- SELECT user_id, weight, height, age, body_fat_percentage, CURRENT_DATE, 'MIGRATION'
-- FROM user_body_profile;

-- Migrate data from InformationBodyUser to BodyMetricHistory (if needed)
-- INSERT INTO body_metric_history (user_id, weight_kg, height_cm, age, recorded_at, source)
-- SELECT user_id, weight, height, age, CURRENT_DATE, 'MIGRATION'
-- FROM information_body_user;
