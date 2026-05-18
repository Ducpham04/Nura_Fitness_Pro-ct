#!/bin/bash

# Script xử lý embedded git repositories
# Chạy từ thư mục gốc: ./fix-git-submodule.sh [option]

set -e

OPTION="${1:-remove}"

echo "🔧 Fix Git Embedded Repositories"
echo "=================================="
echo ""
echo "Option: $OPTION (remove|submodule|ignore)"
echo ""

if [ "$OPTION" = "remove" ]; then
    echo "🗑️  Cách 1: Xóa .git trong subfolders (1 repo duy nhất)"
    echo ""
    
    # Backup trước khi xóa
    echo "📦 Backup .git folders..."
    tar -czf .git-backup-$(date +%Y%m%d-%H%M%S).tar.gz frontend/.git backend/.git fitness-ai-service/.git 2>/dev/null || true
    
    # Xóa .git
    echo "🗑️  Xóa .git trong subfolders..."
    rm -rf frontend/.git
    rm -rf backend/.git  
    rm -rf fitness-ai-service/.git
    
    echo "✅ Đã xóa .git trong subfolders"
    echo ""
    echo "Tiếp theo:"
    echo "  git add -A"
    echo "  git commit -m 'refactor: rename project folders'"
    
elif [ "$OPTION" = "submodule" ]; then
    echo "📦 Cách 2: Chuyển thành git submodules"
    echo ""
    
    # Reset git add trước
    git reset HEAD frontend backend fitness-ai-service 2>/dev/null || true
    
    # Xóa cached
    git rm --cached frontend 2>/dev/null || true
    git rm --cached backend 2>/dev/null || true
    git rm --cached fitness-ai-service 2>/dev/null || true
    
    # Thêm submodule
    git submodule add ./frontend frontend 2>/dev/null || echo "frontend already exists"
    git submodule add ./backend backend 2>/dev/null || echo "backend already exists"
    git submodule add ./fitness-ai-service fitness-ai-service 2>/dev/null || echo "fitness-ai-service already exists"
    
    echo "✅ Đã thêm submodules"
    echo ""
    echo "Tiếp theo:"
    echo "  git add .gitmodules"
    echo "  git commit -m 'refactor: add submodules for fe/be/ai'"
    
elif [ "$OPTION" = "ignore" ]; then
    echo "🚫 Cách 3: Thêm vào .gitignore"
    echo ""
    
    cat >> .gitignore << EOF

# Ignore subfolders as separate repos
frontend/
backend/
fitness-ai-service/
EOF
    
    echo "✅ Đã thêm vào .gitignore"
    echo ""
    echo "Tiếp theo:"
    echo "  git add .gitignore"
    echo "  git commit -m 'chore: ignore fe/be/ai subfolders'"
    
else
    echo "❌ Option không hợp lệ: $OPTION"
    echo ""
    echo "Usage:"
    echo "  ./fix-git-submodule.sh remove      # Xóa .git, 1 repo duy nhất"
    echo "  ./fix-git-submodule.sh submodule # Chuyển thành submodules"
    echo "  ./fix-git-submodule.sh ignore    # Thêm vào .gitignore"
    exit 1
fi

echo ""
echo "Done! 🎉"
