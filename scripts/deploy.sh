#!/bin/bash
# CMP 生产部署脚本
# 用法: ./scripts/deploy.sh [up|down|restart]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

GREEN='\033[0;32m'; RED='\033[0;31m'; BLUE='\033[0;34m'; NC='\033[0m'
log() { echo -e "${GREEN}[DEPLOY]${NC} $1"; }
warn() { echo -e "${RED}[WARN]${NC} $1"; }

MODE="${1:-up}"

cd "${ROOT_DIR}"

# 检查 .env 文件
if [ ! -f .env ]; then
  warn ".env file not found, creating from defaults"
  cat > .env <<EOF
DB_PASSWORD=postgres123
JWT_SECRET=change-me-in-production
DEEPSEEK_API_KEY=
DEEPSEEK_API_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
PUBLIC_BASE_URL=http://localhost
BACKEND_IMAGE=cmp-backend:latest
FRONTEND_IMAGE=cmp-frontend:latest
EOF
  warn "Please edit .env with production secrets"
fi

case "${MODE}" in
  up)
    log "Starting CMP services..."
    docker compose up -d --wait
    log "Services started:"
    log "  Frontend → http://localhost"
    log "  Backend  → http://localhost:3101"
    log "  Database → postgresql://localhost:5432/cmp_service"
    ;;
  down)
    log "Stopping CMP services..."
    docker compose down
    log "Services stopped"
    ;;
  restart)
    log "Restarting CMP services..."
    docker compose down
    docker compose up -d --wait
    log "Services restarted"
    ;;
  logs)
    docker compose logs -f
    ;;
  *)
    echo "Usage: $0 [up|down|restart|logs]"
    exit 1
    ;;
esac
