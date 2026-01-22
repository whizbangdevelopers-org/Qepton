# Release Plan

This document defines the release sequence for Qepton, coordinating packaging, testing, and feature releases.

## Release Philosophy

- **Rush to release** packaging that we control directly (macOS, Windows)
- **Defer external submissions** until post-release testing infrastructure is proven
- **Group related features** into meaningful releases
- **Maintain quality gates** between releases

---

## Version Milestones

| Version | Focus | Key Issues |
| ------- | ----- | ---------- |
| v1.1.0  | Initial packaging | macOS PKG, Windows MSI, Windows Portable |
| v1.2.0  | Linux packaging | Pacman (Arch), Snap (Ubuntu) |
| v1.3.0  | Advanced packaging | NixOS, store submissions |
| v2.0.0  | Multi-provider | OAuth, GitLab, Bitbucket adapters |

---

## v1.1.0 - Initial Packaging Release

**Goal:** Get installable packages for macOS and Windows users.

### Prerequisites
- [ ] Phase 1 GitHub Infrastructure complete (milestone 1.1)
- [ ] Basic release workflow functional

### Issues
| # | Issue | Type | Notes |
|---|-------|------|-------|
| [#19](https://github.com/whizbangdevelopers/Qepton-Dev/issues/19) | macOS PKG installer | Packaging | Direct control |
| [#21](https://github.com/whizbangdevelopers/Qepton-Dev/issues/21) | Windows MSI installer | Packaging | Direct control |
| [#23](https://github.com/whizbangdevelopers/Qepton-Dev/issues/23) | Windows Portable EXE | Packaging | Direct control |

### Quality Gates
- [ ] All packages build successfully in CI
- [ ] Manual smoke test on each platform
- [ ] Release notes drafted

### Release Checklist
- [ ] Tag release in Dev repo
- [ ] Sync to Free repo
- [ ] Upload packages to GitHub Releases
- [ ] Update download links in README

---

## v1.2.0 - Linux Packaging Release

**Goal:** Expand to Linux distribution channels.

### Prerequisites
- [ ] v1.1.0 released successfully
- [ ] Post-release testing infrastructure (#31, #34) operational
- [ ] Automated package verification working

### Issues
| # | Issue | Type | Notes |
|---|-------|------|-------|
| [#2](https://github.com/whizbangdevelopers/Qepton-Dev/issues/2) | 📤 Pacman (Arch) | External | AUR submission |
| [#3](https://github.com/whizbangdevelopers/Qepton-Dev/issues/3) | 📤 Snap (Ubuntu) | External | Snapcraft submission |
| [#31](https://github.com/whizbangdevelopers/Qepton-Dev/issues/31) | Automated package tests | Testing | Required first |
| [#34](https://github.com/whizbangdevelopers/Qepton-Dev/issues/34) | Release package testing | Testing | Required first |

### Quality Gates
- [ ] Automated package tests passing
- [ ] VM-based installation verification
- [ ] External submission guidelines reviewed

### Release Checklist
- [ ] Submit to AUR
- [ ] Submit to Snapcraft
- [ ] Monitor submission status
- [ ] Update installation docs

---

## v1.3.0 - Advanced Packaging Release

**Goal:** Complete distribution coverage including stores.

### Prerequisites
- [ ] v1.2.0 released successfully
- [ ] Store developer accounts set up
- [ ] Code signing certificates obtained

### Issues
| # | Issue | Type | Notes |
|---|-------|------|-------|
| [#24](https://github.com/whizbangdevelopers/Qepton-Dev/issues/24) | 📤 NixOS package | External | nixpkgs PR |
| [#20](https://github.com/whizbangdevelopers/Qepton-Dev/issues/20) | 📤 Mac App Store | External | Apple review |
| [#22](https://github.com/whizbangdevelopers/Qepton-Dev/issues/22) | 📤 Windows Store | External | Microsoft review |

### Quality Gates
- [ ] Store compliance requirements met
- [ ] Sandbox restrictions tested
- [ ] Privacy policy published

### Release Checklist
- [ ] Submit to Mac App Store
- [ ] Submit to Windows Store
- [ ] Submit PR to nixpkgs
- [ ] Monitor review status

---

## v2.0.0 - Multi-Provider Release

**Goal:** Support GitLab and Bitbucket alongside GitHub Gist.

### Prerequisites
- [ ] v1.x packaging stable
- [ ] OAuth infrastructure complete (#16, #54)
- [ ] Adapter architecture designed

### Issues
| # | Issue | Type | Notes |
|---|-------|------|-------|
| [#16](https://github.com/whizbangdevelopers/Qepton-Dev/issues/16) | OAuth authentication | Feature | Foundation |
| [#54](https://github.com/whizbangdevelopers/Qepton-Dev/issues/54) | PKCE security | Security | Required for OAuth |
| [#11](https://github.com/whizbangdevelopers/Qepton-Dev/issues/11) | GitLab Snippets | Feature | New adapter |
| [#12](https://github.com/whizbangdevelopers/Qepton-Dev/issues/12) | Bitbucket Snippets | Feature | New adapter |
| [#52](https://github.com/whizbangdevelopers/Qepton-Dev/issues/52) | Research GitLab OAuth | Research | Prerequisite |
| [#53](https://github.com/whizbangdevelopers/Qepton-Dev/issues/53) | Research Bitbucket OAuth | Research | Prerequisite |

### Quality Gates
- [ ] All adapters tested with real accounts
- [ ] Migration path documented
- [ ] Breaking changes communicated

### Release Checklist
- [ ] Update marketing materials
- [ ] Announce multi-provider support
- [ ] Update comparison charts

---

## Future Releases (Tentative)

| Version | Focus | Notes |
| ------- | ----- | ----- |
| v2.1.0  | Notebook support | R Markdown, Quarto, Marimo, Pluto.jl |
| v3.0.0  | Mobile app | Capacitor iOS/Android |
| v4.0.0  | Premium tier | Licensing, premium features |
| v5.0.0  | Plugin system | Third-party extensions |

---

## Dependencies Between Releases

```
v1.1.0 (Initial Packaging)
   │
   ├── Post-release testing setup (#31, #34)
   │
   v
v1.2.0 (Linux Packaging)
   │
   ├── Store accounts & certificates
   │
   v
v1.3.0 (Advanced Packaging)
   │
   ├── OAuth infrastructure (#16, #54)
   │
   v
v2.0.0 (Multi-Provider)
```

---

## Milestone Assignment Strategy

Issues can have **two milestones** conceptually:
1. **Subsection milestone** (1.2 Packaging) - categorizes the work
2. **Version milestone** (v1.1.0) - schedules for release

GitHub only allows one milestone per issue, so we use:
- **Version milestones** for release-critical issues
- **Subsection milestones** for non-release work (infrastructure, research)

When an issue is ready for release:
1. Move from subsection milestone to version milestone
2. Add to project board "Release" column
3. Verify all dependencies complete
