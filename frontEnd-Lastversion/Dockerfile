# =====================================================================
# Frontend production image: build SPA bằng Vite, phục vụ qua nginx
# =====================================================================

# ── Stage 1: build ───────────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app

# Cài deps (tận dụng cache layer)
COPY package.json package-lock.json ./
RUN npm ci

# Build args -> env cho Vite (mặc định rỗng = gọi /api tương đối qua nginx)
ARG VITE_API_URL=
ENV VITE_API_URL=$VITE_API_URL

# Copy source và build
COPY . .
RUN npm run build

# ── Stage 2: serve ───────────────────────────────────────────────────
FROM nginx:1.27-alpine AS production
# Cấu hình nginx (SPA + proxy /api)
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Asset build
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost/ >/dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]
