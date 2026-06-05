-- ============================================================
-- V16 — Performance indexes for production
-- ============================================================
-- All statements use IF NOT EXISTS so the migration is idempotent
-- and safe to run even if the schema was previously created by
-- Hibernate's ddl-auto=create (which would have applied @Index
-- annotations as named indexes — same names are used here).
--
-- Index naming convention: idx_<table_abbrev>_<columns>
-- ============================================================


-- ── daily_training_logs ──────────────────────────────────────────────────────
-- Hot path: fetched on every workout-dashboard load; written on every
-- set completion.  Three indexes match the JPA @Index annotations so they
-- are created here once and never touched by Hibernate.
--
-- Query:  deleteByUser_IdAndTrainingPlan_TpIdAndDayNumberBetween
--         → needs (user_id, tp_id, day_number)
-- Query:  findByUserAndTrainingPlanAndDayNumber / fetchSchedule
--         → covered by (user_id, tp_id) prefix

CREATE INDEX IF NOT EXISTS idx_dtl_user_date
    ON daily_training_logs (user_id, training_date);

CREATE INDEX IF NOT EXISTS idx_dtl_user_plan
    ON daily_training_logs (user_id, tp_id);

CREATE INDEX IF NOT EXISTS idx_dtl_user_plan_day
    ON daily_training_logs (user_id, tp_id, day_number);

CREATE INDEX IF NOT EXISTS idx_dtl_status
    ON daily_training_logs (status);


-- ── user_training ────────────────────────────────────────────────────────────
-- Queried on every dashboard load to get the user's active plan,
-- and by the scheduled week-generation job.
--
-- Query:  findActiveProgramsWithWeeksRemaining()
--         → filters on status='active' and week_number < total_weeks
-- Query:  findByUser (user's current program)

CREATE INDEX IF NOT EXISTS idx_ut_user_id
    ON user_training (user_id);

CREATE INDEX IF NOT EXISTS idx_ut_user_status
    ON user_training (user_id, status);


-- ── user_training_sessions ───────────────────────────────────────────────────
-- Written and deleted in bulk during weekly plan generation.
--
-- Note: the unique constraint uk_user_training_sessions_ut_day already covers
-- (ut_id, day_number), which PostgreSQL backs with a unique index.
-- The user_id index speeds up "all sessions for user" lookups.

CREATE INDEX IF NOT EXISTS idx_uts_user_id
    ON user_training_sessions (user_id);


-- ── training_plan_details ────────────────────────────────────────────────────
-- Read on every workout-tab render; range-deleted on each next-week generation.
--
-- Query:  deleteByTrainingPlan_TpIdAndDayNumberBetween(planId, start, end)
--         → needs (tp_id, day_number)
-- Query:  findByTrainingPlan_TpId   → covered by (tp_id) prefix

CREATE INDEX IF NOT EXISTS idx_tpd_tp_id
    ON training_plan_details (tp_id);

CREATE INDEX IF NOT EXISTS idx_tpd_tp_day
    ON training_plan_details (tp_id, day_number);


-- ── program_templates ────────────────────────────────────────────────────────
-- Looked up on every next-week generation (one active template per userTraining).
--
-- Query:  findTopByUserTrainingIdAndStatusOrderByVersionNumberDesc(utId, "ACTIVE")
--         → needs (ut_id, status); ordering on version_number uses the index prefix

CREATE INDEX IF NOT EXISTS idx_pt_ut_status
    ON program_templates (ut_id, status);

CREATE INDEX IF NOT EXISTS idx_pt_ut_version
    ON program_templates (ut_id, version_number DESC);


-- ── personalized_nutrition_plans ─────────────────────────────────────────────
-- JPA @Index annotations defined on this entity — created here for production.

CREATE INDEX IF NOT EXISTS idx_pnp_user_status
    ON personalized_nutrition_plans (user_id, status);

CREATE INDEX IF NOT EXISTS idx_pnp_dates
    ON personalized_nutrition_plans (start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_pnp_ai_id
    ON personalized_nutrition_plans (ai_plan_id);


-- ── personalized_meal_items ───────────────────────────────────────────────────
-- JPA @Index annotations defined on this entity — created here for production.

CREATE INDEX IF NOT EXISTS idx_pmi_pmd
    ON personalized_meal_items (pmd_id);

CREATE INDEX IF NOT EXISTS idx_pmi_food
    ON personalized_meal_items (food_id);


-- ── daily_nutrition_logs ─────────────────────────────────────────────────────
-- Queried by date range to show the user's nutrition history.

CREATE INDEX IF NOT EXISTS idx_dnl_user_date
    ON daily_nutrition_logs (user_id, tracking_date);


-- ── budget_tracking ───────────────────────────────────────────────────────────
-- Used in budget history and weekly/monthly report queries.

CREATE INDEX IF NOT EXISTS idx_bt_user_date
    ON budget_tracking (user_id, tracking_date);
