#!/usr/bin/env bash
# Qepton E2E Testing Setup Script
# Verifies Docker environment and builds test container

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOCKER_DIR="$SCRIPT_DIR/.."
PROJECT_DIR="$(cd "$DOCKER_DIR/.." && pwd)"

echo "=== Qepton E2E Testing Setup ==="
echo ""

# Check Docker
echo "Checking Docker..."
if ! command -v docker &> /dev/null; then
    echo "ERROR: Docker is not installed"
    exit 1
fi
docker --version
echo ""

# Check Docker Compose
echo "Checking Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    echo "ERROR: Docker Compose is not installed"
    exit 1
fi
docker-compose --version
echo ""

# Create output directories
echo "Creating output directories..."
mkdir -p "$DOCKER_DIR/output/reports"
mkdir -p "$DOCKER_DIR/output/test-results"
mkdir -p "$DOCKER_DIR/output/logs"
echo "Created: $DOCKER_DIR/output/"
echo ""

# Build Docker image
echo "Building Docker image..."
cd "$DOCKER_DIR"
docker-compose build
echo ""

echo "=== Setup Complete ==="
echo ""
echo "Available commands:"
echo "  ./scripts/run-tests.sh           - Run all tests"
echo "  ./scripts/run-ui.sh              - Start Playwright UI mode"
echo "  ./scripts/run-single.sh <file>   - Run specific test file"
echo ""
echo "Environment variables:"
echo "  GITHUB_TEST_TOKEN - Set to run tests against real GitHub API"
echo ""
