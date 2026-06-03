#!/bin/bash
#
# CMP Backend 启动脚本
# 用法: ./start.sh
# 开发热重启请使用: ./dev.sh
#
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PG_CONTAINER="postgres-cmp"
PORT=3101
PID_FILE="$SCRIPT_DIR/.backend.pid"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
log_info()  { echo -e "${GREEN}[INFO]${NC}  $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step()  { echo -e "${BLUE}[STEP]${NC}  $1"; }

wait_for_backend() {
    local max_attempts=90
    local attempt=0
    log_step "等待 Backend 就绪 (最多 ${max_attempts}s)..."
    while [ "$attempt" -lt "$max_attempts" ]; do
        if curl -sf "http://127.0.0.1:$PORT/health" >/dev/null 2>&1; then
            log_info "Backend 已就绪 (http://localhost:$PORT)"
            return 0
        fi
        if [ -f "$PID_FILE" ] && ! kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
            log_error "Backend 进程已退出，查看日志: $SCRIPT_DIR/backend.log"
            return 1
        fi
        attempt=$((attempt + 1))
        sleep 1
    done
    log_error "Backend 启动超时，查看日志: $SCRIPT_DIR/backend.log"
    return 1
}

echo ""
echo -e "${BLUE}═══ CMP Backend 启动 ═══${NC}"
echo ""

# 1. PostgreSQL
if docker ps --format '{{.Names}}' | grep -q "^${PG_CONTAINER}$"; then
    log_info "PostgreSQL 容器已在运行"
elif docker ps -a --format '{{.Names}}' | grep -q "^${PG_CONTAINER}$"; then
    log_step "启动 PostgreSQL 容器..."
    docker start "$PG_CONTAINER"
    log_info "PostgreSQL 已启动"
else
    log_error "PostgreSQL 容器 $PG_CONTAINER 不存在"
    exit 1
fi

# 2. 检查是否已运行
if curl -sf "http://127.0.0.1:$PORT/health" >/dev/null 2>&1; then
    log_info "Backend 已在运行 (端口 $PORT)"
    exit 0
fi
if [ -f "$PID_FILE" ]; then
    rm -f "$PID_FILE"
fi

# 3. 编译
log_step "编译 Backend..."
cd "$SCRIPT_DIR"
cargo build -p cmp-backend --target-dir ./target 2>&1 | tail -3

CMP_BIN="$SCRIPT_DIR/target/debug/cmp-backend"
if [ ! -x "$CMP_BIN" ]; then
    CMP_BIN=$(ls -t "$SCRIPT_DIR/target/debug/deps"/cmp_backend-[0-9a-f]* 2>/dev/null | head -1)
fi
if [ ! -x "$CMP_BIN" ]; then
    log_error "编译产物不存在，请先执行: cd backend && cargo build"
    exit 1
fi

# 4. 启动
log_step "启动 Backend (端口 $PORT)..."
nohup "$CMP_BIN" > "$SCRIPT_DIR/backend.log" 2>&1 &
echo $! > "$PID_FILE"

if ! wait_for_backend; then
    rm -f "$PID_FILE"
    exit 1
fi

if kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
    log_info "Backend 已启动 (PID: $(cat "$PID_FILE"))"
else
    log_error "Backend 启动失败，查看日志: $SCRIPT_DIR/backend.log"
    rm -f "$PID_FILE"
    exit 1
fi

echo ""
