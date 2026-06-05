#!/bin/bash

# Script tạo file tar để deploy lên EC2
# Loại bỏ tất cả file không cần thiết
# Chạy từ thư mục fitness-ai-service

echo "📂 Đang ở thư mục: $(pwd)"
echo ""

echo "🗑️  Xóa file tar cũ..."
rm -f fitness-ai-service.tar fitness-ai-service.tar.gz

echo "📦 Tạo file tar mới (KHÔNG nén, loại bỏ venv, cache, etc.)..."
tar --exclude='venv' \
    --exclude='venv*' \
    --exclude='__pycache__' \
    --exclude='*.pyc' \
    --exclude='*.pyo' \
    --exclude='*.tar' \
    --exclude='*.tar.gz' \
    --exclude='*.zip' \
    --exclude='.git' \
    --exclude='.gitignore' \
    --exclude='.env' \
    --exclude='.env.local' \
    --exclude='*.log' \
    --exclude='logs' \
    --exclude='.DS_Store' \
    --exclude='Thumbs.db' \
    --exclude='.vscode' \
    --exclude='.idea' \
    --exclude='*.swp' \
    --exclude='*.swo' \
    -cf fitness-ai-service.tar .

echo ""
echo "✅ Hoàn tất!"
echo "📊 Kích thước file:"
ls -lh fitness-ai-service.tar

echo ""
echo "📋 Nội dung file tar (20 dòng đầu):"
tar -tf fitness-ai-service.tar | head -20
echo "..."

echo ""
echo "🚀 Để upload lên EC2:"
echo "   scp -i your-key.pem fitness-ai-service.tar ec2-user@your-ec2-ip:/home/ec2-user/"

