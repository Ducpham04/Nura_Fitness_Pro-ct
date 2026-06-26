#!/usr/bin/env bash
# Deploy 1 hoặc nhiều service lên ECS: build image arm64 → push ECR → force redeploy.
#
# Dùng:
#   ./deploy.sh backend            # chỉ backend
#   ./deploy.sh frontend backend   # nhiều service
#   ./deploy.sh all                # cả 4
#
# Yêu cầu: AWS CLI đã cấu hình, Docker + buildx đang chạy.
set -euo pipefail

REGION=ap-southeast-1
ACCOUNT=952669801986
REG="$ACCOUNT.dkr.ecr.$REGION.amazonaws.com"
CLUSTER=nura-prod-cluster
cd "$(dirname "$0")/../.."   # về thư mục gốc repo

# map service ECS → "ecr_repo|build_context" (dùng case cho tương thích bash 3.2 macOS)
svc_spec() {
  case "$1" in
    frontend)   echo "nura-prod/nura-frontend|./frontend" ;;
    backend)    echo "nura-prod/nura-backend|./backend" ;;
    ai-service) echo "nura-prod/nura-ai-service|./ai-service" ;;
    fitness-ai) echo "nura-prod/nura-fitness-ai|./fitness-ai" ;;
    *)          echo "" ;;
  esac
}

SERVICES=("$@")
[ "${SERVICES[0]:-}" = "all" ] && SERVICES=(frontend backend ai-service fitness-ai)
[ "${#SERVICES[@]}" -eq 0 ] && { echo "Cần tên service. VD: ./deploy.sh backend"; exit 1; }

echo "→ ECR login..."
aws ecr get-login-password --region "$REGION" | docker login --username AWS --password-stdin "$REG" >/dev/null

for s in "${SERVICES[@]}"; do
  spec="$(svc_spec "$s")"
  [ -z "$spec" ] && { echo "❌ service lạ: $s"; exit 1; }
  repo="${spec%%|*}"; ctx="${spec##*|}"
  if [ -d "$ctx" ]; then
    echo "→ [$s] build arm64 + push ($repo)..."
    docker buildx build --platform linux/arm64 -t "$REG/$repo:latest" --push "$ctx"
  else
    echo "→ [$s] thư mục build '$ctx' không tồn tại — force-redeploy image hiện có trên ECR..."
  fi
  echo "→ [$s] force redeploy..."
  aws ecs update-service --cluster "$CLUSTER" --service "$s" --force-new-deployment \
    --query 'service.serviceName' --output text
done

echo "→ Chờ các service ổn định..."
aws ecs wait services-stable --cluster "$CLUSTER" --services "${SERVICES[@]}" \
  && echo "✓ Deploy xong." || echo "⚠ Có service chưa ổn định — kiểm tra log."
