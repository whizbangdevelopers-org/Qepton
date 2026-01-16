#!/usr/bin/env bash
# release-to.sh - Push tested changes from Dev to Free or Premium
#
# This script creates a filtered commit that excludes dev-only files,
# then pushes to the target repo.
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

# Dev-only files/folders to exclude when pushing to release repos
DEV_ONLY_PATTERNS=(
  "scripts/"
  ".githooks/"
  "docker-build/"
  "e2e-docker/"
  "tests/"
  "docs/"
  "flatpak/"
  "playwright.config.ts"
  "CLAUDE.md"
  "TESTING.md"
  "DEVELOPMENT.md"
)

if [[ -z "$TARGET" ]]; then
  echo -e "${CYAN}Usage:${NC} $0 <free|premium|both>"
  echo ""
  echo "Push tested changes from Qepton-Dev to release repos."
  echo "Dev-only files are automatically excluded."
  echo ""
  echo "Targets:"
  echo "  free     Push to Qepton (free version)"
  echo "  premium  Push to Qepton-Premium"
  echo "  both     Push to both repos"
  echo ""
  echo "Excluded files:"
  for pattern in "${DEV_ONLY_PATTERNS[@]}"; do
    echo "  - $pattern"
  done
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

  # Get current branch and commit info
  CURRENT_BRANCH=$(git branch --show-current)
  CURRENT_COMMIT=$(git rev-parse HEAD)
  COMMIT_MSG=$(git log -1 --format="%s")

  # Create a temporary branch for the filtered push
  TEMP_BRANCH="release-to-${remote}-$$"

  echo -e "${YELLOW}Creating filtered commit (excluding dev-only files)...${NC}"

  # Start from current HEAD
  git checkout -b "$TEMP_BRANCH" 2>/dev/null

  # Check if any dev-only files are tracked and remove them from this branch
  FILES_TO_REMOVE=""
  for pattern in "${DEV_ONLY_PATTERNS[@]}"; do
    # Find tracked files matching this pattern
    MATCHED=$(git ls-files "$pattern" 2>/dev/null || true)
    if [[ -n "$MATCHED" ]]; then
      FILES_TO_REMOVE="$FILES_TO_REMOVE $MATCHED"
    fi
  done

  if [[ -n "$FILES_TO_REMOVE" ]]; then
    echo -e "${YELLOW}Removing dev-only files from release commit:${NC}"
    for f in $FILES_TO_REMOVE; do
      echo "  - $f"
    done

    # Remove files and amend commit
    git rm -rf --cached $FILES_TO_REMOVE >/dev/null 2>&1 || true
    git commit --amend -m "$COMMIT_MSG" --no-edit >/dev/null 2>&1 || true
  else
    echo -e "${GREEN}No dev-only files to remove${NC}"
  fi

  # Push the filtered branch to target's main
  echo -e "${YELLOW}Pushing to $remote/main...${NC}"
  if git push "$remote" "$TEMP_BRANCH:main" --force-with-lease; then
    echo -e "${GREEN}✓ Successfully pushed to $name${NC}"
  else
    echo -e "${RED}✗ Failed to push to $name${NC}"
    git checkout "$CURRENT_BRANCH"
    git branch -D "$TEMP_BRANCH" 2>/dev/null || true
    exit 1
  fi

  # Clean up: go back to original branch and delete temp
  git checkout "$CURRENT_BRANCH"
  git branch -D "$TEMP_BRANCH" 2>/dev/null || true

  echo ""
}

# Also push tags if they exist for current commit
push_tags() {
  local remote="$1"

  # Find tags pointing to HEAD
  TAGS=$(git tag --points-at HEAD 2>/dev/null || true)

  if [[ -n "$TAGS" ]]; then
    echo -e "${YELLOW}Pushing tags to $remote:${NC}"
    for tag in $TAGS; do
      echo "  - $tag"
      git push "$remote" "$tag" 2>/dev/null || echo "    (tag may already exist)"
    done
  fi
}

case "$TARGET" in
  free)
    push_to_target "free" "Qepton (Free)"
    push_tags "free"
    ;;
  premium)
    push_to_target "premium" "Qepton-Premium"
    push_tags "premium"
    ;;
  both)
    push_to_target "free" "Qepton (Free)"
    push_tags "free"
    push_to_target "premium" "Qepton-Premium"
    push_tags "premium"
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
