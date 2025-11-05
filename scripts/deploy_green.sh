#!/usr/bin/env bash
set -euo pipefail

# Required env:
#   IMAGE_REPO (e.g., docker.io/BIRAJ49/bg-deplyment)
#   GREEN_TAG  (new image tag)
: "${IMAGE_REPO:?set IMAGE_REPO}"
: "${GREEN_TAG:?set GREEN_TAG}"

echo " pulling ${IMAGE_REPO}:${GREEN_TAG}"
docker pull "${IMAGE_REPO}:${GREEN_TAG}" || true

echo " starting/refreshing app-green"
IMAGE_REPO="$IMAGE_REPO" GREEN_TAG="$GREEN_TAG" docker compose up -d app-green

echo "⏳ waiting for green health..."
for i in {1..30}; do
  status=$(docker inspect -f '{{.State.Health.Status}}' app-green 2>/dev/null || echo "missing")
  echo "  green: $status"
  [ "$status" = "healthy" ] && break
  sleep 3
done
[ "$status" = "healthy" ] || { echo " green not healthy"; exit 1; }

./scripts/switch_to_green.sh

# optional: stop old blue to free resources
sleep 8
docker rm -f app-blue || true
echo "🎉 green live"
