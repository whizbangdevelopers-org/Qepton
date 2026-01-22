#!/usr/bin/env bash
# First-time iOS/macOS setup for Qepton
# Requires: macOS, Xcode, Node.js, CocoaPods

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check we're on macOS
check_macos() {
    if [[ "$(uname)" != "Darwin" ]]; then
        log_error "This script must be run on macOS"
        exit 1
    fi
    log_info "macOS: $(sw_vers -productVersion)"
}

# Check dependencies
check_deps() {
    log_info "Checking dependencies..."

    # Check Xcode
    if ! command -v xcodebuild &> /dev/null; then
        log_error "Xcode not found. Install from App Store"
        exit 1
    fi
    XCODE_VERSION=$(xcodebuild -version | head -1)
    log_info "Xcode: $XCODE_VERSION"

    # Check Xcode command line tools
    if ! xcode-select -p &> /dev/null; then
        log_warn "Xcode command line tools not installed"
        log_info "Installing Xcode command line tools..."
        xcode-select --install
        read -p "Press Enter after installation completes..."
    fi

    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js not found. Install with: brew install node@20"
        exit 1
    fi

    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        log_error "Node.js version must be >= 18.0.0 (found: $(node -v))"
        exit 1
    fi
    log_info "Node.js: $(node -v)"

    # Check npm
    if ! command -v npm &> /dev/null; then
        log_error "npm not found"
        exit 1
    fi
    log_info "npm: $(npm -v)"

    # Check CocoaPods
    if ! command -v pod &> /dev/null; then
        log_warn "CocoaPods not found. Installing..."
        if command -v brew &> /dev/null; then
            brew install cocoapods
        else
            sudo gem install cocoapods
        fi
    fi
    log_info "CocoaPods: $(pod --version)"
}

# Accept Xcode license if needed
accept_xcode_license() {
    if ! sudo xcodebuild -license check &> /dev/null; then
        log_info "Accepting Xcode license..."
        sudo xcodebuild -license accept
    fi
}

# Install npm dependencies
install_deps() {
    log_info "Installing npm dependencies..."
    cd "$PROJECT_ROOT"
    npm install
}

# Build web assets
build_web() {
    log_info "Building web assets for Capacitor..."
    cd "$PROJECT_ROOT"
    npm run build:capacitor
}

# Add iOS platform
add_ios() {
    log_info "Adding iOS platform..."
    cd "$PROJECT_ROOT"

    # Check if already added
    if [ -d "src-capacitor/ios" ]; then
        log_info "iOS platform already exists"
    else
        npx cap add ios
    fi
}

# Install CocoaPods dependencies
install_pods() {
    log_info "Installing CocoaPods dependencies..."
    cd "$PROJECT_ROOT/src-capacitor/ios/App"

    # Install pods
    pod install
}

# Sync web assets to iOS
sync_ios() {
    log_info "Syncing web assets to iOS..."
    cd "$PROJECT_ROOT"
    npx cap sync ios
}

# Open in Xcode
open_xcode() {
    log_info "Opening in Xcode..."
    cd "$PROJECT_ROOT"
    npx cap open ios
}

# Main
main() {
    log_info "=== Qepton iOS/macOS Setup ==="
    echo ""

    check_macos
    check_deps
    accept_xcode_license
    install_deps
    build_web
    add_ios
    install_pods
    sync_ios

    echo ""
    log_info "=== Setup Complete ==="
    echo ""
    echo "Next steps:"
    echo "  1. Run: ./docs/mac-ios/build.sh ios-dev    # Open in Xcode"
    echo "  2. Select a simulator or device in Xcode"
    echo "  3. Click Run (⌘R)"
    echo ""
    echo "Or run on simulator directly:"
    echo "  ./docs/mac-ios/build.sh ios-sim"
    echo ""

    read -p "Open Xcode now? [Y/n] " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]] || [[ -z $REPLY ]]; then
        open_xcode
    fi
}

main "$@"
