#!/bin/sh
# =====================================================================
# Backup PostgreSQL → S3, chạy trong container (service db-backup của
# docker-compose.prod.yml). Tự lên lịch hằng ngày, verify, và xoá bản cũ.
#
# Khác với backup-db-to-s3.sh (chạy cron thủ công trên host): bản này là
# 1 phần của compose, deploy là chạy — không cần nhớ cài cron/aws-cli.
#
# Env (đặt trong .env.prod):
#   PGHOST, PGUSER, PGPASSWORD, PGDATABASE   — kết nối DB (qua mạng docker)
#   BACKUP_S3_BUCKET                         — bucket lưu backup (NÊN tách
#                                              khỏi bucket upload công khai)
#   BACKUP_PREFIX        (mặc định: daily)
#   BACKUP_KEEP_DAYS     (mặc định: 14)      — giữ bao nhiêu ngày
#   BACKUP_HOUR_UTC      (mặc định: 19)      — 19h UTC = 2h sáng giờ VN
#   AWS_REGION + AWS creds (hoặc IAM role nếu chạy trên EC2)
#
# Khôi phục:
#   aws s3 cp s3://BUCKET/daily/FILE.sql.gz - | gunzip | \
#     docker exec -i fit-prod-db psql -U postgres -d fit_challenge
# =====================================================================
set -eu

BACKUP_PREFIX="${BACKUP_PREFIX:-daily}"
BACKUP_KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"
BACKUP_HOUR_UTC="${BACKUP_HOUR_UTC:-19}"
MODE="${1:-loop}"   # loop = daemon hằng ngày; once = chạy 1 lần rồi thoát

log() { echo "[$(date -u '+%Y-%m-%d %H:%M:%S')Z] $*"; }

do_backup() {
  : "${BACKUP_S3_BUCKET:?BACKUP_S3_BUCKET là bắt buộc}"
  STAMP="$(date -u +%Y-%m-%d_%H%M)"
  FILE="/tmp/${PGDATABASE}_${STAMP}.sql.gz"

  log "Bắt đầu dump ${PGDATABASE} từ ${PGHOST}..."
  if ! pg_dump -h "$PGHOST" -U "$PGUSER" "$PGDATABASE" | gzip > "$FILE"; then
    log "LỖI: pg_dump thất bại — KHÔNG upload."
    rm -f "$FILE"; return 1
  fi
  # Verify: file gzip hợp lệ và không rỗng (dump hỏng có thể tạo gzip ~20 byte)
  if ! gzip -t "$FILE" 2>/dev/null; then
    log "LỖI: file gzip hỏng — KHÔNG upload."; rm -f "$FILE"; return 1
  fi
  SIZE="$(wc -c < "$FILE")"
  if [ "$SIZE" -lt 200 ]; then
    log "LỖI: dump quá nhỏ (${SIZE} byte) — nghi DB rỗng/lỗi, KHÔNG upload."
    rm -f "$FILE"; return 1
  fi

  KEY="s3://${BACKUP_S3_BUCKET}/${BACKUP_PREFIX}/${PGDATABASE}_${STAMP}.sql.gz"
  aws s3 cp "$FILE" "$KEY" --only-show-errors
  rm -f "$FILE"
  log "Xong upload ${KEY} (${SIZE} byte)."

  # Prune: xoá bản cũ hơn BACKUP_KEEP_DAYS (tên YYYY-MM-DD_HHMM sort theo ngày)
  CUTOFF="$(date -u -d "@$(( $(date -u +%s) - BACKUP_KEEP_DAYS*86400 ))" +%Y-%m-%d 2>/dev/null || true)"
  if [ -n "$CUTOFF" ]; then
    aws s3 ls "s3://${BACKUP_S3_BUCKET}/${BACKUP_PREFIX}/" 2>/dev/null | while read -r _ _ _ name; do
      [ -z "${name:-}" ] && continue
      fdate="$(echo "$name" | sed -n 's/.*_\([0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\}\)_.*/\1/p')"
      [ -z "$fdate" ] && continue
      if [ "$fdate" \< "$CUTOFF" ]; then
        aws s3 rm "s3://${BACKUP_S3_BUCKET}/${BACKUP_PREFIX}/${name}" --only-show-errors
        log "Xoá backup cũ: ${name}"
      fi
    done
  fi
}

if [ "$MODE" = "once" ]; then
  do_backup
  exit $?
fi

log "db-backup khởi động — chạy mỗi ngày lúc ${BACKUP_HOUR_UTC}:00 UTC, giữ ${BACKUP_KEEP_DAYS} ngày."
while true; do
  NOW_S=$(( $(date -u +%H | sed 's/^0//')*3600 + $(date -u +%M | sed 's/^0//')*60 + $(date -u +%S | sed 's/^0//') ))
  TARGET_S=$(( BACKUP_HOUR_UTC*3600 ))
  SLEEP_S=$(( (TARGET_S - NOW_S + 86400) % 86400 ))
  [ "$SLEEP_S" -eq 0 ] && SLEEP_S=86400
  log "Ngủ ${SLEEP_S}s tới lần backup kế tiếp."
  sleep "$SLEEP_S"
  do_backup || log "Backup lần này thất bại — sẽ thử lại ngày mai."
done
