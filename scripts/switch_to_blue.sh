#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
NGINX_DIR="${ROOT_DIR}/nginx"
LINK_PATH="${NGINX_DIR}/upstream-current.conf"

ln -snf upstream-blue.conf "${LINK_PATH}"
echo "Routing symlink updated -> BLUE."

docker compose -f "${ROOT_DIR}/compose.yml" up -d nginx
docker compose -f "${ROOT_DIR}/compose.yml" exec -T nginx nginx -t
docker compose -f "${ROOT_DIR}/compose.yml" exec -T nginx nginx -s reload

echo "Traffic switched to BLUE."
