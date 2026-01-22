#!/usr/bin/env bash
# Build and run Qepton for Android
# Usage: ./build.sh [command]
#   dev          - Open in Android Studio
#   run          - Build and install on connected device/emulator
#   live         - Run with live reload
#   apk          - Build debug APK
#   release      - Build unsigned release APK
#   release-signed - Build signed release APK
#   bundle       - Build AAB for Play Store
#   clean        - Clean build artifacts

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
ANDROID_DIR="$PROJECT_ROOT/src-capacitor/android"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Ensure Android platform exists
ensure_android() {
    if [ ! -d "$ANDROID_DIR" ]; then
        log_error "Android platform not found. Run ./docs/android/setup.sh first"
        exit 1
    fi
}

# Set ANDROID_HOME if not set
setup_env() {
    if [ -z "$ANDROID_HOME" ]; then
        if [ -d "$HOME/Android/Sdk" ]; then
            export ANDROID_HOME="$HOME/Android/Sdk"
        elif [ -d "$HOME/Library/Android/sdk" ]; then
            export ANDROID_HOME="$HOME/Library/Android/sdk"
        fi
    fi
    export PATH="$PATH:$ANDROID_HOME/platform-tools"
}

# Build web assets and sync
build_and_sync() {
    log_info "Building web assets..."
    cd "$PROJECT_ROOT"
    npm run build:capacitor

    log_info "Syncing to Android..."
    npx cap sync android
}

# Open in Android Studio
cmd_dev() {
    ensure_android
    build_and_sync
    log_info "Opening Android Studio..."
    cd "$PROJECT_ROOT"
    npx cap open android
}

# Run on device/emulator
cmd_run() {
    ensure_android
    build_and_sync
    log_info "Running on device..."
    cd "$PROJECT_ROOT"
    npx cap run android
}

# Live reload development
cmd_live() {
    ensure_android
    log_info "Starting live reload..."
    cd "$PROJECT_ROOT"

    # Start dev server in background
    npm run dev &
    DEV_PID=$!

    # Wait for server to start
    sleep 5

    # Get local IP for device to connect
    LOCAL_IP=$(hostname -I | awk '{print $1}')
    log_info "Dev server running at http://$LOCAL_IP:9000"

    # Update capacitor config for live reload
    npx cap run android --livereload --external

    # Cleanup on exit
    trap "kill $DEV_PID 2>/dev/null" EXIT
    wait $DEV_PID
}

# Build debug APK
cmd_apk() {
    ensure_android
    build_and_sync

    log_info "Building debug APK..."
    cd "$ANDROID_DIR"
    ./gradlew assembleDebug

    APK_PATH="$ANDROID_DIR/app/build/outputs/apk/debug/app-debug.apk"
    if [ -f "$APK_PATH" ]; then
        log_info "APK built: $APK_PATH"
        ls -lh "$APK_PATH"
    else
        log_error "APK not found at expected location"
        exit 1
    fi
}

# Build unsigned release APK
cmd_release() {
    ensure_android
    build_and_sync

    log_info "Building release APK (unsigned)..."
    cd "$ANDROID_DIR"
    ./gradlew assembleRelease

    APK_PATH="$ANDROID_DIR/app/build/outputs/apk/release/app-release-unsigned.apk"
    if [ -f "$APK_PATH" ]; then
        log_info "APK built: $APK_PATH"
        ls -lh "$APK_PATH"
    else
        log_error "APK not found at expected location"
        exit 1
    fi
}

# Build signed release APK
cmd_release_signed() {
    ensure_android

    KEYSTORE_PROPS="$SCRIPT_DIR/keystore.properties"
    if [ ! -f "$KEYSTORE_PROPS" ]; then
        log_error "Keystore properties not found: $KEYSTORE_PROPS"
        log_error "Create keystore.properties with:"
        echo "  storeFile=../android/qepton-release.keystore"
        echo "  storePassword=your_password"
        echo "  keyAlias=qepton"
        echo "  keyPassword=your_password"
        exit 1
    fi

    build_and_sync

    log_info "Building signed release APK..."
    cd "$ANDROID_DIR"

    # Copy keystore properties to android project
    cp "$KEYSTORE_PROPS" "$ANDROID_DIR/keystore.properties"

    ./gradlew assembleRelease

    APK_PATH="$ANDROID_DIR/app/build/outputs/apk/release/app-release.apk"
    if [ -f "$APK_PATH" ]; then
        log_info "Signed APK built: $APK_PATH"
        ls -lh "$APK_PATH"
    else
        log_error "Signed APK not found at expected location"
        exit 1
    fi
}

# Build AAB for Play Store
cmd_bundle() {
    ensure_android

    KEYSTORE_PROPS="$SCRIPT_DIR/keystore.properties"
    if [ ! -f "$KEYSTORE_PROPS" ]; then
        log_error "Keystore properties required for Play Store bundle"
        exit 1
    fi

    build_and_sync

    log_info "Building Android App Bundle..."
    cd "$ANDROID_DIR"

    cp "$KEYSTORE_PROPS" "$ANDROID_DIR/keystore.properties"

    ./gradlew bundleRelease

    AAB_PATH="$ANDROID_DIR/app/build/outputs/bundle/release/app-release.aab"
    if [ -f "$AAB_PATH" ]; then
        log_info "AAB built: $AAB_PATH"
        ls -lh "$AAB_PATH"
    else
        log_error "AAB not found at expected location"
        exit 1
    fi
}

# Clean build artifacts
cmd_clean() {
    log_info "Cleaning build artifacts..."

    if [ -d "$ANDROID_DIR" ]; then
        cd "$ANDROID_DIR"
        ./gradlew clean
    fi

    rm -rf "$PROJECT_ROOT/dist/capacitor"

    log_info "Clean complete"
}

# Show usage
usage() {
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  dev            Open in Android Studio"
    echo "  run            Build and install on device/emulator"
    echo "  live           Run with live reload"
    echo "  apk            Build debug APK"
    echo "  release        Build unsigned release APK"
    echo "  release-signed Build signed release APK"
    echo "  bundle         Build AAB for Play Store"
    echo "  clean          Clean build artifacts"
    echo ""
}

# Main
setup_env

case "${1:-}" in
    dev)
        cmd_dev
        ;;
    run)
        cmd_run
        ;;
    live)
        cmd_live
        ;;
    apk)
        cmd_apk
        ;;
    release)
        cmd_release
        ;;
    release-signed)
        cmd_release_signed
        ;;
    bundle)
        cmd_bundle
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
