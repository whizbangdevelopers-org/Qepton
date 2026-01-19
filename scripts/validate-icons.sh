#!/usr/bin/env bash
# validate-icons.sh - Pre-release icon validation for Qepton
# Run this before building releases to catch icon issues early

set -e

ICONS_DIR="src-electron/icons"
CONFIG_FILE="quasar.config.cjs"
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
    ((errors++))
  fi
done

# Check platform-specific icons
for icon in "icon.icns" "icon.ico" "icon.png"; do
  if [[ -f "$ICONS_DIR/$icon" ]]; then
    echo -e "  ${GREEN}✓${NC} $icon"
  else
    echo -e "  ${RED}✗${NC} Missing: $icon"
    ((errors++))
  fi
done

echo ""

# ----------------------------------------
# Validate quasar.config.cjs settings
# ----------------------------------------
echo "Checking quasar.config.cjs..."

# linux.icon should be directory (not single file)
if grep -q "icon: 'src-electron/icons'" "$CONFIG_FILE" 2>/dev/null; then
  echo -e "  ${GREEN}✓${NC} linux.icon is directory"
else
  if grep -q "icon: 'src-electron/icons/icon.png'" "$CONFIG_FILE" 2>/dev/null; then
    echo -e "  ${RED}✗${NC} linux.icon should be directory, not single file"
    echo "      Change: icon: 'src-electron/icons/icon.png'"
    echo "      To:     icon: 'src-electron/icons'"
    ((errors++))
  else
    echo -e "  ${YELLOW}?${NC} Could not verify linux.icon setting"
    ((warnings++))
  fi
fi

# desktop.Icon field
if grep -q "Icon: 'qepton'" "$CONFIG_FILE" 2>/dev/null; then
  echo -e "  ${GREEN}✓${NC} desktop.Icon field present"
else
  echo -e "  ${RED}✗${NC} desktop.Icon field missing (should be 'qepton')"
  ((errors++))
fi

# executableName
if grep -q "executableName: 'qepton'" "$CONFIG_FILE" 2>/dev/null; then
  echo -e "  ${GREEN}✓${NC} executableName set"
else
  echo -e "  ${RED}✗${NC} executableName missing or incorrect"
  ((errors++))
fi

# StartupWMClass
if grep -q "StartupWMClass:" "$CONFIG_FILE" 2>/dev/null; then
  echo -e "  ${GREEN}✓${NC} StartupWMClass present"
else
  echo -e "  ${RED}✗${NC} StartupWMClass missing"
  ((errors++))
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
        ((errors++))
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
