CREATE TABLE IF NOT EXISTS user_feedback (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    user_email VARCHAR(255),
    user_name VARCHAR(255),
    rating SMALLINT,
    feedback_type VARCHAR(30) DEFAULT 'general',
    message VARCHAR(2000),
    page VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_feedback_created_at ON user_feedback (created_at DESC);
CREATE INDEX idx_user_feedback_user_id    ON user_feedback (user_id);
