# GitHub Features Checklist

Free GitHub features to improve the Qepton development workflow.

> **Issue Tracking:** See [GITHUB-ISSUES-PREVIEW.md](./GITHUB-ISSUES-PREVIEW.md) for full issue details.

## 1. Issue & PR Management

- [x] **Issue Templates** - Standardized bug reports, feature requests (`.github/ISSUE_TEMPLATE/`)
  - [x] Bug report template (`bug_report.yml`)
  - [x] Feature request template (`feature_request.yml`)
  - [x] Config file (`config.yml`)
- [x] **PR Template** - Consistent pull request descriptions (`.github/PULL_REQUEST_TEMPLATE.md`)
- [ ] **Discussions** - Community Q&A, announcements, ideas → **Issue #2**
- [x] **Labels & Milestones** - Organize and track progress (built-in)

## 2. Automation (GitHub Actions)

- [x] **CI/CD** - Build, test, lint on every push/PR
  - [x] Unit tests workflow (`test.yml`)
  - [x] Release workflow (`release.yml`)
  - [x] Deploy pages workflow (`deploy-pages.yml`)
  - [x] Flatpak build (`flatpak.yml`)
  - [x] Snap build (`snap.yml`)
  - [x] Cleanup workflow (`cleanup.yml`)
  - [x] Copy issue to dev (`copy-issue-to-dev.yml`)
- [ ] **Auto-labeling** - Label PRs by files changed
- [ ] **Stale issue bot** - Auto-close inactive issues → **Issue #5**
- [ ] **Welcome bot** - Greet first-time contributors → **Issue #14**
- [x] **Release automation** - Auto-generate changelogs (in `release.yml`)

## 3. Security

- [ ] **Dependabot** - Auto-update dependencies, security alerts → **Issue #1**
  - [ ] Enable vulnerability alerts
  - [ ] Configure `dependabot.yml` for auto-updates
- [ ] **Code Scanning** - CodeQL finds vulnerabilities in code → **Issue #6**
- [ ] **Secret Scanning** - Detects exposed tokens/keys → **Issue #15**
- [ ] **Dependency Graph** - Visualize all dependencies → **Issue #16**

## 4. Project Management

- [x] **Projects Enabled** - Kanban-style task tracking available
- [ ] **Project Board** - Create board for tracking development
- [ ] **Milestones** - Set up version milestones
- [ ] **Roadmap View** - Timeline views for planning

## 5. Community & Documentation

- [ ] **CONTRIBUTING.md** - Contribution guidelines → **Issue #4**
- [ ] **CODE_OF_CONDUCT.md** - Community standards
- [ ] **SECURITY.md** - Vulnerability reporting policy → **Issue #3**
- [ ] **GitHub Pages** - Documentation site → **Issue #40** (user docs)

## Quick Wins (Priority)

| Feature              | Status  | Effort   | Impact | Issue |
| -------------------- | ------- | -------- | ------ | ----- |
| Enable Dependabot    | Pending | Minutes  | High   | #1    |
| Enable Discussions   | Pending | Minutes  | Medium | #2    |
| Add stale bot        | Pending | Hour     | Medium | #5    |
| Add CONTRIBUTING.md  | Pending | Hour     | Medium | #4    |
| Add SECURITY.md      | Pending | 30 min   | Medium | #3    |
| Set up Code Scanning | Pending | Hour     | High   | #6    |

## Notes

- Dependabot is free for public repos, uses Actions minutes for private repos
- Code scanning with CodeQL is free for public repos
- Discussions can reduce noise in issue tracker by separating questions from bugs

---

*Last updated: January 2026*
