# Đề Xuất Cấu Trúc Thư Mục Chuyên Nghiệp

## 📁 Cấu Trúc Hiện Tại (Cũ)

```
FitnitChallenge/
├── -Fit_Ai_Challenge_Wep-App_FE/      ❌ Tên không chuẩn (có dấu -, typo Wep)
├── Fit_Ai_Challenge_Web-App_BE/        ⚠️ Tên không nhất quán
├── ai-service/                          ✅ Ổn
├── fitness-ai-service/                 ⚠️ Trùng lặp với ai-service?
├── docs/                                ✅ Ổn
├── docker-compose.local.yml
├── dev.sh
└── README.md
```

## 📁 Cấu Trúc Đề Xuất (Mới)

### Option 1: Tên ngắn gọn (Khuyến nghị)
```
FitnitChallenge/
├── frontend/                    ✅ React/Vite Frontend
├── backend/                     ✅ Spring Boot Backend
├── ai-service/                  ✅ Python AI Service
├── docs/                        ✅ Documentation
├── infra/                       🆕 Infrastructure configs
│   ├── docker/
│   │   ├── docker-compose.yml
│   │   └── Dockerfile.backend
│   ├── k8s/                     (nếu có Kubernetes)
│   └── nginx/
├── scripts/                     🆕 Automation scripts
│   ├── dev.sh
│   ├── build.sh
│   └── deploy.sh
├── .github/                     ✅ CI/CD workflows
├── .env.example
├── .gitignore
├── Makefile                     🆕 Standard commands
└── README.md
```

### Option 2: Tên đầy đủ
```
FitnitChallenge/
├── fit-challenge-frontend/      ✅ React/Vite
├── fit-challenge-backend/       ✅ Spring Boot
├── fit-challenge-ai-service/  ✅ Python AI
└── ... (còn lại giống Option 1)
```

---

## 🔄 Thay Đổi Chi Tiết

### 1. Thư mục Frontend (Wep → Web)

| Tên Cũ | Tên Mới | Lý Do |
|--------|---------|-------|
| `-Fit_Ai_Challenge_Wep-App_FE` | `frontend` hoặc `fit-challenge-frontend` | - Xóa dấu `-` đầu tiên<br>- Sửa typo `Wep` → `Web`<br>- Tên ngắn gọn, chuẩn industry |

**Files cần update:**
- `docker-compose.local.yml` - build context
- `dev.sh` - đường dẫn chạy dev
- `README.md` - tài liệu
- `.github/workflows/*.yml` - CI/CD

### 2. Thư mục Backend

| Tên Cũ | Tên Mới | Lý Do |
|--------|---------|-------|
| `Fit_Ai_Challenge_Web-App_BE` | `backend` hoặc `fit-challenge-backend` | - Tên ngắn gọn<br>- Chuẩn naming convention |

**Files cần update:**
- `docker-compose.local.yml`
- `dev.sh`
- `README.md`

### 3. AI Service

| Tên Cũ | Tên Mới | Lý Do |
|--------|---------|-------|
| `ai-service` (34 items) | Giữ nguyên hoặc `ai-service` | Đã tốt |
| `fitness-ai-service` (39588 items) | ❌ Xóa hoặc đổi thành `ai-service` | Có vẻ là thư mục venv, nên xóa |

**Lưu ý:** Thư mục `fitness-ai-service/venv` có vẻ là virtual environment, không nên commit vào git.

---

## 📝 Files Cần Cập Nhật

### 1. docker-compose.local.yml
```yaml
services:
  frontend:
    build:
      context: ./frontend  # đổi từ ./-Fit_Ai_Challenge_Wep-App_FE
    
  backend:
    build:
      context: ./backend  # đổi từ ./Fit_Ai_Challenge_Web-App_BE
```

### 2. dev.sh
```bash
# Đổi các đường dẫn:
cd frontend && npm run dev    # thay vì cd -Fit_Ai_Challenge_Wep-App_FE
cd backend && ./mvnw spring-boot:run  # thay vì cd Fit_Ai_Challenge_Web-App_BE
```

### 3. pom.xml (Backend)
```xml
<!-- Có thể đổi artifactId (tùy chọn) -->
<artifactId>fit-challenge-backend</artifactId>
<name>Fit Challenge Backend</name>
```

### 4. package.json (Frontend)
```json
{
  "name": "fit-challenge-frontend",
  "description": "Fit Challenge - Fitness AI Platform"
}
```

### 5. README.md
```markdown
## Structure
- `frontend/` - React + Vite frontend
- `backend/` - Spring Boot backend  
- `ai-service/` - Python AI service
```

---

## 🚀 Script Tự Động Hóa

File `rename-project.sh` đã được tạo. Để chạy:

```bash
# 1. Backup project trước
cp -r FitnitChallenge FitnitChallenge-backup-$(date +%Y%m%d)

# 2. Chạy script đổi tên
chmod +x rename-project.sh
./rename-project.sh

# 3. Cập nhật files còn lại (thủ công hoặc sed)
sed -i 's/-Fit_Ai_Challenge_Wep-App_FE/frontend/g' docker-compose.local.ymlsed -i 's/Fit_Ai_Challenge_Web-App_BE/backend/g' docker-compose.local.ymlsed -i 's/Fit_Ai_Challenge_Web-App_BE/backend/g' dev.shsed -i 's/-Fit_Ai_Challenge_Wep-App_FE/frontend/g' dev.sh

# 4. Commit
git add -A
git commit -m "refactor: rename project folders to standard convention

- Rename FE: -Fit_Ai_Challenge_Wep-App_FE → frontend
- Rename BE: Fit_Ai_Challenge_Web-App_BE → backend  
- Update all references in docker-compose, dev.sh, README
- Add Makefile for standard commands

BREAKING CHANGE: folder structure changed"
```

---

## 📊 So Sánh

| Tiêu Chí | Cũ | Mới |
|----------|-----|-----|
| Độ dài tên | Dài, khó nhớ | Ngắn gọn |
| Naming | `Wep` typo, dấu `-` lạ | Chuẩn snake_case |
| Industry standard | Không phổ biến | Phổ biến (frontend/backend) |
| Docker context | Dài | Ngắn |
| CI/CD configs | Khó đọc | Dễ đọc |

---

## ⚡ Lệnh Nhanh (Copy & Paste)

```bash
# Terminal từ thư mục gốc:

# Đổi tên
mv -Fit_Ai_Challenge_Wep-App_FE frontend
mv Fit_Ai_Challenge_Web-App_BE backend

# Update docker-compose (macOS)
sed -i '' 's/-Fit_Ai_Challenge_Wep-App_FE/frontend/g' docker-compose.local.yml
sed -i '' 's/Fit_Ai_Challenge_Web-App_BE/backend/g' docker-compose.local.yml

# Update dev.sh
sed -i '' 's/-Fit_Ai_Challenge_Wep-App_FE/frontend/g' dev.sh
sed -i '' 's/Fit_Ai_Challenge_Web-App_BE/backend/g' dev.sh

# Update README
sed -i '' 's/-Fit_Ai_Challenge_Wep-App_FE/frontend/g' README.md
sed -i '' 's/Fit_Ai_Challenge_Web-App_BE/backend/g' README.md

# Verify
echo "✅ Done! New structure:"
ls -la
```

---

**Khuyến nghị:** Sử dụng **Option 1** (`frontend`, `backend`, `ai-service`) vì ngắn gọn và là industry standard.

**Lưu ý:** Sau khi đổi tên, cần:
1. Đóng và mở lại IDE
2. Cập nhật run configurations
3. Test lại `docker-compose` và `dev.sh`
