# infra — Script tối ưu chi phí AWS (nura-prod)

Account `952669801986`, region `ap-southeast-1`, cluster `nura-prod-cluster`.
Chạy bằng máy đã cấu hình `aws` (cần quyền IAM/ECS/RDS/SSM).

## Chi phí (gross, trước credit)
~$115/tháng: ECS Fargate ~$57, public IPv4 (4 task) ~$14, RDS ~$13, ALB ~$11, Secrets Manager ~$2.8, khác ~$1.

## Script

### `setup-night-scaling-v2.sh` — **đòn bẩy chính (~$21–28/tháng)**
Tạo EventBridge Scheduler tắt ECS (4 service về desired=0) + RDS ban đêm giờ VN.
Thứ tự an toàn: tối 0h00 ECS→0, 0h15 stop RDS; sáng 5h45 start RDS, 6h00 ECS→1.
Khung giờ chỉnh ở đầu file. Idempotent.
```bash
bash infra/setup-night-scaling-v2.sh
```

### `teardown-night-scaling.sh`
Xoá toàn bộ lịch/group/role rồi bật lại RDS + ECS 24/7.
```bash
bash infra/teardown-night-scaling.sh
```

### `migrate-secrets-to-ssm.sh` — phụ (~$2.8/tháng, rủi ro cao hơn)
7 Secrets Manager → 9 SSM SecureString (free). Phase 1-3 an toàn; phase 4 redeploy 3 service, gated:
```bash
bash infra/migrate-secrets-to-ssm.sh              # phase 1-3 (kiểm tra)
DO_DEPLOY=1 bash infra/migrate-secrets-to-ssm.sh  # + redeploy
```
Không tự xoá secret cũ — xoá tay sau khi web ổn (lệnh in ở cuối script). Chỉ hết phí sau khi delete-secret.

## Runway
`runway = số dư credit ÷ burn/tháng`. Số dư credit xem ở **Billing → Credits** (CLI không lấy được).
Ưu tiên: chạy night-scaling trước → lấy số dư credit → migrate secrets khi rảnh.
