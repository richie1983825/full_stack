#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"
API="http://127.0.0.1:3101"
WEB="http://127.0.0.1:3100"

pass=0
fail=0

check() {
  local name="$1"
  local ok="$2"
  if [ "$ok" = "1" ]; then
    echo "✓ $name"
    pass=$((pass + 1))
  else
    echo "✗ $name"
    fail=$((fail + 1))
  fi
}

echo "=== 启动 Backend ==="
if lsof -ti :3101 >/dev/null 2>&1; then
  lsof -ti :3101 | xargs kill -9 2>/dev/null || true
fi
pkill -x cmp-backend 2>/dev/null || true
sleep 1
cd "$BACKEND"
touch src/main.rs
cargo build -p cmp-backend --target-dir ./target 2>&1 | tee /tmp/cmp-build.log | tail -3
./target/debug/cmp-backend > /tmp/cmp-e2e-backend.log 2>&1 &
BPID=$!
sleep 3
if ! kill -0 "$BPID" 2>/dev/null; then
  echo "Backend 启动失败:"
  tail -20 /tmp/cmp-e2e-backend.log
  exit 1
fi

echo "=== 启动 Frontend ==="
if lsof -ti :3100 >/dev/null 2>&1; then
  lsof -ti :3100 | xargs kill -9 2>/dev/null || true
fi
sleep 1
cd "$FRONTEND"
VITE_ENABLE_MOCK=false nohup npx vite --host --port 3100 > /tmp/cmp-e2e-frontend.log 2>&1 &
FPID=$!
sleep 4

echo "=== API 联调 ==="
HEALTH=$(curl -s -o /dev/null -w '%{http_code}' "$API/health" || true)
check "GET /health = 200" "$([ "$HEALTH" = "200" ] && echo 1 || echo 0)"

LOGIN_JSON=$(curl -s "$API/api/auth/login" -X POST -H 'Content-Type: application/json' -d '{"username":"admin","password":"admin123"}')
TOKEN=$(echo "$LOGIN_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data']['token'] if d.get('success') else '')" 2>/dev/null || true)
check "POST /api/auth/login 成功" "$([ -n "$TOKEN" ] && echo 1 || echo 0)"

LIST_CODE=$(curl -s -o /tmp/dashboards-list.json -w '%{http_code}' "$API/api/dashboards/" -H "Authorization: Bearer $TOKEN" || true)
check "GET /api/dashboards/ = 200" "$([ "$LIST_CODE" = "200" ] && echo 1 || echo 0)"

ADMIN_CODE=$(curl -s -o /dev/null -w '%{http_code}' "$API/api/admin/users" -H "Authorization: Bearer $TOKEN" || true)
check "GET /api/admin/users = 200 (路由对照)" "$([ "$ADMIN_CODE" = "200" ] && echo 1 || echo 0)"

DASH_ID=$(python3 -c "import json; d=json.load(open('/tmp/dashboards-list.json')); print(d['data'][0]['id'] if d.get('data') else '')" 2>/dev/null || true)
check "仪表盘列表非空" "$([ -n "$DASH_ID" ] && echo 1 || echo 0)"

if [ -n "$DASH_ID" ]; then
  GET_CODE=$(curl -s -o /tmp/dashboard-get.json -w '%{http_code}' "$API/api/dashboards/$DASH_ID" -H "Authorization: Bearer $TOKEN" || true)
  check "GET /api/dashboards/:id = 200" "$([ "$GET_CODE" = "200" ] && echo 1 || echo 0)"
  PANELS=$(python3 -c "import json; d=json.load(open('/tmp/dashboard-get.json')); print(len(d['data']['panels']))" 2>/dev/null || echo 0)
  check "默认仪表盘含 3 个组件" "$([ "$PANELS" = "3" ] && echo 1 || echo 0)"
fi

METRICS_CODE=$(curl -s -o /dev/null -w '%{http_code}' "$API/api/v1/ops_dbapi/api/network_metrics" -X POST -H 'Content-Type: application/json' -d '{"params":{"date":"2026-05-13"}}' || true)
check "POST network_metrics = 200" "$([ "$METRICS_CODE" = "200" ] && echo 1 || echo 0)"

PROXY_CODE=$(curl -s -o /dev/null -w '%{http_code}' "$WEB/api/auth/login" -X POST -H 'Content-Type: application/json' -d '{"username":"admin","password":"admin123"}' || true)
check "Frontend 代理 /api/auth/login = 200" "$([ "$PROXY_CODE" = "200" ] && echo 1 || echo 0)"

FE_CODE=$(curl -s -o /dev/null -w '%{http_code}' "$WEB/" || true)
check "Frontend 首页 = 200" "$([ "$FE_CODE" = "200" ] && echo 1 || echo 0)"

echo ""
echo "结果: ${pass} 通过, ${fail} 失败"
echo "Backend PID: $BPID  Frontend PID: $FPID"
echo "访问: $WEB  (admin / admin123)"

if [ "$fail" -gt 0 ]; then
  echo "--- backend log tail ---"
  tail -15 /tmp/cmp-e2e-backend.log
  exit 1
fi
