-- PostgreSQL cleanup.
-- Hibernate ddl-auto=update may create anonymous FK constraints before/after
-- the manual migration adds named constraints. Keep the named migration FKs and
-- drop duplicates on exercise_id -> exercises.exercise_id.

DO $$
DECLARE r RECORD;
BEGIN
    FOR r IN
        SELECT tc.table_name, tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
         AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage ccu
          ON ccu.constraint_name = tc.constraint_name
         AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'public'
          AND kcu.column_name = 'exercise_id'
          AND ccu.table_name = 'exercises'
          AND tc.table_name IN (
              'training_plan_details',
              'personalized_plan_detail',
              'daily_training_logs',
              'ai_model_events'
          )
          AND tc.constraint_name NOT IN (
              'fk_tpd_exercise',
              'fk_ppd_exercise',
              'fk_dtl_exercise',
              'fk_ame_exercise'
          )
    LOOP
        EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', r.table_name, r.constraint_name);
    END LOOP;
END $$;
