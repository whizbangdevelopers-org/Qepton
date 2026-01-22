# Developer Guide

Welcome to Qepton development. This guide helps you get oriented and productive quickly.

## Quick Links

| I want to... | Go to |
| ------------ | ----- |
| Understand the codebase | [CLAUDE.md](../CLAUDE.md) (comprehensive technical reference) |
| Run the app locally | [Quick Start](#quick-start) below |
| Run tests | [Testing](#testing) below |
| Build for release | [Building](#building) below |
| Understand the architecture | [Architecture Overview](#architecture-overview) below |
| Set up a new machine | [docs/setup/DISASTER-RECOVERY.md](setup/DISASTER-RECOVERY.md) |

## Repository Structure

This is `Qepton-Dev` - the private development repo. Changes flow to public repos on release.

```
Qepton-Dev (private)          # You are here
    │
    ├──► Qepton (public)      # Free/open-source release
    └──► Qepton-Premium       # Premium features (private)
```

### Directory Layout

```
Qepton-Dev/
├── src/                      # Application source code
│   ├── components/           # Vue components
│   ├── pages/                # Route pages
│   ├── layouts/              # Layout components
│   ├── stores/               # Pinia state stores
│   ├── services/             # Business logic & API clients
│   ├── composables/          # Vue composition functions
│   └── boot/                 # App initialization
│
├── src-electron/             # Electron desktop app
├── src-pwa/                  # PWA service worker
├── src-capacitor/            # Mobile app (iOS/Android)
│
├── testing/                  # All testing
│   ├── unit/                 # Vitest unit tests
│   ├── e2e/                  # Playwright E2E tests
│   ├── e2e-docker/           # Docker setup for E2E
│   └── post-release/         # VM testing scripts
│
├── nixos-build/              # Docker-based Linux package builder
├── flatpak/                  # Flatpak build (promoted from docs)
│
├── docs/                     # Documentation
│   ├── setup/                # Environment setup guides
│   ├── platforms/            # Platform-specific guides (planning stage)
│   ├── testing/              # Testing guides
│   ├── security/             # Security audits
│   ├── planning/             # Plans and investigations
│   └── reference/            # Patterns and reference docs
│
├── scripts/                  # Dev utility scripts
├── .github/                  # GitHub Actions workflows
│
├── CLAUDE.md                 # AI assistant context (detailed technical ref)
└── README.md                 # User-facing project overview
```

## Quick Start

```bash
# Clone (requires access to private repo)
git clone git@github.com:whizbangdevelopers/Qepton-Dev.git
cd Qepton-Dev

# Install dependencies
npm install

# Start development server (SPA mode, localhost:9000)
npm run dev

# Or start Electron dev mode
npm run dev:electron
```

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Docker (for E2E tests and NixOS builds)

## Architecture Overview

### Tech Stack

| Layer | Technology |
| ----- | ---------- |
| Framework | Vue 3 + Quasar 2 |
| State | Pinia with persistence |
| Editor | CodeMirror 6 |
| API | GitHub Gist REST API |
| Desktop | Electron |
| Mobile | Capacitor (planned) |
| PWA | Workbox service worker |

### Key Concepts

**Multi-platform from one codebase:**
- `npm run dev` → Web/SPA
- `npm run dev:electron` → Desktop
- `npm run dev:pwa` → PWA with offline support
- Capacitor for iOS/Android (future)

**State Management:**
- `src/stores/auth.ts` - GitHub OAuth, user profile
- `src/stores/gists.ts` - Gist data, tags, sync
- `src/stores/ui.ts` - Theme, dashboard mode
- `src/stores/search.ts` - Search state
- `src/stores/settings.ts` - User preferences

**Services Layer:**
- `src/services/github-api.ts` - GitHub API client
- `src/services/parser.ts` - Tag extraction from descriptions
- `src/services/search.ts` - Fuzzy search with Fuse.js

**Platform Detection:**
- `src/composables/usePlatform.ts` - Detects Electron/Capacitor/Web
- Platform-specific code branches based on this

### Data Flow

```
User Action
    │
    ▼
Vue Component (src/components/, src/pages/)
    │
    ▼
Pinia Store (src/stores/)
    │
    ▼
Service Layer (src/services/)
    │
    ▼
GitHub API (via proxy in dev, direct in Electron)
```

## Testing

All tests live in `testing/`:

```bash
# Unit tests (Vitest)
npm run test:unit              # Watch mode
npm run test:unit:run          # Single run

# E2E tests (Playwright via Docker)
cd testing/e2e-docker
./scripts/setup.sh             # First time only
./scripts/run-tests.sh         # Run all tests
./scripts/run-ui.sh            # Interactive UI mode
```

**Important:** E2E tests require Docker. Don't run Playwright directly on the host.

See [testing/post-release/README.md](../testing/post-release/README.md) for post-release VM testing.

## Building

### Development Builds

```bash
npm run build                  # SPA
npm run build:electron         # Electron
npm run build:pwa              # PWA
```

### Release Builds

Releases are triggered via GitHub Actions when you push a version tag:

```bash
npm version patch              # Bump version
git push && git push --tags    # Triggers CI build
```

### NixOS Users

NixOS lacks native dpkg/rpm tools. Use the Docker builder:

```bash
cd nixos-build
./build-packages.sh all        # Build deb, rpm, pacman
```

## Common Tasks

### Adding a New Feature

1. Create/modify components in `src/components/`
2. Add state to relevant store in `src/stores/`
3. Add API calls to `src/services/` if needed
4. Add unit tests in `testing/unit/`
5. Test locally with `npm run dev`

### Adding a New Platform

Platforms progress from planning to active:

1. **Planning:** Create `docs/platforms/<name>/` with setup guides
2. **Development:** Build and test scripts
3. **Active:** Promote working builds to root `<name>/` folder

See [docs/workflows/WORKFLOW-PATTERNS.md](workflows/WORKFLOW-PATTERNS.md#6-platform-build-progression) for details.

### Releasing

```bash
# Release to free repo only
./scripts/release-to.sh free

# Release to both free and premium
./scripts/release-to.sh both
```

## Key Files Reference

| File | Purpose |
| ---- | ------- |
| `CLAUDE.md` | AI context, canonical identifiers, detailed architecture |
| `quasar.config.cjs` | Quasar/build configuration |
| `playwright.config.ts` | E2E test configuration |
| `vitest.config.ts` | Unit test configuration |
| `src/router/routes.ts` | App routing |
| `src/stores/*.ts` | All application state |

## Getting Help

- Check `CLAUDE.md` for detailed technical info
- Check `docs/` for specific guides
- Check `docs/reference/WORKFLOW-PATTERNS.md` for patterns and learnings

## Documentation Index

### Setup & Environment
- [DISASTER-RECOVERY.md](setup/DISASTER-RECOVERY.md) - Clone and go setup
- [MCP-TOOLING-SETUP.md](setup/MCP-TOOLING-SETUP.md) - AI tooling setup
- [WORKSPACE-TRANSFER.md](setup/WORKSPACE-TRANSFER.md) - Moving workspaces

### Testing
- [testing/e2e-docker/README.md](../testing/e2e-docker/README.md) - E2E Docker setup
- [testing/post-release/README.md](../testing/post-release/README.md) - Post-release VM testing
- [CAPACITOR-TESTING-CHECKLIST.md](testing/CAPACITOR-TESTING-CHECKLIST.md) - Mobile testing

### Platforms
- [platforms/flatpak/FLATHUB-GUIDE.md](platforms/flatpak/FLATHUB-GUIDE.md) - Flathub publishing
- [platforms/snap/SNAP-STORE-GUIDE.md](platforms/snap/SNAP-STORE-GUIDE.md) - Snap Store publishing
- [platforms/android/README.md](platforms/android/README.md) - Android setup
- [platforms/mac-ios/README.md](platforms/mac-ios/README.md) - macOS/iOS setup

### Workflows & Reference
- [RELEASE-WORKFLOW.md](workflows/RELEASE-WORKFLOW.md) - Multi-repo release process
- [WORKFLOW-PATTERNS.md](workflows/WORKFLOW-PATTERNS.md) - Development patterns
- [APPROVED-EXCEPTIONS.md](workflows/APPROVED-EXCEPTIONS.md) - Known IDE warnings to ignore
- [jupyter-notebook-support.md](workflows/jupyter-notebook-support.md) - Jupyter rendering

### Security
- [SECURITY-AUDIT.md](security/SECURITY-AUDIT.md) - Security review
