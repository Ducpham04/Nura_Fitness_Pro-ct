-- V9: Exercise Phase 2 — Progression chain, RPE, Tempo, Special population flags
-- ─────────────────────────────────────────────────────────────────────────────
-- progression_exercise_id : FK self-ref → harder variant (e.g. Push Up → Diamond Push Up)
-- regression_exercise_id  : FK self-ref → easier variant  (e.g. Push Up → Knee Push Up)
-- rpe_min / rpe_max       : Rate of Perceived Exertion 1-10 for AI difficulty tuning
-- tempo                   : "eccentric-pause-concentric" e.g. "3-0-1"
-- suitable_for_senior     : safe for 55+ (no high impact, no heavy spinal load)
-- suitable_for_overweight : safe for BMI > 30 (no jump, low joint stress)
-- is_bilateral            : true = both limbs move together (squat), false = unilateral (lunge)

ALTER TABLE exercises
    ADD COLUMN IF NOT EXISTS progression_exercise_id BIGINT,
    ADD COLUMN IF NOT EXISTS regression_exercise_id  BIGINT,
    ADD COLUMN IF NOT EXISTS rpe_min                 SMALLINT DEFAULT 5,
    ADD COLUMN IF NOT EXISTS rpe_max                 SMALLINT DEFAULT 8,
    ADD COLUMN IF NOT EXISTS tempo                   VARCHAR(15) DEFAULT '3-0-1',
    ADD COLUMN IF NOT EXISTS suitable_for_senior     BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS suitable_for_overweight BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS is_bilateral            BOOLEAN DEFAULT TRUE;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_exercise_progression'
    ) THEN
        ALTER TABLE exercises
            ADD CONSTRAINT fk_exercise_progression
            FOREIGN KEY (progression_exercise_id) REFERENCES exercises(exercise_id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_exercise_regression'
    ) THEN
        ALTER TABLE exercises
            ADD CONSTRAINT fk_exercise_regression
            FOREIGN KEY (regression_exercise_id) REFERENCES exercises(exercise_id) ON DELETE SET NULL;
    END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Seed RPE + tempo + safety flags for existing exercises (name-based matching)
-- ─────────────────────────────────────────────────────────────────────────────

-- Push Up family
UPDATE exercises SET rpe_min=5, rpe_max=7, tempo='3-0-1', suitable_for_overweight=TRUE, is_bilateral=TRUE
WHERE LOWER(exercise_name) LIKE '%push up%' OR LOWER(exercise_name) LIKE '%pushup%';

-- Pull Up (demanding — not for seniors/overweight without modification)
UPDATE exercises SET rpe_min=7, rpe_max=9, tempo='3-0-1', suitable_for_senior=FALSE, suitable_for_overweight=FALSE
WHERE LOWER(exercise_name) LIKE '%pull up%' OR LOWER(exercise_name) LIKE '%pullup%';

-- Squat (bilateral, safe for most)
UPDATE exercises SET rpe_min=5, rpe_max=8, tempo='3-1-1', suitable_for_senior=TRUE, suitable_for_overweight=TRUE, is_bilateral=TRUE
WHERE LOWER(exercise_name) LIKE '%squat%' AND LOWER(exercise_name) NOT LIKE '%jump%';

-- Lunge (unilateral)
UPDATE exercises SET rpe_min=5, rpe_max=7, tempo='3-0-1', suitable_for_senior=TRUE, suitable_for_overweight=FALSE, is_bilateral=FALSE
WHERE LOWER(exercise_name) LIKE '%lunge%';

-- Plank (safe for seniors with modification)
UPDATE exercises SET rpe_min=4, rpe_max=6, tempo='0-0-0', suitable_for_senior=TRUE, suitable_for_overweight=TRUE
WHERE LOWER(exercise_name) LIKE '%plank%';

-- Deadlift (high spinal load — not for seniors/overweight)
UPDATE exercises SET rpe_min=7, rpe_max=9, tempo='3-1-1', suitable_for_senior=FALSE, suitable_for_overweight=FALSE
WHERE LOWER(exercise_name) LIKE '%deadlift%';

-- Burpee (high impact)
UPDATE exercises SET rpe_min=8, rpe_max=10, tempo='1-0-1', suitable_for_senior=FALSE, suitable_for_overweight=FALSE
WHERE LOWER(exercise_name) LIKE '%burpee%';

-- Jump (high impact — exclude all special populations)
UPDATE exercises SET rpe_min=7, rpe_max=9, tempo='1-0-1', suitable_for_senior=FALSE, suitable_for_overweight=FALSE
WHERE LOWER(exercise_name) LIKE '%jump%';

-- Crunch / Sit-up (moderate)
UPDATE exercises SET rpe_min=4, rpe_max=6, tempo='2-1-1', suitable_for_senior=TRUE, suitable_for_overweight=TRUE, is_bilateral=TRUE
WHERE LOWER(exercise_name) LIKE '%crunch%' OR LOWER(exercise_name) LIKE '%sit up%' OR LOWER(exercise_name) LIKE '%sit-up%';

-- Bicep curl / Tricep (isolation — safe)
UPDATE exercises SET rpe_min=4, rpe_max=6, tempo='3-0-1', suitable_for_senior=TRUE, suitable_for_overweight=TRUE, is_bilateral=FALSE
WHERE LOWER(exercise_name) LIKE '%curl%' OR LOWER(exercise_name) LIKE '%bicep%' OR LOWER(exercise_name) LIKE '%tricep%';

-- Row variations (safe, compound pull)
UPDATE exercises SET rpe_min=5, rpe_max=7, tempo='3-1-1', suitable_for_senior=TRUE, suitable_for_overweight=TRUE, is_bilateral=TRUE
WHERE LOWER(exercise_name) LIKE '%row%';

-- Glute bridge / Hip thrust (senior-friendly)
UPDATE exercises SET rpe_min=4, rpe_max=6, tempo='2-2-1', suitable_for_senior=TRUE, suitable_for_overweight=TRUE, is_bilateral=TRUE
WHERE LOWER(exercise_name) LIKE '%glute bridge%' OR LOWER(exercise_name) LIKE '%hip thrust%';

-- Default for any remaining NULLs
UPDATE exercises SET
    rpe_min   = COALESCE(rpe_min, 5),
    rpe_max   = COALESCE(rpe_max, 8),
    tempo     = COALESCE(tempo, '3-0-1'),
    is_bilateral = COALESCE(is_bilateral, TRUE)
WHERE rpe_min IS NULL OR rpe_max IS NULL OR tempo IS NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- Seed progression chains (requires exercises to already exist by name)
-- We use a DO block to handle missing exercises gracefully
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
    v_knee_push_up   BIGINT;
    v_push_up        BIGINT;
    v_diamond_push   BIGINT;
    v_box_squat      BIGINT;
    v_bw_squat       BIGINT;
    v_bulgarian      BIGINT;
    v_inverted_row   BIGINT;
    v_pull_up        BIGINT;
BEGIN
    -- Resolve IDs by name (case-insensitive, partial match)
    SELECT exercise_id INTO v_knee_push_up  FROM exercises WHERE LOWER(exercise_name) LIKE '%knee push up%' LIMIT 1;
    SELECT exercise_id INTO v_push_up       FROM exercises WHERE LOWER(exercise_name) LIKE '%push up%' AND LOWER(exercise_name) NOT LIKE '%knee%' AND LOWER(exercise_name) NOT LIKE '%diamond%' AND LOWER(exercise_name) NOT LIKE '%decline%' LIMIT 1;
    SELECT exercise_id INTO v_diamond_push  FROM exercises WHERE LOWER(exercise_name) LIKE '%diamond push%' LIMIT 1;
    SELECT exercise_id INTO v_bw_squat      FROM exercises WHERE LOWER(exercise_name) LIKE '%squat%' AND LOWER(exercise_name) NOT LIKE '%jump%' AND LOWER(exercise_name) NOT LIKE '%box%' AND LOWER(exercise_name) NOT LIKE '%bulgarian%' LIMIT 1;
    SELECT exercise_id INTO v_pull_up       FROM exercises WHERE LOWER(exercise_name) LIKE '%pull up%' AND LOWER(exercise_name) NOT LIKE '%knee%' LIMIT 1;
    SELECT exercise_id INTO v_inverted_row  FROM exercises WHERE LOWER(exercise_name) LIKE '%inverted row%' LIMIT 1;

    -- Push Up chain: Knee Push Up → Push Up → Diamond Push Up
    IF v_push_up IS NOT NULL AND v_knee_push_up IS NOT NULL THEN
        UPDATE exercises SET regression_exercise_id = v_knee_push_up WHERE exercise_id = v_push_up;
    END IF;
    IF v_push_up IS NOT NULL AND v_diamond_push IS NOT NULL THEN
        UPDATE exercises SET progression_exercise_id = v_diamond_push WHERE exercise_id = v_push_up;
    END IF;
    IF v_knee_push_up IS NOT NULL AND v_push_up IS NOT NULL THEN
        UPDATE exercises SET progression_exercise_id = v_push_up WHERE exercise_id = v_knee_push_up;
    END IF;
    IF v_diamond_push IS NOT NULL AND v_push_up IS NOT NULL THEN
        UPDATE exercises SET regression_exercise_id = v_push_up WHERE exercise_id = v_diamond_push;
    END IF;

    -- Pull chain: Inverted Row → Pull Up
    IF v_pull_up IS NOT NULL AND v_inverted_row IS NOT NULL THEN
        UPDATE exercises SET regression_exercise_id = v_inverted_row WHERE exercise_id = v_pull_up;
        UPDATE exercises SET progression_exercise_id = v_pull_up WHERE exercise_id = v_inverted_row;
    END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_exercises_progression ON exercises(progression_exercise_id);
CREATE INDEX IF NOT EXISTS idx_exercises_regression  ON exercises(regression_exercise_id);
CREATE INDEX IF NOT EXISTS idx_exercises_senior      ON exercises(suitable_for_senior);
CREATE INDEX IF NOT EXISTS idx_exercises_overweight  ON exercises(suitable_for_overweight);
