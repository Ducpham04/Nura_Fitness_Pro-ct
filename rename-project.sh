#!/bin/bash

# Script đổi tên project Fit Challenge sang chuẩn chuyên nghiệp
# Chạy từ thư mục gốc: ./rename-project.sh

echo "🏃‍♂️ Fit Challenge Project Renaming Script"
echo "=========================================="
echo ""

# Tên cũ và tên mới
OLD_FE="-Fit_Ai_Challenge_Wep-App_FE"
NEW_FE="fit-challenge-frontend"

OLD_BE="Fit_Ai_Challenge_Web-App_BE"  
NEW_BE="fit-challenge-backend"

OLD_AI="fitness-ai-service"
NEW_AI="fit-challenge-ai-service"

echo "📋 Kế hoạch đổi tên:"
echo "  Frontend: $OLD_FE → $NEW_FE"
echo "  Backend:  $OLD_BE → $NEW_BE"
echo "  AI Service: $OLD_AI → $NEW_AI"
echo ""

# Kiểm tra thư mục tồn tại
if [ ! -d "$OLD_FE" ]; then
    echo "❌ Không tìm thấy thư mục FE: $OLD_FE"
    exit 1
fi

if [ ! -d "$OLD_BE" ]; then
    echo "❌ Không tìm thấy thư mục BE: $OLD_BE"
    exit 1
fi

if [ ! -d "$OLD_AI" ]; then
    echo "❌ Không tìm thấy thư mục AI: $OLD_AI"
    exit 1
fi

echo "✅ Tất cả thư mục đã tồn tại"
echo ""

# Đổi tên thư mục
echo "🔄 Đang đổi tên thư mục..."

mv "$OLD_FE" "$NEW_FE"
echo "  ✓ Frontend đổi tên xong"

mv "$OLD_BE" "$NEW_BE"
echo "  ✓ Backend đổi tên xong"

mv "$OLD_AI" "$NEW_AI"
echo "  ✓ AI Service đổi tên xong"

echo ""
echo "✅ Hoàn thành đổi tên thư mục!"
echo ""
echo "📝 CẦN LÀM THÊM (thủ công):"
echo "  1. Cập nhật đường dẫn trong docker-compose.local.yml"
echo "  2. Cập nhật đường dẫn trong dev.sh"
echo "  3. Cập nhật đường dẫn trong README.md"
echo "  4. Cập nhật artifactId trong pom.xml (nếu muốn)"
echo "  5. Commit thay đổi: git add -A && git commit -m 'refactor: rename project folders'"
echo ""
echo "⚠️  Lưu ý: Các file đang mở trong IDE cần đóng và mở lại!"
