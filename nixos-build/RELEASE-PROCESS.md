# Qepton Release Process

This document describes how to create and publish new releases of Qepton.

## Overview

Releases are automated via GitHub Actions. When you push a version tag (e.g., `v1.0.10`), the workflow automatically:

1. Builds for all platforms (Linux, macOS, Windows)
2. Creates all package formats
3. Uploads artifacts to GitHub Releases
4. Generates release notes from commits

## Package Formats Built

### Linux
- **AppImage** - Universal Linux package (runs on any distro)
- **Snap** - Ubuntu Snap Store format
- **DEB** - Debian/Ubuntu apt package
- **RPM** - Fedora/RHEL package
- **Pacman** - Arch Linux package

### macOS
- **DMG** - Disk image installer (x64 + arm64 universal)
- **ZIP** - Portable archive

### Windows
- **NSIS EXE** - Installer (x64 + ia32)
- **7z** - Portable archive

## Release Steps

### 1. Update Version

Edit `package.json` and bump the version:

```json
{
  "version": "1.0.10"
}
```

### 2. Update CHANGELOG

Add a new section to `CHANGELOG.md`:

```markdown
## [1.0.10] - YYYY-MM-DD

### Added
- New features...

### Fixed
- Bug fixes...

### Changed
- Changes...
```

### 3. Commit Changes

```bash
git add package.json CHANGELOG.md
git commit -m "Bump version to 1.0.10"
```

### 4. Create and Push Tag

```bash
git tag v1.0.10
git push origin main
git push origin v1.0.10
```

### 5. Monitor Build

Go to **Actions** tab on GitHub to monitor the build progress:
- Build takes ~15-20 minutes for all platforms
- Each platform builds in parallel

### 6. Verify Release

Once complete, check the **Releases** page:
- Verify all artifacts are uploaded
- Check release notes are accurate
- Test download links

## Local Building (Optional)

### Native Build (for your platform)

```bash
npm install
npm run build:electron
```

Output: `dist/electron/Packaged/`

### Docker Build (for Linux packages on NixOS)

```bash
cd docker-build
./build-packages.sh all      # Build deb, rpm, pacman
./build-packages.sh deb      # Build only deb
./build-packages.sh "deb rpm" # Build specific formats
```

### Flatpak Build

```bash
cd flatpak
./build-flatpak.sh
```

See [flatpak/README.md](../flatpak/README.md) for details.

## Troubleshooting

### Build Fails on GitHub Actions

1. Check the Actions log for specific errors
2. Common issues:
   - Snapcraft needs `--classic` confinement
   - Missing dependencies in electron-builder config
   - Code signing issues (disabled by default)

### Local Build Permission Issues

If `dist/electron` is owned by root (from Docker builds):

```bash
sudo rm -rf dist/electron
npm run build:electron
```

### Snap Build Requires snapcraft

On Ubuntu:
```bash
sudo snap install snapcraft --classic
```

On NixOS: Use the Docker build environment.

## Auto-Update System

The release includes `latest-*.yml` files that enable automatic updates:
- `latest-linux.yml` - Linux update manifest
- `latest-mac.yml` - macOS update manifest
- `latest.yml` - Windows update manifest

Users with the app installed will be notified of updates automatically.

## Repository Structure

| Repository | Purpose |
|------------|---------|
| **Qepton** (public) | Production releases, public-facing |
| **Qepton-Dev** (private) | Development, Docker builds, Flatpak |

Changes flow: Qepton-Dev → Qepton → Tagged Release

## Version Numbering

We use [Semantic Versioning](https://semver.org/):
- **MAJOR** (1.x.x): Breaking changes
- **MINOR** (x.1.x): New features, backwards compatible
- **PATCH** (x.x.1): Bug fixes, backwards compatible

## Quick Reference

```bash
# Full release process
git add package.json CHANGELOG.md
git commit -m "Bump version to X.Y.Z"
git tag vX.Y.Z
git push origin main && git push origin vX.Y.Z

# Check release status
gh run list --workflow=release.yml

# View release
gh release view vX.Y.Z
```
