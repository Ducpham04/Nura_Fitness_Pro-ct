#!/bin/bash

# Quick Start Script cho Fit Challenge
# Chạy từ thư mục gốc: ./quick-start.sh

set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo -e "${BLUE}"
    echo "╔════════════════════════════════════════╗"
    echo "║      🚀 Fit Challenge Quick Start      ║"
    echo "╚════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker chưa chạy! Vui lòng khởi động Docker Desktop."
        exit 1
    fi
    print_success "Docker đã sẵn sàng"
}

# Start services
start_services() {
    print_info "Đang khởi động services..."
    cd "$ROOT_DIR"
    docker compose -f docker-compose.local.yml up -d
    
    print_info "Đang đợi services khởi động (30s)..."
    sleep 30
    
    # Check health
    if curl -s http://localhost:8080/actuator/health > /dev/null; then
        print_success "Backend (Spring Boot) đã sẵn sàng - http://localhost:8080"
    else
        print_warning "Backend chưa sẵn sàng, đang đợi thêm..."
        sleep 30
    fi
    
    if curl -s http://localhost:5001/health > /dev/null; then
        print_success "AI Service đã sẵn sàng - http://localhost:5001"
    else
        print_warning "AI Service có thể chưa sẵn sàng"
    fi
}

# Seed data
seed_data() {
    print_info "Đang seed data..."
    
    # Enhanced seeder (full data cho FE testing)
    response=$(curl -s -X POST http://localhost:8080/api/admin/enhanced-seeder/seed-all)
    
    if echo "$response" | grep -q '"success":true'; then
        print_success "Seed data thành công!"
        echo ""
        echo "👤 Test Accounts:"
        echo "  User:  user1@test.com / password123"
        echo "  Admin: admin@test.com / admin123"
        echo ""
    else
        print_error "Seed data thất bại"
        echo "$response"
    fi
}

# Test API
test_api() {
    print_info "Testing API..."
    
    # Test login
    login_response=$(curl -s -X POST http://localhost:8080/api/auth/login \
        -H "Content-Type: application/json" \
        -d '{"email":"user1@test.com","password":"password123"}')
    
    if echo "$login_response" | grep -q '"accessToken"'; then
        print_success "Login API hoạt động!"
        token=$(echo "$login_response" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
        
        # Test get user
        user_response=$(curl -s http://localhost:8080/api/auth/me \
            -H "Authorization: Bearer $token")
        
        if echo "$user_response" | grep -q '"email"'; then
            print_success "Get user API hoạt động!"
        fi
    else
        print_warning "Login API chưa hoạt động"
    fi
}

# Start frontend
start_frontend() {
    print_info "Khởi động Frontend..."
    cd "$ROOT_DIR/frontend"
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        print_info "Đang cài dependencies..."
        npm install
    fi
    
    print_success "Frontend đã sẵn sàng - http://localhost:5173"
    print_info "Mở browser: http://localhost:5173"
    
    npm run dev
}

# Show status
show_status() {
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║           📊 System Status            ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
    echo ""
    echo "Services:"
    echo "  🗄️  Database:    mysql://localhost:3306"
    echo "  ⚙️  Backend:     http://localhost:8080"
    echo "  🤖 AI Service:   http://localhost:5001"
    echo "  🎨 Frontend:     http://localhost:5173 (sau khi chạy 'npm run dev')"
    echo "  🛠️  Adminer:     http://localhost:8081"
    echo ""
    echo "API Endpoints:"
    echo "  POST http://localhost:8080/api/auth/login"
    echo "  GET  http://localhost:8080/api/challenges"
    echo "  GET  http://localhost:8080/api/notifications/1"
    echo ""
    echo "Test Accounts:"
    echo "  👤 user1@test.com / password123"
    echo "  👑 admin@test.com / admin123"
    echo ""
}

# Main menu
main() {
    print_header
    
    echo "Chọn tùy chọn:"
    echo "  1) 🚀 Full Setup (Docker + Seed + Start FE)"
    echo "  2) 🐳 Start Docker Services Only"
    echo "  3) 🌱 Seed Data Only"
    echo "  4) 🧪 Test API Only"
    echo "  5) 📊 Show Status"
    echo "  6) 🛑 Stop All Services"
    echo "  0) Thoát"
    echo ""
    
    read -p "Lựa chọn (0-6): " choice
    
    case $choice in
        1)
            check_docker
            start_services
            seed_data
            test_api
            show_status
            start_frontend
            ;;
        2)
            check_docker
            start_services
            show_status
            ;;
        3)
            seed_data
            ;;
        4)
            test_api
            ;;
        5)
            show_status
            ;;
        6)
            print_info "Đang dừng services..."
            cd "$ROOT_DIR"
            docker compose -f docker-compose.local.yml down
            print_success "Đã dừng tất cả services"
            ;;
        0)
            print_info "Thoát..."
            exit 0
            ;;
        *)
            print_error "Lựa chọn không hợp lệ"
            ;;
    esac
}

# Run main
main
