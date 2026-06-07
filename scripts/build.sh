#!/bin/bash
# CMP 生产镜像构建脚本
# 用法: ./scripts/build.sh [backend|frontend|all]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

RED='\033[0;31m'; GREEN='\033[0;32m'; BLUE='\033[0;34m'; NC='\033[0m'
log() { echo -e "${GREEN}[BUILD]${NC} $1"; }
err() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

TAG="${TAG:-latest}"
REGISTRY="${REGISTRY:-}"
MODE="${1:-all}"

build_backend() {
  local image="cmp-backend:${TAG}"
  log "Building backend image: ${image}"
  docker build -t "${image}" "${ROOT_DIR}/backend"
  if [ -n "${REGISTRY}" ]; then
    local remote="${REGISTRY}/${image}"
    docker tag "${image}" "${remote}"
    docker push "${remote}"
    log "Pushed ${remote}"
  fi
  log "Backend image built: ${image}"
}

build_frontend() {
  local image="cmp-frontend:${TAG}"
  log "Building frontend image: ${image}"
  docker build -t "${image}" "${ROOT_DIR}/frontend"
  if [ -n "${REGISTRY}" ]; then
    local remote="${REGISTRY}/${image}"
    docker tag "${image}" "${remote}"
    docker push "${remote}"
    log "Pushed ${remote}"
  fi
  log "Frontend image built: ${image}"
}

case "${MODE}" in
  backend)  build_backend ;;
  frontend) build_frontend ;;
  all)
    build_backend
    build_frontend
    ;;
  *) err "Unknown target: ${MODE}. Use backend|frontend|all" ;;
esac

log "Done."
