# Qepton Model Template Plan

A template for bootstrapping projects using the Qepton multi-repository model with Claude Code.

**Status:** Partially Implemented
**Created:** 2026-01-21
**Updated:** 2026-01-21

---

## Decisions (Approved 2026-01-21)

| Question | Decision | Status |
| -------- | -------- | ------ |
| Migrate to Organization | **Yes** - Created `whizbangdevelopers-org` (kept user account separate) | ✅ Done |
| Sub-Issues Migration | **Yes** - Restructure existing issues under release parents | ✅ Done |
| Dependabot Ignore Patterns | **Yes** - Add Quasar/Electron major version ignores | ✅ Done |
| Template Repository | **Yes** - Create GitHub Template Repository | Pending |
| Plugins Visibility | **One Public + Additional Private/Premium** | Pending |

---

## Executive Summary

This document outlines lessons learned from Qepton and proposes a "one prompt" template for bootstrapping similar projects. The goal is to front-load infrastructure setup that was done retroactively in Qepton.

---

## Current Pain Points (Lessons Learned)

### 1. Infrastructure Done Retroactively
Phase 1 infrastructure (Dependabot, CodeQL, SECURITY.md, etc.) should have been automated at repo creation, not added later as 28+ issues.

### 2. Token Workflow
GitHub tokens and OAuth app credentials were configured "on the fly" rather than having a documented setup workflow from day one.

### 3. Organization vs Personal Account
Should have created `whizbangdevelopers` as a GitHub Organization from the start, not a user account. Organizations provide:
- Team management
- Better permission controls
- Organization-level secrets
- Project boards spanning repos

### 4. Gist Ownership (Organization Migration Impact)
**Note:** GitHub Gists are tied to user accounts, not organizations. For Qepton, there were no existing gists under the user account, so this was not a concern. For future projects, consider:
- Creating a dedicated user account for demo gists (e.g., `{project}-demos`)
- Using CI badge gists under a service account
- Hosting demo content as repository files instead of gists

### 5. Dependabot Noise
Dependabot PRs need filtering - particularly for Quasar ecosystem dependencies that should wait for upstream guidance.

### 6. Release-Centric Roadmap
Post-MVP, the execution roadmap should be organized by releases (v1.1, v1.2, etc.) with milestones containing sub-issues, not flat phase-based groupings.

---

## GitHub Sub-Issues Capability

**Good news:** GitHub now supports native sub-issues (as of 2025, enhanced January 2026):

| Feature | Capability |
| ------- | ---------- |
| Nesting depth | Up to 8 levels |
| Sub-issues per parent | Up to 50 |
| Cross-repo | Yes |
| Hierarchy view in Projects | Yes (January 2026) |
| Inline creation | Coming soon |
| Drag-and-drop reordering | Coming soon |

### Can Qepton Use This Now?

**Yes.** You can restructure the roadmap to use sub-issues:

```
Release v1.1.0 (Parent Issue)
├── [Sub] Snap package for Ubuntu (#3)
├── [Sub] Pacman package for Arch (#2)
├── [Sub] macOS pkg installer (#19)
└── [Sub] Windows MSI installer (#21)

Release v1.2.0 (Parent Issue)
├── [Sub] OAuth authentication (#16)
├── [Sub] PKCE security implementation (#54)
└── [Sub] GitLab OAuth research (#52)
```

This replaces the current flat milestone structure with hierarchical tracking.

---

## Proposed Template Structure

### Repository Model

| Repository | Visibility | Purpose |
| ---------- | ---------- | ------- |
| `{project}` | Public | Release repo, user-facing issues |
| `{project}-Dev` | Private | Development, all work tracked here |
| `{project}-Premium` | Private | Premium features (if applicable) |
| `{project}-Plugins` | Public | Community plugins, open ecosystem |
| `{project}-Plugins-Premium` | Private | Premium/proprietary plugins (if applicable) |

### Day-Zero Infrastructure (Automated at Creation)

These should be configured via GitHub CLI or API immediately when repos are created:

```bash
# Template: repo-setup.sh
REPO="org/repo-name"

# Security features
gh api repos/$REPO --method PATCH \
  -f security_and_analysis.secret_scanning.status=enabled \
  -f security_and_analysis.secret_scanning_push_protection.status=enabled
gh api repos/$REPO/vulnerability-alerts --method PUT
gh api repos/$REPO/automated-security-fixes --method PUT

# Create standard files via API
# - .github/dependabot.yml
# - .github/workflows/codeql.yml
# - .github/workflows/stale.yml
# - SECURITY.md
# - (Public only) CONTRIBUTING.md, .github/FUNDING.yml
```

### Day-Zero Token/Credential Setup

Create documented setup before first commit:

1. **GitHub OAuth App** (for apps needing GitHub auth)
   - Create OAuth app in org settings
   - Store credentials in documented location
   - Document redirect URIs for each platform

2. **Repository Secrets**
   - `GITHUB_TOKEN` (auto-provided)
   - App-specific secrets documented

3. **Local Development**
   - `.env.example` with all required variables
   - `~/.{app}rc` pattern for credentials (like `.leptonrc`)

---

## Dependabot Filtering Strategy

### Problem
Quasar ecosystem updates often need to wait for upstream compatibility testing.

### Solution: Ignore Patterns in dependabot.yml

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    groups:
      minor-and-patch:
        patterns: ["*"]
        update-types: ["minor", "patch"]
    ignore:
      # Quasar ecosystem - wait for upstream guidance
      - dependency-name: "quasar"
        update-types: ["version-update:semver-major"]
      - dependency-name: "@quasar/*"
        update-types: ["version-update:semver-major"]
      # Electron - requires compatibility testing
      - dependency-name: "electron"
        update-types: ["version-update:semver-major"]
      - dependency-name: "electron-builder"
        update-types: ["version-update:semver-major"]
```

### Additional Filtering: Labels + Branch Protection

1. Add custom label `quasar-ecosystem` to Dependabot PRs for Quasar deps
2. Use GitHub Actions to auto-label based on package name
3. Create saved filter in Projects board: `label:dependencies -label:quasar-ecosystem`

---

## Release-Centric Roadmap Structure

### Current Structure (Phase-Based)
```
Phase 1: Foundation
  ├── Milestone: 1.1 GitHub Infrastructure
  └── Milestone: 1.2 Packaging
Phase 2: Marketing
  └── Milestone: 2.1 Marketing
...
```

### Proposed Structure (Release-Based with Sub-Issues)

**Key principle:** External submissions (📤) should be their own releases, not bundled with internal work. External stores have independent approval timelines we don't control.

```
Pre-Release Infrastructure (one-time, automated)
  └── All infrastructure issues closed at repo creation

v1.0.0 - MVP Release ✓ (already done)

v1.1.0 - Internal Packaging (Parent Issue)
  ├── [Sub] macOS PKG installer (#19)
  ├── [Sub] Windows MSI installer (#21)
  └── [Sub] Windows portable EXE (#23)

v1.1.1 - 📤 Snap Store Submission (Parent Issue)
  └── [Sub] Snap package for Ubuntu (#3)

v1.1.2 - 📤 AUR Submission (Parent Issue)
  └── [Sub] Pacman package for Arch (#2)

v1.1.3 - 📤 NixOS Submission (Parent Issue)
  └── [Sub] NixOS package (#24)

v1.2.0 - OAuth & GitLab (Parent Issue)
  ├── [Sub] OAuth implementation (#16)
  ├── [Sub] PKCE security (#54)
  └── [Sub] GitLab adapter (#11)

v1.3.0 - 📤 Mac App Store (Parent Issue)
  └── [Sub] Mac App Store submission (#20)

v1.4.0 - 📤 Windows Store (Parent Issue)
  └── [Sub] Windows Store AppX (#22)

v2.0.0 - Mobile (Parent Issue)
  ├── [Sub] Capacitor setup (#15)
  ├── [Sub] iOS build
  ├── [Sub] Android build
  └── [Sub] Mobile testing infrastructure
```

### External Submission Release Pattern

Each 📤 external submission gets its own release because:
1. **Independent timelines** - Store reviews can take days/weeks
2. **Rejection cycles** - May require multiple submission attempts
3. **Parallel work** - Don't block internal releases on external approvals
4. **Clear tracking** - Easy to see which stores are pending/approved

### Migration Path for Qepton

1. Create parent issues for each release version
2. Link existing issues as sub-issues to the appropriate release
3. Keep milestones for high-level filtering (optional)
4. Use Projects Hierarchy View for visualization

---

## One-Prompt Bootstrap Template

### The Prompt

```markdown
# Project Bootstrap: {PROJECT_NAME}

Create a multi-repo project with the Qepton model:

## Repositories
- {project} (public) - Release repo
- {project}-Dev (private) - Development hub
- {project}-Premium (private) - Premium features
- {project}-Plugins (private) - Plugin ecosystem

## Organization
- Create as GitHub Organization: {org-name}
- Add initial team member: {username}

## Day-Zero Infrastructure (all repos)
1. Enable secret scanning + push protection
2. Enable vulnerability alerts
3. Enable automated security fixes
4. Add dependabot.yml (Dev repo only, with Quasar ignore patterns)
5. Add codeql.yml workflow
6. Add stale.yml workflow
7. Add SECURITY.md

## Day-Zero Infrastructure (public repo only)
1. Add CONTRIBUTING.md
2. Add .github/FUNDING.yml
3. Enable Discussions
4. Configure topics for discoverability

## OAuth Setup (if applicable)
1. Create OAuth App: {app-name}
2. Redirect URIs: [list platforms]
3. Store in org secrets

## Initial Roadmap Structure
Create release parent issues with sub-issues:
- v1.0.0 MVP: [list features]
- v1.1.0: [list features]
- v1.2.0: [list features]

## CLAUDE.md
Generate CLAUDE.md for Dev repo with:
- Repository aliases
- Canonical identifiers
- Build commands
- Architecture overview
```

---

## Organization Migration Plan

### Completed Migration

The organization `whizbangdevelopers-org` has been created and repositories transferred.

| Item | Status |
| ---- | ------ |
| Create `whizbangdevelopers-org` organization | ✅ Done |
| Transfer repositories to org | ✅ Done |
| Update CLAUDE.md with new paths | ✅ Done |

**Note:** No gists existed under the original user account, so gist migration was not needed.

### CI Badge Gist Setup

CI test badges are hosted under the `whizbangdevelopers-user` account:

| Item | Value |
| ---- | ----- |
| Account | [whizbangdevelopers-user](https://github.com/whizbangdevelopers-user) |
| Gist ID | `a129d60da2b3f8f57b6a578bf7347eef` |
| Badge Files | `vitest-badge.json`, `playwright-badge.json` |

Configure these secrets in **dev** repo:
- `GIST_TOKEN` → PAT from whizbangdevelopers-user with gist scope
- `TEST_BADGE_GIST_ID` → `a129d60da2b3f8f57b6a578bf7347eef`

### URL Redirects

GitHub automatically redirects old URLs (`whizbangdevelopers/*`) to the new org (`whizbangdevelopers-org/*`). App IDs remain unchanged (`com.whizbangdevelopers.qepton`).

---

## Implementation Checklist

### Phase A: Organization Migration (Qepton-specific)
- [x] Create GitHub Organization `whizbangdevelopers-org`
- [x] Transfer all repositories to organization
- [x] Update CLAUDE.md with new org paths
- [x] Set up CI badge gist (qepton-demo account, gist ID: `7c37dbc5b054813a1e344e5cd77873e7`)

### Phase B: Issue Restructuring (Qepton-specific)
- [x] Create release parent issues (v1.1.0, v1.2.0, v1.3.0, v2.0.0)
- [x] Link existing issues as sub-issues to releases (via GitHub API)
- [x] Update dependabot.yml with Quasar/Electron ignore patterns
- [x] Document the sub-issues workflow in REPO-INFRASTRUCTURE.md

### Phase C: Template Repository (Reusable)
- [ ] Create `qepton-project-template` repository
- [ ] Create `project-bootstrap.sh` script
- [ ] Create template CLAUDE.md generator
- [ ] Create template dependabot.yml with framework-aware ignore patterns
- [ ] Document the one-prompt workflow
- [ ] Mark repository as GitHub Template

---

## Sources

- [GitHub Sub-Issues Announcement](https://github.blog/engineering/architecture-optimization/introducing-sub-issues-enhancing-issue-management-on-github/)
- [GitHub Issues Features](https://github.com/features/issues)
- [Hierarchy View Changelog (January 2026)](https://github.blog/changelog/2026-01-15-hierarchy-view-now-available-in-github-projects/)
- [GitHub Docs: Adding Sub-Issues](https://docs.github.com/en/issues/managing-your-tasks-with-tasklists/using-projects-and-tasklists)
