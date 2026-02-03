#!/usr/bin/env bash
# test-fedora-vm.sh - Automated testing of rpm and Flatpak packages on Fedora VM
#
# Prerequisites:
#   - Fedora VM running with SSH enabled
#   - SSH key authentication configured (or will prompt for password)
#   - Release artifacts built locally or downloaded
#
# Usage:
#   ./scripts/test-fedora-vm.sh <vm-ip-or-hostname> <version>
#   ./scripts/test-fedora-vm.sh 192.168.122.100 1.0.12
#   ./scripts/test-fedora-vm.sh fedora-test 1.0.12  # if using /etc/hosts or ~/.ssh/config

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
    echo "  vm-host    IP address or hostname of Fedora VM"
    echo "  version    Version to test (e.g., 1.0.12)"
    echo ""
    echo "Examples:"
    echo "  $0 192.168.122.100 1.0.12"
    echo "  $0 fedora-test 1.0.12"
    echo ""
    echo "The script will look for artifacts in:"
    echo "  - dist/electron/Packaged/*.rpm"
    echo "  - flatpak-build/qepton.flatpak"
    echo "  - Or download from GitHub releases"
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

log "Testing Qepton v${VERSION} on Fedora VM: ${VM_HOST}"
echo ""

# Test SSH connection
log "Testing SSH connection..."
if ! ssh $SSH_OPTS "${SSH_USER}@${VM_HOST}" "echo 'SSH OK'" 2>/dev/null; then
    fail "Cannot connect to ${VM_HOST}"
    echo "Make sure:"
    echo "  - VM is running"
    echo "  - SSH is enabled (sudo systemctl start sshd)"
    echo "  - SSH key is configured or set SSH_USER"
    exit 1
fi
success "SSH connection OK"

# Find or download RPM
RPM_FILE=""
RPM_NAME="qepton-${VERSION}.x86_64.rpm"

if [ -f "${PROJECT_ROOT}/dist/electron/Packaged/${RPM_NAME}" ]; then
    RPM_FILE="${PROJECT_ROOT}/dist/electron/Packaged/${RPM_NAME}"
    log "Found local RPM: ${RPM_FILE}"
elif [ -f "${PROJECT_ROOT}/dist/electron/Packaged/"*".rpm" ]; then
    RPM_FILE=$(ls "${PROJECT_ROOT}/dist/electron/Packaged/"*.rpm 2>/dev/null | head -1)
    log "Found local RPM: ${RPM_FILE}"
else
    log "Downloading RPM from GitHub releases..."
    mkdir -p /tmp/qepton-test
    RPM_FILE="/tmp/qepton-test/${RPM_NAME}"

    # Try Dev repo first, then Free repo
    DOWNLOAD_URL="https://github.com/whizbangdevelopers/Qepton-Dev/releases/download/v${VERSION}/${RPM_NAME}"
    if ! curl -fLo "$RPM_FILE" "$DOWNLOAD_URL" 2>/dev/null; then
        DOWNLOAD_URL="https://github.com/whizbangdevelopers/Qepton/releases/download/v${VERSION}/${RPM_NAME}"
        if ! curl -fLo "$RPM_FILE" "$DOWNLOAD_URL" 2>/dev/null; then
            fail "Could not download RPM from GitHub"
            RPM_FILE=""
        fi
    fi
fi

# Find or download Flatpak
FLATPAK_FILE=""
FLATPAK_NAME="qepton.flatpak"

if [ -f "${PROJECT_ROOT}/flatpak-build/${FLATPAK_NAME}" ]; then
    FLATPAK_FILE="${PROJECT_ROOT}/flatpak-build/${FLATPAK_NAME}"
    log "Found local Flatpak: ${FLATPAK_FILE}"
elif [ -f "${PROJECT_ROOT}/${FLATPAK_NAME}" ]; then
    FLATPAK_FILE="${PROJECT_ROOT}/${FLATPAK_NAME}"
    log "Found local Flatpak: ${FLATPAK_FILE}"
else
    log "Downloading Flatpak from GitHub releases..."
    mkdir -p /tmp/qepton-test
    FLATPAK_FILE="/tmp/qepton-test/${FLATPAK_NAME}"

    DOWNLOAD_URL="https://github.com/whizbangdevelopers/Qepton-Dev/releases/download/v${VERSION}/${FLATPAK_NAME}"
    if ! curl -fLo "$FLATPAK_FILE" "$DOWNLOAD_URL" 2>/dev/null; then
        DOWNLOAD_URL="https://github.com/whizbangdevelopers/Qepton/releases/download/v${VERSION}/${FLATPAK_NAME}"
        if ! curl -fLo "$FLATPAK_FILE" "$DOWNLOAD_URL" 2>/dev/null; then
            warn "Could not download Flatpak from GitHub (may not be published yet)"
            FLATPAK_FILE=""
        fi
    fi
fi

echo ""
echo "========================================="
echo "  RPM Package Testing"
echo "========================================="
echo ""

if [ -n "$RPM_FILE" ] && [ -f "$RPM_FILE" ]; then
    # Copy RPM to VM
    log "Copying RPM to VM..."
    scp $SSH_OPTS "$RPM_FILE" "${SSH_USER}@${VM_HOST}:~/qepton.rpm"
    success "RPM copied"

    # Install RPM
    log "Installing RPM..."
    if ssh $SSH_OPTS "${SSH_USER}@${VM_HOST}" "sudo dnf install -y ~/qepton.rpm" 2>&1; then
        success "RPM installed"
    else
        fail "RPM installation failed"
    fi

    # Verify installation
    log "Verifying installation..."
    if ssh $SSH_OPTS "${SSH_USER}@${VM_HOST}" "rpm -qi qepton" 2>&1 | head -10; then
        success "Package metadata OK"
    else
        fail "Package not found in rpm database"
    fi

    # Check binary exists
    log "Checking binary..."
    if ssh $SSH_OPTS "${SSH_USER}@${VM_HOST}" "which qepton || ls -la /opt/Qepton/qepton 2>/dev/null || ls -la /usr/bin/qepton 2>/dev/null"; then
        success "Binary found"
    else
        warn "Binary location unclear"
    fi

    # Try to launch (headless smoke test)
    log "Attempting headless launch (5 second timeout)..."
    if ssh $SSH_OPTS "${SSH_USER}@${VM_HOST}" "timeout 5 xvfb-run -a qepton --no-sandbox 2>&1 || true" | head -20; then
        success "App launched (check output above for errors)"
    else
        warn "Could not verify launch (may need X11)"
    fi

    # Uninstall
    log "Uninstalling..."
    if ssh $SSH_OPTS "${SSH_USER}@${VM_HOST}" "sudo dnf remove -y qepton"; then
        success "RPM uninstalled"
    else
        fail "Uninstall failed"
    fi

    # Verify removal
    log "Verifying removal..."
    if ssh $SSH_OPTS "${SSH_USER}@${VM_HOST}" "rpm -qi qepton 2>&1" | grep -q "not installed"; then
        success "Package fully removed"
    else
        warn "Package may still be installed"
    fi
else
    warn "Skipping RPM tests (no package available)"
fi

echo ""
echo "========================================="
echo "  Flatpak Package Testing"
echo "========================================="
echo ""

if [ -n "$FLATPAK_FILE" ] && [ -f "$FLATPAK_FILE" ]; then
    # Copy Flatpak to VM
    log "Copying Flatpak to VM..."
    scp $SSH_OPTS "$FLATPAK_FILE" "${SSH_USER}@${VM_HOST}:~/qepton.flatpak"
    success "Flatpak copied"

    # Ensure Flathub is configured
    log "Ensuring Flathub remote is configured..."
    ssh $SSH_OPTS "${SSH_USER}@${VM_HOST}" "flatpak remote-add --if-not-exists --user flathub https://flathub.org/repo/flathub.flatpakrepo" || true

    # Install Flatpak
    log "Installing Flatpak bundle..."
    if ssh $SSH_OPTS "${SSH_USER}@${VM_HOST}" "flatpak install --user -y ~/qepton.flatpak" 2>&1; then
        success "Flatpak installed"
    else
        fail "Flatpak installation failed"
    fi

    # Verify installation
    log "Verifying installation..."
    if ssh $SSH_OPTS "${SSH_USER}@${VM_HOST}" "flatpak info com.whizbangdevelopers.Qepton" 2>&1 | head -10; then
        success "Flatpak metadata OK"
    else
        fail "Flatpak not found"
    fi

    # List permissions
    log "Checking permissions..."
    ssh $SSH_OPTS "${SSH_USER}@${VM_HOST}" "flatpak info --show-permissions com.whizbangdevelopers.Qepton 2>/dev/null" || true

    # Try to launch (headless)
    log "Attempting headless launch (5 second timeout)..."
    if ssh $SSH_OPTS "${SSH_USER}@${VM_HOST}" "timeout 5 flatpak run com.whizbangdevelopers.Qepton 2>&1 || true" | head -20; then
        success "App launched (check output above for errors)"
    else
        warn "Could not verify launch"
    fi

    # Uninstall
    log "Uninstalling..."
    if ssh $SSH_OPTS "${SSH_USER}@${VM_HOST}" "flatpak uninstall -y com.whizbangdevelopers.Qepton"; then
        success "Flatpak uninstalled"
    else
        fail "Uninstall failed"
    fi

    # Verify removal
    log "Verifying removal..."
    if ssh $SSH_OPTS "${SSH_USER}@${VM_HOST}" "flatpak info com.whizbangdevelopers.Qepton 2>&1" | grep -q "not installed\|No remote\|error"; then
        success "Flatpak fully removed"
    else
        warn "Flatpak may still be installed"
    fi
else
    warn "Skipping Flatpak tests (no package available)"
fi

echo ""
echo "========================================="
echo "  Snap Package Testing"
echo "========================================="
echo ""

# Find or download Snap
SNAP_FILE=""
SNAP_NAME="qepton_${VERSION}_amd64.snap"

if [ -f "${PROJECT_ROOT}/dist/electron/Packaged/${SNAP_NAME}" ]; then
    SNAP_FILE="${PROJECT_ROOT}/dist/electron/Packaged/${SNAP_NAME}"
    log "Found local Snap: ${SNAP_FILE}"
elif [ -f "${PROJECT_ROOT}/dist/electron/Packaged/"*".snap" ]; then
    SNAP_FILE=$(ls "${PROJECT_ROOT}/dist/electron/Packaged/"*.snap 2>/dev/null | head -1)
    log "Found local Snap: ${SNAP_FILE}"
else
    log "Downloading Snap from GitHub releases..."
    mkdir -p /tmp/qepton-test
    SNAP_FILE="/tmp/qepton-test/${SNAP_NAME}"

    # Try Dev repo first, then Free repo
    DOWNLOAD_URL="https://github.com/whizbangdevelopers/Qepton-Dev/releases/download/v${VERSION}/${SNAP_NAME}"
    if ! curl -fLo "$SNAP_FILE" "$DOWNLOAD_URL" 2>/dev/null; then
        DOWNLOAD_URL="https://github.com/whizbangdevelopers/Qepton/releases/download/v${VERSION}/${SNAP_NAME}"
        if ! curl -fLo "$SNAP_FILE" "$DOWNLOAD_URL" 2>/dev/null; then
            warn "Could not download Snap from GitHub (may not be published yet)"
            SNAP_FILE=""
        fi
    fi
fi

if [ -n "$SNAP_FILE" ] && [ -f "$SNAP_FILE" ]; then
    # Check if snapd is installed, install if not
    log "Checking snapd..."
    if ! ssh $SSH_OPTS "${SSH_USER}@${VM_HOST}" "which snap" 2>/dev/null; then
        log "Installing snapd (this may take a moment)..."
        ssh $SSH_OPTS "${SSH_USER}@${VM_HOST}" "sudo dnf install -y snapd && sudo systemctl enable --now snapd.socket && sudo ln -sf /var/lib/snapd/snap /snap" || {
            warn "Could not install snapd"
            SNAP_FILE=""
        }
        # Wait for snapd to be ready
        sleep 5
    else
        success "snapd available"
    fi
fi

if [ -n "$SNAP_FILE" ] && [ -f "$SNAP_FILE" ]; then
    # Copy Snap to VM
    log "Copying Snap to VM..."
    scp $SSH_OPTS "$SNAP_FILE" "${SSH_USER}@${VM_HOST}:~/qepton.snap"
    success "Snap copied"

    # Install Snap (dangerous mode for local snaps without store assertion)
    log "Installing Snap (--dangerous for local package)..."
    if ssh $SSH_OPTS "${SSH_USER}@${VM_HOST}" "sudo snap install --dangerous ~/qepton.snap" 2>&1; then
        success "Snap installed"
    else
        fail "Snap installation failed"
    fi

    # Verify installation
    log "Verifying installation..."
    if ssh $SSH_OPTS "${SSH_USER}@${VM_HOST}" "snap list qepton" 2>&1; then
        success "Snap metadata OK"
    else
        fail "Snap not found"
    fi

    # Check confinement
    log "Checking snap info..."
    ssh $SSH_OPTS "${SSH_USER}@${VM_HOST}" "snap info qepton 2>/dev/null" | head -15 || true

    # Try to launch (headless)
    log "Attempting headless launch (5 second timeout)..."
    if ssh $SSH_OPTS "${SSH_USER}@${VM_HOST}" "timeout 5 xvfb-run -a snap run qepton 2>&1 || true" | head -20; then
        success "App launched (check output above for errors)"
    else
        warn "Could not verify launch"
    fi

    # Uninstall
    log "Uninstalling..."
    if ssh $SSH_OPTS "${SSH_USER}@${VM_HOST}" "sudo snap remove qepton"; then
        success "Snap uninstalled"
    else
        fail "Uninstall failed"
    fi
else
    warn "Skipping Snap tests (no package available or snapd not installed)"
fi

echo ""
echo "========================================="
echo "  Test Summary"
echo "========================================="
echo ""
echo "Version tested: ${VERSION}"
echo "VM: ${VM_HOST}"
echo ""
echo "To run interactive tests with GUI:"
echo "  1. SSH into VM: ssh ${SSH_USER}@${VM_HOST}"
echo "  2. Install package"
echo "  3. Run: qepton (or flatpak run com.whizbangdevelopers.Qepton)"
echo "  4. Test login, gist loading, editing, search"
echo ""
echo "Update the release verification issue when complete."
