#!/usr/bin/env bash
# Build Qepton pacman package locally
# Requires: base-devel package group

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check if running on Arch Linux
check_arch() {
    if [ ! -f /etc/arch-release ]; then
        log_error "This script must be run on Arch Linux"
        exit 1
    fi
}

# Check for makepkg
check_deps() {
    if ! command -v makepkg &> /dev/null; then
        log_error "makepkg not found. Install base-devel: sudo pacman -S base-devel"
        exit 1
    fi
}

# Clean previous builds
clean() {
    log_info "Cleaning previous builds..."
    rm -rf "${SCRIPT_DIR}/src" "${SCRIPT_DIR}/pkg"
    rm -f "${SCRIPT_DIR}"/*.pkg.tar.zst
    rm -f "${SCRIPT_DIR}"/*.pkg.tar.xz
}

# Build package
build() {
    log_info "Building pacman package..."
    cd "$SCRIPT_DIR"
    makepkg -sf --noconfirm
}

# Main
main() {
    check_arch
    check_deps

    case "${1:-build}" in
        build)
            build
            ;;
        clean)
            clean
            ;;
        rebuild)
            clean
            build
            ;;
        *)
            echo "Usage: $0 [build|clean|rebuild]"
            exit 1
            ;;
    esac

    log_info "Done!"
    ls -la "${SCRIPT_DIR}"/*.pkg.tar.zst 2>/dev/null || true
}

main "$@"
