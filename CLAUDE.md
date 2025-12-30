# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Qepton is a code snippet manager powered by GitHub Gist. It's a multi-platform application built with the Quasar Framework (Vue 3) supporting Electron desktop, PWA, and Capacitor mobile deployments.

## Common Commands

```bash
# Development
npm run dev              # Start Quasar dev server (SPA mode, localhost:9000)
npm run dev:electron     # Start Electron dev mode
npm run dev:pwa          # Start PWA dev mode

# Build
npm run build            # Build for production (SPA)
npm run build:electron   # Build Electron app
npm run build:pwa        # Build PWA
npm run build:all        # Build all platforms

# Testing
npm run test:unit        # Run unit tests (watch mode)
npm run test:unit:run    # Run unit tests once

# Run single unit test file
npx vitest run tests/unit/services/search.spec.ts

# Code Quality
npm run lint             # ESLint check
npm run format           # Prettier format
```

## E2E Testing (Docker Only)

**IMPORTANT:** Playwright E2E tests are ONLY available inside the Docker container. Do not attempt to run Playwright commands directly on the host machine.

Run E2E tests via `e2e-docker/`:

```bash
cd e2e-docker
./scripts/setup.sh                    # First-time setup (creates .env)
./scripts/run-tests.sh                # Run all tests (4 workers)
./scripts/run-single.sh <test-file>   # Run specific test
./scripts/run-ui.sh                   # Interactive UI at localhost:9323
```

Required env var: `GITHUB_TEST_TOKEN` in `e2e-docker/.env`

The `playwright.config.ts` at the project root is used by the Docker container (which mounts the project). Test files are in `tests/e2e/`.

## Architecture

### State Management

Three Pinia stores manage application state:
- **auth** (`src/stores/auth.ts`) - GitHub OAuth token, user profile
- **gists** (`src/stores/gists.ts`) - Gist data, tags (language tags prefixed with `lang@`, custom tags without prefix), sync state
- **ui** (`src/stores/ui.ts`) - Theme, dashboard mode, search settings

Stores use `pinia-plugin-persistedstate` for local storage persistence.

### Services Layer

- **github-api** (`src/services/github-api.ts`) - GitHub REST API client using Axios. Uses proxy (`/api/github`) in browser mode, direct API in Electron. Handles pagination with Link header (V2) with sequential fallback (V1) for 2FA accounts.
- **search** (`src/services/search.ts`) - Fuzzy search using Fuse.js
- **parser** (`src/services/parser.ts`) - Extracts tags from gist descriptions and file extensions
- **markdown** (`src/services/markdown.ts`) - markdown-it rendering with KaTeX math support
- **jupyter** (`src/services/jupyter.ts`) - Jupyter notebook (.ipynb) rendering via notebookjs

### Platform-Specific Code

- **Electron** (`src-electron/`) - Main process in `electron-main.ts`, IPC preload in `electron-preload.ts`. OAuth config loaded from `~/.leptonrc`.
- **PWA** (`src-pwa/`) - Service worker with GitHub API caching via Workbox
- **Capacitor** (`src-capacitor/`) - Mobile app config, App ID: `com.cosmox.lepton`

### API Proxy

Dev server proxies `/api/github/*` to `https://api.github.com` (configured in `quasar.config.cjs`). This avoids CORS issues in browser mode.

## Testing Structure

- **Unit tests** (`tests/unit/`) - Vitest with jsdom environment. Test stores and services. Run with `npm run test:unit`.
- **E2E tests** (`tests/e2e/`) - Playwright with Chromium. **Run only via Docker** (see E2E Testing section above).
- **Test helpers** (`tests/e2e/helpers/`) - Shared test utilities and fixtures

E2E tests use `globalSetup` in `tests/e2e/global-setup.ts` to validate GitHub token before running.

## Path Aliases

Configured in `tsconfig.json` and `vitest.config.ts`:
- `src/*` → `./src/*`
- `components/*` → `./src/components/*`
- `stores/*` → `./src/stores/*`
- `services/*` → `./src/services/*`

## Tag System

Gists are tagged automatically by file extension (`lang@javascript`, `lang@python`) and manually via description syntax (`#tag-name`). Tags are indexed in `gistTags` as `Map<string, Set<gistId>>`.
