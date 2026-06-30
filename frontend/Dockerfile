# =====================================================================
# Frontend production image: build SPA bằng Vite, phục vụ qua nginx
# =====================================================================

# ── Stage 1: build ───────────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app

# Cài deps (tận dụng cache layer)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source (bao gồm .env.production) rồi build
# Vite đọc VITE_* từ .env.production tại build-time
COPY . .
RUN npm run build

# ── Stage 2: serve ───────────────────────────────────────────────────
FROM nginx:1.27-alpine AS production
# Cấu hình nginx (SPA + proxy /api)
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Asset build
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
# Dùng 127.0.0.1 thay vì localhost: nginx chỉ bind IPv4 (0.0.0.0:80), còn
# "localhost" trong container có thể phân giải ra IPv6 ::1 -> connection refused.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://127.0.0.1/ >/dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]
