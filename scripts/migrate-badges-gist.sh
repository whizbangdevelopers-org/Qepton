#!/usr/bin/env bash
# migrate-badges-gist.sh
#
# Recreates the test badges gist under the qepton-demos account.
# Run this AFTER creating the qepton-demos GitHub account and logging in.
#
# Prerequisites:
# 1. Create qepton-demos GitHub account
# 2. Run: gh auth login (authenticate as qepton-demos)
# 3. Run this script
#
# After running:
# 1. Update GIST_TOKEN secret in Qepton-Dev repo with qepton-demos PAT
# 2. Update TEST_BADGE_GIST_ID secret with the new gist ID printed by this script

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Qepton Badges Gist Migration ===${NC}"
echo ""

# Check gh is authenticated
CURRENT_USER=$(gh api user --jq '.login' 2>/dev/null || echo "")
if [[ -z "$CURRENT_USER" ]]; then
    echo -e "${RED}Error: Not authenticated with GitHub CLI${NC}"
    echo "Run: gh auth login"
    exit 1
fi

echo -e "Authenticated as: ${GREEN}${CURRENT_USER}${NC}"

if [[ "$CURRENT_USER" != "qepton-demos" ]]; then
    echo -e "${YELLOW}Warning: Expected to be logged in as 'qepton-demos', but logged in as '${CURRENT_USER}'${NC}"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 1
    fi
fi

# Create temporary directory for badge files
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

echo ""
echo "Creating badge files..."

# Create vitest badge JSON
cat > "$TEMP_DIR/vitest-badge.json" << 'EOF'
{
  "schemaVersion": 1,
  "label": "unit tests",
  "message": "pending",
  "color": "yellow"
}
EOF

# Create playwright badge JSON
cat > "$TEMP_DIR/playwright-badge.json" << 'EOF'
{
  "schemaVersion": 1,
  "label": "e2e tests",
  "message": "pending",
  "color": "yellow"
}
EOF

echo -e "${GREEN}✓${NC} Badge files created"

# Create the gist
echo ""
echo "Creating public gist..."

GIST_OUTPUT=$(gh gist create --public \
    -d "Qepton test badges" \
    "$TEMP_DIR/vitest-badge.json" \
    "$TEMP_DIR/playwright-badge.json" 2>&1)

# Extract gist URL and ID
GIST_URL=$(echo "$GIST_OUTPUT" | grep -oE 'https://gist.github.com/[^[:space:]]+' | head -1)
GIST_ID=$(echo "$GIST_URL" | grep -oE '[a-f0-9]{32}$')

if [[ -z "$GIST_ID" ]]; then
    echo -e "${RED}Error: Failed to create gist${NC}"
    echo "$GIST_OUTPUT"
    exit 1
fi

echo -e "${GREEN}✓${NC} Gist created successfully!"
echo ""
echo -e "${YELLOW}=== IMPORTANT: Update these secrets in Qepton-Dev ===${NC}"
echo ""
echo "New Gist URL: $GIST_URL"
echo "New Gist ID:  $GIST_ID"
echo ""
echo "1. Go to: https://github.com/whizbangdevelopers/Qepton-Dev/settings/secrets/actions"
echo ""
echo "2. Update TEST_BADGE_GIST_ID:"
echo "   - Click 'Update' on TEST_BADGE_GIST_ID"
echo "   - Set value to: $GIST_ID"
echo ""
echo "3. Update GIST_TOKEN:"
echo "   - Create a new PAT for qepton-demos at: https://github.com/settings/tokens"
echo "   - Scope: 'gist' only"
echo "   - Click 'Update' on GIST_TOKEN"
echo "   - Set value to the new PAT"
echo ""
echo "4. Verify by pushing to main branch and checking the test workflow"
echo ""
echo -e "${GREEN}=== Migration Complete ===${NC}"
