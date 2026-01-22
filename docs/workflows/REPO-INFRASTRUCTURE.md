# Repository Infrastructure Checklist

When setting up new repositories or ensuring consistency across the Qepton repository family, use this checklist to ensure all standard infrastructure is in place.

## Infrastructure by Repository Type

| Item                     | Free | Dev | Premium | Plugins | Notes |
| ------------------------ | ---- | --- | ------- | ------- | ----- |
| `.github/dependabot.yml` | No   | Yes | No      | No      | Dev only - all repos sync from Dev |
| Dependabot badge         | Yes  | No  | No      | No      | Marketing badge in README linking to Dev |
| `SECURITY.md`            | Yes  | Yes | Yes     | Yes     | Vulnerability reporting policy |
| `CONTRIBUTING.md`        | Yes  | No  | No      | No      | Public repos only |
| `.github/workflows/stale.yml` | Yes | Yes | Yes  | Yes     | Auto-close inactive issues |
| `.github/workflows/codeql.yml` | Yes | Yes | Yes | Yes     | Security scanning |
| `.github/workflows/welcome.yml` | Yes | No | No   | No      | Public repos only |
| `.github/FUNDING.yml`    | Yes  | No  | No      | No      | Public repos only |
| Secret scanning          | Yes  | Yes | Yes     | Yes     | Enable in repo settings |
| Push protection          | Yes  | Yes | Yes     | Yes     | Enable in repo settings |
| Dependency graph         | Yes  | Yes | Yes     | Yes     | Enable in repo settings |
| Vulnerability alerts     | Yes  | Yes | Yes     | Yes     | Enable in repo settings |
| Automated security fixes | Yes  | Yes | Yes     | Yes     | Enable in repo settings |
| GitHub Discussions       | Yes  | No  | No      | No      | Public repos only |
| Topics (discoverability) | Yes  | No  | No      | No      | Public repos only |

## Dependabot Configuration

**Note:** Only Dev repo has dependabot.yml. Free displays a badge linking to Dev's Dependabot for marketing. Premium and Plugins don't need Dependabot since they sync from Dev.

Standard `dependabot.yml` for Dev repo only:

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
    groups:
      minor-and-patch:
        patterns:
          - "*"
        update-types:
          - "minor"
          - "patch"
    commit-message:
      prefix: "deps"

  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
    commit-message:
      prefix: "ci"
```

## Dependabot Badge (Free Repo Only)

For marketing purposes, Free repo displays a Dependabot badge that links to Dev's dependency updates:

```markdown
[![Dependabot](https://img.shields.io/badge/Dependabot-enabled-025E8C?logo=dependabot)](https://github.com/whizbangdevelopers/Qepton-Dev/network/updates)
```

This provides the marketing benefit without the operational issues of having Dependabot PRs on the release repo.

## Dependabot PR Review Process

Before merging Dependabot PRs, especially for major version upgrades:

### Quick Merge (No Review Needed)
- GitHub Actions updates (workflow dependencies)
- Minor/patch version bumps for stable dependencies

### Review Required
For major version bumps of core dependencies, check upstream compatibility:

1. **Quasar Framework**
   - [Quasar GitHub Releases](https://github.com/quasarframework/quasar/releases)
   - [Quasar Discord](https://chat.quasar.dev) - community discussion on upgrades
   - Check if Quasar's templates/docs have updated to the new version

2. **Vue Ecosystem**
   - Pinia, Vue Router, etc. - verify Quasar compatibility first
   - Check Quasar's `package.json` peer dependencies

3. **Build Tools**
   - Vite, esbuild, electron-builder - test build before merging
   - These can break builds silently

### Defer When
- Quasar hasn't published guidance for the upgrade
- Breaking changes require code modifications
- The upgrade affects multiple related packages (upgrade together)

See [DEPENDABOT-RESOLUTION.md](../planning/DEPENDABOT-RESOLUTION.md) for an example of categorizing and processing Dependabot PRs.

## Build Tool Testing

Before merging build tool updates (Vite, esbuild, electron-builder, Electron), run these verification tests:

### Test Commands

| Package | Test Commands | What to Verify |
| ------- | ------------- | -------------- |
| Vite/esbuild | `npm run build` | SPA builds without errors |
| Vite/esbuild | `npm run dev` | Dev server starts, HMR works |
| electron-builder | `npm run build:electron` | Desktop packages created |
| Electron | `npm run dev:electron` | App launches, window renders |
| Electron | Test IPC calls | Main/renderer communication works |
| Capacitor | `npx cap sync` | Mobile config syncs |

### Full Build Verification

For major build tool updates, run the complete build matrix:

```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# Test all builds
npm run build           # SPA
npm run build:pwa       # PWA
npm run build:electron  # Electron (all platforms if possible)

# Run tests
npm run test:unit:run   # Unit tests
npm run lint            # Linting still works
```

### Electron-Specific Checks

When upgrading Electron major versions:

1. **Check Quasar compatibility** - Quasar's electron mode may have version constraints
2. **Review breaking changes** - [Electron Breaking Changes](https://www.electronjs.org/docs/latest/breaking-changes)
3. **Test platform-specific features**:
   - Auto-updater (`electron-updater`)
   - Native menus and dialogs
   - File system access
   - IPC communication

### Rollback Plan

If a build tool update breaks the build:

1. Revert the package.json and package-lock.json changes
2. Run `npm install` to restore previous state
3. Document the failure in a GitHub issue for later investigation

## Stale Bot Configuration

Standard `stale.yml` for all repos:

- **Stale after:** 60 days of inactivity
- **Close after:** 14 additional days
- **Exempt labels:** `pinned`, `security`, `blocked`, `in-progress`
- **Exempt assignees:** Yes (assigned issues won't go stale)

## CodeQL Configuration

Standard `codeql.yml` for all repos:

- **Triggers:** Push to main, PRs to main, weekly schedule (Sundays 1am UTC)
- **Languages:** `javascript-typescript`
- **Queries:** `security-extended`, `security-and-quality`

## Enabling Security Features via API

Use these commands to enable security features for a repository:

```bash
REPO="whizbangdevelopers/REPO_NAME"

# Enable secret scanning and push protection
gh api repos/$REPO --method PATCH \
  -f security_and_analysis.secret_scanning.status=enabled \
  -f security_and_analysis.secret_scanning_push_protection.status=enabled

# Enable vulnerability alerts
gh api repos/$REPO/vulnerability-alerts --method PUT

# Enable automated security fixes
gh api repos/$REPO/automated-security-fixes --method PUT
```

## Creating Files via API

When you don't have the repo cloned locally, create files via the GitHub API:

```bash
REPO="whizbangdevelopers/REPO_NAME"
FILE_PATH=".github/dependabot.yml"
CONTENT="... file content ..."

gh api repos/$REPO/contents/$FILE_PATH \
  --method PUT \
  -f message="Add Dependabot configuration" \
  -f content="$(echo "$CONTENT" | base64 -w 0)"
```

## Issue Tracking

When implementing infrastructure across repos, create tracking issues in the Dev repo with prefixes:

- `[Free]` - Infrastructure for Free repo
- `[Dev]` - Infrastructure for Dev repo
- `[Premium]` - Infrastructure for Premium repo
- `[Plugins]` - Infrastructure for Plugins repo

All issues should be assigned to milestone `1.1 GitHub Infrastructure`.

## GitHub Sub-Issues Workflow

GitHub now supports native sub-issues for hierarchical issue tracking. Use this structure for release-centric roadmap organization.

### Sub-Issues Structure

```
Release v1.1.0 (Parent Issue)
├── [Sub] Feature A (#123)
├── [Sub] Feature B (#124)
└── [Sub] Bug fix C (#125)
```

### Creating Sub-Issues

1. **Create parent issue** for the release (e.g., "Release v1.1.0")
2. **Link existing issues** as sub-issues using the "Add sub-issue" button
3. **Or create inline** from the parent issue's sub-issues section

### Sub-Issues Capabilities

| Feature              | Capability              |
| -------------------- | ----------------------- |
| Nesting depth        | Up to 8 levels          |
| Sub-issues per parent| Up to 50                |
| Cross-repo           | Yes                     |
| Hierarchy view       | Yes (in Projects)       |

### Release-Based Organization

Organize roadmap by releases instead of flat phases:

```
v1.1.0 - Internal Packaging (Parent)
├── macOS PKG installer
├── Windows MSI installer
└── Windows portable EXE

v1.2.0 - OAuth & GitLab (Parent)
├── OAuth implementation
├── PKCE security
└── GitLab adapter
```

### External Submissions Pattern

External store submissions get their own releases due to independent approval timelines:

```
v1.1.1 - 📤 Snap Store Submission
v1.1.2 - 📤 AUR Submission
v1.3.0 - 📤 Mac App Store
```

This prevents blocking internal work on external review cycles.

### References

- [GitHub Sub-Issues Announcement](https://github.blog/engineering/architecture-optimization/introducing-sub-issues-enhancing-issue-management-on-github/)
- [GitHub Docs: Using Projects and Tasklists](https://docs.github.com/en/issues/managing-your-tasks-with-tasklists/using-projects-and-tasklists)

---

## Verification Checklist

After setting up infrastructure, verify:

- [ ] Dependabot PRs appear for outdated dependencies
- [ ] CodeQL runs on push/PR to main
- [ ] Stale bot marks old issues correctly
- [ ] Secret scanning alerts work (test with a fake token pattern)
- [ ] Dependency graph shows in Insights tab
