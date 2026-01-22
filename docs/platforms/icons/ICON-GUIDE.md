# Qepton Desktop Icon Definitive Guide

## Complete Reference for Icons Across All Platforms and Build Formats

This document provides the definitive specifications for desktop icons in Quasar Framework / electron-builder builds, covering all distribution formats for Linux, macOS, and Windows.

---

## 📁 Required Directory Structure

```
project/
├── src-electron/
│   └── icons/
│       ├── icon.png          # 512x512 or 1024x1024 master PNG
│       ├── icon.icns         # macOS icon bundle
│       ├── icon.ico          # Windows icon bundle (multi-resolution)
│       ├── 16x16.png
│       ├── 32x32.png
│       ├── 48x48.png
│       ├── 64x64.png
│       ├── 128x128.png
│       ├── 256x256.png
│       └── 512x512.png
│
├── build/                     # electron-builder resources
│   ├── icon.icns             # (copy or symlink)
│   ├── icon.ico              # (copy or symlink)
│   ├── icon.png              # 512x512+ for Linux fallback
│   ├── background.png        # DMG background (optional)
│   ├── background@2x.png     # DMG Retina background (optional)
│   ├── installerIcon.ico     # NSIS installer icon (optional)
│   ├── uninstallerIcon.ico   # NSIS uninstaller icon (optional)
│   ├── installerSidebar.bmp  # NSIS sidebar 164x314 (optional)
│   ├── icons/                # Linux icon set (auto-generated from icns)
│   │   ├── 16x16.png
│   │   ├── 32x32.png
│   │   ├── 48x48.png
│   │   ├── 64x64.png
│   │   ├── 128x128.png
│   │   ├── 256x256.png
│   │   └── 512x512.png
│   └── appx/                 # Windows Store assets
│       ├── StoreLogo.png           # 50x50
│       ├── Square44x44Logo.png     # 44x44
│       ├── Square150x150Logo.png   # 150x150
│       ├── Wide310x150Logo.png     # 310x150
│       ├── Square310x310Logo.png   # 310x310 (optional)
│       ├── Square71x71Logo.png     # 71x71 (optional)
│       ├── BadgeLogo.png           # 24x24 (optional)
│       └── SplashScreen.png        # 620x300 (optional)
│
├── snap/
│   └── gui/
│       ├── icon.png          # 256x256 recommended
│       └── qepton.desktop    # Desktop entry
│
└── flatpak/
    ├── com.whizbangdevelopers.Qepton.desktop
    ├── com.whizbangdevelopers.Qepton.metainfo.xml
    └── icons/                # Symlink to src-electron/icons
```

---

## 🐧 Linux Build Formats

### AppImage (Portable)
| Aspect | Requirement |
|--------|-------------|
| **Icon Source** | `linux.icon` in config or auto-generated from `.icns` |
| **Format** | PNG files with size in filename (e.g., `256x256.png`) |
| **Sizes** | 16, 32, 48, 64, 128, 256, 512 |
| **Desktop Entry** | Embedded in AppImage; uses `linux.desktop` config |
| **Icon Location** | `.desktop` file `Icon=` points to embedded icon |
| **Notes** | Icon embedded in AppImage, shown in launchers via desktop integration |

**Configuration:**
```javascript
linux: {
  icon: 'src-electron/icons',  // Directory with sized PNGs
  target: ['AppImage'],
  category: 'Development',
  desktop: {
    Name: 'Qepton',
    Comment: 'Prompt and Code Snippet Manager',
    Categories: 'Development;Utility;',
    StartupWMClass: 'Qepton'
  }
}
```

### DEB (Debian/Ubuntu)
| Aspect | Requirement |
|--------|-------------|
| **Icon Location** | `/usr/share/icons/hicolor/{size}/apps/{name}.png` |
| **Desktop Entry** | `/usr/share/applications/{name}.desktop` |
| **Icon Reference** | `Icon={name}` (no extension, no path) |
| **Sizes** | All standard hicolor sizes (16, 22, 24, 32, 48, 64, 128, 256, 512) |

### RPM (Fedora/RHEL)
| Aspect | Requirement |
|--------|-------------|
| **Icon Location** | Same as DEB: `/usr/share/icons/hicolor/{size}/apps/` |
| **Desktop Entry** | `/usr/share/applications/{name}.desktop` |
| **Notes** | electron-builder installs to hicolor automatically |

### Pacman (Arch Linux)
| Aspect | Requirement |
|--------|-------------|
| **Icon Location** | Same as DEB/RPM |
| **Format** | Standard Freedesktop icon theme |

### Flatpak (Sandboxed)
| Aspect | Requirement |
|--------|-------------|
| **App ID Format** | Reverse DNS: `com.whizbangdevelopers.Qepton` |
| **Icon Location** | `/app/share/icons/hicolor/{size}/apps/{appid}.png` |
| **Required Sizes** | **Minimum 128x128** (Flathub requirement) |
| **Recommended** | 128x128, 256x256, 512x512, plus scalable SVG |
| **Icon Name** | MUST match App ID: `com.whizbangdevelopers.Qepton.png` |
| **Desktop Entry** | `/app/share/applications/{appid}.desktop` |
| **Metainfo** | `/app/share/metainfo/{appid}.metainfo.xml` |

**Flatpak Manifest Icon Installation:**
```yaml
build-commands:
  - install -Dm644 icons/128x128.png /app/share/icons/hicolor/128x128/apps/com.whizbangdevelopers.Qepton.png
  - install -Dm644 icons/256x256.png /app/share/icons/hicolor/256x256/apps/com.whizbangdevelopers.Qepton.png
  - install -Dm644 icons/512x512.png /app/share/icons/hicolor/512x512/apps/com.whizbangdevelopers.Qepton.png
```

**Desktop Entry for Flatpak:**
```ini
[Desktop Entry]
Name=Qepton
Comment=Prompt and Code Snippet Manager powered by GitHub Gist
Exec=qepton %U
Icon=com.whizbangdevelopers.Qepton
Terminal=false
Type=Application
Categories=Development;Utility;
Keywords=gist;snippet;code;github;
StartupWMClass=Qepton
```

### Snap (Ubuntu Store)
| Aspect | Requirement |
|--------|-------------|
| **Store Icon** | `snap/gui/icon.png` or via `icon:` in snapcraft.yaml |
| **Size Range** | 40x40 to 512x512 (256x256 recommended) |
| **File Size** | < 256 KB |
| **Desktop Icon** | Defined in `.desktop` file, path: `${SNAP}/meta/gui/icon.png` |
| **Desktop Entry** | `snap/gui/{snapname}.desktop` |

**Snap Desktop Entry:**
```ini
[Desktop Entry]
Name=Qepton
Comment=Code Snippet Manager powered by GitHub Gist
Exec=qepton %U
Icon=${SNAP}/meta/gui/icon.png
Terminal=false
Type=Application
Categories=Development;Utility;
StartupWMClass=Qepton
```

---

## 🍎 macOS Build Formats

### DMG (Disk Image)
| Aspect | Requirement |
|--------|-------------|
| **App Icon** | `.icns` file with 512x512 and 1024x1024 (512@2x) |
| **Volume Icon** | `dmg.icon` (defaults to app icon) |
| **Background** | `background.png` and `background@2x.png` |
| **Icon Format** | `.icns` bundle containing multiple sizes |

**ICNS Required Sizes:**
- 16x16, 16x16@2x (32x32)
- 32x32, 32x32@2x (64x64)
- 128x128, 128x128@2x (256x256)
- 256x256, 256x256@2x (512x512)
- 512x512, 512x512@2x (1024x1024)

### PKG (Flat Installer)
| Aspect | Requirement |
|--------|-------------|
| **Icon** | Same `.icns` as app bundle |
| **Notes** | Inherits from `mac.icon` configuration |

### MAS (Mac App Store)
| Aspect | Requirement |
|--------|-------------|
| **Icon Format** | `.icns` with 512x512 AND 1024x1024 (REQUIRED) |
| **Asset Catalog** | Modern apps should include `Assets.car` |
| **Naming** | Icon file typically named `AppIcon.icns` |
| **Bundle Keys** | `CFBundleIconName` and `CFBundleIconFile` in Info.plist |

**MAS-Specific Configuration:**
```javascript
mac: {
  icon: 'build/mac/AppIcon.icns',
  target: [
    { target: 'mas', arch: 'universal' }
  ],
  extendInfo: {
    CFBundleIconName: 'AppIcon',
    CFBundleIconFile: 'AppIcon'
  }
},
mas: {
  entitlements: 'build/entitlements.mas.plist',
  entitlementsInherit: 'build/entitlements.mas.inherit.plist'
}
```

### ZIP (Archive)
| Aspect | Requirement |
|--------|-------------|
| **Icon** | Embedded in `.app` bundle from `.icns` |
| **Notes** | Same as DMG, just different container |

---

## 🪟 Windows Build Formats

### NSIS (Traditional Installer)
| Aspect | Requirement |
|--------|-------------|
| **App Icon** | `.ico` file (256x256 minimum) |
| **Installer Icon** | `nsis.installerIcon` (optional, defaults to app icon) |
| **Uninstaller Icon** | `nsis.uninstallerIcon` (optional) |
| **Header Icon** | `nsis.installerHeaderIcon` (150x57 for one-click) |
| **Sidebar** | `nsis.installerSidebar` - 164x314 BMP |

**ICO Multi-Resolution Contents:**
- 16x16
- 32x32
- 48x48
- 64x64
- 128x128
- 256x256

### MSI (Windows Installer)
| Aspect | Requirement |
|--------|-------------|
| **Icon** | `.ico` file (REQUIRED - unlike other targets) |
| **Configuration** | `win.icon` must be explicitly set |
| **Notes** | Does NOT auto-detect from build folder |

### AppX (Windows Store)
| Aspect | Requirement |
|--------|-------------|
| **Asset Location** | `build/appx/` directory |
| **Required Assets** | StoreLogo, Square44x44Logo, Square150x150Logo, Wide310x150Logo |
| **Format** | PNG files with exact names |

**AppX Asset Specifications:**
| Asset | Size | Usage |
|-------|------|-------|
| `StoreLogo.png` | 50x50 | Store listing, app info |
| `Square44x44Logo.png` | 44x44 | Taskbar, Start menu list |
| `Square150x150Logo.png` | 150x150 | Start menu tile |
| `Wide310x150Logo.png` | 310x150 | Wide Start menu tile |
| `Square310x310Logo.png` | 310x310 | Large tile (optional) |
| `Square71x71Logo.png` | 71x71 | Small tile (optional) |
| `BadgeLogo.png` | 24x24 | Badge notifications (optional) |
| `SplashScreen.png` | 620x300 | Splash screen (optional) |

**Scaled Assets (Optional but Recommended):**
```
Square44x44Logo.scale-100.png   (44x44)
Square44x44Logo.scale-125.png   (55x55)
Square44x44Logo.scale-150.png   (66x66)
Square44x44Logo.scale-200.png   (88x88)
Square44x44Logo.scale-400.png   (176x176)
```

### Portable (No Install)
| Aspect | Requirement |
|--------|-------------|
| **Icon** | Embedded in `.exe` from `.ico` |
| **Notes** | Same as NSIS target |

### 7z (Archive)
| Aspect | Requirement |
|--------|-------------|
| **Icon** | Embedded in `.exe` inside archive |
| **Notes** | Contains win-unpacked folder |

---

## 🛠️ Icon Generation Script

Create `scripts/generate-icons.sh`:

```bash
#!/bin/bash
# Generate all required icon formats from a master 1024x1024 PNG

MASTER="src-electron/icons/master-1024.png"
ICONS_DIR="src-electron/icons"
BUILD_DIR="build"
APPX_DIR="build/appx"

# Ensure directories exist
mkdir -p "$ICONS_DIR" "$BUILD_DIR/icons" "$APPX_DIR"

# Generate standard Linux/Electron sizes
for SIZE in 16 32 48 64 128 256 512; do
  convert "$MASTER" -resize ${SIZE}x${SIZE} "$ICONS_DIR/${SIZE}x${SIZE}.png"
  cp "$ICONS_DIR/${SIZE}x${SIZE}.png" "$BUILD_DIR/icons/"
done

# Generate main icon.png (512x512)
cp "$ICONS_DIR/512x512.png" "$ICONS_DIR/icon.png"
cp "$ICONS_DIR/512x512.png" "$BUILD_DIR/icon.png"

# Generate macOS ICNS (requires iconutil on macOS or png2icns)
ICONSET="$ICONS_DIR/icon.iconset"
mkdir -p "$ICONSET"
convert "$MASTER" -resize 16x16 "$ICONSET/icon_16x16.png"
convert "$MASTER" -resize 32x32 "$ICONSET/icon_16x16@2x.png"
convert "$MASTER" -resize 32x32 "$ICONSET/icon_32x32.png"
convert "$MASTER" -resize 64x64 "$ICONSET/icon_32x32@2x.png"
convert "$MASTER" -resize 128x128 "$ICONSET/icon_128x128.png"
convert "$MASTER" -resize 256x256 "$ICONSET/icon_128x128@2x.png"
convert "$MASTER" -resize 256x256 "$ICONSET/icon_256x256.png"
convert "$MASTER" -resize 512x512 "$ICONSET/icon_256x256@2x.png"
convert "$MASTER" -resize 512x512 "$ICONSET/icon_512x512.png"
convert "$MASTER" -resize 1024x1024 "$ICONSET/icon_512x512@2x.png"

# On macOS:
if command -v iconutil &> /dev/null; then
  iconutil -c icns "$ICONSET" -o "$ICONS_DIR/icon.icns"
  cp "$ICONS_DIR/icon.icns" "$BUILD_DIR/"
fi

# Generate Windows ICO (requires ImageMagick)
convert "$ICONS_DIR/256x256.png" "$ICONS_DIR/128x128.png" \
        "$ICONS_DIR/64x64.png" "$ICONS_DIR/48x48.png" \
        "$ICONS_DIR/32x32.png" "$ICONS_DIR/16x16.png" \
        "$ICONS_DIR/icon.ico"
cp "$ICONS_DIR/icon.ico" "$BUILD_DIR/"

# Generate Windows Store (AppX) assets
convert "$MASTER" -resize 50x50 "$APPX_DIR/StoreLogo.png"
convert "$MASTER" -resize 44x44 "$APPX_DIR/Square44x44Logo.png"
convert "$MASTER" -resize 150x150 "$APPX_DIR/Square150x150Logo.png"
convert "$MASTER" -resize 310x150 -gravity center -background transparent -extent 310x150 "$APPX_DIR/Wide310x150Logo.png"
convert "$MASTER" -resize 310x310 "$APPX_DIR/Square310x310Logo.png"
convert "$MASTER" -resize 71x71 "$APPX_DIR/Square71x71Logo.png"
convert "$MASTER" -resize 24x24 "$APPX_DIR/BadgeLogo.png"

# Generate Snap icon
mkdir -p snap/gui
cp "$ICONS_DIR/256x256.png" snap/gui/icon.png

# Generate Flatpak icons (named with app ID)
mkdir -p flatpak/icons
for SIZE in 128 256 512; do
  mkdir -p "flatpak/icons/${SIZE}x${SIZE}"
  cp "$ICONS_DIR/${SIZE}x${SIZE}.png" "flatpak/icons/${SIZE}x${SIZE}/com.whizbangdevelopers.Qepton.png"
done

echo "✅ All icons generated successfully!"
```

---

## ⚙️ Complete Quasar Config (quasar.config.cjs)

```javascript
electron: {
  bundler: 'builder',

  builder: {
    appId: 'com.whizbangdevelopers.Qepton',
    productName: 'Qepton',
    copyright: 'Copyright © 2025 whizBANG Developers',

    directories: {
      output: 'dist/electron/Packaged',
      buildResources: 'build'
    },

    // ═══════════════════════════════════════════
    // macOS Configuration
    // ═══════════════════════════════════════════
    mac: {
      category: 'public.app-category.developer-tools',
      icon: 'src-electron/icons/icon.icns',
      darkModeSupport: true,
      target: [
        { target: 'dmg', arch: ['x64', 'arm64'] },
        { target: 'zip', arch: ['x64', 'arm64'] },
        { target: 'pkg', arch: ['x64', 'arm64'] },
        // { target: 'mas', arch: ['universal'] }  // Requires Apple Developer account
      ]
    },

    dmg: {
      icon: 'src-electron/icons/icon.icns',
      // background: 'build/background.png',
      iconSize: 100,
      contents: [
        { x: 130, y: 220 },
        { x: 410, y: 220, type: 'link', path: '/Applications' }
      ]
    },

    pkg: {
      // installLocation: '/Applications'
    },

    // mas: {
    //   entitlements: 'build/entitlements.mas.plist',
    //   entitlementsInherit: 'build/entitlements.mas.inherit.plist'
    // },

    // ═══════════════════════════════════════════
    // Windows Configuration
    // ═══════════════════════════════════════════
    win: {
      icon: 'src-electron/icons/icon.ico',
      target: [
        { target: 'nsis', arch: ['x64', 'ia32'] },
        { target: 'msi', arch: ['x64'] },
        { target: 'portable', arch: ['x64'] },
        { target: 'appx', arch: ['x64'] },
        { target: '7z', arch: ['x64', 'ia32'] }
      ]
    },

    nsis: {
      oneClick: false,
      allowToChangeInstallationDirectory: true,
      installerIcon: 'build/installerIcon.ico',
      uninstallerIcon: 'build/uninstallerIcon.ico',
      createDesktopShortcut: true,
      createStartMenuShortcut: true
    },

    msi: {
      // MSI requires icon to be explicitly set
    },

    appx: {
      identityName: 'whizBANGDevelopers.Qepton',
      publisher: 'CN=whizBANG Developers',
      publisherDisplayName: 'whizBANG Developers',
      applicationId: 'Qepton',
      languages: ['en-US'],
      showNameOnTiles: true
      // Assets in build/appx/ are auto-detected
    },

    // ═══════════════════════════════════════════
    // Linux Configuration
    // ═══════════════════════════════════════════
    linux: {
      icon: 'src-electron/icons',  // Directory with sized PNGs
      category: 'Development',
      executableName: 'qepton',
      target: [
        'AppImage',
        'deb',
        'rpm',
        'pacman',
        'snap'
        // 'flatpak'  // Flatpak built separately
      ],
      desktop: {
        Name: 'Qepton',
        Comment: 'Prompt and Code Snippet Manager powered by GitHub Gist',
        Categories: 'Development;Utility;',
        Keywords: 'gist;snippet;code;github;',
        StartupWMClass: 'Qepton'
      },
      synopsis: 'Prompt and Code Snippet Manager',
      description: 'A powerful code snippet manager powered by GitHub Gist.',
      maintainer: 'whizBANG Developers <support@whizbangdevelopers.com>'
    },

    deb: {
      depends: ['libgtk-3-0', 'libnotify4', 'libnss3', 'libxss1', 'libxtst6', 
                'xdg-utils', 'libatspi2.0-0', 'libuuid1', 'libsecret-1-0'],
      category: 'Development',
      priority: 'optional'
    },

    rpm: {
      depends: ['gtk3', 'libnotify', 'nss', 'libXScrnSaver', 'libXtst', 
                'xdg-utils', 'at-spi2-core', 'libuuid', 'libsecret']
    },

    pacman: {
      depends: ['gtk3', 'libnotify', 'nss', 'libxss', 'libxtst', 
                'xdg-utils', 'at-spi2-core', 'util-linux-libs', 'libsecret']
    },

    snap: {
      confinement: 'strict',
      grade: 'stable',
      summary: 'Prompt and Code Snippet Manager powered by GitHub Gist',
      plugs: [
        'default', 'desktop', 'desktop-legacy', 'home',
        'x11', 'wayland', 'unity7', 'browser-support',
        'network', 'network-bind', 'password-manager-service'
      ]
    },

    // ═══════════════════════════════════════════
    // Publishing
    // ═══════════════════════════════════════════
    publish: [{
      provider: 'github',
      owner: 'whizbangdevelopers',
      repo: 'Qepton-Dev'
    }]
  }
}
```

---

## 🔄 GitHub Actions Workflow

See `release-all-platforms.yml` for the complete CI/CD workflow that builds all formats.

---

## 📋 Quick Reference Table

| Platform | Format | Icon Source | Desktop Entry | Notes |
|----------|--------|-------------|---------------|-------|
| Linux | AppImage | `linux.icon` dir | Embedded | Auto-integrates |
| Linux | DEB | `linux.icon` dir | `/usr/share/applications/` | Freedesktop |
| Linux | RPM | `linux.icon` dir | `/usr/share/applications/` | Freedesktop |
| Linux | Pacman | `linux.icon` dir | `/usr/share/applications/` | Freedesktop |
| Linux | Flatpak | Manual install | `/app/share/applications/` | Icon must match App ID |
| Linux | Snap | `snap/gui/icon.png` | `snap/gui/*.desktop` | 256x256 recommended |
| macOS | DMG | `mac.icon` (.icns) | N/A | 512+1024 required |
| macOS | PKG | `mac.icon` (.icns) | N/A | Same as DMG |
| macOS | MAS | `.icns` + Assets.car | N/A | Strict requirements |
| macOS | ZIP | `mac.icon` (.icns) | N/A | Same as DMG |
| Windows | NSIS | `win.icon` (.ico) | Start Menu | 256x256 minimum |
| Windows | MSI | `win.icon` (.ico) | Start Menu | Icon REQUIRED |
| Windows | AppX | `build/appx/*.png` | Start Menu | Multiple assets |
| Windows | Portable | `win.icon` (.ico) | N/A | Embedded in exe |
| Windows | 7z | `win.icon` (.ico) | N/A | Contains unpacked |

---

## 🚨 Common Issues & Solutions

### Linux: Icon not showing in launcher
- Ensure `StartupWMClass` matches the actual window class
- Run `gtk-update-icon-cache /usr/share/icons/hicolor/` after install
- For AppImage: Run `--appimage-extract-and-run` to debug

### Flatpak: Icon not exported
- Icon filename MUST be `{appid}.png` (e.g., `com.whizbangdevelopers.Qepton.png`)
- Must be in `/app/share/icons/hicolor/{size}/apps/`
- Minimum 128x128 required for Flathub

### Snap: Desktop menu missing icon
- Use absolute path: `Icon=${SNAP}/meta/gui/icon.png`
- Don't use `Icon=qepton` - snap sandboxing prevents lookup

### macOS MAS: Missing icon
- Both 512x512 AND 1024x1024 (512@2x) required in .icns
- May need to generate Assets.car for modern macOS

### Windows AppX: Wrong icon in search
- Provide all scaled assets (100%, 125%, 150%, 200%, 400%)
- Don't mix default and custom assets
