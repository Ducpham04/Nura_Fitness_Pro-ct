#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Starting local stack (DB + Backend + AI) via Docker..."
docker compose -f "$ROOT_DIR/docker-compose.local.yml" up -d --build

echo ""
echo "Services:"
echo "  - Backend:  http://localhost:8080"
echo "  - Health:   http://localhost:8080/actuator/health"
echo "  - AI:       http://localhost:5001/health"
echo "  - Adminer:  http://localhost:8081"
echo ""

echo "Starting Frontend dev server..."
cd "$ROOT_DIR/frontend"
npm install
npm run dev

