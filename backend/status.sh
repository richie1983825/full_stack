#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PORT=3101
PID_FILE="$SCRIPT_DIR/.backend.pid"
HEALTH_URL="http://127.0.0.1:$PORT/health"

listener_pid="$(lsof -ti "tcp:$PORT" -sTCP:LISTEN 2>/dev/null | head -1)"
saved_pid=""
[ -f "$PID_FILE" ] && saved_pid="$(cat "$PID_FILE")"

if curl -sf --max-time 2 "$HEALTH_URL" >/dev/null 2>&1; then
    echo "OK  $HEALTH_URL"
    echo "    listener PID: ${listener_pid:-unknown}"
    echo "    pid file:     ${saved_pid:-none}"
    exit 0
fi

echo "DOWN $HEALTH_URL"
echo "    listener PID: ${listener_pid:-none}"
echo "    pid file:     ${saved_pid:-none}"
if [ -n "$saved_pid" ] && ! kill -0 "$saved_pid" 2>/dev/null; then
    echo "    note:         pid 文件中进程已退出，查看 backend.log 排查原因"
fi
echo "    fix:          cd backend && ./start.sh"
exit 1
