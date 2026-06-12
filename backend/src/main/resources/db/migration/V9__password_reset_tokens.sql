-- V9: Password reset tokens table
-- Dùng cho tính năng quên mật khẩu / đặt lại mật khẩu qua email

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id           BIGSERIAL    PRIMARY KEY,
    user_id      BIGINT       NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    token        VARCHAR(64)  NOT NULL UNIQUE,
    expires_at   TIMESTAMPTZ  NOT NULL,
    used         BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prt_token  ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_prt_user   ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_prt_expiry ON password_reset_tokens(expires_at);
