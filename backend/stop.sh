#!/bin/bash
#
# CMP Backend 停止脚本
# 用法: ./stop.sh
#
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PID_FILE="$SCRIPT_DIR/.backend.pid"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
log_info() { echo -e "${GREEN}[INFO]${NC}  $1"; }
log_step() { echo -e "${BLUE}[STEP]${NC}  $1"; }

stop_pid() {
    local pid="$1"
    if kill -0 "$pid" 2>/dev/null; then
        log_step "停止 Backend (PID: $pid)..."
        # 终止 cargo-watch 及其子进程 cargo run
        pkill -P "$pid" 2>/dev/null || true
        kill "$pid" 2>/dev/null || true
        sleep 1
        pkill -9 -P "$pid" 2>/dev/null || true
        kill -9 "$pid" 2>/dev/null || true
        log_info "Backend 已停止"
        return 0
    fi
    return 1
}

echo ""
echo -e "${BLUE}═══ CMP Backend 停止 ═══${NC}"
echo ""

stopped=false
if [ -f "$PID_FILE" ]; then
    pid=$(cat "$PID_FILE")
    if stop_pid "$pid"; then
        stopped=true
    else
        log_info "Backend 进程已退出"
    fi
    rm -f "$PID_FILE"
fi

if [ "$stopped" = false ]; then
    if pkill -f "$SCRIPT_DIR/target/debug/cmp-backend" 2>/dev/null; then
        log_info "Backend 已停止（按二进制名）"
    elif pkill -f "cargo-watch" 2>/dev/null || pkill -f "cargo watch" 2>/dev/null; then
        log_info "Backend 已停止（cargo-watch）"
    else
        log_info "Backend 未运行"
    fi
fi

echo ""
