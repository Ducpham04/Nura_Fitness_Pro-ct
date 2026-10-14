#!/usr/bin/env bash
# Phase 5 — phần CÒN LẠI (bước 5-7) sau khi ECS/ALB/cert đã xoá và RDS đang deleting.
# Bỏ set -e để 1 lỗi lẻ không chặn các lệnh sau; mỗi lệnh tự báo kết quả.
set -uo pipefail
R=ap-southeast-1
say(){ printf "\n\033[1;36m==== %s ====\033[0m\n" "$*"; }

say "5. Secrets Manager: xoá 7 secret (giữ recovery 7 ngày, khôi phục được)"
for N in nura/prod/db nura/prod/jwt nura/prod/pose nura/prod/groq \
         nura/prod/vnpay nura/prod/mail nura/prod/sepay; do
  aws secretsmanager delete-secret --region $R --secret-id "$N" \
    --recovery-window-in-days 7 --query 'Name' --output text \
    || echo "  secret $N đã xoá/không còn"
done

say "6. Cloud Map: xoá 3 service rồi xoá namespace (kéo theo Route53 private zone nura.local)"
for SVC in srv-zju6ccbv4cxsgxuw srv-7azm6owxcbape5dx srv-oxwoua2v6rhgsqtd; do
  INST=$(aws servicediscovery list-instances --region $R --service-id $SVC \
          --query 'Instances[].Id' --output text 2>/dev/null || true)
  for I in $INST; do
    aws servicediscovery deregister-instance --region $R --service-id $SVC --instance-id "$I" || true
  done
  aws servicediscovery delete-service --region $R --id $SVC \
    && echo "  đã xoá service $SVC" \
    || echo "  service $SVC còn instance đăng ký/đã xoá — nếu lỗi InstanceExists, chờ 30s chạy lại"
done
sleep 5
aws servicediscovery delete-namespace --region $R --id ns-eozxzyf6wopkjcbb \
  --query 'OperationId' --output text \
  && echo "  namespace đang xoá (kéo theo zone nura.local)" \
  || echo "  namespace còn service/bận — chạy lại lệnh delete-namespace sau khi 3 service đã sạch"

say "7. Gỡ 10 lịch night-scaling cũ (ECS/RDS) — không còn tài nguyên để scale"
bash /Users/vanduc/Documents/Work/FitnitChallenge/infra/teardown-night-scaling.sh \
  || echo "  chạy tay nếu script lỗi"

say "Kiểm tra RDS đã xoá hẳn chưa (có thể mất vài phút)"
aws rds describe-db-instances --region $R --db-instance-identifier nura-challenge \
  --query 'DBInstances[0].DBInstanceStatus' --output text 2>&1 \
  || echo "  RDS đã xoá hoàn toàn (DBInstanceNotFound = xong)"

say "HẾT PHASE 5. Việc còn lại (không phá huỷ): lịch stop/start EC2 0h-6h + AWS Budget."
