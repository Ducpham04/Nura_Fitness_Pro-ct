#!/usr/bin/env bash
set -euo pipefail

BACKUP_FILE="${1:-backups/aws-final/fitnit-final-db-20260812-035305.dump}"

if [[ -z "${NEW_DATABASE_URL:-}" ]]; then
  cat >&2 <<'EOF'
NEW_DATABASE_URL is required.

Example:
  export NEW_DATABASE_URL='postgresql://user:password@host/dbname?sslmode=require'
  bash scripts/restore-db-to-free-postgres.sh
EOF
  exit 1
fi

if [[ ! -f "$BACKUP_FILE" ]]; then
  echo "Backup file not found: $BACKUP_FILE" >&2
  exit 1
fi

docker run --rm \
  -e NEW_DATABASE_URL="$NEW_DATABASE_URL" \
  -e BACKUP_FILE="$BACKUP_FILE" \
  -v "$PWD:/workspace" \
  -w /workspace \
  postgres:18-alpine \
  sh -lc 'pg_restore --clean --if-exists --no-owner --no-acl -d "$NEW_DATABASE_URL" "$BACKUP_FILE"'
