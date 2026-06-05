# Triển khai Production — Fitnit Challenge

Stack prod gồm 4 service trong `docker-compose.prod.yml`:

| Service | Vai trò | Cổng |
|---|---|---|
| `frontend` (nginx) | Phục vụ SPA + reverse proxy `/api` → backend. **Điểm vào public duy nhất.** | 80 (443 khi bật TLS) |
| `backend` (Spring Boot, profile `prod`) | REST API. Flyway tự tạo schema + seed. | nội bộ |
| `ai-service` (FastAPI) | Sinh kế hoạch bằng Groq | nội bộ |
| `db` (PostgreSQL 16) | Cơ sở dữ liệu | nội bộ |

Chỉ `frontend` mở ra ngoài; `db`/`backend`/`ai-service` chỉ giao tiếp trong mạng docker.

---

## 1. Chuẩn bị

```bash
# Secrets cho stack
cp .env.prod.example .env.prod
#  -> sửa .env.prod: POSTGRES_PASSWORD, JWT_SECRET (>=32 ký tự), PUBLIC_ORIGIN

# Khóa Groq cho AI service
cp ai-service/.env.example ai-service/.env
#  -> điền GROQ_API_KEY
```

`PUBLIC_ORIGIN` là domain công khai, ví dụ `https://fitnit.com` (không có `/` cuối).

## 2. Build & chạy

```bash
docker compose -p fitnit-prod --env-file .env.prod -f docker-compose.prod.yml up -d --build
```

Lần đầu, Flyway chạy `V1..V4`: tạo 37 bảng + seed (foods, exercises, challenges, roles).
Kiểm tra:

```bash
docker compose -p fitnit-prod -f docker-compose.prod.yml ps          # tất cả healthy
curl -s http://localhost/api/challenges | head -c 200                # API qua nginx
open http://localhost                                                # SPA
```

## 3. Vận hành

```bash
# Log
docker compose -p fitnit-prod -f docker-compose.prod.yml logs -f backend

# Cập nhật code mới
git pull
docker compose -p fitnit-prod --env-file .env.prod -f docker-compose.prod.yml up -d --build

# Dừng (giữ dữ liệu)
docker compose -p fitnit-prod -f docker-compose.prod.yml down

# Xóa cả dữ liệu DB
docker compose -p fitnit-prod -f docker-compose.prod.yml down -v
```

Backup DB:
```bash
docker exec fit-prod-db pg_dump -U postgres fit_challenge > backup_$(date +%F).sql
```

---

## 4. HTTPS / TLS

Stack mặc định chạy HTTP cổng 80. Chọn **một** cách để có TLS:

### Cách A — Reverse proxy phía trước (khuyến nghị)
Đặt **Caddy**, **Traefik** hoặc **load balancer của cloud** (AWS ALB, GCP LB) trước
container `frontend`, terminate TLS ở đó rồi forward về `frontend:80`. Caddy tự lấy
chứng chỉ Let's Encrypt:

```caddyfile
fitnit.com {
    reverse_proxy localhost:80
}
```

### Cách B — Certbot + nginx 443
1. Lấy chứng chỉ bằng certbot (host hoặc container companion).
2. Mount cert vào container `frontend` và thêm server block 443 vào `nginx.conf`
   (redirect 80 → 443, `ssl_certificate` / `ssl_certificate_key`).
3. Bỏ comment dòng `- "443:443"` trong `docker-compose.prod.yml`.

Sau khi có domain thật, nhớ cập nhật `PUBLIC_ORIGIN=https://fitnit.com` trong `.env.prod`.

---

## 5. Checklist trước khi mở cho người dùng

- [ ] `.env.prod` dùng mật khẩu/secret mạnh, **không** phải giá trị mẫu
- [ ] `ai-service/.env` có `GROQ_API_KEY` thật
- [ ] `PUBLIC_ORIGIN` đúng domain, đã bật TLS
- [ ] Tất cả service `healthy` (`docker compose ps`)
- [ ] `GET /api/challenges` trả dữ liệu; đăng ký + đăng nhập hoạt động
- [ ] Đã thiết lập backup DB định kỳ
