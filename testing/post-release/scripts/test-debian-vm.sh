#!/usr/bin/env bash
# test-debian-vm.sh - Test deb package compatibility on Debian VM
#
# Tests that the Ubuntu-built deb package works on Debian stable.
# This catches dependency issues where Ubuntu packages depend on
# newer library versions than Debian has.
#
# Prerequisites:
#   - Debian VM running with SSH enabled
#   - SSH key authentication configured
#
# Usage:
#   ./scripts/test-debian-vm.sh <vm-ip-or-hostname> <version>
#   ./scripts/test-debian-vm.sh 192.168.122.102 1.0.12

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
    echo "  $0 192.168.122.102 1.0.12"
    echo "  $0 debian-test 1.0.12"
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
echo "  Debian deb Package Compatibility Test"
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

# Check Debian version
log "Checking Debian version..."
ssh $SSH_OPTS "${SSH_USER}@${VM_HOST}" "cat /etc/debian_version && lsb_release -a 2>/dev/null || true"

# Find or download deb package
DEB_FILE=""
DEB_NAME="qepton_${VERSION}_amd64.deb"

# Check local builds
for path in \
    "${PROJECT_ROOT}/dist/electron/Packaged/${DEB_NAME}" \
    "${PROJECT_ROOT}/dist/electron/Packaged/"*.deb; do
    if [ -f "$path" ]; then
        DEB_FILE="$path"
        log "Found local package: ${DEB_FILE}"
        break
    fi
done

# Download if not found locally
if [ -z "$DEB_FILE" ]; then
    log "Downloading deb package from GitHub..."
    mkdir -p /tmp/qepton-test
    DEB_FILE="/tmp/qepton-test/${DEB_NAME}"

    for repo in "Qepton-Dev" "Qepton"; do
        URL="https://github.com/whizbangdevelopers/${repo}/releases/download/v${VERSION}/${DEB_NAME}"
        if curl -fLo "$DEB_FILE" "$URL" 2>/dev/null; then
            log "Downloaded from ${repo}"
            break
        fi
    done

    if [ ! -f "$DEB_FILE" ]; then
        fail "Could not find or download deb package"
        exit 1
    fi
fi

# Install test dependencies
log "Installing test dependencies..."
ssh $SSH_OPTS "${SSH_USER}@${VM_HOST}" "sudo apt-get update && sudo apt-get install -y xvfb curl" || true

# Copy package
log "Copying package to VM..."
scp $SSH_OPTS "$DEB_FILE" "${SSH_USER}@${VM_HOST}:~/qepton.deb"
success "Package copied"

# Install - this is where compatibility issues would appear
log "Installing deb package..."
INSTALL_OUTPUT=$(ssh $SSH_OPTS "${SSH_USER}@${VM_HOST}" "sudo dpkg -i ~/qepton.deb 2>&1" || true)
echo "$INSTALL_OUTPUT"

# Fix dependencies if needed
if echo "$INSTALL_OUTPUT" | grep -q "dependency problems"; then
    log "Fixing dependencies..."
    if ssh $SSH_OPTS "${SSH_USER}@${VM_HOST}" "sudo apt-get install -f -y" 2>&1; then
        success "Dependencies resolved"
    else
        fail "Could not resolve dependencies - package may not be compatible with Debian"
        # Don't exit - continue to show what's missing
    fi
else
    success "Package installed (no dependency issues)"
fi

# Verify
log "Verifying installation..."
if ssh $SSH_OPTS "${SSH_USER}@${VM_HOST}" "dpkg -s qepton" 2>&1 | head -15; then
    success "Package metadata OK"
else
    fail "Package not properly installed"
fi

# Check for missing libraries
log "Checking for missing shared libraries..."
LDD_OUTPUT=$(ssh $SSH_OPTS "${SSH_USER}@${VM_HOST}" "ldd /opt/Qepton/qepton 2>/dev/null | grep 'not found'" || true)
if [ -n "$LDD_OUTPUT" ]; then
    warn "Missing libraries detected:"
    echo "$LDD_OUTPUT"
else
    success "All shared libraries found"
fi

# Smoke test
log "Running headless smoke test (10 second timeout)..."
ssh $SSH_OPTS "${SSH_USER}@${VM_HOST}" "timeout 10 xvfb-run -a /opt/Qepton/qepton --no-sandbox 2>&1 || true" | head -20
success "Smoke test complete (check output for errors)"

# Uninstall
log "Uninstalling..."
if ssh $SSH_OPTS "${SSH_USER}@${VM_HOST}" "sudo apt-get remove -y qepton"; then
    success "Package uninstalled"
else
    fail "Uninstall failed"
fi

# Verify removal
log "Verifying removal..."
if ssh $SSH_OPTS "${SSH_USER}@${VM_HOST}" "dpkg -s qepton 2>&1" | grep -q "is not installed"; then
    success "Package fully removed"
else
    warn "Package may still be installed"
fi

echo ""
echo "========================================="
echo "  Debian Compatibility Test Complete"
echo "========================================="
echo ""
echo "Key compatibility checks:"
echo "  - Dependency resolution: Check output above"
echo "  - Shared libraries: Check 'missing libraries' section"
echo ""
echo "If tests failed, the deb may need adjustments for Debian compatibility."
