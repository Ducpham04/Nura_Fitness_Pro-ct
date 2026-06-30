-- =====================================================================
-- V13: Log token AI thật (Groq) theo từng lần gọi, gắn với user.
--   Backend đọc header X-AI-*-Tokens do ai-service trả về và ghi 1 dòng/lần gọi.
--   Dùng cho thống kê token theo từng tài khoản (Admin > Thống kê AI / Token).
-- =====================================================================
CREATE TABLE IF NOT EXISTS ai_token_log (
    id                BIGSERIAL PRIMARY KEY,
    user_id           BIGINT,
    call_type         VARCHAR(40),
    prompt_tokens     INTEGER     NOT NULL DEFAULT 0,
    completion_tokens INTEGER     NOT NULL DEFAULT 0,
    total_tokens      INTEGER     NOT NULL DEFAULT 0,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_ai_token_log_user FOREIGN KEY (user_id) REFERENCES users(user_id)
);

CREATE INDEX IF NOT EXISTS idx_ai_token_log_user    ON ai_token_log(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_token_log_created ON ai_token_log(created_at);
