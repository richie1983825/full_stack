#!/bin/bash
#
# CMP 容量管理平台 - 一键停止所有服务
# 用法: ./stop.sh
#
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"
PG_CONTAINER="postgres-cmp"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
log_info()  { echo -e "${GREEN}[INFO]${NC}  $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
log_step()  { echo -e "${BLUE}[STEP]${NC}  $1"; }

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   CMP 容量管理平台 - 一键停止            ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════╝${NC}"
echo ""

# 1. Frontend
if [ -f "$FRONTEND_DIR/stop.sh" ]; then
    log_info ">>> 停止 Frontend..."
    bash "$FRONTEND_DIR/stop.sh"
else
    log_warn "Frontend stop.sh 不存在，跳过"
fi

# 2. Backend
if [ -f "$BACKEND_DIR/stop.sh" ]; then
    log_info ">>> 停止 Backend..."
    bash "$BACKEND_DIR/stop.sh"
else
    log_warn "Backend stop.sh 不存在，跳过"
fi

# 3. PostgreSQL
if docker ps --format '{{.Names}}' | grep -q "^${PG_CONTAINER}$"; then
    log_step "停止 PostgreSQL 容器..."
    docker stop "$PG_CONTAINER"
    log_info "PostgreSQL 已停止"
else
    log_info "PostgreSQL 容器未运行"
fi

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   所有服务已停止                         ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════╝${NC}"
echo ""
