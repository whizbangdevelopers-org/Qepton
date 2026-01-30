#!/usr/bin/env bash
# test-appimage-vm.sh - Test AppImage on any Linux VM
#
# AppImage is universal, so this can run on Fedora, Debian, Arch, etc.
#
# Prerequisites:
#   - Linux VM running with SSH enabled
#   - FUSE support (most distros have this)
#
# Usage:
#   ./scripts/test-appimage-vm.sh <vm-ip-or-hostname> <version>
#   ./scripts/test-appimage-vm.sh 192.168.122.100 1.0.12

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Arguments
VM_HOST="${1:-}"
VERSION="${2:-}"

usage() {
    echo "Usage: $0 <vm-host> <version>"
    echo ""
    echo "Arguments:"
    echo "  vm-host    IP address or hostname of Linux VM"
    echo "  version    Version to test (e.g., 1.0.12)"
    echo ""
    echo "Examples:"
    echo "  $0 192.168.122.100 1.0.12"
    echo "  $0 fedora-test 1.0.12"
    echo "  $0 arch-test 1.0.12"
    exit 1
}

log() {
    echo -e "${BLUE}[$(date +%H:%M:%S)]${NC} $1"
}

success() {
    echo -e "${GREEN}✓${NC} $1"
}

fail() {
    echo -e "${RED}✗${NC} $1"
}

warn() {
    echo -e "${YELLOW}!${NC} $1"
}

# Validate arguments
if [ -z "$VM_HOST" ] || [ -z "$VERSION" ]; then
    usage
fi

# SSH options
SSH_OPTS="-o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new"
SSH_USER="${SSH_USER:-$(whoami)}"

log "Testing Qepton v${VERSION} AppImage on VM: ${VM_HOST}"
echo ""

# Test SSH connection
log "Testing SSH connection..."
if ! ssh $SSH_OPTS "${SSH_USER}@${VM_HOST}" "echo 'SSH OK'" 2>/dev/null; then
    fail "Cannot connect to ${VM_HOST}"
    echo "Make sure:"
    echo "  - VM is running"
    echo "  - SSH is enabled"
    echo "  - SSH key is configured or set SSH_USER"
    exit 1
fi
success "SSH connection OK"

# Find or download AppImage
APPIMAGE_FILE=""
APPIMAGE_NAME="Qepton-${VERSION}.AppImage"

# Try different naming conventions
for pattern in "Qepton-${VERSION}.AppImage" "qepton-${VERSION}.AppImage" "Qepton-${VERSION}-x86_64.AppImage"; do
    if [ -f "${PROJECT_ROOT}/dist/electron/Packaged/${pattern}" ]; then
        APPIMAGE_FILE="${PROJECT_ROOT}/dist/electron/Packaged/${pattern}"
        log "Found local AppImage: ${APPIMAGE_FILE}"
        break
    fi
done

if [ -z "$APPIMAGE_FILE" ]; then
    # Try to find any AppImage in the dist folder
    FOUND=$(ls "${PROJECT_ROOT}/dist/electron/Packaged/"*.AppImage 2>/dev/null | head -1 || true)
    if [ -n "$FOUND" ]; then
        APPIMAGE_FILE="$FOUND"
        log "Found local AppImage: ${APPIMAGE_FILE}"
    fi
fi

if [ -z "$APPIMAGE_FILE" ]; then
    log "Downloading AppImage from GitHub releases..."
    mkdir -p /tmp/qepton-test
    APPIMAGE_FILE="/tmp/qepton-test/${APPIMAGE_NAME}"

    # Try Dev repo first, then Free repo
    for repo in "Qepton-Dev" "Qepton"; do
        for pattern in "Qepton-${VERSION}.AppImage" "qepton-${VERSION}.AppImage" "Qepton-${VERSION}-x86_64.AppImage"; do
            DOWNLOAD_URL="https://github.com/whizbangdevelopers/${repo}/releases/download/v${VERSION}/${pattern}"
            if curl -fLo "$APPIMAGE_FILE" "$DOWNLOAD_URL" 2>/dev/null; then
                success "Downloaded from ${repo}"
                break 2
            fi
        done
    done

    if [ ! -f "$APPIMAGE_FILE" ] || [ ! -s "$APPIMAGE_FILE" ]; then
        fail "Could not download AppImage from GitHub"
        APPIMAGE_FILE=""
    fi
fi

echo ""
echo "========================================="
echo "  AppImage Testing"
echo "========================================="
echo ""

if [ -n "$APPIMAGE_FILE" ] && [ -f "$APPIMAGE_FILE" ]; then
    # Check FUSE on VM
    log "Checking FUSE support on VM..."
    if ssh $SSH_OPTS "${SSH_USER}@${VM_HOST}" "which fusermount || which fusermount3" 2>/dev/null; then
        success "FUSE available"
    else
        warn "FUSE may not be installed - AppImage might not run"
        log "Attempting to install FUSE..."
        # Try different package managers
        ssh $SSH_OPTS "${SSH_USER}@${VM_HOST}" "
            if command -v dnf &>/dev/null; then
                sudo dnf install -y fuse fuse-libs
            elif command -v apt-get &>/dev/null; then
                sudo apt-get update && sudo apt-get install -y fuse libfuse2
            elif command -v pacman &>/dev/null; then
                sudo pacman -S --noconfirm fuse2
            fi
        " || warn "Could not install FUSE automatically"
    fi

    # Copy AppImage to VM
    log "Copying AppImage to VM..."
    scp $SSH_OPTS "$APPIMAGE_FILE" "${SSH_USER}@${VM_HOST}:~/Qepton.AppImage"
    success "AppImage copied"

    # Make executable
    log "Making AppImage executable..."
    ssh $SSH_OPTS "${SSH_USER}@${VM_HOST}" "chmod +x ~/Qepton.AppImage"
    success "Executable bit set"

    # Check file info
    log "Checking AppImage info..."
    ssh $SSH_OPTS "${SSH_USER}@${VM_HOST}" "file ~/Qepton.AppImage"

    # Try to extract and check contents (non-FUSE fallback)
    log "Extracting AppImage to verify contents..."
    if ssh $SSH_OPTS "${SSH_USER}@${VM_HOST}" "cd ~ && ./Qepton.AppImage --appimage-extract 2>/dev/null" | tail -5; then
        success "AppImage extracted successfully"

        # Check squashfs-root contents
        log "Checking extracted contents..."
        ssh $SSH_OPTS "${SSH_USER}@${VM_HOST}" "ls -la ~/squashfs-root/ | head -15"

        # Check for main binary
        if ssh $SSH_OPTS "${SSH_USER}@${VM_HOST}" "ls ~/squashfs-root/qepton 2>/dev/null || ls ~/squashfs-root/AppRun 2>/dev/null"; then
            success "Main binary found"
        else
            warn "Main binary location unclear"
        fi
    else
        warn "Could not extract AppImage"
    fi

    # Try to launch (headless smoke test)
    log "Attempting headless launch (5 second timeout)..."
    # First try direct AppImage, then extracted version
    ssh $SSH_OPTS "${SSH_USER}@${VM_HOST}" "
        export DISPLAY=:99
        Xvfb :99 -screen 0 1024x768x24 &
        XVFB_PID=\$!
        sleep 2

        timeout 5 ~/Qepton.AppImage --no-sandbox 2>&1 || true

        kill \$XVFB_PID 2>/dev/null || true
    " | head -20
    success "Launch test completed (check output above)"

    # Cleanup
    log "Cleaning up..."
    ssh $SSH_OPTS "${SSH_USER}@${VM_HOST}" "rm -rf ~/Qepton.AppImage ~/squashfs-root"
    success "Cleanup complete"

else
    warn "Skipping AppImage tests (no package available)"
fi

echo ""
echo "========================================="
echo "  Test Summary"
echo "========================================="
echo ""
echo "Version tested: ${VERSION}"
echo "VM: ${VM_HOST}"
echo "Package: AppImage"
echo ""
echo "To run interactive GUI test:"
echo "  1. Copy AppImage to VM with GUI access"
echo "  2. chmod +x Qepton.AppImage"
echo "  3. ./Qepton.AppImage"
echo "  4. Test login, gist loading, editing, search"
echo ""
