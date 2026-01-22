#!/usr/bin/env bash
# sync-issues.sh - Rebuild issue mapping from existing Dev issues
#
# This script parses "Free #X:" prefixes from Dev issue titles
# and rebuilds the .github/issue-mapping.json file.
#
# Usage:
#   ./scripts/sync-issues.sh           # Rebuild mapping
#   ./scripts/sync-issues.sh --dry-run # Show what would be written

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
MAPPING_FILE="$REPO_ROOT/.github/issue-mapping.json"

DRY_RUN=false
if [[ "$1" == "--dry-run" ]]; then
  DRY_RUN=true
fi

echo "Fetching issues from Qepton-Dev..."

# Get all issues with "Free #" in title
ISSUES=$(gh issue list \
  --repo whizbangdevelopers/Qepton-Dev \
  --state all \
  --limit 100 \
  --json number,title \
  | jq -r '.[] | select(.title | test("^Free #[0-9]+:")) | "\(.number)|\(.title)"')

# Build mapping arrays
declare -A dev_to_free
declare -A free_to_dev

while IFS='|' read -r dev_num title; do
  # Extract Free issue number from "Free #X:" prefix
  if [[ "$title" =~ ^Free\ #([0-9]+): ]]; then
    free_num="${BASH_REMATCH[1]}"
    dev_to_free[$dev_num]=$free_num
    free_to_dev[$free_num]=$dev_num
    echo "  Dev #$dev_num -> Free #$free_num"
  fi
done <<< "$ISSUES"

echo ""
echo "Found ${#dev_to_free[@]} mapped issues"

# Generate JSON
generate_json() {
  echo "{"
  echo '  "_comment": "Bidirectional issue mapping between Qepton-Dev and Qepton (Free)",'

  # dev-to-free
  echo '  "dev-to-free": {'
  local first=true
  for key in $(echo "${!dev_to_free[@]}" | tr ' ' '\n' | sort -n); do
    if [ "$first" = true ]; then
      first=false
    else
      echo ","
    fi
    printf '    "%s": "%s"' "$key" "${dev_to_free[$key]}"
  done
  echo ""
  echo "  },"

  # free-to-dev
  echo '  "free-to-dev": {'
  first=true
  for key in $(echo "${!free_to_dev[@]}" | tr ' ' '\n' | sort -n); do
    if [ "$first" = true ]; then
      first=false
    else
      echo ","
    fi
    printf '    "%s": "%s"' "$key" "${free_to_dev[$key]}"
  done
  echo ""
  echo "  }"

  echo "}"
}

if [ "$DRY_RUN" = true ]; then
  echo ""
  echo "Would write to $MAPPING_FILE:"
  echo "----------------------------------------"
  generate_json
else
  echo ""
  echo "Writing to $MAPPING_FILE..."
  generate_json > "$MAPPING_FILE"
  echo "Done!"
fi
