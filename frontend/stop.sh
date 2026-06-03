#!/bin/bash
#
# CMP Frontend 停止脚本
# 用法: ./stop.sh
#
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PID_FILE="$SCRIPT_DIR/.frontend.pid"

RED='\033[0;31m'; GREEN='\033[0;32m'; BLUE='\033[0;34m'; NC='\033[0m'
log_info() { echo -e "${GREEN}[INFO]${NC}  $1"; }
log_step() { echo -e "${BLUE}[STEP]${NC}  $1"; }

echo ""
echo -e "${BLUE}═══ CMP Frontend 停止 ═══${NC}"
echo ""

if [ -f "$PID_FILE" ]; then
    pid=$(cat "$PID_FILE")
    if kill -0 "$pid" 2>/dev/null; then
        log_step "停止 Frontend (PID: $pid)..."
        kill "$pid" 2>/dev/null
        sleep 1
        kill -9 "$pid" 2>/dev/null || true
        log_info "Frontend 已停止"
    else
        log_info "Frontend 进程已退出"
    fi
    rm -f "$PID_FILE"
else
    pkill -f "vite" 2>/dev/null && log_info "Frontend 已停止（按名称）" || log_info "Frontend 未运行"
fi

echo ""
