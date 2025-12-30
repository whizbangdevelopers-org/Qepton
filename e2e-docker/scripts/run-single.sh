#!/usr/bin/env bash
# Qepton E2E Single Test Runner
# Run a specific test file in Docker

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOCKER_DIR="$SCRIPT_DIR/.."

# Default test file
TEST_FILE="${1:-tests/e2e/auth.spec.ts}"

echo "=== Qepton E2E Single Test Runner ==="
echo "Running: $TEST_FILE"
echo ""

cd "$DOCKER_DIR"
TEST_FILE="$TEST_FILE" docker-compose --profile single up --build --abort-on-container-exit

echo ""
echo "=== Test Complete ==="
echo "View HTML report: $DOCKER_DIR/output/reports/index.html"
