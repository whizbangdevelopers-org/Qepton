# Execution Roadmap

Master tracking document for all Qepton issues across repositories with prioritization and phased execution plan.

**Generated:** 2026-01-20
**Total Open Issues:** 90 (12 Free, 78 Dev, 0 Premium, 0 Plugins)

---

## Quick Links

| Repository | Issues | Link |
| ---------- | ------ | ---- |
| Qepton (Free) | 12 | [View Issues](https://github.com/whizbangdevelopers/Qepton/issues) |
| Qepton-Dev | 78 | [View Issues](https://github.com/whizbangdevelopers/Qepton-Dev/issues) |
| Qepton-Premium | 0 | All issues moved to Dev with [Premium] prefix |
| Qepton-Plugins | 0 | All issues moved to Dev with [Plugin] prefix |

---

## Issue Organization

**Dev repo is the single source of truth for all development work.**

- **Free repo** contains only user-facing feature requests (from README)
- **Dev repo** contains ALL development work with prefixes indicating target:
  - `[Free]` - Work targeting Free repo (infrastructure, marketing, features)
  - `[Premium]` - Work targeting Premium repo
  - `[Plugin]` - Work targeting Plugin ecosystem
- Labels: `free-infra`, `premium`, `plugin` for filtering

---

## Phase 1: Foundation (Quick Wins)

Low-effort, high-impact items to establish project infrastructure.

### GitHub Infrastructure (Free Repo)

| # | Issue | Effort | Impact |
|---|-------|--------|--------|
| [Dev #36](https://github.com/whizbangdevelopers/Qepton-Dev/issues/36) | [Free] Enable Dependabot | Low | Security |
| [Dev #38](https://github.com/whizbangdevelopers/Qepton-Dev/issues/38) | [Free] Enable GitHub Discussions | Low | Community |
| [Dev #37](https://github.com/whizbangdevelopers/Qepton-Dev/issues/37) | [Free] Add SECURITY.md | Low | Security |
| [Dev #39](https://github.com/whizbangdevelopers/Qepton-Dev/issues/39) | [Free] Add CONTRIBUTING.md | Low | Community |
| [Dev #40](https://github.com/whizbangdevelopers/Qepton-Dev/issues/40) | [Free] Configure stale issue bot | Low | Maintenance |
| [Dev #41](https://github.com/whizbangdevelopers/Qepton-Dev/issues/41) | [Free] Set up CodeQL scanning | Low | Security |
| [Dev #42](https://github.com/whizbangdevelopers/Qepton-Dev/issues/42) | [Free] Optimize repo discoverability | Low | Marketing |
| [Dev #49](https://github.com/whizbangdevelopers/Qepton-Dev/issues/49) | [Free] Add welcome bot | Low | Community |
| [Dev #50](https://github.com/whizbangdevelopers/Qepton-Dev/issues/50) | [Free] Enable secret scanning | Low | Security |
| [Dev #51](https://github.com/whizbangdevelopers/Qepton-Dev/issues/51) | [Free] Enable dependency graph | Low | Security |

### GitHub Infrastructure (Dev Repo)

| # | Issue | Effort | Impact |
|---|-------|--------|--------|
| [Dev #71](https://github.com/whizbangdevelopers/Qepton-Dev/issues/71) | [Dev] Enable Dependabot | Low | Security |
| [Dev #72](https://github.com/whizbangdevelopers/Qepton-Dev/issues/72) | [Dev] Configure stale issue bot | Low | Maintenance |
| [Dev #73](https://github.com/whizbangdevelopers/Qepton-Dev/issues/73) | [Dev] Set up CodeQL scanning | Low | Security |
| [Dev #74](https://github.com/whizbangdevelopers/Qepton-Dev/issues/74) | [Dev] Enable secret scanning | Low | Security |
| [Dev #75](https://github.com/whizbangdevelopers/Qepton-Dev/issues/75) | [Dev] Enable dependency graph | Low | Security |
| [Dev #76](https://github.com/whizbangdevelopers/Qepton-Dev/issues/76) | [Dev] Add SECURITY.md | Low | Security |

### GitHub Infrastructure (Premium Repo)

| # | Issue | Effort | Impact |
|---|-------|--------|--------|
| [Dev #77](https://github.com/whizbangdevelopers/Qepton-Dev/issues/77) | [Premium] Set up CodeQL scanning | Low | Security |
| [Dev #78](https://github.com/whizbangdevelopers/Qepton-Dev/issues/78) | [Premium] Enable dependency graph | Low | Security |
| [Dev #79](https://github.com/whizbangdevelopers/Qepton-Dev/issues/79) | [Premium] Configure stale issue bot | Low | Maintenance |
| [Dev #80](https://github.com/whizbangdevelopers/Qepton-Dev/issues/80) | [Premium] Add SECURITY.md | Low | Security |
| [Dev #81](https://github.com/whizbangdevelopers/Qepton-Dev/issues/81) | [Premium] Enable Dependabot | Low | Security |
| [Dev #82](https://github.com/whizbangdevelopers/Qepton-Dev/issues/82) | [Premium] Enable secret scanning | Low | Security |

### GitHub Infrastructure (Plugins Repo)

| # | Issue | Effort | Impact |
|---|-------|--------|--------|
| [Dev #83](https://github.com/whizbangdevelopers/Qepton-Dev/issues/83) | [Plugins] Set up CodeQL scanning | Low | Security |
| [Dev #84](https://github.com/whizbangdevelopers/Qepton-Dev/issues/84) | [Plugins] Enable secret scanning | Low | Security |
| [Dev #85](https://github.com/whizbangdevelopers/Qepton-Dev/issues/85) | [Plugins] Configure stale issue bot | Low | Maintenance |
| [Dev #86](https://github.com/whizbangdevelopers/Qepton-Dev/issues/86) | [Plugins] Enable dependency graph | Low | Security |
| [Dev #87](https://github.com/whizbangdevelopers/Qepton-Dev/issues/87) | [Plugins] Add SECURITY.md | Low | Security |
| [Dev #88](https://github.com/whizbangdevelopers/Qepton-Dev/issues/88) | [Plugins] Enable Dependabot | Low | Security |

### Packaging (Dev Repo)

| # | Issue | Effort | Impact |
|---|-------|--------|--------|
| [Dev #3](https://github.com/whizbangdevelopers/Qepton-Dev/issues/3) | 📤 Snap package for Ubuntu | Low | Distribution |
| [Dev #2](https://github.com/whizbangdevelopers/Qepton-Dev/issues/2) | 📤 Pacman package for Arch | Low | Distribution |
| [Dev #19](https://github.com/whizbangdevelopers/Qepton-Dev/issues/19) | macOS pkg installer | Low | Distribution |
| [Dev #21](https://github.com/whizbangdevelopers/Qepton-Dev/issues/21) | Windows MSI installer | Low | Distribution |
| [Dev #23](https://github.com/whizbangdevelopers/Qepton-Dev/issues/23) | Windows portable EXE | Low | Distribution |

---

## Phase 2: Marketing & Community

Build awareness and community engagement.

### Marketing (Dev Repo - targets Free)

| # | Issue | Effort | Impact |
|---|-------|--------|--------|
| [Dev #43](https://github.com/whizbangdevelopers/Qepton-Dev/issues/43) | [Free] Create product page | Medium | Marketing |
| [Dev #44](https://github.com/whizbangdevelopers/Qepton-Dev/issues/44) | [Free] Set up social media | Low | Marketing |
| [Dev #45](https://github.com/whizbangdevelopers/Qepton-Dev/issues/45) | [Free] Write Dev.to article | Medium | Marketing |
| [Dev #46](https://github.com/whizbangdevelopers/Qepton-Dev/issues/46) | [Free] Create YouTube demo | Medium | Marketing |
| [Dev #47](https://github.com/whizbangdevelopers/Qepton-Dev/issues/47) | [Free] Plan Product Hunt launch | Medium | Marketing |
| [Dev #48](https://github.com/whizbangdevelopers/Qepton-Dev/issues/48) | [Free] Plan Hacker News post | Low | Marketing |

### Release Coordination (Dev Repo)

| # | Issue | Effort | Impact |
|---|-------|--------|--------|
| [Dev #34](https://github.com/whizbangdevelopers/Qepton-Dev/issues/34) | Release package testing | Medium | Quality |
| [Dev #35](https://github.com/whizbangdevelopers/Qepton-Dev/issues/35) | Coordinate release timing | Medium | Marketing |
| [Dev #33](https://github.com/whizbangdevelopers/Qepton-Dev/issues/33) | Create documentation site | Medium | Docs |

---

## Phase 3: Core Features

Major feature development.

### OAuth & Adapters

| # | Issue | Effort | Impact |
|---|-------|--------|--------|
| [Dev #16](https://github.com/whizbangdevelopers/Qepton-Dev/issues/16) | OAuth authentication | Medium | Feature |
| [Dev #54](https://github.com/whizbangdevelopers/Qepton-Dev/issues/54) | [Free] Implement PKCE security | Medium | Security |
| [Dev #52](https://github.com/whizbangdevelopers/Qepton-Dev/issues/52) | [Free] Research GitLab OAuth | Low | Research |
| [Dev #53](https://github.com/whizbangdevelopers/Qepton-Dev/issues/53) | [Free] Research Bitbucket OAuth | Low | Research |
| [Dev #11](https://github.com/whizbangdevelopers/Qepton-Dev/issues/11) | GitLab Snippets adapter | High | Feature |
| [Dev #12](https://github.com/whizbangdevelopers/Qepton-Dev/issues/12) | Bitbucket Snippets adapter | High | Feature |

### Notebook Support (Dev Repo - targets Free)

| # | Issue | Effort | Impact |
|---|-------|--------|--------|
| [Dev #55](https://github.com/whizbangdevelopers/Qepton-Dev/issues/55) | [Free] R Markdown (.Rmd) support | Medium | Feature |
| [Dev #56](https://github.com/whizbangdevelopers/Qepton-Dev/issues/56) | [Free] Quarto (.qmd) support | Medium | Feature |
| [Dev #57](https://github.com/whizbangdevelopers/Qepton-Dev/issues/57) | [Free] Marimo notebook support | Medium | Feature |
| [Dev #58](https://github.com/whizbangdevelopers/Qepton-Dev/issues/58) | [Free] Pluto.jl notebook support | Medium | Feature |

---

## Phase 4: Platform Expansion

Mobile, advanced packaging, testing infrastructure.

### Mobile (Dev Repo)

| # | Issue | Effort | Impact |
|---|-------|--------|--------|
| [Dev #15](https://github.com/whizbangdevelopers/Qepton-Dev/issues/15) | Mobile app via Capacitor | High | Feature |
| [Dev #26](https://github.com/whizbangdevelopers/Qepton-Dev/issues/26) | Playwright mobile profiles | Low | Testing |
| [Dev #27](https://github.com/whizbangdevelopers/Qepton-Dev/issues/27) | Capacitor plugin mocks | Medium | Testing |
| [Dev #28](https://github.com/whizbangdevelopers/Qepton-Dev/issues/28) | Android emulator in Docker | Medium | Testing |
| [Dev #29](https://github.com/whizbangdevelopers/Qepton-Dev/issues/29) | Android test workflow | Medium | CI/CD |
| [Dev #30](https://github.com/whizbangdevelopers/Qepton-Dev/issues/30) | iOS test workflow | Medium | CI/CD |

### Advanced Packaging

| # | Issue | Effort | Impact |
|---|-------|--------|--------|
| [Dev #24](https://github.com/whizbangdevelopers/Qepton-Dev/issues/24) | 📤 NixOS package | Medium | Distribution |
| [Dev #20](https://github.com/whizbangdevelopers/Qepton-Dev/issues/20) | 📤 Mac App Store | High | Distribution |
| [Dev #22](https://github.com/whizbangdevelopers/Qepton-Dev/issues/22) | 📤 Windows Store (AppX) | High | Distribution |

### Testing Infrastructure (Dev Repo)

| # | Issue | Effort | Impact |
|---|-------|--------|--------|
| [Dev #25](https://github.com/whizbangdevelopers/Qepton-Dev/issues/25) | Fix npm vulnerabilities | Medium | Security |
| [Dev #31](https://github.com/whizbangdevelopers/Qepton-Dev/issues/31) | Automated package tests | Medium | Quality |
| [Dev #32](https://github.com/whizbangdevelopers/Qepton-Dev/issues/32) | Visual regression tests | Medium | Quality |
| [Dev #17](https://github.com/whizbangdevelopers/Qepton-Dev/issues/17) | Duplicate issue bot | Low | Maintenance |

### Blocked

| # | Issue | Blocker |
|---|-------|---------|
| [Dev #18](https://github.com/whizbangdevelopers/Qepton-Dev/issues/18) | Electron upgrade | ESM compatibility |

---

## Phase 5: Premium Features

Revenue-generating premium tier.

### Premium Architecture (Dev Repo)

| # | Issue | Effort | Impact |
|---|-------|--------|--------|
| [Dev #59](https://github.com/whizbangdevelopers/Qepton-Dev/issues/59) | [Premium] Decide architecture approach | Medium | Architecture |
| [Dev #60](https://github.com/whizbangdevelopers/Qepton-Dev/issues/60) | [Premium] Define feature list | Low | Planning |
| [Dev #61](https://github.com/whizbangdevelopers/Qepton-Dev/issues/61) | [Premium] Licensing/activation system | High | Revenue |

### Premium Features (Dev Repo)

| # | Issue | Effort | Impact |
|---|-------|--------|--------|
| [Dev #62](https://github.com/whizbangdevelopers/Qepton-Dev/issues/62) | [Premium] Offline sync (mobile) | High | Feature |
| [Dev #63](https://github.com/whizbangdevelopers/Qepton-Dev/issues/63) | [Premium] Biometric authentication | Medium | Feature |
| [Dev #64](https://github.com/whizbangdevelopers/Qepton-Dev/issues/64) | [Premium] iCloud/Drive backup | High | Feature |
| [Dev #65](https://github.com/whizbangdevelopers/Qepton-Dev/issues/65) | [Premium] AI Assist features | High | Feature |
| [Dev #66](https://github.com/whizbangdevelopers/Qepton-Dev/issues/66) | [Premium] Team Sync collaboration | High | Feature |
| [Dev #67](https://github.com/whizbangdevelopers/Qepton-Dev/issues/67) | [Premium] Gitea/Forgejo support | Medium | Feature |
| [Dev #68](https://github.com/whizbangdevelopers/Qepton-Dev/issues/68) | [Premium] Apache Zeppelin support | Medium | Feature |

---

## Phase 6: Plugin Ecosystem

Third-party extensibility.

### Plugin System (Dev Repo)

| # | Issue | Effort | Impact |
|---|-------|--------|--------|
| [Dev #69](https://github.com/whizbangdevelopers/Qepton-Dev/issues/69) | [Plugin] Design plugin architecture | High | Architecture |
| [Dev #70](https://github.com/whizbangdevelopers/Qepton-Dev/issues/70) | [Plugin] Create API documentation | Medium | Docs |

---

## Issue Summary by Repository

### Qepton (Free) - 12 Open Issues

User-facing feature enhancements only.

| Category | Issues |
| -------- | ------ |
| Adapters | #1, #2 (GitLab, Bitbucket) |
| Packaging | #3-9, #13 (Pacman, Snap, PKG, MAS, MSI, AppX, Portable, NixOS) |
| Features | #12, #14 (Mobile, OAuth) |

### Qepton-Dev - 78 Open Issues

Development work including all target repos (Free, Premium, Plugins).

| Category | Issues |
| -------- | ------ |
| [Free] Infrastructure | #36-42, #49-54 (GitHub features, security, marketing) |
| [Dev] Infrastructure | #71-76 (Dependabot, stale bot, CodeQL, secret scanning, dependency graph, SECURITY.md) |
| [Premium] Infrastructure | #77-82 (Dependabot, stale bot, CodeQL, secret scanning, dependency graph, SECURITY.md) |
| [Plugins] Infrastructure | #83-88 (Dependabot, stale bot, CodeQL, secret scanning, dependency graph, SECURITY.md) |
| [Free] Marketing | #43-48 (Product page, social, articles, launches) |
| [Free] Notebooks | #55-58 (R Markdown, Quarto, Marimo, Pluto.jl) |
| [Premium] Architecture | #59-61 (Architecture, features list, licensing) |
| [Premium] Features | #62-68 (Offline sync, biometric, cloud, AI, team, adapters) |
| [Plugin] System | #69-70 (Architecture, API docs) |
| Packaging | #2, #3, #19-24 |
| Features | #11, #12, #15, #16 |
| Testing | #25-32 |
| CI/CD | #17, #29, #30 |
| Release | #33-35 |
| Blocked | #18 |

### Qepton-Premium - 0 Open Issues

All issues moved to Dev with `[Premium]` prefix.

### Qepton-Plugins - 0 Open Issues

All issues moved to Dev with `[Plugin]` prefix.

---

## Free → Dev Issue Mapping

When a user-facing issue from the Free repo is accepted for development, a corresponding Dev issue is created to track the implementation work. This table shows all mappings.

| Free Issue | Description | Dev Issue | Status |
| ---------- | ----------- | --------- | ------ |
| [Free #1](https://github.com/whizbangdevelopers/Qepton/issues/1) | GitLab Snippets adapter | [Dev #11](https://github.com/whizbangdevelopers/Qepton-Dev/issues/11) | Open |
| [Free #2](https://github.com/whizbangdevelopers/Qepton/issues/2) | Bitbucket Snippets adapter | [Dev #12](https://github.com/whizbangdevelopers/Qepton-Dev/issues/12) | Open |
| [Free #3](https://github.com/whizbangdevelopers/Qepton/issues/3) | 📤 Pacman package for Arch | [Dev #2](https://github.com/whizbangdevelopers/Qepton-Dev/issues/2) | Open |
| [Free #4](https://github.com/whizbangdevelopers/Qepton/issues/4) | 📤 Snap package for Ubuntu | [Dev #3](https://github.com/whizbangdevelopers/Qepton-Dev/issues/3) | Open |
| [Free #5](https://github.com/whizbangdevelopers/Qepton/issues/5) | PKG installer for macOS | [Dev #19](https://github.com/whizbangdevelopers/Qepton-Dev/issues/19) | Open |
| [Free #6](https://github.com/whizbangdevelopers/Qepton/issues/6) | 📤 Mac App Store (MAS) | [Dev #20](https://github.com/whizbangdevelopers/Qepton-Dev/issues/20) | Open |
| [Free #7](https://github.com/whizbangdevelopers/Qepton/issues/7) | MSI installer for Windows | [Dev #21](https://github.com/whizbangdevelopers/Qepton-Dev/issues/21) | Open |
| [Free #8](https://github.com/whizbangdevelopers/Qepton/issues/8) | 📤 APPX for Windows Store | [Dev #22](https://github.com/whizbangdevelopers/Qepton-Dev/issues/22) | Open |
| [Free #9](https://github.com/whizbangdevelopers/Qepton/issues/9) | Portable EXE for Windows | [Dev #23](https://github.com/whizbangdevelopers/Qepton-Dev/issues/23) | Open |
| [Free #12](https://github.com/whizbangdevelopers/Qepton/issues/12) | Mobile app via Capacitor | [Dev #15](https://github.com/whizbangdevelopers/Qepton-Dev/issues/15) | Open |
| [Free #13](https://github.com/whizbangdevelopers/Qepton/issues/13) | 📤 NixOS package | [Dev #24](https://github.com/whizbangdevelopers/Qepton-Dev/issues/24) | Open |
| [Free #14](https://github.com/whizbangdevelopers/Qepton/issues/14) | OAuth authentication | [Dev #16](https://github.com/whizbangdevelopers/Qepton-Dev/issues/16) | Open |

**Workflow:** When completing a Dev issue that maps to a Free issue, close both issues together.

---

## Labels Reference

### Dev Repo Labels

| Label | Description |
| ----- | ----------- |
| `free-infra`           | Infrastructure work targeting Free repo |
| `premium`              | Premium tier features |
| `plugin`               | Plugin system development |
| `from-free`            | Issue synced from Free repo |
| `packaging`            | Release packaging |
| `testing`              | Testing infrastructure |
| `ci-cd`                | CI/CD automation |
| `security`             | Security related |
| `marketing`            | Marketing work |
| `release`              | Release process |
| `community`            | Community engagement |
| `external-submission`  | Requires submission to external repo/store (📤) |
| `effort-low`           | Low effort (< 1 day) |
| `effort-medium`        | Medium effort (1-3 days) |
| `effort-high`          | High effort (1+ week) |

---

## Legends

### Effort

| Effort | Description |
| ------ | ----------- |
| Low    | < 1 day, straightforward implementation |
| Medium | 1-3 days, some complexity |
| High   | 1+ week, significant development |

### Icons

| Icon | Meaning |
| ---- | ------- |
| 📤   | External submission required (third-party repo/store) |
