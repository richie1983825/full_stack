#!/bin/bash
#
# CMP Frontend 启动脚本
# 用法: ./start.sh [mock|real]
#   mock - 使用 Mock 数据（默认）
#   real - 连接真实后端
#
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PORT=3100
PID_FILE="$SCRIPT_DIR/.frontend.pid"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
log_info()  { echo -e "${GREEN}[INFO]${NC}  $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step()  { echo -e "${BLUE}[STEP]${NC}  $1"; }

BACKEND_PORT=3101

wait_for_backend() {
    local max_attempts=90
    local attempt=0
    log_step "等待 Backend 就绪 (http://127.0.0.1:$BACKEND_PORT/health)..."
    while [ "$attempt" -lt "$max_attempts" ]; do
        if curl -sf "http://127.0.0.1:$BACKEND_PORT/health" >/dev/null 2>&1; then
            log_info "Backend 已就绪"
            return 0
        fi
        attempt=$((attempt + 1))
        sleep 1
    done
    log_error "Backend 未就绪，请先启动 Backend: cd backend && ./start.sh"
    return 1
}

MODE="${1:-mock}"

echo ""
echo -e "${BLUE}═══ CMP Frontend 启动 ═══${NC}"
echo ""

# 1. 检查是否已运行
if curl -sf "http://127.0.0.1:$PORT/" >/dev/null 2>&1; then
    log_info "Frontend 已在运行 (http://localhost:$PORT)"
    exit 0
fi
if [ -f "$PID_FILE" ]; then
    rm -f "$PID_FILE"
fi

# 2. 安装依赖
log_step "安装依赖..."
cd "$SCRIPT_DIR"
npm install --silent 2>&1 | tail -1

# 3. 真实后端模式下，等待 Backend 就绪后再启动 Frontend
if [ "$MODE" = "real" ]; then
    if ! wait_for_backend; then
        exit 1
    fi
fi

# 4. 启动
if [ "$MODE" = "real" ]; then
    log_step "启动 Frontend (端口 $PORT, 连接真实后端)..."
    VITE_ENABLE_MOCK=false nohup npx vite --host --port "$PORT" > "$SCRIPT_DIR/frontend.log" 2>&1 &
else
    log_step "启动 Frontend (端口 $PORT, Mock 模式)..."
    nohup npx vite --host --port "$PORT" > "$SCRIPT_DIR/frontend.log" 2>&1 &
fi
echo $! > "$PID_FILE"
sleep 3

if kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
    log_info "Frontend 已启动 (PID: $(cat "$PID_FILE"), http://localhost:$PORT)"
    [ "$MODE" = "real" ] && log_info "模式: 真实后端 (localhost:3101)" || log_info "模式: Mock 数据"
else
    log_error "Frontend 启动失败，查看日志: $SCRIPT_DIR/frontend.log"
    rm -f "$PID_FILE"
    exit 1
fi

echo ""
