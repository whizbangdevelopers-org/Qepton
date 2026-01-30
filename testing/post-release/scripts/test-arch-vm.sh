#!/usr/bin/env bash
# test-arch-vm.sh - Test pacman package on Arch Linux VM
#
# Prerequisites:
#   - Arch Linux VM running with SSH enabled
#   - SSH key authentication configured
#   - See docs/ARCHLINUX-VM-SETUP.md for VM setup
#
# Usage:
#   ./scripts/test-arch-vm.sh <vm-ip-or-hostname> <version>
#   ./scripts/test-arch-vm.sh 192.168.122.101 1.0.12

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

VM_HOST="${1:-}"
VERSION="${2:-}"

if [ -z "$VM_HOST" ] || [ -z "$VERSION" ]; then
    echo "Usage: $0 <vm-host> <version>"
    echo ""
    echo "Examples:"
    echo "  $0 192.168.122.101 1.0.12"
    echo "  $0 arch-test 1.0.12"
    exit 1
fi

SSH_OPTS="-o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new"
SSH_USER="${SSH_USER:-testuser}"

log() { echo -e "${BLUE}[$(date +%H:%M:%S)]${NC} $1"; }
success() { echo -e "${GREEN}✓${NC} $1"; }
fail() { echo -e "${RED}✗${NC} $1"; }
warn() { echo -e "${YELLOW}!${NC} $1"; }

echo ""
echo "========================================="
echo "  Arch Linux Pacman Package Testing"
echo "  Version: ${VERSION}"
echo "  VM: ${VM_HOST}"
echo "========================================="
echo ""

# Test SSH
log "Testing SSH connection..."
if ! ssh $SSH_OPTS "${SSH_USER}@${VM_HOST}" "echo 'SSH OK'" 2>/dev/null; then
    fail "Cannot connect to ${VM_HOST}"
    exit 1
fi
success "SSH connection OK"

# Find or download pacman package
PACMAN_FILE=""
PACMAN_NAME="qepton-${VERSION}-1-x86_64.pkg.tar.zst"

# Check local builds
for path in \
    "${PROJECT_ROOT}/dist/electron/Packaged/${PACMAN_NAME}" \
    "${PROJECT_ROOT}/dist/electron/Packaged/"*.pacman \
    "${PROJECT_ROOT}/pacman/"*.pkg.tar.zst; do
    if [ -f "$path" ]; then
        PACMAN_FILE="$path"
        log "Found local package: ${PACMAN_FILE}"
        break
    fi
done

# Download if not found locally
if [ -z "$PACMAN_FILE" ]; then
    log "Downloading pacman package from GitHub..."
    mkdir -p /tmp/qepton-test
    PACMAN_FILE="/tmp/qepton-test/${PACMAN_NAME}"

    for repo in "Qepton-Dev" "Qepton"; do
        URL="https://github.com/whizbangdevelopers/${repo}/releases/download/v${VERSION}/${PACMAN_NAME}"
        if curl -fLo "$PACMAN_FILE" "$URL" 2>/dev/null; then
            log "Downloaded from ${repo}"
            break
        fi
    done

    if [ ! -f "$PACMAN_FILE" ]; then
        fail "Could not find or download pacman package"
        exit 1
    fi
fi

# Install xvfb if needed
log "Ensuring xvfb is installed..."
ssh $SSH_OPTS "${SSH_USER}@${VM_HOST}" "pacman -Qq xorg-server-xvfb 2>/dev/null || sudo pacman -S --noconfirm xorg-server-xvfb" || true

# Copy package
log "Copying package to VM..."
scp $SSH_OPTS "$PACMAN_FILE" "${SSH_USER}@${VM_HOST}:~/qepton.pkg.tar.zst"
success "Package copied"

# Install
log "Installing pacman package..."
if ssh $SSH_OPTS "${SSH_USER}@${VM_HOST}" "sudo pacman -U --noconfirm ~/qepton.pkg.tar.zst" 2>&1; then
    success "Package installed"
else
    fail "Installation failed"
    exit 1
fi

# Verify
log "Verifying installation..."
if ssh $SSH_OPTS "${SSH_USER}@${VM_HOST}" "pacman -Qi qepton" 2>&1 | head -15; then
    success "Package metadata OK"
else
    fail "Package not found"
fi

# Check binary
log "Checking binary..."
ssh $SSH_OPTS "${SSH_USER}@${VM_HOST}" "which qepton || ls -la /usr/bin/qepton /opt/Qepton/qepton 2>/dev/null" || true

# Smoke test
log "Running headless smoke test (10 second timeout)..."
ssh $SSH_OPTS "${SSH_USER}@${VM_HOST}" "timeout 10 xvfb-run -a qepton --no-sandbox 2>&1 || true" | head -20
success "Smoke test complete (check output for errors)"

# Uninstall
log "Uninstalling..."
if ssh $SSH_OPTS "${SSH_USER}@${VM_HOST}" "sudo pacman -R --noconfirm qepton"; then
    success "Package uninstalled"
else
    fail "Uninstall failed"
fi

# Verify removal
log "Verifying removal..."
if ssh $SSH_OPTS "${SSH_USER}@${VM_HOST}" "pacman -Qi qepton 2>&1" | grep -q "was not found"; then
    success "Package fully removed"
else
    warn "Package may still be installed"
fi

echo ""
echo "========================================="
echo "  Arch Linux Testing Complete"
echo "========================================="
echo ""
echo "For interactive GUI testing:"
echo "  1. ssh ${SSH_USER}@${VM_HOST}"
echo "  2. startx  # if not running"
echo "  3. sudo pacman -U ~/qepton.pkg.tar.zst"
echo "  4. qepton"
