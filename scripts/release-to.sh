#!/usr/bin/env bash
# release-to.sh - Push tested changes from Dev to Free or Premium
#
# Usage:
#   ./scripts/release-to.sh free      # Push to Qepton (free)
#   ./scripts/release-to.sh premium   # Push to Qepton-Premium
#   ./scripts/release-to.sh both      # Push to both

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

TARGET="$1"

if [[ -z "$TARGET" ]]; then
  echo -e "${CYAN}Usage:${NC} $0 <free|premium|both>"
  echo ""
  echo "Push tested changes from Qepton-Dev to release repos."
  echo ""
  echo "Targets:"
  echo "  free     Push to Qepton (free version)"
  echo "  premium  Push to Qepton-Premium"
  echo "  both     Push to both repos"
  exit 1
fi

# Ensure we're in the Dev repo
if [[ ! -f "package.json" ]] || ! grep -q '"name": "qepton"' package.json 2>/dev/null; then
  echo -e "${RED}Error: Run this script from the Qepton-Dev root directory${NC}"
  exit 1
fi

# Check for uncommitted changes
if [[ -n $(git status --porcelain) ]]; then
  echo -e "${RED}Error: You have uncommitted changes. Commit or stash them first.${NC}"
  git status --short
  exit 1
fi

# Verify remotes exist
verify_remote() {
  local remote="$1"
  if ! git remote get-url "$remote" &>/dev/null; then
    echo -e "${RED}Error: Remote '$remote' not configured.${NC}"
    echo "Run: git remote add $remote <url>"
    exit 1
  fi
}

push_to_target() {
  local remote="$1"
  local name="$2"

  echo -e "${CYAN}========================================${NC}"
  echo -e "${CYAN}Pushing to $name ($remote)${NC}"
  echo -e "${CYAN}========================================${NC}"

  verify_remote "$remote"

  # Fetch latest from target
  echo -e "${YELLOW}Fetching from $remote...${NC}"
  git fetch "$remote" main 2>/dev/null || git fetch "$remote" master 2>/dev/null || true

  # Get current branch
  CURRENT_BRANCH=$(git branch --show-current)

  # Push current branch to target's main
  echo -e "${YELLOW}Pushing $CURRENT_BRANCH to $remote/main...${NC}"
  git push "$remote" "$CURRENT_BRANCH:main"

  echo -e "${GREEN}✓ Successfully pushed to $name${NC}"
  echo ""
}

case "$TARGET" in
  free)
    push_to_target "free" "Qepton (Free)"
    ;;
  premium)
    push_to_target "premium" "Qepton-Premium"
    ;;
  both)
    push_to_target "free" "Qepton (Free)"
    push_to_target "premium" "Qepton-Premium"
    ;;
  *)
    echo -e "${RED}Unknown target: $TARGET${NC}"
    echo "Use: free, premium, or both"
    exit 1
    ;;
esac

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Release complete!${NC}"
echo -e "${GREEN}========================================${NC}"
