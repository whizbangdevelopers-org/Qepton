# Changelog

All notable changes to Qepton will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.20] - 2026-02-04

### Fixed
- Search not clearing when selecting navigation items (All Gists, Starred, Recent, Pinned, Languages, Tags)
- Login redirect race condition - await router.push for proper navigation
- Package-lock.json sync issue causing CI failures
- Add sass as explicit dev dependency for Vite compatibility

## [1.0.19] - 2026-02-04

### Fixed
- Release-to-free git config and no-changes handling

## [1.0.18] - 2026-02-04

### Fixed
- Add checkout step to Publish Release job

## [1.0.17] - 2026-02-04

### Fixed
- Publish Release job timing issue in release workflow

## [1.0.16] - 2026-02-04

### Added
- Automated release-to-free job in release workflow

### Fixed
- PR_MERGED context initialization in sync workflow

## [1.0.15] - 2026-02-04

### Fixed
- Sync workflow excluding dev-only files from free repo
- Removed orphaned dev workflows from free repo (sync-to-free, dependabot-labeler, dependabot-tracker)

## [1.0.14] - 2026-02-03

### Added
- **Pin/Unpin Gists** - Pin frequently used gists for quick local access (stored in localStorage)
- **Star/Unstar Toggle** - Toggle star status directly from the gist detail panel
- **Bulk Operations** - Star, unstar, pin, and unpin multiple gists at once from dashboard
- **Navigation Drawer Settings** - Configure visibility of All Gists, Starred, Pinned, Recent, Languages, and Tags sections
- **Clear Recent Gists** - Button to clear the recent gists list
- **Check for Updates** - Manual update check from Help menu (Electron only)
- **Release Notes Dialog** - View release notes before installing updates (Electron only)
- Snap package via separate workflow (uploads to GitHub Releases)
- Snap Store publishing support (requires SNAPCRAFT_STORE_CREDENTIALS secret)

### Changed
- Updated Help menu links from Lepton to Qepton repository
- Updated Help dialog with documentation for all new features

### Fixed
- Recent gists not updating when viewing gists
- Set serialization for localStorage persistence of pinned gists
- UpdateInfo type mismatch between electron preload and store
- Critical npm audit vulnerability

## [1.0.13] - 2026-01-29

### Added
- macOS pkg installer format for enterprise/MDM deployment
- Windows MSI installer for Group Policy deployment
- Windows portable executable (runs without installation)

## [1.0.12] - 2026-01-15

### Changed
- Revert to AppImage-only for Linux (Snap Store publishing issues)

## [1.0.11] - 2026-01-15

### Fixed
- Attempted to disable Snap Store auto-publishing (unsuccessful)

## [1.0.10] - 2026-01-15

### Added
- Snap package support for Linux
- Comprehensive test suite with 316+ unit tests and 90+ E2E tests
- CI/CD workflow for automated testing on push/PR
- Testing documentation (TESTING.md)
- PWA and Desktop App download links in README

### Fixed
- PWA deployment configuration for GitHub Pages

## [1.0.9] - 2026-01-14

### Fixed
- Logo imports for production Electron builds
- Electron detection for API base URL selection

## [1.0.8] - 2026-01-14

### Added
- Auto-updater support with latest-*.yml files for all platforms

### Fixed
- APP_URL fallback for production builds

## [1.0.7] - 2026-01-14

### Fixed
- Preload path fallback for production builds

## [1.0.6] - 2026-01-14

### Fixed
- __dirname compatibility for ESM modules in Electron

## [1.0.5] - 2026-01-14

### Fixed
- electron-updater import for ESM compatibility

## [1.0.4] - 2026-01-13

### Changed
- Simplified Linux builds to AppImage only (removed Snap temporarily)

## [1.0.3] - 2026-01-13

### Fixed
- Moved electron-updater and electron-window-state to dependencies

### Changed
- Auto-publish releases instead of drafts

## [1.0.2] - 2026-01-13

### Fixed
- Snap build configuration with snapcraft installation

## [1.0.1] - 2026-01-13

### Fixed
- GitHub releases publishing to correct repository
- Package.json missing entries
- Package-lock.json regeneration

## [1.0.0] - 2026-01-12

### Added
- Initial public release
- GitHub Gist integration for code snippet management
- Smart tagging system with automatic language detection
- Fuzzy search across all gists and files
- Syntax highlighting with 30+ language support
- Multi-platform support (Windows, macOS, Linux, PWA)
- Dark/light theme toggle
- Immersive mode for distraction-free editing
- Dashboard with usage statistics
- Settings for editor preferences and language configuration
