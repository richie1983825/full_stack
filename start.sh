#!/bin/bash
#
# CMP 容量管理平台 - 一键启动所有服务
# 用法: ./start.sh [mock|real|dev]
#   mock - Frontend Mock 模式（默认）
#   real - Frontend 连接真实 Backend
#   dev  - Backend cargo-watch 热重启 + Frontend 连接真实 Backend
#
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
log_info()  { echo -e "${GREEN}[INFO]${NC}  $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

MODE="${1:-mock}"

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   CMP 容量管理平台 - 一键启动            ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════╝${NC}"
echo ""

# 1. Backend
if [ "$MODE" = "dev" ]; then
    if [ -f "$BACKEND_DIR/dev.sh" ]; then
        log_info ">>> 启动 Backend（开发模式 / cargo-watch）..."
        bash "$BACKEND_DIR/dev.sh" --bg
    else
        log_error "Backend dev.sh 不存在: $BACKEND_DIR/dev.sh"
        exit 1
    fi
elif [ -f "$BACKEND_DIR/start.sh" ]; then
    log_info ">>> 启动 Backend..."
    bash "$BACKEND_DIR/start.sh"
else
    log_error "Backend start.sh 不存在: $BACKEND_DIR/start.sh"
    exit 1
fi

# 2. Frontend
if [ -f "$FRONTEND_DIR/start.sh" ]; then
    if [ "$MODE" = "dev" ]; then
        log_info ">>> 启动 Frontend (real 模式 + Vite HMR)..."
        bash "$FRONTEND_DIR/start.sh" real
    else
        log_info ">>> 启动 Frontend ($MODE 模式)..."
        bash "$FRONTEND_DIR/start.sh" "$MODE"
    fi
else
    log_error "Frontend start.sh 不存在: $FRONTEND_DIR/start.sh"
    exit 1
fi

echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   所有服务已启动                         ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"
echo ""
echo "   Frontend  → http://localhost:3100"
echo "   Backend   → http://localhost:3101"
echo "   Database  → postgresql://localhost:5432/cmp_service"
if [ "$MODE" = "dev" ]; then
    echo ""
    echo "   开发模式: 前端 HMR + 后端 cargo-watch 自动重启"
    echo "   后端日志: tail -f backend/backend.log"
fi
echo ""
