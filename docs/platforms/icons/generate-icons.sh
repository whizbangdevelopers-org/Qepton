#!/bin/bash
#
# generate-icons.sh - Generate all required icon formats for Qepton
#
# Requirements:
#   - ImageMagick (convert command)
#   - iconutil (macOS only, for .icns generation)
#   - A master 1024x1024 PNG icon
#
# Usage:
#   ./scripts/generate-icons.sh [path-to-master-icon.png]
#

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
MASTER_ICON="${1:-$PROJECT_ROOT/src-electron/icons/master-1024.png}"

# Output directories
ICONS_DIR="$PROJECT_ROOT/src-electron/icons"
BUILD_DIR="$PROJECT_ROOT/build"
BUILD_ICONS_DIR="$BUILD_DIR/icons"
APPX_DIR="$BUILD_DIR/appx"
SNAP_GUI_DIR="$PROJECT_ROOT/snap/gui"
FLATPAK_DIR="$PROJECT_ROOT/flatpak"

# App ID for Flatpak
FLATPAK_APP_ID="com.whizbangdevelopers.Qepton"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
echo_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
echo_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check dependencies
check_dependencies() {
    if ! command -v convert &> /dev/null; then
        echo_error "ImageMagick (convert) is required but not installed."
        echo "  Install with: sudo apt install imagemagick  # Debian/Ubuntu"
        echo "                brew install imagemagick      # macOS"
        exit 1
    fi
    
    if ! command -v identify &> /dev/null; then
        echo_error "ImageMagick (identify) is required but not installed."
        exit 1
    fi
}

# Verify master icon
verify_master_icon() {
    if [[ ! -f "$MASTER_ICON" ]]; then
        echo_error "Master icon not found: $MASTER_ICON"
        echo "Please provide a 1024x1024 PNG icon as the first argument"
        exit 1
    fi
    
    # Check dimensions
    local dimensions=$(identify -format "%wx%h" "$MASTER_ICON")
    if [[ "$dimensions" != "1024x1024" ]]; then
        echo_warn "Master icon is $dimensions, recommended size is 1024x1024"
    fi
    
    echo_info "Using master icon: $MASTER_ICON"
}

# Create directories
create_directories() {
    echo_info "Creating output directories..."
    mkdir -p "$ICONS_DIR"
    mkdir -p "$BUILD_DIR"
    mkdir -p "$BUILD_ICONS_DIR"
    mkdir -p "$APPX_DIR"
    mkdir -p "$SNAP_GUI_DIR"
    mkdir -p "$FLATPAK_DIR/icons"
}

# Generate standard Linux/Electron icon sizes
generate_standard_icons() {
    echo_info "Generating standard icon sizes..."
    
    local sizes=(16 32 48 64 128 256 512)
    
    for size in "${sizes[@]}"; do
        echo "  Creating ${size}x${size}.png"
        convert "$MASTER_ICON" -resize ${size}x${size} "$ICONS_DIR/${size}x${size}.png"
        cp "$ICONS_DIR/${size}x${size}.png" "$BUILD_ICONS_DIR/"
    done
    
    # Create main icon.png (512x512)
    cp "$ICONS_DIR/512x512.png" "$ICONS_DIR/icon.png"
    cp "$ICONS_DIR/512x512.png" "$BUILD_DIR/icon.png"
    
    echo_info "Standard icons generated successfully"
}

# Generate macOS ICNS file
generate_icns() {
    echo_info "Generating macOS ICNS file..."
    
    local iconset_dir="$ICONS_DIR/icon.iconset"
    mkdir -p "$iconset_dir"
    
    # Generate all required sizes for iconset
    convert "$MASTER_ICON" -resize 16x16     "$iconset_dir/icon_16x16.png"
    convert "$MASTER_ICON" -resize 32x32     "$iconset_dir/icon_16x16@2x.png"
    convert "$MASTER_ICON" -resize 32x32     "$iconset_dir/icon_32x32.png"
    convert "$MASTER_ICON" -resize 64x64     "$iconset_dir/icon_32x32@2x.png"
    convert "$MASTER_ICON" -resize 128x128   "$iconset_dir/icon_128x128.png"
    convert "$MASTER_ICON" -resize 256x256   "$iconset_dir/icon_128x128@2x.png"
    convert "$MASTER_ICON" -resize 256x256   "$iconset_dir/icon_256x256.png"
    convert "$MASTER_ICON" -resize 512x512   "$iconset_dir/icon_256x256@2x.png"
    convert "$MASTER_ICON" -resize 512x512   "$iconset_dir/icon_512x512.png"
    convert "$MASTER_ICON" -resize 1024x1024 "$iconset_dir/icon_512x512@2x.png"
    
    # Convert to ICNS (macOS only)
    if command -v iconutil &> /dev/null; then
        iconutil -c icns "$iconset_dir" -o "$ICONS_DIR/icon.icns"
        cp "$ICONS_DIR/icon.icns" "$BUILD_DIR/"
        echo_info "ICNS file generated successfully"
    else
        echo_warn "iconutil not found (only available on macOS)"
        echo_warn "ICNS file not generated - use png2icns or generate on macOS"
        
        # Alternative: Try png2icns if available
        if command -v png2icns &> /dev/null; then
            png2icns "$ICONS_DIR/icon.icns" \
                "$iconset_dir/icon_16x16.png" \
                "$iconset_dir/icon_32x32.png" \
                "$iconset_dir/icon_128x128.png" \
                "$iconset_dir/icon_256x256.png" \
                "$iconset_dir/icon_512x512.png" \
                "$iconset_dir/icon_512x512@2x.png"
            cp "$ICONS_DIR/icon.icns" "$BUILD_DIR/"
            echo_info "ICNS file generated using png2icns"
        fi
    fi
    
    # Clean up iconset directory (optional, keep for debugging)
    # rm -rf "$iconset_dir"
}

# Generate Windows ICO file
generate_ico() {
    echo_info "Generating Windows ICO file..."
    
    # ICO can contain multiple resolutions
    # Standard sizes: 16, 32, 48, 64, 128, 256
    convert "$ICONS_DIR/256x256.png" \
            "$ICONS_DIR/128x128.png" \
            "$ICONS_DIR/64x64.png" \
            "$ICONS_DIR/48x48.png" \
            "$ICONS_DIR/32x32.png" \
            "$ICONS_DIR/16x16.png" \
            "$ICONS_DIR/icon.ico"
    
    cp "$ICONS_DIR/icon.ico" "$BUILD_DIR/"
    
    # Optional: Create installer-specific icons
    cp "$ICONS_DIR/icon.ico" "$BUILD_DIR/installerIcon.ico"
    cp "$ICONS_DIR/icon.ico" "$BUILD_DIR/uninstallerIcon.ico"
    
    echo_info "ICO file generated successfully"
}

# Generate Windows Store (AppX) assets
generate_appx_assets() {
    echo_info "Generating Windows Store (AppX) assets..."
    
    # Required assets
    convert "$MASTER_ICON" -resize 50x50   "$APPX_DIR/StoreLogo.png"
    convert "$MASTER_ICON" -resize 44x44   "$APPX_DIR/Square44x44Logo.png"
    convert "$MASTER_ICON" -resize 150x150 "$APPX_DIR/Square150x150Logo.png"
    
    # Wide tile (310x150) - needs special handling for aspect ratio
    # Create with icon centered on transparent background
    convert "$MASTER_ICON" -resize 150x150 -gravity center \
            -background transparent -extent 310x150 \
            "$APPX_DIR/Wide310x150Logo.png"
    
    # Optional assets
    convert "$MASTER_ICON" -resize 310x310 "$APPX_DIR/Square310x310Logo.png"
    convert "$MASTER_ICON" -resize 71x71   "$APPX_DIR/Square71x71Logo.png"
    convert "$MASTER_ICON" -resize 24x24   "$APPX_DIR/BadgeLogo.png"
    
    # Scaled assets for better quality at different DPIs
    for logo in "Square44x44Logo" "Square150x150Logo"; do
        case $logo in
            "Square44x44Logo")
                base_size=44
                ;;
            "Square150x150Logo")
                base_size=150
                ;;
        esac
        
        # Generate scaled versions
        for scale in 100 125 150 200 400; do
            scaled_size=$((base_size * scale / 100))
            convert "$MASTER_ICON" -resize ${scaled_size}x${scaled_size} \
                    "$APPX_DIR/${logo}.scale-${scale}.png"
        done
    done
    
    echo_info "AppX assets generated successfully"
}

# Generate Snap icon
generate_snap_icon() {
    echo_info "Generating Snap icon..."
    
    # Snap Store recommends 256x256, max 512x512
    cp "$ICONS_DIR/256x256.png" "$SNAP_GUI_DIR/icon.png"
    
    echo_info "Snap icon generated successfully"
}

# Generate Flatpak icons
generate_flatpak_icons() {
    echo_info "Generating Flatpak icons..."
    
    # Flatpak requires icons named with the app ID
    local sizes=(128 256 512)
    
    for size in "${sizes[@]}"; do
        local target_dir="$FLATPAK_DIR/icons/${size}x${size}"
        mkdir -p "$target_dir"
        cp "$ICONS_DIR/${size}x${size}.png" "$target_dir/${FLATPAK_APP_ID}.png"
        echo "  Created ${size}x${size}/${FLATPAK_APP_ID}.png"
    done
    
    # Also create a scalable SVG if we have one
    if [[ -f "$ICONS_DIR/icon.svg" ]]; then
        mkdir -p "$FLATPAK_DIR/icons/scalable"
        cp "$ICONS_DIR/icon.svg" "$FLATPAK_DIR/icons/scalable/${FLATPAK_APP_ID}.svg"
    fi
    
    echo_info "Flatpak icons generated successfully"
}

# Generate PWA icons (public/icons)
generate_pwa_icons() {
    echo_info "Generating PWA icons..."
    
    local pwa_dir="$PROJECT_ROOT/public/icons"
    mkdir -p "$pwa_dir"
    
    local sizes=(128 192 256 384 512)
    
    for size in "${sizes[@]}"; do
        convert "$MASTER_ICON" -resize ${size}x${size} "$pwa_dir/icon-${size}x${size}.png"
    done
    
    # Generate favicon
    convert "$MASTER_ICON" -resize 32x32 "$PROJECT_ROOT/public/favicon.ico"
    
    echo_info "PWA icons generated successfully"
}

# Print summary
print_summary() {
    echo ""
    echo "════════════════════════════════════════════════════════════════"
    echo "                    Icon Generation Complete"
    echo "════════════════════════════════════════════════════════════════"
    echo ""
    echo "Generated icons:"
    echo ""
    echo "  📁 src-electron/icons/"
    ls -la "$ICONS_DIR" | grep -E "\.(png|ico|icns)$" | awk '{print "       " $NF " (" $5 ")"}'
    echo ""
    echo "  📁 build/"
    ls -la "$BUILD_DIR" | grep -E "\.(png|ico|icns)$" | awk '{print "       " $NF " (" $5 ")"}'
    echo ""
    echo "  📁 build/icons/"
    ls "$BUILD_ICONS_DIR" 2>/dev/null | wc -l | xargs echo "       PNG files:"
    echo ""
    echo "  📁 build/appx/"
    ls "$APPX_DIR" 2>/dev/null | wc -l | xargs echo "       AppX assets:"
    echo ""
    echo "  📁 snap/gui/"
    ls "$SNAP_GUI_DIR" 2>/dev/null | wc -l | xargs echo "       Snap files:"
    echo ""
    echo "  📁 flatpak/icons/"
    find "$FLATPAK_DIR/icons" -name "*.png" 2>/dev/null | wc -l | xargs echo "       Flatpak icons:"
    echo ""
    echo "════════════════════════════════════════════════════════════════"
    echo ""
    echo_info "All icons generated successfully! ✅"
    echo ""
}

# Main execution
main() {
    echo ""
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║           Qepton Icon Generation Script                        ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""
    
    check_dependencies
    verify_master_icon
    create_directories
    
    generate_standard_icons
    generate_icns
    generate_ico
    generate_appx_assets
    generate_snap_icon
    generate_flatpak_icons
    generate_pwa_icons
    
    print_summary
}

# Run main function
main "$@"
