#!/usr/bin/env bash
# Đăng ký cả 4 task definition cho nura-prod.
# Chạy lại bất cứ lúc nào sửa file taskdef-*.json — mỗi lần tạo revision mới.
set -euo pipefail
cd "$(dirname "$0")"

for f in taskdef-frontend taskdef-backend taskdef-ai-service taskdef-fitness-ai; do
  echo "→ Registering $f ..."
  aws ecs register-task-definition \
    --cli-input-json "file://$f.json" \
    --query 'taskDefinition.taskDefinitionArn' --output text
done
echo "✓ Done."
