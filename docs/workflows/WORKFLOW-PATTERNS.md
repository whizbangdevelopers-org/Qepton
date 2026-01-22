# Workflow Patterns & Learnings

This document captures patterns, prompts, and learnings from development that can be reused across projects.

## Purpose

Track what works well with AI-assisted development to build a reusable workflow system for:
- Quasar frontend projects
- Multi-backend integrations (PHP/PDO, PostgreSQL, SQLite, APIs)
- Multi-repo management

---

## Pattern Categories

### 1. Project Setup Patterns

| Pattern | Description | Reuse Level |
| ------- | ----------- | ----------- |
| CLAUDE.md structure | Aliases, identifiers, architecture docs | Universal |
| .zencoder/workflows | Agent workflow configurations | Universal |
| Multi-repo remotes | Dev → Free/Premium release flow | Project-specific |

**Learnings:**
- [ ] _Add learnings as you work_

---

### 2. Quasar/Vue Patterns

| Pattern | Description | Files |
| ------- | ----------- | ----- |
| Pinia store structure | State, getters, actions, persistence | `src/stores/*.ts` |
| Service layer | API clients, business logic | `src/services/*.ts` |
| Composables | Reusable Vue composition functions | `src/composables/*.ts` |
| Platform detection | Electron/Capacitor/PWA branching | `src/composables/usePlatform.ts` |
| Dialog components | Modal patterns with Quasar | `src/components/*Dialog.vue` |

**Effective Prompts:**
```
# Store Generation
Create a Pinia store for [feature] following the pattern in src/stores/gists.ts.
Include: typed state, getters, actions, pinia-plugin-persistedstate config.

# Service Generation
Create a service for [feature] following src/services/github-api.ts pattern.
Include: TypeScript types, error handling, platform-aware API calls.

# Component Scaffolding
Create a [type] component following existing patterns in src/components/.
Use Quasar components, TypeScript, and composition API with <script setup>.
```

**Learnings:**
- [ ] _Add learnings as you work_

---

### 3. Backend Integration Patterns

#### PHP/PDO/MySQL (WG Admin)
| Pattern | Description |
| ------- | ----------- |
| _TBD_ | _Add patterns from WG Admin work_ |

#### PostgreSQL (Front Accounting)
| Pattern | Description |
| ------- | ----------- |
| _TBD_ | _Add patterns from FA conversion_ |

#### SQLite Local-First (IIOT)
| Pattern | Description |
| ------- | ----------- |
| _TBD_ | _Add patterns from IIOT app_ |

---

### 4. Git/GitHub Patterns

| Pattern | Description | Automation |
| ------- | ----------- | ---------- |
| Multi-repo release | Dev → filtered push to Free/Premium | `scripts/release-to.sh` |
| Version bumping | npm version + tag + push triggers CI | GitHub Actions |
| Issue-to-dev sync | Copy issues between repos | `.github/workflows/copy-issue-to-dev.yml` |

**Effective Prompts:**
```
# Release workflow
Review changes since last tag, bump version, create release to [free/premium/both].

# Issue triage
Analyze open issues, categorize by type (bug/feature/improvement), suggest priorities.
```

**Learnings:**
- [ ] _Add learnings as you work_

---

### 5. Testing Patterns

| Pattern | Description | Location |
| ------- | ----------- | -------- |
| Unit test structure | Vitest with Vue Test Utils | `testing/unit/` |
| E2E Docker setup | Playwright in container | `testing/e2e-docker/` |
| E2E test specs | Playwright test files | `testing/e2e/` |
| Post-release VM testing | Test packages on live VMs | `testing/post-release/` |
| Test helpers | Shared fixtures and utilities | `testing/e2e/helpers/` |

**Learnings:**
- [ ] _Add learnings as you work_

---

### 6. Platform Build Progression

Platforms move from documentation (planning) to root level (production-ready).

#### Progression Stages

```
docs/platforms/<name>/       Stage 1: Planning & Reference
    └── README.md, guides, notes

<name>/                      Stage 2: Active Development (promoted to root)
    └── build scripts, manifests, configs
```

#### Current Status

| Platform | Stage | Location | Notes |
| -------- | ----- | -------- | ----- |
| Flatpak | **Active** | `flatpak/` | Build scripts ready, promoted to root |
| Snap | Planning | `docs/platforms/snap/` | Guide only |
| Pacman | Planning | `docs/platforms/pacman/` | Build scripts in progress |
| Android | Planning | `docs/platforms/android/` | Setup guides |
| iOS/macOS | Planning | `docs/platforms/mac-ios/` | Setup guides |
| Icons | Reference | `docs/platforms/icons/` | Icon generation guide |

#### Promotion Criteria

A platform is promoted from `docs/platforms/` to root when:
1. Build scripts are tested and working
2. CI integration is complete (or ready)
3. Package output is verified on target systems

#### Directory Contents

**Planning stage** (`docs/platforms/<name>/`):
- README with setup instructions
- Reference guides (e.g., FLATHUB-GUIDE.md)
- Draft configs and notes

**Active stage** (root `<name>/`):
- Working build scripts
- Production manifests/configs
- README with usage instructions

**Learnings:**
- Keep guides in `docs/platforms/` even after promotion (reference material)
- Remove duplicate build files when promoting (avoid drift)

---

## Agent Opportunities

Tasks that are repetitive, pattern-heavy, or error-prone - good candidates for dedicated agents.

| Task | Frequency | Complexity | Agent Value |
| ---- | --------- | ---------- | ----------- |
| Store scaffolding | Medium | Low | High |
| Component scaffolding | High | Low | High |
| Service generation | Medium | Medium | High |
| E2E test generation | Medium | Medium | Medium |
| Cross-repo sync validation | Low | High | Medium |
| Release automation | Weekly | Low | Low (already scripted) |

---

## Iteration Log

Track what worked and what didn't for each significant task.

### Template
```markdown
### [Date] - [Task Name]

**Goal:** What you were trying to accomplish

**Approach:** How you/AI tackled it

**What Worked:**
-

**What Didn't Work:**
-

**Pattern Extracted:**
- Prompt/instruction that worked well
- Code pattern worth reusing

**Time Saved/Lost:** Compared to manual approach
```

---

### [Example] - Pinia Store Pattern

**Goal:** Understand effective store scaffolding prompts

**Approach:** TBD

**What Worked:**
- TBD

**What Didn't Work:**
- TBD

**Pattern Extracted:**
- TBD

---

## MCP & Skills Integration Notes

### Active MCPs
_Document which MCPs are enabled and their value_

| MCP | Purpose | Value Assessment |
| --- | ------- | ---------------- |
| _TBD_ | _TBD_ | _TBD_ |

### Custom Skills
_Document custom skills created for this workflow_

| Skill | Trigger | Purpose |
| ----- | ------- | ------- |
| _TBD_ | _TBD_ | _TBD_ |

---

## Cross-Project Applicability

Check which patterns apply to each project:

| Pattern | Qepton | WG Admin | Client Apps | Front Acct | IIOT | DemoCRM |
| ------- | ------ | -------- | ----------- | ---------- | ---- | ------- |
| CLAUDE.md structure | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Quasar patterns | ✓ | Future | ✓ | ✓ | ✓ | Future |
| Pinia stores | ✓ | Future | ✓ | ✓ | ✓ | Future |
| PHP/PDO patterns | - | ✓ | - | - | - | ✓ |
| OOP direct routing | - | ✓ | - | - | - | ✓ |
| SQLite local-first | - | - | - | - | ✓ | - |
| Multi-repo release | ✓ | ? | ? | ? | ? | ? |

---

## Project Inventory

| ID | Project | Location | Frontend | Backend | Database | Framework | Status |
| -- | ------- | -------- | -------- | ------- | -------- | --------- | ------ |
| A | WG Admin | `sftp://159.203.116.150` | PHP/Bootstrap → Quasar | PHP PDO | MySQL | OOP + Direct Routing | Production |
| B | Client Apps | `sftp://159.203.116.150` | Quasar | WG Admin API | MySQL | - | New |
| C | Front Accounting | Local | Quasar | Legacy → Postgres | Postgres | - | In process |
| D | IIOT App | Local | Quasar | Local | SQLite (in-app) | - | New, specs done |
| E | DemoCRM | `sftp://159.203.116.150` | PHP/Bootstrap → Quasar | PHP PDO | MySQL | OOP + Direct Routing (improved) | New |
| - | Qepton | Local: `~/Projects/Qepton-Dev` | Quasar | GitHub API | - | - | Reference |

### Location Details

| Location | Host | Access | Projects |
| -------- | ---- | ------ | -------- |
| Remote Server | 159.203.116.150:222 | SFTP via GVFS | A, B, E |
| Local | ~/Projects/ | Direct | C, D, Qepton |

### Architecture Notes

**WG Admin & DemoCRM Framework:**
- OOP with direct routing (not MVC)
- DemoCRM has improved architecture over WG Admin
- Both targets for eventual Quasar frontend conversion
- Patterns learned from DemoCRM may backport to WG Admin

---

## Software Factory Workflow

### Goal
Solo/team workflow optimized for: **Requirements → MVP in shortest time**

### VS Code Workspace Strategy

**Recommended: Multi-root Workspace**

Create a `.code-workspace` file to manage all projects:

```json
// whizbang-factory.code-workspace
{
  "folders": [
    { "name": "Qepton-Dev", "path": "~/Projects/Qepton-Dev" },
    { "name": "Front-Accounting", "path": "~/Projects/FrontAccounting" },
    { "name": "IIOT-App", "path": "~/Projects/IIOT" },
    { "name": "WG-Admin", "path": "/run/user/1000/gvfs/sftp:host=159.203.116.150,port=222/path/to/wgadmin" },
    { "name": "Client-Apps", "path": "/run/user/1000/gvfs/sftp:host=159.203.116.150,port=222/path/to/clientapps" },
    { "name": "DemoCRM", "path": "/run/user/1000/gvfs/sftp:host=159.203.116.150,port=222/home/democrm" }
  ],
  "settings": {
    "files.exclude": { "**/node_modules": true }
  }
}
```

**Benefits:**
- Single VS Code window, all projects accessible
- Shared settings, extensions, tasks
- Claude Code can see cross-project context when needed
- Easy switching between projects

**Considerations:**
- SFTP mounts can be slow for large operations
- Each project still needs its own CLAUDE.md for AI context
- Consider local clones for heavy development, sync to remote for deployment

### Requirements → MVP Pipeline

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ Requirements│ →  │   Design    │ →  │    Build    │ →  │   Deploy    │
│   Capture   │    │   + Plan    │    │   + Test    │    │  + Verify   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
     │                   │                  │                   │
     ▼                   ▼                  ▼                   ▼
  Issues/Docs       CLAUDE.md +         AI-assisted       Deployment
  in GitHub         Plan Mode           coding +          testing
                                        Unit tests        (see below)
```

### Testing Strategy

**Principle: Local-first testing, GitHub Actions as final gate**

- Private repos cost money on GitHub Actions
- All tests must pass locally before push
- Consistent testing across all projects
- GitHub Actions = validation, not discovery

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         TESTING PYRAMID (Local-First)                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   LOCAL (run before every commit)                                           │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  1. Unit Tests (Vitest/PHPUnit)         - Fast, run constantly      │   │
│   │  2. Lint + Type Check (ESLint/TS)       - Catch errors early        │   │
│   │  3. Security Scan (npm audit/local)     - Before dependencies ship  │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   LOCAL (run before push / PR)                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  4. E2E Tests (Playwright Docker)       - Full user journeys        │   │
│   │  5. Build Verification                  - Ensure it compiles        │   │
│   │  6. Security Deep Scan                  - OWASP, dependency audit   │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   GITHUB ACTIONS (validation gate, not discovery)                           │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │  7. CI Validation                       - Confirm local results     │   │
│   │  8. Release Builds                      - Multi-platform artifacts  │   │
│   │  9. Deploy Smoke Tests                  - Post-deploy health check  │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Local Testing Commands (Standardized)

Every project should support these commands:

| Command | Purpose | When to Run |
| ------- | ------- | ----------- |
| `npm run test:unit` | Unit tests (watch) | During development |
| `npm run test:unit:run` | Unit tests (once) | Before commit |
| `npm run lint` | Lint check | Before commit |
| `npm run typecheck` | TypeScript check | Before commit |
| `npm run test:e2e` | Playwright E2E | Before push |
| `npm run test:security` | Security scan | Before push |
| `npm run test:all` | Full test suite | Before PR |

**PHP Projects (WG Admin, DemoCRM):**

| Command | Purpose | When to Run |
| ------- | ------- | ----------- |
| `composer test` | PHPUnit tests | Before commit |
| `composer lint` | PHP CS Fixer / PHPStan | Before commit |
| `composer security` | Security checker | Before push |

### Security Testing (Local)

**JavaScript/TypeScript Projects:**
```bash
# package.json scripts
{
  "scripts": {
    "test:security": "npm audit --audit-level=high && npx snyk test",
    "test:security:fix": "npm audit fix"
  }
}
```

**PHP Projects:**
```bash
# composer.json scripts
{
  "scripts": {
    "security": "composer audit && ./vendor/bin/security-checker security:check"
  }
}
```

**Tools by Category:**

| Category | Tool | Purpose |
| -------- | ---- | ------- |
| Dependency audit | `npm audit`, `composer audit` | Known vulnerabilities |
| Deep scan | Snyk, Trivy | CVE database check |
| SAST | Semgrep, PHPStan | Static code analysis |
| Secrets | git-secrets, trufflehog | Prevent credential leaks |

### Pre-Push Hook (Enforces Local Testing)

```bash
#!/bin/bash
# .githooks/pre-push

echo "Running pre-push checks..."

# Unit tests
npm run test:unit:run || exit 1

# Lint
npm run lint || exit 1

# Type check (if TypeScript)
npm run typecheck 2>/dev/null || true

# Security scan
npm run test:security || exit 1

# E2E (optional - can be slow)
# npm run test:e2e || exit 1

echo "All checks passed!"
```

Enable: `git config core.hooksPath .githooks`

### Deployment Testing Workflow

**Gap that unit/E2E tests don't cover:**
- Server configuration errors
- Environment variable mismatches
- Database migration failures
- Permission/file path issues
- Service connectivity (API endpoints, DB connections)
- SSL/TLS configuration

**Solution: Health Endpoints + Smoke Tests**

1. **Health endpoint** in each app:
   ```typescript
   // Quasar: src/api/health.ts or server middleware
   // PHP: /api/health.php
   {
     "status": "ok",
     "version": "1.0.8",
     "database": "connected",
     "timestamp": "2026-01-19T12:00:00Z"
   }
   ```

2. **Post-deploy smoke script (local):**
   ```bash
   #!/bin/bash
   # scripts/smoke-test.sh

   ENDPOINTS=(
     "https://app.example.com/api/health"
     "https://app.example.com/"
   )

   for url in "${ENDPOINTS[@]}"; do
     status=$(curl -s -o /dev/null -w "%{http_code}" "$url")
     if [ "$status" != "200" ]; then
       echo "FAIL: $url returned $status"
       exit 1
     fi
     echo "OK: $url"
   done
   ```

3. **GitHub Action (minimal - just validation):**
   ```yaml
   # .github/workflows/ci.yml
   name: CI
   on: [push, pull_request]
   jobs:
     validate:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-node@v4
           with: { node-version: '20' }
         - run: npm ci
         - run: npm run lint
         - run: npm run typecheck
         - run: npm run test:unit:run
         # E2E runs locally before push, not here (saves minutes)
   ```

### Cost Optimization for Private Repos

| Action | Minutes/Month (est) | Strategy |
| ------ | ------------------- | -------- |
| Unit tests | ~50 | Keep, fast |
| Lint/typecheck | ~30 | Keep, fast |
| E2E tests | ~200+ | Run locally, skip in CI |
| Build artifacts | ~100 | Only on release tags |
| Security scans | ~5 | Weekly scheduled + on dependency changes |

**Savings:** Run E2E and heavy tests locally. CI just validates unit + lint.

### Security Scan Workflow

**Location:** `.github/workflows/security-scan.yml`

**Triggers:**
- Weekly (Monday 9am UTC) - catches new CVEs
- On PRs that modify `package.json` or `package-lock.json`
- Manual via workflow_dispatch

**Behavior:**
- Runs `npm audit`
- Generates summary report in GitHub Actions
- Only **fails on critical** vulnerabilities (not high/moderate)
- Keeps costs low (~5 min/week)
