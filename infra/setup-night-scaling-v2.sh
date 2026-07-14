#!/usr/bin/env bash
# =============================================================================
# Night-scaling cho nura-prod: tắt ECS (4 service) + RDS ban đêm để tiết kiệm.
# Dùng EventBridge Scheduler (giờ Việt Nam). Idempotent — chạy lại được nhiều lần.
#
# Tiết kiệm ~/tháng theo số giờ tắt:
#   ECS Fargate + 4 public IPv4 (~$71/mo) + RDS (~$13/mo) = ~$84/mo chạy 24/7
#   Tắt 6h/ngày  -> tiết kiệm ~$21/mo   | Tắt 8h/ngày -> ~$28/mo
#
# Thứ tự AN TOÀN:
#   Tối:  0h00 hạ ECS về 0  ->  0h15 stop RDS   (ECS tắt trước, không còn kết nối DB)
#   Sáng: 5h45 start RDS    ->  6h00 bật ECS về 1 (RDS có ~15' để "available")
# =============================================================================
set -euo pipefail

ACCOUNT=952669801986
REGION=ap-southeast-1
CLUSTER=nura-prod-cluster
DB_ID=nura-challenge
SERVICES=(backend frontend ai-service fitness-ai)
GROUP=nura-night-scaling
ROLE=ecs-night-scaling-scheduler
TZ_VN="Asia/Ho_Chi_Minh"

# --- Khung giờ (giờ VN). Đổi ở đây để mở rộng/thu hẹp cửa sổ tắt -------------
ECS_DOWN_HOUR=0   ; ECS_DOWN_MIN=0     # hạ ECS về 0
RDS_STOP_HOUR=0   ; RDS_STOP_MIN=15    # stop RDS (sau ECS)
RDS_START_HOUR=5  ; RDS_START_MIN=45   # start RDS (trước ECS)
ECS_UP_HOUR=6     ; ECS_UP_MIN=0       # bật ECS về 1
# ----------------------------------------------------------------------------

echo "==> 1. Tạo IAM role cho Scheduler"
cat > /tmp/ns-trust.json <<JSON
{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"scheduler.amazonaws.com"},"Action":"sts:AssumeRole","Condition":{"StringEquals":{"aws:SourceAccount":"$ACCOUNT"}}}]}
JSON
cat > /tmp/ns-perm.json <<JSON
{"Version":"2012-10-17","Statement":[
  {"Effect":"Allow","Action":"ecs:UpdateService","Resource":"arn:aws:ecs:$REGION:$ACCOUNT:service/$CLUSTER/*"},
  {"Effect":"Allow","Action":["rds:StopDBInstance","rds:StartDBInstance"],"Resource":"arn:aws:rds:$REGION:$ACCOUNT:db:$DB_ID"}
]}
JSON

aws iam create-role --role-name "$ROLE" \
  --assume-role-policy-document file:///tmp/ns-trust.json \
  --description "Scheduler role: scale ECS + stop/start RDS for night shutdown" 2>/dev/null \
  || echo "   (role đã tồn tại, bỏ qua)"
aws iam put-role-policy --role-name "$ROLE" \
  --policy-name ns-ecs-rds --policy-document file:///tmp/ns-perm.json
ROLE_ARN=$(aws iam get-role --role-name "$ROLE" --query 'Role.Arn' --output text)
echo "   Role: $ROLE_ARN"
echo "   Chờ IAM propagate 10s..."; sleep 10

echo "==> 2. Tạo schedule group"
aws scheduler create-schedule-group --name "$GROUP" --region "$REGION" 2>/dev/null \
  || echo "   (group đã tồn tại)"

# Helper: tạo-hoặc-cập-nhật 1 schedule
put_schedule () {   # $1=name  $2=cron  $3=target-json
  if aws scheduler create-schedule --name "$1" --group-name "$GROUP" --region "$REGION" \
       --schedule-expression "$2" --schedule-expression-timezone "$TZ_VN" \
       --flexible-time-window '{"Mode":"OFF"}' --target "$3" 2>/dev/null; then
    echo "   OK  $1  ->  $2"
  else
    aws scheduler update-schedule --name "$1" --group-name "$GROUP" --region "$REGION" \
      --schedule-expression "$2" --schedule-expression-timezone "$TZ_VN" \
      --flexible-time-window '{"Mode":"OFF"}' --target "$3" >/dev/null
    echo "   UPD $1  ->  $2"
  fi
}

echo "==> 3. Lịch ECS (mỗi service: down 0 / up 1)"
for SVC in "${SERVICES[@]}"; do
  DOWN_T=$(printf '{"Arn":"arn:aws:scheduler:::aws-sdk:ecs:updateService","RoleArn":"%s","Input":"{\\"Cluster\\":\\"%s\\",\\"Service\\":\\"%s\\",\\"DesiredCount\\":0}"}' "$ROLE_ARN" "$CLUSTER" "$SVC")
  UP_T=$(printf   '{"Arn":"arn:aws:scheduler:::aws-sdk:ecs:updateService","RoleArn":"%s","Input":"{\\"Cluster\\":\\"%s\\",\\"Service\\":\\"%s\\",\\"DesiredCount\\":1}"}' "$ROLE_ARN" "$CLUSTER" "$SVC")
  put_schedule "${SVC}-down" "cron($ECS_DOWN_MIN $ECS_DOWN_HOUR * * ? *)" "$DOWN_T"
  put_schedule "${SVC}-up"   "cron($ECS_UP_MIN $ECS_UP_HOUR * * ? *)"     "$UP_T"
done

echo "==> 4. Lịch RDS (stop/start)"
RDS_STOP_T=$(printf  '{"Arn":"arn:aws:scheduler:::aws-sdk:rds:stopDBInstance","RoleArn":"%s","Input":"{\\"DbInstanceIdentifier\\":\\"%s\\"}"}' "$ROLE_ARN" "$DB_ID")
RDS_START_T=$(printf '{"Arn":"arn:aws:scheduler:::aws-sdk:rds:startDBInstance","RoleArn":"%s","Input":"{\\"DbInstanceIdentifier\\":\\"%s\\"}"}' "$ROLE_ARN" "$DB_ID")
put_schedule "rds-stop"  "cron($RDS_STOP_MIN $RDS_STOP_HOUR * * ? *)"    "$RDS_STOP_T"
put_schedule "rds-start" "cron($RDS_START_MIN $RDS_START_HOUR * * ? *)"  "$RDS_START_T"

echo ""
echo "=== XONG. Danh sách lịch trong group '$GROUP': ==="
aws scheduler list-schedules --group-name "$GROUP" --region "$REGION" \
  --query 'Schedules[].Name' --output table
echo ""
echo "Cửa sổ tắt hiện tại (giờ VN): ${ECS_DOWN_HOUR}h${ECS_DOWN_MIN} -> ${ECS_UP_HOUR}h${ECS_UP_MIN}"
echo "Kiểm tra 1 lịch:  aws scheduler get-schedule --name backend-down --group-name $GROUP --region $REGION"
