#!/usr/bin/env bash
# Gỡ toàn bộ night-scaling: xoá lịch, group, role. Sau đó BẬT LẠI mọi thứ 24/7.
set -uo pipefail
REGION=ap-southeast-1
CLUSTER=nura-prod-cluster
DB_ID=nura-challenge
GROUP=nura-night-scaling
ROLE=ecs-night-scaling-scheduler
SERVICES=(backend frontend ai-service fitness-ai)

echo "==> Xoá các schedule"
for N in $(aws scheduler list-schedules --group-name "$GROUP" --region "$REGION" \
            --query 'Schedules[].Name' --output text 2>/dev/null); do
  aws scheduler delete-schedule --name "$N" --group-name "$GROUP" --region "$REGION" && echo "   xoá $N"
done
echo "==> Xoá schedule group"
aws scheduler delete-schedule-group --name "$GROUP" --region "$REGION" 2>/dev/null || echo "   (group không còn)"
echo "==> Xoá IAM role"
aws iam delete-role-policy --role-name "$ROLE" --policy-name ns-ecs-rds 2>/dev/null || true
aws iam delete-role --role-name "$ROLE" 2>/dev/null && echo "   xoá role" || echo "   (role không còn)"

echo "==> Khôi phục chạy 24/7: start RDS + ECS về desired=1"
aws rds start-db-instance --db-instance-identifier "$DB_ID" --region "$REGION" 2>/dev/null \
  && echo "   RDS đang start" || echo "   (RDS đã chạy)"
for SVC in "${SERVICES[@]}"; do
  aws ecs update-service --cluster "$CLUSTER" --service "$SVC" --desired-count 1 --region "$REGION" \
    --query 'service.serviceName' --output text && echo "   $SVC -> 1"
done
echo "XONG."
