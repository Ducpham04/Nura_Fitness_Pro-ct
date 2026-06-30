-- Fix: rating column was created as SMALLINT but JPA entity maps Integer -> INTEGER (int4)
ALTER TABLE user_feedback ALTER COLUMN rating TYPE INTEGER;
