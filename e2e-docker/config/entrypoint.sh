#!/bin/bash
# E2E Test Entrypoint Script
# Starts dev server in background, waits for it, then runs Playwright tests

set -e

echo "========================================"
echo "Starting Quasar Dev Server..."
echo "========================================"

# Kill any existing process on port 9000
fuser -k 9000/tcp 2>/dev/null || true

# Start dev server in background on port 9000, redirect output to log file
npx quasar dev --port 9000 > /app/logs/dev-server.log 2>&1 &
DEV_SERVER_PID=$!

# Function to cleanup on exit
cleanup() {
  echo ""
  echo "Stopping dev server (PID: $DEV_SERVER_PID)..."
  kill $DEV_SERVER_PID 2>/dev/null || true
  wait $DEV_SERVER_PID 2>/dev/null || true
  echo "Dev server stopped."
}
trap cleanup EXIT

# Wait for dev server to be ready
echo "Waiting for dev server at http://localhost:9000..."
MAX_ATTEMPTS=60
ATTEMPT=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:9000 2>/dev/null || echo "000")
  if [ "$HTTP_CODE" = "200" ]; then
    echo "Dev server is ready!"
    break
  fi
  ATTEMPT=$((ATTEMPT + 1))
  echo "  Attempt $ATTEMPT/$MAX_ATTEMPTS - waiting... (HTTP: $HTTP_CODE)"
  sleep 2
done

if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
  echo "ERROR: Dev server failed to start after $MAX_ATTEMPTS attempts"
  echo "Dev server logs:"
  cat /app/logs/dev-server.log
  exit 1
fi

echo ""
echo "========================================"
echo "Running Playwright Tests..."
echo "========================================"

# Run tests with all passed arguments
npx playwright test "$@"
TEST_EXIT_CODE=$?

echo ""
echo "========================================"
echo "Tests completed with exit code: $TEST_EXIT_CODE"
echo "========================================"

exit $TEST_EXIT_CODE
