#!/usr/bin/env bash
# Qepton E2E Test UI Runner
# Run Playwright in interactive UI mode

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOCKER_DIR="$SCRIPT_DIR/.."

echo "=== Qepton E2E Test UI Mode ==="
echo "Starting Playwright UI on http://localhost:9323"
echo ""

cd "$DOCKER_DIR"
docker-compose --profile ui up --build

echo ""
echo "UI mode stopped."
