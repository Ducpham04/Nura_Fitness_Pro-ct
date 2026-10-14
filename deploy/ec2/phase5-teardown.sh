#!/usr/bin/env bash
# Phase 5 — dọn hạ tầng ECS/ALB/RDS cũ sau khi cutover EC2 ổn định (24/7/2026)
# Đã xong trước khi chạy: snapshot RDS thủ công (nura-challenge-final-20260724-0154)
#   + verify restore backup S3 (45 bảng, 132 users, 0 lỗi).
# Chạy tuần tự. Dừng lại nếu có lỗi. set -e để fail-fast.
set -euo pipefail
R=ap-southeast-1
say(){ printf "\n\033[1;36m==== %s ====\033[0m\n" "$*"; }

# ---------------------------------------------------------------------------
say "0. Guard: snapshot RDS phải 'available' trước khi làm bất cứ gì"
ST=$(aws rds describe-db-snapshots --region $R \
  --db-snapshot-identifier nura-challenge-final-20260724-0154 \
  --query 'DBSnapshots[0].Status' --output text)
echo "snapshot status = $ST"
[ "$ST" = "available" ] || { echo "!! Snapshot chưa available, DỪNG."; exit 1; }

# ---------------------------------------------------------------------------
say "1. ECS: xoá 4 service (đang desired=0) rồi xoá cluster"
for S in fitness-ai backend ai-service frontend; do
  aws ecs delete-service --cluster nura-prod-cluster --service $S --force --region $R \
    --query 'service.serviceName' --output text
done
echo "chờ service DRAINING xong..."
sleep 20
aws ecs delete-cluster --cluster nura-prod-cluster --region $R \
  --query 'cluster.status' --output text

# ---------------------------------------------------------------------------
say "2. ALB: xoá load balancer (listeners tự xoá theo) + target group"
ALB=arn:aws:elasticloadbalancing:ap-southeast-1:952669801986:loadbalancer/app/nura-prod-alb/a503af1c134ec8aa
TG=arn:aws:elasticloadbalancing:ap-southeast-1:952669801986:targetgroup/nura-prod-frontend-tg/6d8dcb945c606c94
aws elbv2 delete-load-balancer --region $R --load-balancer-arn "$ALB"
echo "chờ ALB xoá hẳn để nhả target group + cert..."
sleep 25
aws elbv2 delete-target-group --region $R --target-group-arn "$TG"

# ---------------------------------------------------------------------------
say "3. ACM cert app.viway.id.vn (Caddy trên EC2 tự lo cert giờ)"
CERT=arn:aws:acm:ap-southeast-1:952669801986:certificate/ac7a1735-c642-48d7-b8d5-eb087c17f702
aws acm delete-certificate --region $R --certificate-arn "$CERT" \
  && echo "đã xoá cert" \
  || echo "!! cert còn bị ràng buộc — chờ ALB xoá xong rồi chạy lại lệnh này"

# ---------------------------------------------------------------------------
say "4. RDS: xoá instance (đã có snapshot thủ công -> skip final snapshot)"
aws rds delete-db-instance --region $R \
  --db-instance-identifier nura-challenge \
  --skip-final-snapshot \
  --delete-automated-backups \
  --query 'DBInstance.DBInstanceStatus' --output text

# ---------------------------------------------------------------------------
say "5. Secrets Manager: xoá 7 secret (recovery 7 ngày, có thể khôi phục)"
for N in nura/prod/db nura/prod/jwt nura/prod/pose nura/prod/groq \
         nura/prod/vnpay nura/prod/mail nura/prod/sepay; do
  aws secretsmanager delete-secret --region $R --secret-id "$N" \
    --recovery-window-in-days 7 --query 'Name' --output text
done

# ---------------------------------------------------------------------------
say "6. Cloud Map: xoá 3 service rồi xoá namespace (kéo theo Route53 private zone nura.local)"
for SVC in srv-zju6ccbv4cxsgxuw srv-7azm6owxcbape5dx srv-oxwoua2v6rhgsqtd; do
  # deregister instance còn sót (nếu có) — thường rỗng vì task đã 0
  INST=$(aws servicediscovery list-instances --region $R --service-id $SVC \
          --query 'Instances[].Id' --output text 2>/dev/null || true)
  for I in $INST; do
    aws servicediscovery deregister-instance --region $R --service-id $SVC --instance-id "$I" || true
  done
  aws servicediscovery delete-service --region $R --id $SVC || echo "service $SVC đã xoá/không còn"
done
sleep 5
aws servicediscovery delete-namespace --region $R --id ns-eozxzyf6wopkjcbb \
  --query 'OperationId' --output text || echo "namespace bận/đã xoá — thử lại sau vài giây"

# ---------------------------------------------------------------------------
say "7. Gỡ 10 lịch night-scaling cũ (ECS/RDS) — không còn tài nguyên để scale"
bash /Users/vanduc/Documents/Work/FitnitChallenge/infra/teardown-night-scaling.sh || \
  echo "chạy tay: xoá từng schedule trong group nura-night-scaling rồi xoá group"

say "XONG PHASE 5. Kiểm tra lại: web app.viway.id.vn vẫn chạy bình thường."
echo "Việc còn lại (làm riêng, không phá huỷ):"
echo "  - Lập lịch stop/start EC2 i-0979f4a1a73eaa331 0h-6h nếu muốn tiết kiệm tắt đêm"
echo "  - Đặt AWS Budget cảnh báo ngưỡng chi phí"
