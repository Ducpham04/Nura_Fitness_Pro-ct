-- V20: Tự động hóa thanh toán qua SePay (webhook biến động số dư)
--   - payment_requests.gateway_ref: mã giao dịch SePay đã xử lý (chống activate trùng)
--   - payment_config: thông tin ngân hàng để sinh VietQR động (amount + nội dung CK)

ALTER TABLE payment_requests
    ADD COLUMN IF NOT EXISTS gateway_ref VARCHAR(100);

-- Mỗi giao dịch SePay (referenceCode) chỉ được kích hoạt 1 lần
CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_requests_gateway_ref
    ON payment_requests(gateway_ref)
    WHERE gateway_ref IS NOT NULL;

ALTER TABLE payment_config
    ADD COLUMN IF NOT EXISTS bank_bin          VARCHAR(20)  NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS bank_account_no   VARCHAR(40)  NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS bank_account_name VARCHAR(120) NOT NULL DEFAULT '';
