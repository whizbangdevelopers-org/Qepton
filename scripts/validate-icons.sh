#!/usr/bin/env bash
# validate-icons.sh - Pre-release icon validation for Qepton
# Run this before building releases to catch icon issues early

set -e

# Anchored on this script, never on the caller's cwd: the pre-commit hook runs it from the repo
# root, where src-electron/icons does not exist. The config is quasar.config.js since app-vite 3
# (2026-08-17); this read quasar.config.cjs until 2026-11-08.
#
# Counters use x=$((x + 1)), never ((x++)): ((x++)) evaluates to the OLD value, so the first
# increment from 0 returns status 1 and `set -e` ended the script at the first finding, with no
# summary, from either directory (measured 2026-11-08).
PKG="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ICONS_DIR="$PKG/src-electron/icons"
CONFIG_FILE="$PKG/quasar.config.js"
REQUIRED_SIZES=(16 32 48 64 128 256 512)

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

errors=0
warnings=0

echo "========================================"
echo "  Qepton Icon Validation"
echo "========================================"
echo ""

# ----------------------------------------
# Check icon files exist
# ----------------------------------------
echo "Checking icon files..."

for size in "${REQUIRED_SIZES[@]}"; do
  file="$ICONS_DIR/${size}x${size}.png"
  if [[ -f "$file" ]]; then
    echo -e "  ${GREEN}✓${NC} ${size}x${size}.png"
  else
    echo -e "  ${RED}✗${NC} Missing: ${size}x${size}.png"
    errors=$((errors + 1))
  fi
done

# Check platform-specific icons
for icon in "icon.icns" "icon.ico" "icon.png"; do
  if [[ -f "$ICONS_DIR/$icon" ]]; then
    echo -e "  ${GREEN}✓${NC} $icon"
  else
    echo -e "  ${RED}✗${NC} Missing: $icon"
    errors=$((errors + 1))
  fi
done

echo ""

# ----------------------------------------
# Validate quasar.config.js settings
# ----------------------------------------
echo "Checking quasar.config.js..."

# A config that cannot be read is an error. Every check below greps it with 2>/dev/null, so a
# missing file used to surface only as a list of unrelated-looking failures and one "?".
if [[ ! -r "$CONFIG_FILE" ]]; then
  echo -e "  ${RED}✗${NC} Cannot read $CONFIG_FILE"
  errors=$((errors + 1))
fi

# linux.icon should be directory (not single file)
if grep -q "icon: 'src-electron/icons'" "$CONFIG_FILE" 2>/dev/null; then
  echo -e "  ${GREEN}✓${NC} linux.icon is directory"
else
  if grep -q "icon: 'src-electron/icons/icon.png'" "$CONFIG_FILE" 2>/dev/null; then
    echo -e "  ${RED}✗${NC} linux.icon should be directory, not single file"
    echo "      Change: icon: 'src-electron/icons/icon.png'"
    echo "      To:     icon: 'src-electron/icons'"
    errors=$((errors + 1))
  else
    echo -e "  ${YELLOW}?${NC} Could not verify linux.icon setting"
    warnings=$((warnings + 1))
  fi
fi

# desktop.Icon field
if grep -q "Icon: 'qepton'" "$CONFIG_FILE" 2>/dev/null; then
  echo -e "  ${GREEN}✓${NC} desktop.Icon field present"
else
  echo -e "  ${RED}✗${NC} desktop.Icon field missing (should be 'qepton')"
  errors=$((errors + 1))
fi

# executableName
if grep -q "executableName: 'qepton'" "$CONFIG_FILE" 2>/dev/null; then
  echo -e "  ${GREEN}✓${NC} executableName set"
else
  echo -e "  ${RED}✗${NC} executableName missing or incorrect"
  errors=$((errors + 1))
fi

# StartupWMClass
if grep -q "StartupWMClass:" "$CONFIG_FILE" 2>/dev/null; then
  echo -e "  ${GREEN}✓${NC} StartupWMClass present"
else
  echo -e "  ${RED}✗${NC} StartupWMClass missing"
  errors=$((errors + 1))
fi

echo ""

# ----------------------------------------
# Check icon dimensions (requires ImageMagick)
# ----------------------------------------
if command -v identify &> /dev/null; then
  echo "Verifying icon dimensions..."

  for size in "${REQUIRED_SIZES[@]}"; do
    file="$ICONS_DIR/${size}x${size}.png"
    if [[ -f "$file" ]]; then
      actual=$(identify -format "%wx%h" "$file" 2>/dev/null)
      expected="${size}x${size}"
      if [[ "$actual" == "$expected" ]]; then
        echo -e "  ${GREEN}✓${NC} ${size}x${size}.png is ${actual}"
      else
        echo -e "  ${RED}✗${NC} ${size}x${size}.png is ${actual} (should be ${expected})"
        errors=$((errors + 1))
      fi
    fi
  done
  echo ""
else
  echo -e "${YELLOW}Note: Install ImageMagick for dimension validation${NC}"
  echo ""
fi

# ----------------------------------------
# Summary
# ----------------------------------------
echo "========================================"
if [[ $errors -eq 0 ]]; then
  echo -e "  ${GREEN}All checks passed!${NC}"
  if [[ $warnings -gt 0 ]]; then
    echo -e "  ${YELLOW}$warnings warning(s)${NC}"
  fi
  echo "========================================"
  exit 0
else
  echo -e "  ${RED}$errors error(s) found${NC}"
  if [[ $warnings -gt 0 ]]; then
    echo -e "  ${YELLOW}$warnings warning(s)${NC}"
  fi
  echo "========================================"
  echo ""
  echo "Fix the errors above before releasing."
  exit 1
fi
