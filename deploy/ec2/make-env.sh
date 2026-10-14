#!/usr/bin/env bash
# =====================================================================
# Sinh deploy/ec2/.env.prod từ AWS Secrets Manager — CHẠY TRÊN EC2.
#
# Cố ý chỉ chạy trên server: file này chứa mật khẩu DB, JWT secret, khoá
# SePay/VNPay. Không tạo nó trên máy cá nhân, không commit (đã .gitignore).
#
#   bash deploy/ec2/make-env.sh
#
# Không in ra giá trị secret nào — chỉ in tên biến đã lấy được.
# Cần: EC2 có IAM role đọc được secretsmanager:GetSecretValue.
# =====================================================================
set -euo pipefail

REGION="${AWS_REGION:-ap-southeast-1}"
OUT="$(cd "$(dirname "$0")" && pwd)/.env.prod"

# Bucket lưu backup DB — TÁCH khỏi bucket upload công khai
BACKUP_BUCKET="${BACKUP_S3_BUCKET:-nura-prod-dbbackup-952669801986}"
UPLOAD_BUCKET="nura-prod-uploads-952669801986-ap-southeast-1-an"
PUBLIC_ORIGIN="${PUBLIC_ORIGIN:-https://app.viway.id.vn}"
GOOGLE_CLIENT_ID="611661427454-r9rij66nd082fg92orfgks94vv64e6ti.apps.googleusercontent.com"

# get <secret-name> [json-key]  -> in giá trị ra stdout
get() {
  local raw
  raw="$(aws secretsmanager get-secret-value --region "$REGION" \
          --secret-id "$1" --query SecretString --output text)"
  if [ $# -ge 2 ]; then
    printf '%s' "$raw" | python3 -c "import sys,json;print(json.load(sys.stdin)['$2'])"
  else
    printf '%s' "$raw"
  fi
}

# kv <tên> <giá trị>  -> in dòng KEY='value' đã bọc nháy an toàn.
# BẮT BUỘC bọc nháy: file này vừa được `docker compose --env-file` đọc, vừa
# được `. .env.prod` source trong shell. Giá trị có dấu cách (vd
# MAIL_FROM_NAME="Fitnit Challenge") mà không bọc thì shell coi từ thứ hai
# là một lệnh -> "Challenge: not found".
kv() {
  printf "%s='%s'\n" "$1" "$(printf '%s' "$2" | sed "s/'/'\\\\''/g")"
}

echo "Đang đọc secret từ Secrets Manager ($REGION)..."

umask 077   # file sinh ra chỉ chủ sở hữu đọc được
{
  echo "# Sinh tự động bởi deploy/ec2/make-env.sh — $(date -u '+%Y-%m-%d %H:%M:%SZ')"
  echo "# KHÔNG commit, KHÔNG copy ra khỏi server."
  echo
  kv AWS_REGION "$REGION"
  kv ECR_REGISTRY "952669801986.dkr.ecr.${REGION}.amazonaws.com"
  kv PUBLIC_ORIGIN "$PUBLIC_ORIGIN"
  echo
  echo "# ── Database (tên user giữ nguyên nura_app để dump từ RDS nạp thẳng) ──"
  kv POSTGRES_USER "nura_app"
  kv POSTGRES_PASSWORD "$(get nura/prod/db)"
  echo
  echo "# ── Ứng dụng ──"
  kv JWT_SECRET "$(get nura/prod/jwt)"
  kv POSE_SIGNING_SECRET "$(get nura/prod/pose)"
  kv GROQ_API_KEY "$(get nura/prod/groq)"
  kv SEPAY_WEBHOOK_SECRET "$(get nura/prod/sepay)"
  kv SEPAY_API_KEY "$(get nura/prod/sepay)"
  kv GOOGLE_CLIENT_ID "$GOOGLE_CLIENT_ID"
  echo
  echo "# ── Email ──"
  kv MAIL_HOST "smtp.gmail.com"
  kv MAIL_PORT "587"
  kv MAIL_USERNAME "$(get nura/prod/mail username)"
  kv MAIL_PASSWORD "$(get nura/prod/mail password)"
  kv MAIL_FROM_NAME "Fitnit Challenge"
  echo
  echo "# ── VNPay (vẫn sandbox — đổi VNPAY_URL khi có merchant thật) ──"
  kv VNPAY_TMN_CODE "$(get nura/prod/vnpay tmnCode)"
  kv VNPAY_HASH_SECRET "$(get nura/prod/vnpay hashSecret)"
  kv VNPAY_URL "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html"
  echo
  echo "# ── Lưu trữ ──"
  kv S3_UPLOAD_BUCKET "$UPLOAD_BUCKET"
  kv BACKUP_S3_BUCKET "$BACKUP_BUCKET"
  kv BACKUP_KEEP_DAYS "14"
  kv BACKUP_HOUR_UTC "19"
  echo
  kv MEDIAPIPE_MODEL_COMPLEXITY "1"
} > "$OUT"

chmod 600 "$OUT"

echo "Đã ghi $OUT (chmod 600). Các biến:"
grep -oE '^[A-Z0-9_]+=' "$OUT" | tr -d '=' | sed 's/^/  - /'

# Cảnh báo nếu có biến rỗng (secret thiếu key -> app sẽ chết lúc khởi động)
if grep -qE "^[A-Z0-9_]+=''$" "$OUT"; then
  echo
  echo "CẢNH BÁO: các biến sau đang RỖNG:"
  grep -E "^[A-Z0-9_]+=''$" "$OUT" | tr -d '=' | sed 's/^/  - /'
  exit 1
fi
