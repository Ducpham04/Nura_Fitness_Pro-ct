-- V18: Bảng lưu yêu cầu chuyển khoản thủ công của user
CREATE TABLE IF NOT EXISTS payment_requests (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    package_id      BIGINT,
    package_code    VARCHAR(20),
    package_name    VARCHAR(100),
    price_vnd       INT NOT NULL DEFAULT 0,
    status          VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    note            VARCHAR(500),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at    TIMESTAMPTZ,
    processed_note  VARCHAR(200)
);

CREATE INDEX idx_payment_requests_status     ON payment_requests(status);
CREATE INDEX idx_payment_requests_user_id    ON payment_requests(user_id);
CREATE INDEX idx_payment_requests_created_at ON payment_requests(created_at DESC);
