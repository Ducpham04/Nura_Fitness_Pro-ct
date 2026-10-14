# Fitnit Challenge: move off AWS to Vercel + free services

This is the low-cost migration path for the current repo. AWS has already been
backed up and cleaned up; the local database dump is now the source of truth for
the migration.

## Target stack

| Need | Recommended service | Notes |
|---|---|---|
| Frontend SPA | Vercel Hobby | Deploy `frontend/`; set `VITE_API_URL` to the backend URL. Hobby is for personal/non-commercial use. |
| Postgres | Neon Free or Supabase Free | Backend already uses PostgreSQL + Flyway, so no code change is needed. Neon is the cleaner DB-only fit. |
| File uploads | Supabase Storage Free or local disk on backend host | Set `STORAGE_PROVIDER=local` for quick migration. Use Supabase Storage later if uploaded media must survive host resets. |
| Java backend | Render free web service or one small VPS | Vercel is not a good fit for this Spring Boot server. Free web services may sleep. |
| `ai-service` | Render free web service | Needs `GROQ_API_KEY`; expect cold starts on free tier. |
| `fitness-ai-service` | Render free web service or disable temporarily | MediaPipe/WebSocket is CPU/RAM heavier; free tier may be fragile. |
| Monitoring | Sentry free | Already optional through `SENTRY_DSN`. |

## Current backup

The final AWS database export is stored locally:

```text
backups/aws-final/fitnit-final-db-20260812-035305.dump
backups/aws-final/fitnit-final-db-20260812-035305.sql.gz
backups/aws-final/fitnit-final-db-20260812-035305.local.sha256
```

Verify before restoring:

```bash
cd backups/aws-final
sha256sum -c fitnit-final-db-20260812-035305.local.sha256
cd ../..
```

## Neon database

Create a Neon Free Postgres project, then copy its connection string. For Spring
Boot, use the JDBC form:

```text
SPRING_DATASOURCE_URL=jdbc:postgresql://<host>/<db>?sslmode=require
SPRING_DATASOURCE_USERNAME=<user>
SPRING_DATASOURCE_PASSWORD=<password>
```

Restore the AWS dump into Neon with Docker:

```bash
export NEW_DATABASE_URL='postgresql://<user>:<password>@<host>/<db>?sslmode=require'
bash scripts/restore-db-to-free-postgres.sh
```

If Neon created a Postgres version older than the dump, use the `.sql.gz` path
instead:

```bash
docker run --rm -e NEW_DATABASE_URL="$NEW_DATABASE_URL" \
  -v "$PWD:/workspace" -w /workspace postgres:18-alpine \
  sh -lc 'gunzip -c backups/aws-final/fitnit-final-db-20260812-035305.sql.gz | psql "$NEW_DATABASE_URL"'
```

## Render backend and AI services

`render.yaml` defines three free web services:

```text
fitnit-backend
fitnit-ai-service
fitnit-fitness-ai
```

Create a Render Blueprint from the Git repository. Render will prompt for
`sync: false` variables. Minimum values:

```text
fitnit-backend:
  SPRING_DATASOURCE_URL=jdbc:postgresql://<host>/<db>?sslmode=require
  SPRING_DATASOURCE_USERNAME=<user>
  SPRING_DATASOURCE_PASSWORD=<password>
  CORS_ALLOWED_ORIGINS=https://<vercel-domain>
  APP_PUBLIC_BASE_URL=https://<fitnit-backend>.onrender.com
  FRONTEND_URL=https://<vercel-domain>

fitnit-ai-service:
  GROQ_API_KEY=<your Groq key>

fitnit-fitness-ai:
  POSE_SIGNING_SECRET=<same value as backend POSE_SIGNING_SECRET>
  CORS_ORIGINS=https://<vercel-domain>
```

Render free services may sleep and wake slowly. `fitness-ai-service` is the
heaviest container because of MediaPipe; if it does not fit the free instance,
deploy frontend + backend + `ai-service` first and leave camera challenges for a
paid/smaller-host follow-up.

## Vercel frontend

Create/import a Vercel project with:

```text
Root Directory: frontend
Build Command: npx vite build
Output Directory: dist
Install Command: npm ci
```

Environment variables:

```text
VITE_API_URL=https://<backend-domain>
VITE_POSE_WS_URL=wss://<fitness-ai-domain>
VITE_GOOGLE_CLIENT_ID=<optional>
VITE_SENTRY_DSN=<optional>
VITE_PLAUSIBLE_DOMAIN=<optional>
```

`frontend/vercel.json` handles React Router refreshes by rewriting app routes
to `index.html`.

## Backend environment

Set these on the backend host:

```text
SPRING_PROFILES_ACTIVE=prod
SPRING_DATASOURCE_URL=jdbc:postgresql://<host>/<db>?sslmode=require
SPRING_DATASOURCE_USERNAME=<db-user>
SPRING_DATASOURCE_PASSWORD=<db-password>
JWT_SECRET=<32+ chars>
POSE_SIGNING_SECRET=<same value as fitness-ai-service>
CORS_ALLOWED_ORIGINS=https://<vercel-domain>,https://<custom-domain>
APP_PUBLIC_BASE_URL=https://<backend-domain>
FRONTEND_URL=https://<vercel-domain-or-custom-domain>
AI_SERVICE_URL=https://<ai-service-domain>
STORAGE_PROVIDER=local
UPLOAD_PATH=/app/uploads/
```

Optional:

```text
GOOGLE_CLIENT_ID=
SENTRY_DSN=
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=
MAIL_PASSWORD=
VNPAY_TMN_CODE=
VNPAY_HASH_SECRET=
SEPAY_WEBHOOK_SECRET=
SEPAY_API_KEY=
```

## Cutover order

1. Create Neon project and restore the local AWS dump.
2. Deploy Render Blueprint and wait for backend + AI health checks.
3. Deploy Vercel frontend with `VITE_API_URL` and `VITE_POSE_WS_URL`.
4. Update backend Render env `CORS_ALLOWED_ORIGINS` and `FRONTEND_URL` to the
   final Vercel domain.
5. Test login, dashboard, AI meal/workout generation, uploads, payment return
   URL, SePay/VNPay webhook, and camera challenge flow.
6. Move DNS to Vercel/backend domains if using a custom domain.
