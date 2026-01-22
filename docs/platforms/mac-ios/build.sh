#!/usr/bin/env bash
# Build and run Qepton for iOS/macOS
# Usage: ./build.sh [command]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
IOS_DIR="$PROJECT_ROOT/src-capacitor/ios"
WORKSPACE="$IOS_DIR/App/App.xcworkspace"
SCHEME="App"

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
}

# Ensure iOS platform exists
ensure_ios() {
    if [ ! -d "$IOS_DIR" ]; then
        log_error "iOS platform not found. Run ./docs/mac-ios/setup.sh first"
        exit 1
    fi
}

# Build web assets and sync
build_and_sync() {
    log_info "Building web assets..."
    cd "$PROJECT_ROOT"
    npm run build:capacitor

    log_info "Syncing to iOS..."
    npx cap sync ios
}

# Get default simulator
get_default_simulator() {
    # Try to find iPhone 15 Pro, fall back to any available iPhone
    local sim=$(xcrun simctl list devices available | grep "iPhone 15 Pro" | head -1 | sed 's/.*(\([^)]*\)).*/\1/')
    if [ -z "$sim" ]; then
        sim=$(xcrun simctl list devices available | grep "iPhone" | head -1 | sed 's/.*(\([^)]*\)).*/\1/')
    fi
    echo "$sim"
}

# iOS: Open in Xcode
cmd_ios_dev() {
    ensure_ios
    build_and_sync
    log_info "Opening Xcode..."
    cd "$PROJECT_ROOT"
    npx cap open ios
}

# iOS: Run on simulator
cmd_ios_sim() {
    ensure_ios
    build_and_sync

    local simulator="${1:-}"
    if [ -z "$simulator" ]; then
        simulator=$(get_default_simulator)
    fi

    log_info "Running on simulator: $simulator"
    cd "$PROJECT_ROOT"
    npx cap run ios --target "$simulator"
}

# iOS: Run on device
cmd_ios_device() {
    ensure_ios
    build_and_sync

    log_info "Running on connected device..."
    cd "$PROJECT_ROOT"

    # List connected devices
    local devices=$(xcrun xctrace list devices 2>&1 | grep -v "Simulator" | grep -v "==" | grep -v "^$" | head -5)
    log_info "Available devices:"
    echo "$devices"

    npx cap run ios
}

# iOS: Live reload
cmd_ios_live() {
    ensure_ios
    log_info "Starting live reload..."
    cd "$PROJECT_ROOT"
    npx cap run ios --livereload --external
}

# iOS: Archive for App Store
cmd_ios_archive() {
    ensure_ios
    build_and_sync

    log_info "Creating iOS archive..."

    ARCHIVE_PATH="$PROJECT_ROOT/dist/Qepton.xcarchive"
    rm -rf "$ARCHIVE_PATH"

    xcodebuild archive \
        -workspace "$WORKSPACE" \
        -scheme "$SCHEME" \
        -configuration Release \
        -destination 'generic/platform=iOS' \
        -archivePath "$ARCHIVE_PATH" \
        CODE_SIGN_IDENTITY="" \
        CODE_SIGNING_REQUIRED=NO \
        CODE_SIGNING_ALLOWED=NO

    log_info "Archive created: $ARCHIVE_PATH"
    log_info "Open in Xcode Organizer to sign and distribute"

    # Open Organizer
    open "$ARCHIVE_PATH"
}

# macOS: Open for development
cmd_mac_dev() {
    ensure_ios
    build_and_sync
    log_info "Opening Xcode for Mac Catalyst..."
    open "$WORKSPACE"
}

# macOS: Run locally
cmd_mac_run() {
    ensure_ios
    build_and_sync

    log_info "Building for macOS..."

    xcodebuild build \
        -workspace "$WORKSPACE" \
        -scheme "$SCHEME" \
        -configuration Debug \
        -destination 'platform=macOS,variant=Mac Catalyst'

    # Find and run the app
    APP_PATH=$(find ~/Library/Developer/Xcode/DerivedData -name "App.app" -path "*Mac Catalyst*" -type d | head -1)
    if [ -n "$APP_PATH" ]; then
        log_info "Running: $APP_PATH"
        open "$APP_PATH"
    else
        log_error "Built app not found"
        exit 1
    fi
}

# macOS: Archive
cmd_mac_archive() {
    ensure_ios
    build_and_sync

    log_info "Creating macOS archive..."

    ARCHIVE_PATH="$PROJECT_ROOT/dist/Qepton-macOS.xcarchive"
    rm -rf "$ARCHIVE_PATH"

    xcodebuild archive \
        -workspace "$WORKSPACE" \
        -scheme "$SCHEME" \
        -configuration Release \
        -destination 'platform=macOS,variant=Mac Catalyst' \
        -archivePath "$ARCHIVE_PATH"

    log_info "Archive created: $ARCHIVE_PATH"
    open "$ARCHIVE_PATH"
}

# Run unit tests
cmd_test() {
    ensure_ios
    build_and_sync

    log_info "Running unit tests..."

    local simulator=$(get_default_simulator)

    xcodebuild test \
        -workspace "$WORKSPACE" \
        -scheme "$SCHEME" \
        -destination "platform=iOS Simulator,id=$simulator" \
        -resultBundlePath "$PROJECT_ROOT/dist/test-results"

    log_info "Test results: $PROJECT_ROOT/dist/test-results"
}

# Run UI tests
cmd_uitest() {
    ensure_ios
    build_and_sync

    log_info "Running UI tests..."

    local simulator=$(get_default_simulator)

    xcodebuild test \
        -workspace "$WORKSPACE" \
        -scheme "$SCHEME" \
        -destination "platform=iOS Simulator,id=$simulator" \
        -only-testing:AppUITests \
        -resultBundlePath "$PROJECT_ROOT/dist/uitest-results"

    log_info "UI test results: $PROJECT_ROOT/dist/uitest-results"
}

# Clean build artifacts
cmd_clean() {
    log_info "Cleaning build artifacts..."

    # Clean Xcode build
    if [ -d "$WORKSPACE" ]; then
        xcodebuild clean -workspace "$WORKSPACE" -scheme "$SCHEME" || true
    fi

    # Remove derived data for this project
    rm -rf ~/Library/Developer/Xcode/DerivedData/App-*

    # Remove Capacitor build
    rm -rf "$PROJECT_ROOT/dist/capacitor"

    # Remove archives
    rm -rf "$PROJECT_ROOT/dist/*.xcarchive"

    log_info "Clean complete"
}

# List simulators
cmd_list() {
    log_info "Available iOS Simulators:"
    xcrun simctl list devices available | grep -E "iPhone|iPad"
}

# Show usage
usage() {
    echo "Usage: $0 [command]"
    echo ""
    echo "iOS Commands:"
    echo "  ios-dev        Open in Xcode for iOS development"
    echo "  ios-sim [name] Run on iOS Simulator (default: iPhone 15 Pro)"
    echo "  ios-device     Run on connected iOS device"
    echo "  ios-live       Run with live reload on iOS"
    echo "  ios-archive    Create archive for App Store"
    echo ""
    echo "macOS Commands:"
    echo "  mac-dev        Open in Xcode for Mac Catalyst"
    echo "  mac-run        Build and run on macOS"
    echo "  mac-archive    Create archive for Mac distribution"
    echo ""
    echo "Testing:"
    echo "  test           Run unit tests"
    echo "  uitest         Run UI tests"
    echo ""
    echo "Utilities:"
    echo "  list           List available simulators"
    echo "  clean          Clean build artifacts"
    echo ""
}

# Main
check_macos

case "${1:-}" in
    ios-dev)
        cmd_ios_dev
        ;;
    ios-sim)
        cmd_ios_sim "$2"
        ;;
    ios-device)
        cmd_ios_device
        ;;
    ios-live)
        cmd_ios_live
        ;;
    ios-archive)
        cmd_ios_archive
        ;;
    mac-dev)
        cmd_mac_dev
        ;;
    mac-run)
        cmd_mac_run
        ;;
    mac-archive)
        cmd_mac_archive
        ;;
    test)
        cmd_test
        ;;
    uitest)
        cmd_uitest
        ;;
    list)
        cmd_list
        ;;
    clean)
        cmd_clean
        ;;
    help|--help|-h)
        usage
        ;;
    "")
        log_error "No command specified"
        usage
        exit 1
        ;;
    *)
        log_error "Unknown command: $1"
        usage
        exit 1
        ;;
esac
