#!/usr/bin/env bash
set -euo pipefail

# ------------------------------------------------------------------------------
# Blue-Green Deployment Script
# Requirements:
#   IMAGE_repo : full Docker image repo (e.g., docker.io/biraj17/bg-deployment)
#   NEW_TAG    : tag for the new "green" version (e.g., v2)
# Optional:
#   BLUE_TAG   : current "blue" version tag (defaults to v1)
# ------------------------------------------------------------------------------

export IMAGE_repo="${IMAGE_repo:?Please set IMAGE_repo, e.g. docker.io/biraj17/bg-deployment}"
export GREEN_TAG="${NEW_TAG:?Please set NEW_TAG, e.g. v2}"
export BLUE_TAG="${BLUE_TAG:-v1}"

cd /srv/app

echo "=== [1/5] Pulling image ${IMAGE_repo}:${GREEN_TAG} ==="
docker pull "${IMAGE_repo}:${GREEN_TAG}"

echo "=== [2/5] Starting GREEN container ==="
IMAGE_repo="${IMAGE_repo}" GREEN_TAG="${GREEN_TAG}" BLUE_TAG="${BLUE_TAG}" \
  docker compose -f compose.yml up -d app-green

echo "=== [3/5] Waiting for GREEN healthcheck ==="
for i in {1..30}; do
  status=$(docker inspect -f '{{.State.Health.Status}}' app-green 2>/dev/null || echo "missing")
  echo "  → Health: $status"
  if [ "$status" = "healthy" ]; then
    echo "  GREEN is healthy."
    break
  fi
  sleep 3
done
if [ "$status" != "healthy" ]; then
  echo " GREEN failed healthcheck. Aborting switch."
  exit 1
fi

echo "=== [4/5] Switching Nginx to GREEN ==="
cd /srv/app/nginx
sudo rm -f upstream-current.conf
sudo ln -s /srv/app/nginx/upstream-green.conf upstream-current.conf
sudo nginx -t && sudo nginx -s reload

echo "=== [5/5] Draining and stopping BLUE ==="
sleep 10
docker rm -f app-blue || true
echo " Deployment complete. GREEN is live."

# Optional cleanup of dangling images
docker image prune -f >/dev/null 2>&1 || true
