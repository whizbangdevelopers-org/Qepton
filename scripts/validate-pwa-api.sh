#!/usr/bin/env bash
# validate-pwa-api.sh - Verify PWA build doesn't use dev-only proxy endpoints
#
# The /api/github proxy only exists in the dev server. Production PWA builds
# must use direct https://api.github.com calls. This script catches regressions
# that would break PWA login.
#
# Usage: ./scripts/validate-pwa-api.sh [build-dir]

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BUILD_DIR="${1:-$PROJECT_ROOT/dist/pwa}"

echo "========================================="
echo "  PWA API Endpoint Validation"
echo "========================================="
echo ""

# Check if build exists
if [ ! -d "$BUILD_DIR" ]; then
  echo -e "${YELLOW}No PWA build found at $BUILD_DIR${NC}"
  echo "Run 'npm run build:pwa' first, or pass build directory as argument"
  exit 0
fi

echo "Checking: $BUILD_DIR"
echo ""

ERRORS=0

# Check 1: Look for hardcoded /api/github proxy references in JS bundles
echo -n "Checking for proxy references in JS bundles... "
JS_FILES=$(find "$BUILD_DIR" -name "*.js" -type f 2>/dev/null || true)

if [ -z "$JS_FILES" ]; then
  echo -e "${YELLOW}No JS files found${NC}"
else
  # Look for '/api/github' that isn't in a comment or debug context
  # This pattern catches: baseURL = '/api/github' or fetch('/api/github/...')
  PROXY_REFS=$(grep -l "'/api/github'" $JS_FILES 2>/dev/null || true)

  if [ -n "$PROXY_REFS" ]; then
    # Double check - is it actually used as an API endpoint or just in a comment/conditional?
    # Look for patterns that indicate it's being used unconditionally
    for file in $PROXY_REFS; do
      # Check if the file has the proxy path without the port 9000 check
      if grep -q "'/api/github'" "$file" && ! grep -q "port.*9000" "$file" && ! grep -q "location\.port" "$file"; then
        echo -e "${RED}FAILED${NC}"
        echo ""
        echo -e "${RED}ERROR: Found unconditional /api/github proxy reference:${NC}"
        echo "  File: $file"
        echo ""
        echo "The /api/github proxy only works in dev server mode."
        echo "Production PWA must use https://api.github.com directly."
        echo ""
        grep -n "'/api/github'" "$file" | head -5
        ERRORS=$((ERRORS + 1))
      fi
    done

    if [ $ERRORS -eq 0 ]; then
      echo -e "${GREEN}OK${NC} (proxy refs are conditional)"
    fi
  else
    echo -e "${GREEN}OK${NC}"
  fi
fi

# Check 2: Verify https://api.github.com is present (should be the production endpoint)
echo -n "Checking for direct GitHub API references... "
DIRECT_API=$(grep -l "api\.github\.com" $JS_FILES 2>/dev/null | head -1 || true)

if [ -n "$DIRECT_API" ]; then
  echo -e "${GREEN}OK${NC}"
else
  echo -e "${RED}FAILED${NC}"
  echo ""
  echo -e "${RED}ERROR: No direct GitHub API references found${NC}"
  echo "PWA should use https://api.github.com for production."
  ERRORS=$((ERRORS + 1))
fi

# Check 3: Look for port 9000 detection (ensures proper conditional logic)
echo -n "Checking for dev server detection logic... "
PORT_CHECK=$(grep -l "9000\|location\.port" $JS_FILES 2>/dev/null | head -1 || true)

if [ -n "$PORT_CHECK" ]; then
  echo -e "${GREEN}OK${NC} (dev server detection present)"
else
  echo -e "${YELLOW}WARNING${NC} (no explicit port check - may be OK if using different detection)"
fi

echo ""

# Summary
if [ $ERRORS -gt 0 ]; then
  echo -e "${RED}=========================================${NC}"
  echo -e "${RED}  VALIDATION FAILED: $ERRORS error(s)${NC}"
  echo -e "${RED}=========================================${NC}"
  echo ""
  echo "The PWA build has API configuration issues that will"
  echo "cause login to fail in production. Please fix before release."
  exit 1
else
  echo -e "${GREEN}=========================================${NC}"
  echo -e "${GREEN}  VALIDATION PASSED${NC}"
  echo -e "${GREEN}=========================================${NC}"
  echo ""
  echo "PWA API endpoints are correctly configured for production."
fi
