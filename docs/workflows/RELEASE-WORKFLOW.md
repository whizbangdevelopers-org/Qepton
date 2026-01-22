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
- `vitest.config.ts`
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

## Issue Tracking & Sync

### Issue Flow

```
Free repo (public)              Dev repo (private)
    ↓ [confirmed label]              ↓
    └──────────────────────→ Creates "Free #X: title"
                                     ↓ [fix committed]
                             Auto-PR to Free ←────────┘
```

### Issue Mapping

Issues are tracked bidirectionally in `.github/issue-mapping.json`:

```json
{
  "dev-to-free": { "9": "10", "10": "11" },
  "free-to-dev": { "10": "9", "11": "10" }
}
```

**Automatic updates:**
- When an issue is labeled `confirmed` in Free, it's copied to Dev and the mapping is updated automatically.

**Manual rebuild:**
```bash
./scripts/sync-issues.sh           # Rebuild mapping from existing issues
./scripts/sync-issues.sh --dry-run # Preview without writing
```

### Referencing Issues in Commits

When committing fixes in Dev, reference the **Dev issue number**:

```bash
git commit -m "Fix download link in README (fixes #9)"
```

The sync workflow will automatically rewrite `#9` → `whizbangdevelopers/Qepton#10` when creating the PR to Free.

### Sync Workflow

Changes sync to Free automatically on push to main (unless commit contains `[skip-sync]` or is a release commit).

**Manual sync:**
```bash
gh workflow run sync-to-free.yml
```

The workflow:
1. Excludes dev-only files
2. Rewrites issue references using the mapping
3. Creates a PR to Free with auto-merge enabled

---

## Version Numbers

- **Dev**: Source of truth for version
- **Free/Premium**: Receive version from Dev via release-to.sh

Current version is in `package.json`.

---

## Test Count Badges

The README displays dynamic badges showing test counts for unit and E2E tests.

### Setup (One-time)

1. **Create a gist** for storing badge data:
   ```bash
   gh gist create --public -d "Qepton test badges" \
     -f vitest-badge.json '{"schemaVersion":1,"label":"unit tests","message":"0 passed","color":"gray"}' \
     -f playwright-badge.json '{"schemaVersion":1,"label":"e2e tests","message":"0 passed","color":"gray"}'
   ```

2. **Copy the gist ID** from the URL (e.g., `abc123def456`)

3. **Add secrets to GitHub repo** (Settings → Secrets → Actions):
   - `GIST_TOKEN`: Personal access token with `gist` scope
   - `TEST_BADGE_GIST_ID`: The gist ID from step 2

4. **Update README** badge URLs with your gist ID (replace `TEST_BADGE_GIST_ID`)

### How Badges Update

- **Unit tests (Vitest)**: Automatically updated by `test.yml` workflow on push to main
- **E2E tests (Playwright)**: Run manually after local E2E tests:
  ```bash
  ./scripts/update-e2e-badge.sh
  ```

---

## Quick Reference

| Task | Command |
|------|---------|
| Run E2E tests | `npm run test:e2e` |
| Update E2E badge | `./scripts/update-e2e-badge.sh` |
| Run dev server | `npm run dev` |
| Build Electron | `npm run build:electron` |
| Validate icons | `bash scripts/validate-icons.sh` |
| Bump patch version | `npm version patch` |
| Bump minor version | `npm version minor` |
| Bump major version | `npm version major` |
| Release to Free | `./scripts/release-to.sh free` |
| Release to Premium | `./scripts/release-to.sh premium` |
| Release to both | `./scripts/release-to.sh both` |
