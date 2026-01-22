#!/usr/bin/env bash
# First-time Android setup for Qepton
# Requires: Node.js, Android Studio with SDK

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

# Check dependencies
check_deps() {
    log_info "Checking dependencies..."

    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js not found. Install Node.js >= 18.0.0"
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

    # Check Java
    if ! command -v java &> /dev/null; then
        log_error "Java not found. Install JDK 17+"
        exit 1
    fi
    log_info "Java: $(java -version 2>&1 | head -1)"

    # Check ANDROID_HOME
    if [ -z "$ANDROID_HOME" ]; then
        # Try common locations
        if [ -d "$HOME/Android/Sdk" ]; then
            export ANDROID_HOME="$HOME/Android/Sdk"
        elif [ -d "$HOME/Library/Android/sdk" ]; then
            export ANDROID_HOME="$HOME/Library/Android/sdk"
        else
            log_error "ANDROID_HOME not set. Add to your shell profile:"
            echo "  export ANDROID_HOME=\$HOME/Android/Sdk"
            exit 1
        fi
    fi
    log_info "ANDROID_HOME: $ANDROID_HOME"

    # Check Android SDK
    if [ ! -d "$ANDROID_HOME/platform-tools" ]; then
        log_error "Android SDK not found at $ANDROID_HOME"
        log_error "Install Android Studio and use SDK Manager to install SDK"
        exit 1
    fi

    # Check adb
    if ! command -v adb &> /dev/null; then
        log_warn "adb not in PATH. Adding from ANDROID_HOME..."
        export PATH="$PATH:$ANDROID_HOME/platform-tools"
    fi
    log_info "adb: $(adb version | head -1)"
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

# Add Android platform
add_android() {
    log_info "Adding Android platform..."
    cd "$PROJECT_ROOT"

    # Check if already added
    if [ -d "src-capacitor/android" ]; then
        log_info "Android platform already exists"
    else
        npx cap add android
    fi
}

# Sync web assets to Android
sync_android() {
    log_info "Syncing web assets to Android..."
    cd "$PROJECT_ROOT"
    npx cap sync android
}

# Create local.properties if missing
create_local_properties() {
    LOCAL_PROPS="$PROJECT_ROOT/src-capacitor/android/local.properties"
    if [ ! -f "$LOCAL_PROPS" ]; then
        log_info "Creating local.properties..."
        echo "sdk.dir=$ANDROID_HOME" > "$LOCAL_PROPS"
    fi
}

# Open in Android Studio
open_studio() {
    log_info "Opening in Android Studio..."
    cd "$PROJECT_ROOT"
    npx cap open android
}

# Main
main() {
    log_info "=== Qepton Android Setup ==="
    echo ""

    check_deps
    install_deps
    build_web
    add_android
    sync_android
    create_local_properties

    echo ""
    log_info "=== Setup Complete ==="
    echo ""
    echo "Next steps:"
    echo "  1. Run: ./docs/android/build.sh dev    # Open in Android Studio"
    echo "  2. Select a device/emulator in Android Studio"
    echo "  3. Click Run (green play button)"
    echo ""
    echo "Or build APK directly:"
    echo "  ./docs/android/build.sh apk"
    echo ""

    read -p "Open Android Studio now? [Y/n] " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]] || [[ -z $REPLY ]]; then
        open_studio
    fi
}

main "$@"
