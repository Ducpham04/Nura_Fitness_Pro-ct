-- V8: Add AI-required fields to exercises table
-- Ref: Phase 1 Critical — met_value, force_type, exercise_category
--
-- met_value       : MET from Compendium of Physical Activities 2024
--                   AI uses this for calories = MET * weight * duration / 60
-- force_type      : Movement direction (PUSH/PULL/LEGS/CORE/CARDIO/MOBILITY)
--                   AI uses this to enforce push/pull balance per session
-- exercise_category: Movement complexity (COMPOUND/ISOLATION/MOBILITY)
--                   Used for exercise ordering (compound-first rule for GAIN_MUSCLE)

ALTER TABLE exercises
    ADD COLUMN IF NOT EXISTS met_value      DECIMAL(4,1) DEFAULT 5.0,
    ADD COLUMN IF NOT EXISTS force_type     VARCHAR(20),
    ADD COLUMN IF NOT EXISTS exercise_category VARCHAR(30);

-- ─────────────────────────────────────────────────────────────────────────────
-- Seed MET values, force_type, category for existing 28 exercises
-- MET sources: Compendium of Physical Activities 2024 (Ainsworth et al.)
-- force_type values: PUSH | PULL | LEGS | CORE | CARDIO | MOBILITY
-- category values:   COMPOUND | ISOLATION | MOBILITY
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE exercises SET
    met_value        = 8.0,
    force_type       = 'PUSH',
    exercise_category = 'COMPOUND'
WHERE LOWER(exercise_name) LIKE '%push up%'
   OR LOWER(exercise_name) LIKE '%push-up%'
   OR LOWER(exercise_name) LIKE '%pushup%';

UPDATE exercises SET
    met_value        = 8.0,
    force_type       = 'PULL',
    exercise_category = 'COMPOUND'
WHERE LOWER(exercise_name) LIKE '%pull up%'
   OR LOWER(exercise_name) LIKE '%pull-up%'
   OR LOWER(exercise_name) LIKE '%pullup%'
   OR LOWER(exercise_name) LIKE '%chin up%';

UPDATE exercises SET
    met_value        = 5.5,
    force_type       = 'LEGS',
    exercise_category = 'COMPOUND'
WHERE LOWER(exercise_name) LIKE '%squat%';

UPDATE exercises SET
    met_value        = 6.0,
    force_type       = 'LEGS',
    exercise_category = 'COMPOUND'
WHERE LOWER(exercise_name) LIKE '%lunge%';

UPDATE exercises SET
    met_value        = 6.5,
    force_type       = 'LEGS',
    exercise_category = 'COMPOUND'
WHERE LOWER(exercise_name) LIKE '%deadlift%';

UPDATE exercises SET
    met_value        = 3.0,
    force_type       = 'CORE',
    exercise_category = 'ISOLATION'
WHERE LOWER(exercise_name) LIKE '%plank%';

UPDATE exercises SET
    met_value        = 3.0,
    force_type       = 'CORE',
    exercise_category = 'ISOLATION'
WHERE LOWER(exercise_name) LIKE '%crunch%'
   OR LOWER(exercise_name) LIKE '%sit-up%'
   OR LOWER(exercise_name) LIKE '%sit up%';

UPDATE exercises SET
    met_value        = 10.0,
    force_type       = 'CARDIO',
    exercise_category = 'COMPOUND'
WHERE LOWER(exercise_name) LIKE '%burpee%';

UPDATE exercises SET
    met_value        = 8.0,
    force_type       = 'CARDIO',
    exercise_category = 'COMPOUND'
WHERE LOWER(exercise_name) LIKE '%jumping jack%'
   OR LOWER(exercise_name) LIKE '%jump%';

UPDATE exercises SET
    met_value        = 3.5,
    force_type       = 'PUSH',
    exercise_category = 'ISOLATION'
WHERE LOWER(exercise_name) LIKE '%tricep%'
   OR LOWER(exercise_name) LIKE '%dip%';

UPDATE exercises SET
    met_value        = 3.5,
    force_type       = 'PULL',
    exercise_category = 'ISOLATION'
WHERE LOWER(exercise_name) LIKE '%bicep%'
   OR LOWER(exercise_name) LIKE '%curl%';

UPDATE exercises SET
    met_value        = 3.5,
    force_type       = 'PUSH',
    exercise_category = 'ISOLATION'
WHERE LOWER(exercise_name) LIKE '%shoulder press%'
   OR LOWER(exercise_name) LIKE '%overhead press%';

UPDATE exercises SET
    met_value        = 4.0,
    force_type       = 'PULL',
    exercise_category = 'COMPOUND'
WHERE LOWER(exercise_name) LIKE '%row%';

UPDATE exercises SET
    met_value        = 4.0,
    force_type       = 'LEGS',
    exercise_category = 'COMPOUND'
WHERE LOWER(exercise_name) LIKE '%glute bridge%'
   OR LOWER(exercise_name) LIKE '%hip thrust%';

UPDATE exercises SET
    met_value        = 5.0,
    force_type       = 'LEGS',
    exercise_category = 'COMPOUND'
WHERE LOWER(exercise_name) LIKE '%step up%';

UPDATE exercises SET
    met_value        = 3.0,
    force_type       = 'CORE',
    exercise_category = 'ISOLATION'
WHERE LOWER(exercise_name) LIKE '%mountain climber%';

UPDATE exercises SET
    met_value        = 7.0,
    force_type       = 'CARDIO',
    exercise_category = 'COMPOUND'
WHERE LOWER(exercise_name) LIKE '%run%'
   OR LOWER(exercise_name) LIKE '%jog%';

UPDATE exercises SET
    met_value        = 2.5,
    force_type       = 'MOBILITY',
    exercise_category = 'MOBILITY'
WHERE LOWER(exercise_name) LIKE '%stretch%'
   OR LOWER(exercise_name) LIKE '%yoga%'
   OR LOWER(exercise_name) LIKE '%mobility%';

-- Fill any remaining NULLs with sensible defaults
UPDATE exercises
SET
    met_value        = COALESCE(met_value, 5.0),
    force_type       = COALESCE(force_type, 'CORE'),
    exercise_category = COALESCE(exercise_category, 'COMPOUND')
WHERE met_value IS NULL
   OR force_type IS NULL
   OR exercise_category IS NULL;

-- Indexes for AI filter queries
CREATE INDEX IF NOT EXISTS idx_exercises_force_type     ON exercises(force_type);
CREATE INDEX IF NOT EXISTS idx_exercises_category       ON exercises(exercise_category);
CREATE INDEX IF NOT EXISTS idx_exercises_met_value      ON exercises(met_value);
