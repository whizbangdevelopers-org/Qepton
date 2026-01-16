# Qepton Development Workflow

## Repository Structure

```
Qepton-Dev (development)
    ↓ tested & ready
    ├──→ Qepton (free public release)
    └──→ Qepton-Premium (premium release)
```

| Repo | Purpose | URL |
|------|---------|-----|
| **Qepton-Dev** | Development, testing, releases | github.com/whizbangdevelopers/Qepton-Dev |
| **Qepton** | Free public release | github.com/whizbangdevelopers/Qepton |
| **Qepton-Premium** | Premium release | github.com/whizbangdevelopers/Qepton-Premium |

---

## Complete Workflow

### 1. Develop & Test

```bash
# In Qepton-Dev:

# Run Playwright/E2E tests
npm run test:e2e

# Manual testing
npm run dev
```

### 2. Commit Changes

```bash
git add . && git commit -m "Add feature X"
```

### 3. Bump Version & Tag

```bash
npm version patch  # or minor/major
git push && git push --tags
```

This triggers GitHub Actions which:
- Validates icons (pre-build)
- Builds packages (AppImage, DEB, RPM, DMG, NSIS, etc.)
- Verifies package contents (post-build)
- Updates CHANGELOG.md
- Creates GitHub Release with all artifacts

### 4. Push to Free/Premium (Filtered)

```bash
./scripts/release-to.sh free      # Push to Qepton (free)
./scripts/release-to.sh premium   # Push to Qepton-Premium
./scripts/release-to.sh both      # Push to both repos
```

The script automatically excludes dev-only files:
- `scripts/`
- `.githooks/`
- `docker-build/`
- `e2e-docker/`
- `tests/`
- `docs/`
- `flatpak/`
- `playwright.config.ts`
- `CLAUDE.md`
- `TESTING.md`
- `DEVELOPMENT.md`

---

## Remotes Configuration

Dev repo has these remotes configured:

```bash
git remote -v
# origin   → Qepton-Dev (development)
# free     → Qepton (free release)
# premium  → Qepton-Premium (premium release)
```

To set up remotes (if needed):
```bash
git remote add free https://github.com/whizbangdevelopers/Qepton.git
git remote add premium https://github.com/whizbangdevelopers/Qepton-Premium.git
```

---

## Pre-commit Hooks

Icon validation runs automatically on commits that touch icon-related files.

Enable hooks:
```bash
git config core.hooksPath .githooks
```

Manual validation:
```bash
bash scripts/validate-icons.sh
```

---

## Version Numbers

- **Dev**: Source of truth for version
- **Free/Premium**: Receive version from Dev via release-to.sh

Current version is in `package.json`.

---

## Quick Reference

| Task | Command |
|------|---------|
| Run E2E tests | `npm run test:e2e` |
| Run dev server | `npm run dev` |
| Build Electron | `npm run build:electron` |
| Validate icons | `bash scripts/validate-icons.sh` |
| Bump patch version | `npm version patch` |
| Bump minor version | `npm version minor` |
| Bump major version | `npm version major` |
| Release to Free | `./scripts/release-to.sh free` |
| Release to Premium | `./scripts/release-to.sh premium` |
| Release to both | `./scripts/release-to.sh both` |
