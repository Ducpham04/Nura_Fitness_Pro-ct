# Triển khai ECS Fargate — nura-prod

Tài liệu trạng thái + tham chiếu ID cho cụm `nura-prod` (region `ap-southeast-1`, account `952669801986`).

## ✅ Đã provision

| Thành phần | Giá trị |
|---|---|
| VPC | `vpc-064a50268cf0ae2fb` |
| Public subnet 1a | `subnet-0d7fc955eb35b9b5a` |
| Public subnet 1b | `subnet-059277b03c5f8618b` |
| RDS endpoint | `nura-challenge.cf80e8w8gc6g.ap-southeast-1.rds.amazonaws.com:5432` (user `nura_app`, DB `postgres`) |
| S3 bucket | `nura-prod-uploads-952669801986-ap-southeast-1-an` |
| Cloud Map namespace | `nura.local` · `ns-eozxzyf6wopkjcbb` |
| Execution role | `arn:aws:iam::952669801986:role/nura-prod-ecs-execution-role` |
| Backend task role | `arn:aws:iam::952669801986:role/nura-prod-backend-task-role` |
| ALB | `nura-prod-alb` · DNS `nura-prod-alb-1264968544.ap-southeast-1.elb.amazonaws.com` |
| Frontend target group | `arn:...:targetgroup/nura-prod-frontend-tg/6d8dcb945c606c94` |
| Task definitions | `nura-frontend:1` · `nura-backend:2` · `nura-ai-service:1` · `nura-fitness-ai:1` |

### Security groups
| Service | SG id |
|---|---|
| ALB | `sg-0cbdb6d67333dc7b3` |
| frontend | `sg-0d43d952524c18014` |
| backend | `sg-0938a6551cb3540ae` |
| ai-service | `sg-0b2d1e176cab59579` |
| fitness-ai | `sg-02cd0f6eef6eaa66d` |
| RDS | `sg-022ae99019809cab8` |

### Secrets (Secrets Manager)
`nura/prod/db` · `nura/prod/jwt` · `nura/prod/pose` · `nura/prod/groq` ·
`nura/prod/vnpay` (pending) · `nura/prod/mail` (pending)

## ✅ Cluster + Services (đã tạo qua CLI — ap-southeast-1)

> ⚠️ Có 1 cluster `nura-prod-cluster` **thừa ở us-east-1** (tạo nhầm region) — nên **xoá**: ECS console → đổi region N. Virginia → Clusters → xoá.

| ECS Service | Task def | SG | Cloud Map service |
|---|---|---|---|
| `frontend` | `nura-frontend` | `sg-0d43d952524c18014` | — (ALB) |
| `backend` | `nura-backend:2` | `sg-0938a6551cb3540ae` | `srv-7azm6owxcbape5dx` |
| `ai-service` | `nura-ai-service` | `sg-0b2d1e176cab59579` | `srv-oxwoua2v6rhgsqtd` |
| `fitness-ai` | `nura-fitness-ai` | `sg-02cd0f6eef6eaa66d` | `srv-zju6ccbv4cxsgxuw` |

Tất cả: public subnets, `assignPublicIp=ENABLED`. DNS nội bộ: `backend.nura.local:8080`, `ai-service.nura.local:8001`, `fitness-ai.nura.local:5001`.

### Smoke test
```bash
curl -I  http://nura-prod-alb-1264968544.ap-southeast-1.elb.amazonaws.com/
curl -fsS http://nura-prod-alb-1264968544.ap-southeast-1.elb.amazonaws.com/api/challenges
```

## ⚠️ Việc cần làm trước khi mở cho người dùng thật
1. **Rebuild + repush 4 image** — image `:latest` hiện trên ECR build TRƯỚC Google auth & các fix gần đây. Rebuild để có code mới, rồi `aws ecs update-service --force-new-deployment`.
2. **Domain + ACM + listener HTTPS:443** — bắt buộc cho Google login (Google chặn http trừ localhost). Sau đó đổi `CORS_ALLOWED_ORIGINS / APP_PUBLIC_BASE_URL / FRONTEND_URL` sang `https://<domain>` và set `GOOGLE_CLIENT_ID` + rebuild frontend với `VITE_GOOGLE_CLIENT_ID`.
3. **Vá S3-serve rồi đổi `STORAGE_PROVIDER=s3`** — hiện để `local` (ảnh ephemeral, vỡ khi >1 task backend). Xem ghi chú trong session.
4. **Điền secret thật** `nura/prod/mail` (Gmail App Password) + `nura/prod/vnpay` → rồi `update-service --force-new-deployment` để nuốt giá trị mới.

## 🐞 Các lỗi đã gặp khi deploy (đã vá — tham chiếu)
1. **Cluster tạo nhầm region** (us-east-1) → tạo lại `ap-southeast-1`. Hạ tầng phải cùng region.
2. **Thiếu CloudWatch log group** → task fail `ResourceInitializationError: log group does not exist`. Vá: tạo 4 log group.
3. **Image arm64 (build trên Mac M-series) ≠ Fargate amd64** → `CannotPullContainerError ... platform 'linux/amd64'`. Vá: `runtimePlatform: ARM64` trong task def (Graviton, rẻ hơn).
4. **RDS SG mở nhầm port 8080** thay vì 5432 → backend `Connect timed out`. Vá: thêm inbound 5432 từ backend-sg.
5. **Password DB lệch** giữa secret và RDS → `password authentication failed`. Vá: đặt cùng 1 mật khẩu ở RDS + secret.
6. **nginx upstream dùng tên compose** (`backend:8080`) → ECS không resolve. Vá: FQDN `backend.nura.local` + `resolver 169.254.169.253` (đã sửa trong nginx.conf, cần rebuild frontend).

## ✅ Smoke test (PASS — HTTP qua ALB)
```
GET /                → 200 (SPA)
GET /api/challenges  → 200 JSON (seed data)
GET /api/ai-packages → 200
```

## Lệnh tiện ích
```bash
./register-all.sh   # đăng ký lại 4 task def sau khi sửa taskdef-*.json
```
