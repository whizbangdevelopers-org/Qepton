#!/usr/bin/env bash
# Qepton E2E Test Runner
# Run all Playwright tests in Docker container

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
DOCKER_DIR="$SCRIPT_DIR/.."

echo "=== Qepton E2E Test Runner ==="
echo "Project: $PROJECT_DIR"
echo ""

# Build and run tests
cd "$DOCKER_DIR"
docker-compose up --build --abort-on-container-exit

# Show report location
echo ""
echo "=== Test Complete ==="
echo "View HTML report: $DOCKER_DIR/output/reports/index.html"
