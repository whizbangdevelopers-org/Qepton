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
# Note: scripts/validate-icons.sh is kept (needed by release workflow)
DEV_ONLY_PATTERNS=(
  "scripts/release-to.sh"
  ".githooks/"
  "docker-build/"
  "e2e-docker/"
  "tests/"
  "docs/"
  "flatpak/"
  "playwright.config.ts"
  "vitest.config.ts"
  "CLAUDE.md"
  "TESTING.md"
  "DEVELOPMENT.md"
  ".github/workflows/snap.yml"
  ".github/workflows/test.yml"
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
  local target_repo="$3"

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

  # Get version from package.json
  VERSION=$(node -p "require('./package.json').version" 2>/dev/null || echo "")

  # Create a clean release commit message (no AI co-author references)
  if [[ -n "$VERSION" ]]; then
    RELEASE_MSG="Release v${VERSION}"
  else
    # Fallback: use first line of commit message, stripped of any co-author info
    RELEASE_MSG=$(git log -1 --format="%s")
  fi

  # Create a temporary orphan branch (no history) for clean release
  TEMP_BRANCH="release-to-${remote}-$$"

  echo -e "${YELLOW}Creating clean release commit (no history)...${NC}"

  # Create orphan branch - this starts with no history
  git checkout --orphan "$TEMP_BRANCH" 2>/dev/null

  # Remove dev-only files from the index
  for pattern in "${DEV_ONLY_PATTERNS[@]}"; do
    MATCHED=$(git ls-files "$pattern" 2>/dev/null || true)
    if [[ -n "$MATCHED" ]]; then
      echo -e "${YELLOW}Excluding:${NC} $pattern"
      git rm -rf --cached $MATCHED >/dev/null 2>&1 || true
    fi
  done

  # Patch quasar.config.cjs to use the correct target repo for electron-builder
  if [[ -n "$target_repo" ]]; then
    echo -e "${YELLOW}Patching quasar.config.cjs for repo: $target_repo${NC}"
    sed -i "s/repo: 'Qepton-Dev'/repo: '$target_repo'/" quasar.config.cjs
    git add quasar.config.cjs
  fi

  # Create a single clean commit with no AI references
  git commit -m "$RELEASE_MSG" >/dev/null 2>&1

  echo -e "${GREEN}Created clean commit: $RELEASE_MSG${NC}"

  # Push the orphan branch to target's main (force required for history rewrite)
  echo -e "${YELLOW}Pushing to $remote/main (replacing history)...${NC}"
  if git push "$remote" "$TEMP_BRANCH:main" --force; then
    echo -e "${GREEN}✓ Successfully pushed to $name${NC}"
  else
    echo -e "${RED}✗ Failed to push to $name${NC}"
    git checkout "$CURRENT_BRANCH"
    git branch -D "$TEMP_BRANCH" 2>/dev/null || true
    exit 1
  fi

  # Clean up: go back to original branch and delete temp
  # Use --force because orphan branch removed files that exist as untracked
  git checkout "$CURRENT_BRANCH" --force
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
    push_to_target "free" "Qepton (Free)" "Qepton"
    push_tags "free"
    ;;
  premium)
    push_to_target "premium" "Qepton-Premium" "Qepton-Premium"
    push_tags "premium"
    ;;
  both)
    push_to_target "free" "Qepton (Free)" "Qepton"
    push_tags "free"
    push_to_target "premium" "Qepton-Premium" "Qepton-Premium"
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
