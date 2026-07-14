#!/usr/bin/env bash
# =============================================================================
# Chuyển 7 Secrets Manager -> 9 SSM Parameter Store (SecureString, MIỄN PHÍ).
# Tiết kiệm ~$2.8/tháng (7 secret x $0.40). SSM Standard SecureString = $0.
#
# 4 PHASE:
#   1. Tạo 9 SSM param từ giá trị secret hiện tại      (AN TOÀN, additive)
#   2. Thêm quyền SSM/KMS cho ECS execution role       (AN TOÀN, additive)
#   3. Đăng ký 3 task-def revision mới trỏ sang SSM     (AN TOÀN, chưa deploy)
#   4. Update service sang revision mới  <-- CHỈ chạy khi DO_DEPLOY=1 (có rolling restart)
#
# KHÔNG tự xoá Secrets Manager cũ — xoá tay sau khi xác nhận ổn (lệnh ở cuối).
# Giá trị secret KHÔNG in ra màn hình.
# Chạy phase 1-3:   bash migrate-secrets-to-ssm.sh
# Chạy cả deploy:   DO_DEPLOY=1 bash migrate-secrets-to-ssm.sh
# =============================================================================
set -euo pipefail
ACCOUNT=952669801986; REGION=ap-southeast-1; CL=nura-prod-cluster
EXEC_ROLE=nura-prod-ecs-execution-role
SSM="arn:aws:ssm:$REGION:$ACCOUNT:parameter"   # + /nura/prod/xxx
sm () { aws secretsmanager get-secret-value --secret-id "$1" --query SecretString --output text --region "$REGION"; }
put () { aws ssm put-parameter --name "$1" --type SecureString --value "$2" --overwrite --region "$REGION" >/dev/null && echo "   SSM  $1"; }

echo "==> PHASE 1: tạo SSM SecureString từ Secrets Manager"
put /nura/prod/db-password          "$(sm nura/prod/db)"
put /nura/prod/jwt-secret           "$(sm nura/prod/jwt)"
put /nura/prod/pose-signing-secret  "$(sm nura/prod/pose)"
put /nura/prod/groq-api-key         "$(sm nura/prod/groq)"
put /nura/prod/sepay-api-key        "$(sm nura/prod/sepay)"
MAIL=$(sm nura/prod/mail);  put /nura/prod/mail-username "$(jq -r .username <<<"$MAIL")"; put /nura/prod/mail-password "$(jq -r .password <<<"$MAIL")"
VNP=$(sm nura/prod/vnpay);  put /nura/prod/vnpay-tmn-code "$(jq -r .tmnCode <<<"$VNP")"; put /nura/prod/vnpay-hash-secret "$(jq -r .hashSecret <<<"$VNP")"
unset MAIL VNP

echo "==> PHASE 2: cấp quyền SSM + KMS cho execution role"
KMS_SSM=$(aws kms describe-key --key-id alias/aws/ssm --query KeyMetadata.Arn --output text --region "$REGION")
cat > /tmp/ssm-perm.json <<JSON
{"Version":"2012-10-17","Statement":[
 {"Effect":"Allow","Action":"ssm:GetParameters","Resource":"$SSM/nura/prod/*"},
 {"Effect":"Allow","Action":"kms:Decrypt","Resource":"$KMS_SSM"}
]}
JSON
aws iam put-role-policy --role-name "$EXEC_ROLE" --policy-name nura-prod-read-ssm --policy-document file:///tmp/ssm-perm.json
echo "   Đã gắn inline policy nura-prod-read-ssm (giữ nguyên policy secrets cũ để rollback được)"

echo "==> PHASE 3: đăng ký task-def revision mới (trỏ secrets sang SSM)"
register () {  # $1=family  $2=secretsJSON
  aws ecs describe-task-definition --task-definition "$1" --region "$REGION" --query taskDefinition \
  | jq --argjson s "$2" 'del(.taskDefinitionArn,.revision,.status,.requiresAttributes,.compatibilities,.registeredAt,.registeredBy,.deregisteredAt) | .containerDefinitions[0].secrets=$s' > "/tmp/$1.json"
  local arn; arn=$(aws ecs register-task-definition --cli-input-json "file:///tmp/$1.json" --region "$REGION" --query 'taskDefinition.taskDefinitionArn' --output text)
  echo "   $arn"
}
register nura-backend '[
 {"name":"SPRING_DATASOURCE_PASSWORD","valueFrom":"'"$SSM"'/nura/prod/db-password"},
 {"name":"JWT_SECRET","valueFrom":"'"$SSM"'/nura/prod/jwt-secret"},
 {"name":"POSE_SIGNING_SECRET","valueFrom":"'"$SSM"'/nura/prod/pose-signing-secret"},
 {"name":"MAIL_USERNAME","valueFrom":"'"$SSM"'/nura/prod/mail-username"},
 {"name":"MAIL_PASSWORD","valueFrom":"'"$SSM"'/nura/prod/mail-password"},
 {"name":"VNPAY_TMN_CODE","valueFrom":"'"$SSM"'/nura/prod/vnpay-tmn-code"},
 {"name":"VNPAY_HASH_SECRET","valueFrom":"'"$SSM"'/nura/prod/vnpay-hash-secret"},
 {"name":"SEPAY_API_KEY","valueFrom":"'"$SSM"'/nura/prod/sepay-api-key"}
]'
register nura-ai-service '[{"name":"GROQ_API_KEY","valueFrom":"'"$SSM"'/nura/prod/groq-api-key"}]'
register nura-fitness-ai '[{"name":"POSE_SIGNING_SECRET","valueFrom":"'"$SSM"'/nura/prod/pose-signing-secret"}]'

if [ "${DO_DEPLOY:-0}" != "1" ]; then
  echo ""
  echo "=== Phase 1-3 XONG. Chưa deploy. Kiểm tra rồi chạy lại với DO_DEPLOY=1 để cập nhật service. ==="
  exit 0
fi

echo "==> PHASE 4: update service (rolling, lần lượt, chờ ổn định)"
declare -A MAP=( [backend]=nura-backend [ai-service]=nura-ai-service [fitness-ai]=nura-fitness-ai )
for SVC in ai-service fitness-ai backend; do   # backend cuối cùng
  echo "   -> $SVC"
  aws ecs update-service --cluster "$CL" --service "$SVC" --task-definition "${MAP[$SVC]}" --region "$REGION" \
    --query 'service.serviceName' --output text
  aws ecs wait services-stable --cluster "$CL" --services "$SVC" --region "$REGION"
  echo "      $SVC ổn định."
done
echo ""
echo "=== DEPLOY XONG. Kiểm tra web hoạt động vài phút. Nếu OK, xoá Secrets Manager cũ (mới thực sự tiết kiệm): ==="
for s in db jwt pose groq sepay mail vnpay; do
  echo "  aws secretsmanager delete-secret --secret-id nura/prod/$s --recovery-window-in-days 7 --region $REGION"
done
echo "  # (recovery-window 7 ngày = khôi phục được nếu lỡ; chỉ ngừng tính phí sau khi xoá hẳn)"
