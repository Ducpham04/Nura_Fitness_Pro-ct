-- V19: Bảng lưu cấu hình QR thanh toán (single-row, id=1)
CREATE TABLE IF NOT EXISTS payment_config (
    id        INT PRIMARY KEY DEFAULT 1,
    qr_key    VARCHAR(500) NOT NULL DEFAULT '',
    qr_url    VARCHAR(500) NOT NULL DEFAULT '',
    bank_info TEXT         NOT NULL DEFAULT '',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT payment_config_single_row CHECK (id = 1)
);

-- Chèn row mặc định nếu chưa có
INSERT INTO payment_config (id, qr_key, qr_url, bank_info)
VALUES (1, '', '', '')
ON CONFLICT (id) DO NOTHING;
