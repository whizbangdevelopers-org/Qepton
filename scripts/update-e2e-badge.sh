#!/usr/bin/env bash
# update-e2e-badge.sh - Update Playwright E2E test count badge
#
# Run this after local E2E tests to update the badge gist
# Requires: GIST_TOKEN environment variable or gh auth
#
# Usage:
#   ./scripts/update-e2e-badge.sh                    # Parse from latest report
#   ./scripts/update-e2e-badge.sh --passed 42       # Set manually

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
REPORT_DIR="$PROJECT_DIR/e2e-docker/output/reports"

# Default values
PASSED=""
FAILED=""

# Parse arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --passed)
      PASSED="$2"
      shift 2
      ;;
    --failed)
      FAILED="$2"
      shift 2
      ;;
    *)
      shift
      ;;
  esac
done

# Try to parse from Playwright JSON report if not provided
if [[ -z "$PASSED" ]]; then
  # Check both possible locations for the JSON report
  JSON_REPORT="$PROJECT_DIR/e2e-docker/output/test-results.json"
  if [[ ! -f "$JSON_REPORT" ]]; then
    JSON_REPORT="$REPORT_DIR/results.json"
  fi

  if [[ -f "$JSON_REPORT" ]]; then
    echo "Parsing results from $JSON_REPORT..."
    # Try new format first (test-results.json with stats object)
    if jq -e '.stats' "$JSON_REPORT" &>/dev/null; then
      PASSED=$(jq '.stats.expected' "$JSON_REPORT")
      FAILED=$(jq '.stats.unexpected' "$JSON_REPORT")
    else
      # Fall back to old format (suites array)
      PASSED=$(jq '[.suites[].specs[] | select(.ok == true)] | length' "$JSON_REPORT" 2>/dev/null || echo "0")
      FAILED=$(jq '[.suites[].specs[] | select(.ok == false)] | length' "$JSON_REPORT" 2>/dev/null || echo "0")
    fi
  else
    echo "No report found. Checked:"
    echo "  - $PROJECT_DIR/e2e-docker/output/test-results.json"
    echo "  - $REPORT_DIR/results.json"
    echo "Run E2E tests first or provide --passed and --failed counts"
    exit 1
  fi
fi

FAILED="${FAILED:-0}"
TOTAL=$((PASSED + FAILED))

echo "E2E Tests: $PASSED passed, $FAILED failed, $TOTAL total"

# Determine color
if [[ "$FAILED" -eq 0 ]]; then
  COLOR="brightgreen"
else
  COLOR="red"
fi

# Create badge JSON
BADGE_JSON=$(cat <<EOF
{
  "schemaVersion": 1,
  "label": "e2e tests",
  "message": "$PASSED passed",
  "color": "$COLOR"
}
EOF
)

echo "$BADGE_JSON"

# Update gist if we have authentication
GIST_ID="${TEST_BADGE_GIST_ID:-}"

if [[ -z "$GIST_ID" ]]; then
  echo ""
  echo "Note: TEST_BADGE_GIST_ID not set. Badge JSON above can be manually added to your gist."
  echo "Set TEST_BADGE_GIST_ID environment variable to auto-update."
  exit 0
fi

if command -v gh &> /dev/null && gh auth status &> /dev/null; then
  echo ""
  echo "Updating gist $GIST_ID..."
  echo "$BADGE_JSON" | gh gist edit "$GIST_ID" -f playwright-badge.json -
  echo "Badge updated!"
elif [[ -n "$GIST_TOKEN" ]]; then
  echo ""
  echo "Updating gist via API..."
  curl -s -X PATCH \
    -H "Authorization: token $GIST_TOKEN" \
    -H "Accept: application/vnd.github.v3+json" \
    "https://api.github.com/gists/$GIST_ID" \
    -d "{\"files\":{\"playwright-badge.json\":{\"content\":$(echo "$BADGE_JSON" | jq -Rs .)}}}"
  echo "Badge updated!"
else
  echo ""
  echo "No authentication available. Set GIST_TOKEN or authenticate with 'gh auth login'"
fi
