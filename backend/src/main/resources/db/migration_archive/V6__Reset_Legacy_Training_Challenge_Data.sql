-- PostgreSQL manual reset for the training/challenge semantic refactor.
-- Purpose: remove stale rows created while "challenges" was used as atomic exercises.
--
-- Keeps user accounts, body profiles, health profiles, foods, meals, inventory, and nutrition data.
-- Clears derived workout/challenge data so the application can reseed clean Exercise/Challenge records.

DO $$
DECLARE r RECORD;
BEGIN
    FOR r IN
        SELECT con.conname, rel.relname
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = ANY(con.conkey)
        WHERE rel.relname IN ('user_preferences')
          AND att.attname = 'challenge_id'
    LOOP
        EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', r.relname, r.conname);
    END LOOP;
END $$;

DO $$
BEGIN
    IF to_regclass('public.user_preferences') IS NOT NULL THEN
        UPDATE user_preferences
        SET challenge_id = NULL
        WHERE challenge_id IS NOT NULL;
    END IF;
END $$;

DO $$
DECLARE table_list TEXT;
BEGIN
    SELECT string_agg(format('%I', table_name), ', ')
    INTO table_list
    FROM (
        VALUES
            ('reports'),
            ('ai_evaluation_logs'),
            ('ai_model_events'),
            ('user_challenges'),
            ('daily_training_logs'),
            ('personalized_plan_detail'),
            ('user_training'),
            ('training_plan_details'),
            ('training_plans'),
            ('challenge_exercises'),
            ('challenges'),
            ('exercises')
    ) AS t(table_name)
    WHERE to_regclass('public.' || table_name) IS NOT NULL;

    IF table_list IS NOT NULL THEN
        EXECUTE 'TRUNCATE TABLE ' || table_list || ' RESTART IDENTITY';
    END IF;
END $$;

DO $$
BEGIN
    IF to_regclass('public.user_preferences') IS NOT NULL
       AND to_regclass('public.challenges') IS NOT NULL
       AND NOT EXISTS (
           SELECT 1 FROM pg_constraint
           WHERE conname = 'fk_user_preferences_challenge'
       ) THEN
        ALTER TABLE user_preferences
            ADD CONSTRAINT fk_user_preferences_challenge
            FOREIGN KEY (challenge_id) REFERENCES challenges(challenge_id);
    END IF;
END $$;
