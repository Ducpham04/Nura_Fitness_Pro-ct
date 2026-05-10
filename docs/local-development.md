# Local development

## Prerequisites

- Docker Desktop
- Node.js 18+

## Run (single workflow)

From repo root:

```bash
chmod +x ./dev.sh
./dev.sh
```

What it does:

- Starts Docker services using `docker-compose.local.yml`:
  - MySQL (3306)
  - Spring Boot backend (8080)
  - Python AI service (5001)
  - Adminer (8081)
- Then starts the frontend dev server (Vite) on 5173

## Stop

In another terminal:

```bash
docker compose -f docker-compose.local.yml down
```

