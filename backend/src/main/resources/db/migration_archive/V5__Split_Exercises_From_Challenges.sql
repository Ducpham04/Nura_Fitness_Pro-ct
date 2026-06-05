-- PostgreSQL migration.
-- Split the overloaded challenges table into:
-- 1) exercises: medical/sport-science master data
-- 2) challenges: gamification events and reward campaigns

DO $$
BEGIN
    IF to_regclass('public.challenges') IS NOT NULL
       AND EXISTS (
           SELECT 1 FROM information_schema.columns
           WHERE table_schema = 'public' AND table_name = 'challenges' AND column_name = 'name_challenge'
       )
       AND to_regclass('public.exercises') IS NOT NULL THEN
        ALTER TABLE challenges RENAME TO legacy_challenges;
    ELSIF to_regclass('public.challenges') IS NOT NULL
          AND EXISTS (
              SELECT 1 FROM information_schema.columns
              WHERE table_schema = 'public' AND table_name = 'challenges' AND column_name = 'name_challenge'
          )
          AND to_regclass('public.exercises') IS NULL THEN
        ALTER TABLE challenges RENAME TO exercises;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'exercises' AND column_name = 'challenge_id'
    ) THEN
        ALTER TABLE exercises RENAME COLUMN challenge_id TO exercise_id;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'exercises' AND column_name = 'name_challenge'
    ) THEN
        ALTER TABLE exercises RENAME COLUMN name_challenge TO exercise_name;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'exercises' AND column_name = 'link_videos'
    ) THEN
        ALTER TABLE exercises RENAME COLUMN link_videos TO video_url;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'exercises' AND column_name = 'difficult_level'
    ) THEN
        ALTER TABLE exercises RENAME COLUMN difficult_level TO difficulty_level;
    END IF;
END $$;

ALTER TABLE exercises
    ADD COLUMN IF NOT EXISTS spinal_loading BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS knee_dominant BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS shoulder_overhead BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS high_impact BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS wrist_loading BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS required_equipment VARCHAR(80) DEFAULT 'BODYWEIGHT',
    ADD COLUMN IF NOT EXISTS equipment_alternatives TEXT,
    ADD COLUMN IF NOT EXISTS contraindicated_injuries TEXT,
    ADD COLUMN IF NOT EXISTS movement_pattern VARCHAR(80),
    ADD COLUMN IF NOT EXISTS primary_muscle VARCHAR(100),
    ADD COLUMN IF NOT EXISTS secondary_muscles TEXT,
    ADD COLUMN IF NOT EXISTS default_sets INT DEFAULT 3,
    ADD COLUMN IF NOT EXISTS default_reps INT DEFAULT 10,
    ADD COLUMN IF NOT EXISTS default_rest_seconds INT DEFAULT 60,
    ADD COLUMN IF NOT EXISTS estimated_met INT;

DO $$
BEGIN
    IF to_regclass('public.legacy_challenges') IS NOT NULL THEN
        EXECUTE $sql$
            INSERT INTO exercises (
                exercise_id,
                exercise_name,
                description,
                difficulty_level,
                video_url,
                exercise_type,
                default_sets,
                default_reps,
                default_rest_seconds,
                spinal_loading,
                required_equipment
            )
            SELECT
                challenge_id,
                COALESCE(name_challenge, 'Exercise ' || challenge_id),
                description,
                difficult_level,
                link_videos,
                exercise_type,
                3,
                COALESCE(min_reps, 10),
                60,
                FALSE,
                'BODYWEIGHT'
            FROM legacy_challenges
            ON CONFLICT (exercise_id) DO NOTHING
        $sql$;
    END IF;

    IF pg_get_serial_sequence('exercises', 'exercise_id') IS NOT NULL THEN
        PERFORM setval(
            pg_get_serial_sequence('exercises', 'exercise_id'),
            COALESCE((SELECT MAX(exercise_id) FROM exercises), 1),
            TRUE
        );
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'exercises' AND column_name = 'min_reps'
    ) THEN
        UPDATE exercises
        SET default_reps = COALESCE(min_reps, default_reps)
        WHERE min_reps IS NOT NULL
          AND default_reps IS DISTINCT FROM min_reps;
    END IF;
END $$;

DO $$
DECLARE r RECORD;
BEGIN
    FOR r IN
        SELECT con.conname
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = ANY(con.conkey)
        WHERE rel.relname = 'exercises'
          AND att.attname = 'goal_id'
    LOOP
        EXECUTE format('ALTER TABLE exercises DROP CONSTRAINT %I', r.conname);
    END LOOP;
END $$;

ALTER TABLE exercises
    DROP COLUMN IF EXISTS goal_id,
    DROP COLUMN IF EXISTS reward,
    DROP COLUMN IF EXISTS title,
    DROP COLUMN IF EXISTS duration_days,
    DROP COLUMN IF EXISTS reward_points,
    DROP COLUMN IF EXISTS ai_rules_json,
    DROP COLUMN IF EXISTS start_date,
    DROP COLUMN IF EXISTS end_date,
    DROP COLUMN IF EXISTS created_at,
    DROP COLUMN IF EXISTS updated_at,
    DROP COLUMN IF EXISTS min_reps,
    DROP COLUMN IF EXISTS max_reps;

CREATE TABLE IF NOT EXISTS challenges (
    challenge_id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    goal_id BIGINT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    duration_days INT NOT NULL DEFAULT 7,
    reward_points INT NOT NULL DEFAULT 0,
    reward VARCHAR(200),
    ai_rules_json TEXT,
    start_date DATE,
    end_date DATE,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    CONSTRAINT fk_challenges_goal FOREIGN KEY (goal_id) REFERENCES goals(goal_id)
);

CREATE INDEX IF NOT EXISTS idx_challenges_status ON challenges(status);
CREATE INDEX IF NOT EXISTS idx_challenges_dates ON challenges(start_date, end_date);

CREATE TABLE IF NOT EXISTS challenge_exercises (
    challenge_id BIGINT NOT NULL,
    exercise_id BIGINT NOT NULL,
    sequence_order INT DEFAULT 1,
    target_sets INT,
    target_reps INT,
    target_duration_seconds INT,
    rest_seconds INT,
    PRIMARY KEY (challenge_id, exercise_id),
    CONSTRAINT fk_ce_challenge FOREIGN KEY (challenge_id) REFERENCES challenges(challenge_id) ON DELETE CASCADE,
    CONSTRAINT fk_ce_exercise FOREIGN KEY (exercise_id) REFERENCES exercises(exercise_id)
);

CREATE INDEX IF NOT EXISTS idx_ce_exercise ON challenge_exercises(exercise_id);

-- Old user_challenges/AI rows pointed to atomic exercises through the overloaded
-- challenges table. They are semantically invalid after the split, so remove
-- them instead of carrying corrupted event data forward.
DO $$
DECLARE r RECORD;
BEGIN
    FOR r IN
        SELECT con.conname, rel.relname
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = ANY(con.conkey)
        WHERE rel.relname IN ('user_challenges', 'ai_model_events', 'ai_evaluation_logs', 'reports')
          AND att.attname = 'challenge_id'
    LOOP
        EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', r.relname, r.conname);
    END LOOP;
END $$;

DELETE FROM reports
WHERE challenge_id IS NOT NULL OR user_challenge_id IS NOT NULL;

DELETE FROM ai_evaluation_logs
WHERE challenge_id IS NOT NULL OR user_challenge_id IS NOT NULL;

DELETE FROM ai_model_events
WHERE challenge_id IS NOT NULL OR uc_id IS NOT NULL;

DELETE FROM user_challenges
WHERE challenge_id IS NOT NULL;

ALTER TABLE user_challenges
    ADD CONSTRAINT fk_uc_challenge_clean FOREIGN KEY (challenge_id) REFERENCES challenges(challenge_id);

ALTER TABLE ai_model_events
    ADD CONSTRAINT fk_ame_challenge_clean FOREIGN KEY (challenge_id) REFERENCES challenges(challenge_id);

ALTER TABLE ai_evaluation_logs
    ADD CONSTRAINT fk_ael_challenge_clean FOREIGN KEY (challenge_id) REFERENCES challenges(challenge_id);

ALTER TABLE reports
    ADD CONSTRAINT fk_reports_challenge_clean FOREIGN KEY (challenge_id) REFERENCES challenges(challenge_id);

ALTER TABLE training_plan_details
    ADD COLUMN IF NOT EXISTS exercise_id BIGINT;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'training_plan_details' AND column_name = 'challenge_id'
    ) THEN
        EXECUTE $sql$
            UPDATE training_plan_details
            SET exercise_id = challenge_id
            WHERE exercise_id IS NULL
              AND challenge_id IN (SELECT exercise_id FROM exercises)
        $sql$;
    END IF;
END $$;

DO $$
DECLARE r RECORD;
BEGIN
    FOR r IN
        SELECT con.conname
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = ANY(con.conkey)
        WHERE rel.relname = 'training_plan_details'
          AND att.attname = 'challenge_id'
    LOOP
        EXECUTE format('ALTER TABLE training_plan_details DROP CONSTRAINT %I', r.conname);
    END LOOP;
END $$;

ALTER TABLE training_plan_details
    ADD CONSTRAINT fk_tpd_exercise FOREIGN KEY (exercise_id) REFERENCES exercises(exercise_id);

ALTER TABLE training_plan_details
    DROP COLUMN IF EXISTS challenge_id;

ALTER TABLE personalized_plan_detail
    ADD COLUMN IF NOT EXISTS exercise_id BIGINT,
    ADD COLUMN IF NOT EXISTS rest_time INT;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'personalized_plan_detail' AND column_name = 'challenge_id'
    ) THEN
        EXECUTE $sql$
            UPDATE personalized_plan_detail
            SET exercise_id = challenge_id
            WHERE exercise_id IS NULL
              AND challenge_id IN (SELECT exercise_id FROM exercises)
        $sql$;
    END IF;
END $$;

DO $$
DECLARE r RECORD;
BEGIN
    FOR r IN
        SELECT con.conname
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = ANY(con.conkey)
        WHERE rel.relname = 'personalized_plan_detail'
          AND att.attname = 'challenge_id'
    LOOP
        EXECUTE format('ALTER TABLE personalized_plan_detail DROP CONSTRAINT %I', r.conname);
    END LOOP;
END $$;

ALTER TABLE personalized_plan_detail
    ADD CONSTRAINT fk_ppd_exercise FOREIGN KEY (exercise_id) REFERENCES exercises(exercise_id);

ALTER TABLE personalized_plan_detail
    DROP COLUMN IF EXISTS challenge_id;

ALTER TABLE daily_training_logs
    ADD COLUMN IF NOT EXISTS exercise_id BIGINT,
    ADD COLUMN IF NOT EXISTS fatigue_level INT,
    ADD COLUMN IF NOT EXISTS sleep_hours DOUBLE PRECISION;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'daily_training_logs' AND column_name = 'challenge_id'
    ) THEN
        EXECUTE $sql$
            UPDATE daily_training_logs
            SET exercise_id = challenge_id
            WHERE exercise_id IS NULL
              AND challenge_id IN (SELECT exercise_id FROM exercises)
        $sql$;
    END IF;
END $$;

DO $$
DECLARE r RECORD;
BEGIN
    FOR r IN
        SELECT con.conname
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = ANY(con.conkey)
        WHERE rel.relname = 'daily_training_logs'
          AND att.attname = 'challenge_id'
    LOOP
        EXECUTE format('ALTER TABLE daily_training_logs DROP CONSTRAINT %I', r.conname);
    END LOOP;
END $$;

ALTER TABLE daily_training_logs
    ADD CONSTRAINT fk_dtl_exercise FOREIGN KEY (exercise_id) REFERENCES exercises(exercise_id);

ALTER TABLE daily_training_logs
    DROP COLUMN IF EXISTS challenge_id;

ALTER TABLE ai_model_events
    ADD COLUMN IF NOT EXISTS exercise_id BIGINT;

ALTER TABLE ai_model_events
    ADD CONSTRAINT fk_ame_exercise FOREIGN KEY (exercise_id) REFERENCES exercises(exercise_id);

DROP TABLE IF EXISTS legacy_challenges CASCADE;
