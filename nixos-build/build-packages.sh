#!/usr/bin/env bash
# Build Linux packages using Docker
# Usage: ./build-packages.sh [package-type]
# package-type: all, deb, rpm, pacman, or combinations like "deb rpm"

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
IMAGE_NAME="qepton-builder"
CONTAINER_NAME="qepton-build-container"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Build Docker image if it doesn't exist
build_image() {
    if ! docker image inspect "$IMAGE_NAME" &>/dev/null; then
        log_info "Building Docker image: $IMAGE_NAME"
        docker build -t "$IMAGE_NAME" "$SCRIPT_DIR"
    else
        log_info "Using existing Docker image: $IMAGE_NAME"
    fi
}

# Run build in container
run_build() {
    local targets="$1"

    log_info "Building packages: $targets"

    # Remove old container if exists
    docker rm -f "$CONTAINER_NAME" 2>/dev/null || true

    # Run container with project mounted
    docker run --rm \
        --name "$CONTAINER_NAME" \
        -v "$PROJECT_ROOT:/app" \
        -e "BUILD_TARGETS=$targets" \
        -w /app \
        "$IMAGE_NAME" \
        bash -c '
            set -e
            echo "Installing dependencies..."
            npm install

            echo "Building Electron app with targets: $BUILD_TARGETS"

            # Temporarily modify quasar.config.cjs to set targets
            node -e "
                const fs = require(\"fs\");
                let config = fs.readFileSync(\"quasar.config.cjs\", \"utf8\");
                const targets = process.env.BUILD_TARGETS;
                config = config.replace(/target: \[.*?\],/s, \"target: [\" + targets + \"],\");
                fs.writeFileSync(\"quasar.config.cjs\", config);
            "

            npm run build:electron

            echo "Build complete!"
            ls -la dist/electron/Packaged/
        '
}

# Parse arguments
TARGETS="${1:-all}"

case "$TARGETS" in
    all)
        TARGETS="'deb', 'rpm', 'pacman'"
        ;;
    deb)
        TARGETS="'deb'"
        ;;
    rpm)
        TARGETS="'rpm'"
        ;;
    pacman)
        TARGETS="'pacman'"
        ;;
    snap)
        TARGETS="'snap'"
        ;;
    appimage)
        TARGETS="'AppImage'"
        ;;
    *)
        # Allow custom combinations like "deb rpm"
        TARGETS=$(echo "$TARGETS" | sed "s/ /', '/g" | sed "s/^/'/" | sed "s/$/'/")
        ;;
esac

# Main
log_info "Qepton Linux Package Builder"
log_info "=============================="
build_image
run_build "$TARGETS"

log_info "Packages built successfully!"
log_info "Output directory: $PROJECT_ROOT/dist/electron/Packaged/"
