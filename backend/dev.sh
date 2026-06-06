#!/bin/bash
#
# CMP Backend 开发模式：cargo-watch 监听源码变更并自动重启
# 用法:
#   ./dev.sh          前台运行（推荐，终端直接看编译/运行日志）
#   ./dev.sh --bg     后台运行（写入 backend.log，供一键启动脚本使用）
#
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PG_CONTAINER="postgres-cmp"
PORT=3101
PID_FILE="$SCRIPT_DIR/.backend.pid"
LOG_FILE="$SCRIPT_DIR/backend.log"
HEALTH_URL="http://127.0.0.1:$PORT/health"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
log_info()  { echo -e "${GREEN}[INFO]${NC}  $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step()  { echo -e "${BLUE}[STEP]${NC}  $1"; }

BACKGROUND=false
if [ "${1:-}" = "--bg" ]; then
    BACKGROUND=true
fi

ensure_cargo_watch() {
    if command -v cargo-watch >/dev/null 2>&1; then
        return 0
    fi
    log_step "未检测到 cargo-watch，正在安装（首次约 1–2 分钟）..."
    cargo install cargo-watch
    log_info "cargo-watch 安装完成"
}

health_check() {
    curl -sf --max-time 2 "$HEALTH_URL" >/dev/null 2>&1
}

wait_for_backend() {
    local pid="${1:-}"
    local max_attempts=120
    local attempt=0
    log_step "等待 Backend 响应 $HEALTH_URL..."
    while [ "$attempt" -lt "$max_attempts" ]; do
        if health_check; then
            return 0
        fi
        if [ "$BACKGROUND" = true ] && [ -n "$pid" ] && ! kill -0 "$pid" 2>/dev/null; then
            log_error "cargo-watch 进程已退出，查看日志: $LOG_FILE"
            return 1
        fi
        attempt=$((attempt + 1))
        sleep 1
    done
    log_error "Backend 启动超时，查看日志: $LOG_FILE"
    return 1
}

stop_existing_backend() {
    if [ -f "$PID_FILE" ]; then
        local pid
        pid=$(cat "$PID_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            log_step "停止已有 Backend (PID: $pid)..."
            kill "$pid" 2>/dev/null || true
            sleep 1
            kill -9 "$pid" 2>/dev/null || true
        fi
        rm -f "$PID_FILE"
    fi
    pkill -f "$SCRIPT_DIR/target/debug/cmp-backend" 2>/dev/null || true
    pkill -f "cargo-watch" 2>/dev/null || true
    pkill -f "cargo watch" 2>/dev/null || true
}

echo ""
echo -e "${BLUE}═══ CMP Backend 开发模式 (cargo-watch) ═══${NC}"
echo ""

# PostgreSQL
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

if curl -sf "http://127.0.0.1:$PORT/health" >/dev/null 2>&1 && [ "$BACKGROUND" = false ]; then
    log_warn "Backend 已在运行 (http://localhost:$PORT)"
    log_info "如需热重启开发，请先执行: ./stop.sh"
    exit 0
fi

stop_existing_backend
ensure_cargo_watch

cd "$SCRIPT_DIR"

if [ "$BACKGROUND" = true ]; then
    log_step "后台启动 cargo-watch (端口 $PORT，日志: $LOG_FILE)..."
    nohup cargo watch \
        --quiet \
        --watch src \
        --watch Cargo.toml \
        --watch .env \
        --exec run \
        > "$LOG_FILE" 2>&1 &
    echo $! > "$PID_FILE"
    if ! wait_for_backend "$(cat "$PID_FILE")"; then
        rm -f "$PID_FILE"
        exit 1
    fi
    log_info "Backend 开发模式已启动 (PID: $(cat "$PID_FILE"))"
    log_info "修改 backend/src 下 Rust 文件将自动重新编译并重启"
    log_info "日志: tail -f $LOG_FILE"
else
    log_info "前台启动 cargo-watch，Ctrl+C 停止"
    log_info "监听: src/ · Cargo.toml · .env"
    echo ""
    exec cargo watch \
        --quiet \
        --clear \
        --watch src \
        --watch Cargo.toml \
        --watch .env \
        --exec run
fi

echo ""
