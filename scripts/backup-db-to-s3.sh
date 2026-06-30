#!/usr/bin/env bash
# =====================================================================
# Backup PostgreSQL (container fit-prod-db) lên S3, chạy bằng cron trên EC2.
#
# Yêu cầu:
#   - EC2 gắn IAM role có quyền s3:PutObject vào bucket bên dưới
#   - aws cli v2 đã cài trên EC2 (sudo dnf install -y awscli hoặc snap)
#
# Cài cron (chạy 2h sáng giờ VN = 19h UTC hôm trước):
#   crontab -e
#   0 19 * * * /home/ec2-user/FitnitChallenge/scripts/backup-db-to-s3.sh >> /home/ec2-user/backup.log 2>&1
# =====================================================================
set -euo pipefail

S3_BUCKET="${S3_BUCKET:-fitnit-db-backups}"   # đổi thành tên bucket của bạn
DB_CONTAINER="fit-prod-db"
DB_NAME="${POSTGRES_DB:-fit_challenge}"
DB_USER="${POSTGRES_USER:-postgres}"
STAMP="$(date +%Y-%m-%d_%H%M)"
FILE="/tmp/fitnit_${STAMP}.sql.gz"

echo "[$(date)] Bắt đầu backup ${DB_NAME}..."
docker exec "${DB_CONTAINER}" pg_dump -U "${DB_USER}" "${DB_NAME}" | gzip > "${FILE}"

SIZE=$(du -h "${FILE}" | cut -f1)
aws s3 cp "${FILE}" "s3://${S3_BUCKET}/daily/fitnit_${STAMP}.sql.gz" --only-show-errors
rm -f "${FILE}"

echo "[$(date)] Xong: fitnit_${STAMP}.sql.gz (${SIZE}) -> s3://${S3_BUCKET}/daily/"

# Khôi phục khi cần:
#   aws s3 cp s3://BUCKET/daily/FILE.sql.gz - | gunzip | \
#     docker exec -i fit-prod-db psql -U postgres -d fit_challenge
