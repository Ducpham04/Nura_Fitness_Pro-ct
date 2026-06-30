# ✅ Checklist Deploy — Fitnit Challenge

> Trạng thái: **Gần sẵn sàng cho Demo/Staging** · Chưa hardening đủ cho Production scale.
> Hạ tầng đã có: `docker-compose.local.yml`, Dockerfile cho `backend` + `ai-service`, volume bền cho DB & uploads.

---

## 🔴 BLOCKER — Bắt buộc xử lý trước khi deploy

### 1. GROQ_API_KEY thiếu trong docker-compose (AI sẽ chết)
`docker-compose.local.yml` service `python-ai` **không có** `GROQ_API_KEY` → AI service crash khi khởi động (workout/meal/vision/coach đều ngừng).

**Sửa:** thêm vào block `python-ai.environment`:
```yaml
  python-ai:
    environment:
      HOST: 0.0.0.0
      PORT: 5001
      GROQ_API_KEY: ${GROQ_API_KEY}      # ← THÊM DÒNG NÀY
      CORS_ORIGINS: ${CORS_ORIGINS:-http://localhost:5173}
```
→ Rồi đặt `GROQ_API_KEY=gsk_...` trong file `.env` ở thư mục gốc (cùng cấp docker-compose).

### 2. Frontend chưa có cách build production
FE hiện **chỉ chạy `vite dev`** — không có Dockerfile, không có static server. Không deploy được qua compose.

**2 lựa chọn:**
- **(a) Build tĩnh + Nginx (khuyến nghị):** tạo `frontend/Dockerfile`:
  ```dockerfile
  FROM node:20-alpine AS build
  WORKDIR /app
  COPY package*.json ./
  RUN npm ci
  COPY . .
  ARG VITE_API_URL
  ENV VITE_API_URL=$VITE_API_URL
  RUN npm run build
  FROM nginx:alpine
  COPY --from=build /app/dist /usr/share/nginx/html
  # nginx.conf: try_files $uri /index.html;  (SPA fallback)
  ```
- **(b) Deploy FE riêng** lên Vercel/Netlify (build `npm run build`, set `VITE_API_URL` = domain backend).

### 3. Đổi toàn bộ secrets mặc định (KHÔNG dùng giá trị demo)
| Biến | Giá trị hiện tại (KHÔNG dùng cho prod) | Cần |
|---|---|---|
| `POSTGRES_PASSWORD` / `SPRING_DATASOURCE_PASSWORD` | `123456` | Mật khẩu mạnh, khớp nhau |
| `JWT_SECRET` | `du-an-safjhdskfjskjliuuasdhaos-2321` | Chuỗi ngẫu nhiên ≥ 32 ký tự |
| `GROQ_API_KEY` | (chưa có) | Key thật từ console.groq.com |

→ Tạo file `.env` production (KHÔNG commit), ví dụ:
```env
POSTGRES_PASSWORD=<random-strong>
SPRING_DATASOURCE_PASSWORD=<random-strong>
JWT_SECRET=<openssl rand -base64 48>
GROQ_API_KEY=gsk_xxx
CORS_ALLOWED_ORIGINS=https://app.tendomain.com
APP_PUBLIC_BASE_URL=https://api.tendomain.com
VITE_API_URL=https://api.tendomain.com
```

### 4. Trỏ domain thật (hết localhost)
- `CORS_ALLOWED_ORIGINS` → domain FE thật
- `VITE_API_URL` (FE build) → domain backend thật
- `APP_PUBLIC_BASE_URL` → domain backend thật (dùng để build URL ảnh upload)

### 5. Commit & review code
Hiện có **~58 file chưa commit**. Không deploy code chưa lưu git.
```bash
git add -A && git status        # review kỹ
git commit -m "feat: v2.x upgrade + workout/equipment/goal fixes"
```

---

## 🟡 NÊN làm (ổn định trước demo)

### 6. Smoke test end-to-end trên browser (chưa từng test UI)
Cả quá trình mới test **API**, chưa bấm nút thật. Test tối thiểu 1 vòng:
- [ ] Đăng ký → đăng nhập
- [ ] Onboarding (chọn dụng cụ + mục tiêu) → lưu đúng
- [ ] Generate workout → lịch hiện ra, đúng dụng cụ/nhóm cơ
- [ ] Generate meal → thực đơn hiện ra
- [ ] Admin: login admin → CRUD 1 vài tab
- [ ] Upload ảnh (goal/exercise) → hiển thị được

### 7. Schema management
- `ddl-auto=update` tạm OK cho demo. **Production:** chuyển Flyway/Liquibase migration.
- **TUYỆT ĐỐI** không để `create-drop` ở prod (mất sạch data mỗi restart).

### 8. Pose endpoint error handling
`POST /ai-analysis/pose` trả **500** khi thiếu ảnh → nên trả **400** + message rõ.

### 9. Đồng nhất port AI service
Local dev chạy AI ở `8001`, docker map `5001`. Backend đọc qua `AI_SERVICE_URL` nên docker OK, nhưng nên thống nhất để tránh nhầm.

---

## 🟢 Để sau (khi scale thật)

- [ ] CI/CD (GitHub Actions build + deploy)
- [ ] Monitoring/logging tập trung (health endpoint đã có sẵn)
- [ ] Backup DB tự động
- [ ] Object storage (S3) cho uploads nếu chạy nhiều instance
- [ ] Rate limit + retry khi Groq API 429 (đã có fallback chain — tốt)
- [ ] HTTPS / reverse proxy (Nginx/Caddy) + domain + SSL cert

---

## 📋 Lệnh deploy (sau khi xong blocker)

```bash
# 1. Tạo .env production ở thư mục gốc (xem mục 3)
# 2. Build + chạy toàn bộ
docker compose -f docker-compose.local.yml up -d --build

# 3. Kiểm tra health
curl http://localhost:8080/api/goals          # backend
curl http://localhost:5001/health             # ai-service
docker compose ps                             # tất cả Up + healthy

# 4. Seed data ban đầu (nếu DB trống)
#    Admin > Data Seeder > Import All
```

---

## 🎯 Tóm tắt verdict

| Mục đích | Sẵn sàng? | Điều kiện |
|---|---|---|
| **Demo / Đồ án** | ✅ Gần được | Xong blocker 1-5 + smoke test (6) |
| **Production thật** | ❌ Chưa | Thêm migration, object storage, monitoring, HTTPS |

**Đường tới demo nhanh nhất:** GROQ key vào compose (1) → FE build Vercel/Netlify (2b) → đổi secrets + domain (3,4) → commit (5) → smoke test (6). Ước tính nửa ngày là deploy demo được.
