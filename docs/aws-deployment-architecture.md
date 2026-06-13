# Kiến trúc triển khai AWS cho Fitnit Challenge

Tài liệu này là blueprint kỹ thuật để đưa toàn bộ hệ thống Fitnit Challenge lên AWS theo hướng chuyên nghiệp, có thể vận hành production và vẫn có lộ trình tiết kiệm chi phí cho giai đoạn demo/staging.

## 1. Hiện trạng hệ thống

Hệ thống hiện có các khối chính:

| Khối | Công nghệ | Vai trò | Trạng thái deploy |
|---|---|---|---|
| Frontend | React + Vite + Nginx | SPA, reverse proxy `/api`, `/pose`, `/uploads` | Có Dockerfile production |
| Backend | Spring Boot 3 + Java 17 | REST API, auth, business logic, thanh toán, upload | Có Dockerfile production, Actuator health, Flyway prod |
| AI Service | FastAPI Python | Meal/workout/vision AI qua Groq | Có Dockerfile, health endpoint |
| Fitness AI | FastAPI Python + MediaPipe | WebSocket chấm điểm pose realtime | Có Dockerfile, health endpoint |
| Database | PostgreSQL 16 | Dữ liệu nghiệp vụ | Compose dùng container DB, production nên chuyển RDS |
| Uploads | Local filesystem | Ảnh/video upload | Production nhiều instance nên chuyển S3 |

Stack Docker Compose hiện tại phù hợp demo/staging trên một máy. Để production trên AWS cần tách database, secrets, file upload, logging, TLS, autoscaling và CI/CD ra các dịch vụ quản lý của AWS.

## 2. Kiến trúc AWS khuyến nghị

Luồng tổng thể:

```text
User
  |
Route 53
  |
CloudFront
  |
AWS WAF
  |
Application Load Balancer
  |------------------------------|
  |                              |
ECS Fargate Frontend/Nginx       ECS Fargate Backend
  |                              |
  |-- /api --------------------->|
  |-- /uploads ----------------->|
  |-- /pose -------------------->| ECS Fargate Fitness AI
                                 |
                                 |--> ECS Fargate AI Service
                                 |--> RDS PostgreSQL
                                 |--> S3 Upload Bucket
                                 |--> Secrets Manager
                                 |--> CloudWatch Logs/Metrics
```

### Dịch vụ AWS nên dùng

| Nhu cầu | Dịch vụ AWS | Ghi chú |
|---|---|---|
| DNS | Route 53 | Quản lý domain, record `A/AAAA` alias |
| TLS | ACM | Certificate gắn vào CloudFront/ALB |
| CDN | CloudFront | Cache frontend static assets, giảm tải ALB |
| Firewall | AWS WAF | Rate limit, block IP xấu, rule OWASP cơ bản |
| Container runtime | ECS Fargate | Không cần quản lý EC2, dễ scale từng service |
| Container registry | ECR | Lưu image frontend/backend/AI/pose |
| Load balancing | ALB | Path routing `/api/*`, `/pose/*`, `/uploads/*` |
| Database | RDS PostgreSQL 16 | Multi-AZ cho production thật |
| File upload | S3 | Thay local volume, dùng CloudFront/S3 signed URL nếu cần |
| Secrets | Secrets Manager | JWT, DB password, Groq key, VNPay secret, SMTP |
| Logs/metrics | CloudWatch | Log group riêng cho từng service |
| Alarms | CloudWatch Alarm + SNS | CPU, memory, 5xx, latency, DB storage |
| CI/CD | GitHub Actions + ECR + ECS deploy | Build, test, push image, update service |
| Backup | RDS automated backup + S3 lifecycle | PITR, snapshot trước migration |

## 3. Môi trường đề xuất

### Staging

Mục tiêu: giống production nhưng nhỏ hơn, chi phí thấp.

| Thành phần | Cấu hình gợi ý |
|---|---|
| ECS Fargate | 1 task/service |
| Backend | 0.5 vCPU, 1 GB RAM |
| Frontend | 0.25 vCPU, 0.5 GB RAM |
| AI Service | 0.5 vCPU, 1 GB RAM |
| Fitness AI | 1 vCPU, 2 GB RAM |
| RDS | db.t4g.micro/small, Single-AZ |
| S3 | 1 bucket staging |

### Production

Mục tiêu: có HA tối thiểu, backup, scale ngang.

| Thành phần | Cấu hình gợi ý |
|---|---|
| Backend | 2 tasks, mỗi task 1 vCPU, 2 GB RAM |
| Frontend | 2 tasks hoặc chuyển static hosting S3/CloudFront |
| AI Service | 1-2 tasks, 1 vCPU, 2 GB RAM |
| Fitness AI | 1-2 tasks, 2 vCPU, 4 GB RAM nếu realtime pose nặng |
| RDS | PostgreSQL 16, Multi-AZ, db.t4g.small trở lên |
| S3 | Bucket uploads, versioning, lifecycle |
| ALB | Multi-AZ public subnets |
| ECS tasks | Private subnets, outbound qua NAT Gateway |

## 4. Network và security baseline

Thiết kế VPC:

| Layer | Subnet | Thành phần |
|---|---|---|
| Public | 2 AZ | ALB, NAT Gateway |
| Private app | 2 AZ | ECS Fargate tasks |
| Private data | 2 AZ | RDS PostgreSQL |

Security group:

| Security group | Inbound | Outbound |
|---|---|---|
| ALB SG | 80/443 từ Internet | Tới ECS frontend/backend/pose |
| ECS Frontend SG | 80 từ ALB | Backend/Pose nếu giữ Nginx proxy |
| ECS Backend SG | 8080 từ ALB hoặc Frontend SG | RDS, AI Service, S3, external APIs |
| ECS AI SG | 8001 từ Backend SG | Groq API outbound |
| ECS Pose SG | 5001 từ ALB hoặc Frontend SG | Không cần public trực tiếp |
| RDS SG | 5432 từ Backend SG | Không public |

Nguyên tắc:

- Không expose RDS, backend, AI service trực tiếp ra Internet.
- Tất cả secret lấy từ Secrets Manager, không đặt trong image hoặc commit vào Git.
- Bật HTTPS bắt buộc, redirect HTTP sang HTTPS tại ALB/CloudFront.
- Bật WAF rate limit cho `/api/auth/*`, `/api/ai/*`, `/pose/*`.
- Bật CloudTrail, GuardDuty nếu production thật.

## 5. Routing khuyến nghị

Có 2 phương án.

### Phương án A: Giữ Nginx frontend làm gateway

Phù hợp với cấu hình hiện tại.

```text
ALB -> ECS frontend/nginx
frontend/nginx:
  /api/*     -> backend:8080
  /pose/*    -> fitness-ai:5001
  /uploads/* -> backend:8080
  /*         -> React SPA
```

Ưu điểm: ít sửa code, giữ same-origin, giảm CORS.

Nhược điểm: frontend container đang kiêm gateway, scale/routing không tách bạch bằng ALB path routing.

### Phương án B: ALB path routing trực tiếp

Phù hợp production rõ ràng hơn.

```text
CloudFront/ALB:
  /api/*     -> backend target group
  /pose/*    -> fitness-ai target group
  /uploads/* -> backend target group hoặc CloudFront/S3
  /*         -> frontend target group hoặc S3 static hosting
```

Ưu điểm: chuẩn cloud hơn, observability tốt hơn, dễ scale từng target group.

Nhược điểm: cần cấu hình path rewrite cho `/pose` hoặc sửa service nhận prefix.

Khuyến nghị: giai đoạn đầu dùng phương án A để deploy nhanh và an toàn. Sau khi ổn định, chuyển dần sang phương án B.

## 6. Những thay đổi kỹ thuật nên làm trước production

### 6.1. Chuyển uploads từ local volume sang S3

Hiện backend dùng `LocalFileStorageService` lưu vào `UPLOAD_PATH`. Khi chạy nhiều task ECS, local filesystem sẽ không đồng bộ giữa instances.

Việc cần làm:

- Tạo `S3FileStorageService` implement cùng interface `FileStorageService`.
- Dùng property `storage.provider=local|s3`.
- Upload object vào bucket `fitnit-uploads-prod`.
- Lưu DB key dạng `uploads/images/...` thay vì local path.
- Serve public file qua CloudFront hoặc trả presigned URL.

Biến môi trường gợi ý:

```env
STORAGE_PROVIDER=s3
AWS_REGION=ap-southeast-1
S3_UPLOAD_BUCKET=fitnit-uploads-prod
S3_PUBLIC_BASE_URL=https://cdn.fitnit.vn/uploads
```

### 6.2. Secrets Manager

Các secret cần đưa vào Secrets Manager:

```text
POSTGRES_PASSWORD
JWT_SECRET
POSE_SIGNING_SECRET
GROQ_API_KEY
MAIL_PASSWORD
VNPAY_HASH_SECRET
VNPAY_TMN_CODE
```

Không dùng `.env.prod` trên ECS production, chỉ dùng cho local/staging compose.

### 6.3. RDS và Flyway

Backend production đã có:

```properties
spring.jpa.hibernate.ddl-auto=validate
spring.flyway.enabled=true
```

Checklist:

- Chạy migration trên staging trước.
- Snapshot RDS trước mỗi release có migration.
- Không chỉnh sửa migration đã chạy ở production.
- Migration mới phải thêm file version mới.

### 6.4. Health checks

Target group health check:

| Service | Path |
|---|---|
| Frontend | `/` |
| Backend | `/actuator/health` |
| AI Service | `/health` |
| Fitness AI | `/health` |

Backend health nên không phụ thuộc SMTP để tránh mail lỗi làm service bị gỡ khỏi target group.

### 6.5. Resource tuning

Backend Dockerfile production hiện dùng JDK runtime. Có thể tối ưu:

- Chuyển runtime sang JRE nếu image phù hợp.
- Giữ `JAVA_TOOL_OPTIONS=-XX:MaxRAMPercentage=60`.
- Bật structured logging JSON nếu cần phân tích CloudWatch tốt hơn.

Python AI:

- Đặt timeout/retry khi gọi Groq.
- Log request ID, không log prompt chứa dữ liệu nhạy cảm.
- Cân nhắc tách queue async nếu tác vụ AI lâu.

## 7. Biến môi trường ECS

### Backend task

```env
SPRING_PROFILES_ACTIVE=prod
SPRING_DATASOURCE_URL=jdbc:postgresql://<rds-endpoint>:5432/fit_challenge
SPRING_DATASOURCE_USERNAME=fitnit_app
SPRING_DATASOURCE_PASSWORD=<Secrets Manager>
JWT_SECRET=<Secrets Manager>
JWT_EXPIRATION=86400000
AI_SERVICE_URL=http://ai-service.fitnit.local:8001
POSE_SIGNING_SECRET=<Secrets Manager>
CORS_ALLOWED_ORIGINS=https://fitnit.vn,https://www.fitnit.vn
APP_PUBLIC_BASE_URL=https://fitnit.vn
FRONTEND_URL=https://fitnit.vn
UPLOAD_PATH=/app/uploads/
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=<Secrets Manager or empty>
MAIL_PASSWORD=<Secrets Manager or empty>
VNPAY_TMN_CODE=<Secrets Manager>
VNPAY_HASH_SECRET=<Secrets Manager>
VNPAY_URL=https://pay.vnpay.vn/vpcpay.html
VNPAY_RETURN_URL=https://fitnit.vn/payment/result
VNPAY_IPN_URL=https://fitnit.vn/api/payment/vnpay-ipn
```

Nếu đã chuyển S3:

```env
STORAGE_PROVIDER=s3
S3_UPLOAD_BUCKET=fitnit-uploads-prod
AWS_REGION=ap-southeast-1
```

### AI service task

```env
HOST=0.0.0.0
GROQ_API_KEY=<Secrets Manager>
```

### Fitness AI task

```env
HOST=0.0.0.0
PORT=5001
MEDIAPIPE_MODEL_COMPLEXITY=1
POSE_SIGNING_SECRET=<Secrets Manager>
```

### Frontend build

Nếu giữ same-origin:

```env
VITE_API_URL=
```

Nếu tách subdomain API:

```env
VITE_API_URL=https://api.fitnit.vn
```

## 8. CI/CD đề xuất

Pipeline GitHub Actions:

```text
pull request:
  - lint/test frontend
  - test backend
  - build Docker images

main branch:
  - build images
  - tag image bằng git SHA
  - push ECR
  - run DB migration check trên staging
  - deploy ECS staging
  - smoke test

production tag:
  - snapshot RDS
  - deploy ECS production rolling update
  - smoke test production
  - notify
```

Images:

```text
fitnit/frontend:<git-sha>
fitnit/backend:<git-sha>
fitnit/ai-service:<git-sha>
fitnit/fitness-ai:<git-sha>
```

Smoke test tối thiểu:

```bash
curl -fsS https://fitnit.vn/
curl -fsS https://fitnit.vn/api/challenges
curl -fsS https://fitnit.vn/actuator/health
```

Lưu ý: `/actuator/health` hiện backend permit nội bộ; nếu expose qua public path cần cân nhắc chặn bằng ALB/WAF hoặc chỉ dùng target group health check.

## 9. Monitoring và alerting

CloudWatch log groups:

```text
/fitnit/prod/frontend
/fitnit/prod/backend
/fitnit/prod/ai-service
/fitnit/prod/fitness-ai
```

Alarms tối thiểu:

| Alarm | Ngưỡng gợi ý |
|---|---|
| ALB 5xx | > 1% trong 5 phút |
| ALB target response time | p95 > 2s trong 10 phút |
| ECS CPU | > 75% trong 10 phút |
| ECS Memory | > 80% trong 10 phút |
| RDS CPU | > 75% trong 15 phút |
| RDS Free storage | < 20% |
| RDS connections | > 80% max |
| Backend unhealthy tasks | >= 1 |

Business metrics nên log hoặc lưu DB:

- Số request AI/ngày.
- Lỗi Groq API theo loại.
- Số upload thất bại.
- Payment callback failed.
- Pose websocket disconnect/error rate.

## 10. Backup và disaster recovery

RDS:

- Bật automated backup 7-30 ngày.
- Bật deletion protection production.
- Snapshot thủ công trước migration lớn.
- Test restore sang staging ít nhất mỗi tháng.

S3 uploads:

- Bật versioning.
- Bật lifecycle chuyển object cũ sang Infrequent Access nếu cần.
- Block public access, public qua CloudFront hoặc signed URL.

Secrets:

- Rotate secret định kỳ.
- IAM task role chỉ được đọc đúng secret cần dùng.

## 11. Lộ trình triển khai thực tế

### Giai đoạn 0: Chốt thông tin

- Domain production và staging.
- AWS region, khuyến nghị `ap-southeast-1` nếu người dùng ở Việt Nam.
- Mức ngân sách tháng.
- Có cần production HA ngay hay chỉ demo/staging.
- Có dùng VNPay production chưa.

### Giai đoạn 1: Staging nhanh

- Tạo ECR repositories.
- Tạo RDS PostgreSQL staging.
- Tạo ECS cluster Fargate.
- Deploy 4 services từ Dockerfile hiện có.
- Gắn ALB + ACM + domain staging.
- Đưa secret vào Secrets Manager.
- Smoke test end-to-end.

### Giai đoạn 2: Production hardening

- Chuyển upload sang S3.
- Tạo production VPC/RDS/ECS riêng hoặc tách bằng environment.
- Bật WAF, CloudWatch alarms, RDS backup.
- Thiết lập GitHub Actions deploy.
- Chạy load/smoke test.

### Giai đoạn 3: Scale và tối ưu

- Autoscaling backend theo CPU/RequestCount.
- Tách frontend static sang S3 + CloudFront nếu muốn giảm container.
- Tối ưu Fitness AI CPU/memory dựa trên metrics.
- Thêm queue cho các tác vụ AI dài nếu cần.

## 12. Phương án tiết kiệm cho demo

Nếu mục tiêu là demo nhanh, có thể dùng:

```text
EC2 t3.medium/t3.large
Docker Compose production
Caddy hoặc ALB terminate TLS
RDS PostgreSQL t4g.micro
S3 uploads chuyển sau
CloudWatch Agent/log rotation
```

Ưu điểm:

- Triển khai nhanh.
- Chi phí thấp.
- Ít thay đổi cấu trúc hiện tại.

Nhược điểm:

- Scale và HA hạn chế.
- Upload local vẫn là điểm yếu.
- Cần tự vận hành EC2, disk, patching.

Khuyến nghị: dùng phương án này cho demo/staging ngắn hạn; với production thật nên đi ECS Fargate + RDS + S3.

## 13. Checklist Go-Live

- [ ] Domain trỏ Route 53/ALB/CloudFront đúng.
- [ ] ACM certificate issued và HTTPS hoạt động.
- [ ] Secrets không nằm trong Git, image hoặc task definition plain text.
- [ ] RDS không public, có backup, có deletion protection.
- [ ] Backend `prod` profile chạy `ddl-auto=validate`, Flyway enabled.
- [ ] Upload không phụ thuộc local filesystem nếu chạy nhiều task.
- [ ] ALB health checks xanh toàn bộ target groups.
- [ ] CloudWatch alarms gửi về email/Slack.
- [ ] WAF bật rate limit cho auth/API nhạy cảm.
- [ ] Smoke test đăng ký, đăng nhập, onboarding, AI meal/workout, pose, upload, payment sandbox.
- [ ] Có rollback plan: image tag trước đó + DB snapshot.

