# Security Audit Report

**Generated:** 2026-01-19
**Project:** Qepton v1.0.8

---

## Summary

| Severity | Count | Action Required |
| -------- | ----- | --------------- |
| Critical | 0     | -               |
| High     | 8     | Review          |
| Moderate | 3     | Monitor         |
| Low      | 0     | -               |
| **Total** | **11** | |

---

## Vulnerability Analysis

### HIGH SEVERITY

#### 1. markdown-it-katex (XSS) ⚠️ NEEDS ATTENTION

| Field | Value |
| ----- | ----- |
| Package | `markdown-it-katex` |
| Severity | High |
| Type | Cross-Site Scripting (CWE-79) |
| Direct Dependency | Yes |
| Fix Available | **No** |
| Advisory | [GHSA-5ff8-jcf9-fw62](https://github.com/advisories/GHSA-5ff8-jcf9-fw62) |

**Issue:** All versions of markdown-it-katex are vulnerable to XSS through malicious LaTeX input.

**Impact:** If users can input LaTeX math (via gist descriptions), malicious scripts could execute.

**Recommendation:**
- **Option A:** Replace with `@vscode/markdown-it-katex` or `markdown-it-texmath` (actively maintained)
- **Option B:** Sanitize all markdown output before rendering
- **Option C:** Disable KaTeX support if not heavily used

**Priority:** 🔴 High - Direct dependency, XSS is serious

---

#### 2. tar (Path Traversal) - Build Tool

| Field | Value |
| ----- | ----- |
| Package | `tar` |
| Severity | High |
| Type | Arbitrary File Overwrite (CWE-22) |
| Direct Dependency | No (via @capacitor/cli, electron-builder) |
| Fix Available | Requires major version bump |
| Advisory | [GHSA-8qq5-rm4j-mr97](https://github.com/advisories/GHSA-8qq5-rm4j-mr97) |

**Issue:** Malicious tar archives could overwrite files outside intended directory.

**Impact:** Only affects build process, not runtime. Would require attacker to provide malicious build artifact.

**Recommendation:**
- Monitor for @capacitor/cli and electron-builder updates
- Low risk since only dev/build tools affected

**Priority:** 🟡 Medium - Build tool only, not in production bundle

---

#### 3. electron-builder / app-builder-lib / dmg-builder (via tar)

| Field | Value |
| ----- | ----- |
| Package | `electron-builder` (and related) |
| Severity | High |
| Type | Transitive (tar vulnerability) |
| Direct Dependency | Yes |
| Fix Available | Yes - downgrade to 23.0.6 (breaking) |

**Issue:** Same tar vulnerability propagates through electron-builder chain.

**Impact:** Build process only. electron-builder 24.x → 23.x would be major regression.

**Recommendation:**
- Wait for electron-builder to update tar
- Risk is contained to build process

**Priority:** 🟡 Medium - Build tool only

---

#### 4. @capacitor/cli (via tar)

| Field | Value |
| ----- | ----- |
| Package | `@capacitor/cli` |
| Severity | High |
| Type | Transitive (tar vulnerability) |
| Direct Dependency | Yes |
| Fix Available | Yes - downgrade to 2.5.0 (very breaking) |

**Issue:** Same tar vulnerability.

**Impact:** Only affects mobile build process.

**Recommendation:**
- Wait for Capacitor 6.x or patch
- Capacitor 5.x → 2.x is not viable

**Priority:** 🟡 Medium - Build tool only

---

#### 5. qs (DoS via Memory Exhaustion)

| Field | Value |
| ----- | ----- |
| Package | `qs` |
| Severity | High |
| Type | DoS (CWE-20) |
| Direct Dependency | No |
| Fix Available | Yes |
| Advisory | [GHSA-6rw7-vpxm-498p](https://github.com/advisories/GHSA-6rw7-vpxm-498p) |

**Issue:** Query string parsing can be exploited to exhaust memory.

**Impact:** Would require attacker-controlled query strings in server context.

**Recommendation:**
- Run `npm audit fix` - this one should auto-fix

**Priority:** 🟢 Low - Electron app, limited server exposure

---

### MODERATE SEVERITY

#### 6. electron (ASAR Integrity Bypass)

| Field | Value |
| ----- | ----- |
| Package | `electron` |
| Severity | Moderate |
| Type | Code Injection (CWE-94) |
| CVSS | 6.1 |
| Direct Dependency | Yes |
| Fix Available | Yes - v35.7.5+ |
| Advisory | [GHSA-vmqv-hx8q-j7mg](https://github.com/advisories/GHSA-vmqv-hx8q-j7mg) |

**Issue:** ASAR integrity check can be bypassed via resource modification.

**Impact:** Requires local access to modify app resources. Attacker would need to modify files on user's machine.

**Recommendation:**
- Upgrade electron from ^28 to ^35.7.5 or later
- Test thoroughly - major version jump

**Priority:** 🟡 Medium - Requires local access

---

#### 7. esbuild / vite (Dev Server CORS)

| Field | Value |
| ----- | ----- |
| Package | `esbuild` (via vite) |
| Severity | Moderate |
| Type | CORS Bypass (CWE-346) |
| Direct Dependency | No (via vite) |
| Fix Available | Yes - vite 7.x |
| Advisory | [GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99) |

**Issue:** Dev server allows any website to make requests and read responses.

**Impact:** Development only. No impact on production builds.

**Recommendation:**
- Update vite when Quasar supports v7
- Only affects `npm run dev`, not production

**Priority:** 🟢 Low - Dev mode only

---

## Action Plan

### Immediate (Do Now)

| Action | Command | Risk |
| ------ | ------- | ---- |
| Fix qs | `npm audit fix` | Low |

### Short-term (This Sprint)

| Action | Effort | Notes |
| ------ | ------ | ----- |
| Replace markdown-it-katex | Medium | Find alternative or sanitize output |
| Upgrade electron | High | Test all platforms, major version bump |

### Defer (Wait for Upstream)

| Package | Current | Waiting For |
| ------- | ------- | ----------- |
| electron-builder | 24.9.1 | tar fix release |
| @capacitor/cli | 5.6.0 | tar fix in 5.x or 6.x |
| vite | 5.0.11 | Quasar support for vite 7 |

---

## Risk Assessment for Production

| Vulnerability | In Prod Bundle? | User Exposure | Risk |
| ------------- | --------------- | ------------- | ---- |
| markdown-it-katex XSS | ✅ Yes | User-provided markdown | 🔴 High |
| electron ASAR bypass | ✅ Yes | Local attack only | 🟡 Medium |
| tar path traversal | ❌ No | Build only | 🟢 Low |
| esbuild CORS | ❌ No | Dev only | 🟢 Low |
| qs DoS | ❓ Maybe | Limited server use | 🟢 Low |

---

## Commands

```bash
# View current vulnerabilities
npm audit

# Auto-fix what's possible
npm audit fix

# See what would change with breaking fixes
npm audit fix --dry-run --force

# Check specific package
npm ls markdown-it-katex
```

---

## Decision Log

| Date | Decision | Rationale |
| ---- | -------- | --------- |
| 2026-01-19 | Defer electron-builder fix | Breaking change, waiting for upstream |
| 2026-01-19 | Defer vite fix | Requires Quasar compatibility |
| 2026-01-19 | ✅ Replaced markdown-it-katex | Migrated to @vscode/markdown-it-katex (Microsoft maintained) |
| 2026-01-19 | ⚠️ Electron upgrade blocked | ESM compatibility issue with Node.js/Quasar - needs investigation in separate branch |
