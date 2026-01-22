# GitHub Issues Preview

This document contains all proposed GitHub issues for review before creation.

**Generated:** 2026-01-20
**Last Updated:** 2026-01-20
**Total Issues:** 49 (27 new, 22 already exist)

---

## Repository Summary

| Repository                      | New Issues | Already Exist | Labels                                        |
| ------------------------------- | ---------- | ------------- | --------------------------------------------- |
| whizbangdevelopers/Qepton       | 18         | 4             | free, marketing, community, security, docs    |
| Qepton-Premium                  | 9          | 0             | premium, licensing, mobile                    |
| Qepton-Plugins                  | 2          | 0             | plugin, api                                   |
| Qepton-Dev                      | 12         | 14            | dev-only, testing, ci-cd, release, marketing  |

---

## ⚠️ EXISTING ISSUES (Do Not Duplicate)

The following issues already exist in GitHub and should NOT be created:

### Qepton (Free) - Existing Issues

| # | Existing Issue | GitHub Issue |
|---|---------------|--------------|
| 17 | Implement GitLab Snippets adapter | [#1](https://github.com/whizbangdevelopers/Qepton/issues/1) ✅ |
| 18 | Implement Bitbucket Snippets adapter | [#2](https://github.com/whizbangdevelopers/Qepton/issues/2) ✅ |
| -  | OAuth authentication | [#14](https://github.com/whizbangdevelopers/Qepton/issues/14) ✅ |
| -  | Mobile app via Capacitor | [#12](https://github.com/whizbangdevelopers/Qepton/issues/12) ✅ |

### Qepton-Dev - Existing Issues (14 open)

| #  | Existing Issue | GitHub Issue |
|----|---------------|--------------|
| 38 | Mac App Store build | [Dev #20](https://github.com/whizbangdevelopers/Qepton-Dev/issues/20) ✅ |
| 39 | Windows Store (AppX) build | [Dev #22](https://github.com/whizbangdevelopers/Qepton-Dev/issues/22) ✅ |
| -  | OAuth authentication | [Dev #16](https://github.com/whizbangdevelopers/Qepton-Dev/issues/16) ✅ |
| -  | Electron upgrade blocked | [Dev #18](https://github.com/whizbangdevelopers/Qepton-Dev/issues/18) ✅ |
| -  | GitLab Snippets adapter | [Dev #11](https://github.com/whizbangdevelopers/Qepton-Dev/issues/11) (from Free #1) ✅ |
| -  | Bitbucket Snippets adapter | [Dev #12](https://github.com/whizbangdevelopers/Qepton-Dev/issues/12) (from Free #2) ✅ |
| -  | Mobile app via Capacitor | [Dev #15](https://github.com/whizbangdevelopers/Qepton-Dev/issues/15) (from Free #12) ✅ |
| -  | NixOS package support | [Dev #24](https://github.com/whizbangdevelopers/Qepton-Dev/issues/24) ✅ |
| -  | Pacman package for Arch | [Dev #2](https://github.com/whizbangdevelopers/Qepton-Dev/issues/2) ✅ |
| -  | Snap package for Ubuntu | [Dev #3](https://github.com/whizbangdevelopers/Qepton-Dev/issues/3) ✅ |
| -  | PKG installer for macOS | [Dev #19](https://github.com/whizbangdevelopers/Qepton-Dev/issues/19) ✅ |
| -  | MSI installer for Windows | [Dev #21](https://github.com/whizbangdevelopers/Qepton-Dev/issues/21) ✅ |
| -  | Portable EXE for Windows | [Dev #23](https://github.com/whizbangdevelopers/Qepton-Dev/issues/23) ✅ |
| -  | Duplicate issue detection bot | [Dev #17](https://github.com/whizbangdevelopers/Qepton-Dev/issues/17) ✅ |

---

# QEPTON (FREE) ISSUES

## Issue #1: Enable Dependabot for dependency updates

**Repository:** whizbangdevelopers/Qepton
**Labels:** `free`, `security`
**Priority:** Ease ⭐⭐⭐⭐⭐ | Marketing ⭐⭐⭐ | Sales ⭐ | Cost 💰

### Description

Enable Dependabot to automatically create pull requests for dependency updates and security patches.

### Source

- Documentation: `docs/GITHUB-FEATURES-CHECKLIST.md:55`

### Acceptance Criteria

- [ ] Create `.github/dependabot.yml` configuration
- [ ] Configure npm ecosystem updates (weekly)
- [ ] Enable Dependabot security alerts in repo settings
- [ ] Review and merge first batch of Dependabot PRs

### Implementation

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
```

---

## Issue #2: Enable GitHub Discussions for community

**Repository:** whizbangdevelopers/Qepton
**Labels:** `free`, `community`
**Priority:** Ease ⭐⭐⭐⭐⭐ | Marketing ⭐⭐⭐⭐⭐ | Sales ⭐⭐ | Cost 💰

### Description

Enable GitHub Discussions to provide a space for community Q&A, announcements, feature ideas, and general conversation.

### Source

- Documentation: `docs/GITHUB-FEATURES-CHECKLIST.md:56`

### Acceptance Criteria

- [ ] Enable Discussions in repository settings
- [ ] Create default discussion categories:
  - Announcements (maintainers only)
  - Q&A
  - Ideas
  - Show and Tell
  - General
- [ ] Pin a welcome discussion with guidelines
- [ ] Link to Discussions from README

---

## Issue #3: Add SECURITY.md vulnerability reporting policy

**Repository:** whizbangdevelopers/Qepton
**Labels:** `free`, `security`, `documentation`
**Priority:** Ease ⭐⭐⭐⭐ | Marketing ⭐⭐⭐ | Sales ⭐ | Cost 💰

### Description

Create a SECURITY.md file that explains how to responsibly report security vulnerabilities.

### Source

- Documentation: `docs/GITHUB-FEATURES-CHECKLIST.md:61`

### Acceptance Criteria

- [ ] Create SECURITY.md in repository root
- [ ] Include supported versions table
- [ ] Provide vulnerability reporting instructions
- [ ] Set response time expectations
- [ ] Enable private vulnerability reporting in GitHub settings

### Template

```markdown
# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |

## Reporting a Vulnerability

Please report security vulnerabilities via email to security@whizbangdevelopers.com
or use GitHub's private vulnerability reporting feature.

We will respond within 48 hours and provide updates every 72 hours.
```

---

## Issue #4: Add CONTRIBUTING.md contribution guidelines

**Repository:** whizbangdevelopers/Qepton
**Labels:** `free`, `documentation`, `community`
**Priority:** Ease ⭐⭐⭐⭐ | Marketing ⭐⭐⭐⭐ | Sales ⭐ | Cost 💰

### Description

Create comprehensive contribution guidelines to help new contributors understand how to participate in the project.

### Source

- Documentation: `docs/GITHUB-FEATURES-CHECKLIST.md:60`

### Acceptance Criteria

- [ ] Create CONTRIBUTING.md in repository root
- [ ] Include development setup instructions
- [ ] Document code style and linting requirements
- [ ] Explain PR process and review expectations
- [ ] Link to issue templates and labels

---

## Issue #5: Configure stale issue bot

**Repository:** whizbangdevelopers/Qepton
**Labels:** `free`, `community`
**Priority:** Ease ⭐⭐⭐⭐ | Marketing ⭐⭐ | Sales ⭐ | Cost 💰

### Description

Set up a GitHub Action to automatically label and close stale issues that have been inactive for an extended period.

### Source

- Documentation: `docs/GITHUB-FEATURES-CHECKLIST.md:58`

### Acceptance Criteria

- [ ] Create `.github/workflows/stale.yml`
- [ ] Configure 60-day inactivity threshold for stale label
- [ ] Configure 7-day close warning period
- [ ] Exempt issues with specific labels (pinned, security, help-wanted)
- [ ] Add friendly stale/close messages

### Implementation

```yaml
name: 'Close stale issues'
on:
  schedule:
    - cron: '0 0 * * *'

jobs:
  stale:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/stale@v9
        with:
          stale-issue-message: 'This issue has been inactive for 60 days...'
          days-before-stale: 60
          days-before-close: 7
          exempt-issue-labels: 'pinned,security,help-wanted'
```

---

## Issue #6: Set up CodeQL code scanning

**Repository:** whizbangdevelopers/Qepton
**Labels:** `free`, `security`
**Priority:** Ease ⭐⭐⭐ | Marketing ⭐⭐⭐ | Sales ⭐⭐ | Cost 💰

### Description

Enable GitHub CodeQL to automatically scan code for security vulnerabilities and coding errors.

### Source

- Documentation: `docs/GITHUB-FEATURES-CHECKLIST.md:62`

### Acceptance Criteria

- [ ] Create `.github/workflows/codeql.yml`
- [ ] Configure JavaScript/TypeScript analysis
- [ ] Set up automated scanning on push and PR
- [ ] Review and address any initial findings
- [ ] Add security badge to README

---

## Issue #45: Optimize GitHub repository for discoverability

**Repository:** whizbangdevelopers/Qepton
**Labels:** `free`, `marketing`
**Priority:** Ease ⭐⭐⭐⭐⭐ | Marketing ⭐⭐⭐⭐ | Sales ⭐⭐ | Cost 💰

### Description

Optimize the Qepton repository for GitHub search and Explore discoverability. This is separate from external SEO - this specifically targets users searching within GitHub.

### Source

- New issue based on GitHub discoverability needs

### Background

GitHub search indexes repository metadata, not GitHub Pages content. To appear in relevant searches and potentially GitHub Explore, we need to optimize:
- Repository description
- Topics/tags
- README content and structure

### Acceptance Criteria

- [ ] Audit current repository topics - add relevant ones:
  - `gist`, `gist-client`, `snippet-manager`, `code-snippets`
  - `electron`, `quasar`, `vue`, `typescript`
  - `pwa`, `desktop-app`, `cross-platform`
  - `github-gist`, `developer-tools`, `productivity`
- [ ] Optimize repository description (max 350 chars):
  - Include key terms: gist, snippet, manager, desktop, pwa
  - Clear value proposition
- [ ] Verify README has searchable keywords naturally included
- [ ] Add "About" section links (website, topics)
- [ ] Consider adding to GitHub Collections/Awesome lists

### GitHub Search Ranking Factors

| Factor | Weight | Action |
| ------ | ------ | ------ |
| Name match | High | ✓ "Qepton" is unique |
| Description | High | Optimize keywords |
| Topics | High | Add 10-15 relevant topics |
| README content | Medium | Verify keywords present |
| Stars | High | Organic (marketing helps) |
| Recent commits | Medium | ✓ Active |
| Forks | Medium | Organic |

---

## Issue #8: Create product page on whizbangdevelopers.com

**Repository:** whizbangdevelopers/Qepton
**Labels:** `free`, `marketing`
**Priority:** Ease ⭐⭐⭐ | Marketing ⭐⭐⭐⭐⭐ | Sales ⭐⭐⭐ | Cost 💰

### Description

Create a dedicated product page for Qepton on whizbangdevelopers.com to serve as the official marketing landing page. The existing PWA demo at whizbangdevelopers.github.io/Qepton serves as a live demo but not a marketing page.

### Source

- Documentation: `docs/MARKETING-PLAN-FREE.md:69`

### Acceptance Criteria

- [ ] Design responsive product page for whizbangdevelopers.com
- [ ] Include hero section with app screenshots/GIFs
- [ ] Feature comparison (Free vs Premium)
- [ ] Download links for all platforms (Desktop, PWA, Mobile)
- [ ] Link to live PWA demo
- [ ] Testimonials section (when available)
- [ ] SEO optimization for discoverability

---

## Issue #9: Set up social media accounts

**Repository:** whizbangdevelopers/Qepton
**Labels:** `free`, `marketing`
**Priority:** Ease ⭐⭐⭐ | Marketing ⭐⭐⭐⭐⭐ | Sales ⭐⭐ | Cost 💰

### Description

Create and configure social media presence for Qepton to build community and announce updates.

### Source

- Documentation: `docs/MARKETING-PLAN-FREE.md:70`

### Acceptance Criteria

- [ ] Create Twitter/X account (@QeptonApp or similar)
- [ ] Create Bluesky account
- [ ] Set up consistent branding across platforms
- [ ] Create profile graphics and banner images
- [ ] Link social accounts from README and landing page

---

## Issue #10: Write Dev.to announcement article

**Repository:** whizbangdevelopers/Qepton
**Labels:** `free`, `marketing`
**Priority:** Ease ⭐⭐⭐ | Marketing ⭐⭐⭐⭐⭐ | Sales ⭐⭐ | Cost 💰

### Description

Write and publish an announcement article on Dev.to to reach the developer community.

### Source

- Documentation: `docs/MARKETING-PLAN-FREE.md:77`

### Acceptance Criteria

- [ ] Draft article covering:
  - Problem Qepton solves
  - Key features and differentiators
  - Getting started guide
  - Future roadmap teaser
- [ ] Include screenshots and GIFs
- [ ] Use appropriate tags (opensource, github, productivity, tools)
- [ ] Cross-post announcement to Hashnode

---

## Issue #11: Create YouTube demo video

**Repository:** whizbangdevelopers/Qepton
**Labels:** `free`, `marketing`
**Priority:** Ease ⭐⭐ | Marketing ⭐⭐⭐⭐⭐ | Sales ⭐⭐⭐ | Cost 💰

### Description

Create a professional demo video showcasing Qepton features for YouTube and embedding in documentation.

### Source

- Documentation: `docs/MARKETING-PLAN-FREE.md:86`

### Acceptance Criteria

- [ ] Script 2-3 minute demo covering:
  - GitHub authentication
  - Creating and managing gists
  - Tagging and search
  - Multi-platform support
- [ ] Record with high quality screen capture
- [ ] Add voiceover or captions
- [ ] Upload to YouTube with SEO optimization
- [ ] Embed in README and landing page

---

## Issue #12: Plan Product Hunt launch

**Repository:** whizbangdevelopers/Qepton
**Labels:** `free`, `marketing`
**Priority:** Ease ⭐⭐⭐ | Marketing ⭐⭐⭐⭐⭐ | Sales ⭐⭐⭐ | Cost 💰

### Description

Prepare and execute a Product Hunt launch to maximize visibility and downloads.

### Source

- Documentation: `docs/MARKETING-PLAN-FREE.md:84`

### Acceptance Criteria

- [ ] Create Product Hunt maker account
- [ ] Prepare launch assets:
  - Tagline (60 chars max)
  - Description
  - Gallery images (1270x760)
  - Logo
- [ ] Identify hunter or self-launch strategy
- [ ] Plan launch timing (Tuesday-Thursday, early morning PST)
- [ ] Prepare response templates for comments
- [ ] Coordinate community support for launch day

---

## Issue #13: Plan Hacker News "Show HN" post

**Repository:** whizbangdevelopers/Qepton
**Labels:** `free`, `marketing`
**Priority:** Ease ⭐⭐⭐ | Marketing ⭐⭐⭐⭐⭐ | Sales ⭐⭐⭐ | Cost 💰

### Description

Plan and execute a Hacker News "Show HN" post to reach the technical community.

### Source

- Documentation: `docs/MARKETING-PLAN-FREE.md:83`

### Acceptance Criteria

- [ ] Draft compelling Show HN title (keep it simple)
- [ ] Prepare HN-friendly description (focus on technical merits)
- [ ] Plan posting timing (weekday morning US time)
- [ ] Prepare to actively respond to comments
- [ ] Have landing page and docs ready

---

## Issue #14: Add welcome bot for first-time contributors

**Repository:** whizbangdevelopers/Qepton
**Labels:** `free`, `community`
**Priority:** Ease ⭐⭐⭐ | Marketing ⭐⭐⭐⭐ | Sales ⭐ | Cost 💰

### Description

Set up a GitHub Action to automatically welcome first-time contributors with helpful information.

### Source

- Documentation: `docs/GITHUB-FEATURES-CHECKLIST.md:16`

### Acceptance Criteria

- [ ] Create `.github/workflows/welcome.yml`
- [ ] Welcome message for first issue
- [ ] Welcome message for first PR
- [ ] Include links to CONTRIBUTING.md and resources
- [ ] Thank contributors for their involvement

---

## Issue #15: Enable secret scanning

**Repository:** whizbangdevelopers/Qepton
**Labels:** `free`, `security`
**Priority:** Ease ⭐⭐⭐⭐ | Marketing ⭐⭐ | Sales ⭐ | Cost 💰

### Description

Enable GitHub secret scanning to automatically detect exposed credentials and API keys in the repository.

### Source

- Documentation: `docs/GITHUB-FEATURES-CHECKLIST.md:20`

### Acceptance Criteria

- [ ] Enable secret scanning in repository security settings
- [ ] Enable push protection to block commits with secrets
- [ ] Review any existing alerts
- [ ] Document secret handling in CONTRIBUTING.md

---

## Issue #16: Enable dependency graph

**Repository:** whizbangdevelopers/Qepton
**Labels:** `free`, `security`
**Priority:** Ease ⭐⭐⭐⭐ | Marketing ⭐⭐ | Sales ⭐ | Cost 💰

### Description

Enable the GitHub dependency graph to visualize all project dependencies and enable security alerts.

### Source

- Documentation: `docs/GITHUB-FEATURES-CHECKLIST.md:21`

### Acceptance Criteria

- [ ] Enable dependency graph in repository settings
- [ ] Verify all dependencies are detected
- [ ] Review dependency insights
- [ ] Ensure integration with Dependabot alerts

---

## Issue #17: Implement GitLab Snippets adapter

> ⚠️ **ALREADY EXISTS:** [Qepton #1](https://github.com/whizbangdevelopers/Qepton/issues/1) - Do not create duplicate

**Repository:** whizbangdevelopers/Qepton
**Labels:** `free`, `enhancement`
**Priority:** Ease ⭐⭐ | Marketing ⭐⭐⭐⭐⭐ | Sales ⭐⭐⭐ | Cost 💰

### Description

Implement the GitLab Snippets adapter to allow users to manage their GitLab snippets alongside GitHub gists.

### Source

- Code: `src/adapters/gitlab/index.ts:36-69`

### Acceptance Criteria

- [ ] Implement `verifyToken()` - validate GitLab PAT
- [ ] Implement `getCurrentUser()` - fetch authenticated user
- [ ] Implement `getSnippets()` - GET /snippets
- [ ] Implement `getSnippet(id)` - GET /snippets/:id
- [ ] Implement `createSnippet()` - POST /snippets
- [ ] Implement `updateSnippet()` - PUT /snippets/:id
- [ ] Implement `deleteSnippet()` - DELETE /snippets/:id
- [ ] Add unit tests for all methods
- [ ] Update documentation

---

## Issue #18: Implement Bitbucket Snippets adapter

> ⚠️ **ALREADY EXISTS:** [Qepton #2](https://github.com/whizbangdevelopers/Qepton/issues/2) - Do not create duplicate

**Repository:** whizbangdevelopers/Qepton
**Labels:** `free`, `enhancement`
**Priority:** Ease ⭐⭐ | Marketing ⭐⭐⭐⭐ | Sales ⭐⭐⭐ | Cost 💰

### Description

Implement the Bitbucket Snippets adapter to allow users to manage their Bitbucket snippets.

### Source

- Code: `src/adapters/bitbucket/index.ts:36-74`

### Acceptance Criteria

- [ ] Implement `verifyToken()` - validate Bitbucket app password/OAuth
- [ ] Implement `getCurrentUser()` - GET /user
- [ ] Implement `getSnippets()` - GET /snippets/{workspace}
- [ ] Implement `getSnippet(id)` - GET /snippets/{workspace}/{encoded_id}
- [ ] Implement `createSnippet()` - POST /snippets/{workspace}
- [ ] Implement `updateSnippet()` - PUT /snippets/{workspace}/{encoded_id}
- [ ] Implement `deleteSnippet()` - DELETE /snippets/{workspace}/{encoded_id}
- [ ] Implement `getSnippetHistory()` - GET /snippets/{workspace}/{encoded_id}/commits
- [ ] Add unit tests for all methods
- [ ] Update documentation

---

## Issue #19: Research GitLab OAuth implementation

**Repository:** whizbangdevelopers/Qepton
**Labels:** `free`, `research`
**Priority:** Ease ⭐⭐⭐ | Marketing ⭐⭐⭐ | Sales ⭐⭐ | Cost 💰

### Description

Research and document GitLab OAuth 2.0 implementation requirements for Qepton integration.

### Source

- Documentation: `docs/AUTH-INVESTIGATION-PLAN.md:48-52`

### Acceptance Criteria

- [ ] Review GitLab OAuth 2.0 documentation
- [ ] Identify required scopes for Snippets API access
- [ ] Document OAuth flow differences from GitHub
- [ ] Test GitLab self-hosted instance compatibility
- [ ] Update AUTH-INVESTIGATION-PLAN.md with findings
- [ ] Create implementation RFC

---

## Issue #20: Research Bitbucket OAuth implementation

**Repository:** whizbangdevelopers/Qepton
**Labels:** `free`, `research`
**Priority:** Ease ⭐⭐⭐ | Marketing ⭐⭐⭐ | Sales ⭐⭐ | Cost 💰

### Description

Research and document Bitbucket OAuth 2.0 implementation requirements for Qepton integration.

### Source

- Documentation: `docs/AUTH-INVESTIGATION-PLAN.md:66-70`

### Acceptance Criteria

- [ ] Review Bitbucket OAuth 2.0 documentation
- [ ] Identify required scopes for Snippets API access
- [ ] Document app password vs OAuth token differences
- [ ] Test Bitbucket Cloud vs Server differences
- [ ] Update AUTH-INVESTIGATION-PLAN.md with findings
- [ ] Create implementation RFC

---

## Issue #21: Implement PKCE for OAuth security

**Repository:** whizbangdevelopers/Qepton
**Labels:** `free`, `security`
**Priority:** Ease ⭐⭐⭐ | Marketing ⭐⭐ | Sales ⭐⭐ | Cost 💰

### Description

Implement PKCE (Proof Key for Code Exchange) for all OAuth flows to enhance security.

### Source

- Documentation: `docs/AUTH-INVESTIGATION-PLAN.md:243-255`

### Acceptance Criteria

- [ ] Generate cryptographically random code_verifier
- [ ] Create code_challenge using S256 method
- [ ] Include PKCE parameters in authorization request
- [ ] Validate state parameter to prevent CSRF
- [ ] Implement secure token storage
- [ ] Add token refresh before expiration
- [ ] Implement complete logout (clear all tokens)
- [ ] Add unit tests for PKCE flow

---

## Issue #46: Add R Markdown (.Rmd) file support

**Repository:** whizbangdevelopers/Qepton
**Labels:** `free`, `enhancement`
**Priority:** Ease ⭐⭐ | Marketing ⭐⭐⭐ | Sales ⭐⭐ | Cost 💰

### Description

Add support for viewing and editing R Markdown files (.Rmd), which combine YAML headers, markdown, and code chunks.

### Source

- Documentation: `docs/jupyter-notebook-support.md:79-86`

### Background

R Markdown is widely used in data science and statistical analysis. It's similar to Jupyter but uses YAML+Markdown format.

### Acceptance Criteria

- [ ] Parse YAML front matter
- [ ] Render markdown sections
- [ ] Highlight code chunks (```{r}, ```{python}, etc.)
- [ ] Add .Rmd to language detection
- [ ] Create unit tests with sample .Rmd files

### Reference

- https://rmarkdown.rstudio.com

---

## Issue #47: Add Quarto (.qmd) file support

**Repository:** whizbangdevelopers/Qepton
**Labels:** `free`, `enhancement`
**Priority:** Ease ⭐⭐ | Marketing ⭐⭐⭐ | Sales ⭐⭐ | Cost 💰

### Description

Add support for viewing and editing Quarto files (.qmd), which is the next-generation R Markdown supporting multiple languages.

### Source

- Documentation: `docs/jupyter-notebook-support.md:79-86`

### Background

Quarto is becoming the standard for reproducible documents and is supported by RStudio/Posit.

### Acceptance Criteria

- [ ] Parse YAML front matter (similar to R Markdown)
- [ ] Render markdown sections
- [ ] Highlight multi-language code chunks (R, Python, Julia, Observable)
- [ ] Add .qmd to language detection
- [ ] Create unit tests with sample .qmd files

### Reference

- https://quarto.org

---

## Issue #48: Add Marimo (.py) notebook support

**Repository:** whizbangdevelopers/Qepton
**Labels:** `free`, `enhancement`
**Priority:** Ease ⭐⭐ | Marketing ⭐⭐⭐ | Sales ⭐⭐ | Cost 💰

### Description

Add support for viewing Marimo notebooks, which are Python files with special cell markers.

### Source

- Documentation: `docs/jupyter-notebook-support.md:79-86`

### Background

Marimo is a new reactive notebook format that stores notebooks as pure Python files, making them git-friendly.

### Acceptance Criteria

- [ ] Detect Marimo-style cell markers in .py files
- [ ] Parse and display cells with syntax highlighting
- [ ] Add Marimo detection to file type identification
- [ ] Create unit tests with sample Marimo files

### Reference

- https://marimo.io

---

## Issue #49: Add Pluto.jl (.jl) notebook support

**Repository:** whizbangdevelopers/Qepton
**Labels:** `free`, `enhancement`
**Priority:** Ease ⭐⭐ | Marketing ⭐⭐⭐ | Sales ⭐⭐ | Cost 💰

### Description

Add support for viewing Pluto.jl notebooks, which are Julia files with cell UUIDs.

### Source

- Documentation: `docs/jupyter-notebook-support.md:79-86`

### Background

Pluto.jl is a popular reactive notebook environment for Julia programmers.

### Acceptance Criteria

- [ ] Detect Pluto-style cell markers and UUIDs in .jl files
- [ ] Parse and display cells with syntax highlighting
- [ ] Add Pluto detection to file type identification
- [ ] Create unit tests with sample Pluto files

### Reference

- https://plutojl.org

---

# QEPTON-DEV ISSUES

## Issue #7: Fix remaining npm vulnerabilities

**Repository:** Qepton-Dev (private)
**Labels:** `dev-only`, `security`
**Priority:** Ease ⭐⭐⭐ | Marketing ⭐⭐ | Sales ⭐ | Cost 💰

### Description

Address the remaining vulnerabilities identified in the latest `npm audit` (as of 2026-01-20).

**Note:** Some vulnerabilities (like `qs`) have been fixed. The current status is shown below.

### Source

- Documentation: `docs/SECURITY-AUDIT-LATEST.md`
- Command: `npm audit`

### Current Vulnerabilities (Updated 2026-01-20)

| Package         | Severity | Issue                              | Fix Available | Blocker |
| --------------- | -------- | ---------------------------------- | ------------- | ------- |
| tar <= 7.5.2    | High     | Arbitrary File Overwrite/Symlink   | Needs @capacitor/cli update | @capacitor/cli, app-builder-lib |
| electron < 35.7.5 | Moderate | ASAR Integrity Bypass            | Needs Electron 35.7.5+ | See Issue #18 |
| esbuild <= 0.24.2 | Moderate | Dev server request/response access | Needs vite 7.3.1+ | Breaking change |

**Total:** 9 vulnerabilities (6 high from tar chain, 3 moderate)

### Resolution Status

- [x] ~~qs < 6.14.1~~ - FIXED (no longer appears in audit)
- [ ] tar - Blocked by @capacitor/cli and electron-builder dependency chains
- [ ] electron - Blocked by ESM compatibility (see [Issue #18](https://github.com/whizbangdevelopers/Qepton-Dev/issues/18))
- [ ] esbuild/vite - Requires major version bump

### Acceptance Criteria

- [ ] Monitor @capacitor/cli releases for tar fix
- [ ] Monitor electron-builder releases for tar fix
- [ ] Track Electron ESM compatibility progress
- [ ] Evaluate vite 7.x migration when stable
- [ ] Run `npm audit` after each major dependency update
- [ ] Update SECURITY-AUDIT-LATEST.md with resolution status

---

## Issue #31: Add Playwright mobile device profiles

**Repository:** Qepton-Dev (private)
**Labels:** `dev-only`, `testing`
**Priority:** Ease ⭐⭐⭐ | Marketing ⭐ | Sales ⭐ | Cost 💰

### Description

Add mobile device emulation profiles to Playwright for testing responsive behavior.

### Source

- Documentation: `docs/CAPACITOR-TESTING-CHECKLIST.md:83`

### Acceptance Criteria

- [ ] Add iPhone profiles to playwright.config.ts
- [ ] Add Android phone profiles
- [ ] Add tablet profiles (iPad, Android tablet)
- [ ] Create mobile-specific test fixtures
- [ ] Add touch interaction tests
- [ ] Document mobile testing procedures

---

## Issue #32: Create Capacitor plugin mocks for unit tests

**Repository:** Qepton-Dev (private)
**Labels:** `dev-only`, `testing`
**Priority:** Ease ⭐⭐⭐ | Marketing ⭐ | Sales ⭐ | Cost 💰

### Description

Create mock implementations of Capacitor plugins to enable unit testing without native dependencies.

### Source

- Documentation: `docs/CAPACITOR-TESTING-CHECKLIST.md:506`

### Acceptance Criteria

- [ ] Create `tests/unit/__mocks__/@capacitor/` directory
- [ ] Implement mock for @capacitor/app
- [ ] Implement mock for @capacitor/haptics
- [ ] Implement mock for @capacitor/keyboard
- [ ] Implement mock for @capacitor/status-bar
- [ ] Update vitest.config.ts with aliases
- [ ] Write unit tests for usePlatform composable
- [ ] Document mock usage patterns

---

## Issue #33: Set up Android emulator in Docker

**Repository:** Qepton-Dev (private)
**Labels:** `dev-only`, `testing`
**Priority:** Ease ⭐⭐ | Marketing ⭐ | Sales ⭐ | Cost 💰

### Description

Configure Docker-based Android emulator for CI testing and local development without Android Studio.

### Source

- Documentation: `docs/CAPACITOR-TESTING-CHECKLIST.md:121`

### Acceptance Criteria

- [ ] Select appropriate Docker Android image
- [ ] Create docker-compose.yml for emulator
- [ ] Configure VNC access for debugging
- [ ] Integrate with e2e-docker/ infrastructure
- [ ] Add Appium configuration for testing
- [ ] Document setup and usage procedures

---

## Issue #34: Create GitHub Actions Android test workflow

**Repository:** Qepton-Dev (private)
**Labels:** `dev-only`, `ci-cd`, `testing`
**Priority:** Ease ⭐⭐ | Marketing ⭐ | Sales ⭐ | Cost 💵

### Description

Create a GitHub Actions workflow to run Android tests on every PR and push.

### Source

- Documentation: `docs/CAPACITOR-TESTING-CHECKLIST.md:166`

### Acceptance Criteria

- [ ] Create `.github/workflows/android-test.yml`
- [ ] Enable KVM for emulator acceleration
- [ ] Configure Android emulator (API 30+ with google_apis)
- [ ] Run Capacitor build and sync
- [ ] Execute Gradle connected tests
- [ ] Cache Gradle and Android SDK
- [ ] Upload test artifacts

---

## Issue #35: Create GitHub Actions iOS test workflow

**Repository:** Qepton-Dev (private)
**Labels:** `dev-only`, `ci-cd`, `testing`
**Priority:** Ease ⭐⭐ | Marketing ⭐ | Sales ⭐ | Cost 💵💵💵

### Description

Create a GitHub Actions workflow to run iOS tests using macOS runners.

### Source

- Documentation: `docs/CAPACITOR-TESTING-CHECKLIST.md:224`

### Acceptance Criteria

- [ ] Create `.github/workflows/ios-test.yml`
- [ ] Use macos-latest runner (Note: 10x Linux cost)
- [ ] Select appropriate Xcode version
- [ ] Launch iOS simulator
- [ ] Run Capacitor build and sync
- [ ] Execute xcodebuild tests
- [ ] Cache CocoaPods and derived data

### Cost Note

macOS runners cost 10x Linux runner minutes. Consider running on schedule (daily) rather than every PR.

---

## Issue #36: Add automated package installation tests

**Repository:** Qepton-Dev (private)
**Labels:** `dev-only`, `testing`
**Priority:** Ease ⭐⭐⭐ | Marketing ⭐ | Sales ⭐ | Cost 💵

### Description

Add CI tests that verify all distributed packages install and run correctly on clean systems.

### Source

- Documentation: `docs/DEV-TODO.md:80`

### Acceptance Criteria

- [ ] Test AppImage installation on Ubuntu
- [ ] Test .deb package installation
- [ ] Test Flatpak installation
- [ ] Test Snap installation
- [ ] Test Windows installer
- [ ] Test DMG/pkg on macOS
- [ ] Verify basic app launch after install

---

## Issue #37: Add visual regression tests

**Repository:** Qepton-Dev (private)
**Labels:** `dev-only`, `testing`
**Priority:** Ease ⭐⭐ | Marketing ⭐ | Sales ⭐ | Cost 💵

### Description

Implement visual regression testing to catch unintended UI changes.

### Source

- Documentation: `docs/DEV-TODO.md:81`

### Acceptance Criteria

- [ ] Evaluate tools (Percy, Chromatic, Playwright screenshots)
- [ ] Set up baseline screenshots
- [ ] Configure CI workflow
- [ ] Define threshold for acceptable differences
- [ ] Document review process for visual changes

---

## Issue #38: Consider Mac App Store build

> ⚠️ **ALREADY EXISTS:** [Qepton #6](https://github.com/whizbangdevelopers/Qepton/issues/6), [Dev #5](https://github.com/whizbangdevelopers/Qepton-Dev/issues/5) - Do not create duplicate

**Repository:** Qepton-Dev (private)
**Labels:** `dev-only`, `build`
**Priority:** Ease ⭐⭐ | Marketing ⭐⭐⭐ | Sales ⭐⭐ | Cost 💵💵

### Description

Investigate and implement Mac App Store distribution for increased visibility.

### Source

- Documentation: `docs/DEV-TODO.md:84`

### Acceptance Criteria

- [ ] Research MAS requirements and sandbox restrictions
- [ ] Evaluate if Electron app can meet MAS guidelines
- [ ] Set up Apple Developer Program ($99/year)
- [ ] Configure code signing for MAS
- [ ] Create App Store Connect listing
- [ ] Submit for review

### Cost Note

Requires Apple Developer Program membership ($99/year).

---

## Issue #39: Consider Windows Store (AppX) build

> ⚠️ **ALREADY EXISTS:** [Qepton #8](https://github.com/whizbangdevelopers/Qepton/issues/8), [Dev #7](https://github.com/whizbangdevelopers/Qepton-Dev/issues/7) - Do not create duplicate

**Repository:** Qepton-Dev (private)
**Labels:** `dev-only`, `build`
**Priority:** Ease ⭐⭐ | Marketing ⭐⭐⭐ | Sales ⭐⭐ | Cost 💵

### Description

Investigate and implement Windows Store (MSIX/AppX) distribution.

### Source

- Documentation: `docs/DEV-TODO.md:85`

### Acceptance Criteria

- [ ] Research Windows Store requirements
- [ ] Configure electron-builder for AppX target
- [ ] Set up Microsoft Partner Center account
- [ ] Create Windows Store listing
- [ ] Submit for certification

---

## Issue #40: Create user documentation site

**Repository:** Qepton-Dev (private)
**Labels:** `dev-only`, `documentation`
**Priority:** Ease ⭐⭐ | Marketing ⭐⭐⭐⭐ | Sales ⭐⭐ | Cost 💰

### Description

Create a comprehensive user documentation site hosted on GitHub Pages.

### Source

- Documentation: `docs/DEV-TODO.md:88`

### Acceptance Criteria

- [ ] Choose documentation framework (VitePress, Docusaurus, etc.)
- [ ] Create documentation structure:
  - Getting Started
  - Installation guides (per platform)
  - Features guide
  - FAQ
  - Troubleshooting
- [ ] Deploy to GitHub Pages
- [ ] Set up automatic deployment on changes

---

## Issue #43: Release package testing across all platforms

**Repository:** Qepton-Dev (private)
**Labels:** `dev-only`, `testing`, `release`
**Priority:** Ease ⭐⭐ | Marketing ⭐⭐ | Sales ⭐⭐ | Cost 💰

### Description

Create a comprehensive release testing checklist and process to verify all distributed packages work correctly before public release.

### Source

- New issue based on release process needs

### Acceptance Criteria

- [ ] Create release testing checklist document
- [ ] Test AppImage on Ubuntu/Fedora/Arch
- [ ] Test .deb package on Debian/Ubuntu
- [ ] Test Flatpak installation and sandboxing
- [ ] Test Snap installation and confinement
- [ ] Test Windows installer (NSIS)
- [ ] Test Windows portable (.7z)
- [ ] Test macOS DMG on Intel and ARM
- [ ] Test PWA installation on Chrome/Firefox/Safari
- [ ] Verify auto-update mechanism (if applicable)
- [ ] Document known issues per platform

### Testing Matrix

| Platform       | Package Type | Test Environment          |
| -------------- | ------------ | ------------------------- |
| Linux x64      | AppImage     | Ubuntu 22.04, Fedora 39   |
| Linux x64      | .deb         | Debian 12, Ubuntu 24.04   |
| Linux x64      | Flatpak      | Flathub sandbox           |
| Linux x64      | Snap         | Ubuntu with snapd         |
| Windows x64    | NSIS         | Windows 10/11             |
| Windows x64    | Portable     | Windows 10/11             |
| macOS ARM      | DMG          | macOS 14 Sonoma           |
| macOS Intel    | DMG          | macOS 13 Ventura          |
| Web            | PWA          | Chrome, Firefox, Safari   |

---

## Issue #44: Coordinate release timing with marketing phases

**Repository:** Qepton-Dev (private)
**Labels:** `dev-only`, `marketing`, `release`
**Priority:** Ease ⭐⭐⭐ | Marketing ⭐⭐⭐⭐⭐ | Sales ⭐⭐⭐ | Cost 💰

### Description

Create a release coordination plan that aligns software releases with marketing phases to maximize impact.

### Source

- Documentation: `docs/MARKETING-PLAN-FREE.md` (all phases)

### Acceptance Criteria

- [ ] Define release readiness criteria (tests passing, packages verified)
- [ ] Map marketing phases to release milestones:
  - Soft Launch (Week 1-2): v1.0 release
  - Community Launch (Week 3-4): Bug fixes, v1.0.x
  - Broader Launch (Week 5-6): Feature polish for HN/PH
- [ ] Create pre-launch checklist:
  - All packages built and tested
  - Release notes written
  - Social media posts drafted
  - Support channels ready
- [ ] Document rollback plan if issues discovered
- [ ] Set up release announcement templates

### Release Timeline Template

```
Week -1: Feature freeze, focus on bug fixes
Week 0:  Final testing, release candidate
Day -2:  All packages verified working
Day -1:  Prepare release notes, social posts
Day 0:   Release + announce (coordinate timing)
Day +1:  Monitor issues, respond to feedback
Day +7:  Post-mortem, gather lessons learned
```

---

# QEPTON-PREMIUM ISSUES

## Issue #22: Decide premium architecture approach

**Repository:** Qepton-Premium (private)
**Labels:** `premium`
**Priority:** Ease ⭐⭐⭐ | Marketing ⭐ | Sales ⭐⭐⭐⭐⭐ | Cost 💰

### Description

Make architectural decision on how premium features will be implemented and distributed.

### Source

- Documentation: `docs/DEV-TODO.md:26-57`

### Options to Consider

1. **Separate binary** - Premium is a completely different build
2. **Feature flags** - Same binary with runtime feature detection
3. **Plugin-based** - Premium features as plugins
4. **Hybrid** - Core features in free, premium as add-on module

### Acceptance Criteria

- [ ] Document pros/cons of each approach
- [ ] Evaluate impact on CI/CD pipeline
- [ ] Consider code sharing strategy with free version
- [ ] Make and document final decision
- [ ] Create implementation roadmap

---

## Issue #23: Define premium feature list

**Repository:** Qepton-Premium (private)
**Labels:** `premium`
**Priority:** Ease ⭐⭐⭐ | Marketing ⭐⭐⭐ | Sales ⭐⭐⭐⭐⭐ | Cost 💰

### Description

Create a definitive list of premium features with clear value propositions.

### Source

- Documentation: `docs/DEV-TODO.md:26-57`

### Proposed Features (from README)

- AI Assist - Code explanations, suggestions, auto-tagging
- Team Sync - Real-time collaboration
- Gitea/Forgejo - Self-hosted git service support
- Migration Tools - Cross-platform snippet migration
- Advanced mobile features (offline sync, biometrics, cloud backup)

### Acceptance Criteria

- [ ] Finalize feature list
- [ ] Define pricing strategy
- [ ] Create feature comparison table (Free vs Premium)
- [ ] Write marketing copy for each premium feature
- [ ] Update README with premium feature descriptions

---

## Issue #24: Implement licensing/activation system

**Repository:** Qepton-Premium (private)
**Labels:** `premium`, `licensing`
**Priority:** Ease ⭐⭐ | Marketing ⭐⭐ | Sales ⭐⭐⭐⭐⭐ | Cost 💵💵

### Description

Implement a licensing system to validate and activate premium features.

### Source

- Documentation: `docs/DEV-TODO.md:26-57`

### Acceptance Criteria

- [ ] Choose licensing approach:
  - License key validation
  - Online subscription verification
  - Hybrid (offline-capable with periodic check)
- [ ] Select licensing service (Gumroad, Stripe, custom)
- [ ] Implement license validation in app
- [ ] Handle offline/online scenarios
- [ ] Create purchase flow integration
- [ ] Implement trial period (if applicable)

### Cost Note

May require external payment processing service (Gumroad, Stripe fees).

---

## Issue #25: Add offline sync (mobile premium)

**Repository:** Qepton-Premium (private)
**Labels:** `premium`, `mobile`
**Priority:** Ease ⭐⭐ | Marketing ⭐⭐⭐ | Sales ⭐⭐⭐⭐ | Cost 💰

### Description

Implement offline synchronization for mobile premium users to access and edit snippets without connectivity.

### Source

- Documentation: `docs/CAPACITOR-TESTING-CHECKLIST.md:22`

### Acceptance Criteria

- [ ] Design offline data storage strategy
- [ ] Implement local SQLite database
- [ ] Create sync queue for offline changes
- [ ] Handle conflict resolution
- [ ] Add sync status indicators
- [ ] Test offline/online transitions

---

## Issue #26: Add biometric authentication (mobile premium)

**Repository:** Qepton-Premium (private)
**Labels:** `premium`, `mobile`
**Priority:** Ease ⭐⭐ | Marketing ⭐⭐⭐ | Sales ⭐⭐⭐⭐ | Cost 💰

### Description

Implement biometric authentication (Face ID, Touch ID, fingerprint) for secure app access on mobile.

### Source

- Documentation: `docs/CAPACITOR-TESTING-CHECKLIST.md:23`

### Acceptance Criteria

- [ ] Integrate @capacitor-community/biometric-auth plugin
- [ ] Add biometric lock option in settings
- [ ] Implement app lock on background
- [ ] Provide fallback to PIN/password
- [ ] Handle biometric enrollment changes
- [ ] Test on iOS and Android devices

---

## Issue #27: Add iCloud/Drive backup (mobile premium)

**Repository:** Qepton-Premium (private)
**Labels:** `premium`, `mobile`
**Priority:** Ease ⭐⭐ | Marketing ⭐⭐⭐ | Sales ⭐⭐⭐⭐ | Cost 💰

### Description

Implement cloud backup functionality to iCloud (iOS) and Google Drive (Android) for premium mobile users.

### Source

- Documentation: `docs/CAPACITOR-TESTING-CHECKLIST.md:29`

### Acceptance Criteria

- [ ] Implement iCloud backup on iOS
- [ ] Implement Google Drive backup on Android
- [ ] Add backup scheduling options
- [ ] Create restore from backup flow
- [ ] Handle backup encryption
- [ ] Test cross-device restore

---

## Issue #28: Implement AI Assist features

**Repository:** Qepton-Premium (private)
**Labels:** `premium`
**Priority:** Ease ⭐ | Marketing ⭐⭐⭐⭐ | Sales ⭐⭐⭐⭐⭐ | Cost 💵💵💵

### Description

Implement AI-powered features for code explanations, suggestions, and automatic tagging.

### Source

- Documentation: `README.md:41`

### Features

- Code explanations (explain selected code)
- Suggestions (improve/refactor code)
- Auto-tagging (suggest tags based on code content)
- Natural language search

### Acceptance Criteria

- [ ] Select AI provider (OpenAI, Anthropic, etc.)
- [ ] Design API integration architecture
- [ ] Implement code explanation feature
- [ ] Implement suggestion feature
- [ ] Implement auto-tagging
- [ ] Add usage tracking/limits
- [ ] Handle API errors gracefully

### Cost Note

Requires AI API subscription (OpenAI, Anthropic). Costs scale with usage.

---

## Issue #29: Implement Team Sync collaboration

**Repository:** Qepton-Premium (private)
**Labels:** `premium`
**Priority:** Ease ⭐ | Marketing ⭐⭐⭐⭐ | Sales ⭐⭐⭐⭐⭐ | Cost 💵💵

### Description

Implement real-time collaboration features for teams to share and sync snippets.

### Source

- Documentation: `README.md:42`

### Acceptance Criteria

- [ ] Design team data model
- [ ] Implement team creation/management
- [ ] Create shared snippet collections
- [ ] Implement real-time sync (WebSocket/SSE)
- [ ] Add permission system (view/edit)
- [ ] Create team invite flow
- [ ] Handle offline/sync conflicts

### Cost Note

May require backend infrastructure (WebSocket server, database).

---

## Issue #30: Add Gitea/Forgejo support

**Repository:** Qepton-Premium (private)
**Labels:** `premium`
**Priority:** Ease ⭐⭐ | Marketing ⭐⭐⭐ | Sales ⭐⭐⭐⭐ | Cost 💰

### Description

Add support for self-hosted Gitea and Forgejo instances for users who prefer self-hosted solutions.

### Source

- Documentation: `README.md:43`

### Acceptance Criteria

- [ ] Research Gitea/Forgejo API compatibility
- [ ] Create adapter following existing pattern
- [ ] Implement authentication (token-based)
- [ ] Implement snippet CRUD operations
- [ ] Allow custom instance URL configuration
- [ ] Test with various Gitea/Forgejo versions
- [ ] Update documentation

---

## Issue #50: Add Apache Zeppelin (.zpln) notebook support

**Repository:** Qepton-Premium (private)
**Labels:** `premium`, `enhancement`
**Priority:** Ease ⭐⭐ | Marketing ⭐⭐⭐ | Sales ⭐⭐⭐⭐ | Cost 💰

### Description

Add support for viewing Apache Zeppelin notebooks (.zpln), which are used in enterprise big data environments.

### Source

- Documentation: `docs/jupyter-notebook-support.md:90-94`

### Background

Apache Zeppelin is used in enterprise environments for big data analysis with Spark, Hadoop, etc. Users of this format are typically in enterprise environments with data infrastructure budgets, making it a good fit for premium tier.

### Acceptance Criteria

- [ ] Parse .zpln JSON format
- [ ] Render paragraphs with appropriate interpreters (Spark, SQL, etc.)
- [ ] Display output results
- [ ] Add syntax highlighting for supported languages
- [ ] Create unit tests with sample .zpln files

### Reference

- https://zeppelin.apache.org

---

# QEPTON-PLUGINS ISSUES

## Issue #41: Design plugin architecture

**Repository:** Qepton-Plugins (private)
**Labels:** `plugin`
**Priority:** Ease ⭐ | Marketing ⭐⭐⭐⭐ | Sales ⭐⭐⭐⭐ | Cost 💰

### Description

Design the plugin architecture that allows third-party extensions to Qepton functionality.

### Source

- Documentation: `README.md:38`

### Acceptance Criteria

- [ ] Define plugin capabilities/hooks:
  - UI extensions
  - Data transformers
  - Custom syntax highlighters
  - Export formats
- [ ] Design plugin manifest format
- [ ] Create plugin loading mechanism
- [ ] Define security sandbox
- [ ] Create plugin development template
- [ ] Write plugin development guide

---

## Issue #42: Create API documentation for plugins

**Repository:** Qepton-Plugins (private)
**Labels:** `plugin`, `api`, `documentation`
**Priority:** Ease ⭐⭐ | Marketing ⭐⭐⭐ | Sales ⭐⭐⭐ | Cost 💰

### Description

Create comprehensive API documentation for plugin developers.

### Source

- Documentation: `docs/DEV-TODO.md:89`

### Acceptance Criteria

- [ ] Document all plugin hooks and events
- [ ] Create TypeScript type definitions
- [ ] Write getting started guide
- [ ] Provide example plugins
- [ ] Set up documentation site
- [ ] Create plugin submission guidelines

---

# SUMMARY

## Issue Count by Repository

| Repository       | Total | New to Create | Already Exist |
| ---------------- | ----- | ------------- | ------------- |
| Qepton (free)    | 26    | 22            | 4             |
| Qepton-Dev       | 26    | 12            | 14            |
| Qepton-Premium   | 10    | 10            | 0             |
| Qepton-Plugins   | 2     | 2             | 0             |
| **Total**        | **64**| **46**        | **18**        |

## Issue Count by Cost

| Cost Level   | Count | Percentage |
| ------------ | ----- | ---------- |
| 💰 Free      | 43    | 86%        |
| 💵 Low       | 4     | 8%         |
| 💵💵 Medium  | 3     | 6%         |
| 💵💵💵 High  | 2     | 4%         |

## New Issues from jupyter-notebook-support.md

| # | Issue | Repository | Tier |
|---|-------|------------|------|
| 46 | R Markdown (.Rmd) support | Qepton | Free |
| 47 | Quarto (.qmd) support | Qepton | Free |
| 48 | Marimo (.py notebook) support | Qepton | Free |
| 49 | Pluto.jl (.jl notebook) support | Qepton | Free |
| 50 | Apache Zeppelin (.zpln) support | Premium | Premium |

## Recommended Execution Order

### Existing Dev Issues (14 open)

These issues already exist in Qepton-Dev and should be prioritized:

| Priority | Dev # | Title | Category | Effort |
| -------- | ----- | ----- | -------- | ------ |
| High | #16 | OAuth authentication | Feature | Medium |
| High | #11 | GitLab Snippets adapter | Feature | High |
| High | #12 | Bitbucket Snippets adapter | Feature | High |
| High | #15 | Mobile app via Capacitor | Feature | High |
| Medium | #3 | Snap package for Ubuntu | Packaging | Low |
| Medium | #2 | Pacman package for Arch | Packaging | Low |
| Medium | #19 | macOS pkg installer | Packaging | Low |
| Medium | #21 | Windows MSI installer | Packaging | Low |
| Medium | #23 | Windows portable EXE | Packaging | Low |
| Medium | #24 | NixOS / nixpkgs package | Packaging | Medium |
| Low | #20 | Mac App Store | Packaging | High |
| Low | #22 | Windows Store (AppX) | Packaging | High |
| Low | #17 | Duplicate issue detection bot | CI/CD | Low |
| Blocked | #18 | Electron upgrade (ESM) | Technical debt | - |

### New Issues (from this document)

1. **Week 1:** Issues 1-7, 45 (Quick wins including GitHub SEO, all free)
2. **Week 2:** Issues 8-16, 43-44 (Marketing, community, release prep)
3. **Week 3:** Issues 19-21, 46-49 (OAuth research, notebook formats - skip #17, #18 as they exist)
4. **Week 4+:** Issues 22-42, 50 (Premium, testing, plugins - skip #38, #39 as they exist)

### Combined Roadmap

**Phase 1 - Foundation (Now)**
- Existing: Dev #3, #2 (Snap, Pacman - quick packaging wins)
- Existing: Dev #19, #21, #23 (pkg, MSI, portable - more packaging)
- New: Issues 1-7 (Dependabot, Discussions, SECURITY.md, etc.)

**Phase 2 - Features (Next)**
- Existing: Dev #16 (OAuth - major feature)
- Existing: Dev #11, #12 (GitLab/Bitbucket adapters)
- New: Issues 8-16, 43-44 (Marketing, community)

**Phase 3 - Platform Expansion**
- Existing: Dev #15 (Capacitor mobile)
- Existing: Dev #24 (NixOS)
- Existing: Dev #20, #22 (App stores - lower priority)
- New: Issues 19-21, 46-49 (OAuth research, notebook formats)

**Phase 4 - Premium & Plugins**
- New: Issues 22-42, 50 (Premium features, testing infra, plugins)

## Duplicate Check Summary

The following proposed issues already exist and should NOT be created:

### Qepton (Free)

| Proposed # | Description | Existing Issue |
| ---------- | ----------- | -------------- |
| 17 | GitLab Snippets adapter | Qepton #1 |
| 18 | Bitbucket Snippets adapter | Qepton #2 |
| -  | OAuth authentication | Qepton #14 |
| -  | Mobile app via Capacitor | Qepton #12 |

### Qepton-Dev (14 existing issues)

| Proposed # | Description | Existing Dev Issue |
| ---------- | ----------- | ------------------ |
| 38 | Mac App Store build | Dev #20 |
| 39 | Windows Store (AppX) build | Dev #22 |
| -  | OAuth authentication | Dev #16 |
| -  | Electron upgrade blocked | Dev #18 |
| -  | GitLab Snippets adapter | Dev #11 (from Free #1) |
| -  | Bitbucket Snippets adapter | Dev #12 (from Free #2) |
| -  | Mobile app via Capacitor | Dev #15 (from Free #12) |
| -  | NixOS package support | Dev #24 |
| -  | Pacman package for Arch | Dev #2 |
| -  | Snap package for Ubuntu | Dev #3 |
| -  | PKG installer for macOS | Dev #19 |
| -  | MSI installer for Windows | Dev #21 |
| -  | Portable EXE for Windows | Dev #23 |
| -  | Duplicate issue detection bot | Dev #17 |
