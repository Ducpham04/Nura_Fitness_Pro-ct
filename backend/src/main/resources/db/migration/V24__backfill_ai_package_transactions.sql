-- Backfill transaction history for approved AI package payment requests.
-- Older SePay/manual approvals activated packages but did not always create
-- a row in transactions, so users could not see the payment in billing history.

INSERT INTO transactions (
    user_id,
    type,
    amount,
    points,
    reference,
    status,
    description,
    created_at
)
SELECT
    pr.user_id,
    'ai_package',
    pr.price_vnd,
    NULL,
    CASE
        WHEN pr.gateway_ref IS NOT NULL AND pr.gateway_ref <> '' THEN 'SEPAY:' || pr.gateway_ref
        ELSE 'PAYREQ:' || pr.id
    END,
    'COMPLETED',
    LEFT('Gói AI ' || COALESCE(NULLIF(pr.package_code, ''), pr.package_name, '') || ' - payment request backfill', 255),
    COALESCE(pr.processed_at, pr.created_at, NOW())
FROM payment_requests pr
WHERE pr.status = 'APPROVED'
  AND NOT EXISTS (
      SELECT 1
      FROM transactions tx
      WHERE tx.reference = CASE
          WHEN pr.gateway_ref IS NOT NULL AND pr.gateway_ref <> '' THEN 'SEPAY:' || pr.gateway_ref
          ELSE 'PAYREQ:' || pr.id
      END
  );
