# Qepton Development TODO

This document tracks development tasks, decisions, and future work.

> **Issue Tracking:** See [GITHUB-ISSUES-PREVIEW.md](./GITHUB-ISSUES-PREVIEW.md) for full issue details.

---

## Repository Structure

```
Qepton-Dev (development)
    ↓ tested & ready
    ├──→ Qepton (free public release)
    └──→ Qepton-Premium (premium release)
```

### Release Workflow
From Qepton-Dev root:
```bash
./scripts/release-to.sh free      # Push to Qepton (free)
./scripts/release-to.sh premium   # Push to Qepton-Premium
./scripts/release-to.sh both      # Push to both
```

---

## Premium Strategy

### Current Status
- Premium repo exists with basic plugin architecture
- Only has: license, package.json, initial plugin system

### Decision Needed: Premium Architecture

**Option A: Plugin Model**
- Premium features as loadable plugins
- Free version works standalone
- Premium unlocks additional plugins
- Pros: Clean separation, easier maintenance
- Cons: More complex architecture, plugin API maintenance

**Option B: Hybrid Model**
- Shared codebase with feature flags
- Premium features conditionally enabled
- Pros: Simpler development, single codebase
- Cons: Code bloat in free version, harder to separate

**Option C: Fork Model**
- Premium is a fork with additional features
- Sync common changes from Dev
- Pros: Complete control, clear separation
- Cons: Merge conflicts, drift over time

### TODO
- [ ] Decide on Premium architecture approach → **Issue #22** (Qepton-Premium)
- [ ] Define Premium feature list → **Issue #23** (Qepton-Premium)
- [ ] Implement licensing/activation system → **Issue #24** (Qepton-Premium)
- [ ] Set up Premium CI/CD workflow

---

## Release Checklist

Before releasing:
1. Run `bash scripts/validate-icons.sh` (or it runs on commit)
2. Run tests: `npm test`
3. Build and test locally: `npm run build:electron`
4. Verify package works on target platforms

---

## Known Issues / Tech Debt

- [ ] Icon validation catches issues - but need full package testing in CI
- [ ] Premium repo needs sync mechanism from Dev

---

## Future Improvements

### Testing
- [ ] Add automated package installation tests in CI → **Issue #36** (Qepton-Dev)
- [ ] Add visual regression tests → **Issue #37** (Qepton-Dev)

### Build
- [ ] Consider adding Mac App Store build → **Issue #38** (Qepton-Dev)
- [ ] Consider adding Windows Store (AppX) build → **Issue #39** (Qepton-Dev)

### Documentation
- [ ] User documentation site → **Issue #40** (Qepton-Dev)
- [ ] API documentation for premium plugins → **Issue #42** (Qepton-Plugins)

---

*Last updated: 2026-01-20*
