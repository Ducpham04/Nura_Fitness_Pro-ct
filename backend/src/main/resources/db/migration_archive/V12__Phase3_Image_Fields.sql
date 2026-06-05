-- V12: Phase 3 — Image Fields
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE exercises
    ADD COLUMN IF NOT EXISTS image_url VARCHAR(500);

ALTER TABLE foods
    ADD COLUMN IF NOT EXISTS image_url VARCHAR(500);
