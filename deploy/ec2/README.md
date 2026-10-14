# Migrate ECS Fargate → 1 EC2 (docker-compose)

Mục tiêu: giảm hoá đơn AWS từ **~$89/tháng → ~$30/tháng** bằng cách gom 4 task
Fargate + ALB + 4 IPv4 + RDS về **một máy EC2 t3.medium** chạy docker-compose.

| Thành phần | Trước | Sau |
|---|---|---|
| Compute | 4 task Fargate — $49/mo | EC2 t3.medium (tắt 0h–6h) — $28.9/mo |
| Vào mạng | ALB $17.7 + 4 IPv4 $18.5 | 1 Elastic IP $3.6 |
| Database | RDS db.t4g.micro $17.6 | container postgres:18 + backup S3 ~$1 |
| Secret | Secrets Manager $2.8 | file `.env.prod` chmod 600 trên máy |
| DNS nội bộ | Route53 private zone $0.5 | mạng docker |

## Quyết định thiết kế

- **Máy phải là ARM64 (t4g), không phải x86 (t3).** Cả 4 image trên ECR chỉ
  có manifest `arm64`, và cả 4 task definition Fargate đều khai
  `cpuArchitecture: ARM64` — production vốn đã chạy Graviton. Dựng t3 thì
  `docker pull` báo `no matching manifest for linux/amd64`. Tiện là t4g rẻ
  hơn t3 cùng cỡ (~$31 vs ~$38.5/tháng).
- **Không build trên EC2.** Kéo đúng image `:latest` đang chạy prod từ ECR.
  Build Java + MediaPipe trên máy 2 vCPU vừa lâu vừa dễ OOM, và bản build mới
  không còn là bản đã được kiểm chứng trên prod.
- **Postgres 18, không phải 16.** RDS `nura-challenge` chạy 18.3; dump từ 18
  không restore ngược vào 16 được. `docker-compose.prod.yml` ở gốc repo khai
  `postgres:16-alpine` — đừng dùng file đó cho lần migrate này.
- **Giữ nguyên tên DB (`postgres`) và user (`nura_app`)** để dump nạp thẳng,
  không phải sửa quyền sở hữu bảng.
- **Ảnh/video không cần di chuyển** — backend đã dùng `STORAGE_PROVIDER=s3`,
  chỉ cần EC2 có IAM role đọc/ghi bucket upload.
- **`mem_limit` chứ không phải `deploy.resources.limits`.** Khoá `deploy.*`
  chỉ có tác dụng trong Swarm; `docker compose up` bỏ qua nó — nghĩa là các
  giới hạn RAM trong `docker-compose.prod.yml` hiện **không hề có hiệu lực**.
- **Ubuntu 24.04, không phải Amazon Linux 2023.** AL2023 không có `caddy` lẫn
  `docker-compose-plugin` trong repo (không EPEL) — phải tải binary rời, tức
  là không có đường vá lỗi. Ubuntu dùng repo apt chính thức của Docker (ký
  GPG) và `unattended-upgrades` cho vá bảo mật.
- **Caddy chạy bằng container**, cùng lý do trên. Volume `caddy_data` giữ
  chứng chỉ — mất volume này là phải xin cert lại, dễ chạm rate-limit Let's
  Encrypt (5 cert/domain/tuần).
- **Không mở cổng 22.** Truy cập bằng SSM Session Manager / `send-command`,
  không cần key SSH, không phơi SSH ra internet.
- **Có swap 2GB + `vm.swappiness=10`.** Máy 4GB chạy JVM và MediaPipe cùng
  lúc; không có swap thì kernel OOM-kill thẳng container backend.

## Phase 0 — chuẩn bị (xong, không đụng AWS)

Các file trong thư mục này:

| File | Việc |
|---|---|
| `docker-compose.yml` | Stack đầy đủ, dùng image ECR |
| `nginx.conf` | Bản sửa của `frontend/nginx.conf`: upstream `backend:8080` qua DNS docker `127.0.0.11` thay cho Cloud Map |
| `Caddyfile.staging` | TLS cho hostname tạm `ec2.viway.id.vn` (Phase 3) |
| `Caddyfile` | TLS cho `app.viway.id.vn` (Phase 4, sau khi đổi DNS) |
| `make-env.sh` | Sinh `.env.prod` từ Secrets Manager, chạy **trên EC2** |

> Sửa `frontend/nginx.conf` thì phải sửa `deploy/ec2/nginx.conf` — hai file
> phải khớp nhau về routing, chỉ khác phần resolver/upstream.

## Phase 1 — dựng EC2 (đã xong)

Tài nguyên đã tạo:

| Loại | Định danh |
|---|---|
| EC2 | `i-0979f4a1a73eaa331` — **t4g.medium (ARM64)**, Ubuntu 24.04, 30GB gp3 mã hoá, IMDSv2 bắt buộc |
| Elastic IP | **47.131.164.112** |
| Subnet | `subnet-0d7fc955eb35b9b5a` (ap-southeast-1a — cùng AZ với RDS, tránh phí liên AZ lúc dump) |
| Security group | `sg-04a6de3b32f1cb4d9` — chỉ mở 80/443 |
| IAM role | `nura-prod-ec2-role` (+ profile `nura-prod-ec2-profile`) |
| Bucket backup | `nura-prod-dbbackup-952669801986` — chặn public, bật versioning |

Quyền của role: đọc `secretsmanager:nura/prod/*`, đọc/ghi 2 bucket (upload +
backup), `AmazonEC2ContainerRegistryReadOnly`, `AmazonSSMManagedInstanceCore`.

SG của RDS (`sg-022ae99019809cab8`) đã mở 5432 cho `sg-04a6de3b32f1cb4d9`
— **gỡ rule này sau khi cutover xong**.

Vào máy:

```bash
aws ssm start-session --target i-054472b763868b870 --region ap-southeast-1
# hoặc chạy lệnh không cần plugin:
aws ssm send-command --region ap-southeast-1 --instance-ids i-054472b763868b870 \
  --document-name AWS-RunShellScript --parameters 'commands=["docker ps"]'
```

## Phase 2 — chuyển dữ liệu

RDS `nura-challenge` không public, nên phải dump **từ chính EC2** (cùng VPC):

```bash
git clone <repo> && cd FitnitChallenge
bash deploy/ec2/make-env.sh          # sinh .env.prod
set -a && . deploy/ec2/.env.prod && set +a

docker compose -p fitnit-prod -f deploy/ec2/docker-compose.yml up -d db
docker run --rm -e PGPASSWORD="$POSTGRES_PASSWORD" postgres:18-alpine \
  pg_dump -h nura-challenge.cf80e8w8gc6g.ap-southeast-1.rds.amazonaws.com \
          -U nura_app -d postgres --no-owner --no-acl \
  | gzip > /tmp/prod_$(date -u +%F_%H%M).sql.gz

gunzip -c /tmp/prod_*.sql.gz | docker exec -i fit-prod-db psql -U nura_app -d postgres
```

Kiểm tra sau restore: `select count(*) from users;` phải khớp với RDS.

## Phase 3 — chạy thử trên hostname tạm

1. Tại tenten.vn: thêm `ec2.viway.id.vn` A → Elastic IP.
2. `sudo cp deploy/ec2/Caddyfile.staging /etc/caddy/Caddyfile && sudo systemctl enable --now caddy`
3. `docker compose -p fitnit-prod -f deploy/ec2/docker-compose.yml up -d`
4. Test trên `https://ec2.viway.id.vn`:
   - [ ] Đăng nhập + đăng ký (JWT)
   - [ ] Đăng nhập Google
   - [ ] Sinh kế hoạch tập + ăn (đường backend → ai-service → Groq)
   - [ ] Camera chấm điểm (WebSocket `/pose/ws/...` — dễ vỡ nhất)
   - [ ] Ảnh/video hiện đúng (S3 qua IAM role)
   - [ ] Trang admin, báo cáo
   - [ ] `free -m` khi đang chấm điểm — RAM còn dư không

> Ở bước này người dùng thật vẫn đang dùng ALB/ECS/RDS bình thường. Dữ liệu
> họ tạo ra sẽ vào RDS, nên bản restore trên EC2 bắt đầu lệch — Phase 4 dump
> lại lần cuối để bắt phần lệch đó.

## Phase 4 — cutover (có downtime ~5–15 phút)

Làm lúc ít người dùng. Trước đó hạ TTL của `app.viway.id.vn` tại tenten.vn
xuống 300s, ít nhất một ngày trước.

1. Dừng backend cũ để chốt dữ liệu: `aws ecs update-service --cluster nura-prod-cluster --service backend --desired-count 0 --region ap-southeast-1`
2. Dump lại RDS → restore đè (drop schema rồi nạp lại) vào container.
3. Đổi DNS tại tenten.vn: `app.viway.id.vn` CNAME→ALB thành **A → Elastic IP**.
4. `sudo cp deploy/ec2/Caddyfile /etc/caddy/Caddyfile && sudo systemctl reload caddy`
5. `sudo journalctl -u caddy -f` — chờ lấy cert xong (~10–30s).
6. Kiểm lại checklist Phase 3 trên `https://app.viway.id.vn`.
7. Cập nhật webhook SePay nếu URL có đổi (không đổi nếu giữ nguyên domain).

**Rollback** (bất cứ lúc nào trước Phase 5): trỏ DNS `app.viway.id.vn` về lại
CNAME ALB và `--desired-count 1` cho 4 service ECS. RDS chưa bị xoá nên dữ
liệu gốc vẫn nguyên — chỉ mất phần user tạo ra trong lúc chạy trên EC2.

## Phase 5 — dọn dẹp (một chiều, chỉ làm sau 24–48h ổn định)

Theo thứ tự, dừng lại nếu có gì bất thường:

1. Xác nhận backup S3 hằng đêm đã chạy và **restore thử được** (bắt buộc —
   đây là thứ thay thế snapshot tự động của RDS).
2. `infra/teardown-night-scaling.sh` (gỡ lịch ECS/RDS cũ), rồi lập lịch mới
   stop/start **EC2** 0h–6h.
3. ECS: `--desired-count 0` cho cả 4 service → xoá service → xoá cluster.
4. Xoá ALB + target group + ACM cert (Caddy tự lo cert).
5. **Snapshot cuối** của RDS rồi mới xoá instance.
6. Xoá 7 secret trong Secrets Manager (chỉ tính tiền tới khi xoá thật).
7. Xoá Route53 private zone `nura.local` + Cloud Map namespace.
8. Đặt AWS Budget cảnh báo.

## Việc còn lại sau migrate

- Elastic IP vẫn bị tính tiền khi instance dừng (~$3.6/mo cả lúc tắt đêm).
- Một máy = một điểm chết. Có `restart: always` + backup đêm, nhưng hỏng đĩa
  là mất dữ liệu từ lần backup gần nhất. Cân nhắc bật EBS snapshot hằng ngày.
