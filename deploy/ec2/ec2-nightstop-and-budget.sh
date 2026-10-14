#!/usr/bin/env bash
# =============================================================================
# 1) Lịch tắt/mở EC2 prod ban đêm (EventBridge Scheduler, giờ VN)
#      STOP 0h00  ->  START 6h00   (web KHÔNG truy cập được trong khung này)
#      EC2 t4g.medium ~$0.0336/h -> tắt 6h/ngày tiết kiệm ~$6/mo.
#      Lưu ý: Elastic IP vẫn tính tiền (~$3.6/mo) kể cả lúc EC2 stop.
#      Dữ liệu trên EBS + cert Caddy giữ nguyên; container restart:always tự bật lại.
# 2) AWS Budget cảnh báo chi phí (ngưỡng $40/tháng, email cảnh báo).
# Idempotent — chạy lại được. set -euo fail-fast.
# =============================================================================
set -euo pipefail
ACCOUNT=952669801986
REGION=ap-southeast-1
INSTANCE=i-0979f4a1a73eaa331
GROUP=nura-ec2-nightstop
ROLE=ec2-nightstop-scheduler
TZ_VN="Asia/Ho_Chi_Minh"
EMAIL=pvanduc0403@gmail.com
BUDGET_USD=40
# Khung giờ tắt (giờ VN) — đổi ở đây nếu muốn:
STOP_HOUR=0 ; STOP_MIN=0
START_HOUR=6; START_MIN=0

echo "==> 1. IAM role cho Scheduler (start/stop EC2)"
cat > /tmp/ec2ns-trust.json <<JSON
{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"scheduler.amazonaws.com"},"Action":"sts:AssumeRole","Condition":{"StringEquals":{"aws:SourceAccount":"$ACCOUNT"}}}]}
JSON
cat > /tmp/ec2ns-perm.json <<JSON
{"Version":"2012-10-17","Statement":[
  {"Effect":"Allow","Action":["ec2:StartInstances","ec2:StopInstances"],"Resource":"arn:aws:ec2:$REGION:$ACCOUNT:instance/$INSTANCE"}
]}
JSON
aws iam create-role --role-name "$ROLE" \
  --assume-role-policy-document file:///tmp/ec2ns-trust.json \
  --description "Scheduler role: start/stop EC2 prod ban dem" 2>/dev/null \
  || echo "   (role đã tồn tại)"
aws iam put-role-policy --role-name "$ROLE" \
  --policy-name ec2-startstop --policy-document file:///tmp/ec2ns-perm.json
ROLE_ARN=$(aws iam get-role --role-name "$ROLE" --query 'Role.Arn' --output text)
echo "   Role: $ROLE_ARN"; echo "   Chờ IAM propagate 10s..."; sleep 10

echo "==> 2. Schedule group + 2 lịch stop/start"
aws scheduler create-schedule-group --name "$GROUP" --region "$REGION" 2>/dev/null \
  || echo "   (group đã tồn tại)"
put_schedule () {  # $1=name $2=cron $3=sdk-action
  local T
  T=$(printf '{"Arn":"arn:aws:scheduler:::aws-sdk:ec2:%s","RoleArn":"%s","Input":"{\\"InstanceIds\\":[\\"%s\\"]}"}' "$3" "$ROLE_ARN" "$INSTANCE")
  if aws scheduler create-schedule --name "$1" --group-name "$GROUP" --region "$REGION" \
       --schedule-expression "$2" --schedule-expression-timezone "$TZ_VN" \
       --flexible-time-window '{"Mode":"OFF"}' --target "$T" 2>/dev/null; then
    echo "   OK  $1 -> $2"
  else
    aws scheduler update-schedule --name "$1" --group-name "$GROUP" --region "$REGION" \
      --schedule-expression "$2" --schedule-expression-timezone "$TZ_VN" \
      --flexible-time-window '{"Mode":"OFF"}' --target "$T" >/dev/null
    echo "   UPD $1 -> $2"
  fi
}
put_schedule "ec2-stop"  "cron($STOP_MIN $STOP_HOUR * * ? *)"   "stopInstances"
put_schedule "ec2-start" "cron($START_MIN $START_HOUR * * ? *)" "startInstances"
echo "   Cửa sổ tắt (giờ VN): ${STOP_HOUR}h${STOP_MIN} -> ${START_HOUR}h${START_MIN}"

echo "==> 3. AWS Budget (\$$BUDGET_USD/tháng, cảnh báo 80% + 100% actual + 100% forecast)"
cat > /tmp/budget.json <<JSON
{"BudgetName":"nura-prod-monthly","BudgetLimit":{"Amount":"$BUDGET_USD","Unit":"USD"},"TimeUnit":"MONTHLY","BudgetType":"COST"}
JSON
cat > /tmp/budget-notif.json <<JSON
[
 {"Notification":{"NotificationType":"ACTUAL","ComparisonOperator":"GREATER_THAN","Threshold":80,"ThresholdType":"PERCENTAGE"},
  "Subscribers":[{"SubscriptionType":"EMAIL","Address":"$EMAIL"}]},
 {"Notification":{"NotificationType":"ACTUAL","ComparisonOperator":"GREATER_THAN","Threshold":100,"ThresholdType":"PERCENTAGE"},
  "Subscribers":[{"SubscriptionType":"EMAIL","Address":"$EMAIL"}]},
 {"Notification":{"NotificationType":"FORECASTED","ComparisonOperator":"GREATER_THAN","Threshold":100,"ThresholdType":"PERCENTAGE"},
  "Subscribers":[{"SubscriptionType":"EMAIL","Address":"$EMAIL"}]}
]
JSON
# Budgets là dịch vụ global -> endpoint us-east-1
aws budgets create-budget --region us-east-1 --account-id "$ACCOUNT" \
  --budget file:///tmp/budget.json \
  --notifications-with-subscribers file:///tmp/budget-notif.json 2>/dev/null \
  && echo "   Đã tạo budget nura-prod-monthly" \
  || echo "   (budget đã tồn tại — nếu muốn sửa ngưỡng: aws budgets update-budget ...)"

echo ""
echo "=== XONG ==="
aws scheduler list-schedules --group-name "$GROUP" --region "$REGION" --query 'Schedules[].Name' --output table
echo "Email $EMAIL sẽ nhận yêu cầu xác nhận đăng ký cảnh báo budget (bấm confirm trong mail nếu có)."
