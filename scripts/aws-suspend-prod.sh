#!/usr/bin/env bash
set -euo pipefail

# Temporarily stop the known AWS production resources after traffic has moved
# away from AWS. Defaults to dry-run; set CONFIRM_SUSPEND_AWS=1 to execute.

REGION="${AWS_REGION:-ap-southeast-1}"
CLUSTER="${ECS_CLUSTER:-nura-prod-cluster}"
RDS_INSTANCE="${RDS_INSTANCE:-nura-challenge}"
EC2_INSTANCE_ID="${EC2_INSTANCE_ID:-i-0979f4a1a73eaa331}"
EXECUTE="${CONFIRM_SUSPEND_AWS:-0}"

ECS_SERVICES=(${ECS_SERVICES:-frontend backend ai-service fitness-ai})

run() {
  if [[ "$EXECUTE" == "1" ]]; then
    echo "+ $*"
    "$@"
  else
    echo "[dry-run] $*"
  fi
}

exists() {
  "$@" >/dev/null 2>&1
}

echo "AWS suspend target"
echo "  region: $REGION"
echo "  ecs cluster: $CLUSTER"
echo "  rds: $RDS_INSTANCE"
echo "  ec2: $EC2_INSTANCE_ID"
echo "  mode: $([[ "$EXECUTE" == "1" ]] && echo execute || echo dry-run)"
echo

if exists aws ecs describe-clusters --region "$REGION" --clusters "$CLUSTER"; then
  for service in "${ECS_SERVICES[@]}"; do
    if exists aws ecs describe-services --region "$REGION" --cluster "$CLUSTER" --services "$service"; then
      run aws ecs update-service \
        --region "$REGION" \
        --cluster "$CLUSTER" \
        --service "$service" \
        --desired-count 0
    else
      echo "skip ECS service '$service': not found"
    fi
  done
else
  echo "skip ECS: cluster '$CLUSTER' not found in $REGION"
fi

if exists aws rds describe-db-instances --region "$REGION" --db-instance-identifier "$RDS_INSTANCE"; then
  RDS_STATUS="$(aws rds describe-db-instances \
    --region "$REGION" \
    --db-instance-identifier "$RDS_INSTANCE" \
    --query 'DBInstances[0].DBInstanceStatus' \
    --output text)"
  if [[ "$RDS_STATUS" == "available" ]]; then
    run aws rds stop-db-instance --region "$REGION" --db-instance-identifier "$RDS_INSTANCE"
  else
    echo "skip RDS '$RDS_INSTANCE': status is $RDS_STATUS"
  fi
else
  echo "skip RDS: instance '$RDS_INSTANCE' not found"
fi

if [[ -n "$EC2_INSTANCE_ID" ]] && exists aws ec2 describe-instances --region "$REGION" --instance-ids "$EC2_INSTANCE_ID"; then
  EC2_STATE="$(aws ec2 describe-instances \
    --region "$REGION" \
    --instance-ids "$EC2_INSTANCE_ID" \
    --query 'Reservations[0].Instances[0].State.Name' \
    --output text)"
  if [[ "$EC2_STATE" == "running" ]]; then
    run aws ec2 stop-instances --region "$REGION" --instance-ids "$EC2_INSTANCE_ID"
  else
    echo "skip EC2 '$EC2_INSTANCE_ID': state is $EC2_STATE"
  fi
fi

cat <<'EOF'

Manual checks after suspend:
  aws ecs list-tasks --cluster nura-prod-cluster --region ap-southeast-1
  aws rds describe-db-instances --db-instance-identifier nura-challenge --region ap-southeast-1 --query 'DBInstances[0].DBInstanceStatus'
  aws ec2 describe-instances --instance-ids i-0979f4a1a73eaa331 --region ap-southeast-1 --query 'Reservations[0].Instances[0].State.Name'

Costs that may remain until deleted:
  Elastic IP, EBS volumes/snapshots, S3 buckets, NAT gateways, CloudWatch logs,
  Secrets Manager secrets during recovery window, Route53 zones, ACM certificates.
EOF
