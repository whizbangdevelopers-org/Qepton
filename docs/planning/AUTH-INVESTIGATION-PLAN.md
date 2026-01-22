# Authentication Investigation Plan

**Related Issue:** [#16 - Add OAuth authentication in addition to personal access token](https://github.com/whizbangdevelopers/Qepton-Dev/issues/16)

**Last Updated:** 2026-01-20

> **Issue Tracking:** See [GITHUB-ISSUES-PREVIEW.md](./GITHUB-ISSUES-PREVIEW.md) for full issue details.

---

## Overview

This document outlines the investigation plan for implementing a unified authentication system that supports:
- GitHub (current + OAuth enhancement)
- GitLab (future)
- Bitbucket (future)

The goal is to design an authentication architecture that can accommodate multiple providers while maintaining backward compatibility with the existing PAT-based GitHub authentication.

---

## Phase 1: Research & Analysis

### 1.1 GitHub OAuth Options

| Option           | Description                | Pros                            | Cons                            | Best For     |
| ---------------- | -------------------------- | ------------------------------- | ------------------------------- | ------------ |
| **OAuth App**    | Traditional OAuth 2.0 flow | Simple, well-documented         | Requires client secret handling | Web/PWA      |
| **GitHub App**   | Fine-grained permissions   | Better security, granular access| More complex setup              | Enterprise   |
| **Device Flow**  | No redirect required       | Works without browser callback  | User must visit URL manually    | Electron/CLI |

**Investigation Tasks:** (Part of existing Issue #16)
- [ ] Test OAuth App flow in SPA mode
- [ ] Test Device Flow in Electron mode
- [ ] Evaluate GitHub App for enterprise users
- [ ] Document required scopes for Gist access (`gist` scope)

**GitHub OAuth Documentation:**
- OAuth Apps: https://docs.github.com/en/apps/oauth-apps
- Device Flow: https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps#device-flow
- GitHub Apps: https://docs.github.com/en/apps/creating-github-apps

### 1.2 GitLab OAuth Options

| Option                    | Description           | Pros                           | Cons                      | Best For      |
| ------------------------- | --------------------- | ------------------------------ | ------------------------- | ------------- |
| **OAuth 2.0**             | Standard OAuth flow   | Well-supported, PKCE available | Requires app registration | Web/PWA       |
| **Personal Access Token** | Manual token creation | Simple, no app registration    | User manages tokens       | All platforms |

**Investigation Tasks:** → **Issue #19**
- [ ] Review GitLab OAuth 2.0 implementation
- [ ] Identify GitLab Snippets API (equivalent to Gists)
- [ ] Document required scopes (`api` or `read_api`, `write_repository`)
- [ ] Test GitLab self-hosted instance compatibility

**GitLab OAuth Documentation:**
- OAuth 2.0: https://docs.gitlab.com/ee/api/oauth2.html
- Snippets API: https://docs.gitlab.com/ee/api/snippets.html
- Personal Access Tokens: https://docs.gitlab.com/ee/user/profile/personal_access_tokens.html

### 1.3 Bitbucket OAuth Options

| Option            | Description         | Pros                 | Cons                      | Best For      |
| ----------------- | ------------------- | -------------------- | ------------------------- | ------------- |
| **OAuth 2.0**     | Standard OAuth flow | Well-supported       | Requires app registration | Web/PWA       |
| **App Passwords** | Scoped passwords    | Simple, no OAuth setup | User manages passwords  | All platforms |

**Investigation Tasks:** → **Issue #20**
- [ ] Review Bitbucket OAuth 2.0 implementation
- [ ] Identify Bitbucket Snippets API
- [ ] Document required scopes
- [ ] Test Bitbucket Cloud vs Server differences

**Bitbucket OAuth Documentation:**
- OAuth 2.0: https://support.atlassian.com/bitbucket-cloud/docs/use-oauth-on-bitbucket-cloud/
- App Passwords: https://support.atlassian.com/bitbucket-cloud/docs/app-passwords/
- Snippets API: https://developer.atlassian.com/cloud/bitbucket/rest/api-group-snippets/

---

## Phase 2: Architecture Design

### 2.1 Current Authentication Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     Current Architecture                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  User Input (PAT) ──► auth.store ──► github-api.ts          │
│                           │              │                  │
│                           ▼              ▼                  │
│                    localStorage      API Calls              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Proposed Multi-Provider Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Proposed Architecture                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│                        ┌──────────────┐                             │
│                        │  Auth Store  │                             │
│                        │   (Pinia)    │                             │
│                        └──────┬───────┘                             │
│                               │                                     │
│                               ▼                                     │
│                    ┌─────────────────────┐                          │
│                    │   Auth Service      │                          │
│                    │   (Coordinator)     │                          │
│                    └─────────┬───────────┘                          │
│                              │                                      │
│          ┌───────────────────┼───────────────────┐                  │
│          ▼                   ▼                   ▼                  │
│  ┌───────────────┐   ┌───────────────┐   ┌───────────────┐         │
│  │ GitHubAuth    │   │ GitLabAuth    │   │ BitbucketAuth │         │
│  │ Provider      │   │ Provider      │   │ Provider      │         │
│  └───────┬───────┘   └───────┬───────┘   └───────┬───────┘         │
│          │                   │                   │                  │
│          ▼                   ▼                   ▼                  │
│  ┌───────────────┐   ┌───────────────┐   ┌───────────────┐         │
│  │ github-api.ts │   │ gitlab-api.ts │   │ bitbucket-    │         │
│  │               │   │               │   │ api.ts        │         │
│  └───────────────┘   └───────────────┘   └───────────────┘         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.3 Auth Provider Interface

```typescript
// Proposed interface for auth providers
interface AuthProvider {
  readonly name: 'github' | 'gitlab' | 'bitbucket'
  readonly displayName: string

  // Authentication methods
  supportsOAuth(): boolean
  supportsPAT(): boolean
  supportsDeviceFlow(): boolean

  // OAuth flow
  getAuthorizationUrl(state: string): string
  exchangeCodeForToken(code: string): Promise<TokenResponse>

  // Device flow (if supported)
  initiateDeviceFlow?(): Promise<DeviceFlowResponse>
  pollDeviceFlow?(deviceCode: string): Promise<TokenResponse>

  // PAT validation
  validateToken(token: string): Promise<User>

  // Token refresh (if supported)
  refreshToken?(refreshToken: string): Promise<TokenResponse>
}
```

### 2.4 Platform-Specific Considerations

| Platform                    | Recommended OAuth Method   | Fallback              |
| --------------------------- | -------------------------- | --------------------- |
| **SPA/PWA**                 | OAuth 2.0 with PKCE        | PAT                   |
| **Electron**                | Device Flow                | PAT via `~/.leptonrc` |
| **Capacitor (iOS/Android)** | OAuth 2.0 with deep links  | PAT                   |

---

## Phase 3: Implementation Plan

### 3.1 File Structure

```
src/
├── services/
│   ├── auth/
│   │   ├── index.ts              # Auth service coordinator
│   │   ├── types.ts              # Shared auth types
│   │   ├── github-auth.ts        # GitHub OAuth/PAT provider
│   │   ├── gitlab-auth.ts        # GitLab OAuth/PAT provider (future)
│   │   └── bitbucket-auth.ts     # Bitbucket OAuth/PAT provider (future)
│   ├── api/
│   │   ├── github-api.ts         # Existing GitHub Gist API
│   │   ├── gitlab-api.ts         # GitLab Snippets API (future)
│   │   └── bitbucket-api.ts      # Bitbucket Snippets API (future)
│   └── snippets/
│       └── snippet-adapter.ts    # Unified snippet interface
├── stores/
│   └── auth.ts                   # Updated to support multi-provider
└── types/
    └── auth.ts                   # Auth-related type definitions
```

### 3.2 Implementation Phases

#### Phase 3.2.1: GitHub OAuth Enhancement (Issue #16)

1. **Create auth provider abstraction**
   - Define `AuthProvider` interface
   - Implement `GitHubAuthProvider` with PAT + OAuth support

2. **Add Device Flow for Electron**
   - Implement Device Flow authorization
   - Add polling mechanism for token retrieval
   - Store tokens securely in `~/.leptonrc` or system keychain

3. **Add OAuth flow for SPA/PWA**
   - Implement OAuth 2.0 with PKCE
   - Handle redirect callback
   - Manage token refresh

4. **Update Login UI**
   - Add "Login with GitHub" button
   - Keep PAT option as alternative
   - Show appropriate method based on platform

#### Phase 3.2.2: GitLab Support (Future)

1. **Implement GitLabAuthProvider**
2. **Create gitlab-api.ts for Snippets API**
3. **Add GitLab to login options**
4. **Map GitLab Snippets to unified snippet model**

#### Phase 3.2.3: Bitbucket Support (Future)

1. **Implement BitbucketAuthProvider**
2. **Create bitbucket-api.ts for Snippets API**
3. **Add Bitbucket to login options**
4. **Map Bitbucket Snippets to unified snippet model**

---

## Phase 4: Security Considerations

### 4.1 Token Storage

| Platform      | Storage Method                   | Encryption                    |
| ------------- | -------------------------------- | ----------------------------- |
| **Web/PWA**   | localStorage (current)           | Consider Web Crypto API       |
| **Electron**  | `~/.leptonrc` or system keychain | OS-level encryption preferred |
| **Capacitor** | Secure storage plugin            | Native secure storage         |

### 4.2 OAuth Security Best Practices → **Issue #21**

- [ ] Use PKCE (Proof Key for Code Exchange) for public clients
- [ ] Validate `state` parameter to prevent CSRF
- [ ] Store tokens securely (never in URL or logs)
- [ ] Implement token refresh before expiration
- [ ] Clear tokens completely on logout

### 4.3 Client ID/Secret Management

- **SPA/PWA**: Use public OAuth apps (no client secret) with PKCE
- **Electron**: Store client ID in app, secret in secure config
- **Backend proxy**: Consider proxy for token exchange to hide secrets

---

## Phase 5: Testing Strategy

### 5.1 Unit Tests

- [ ] Auth provider interface compliance
- [ ] Token validation logic
- [ ] Token refresh logic
- [ ] Error handling for auth failures

### 5.2 Integration Tests

- [ ] OAuth flow end-to-end (mocked)
- [ ] Device flow polling
- [ ] Multi-provider switching
- [ ] Session persistence across restarts

### 5.3 E2E Tests (Docker)

- [ ] Full OAuth login flow
- [ ] PAT fallback flow
- [ ] Logout and re-login
- [ ] Token expiration handling

---

## Phase 6: API Comparison

### Snippet/Gist Feature Comparison

| Feature             | GitHub Gists   | GitLab Snippets  | Bitbucket Snippets |
| ------------------- | -------------- | ---------------- | ------------------ |
| **Multi-file**      | Yes            | Yes              | Yes                |
| **Public/Private**  | Yes            | Yes (+ Internal) | Yes                |
| **Version History** | Yes            | Yes              | Yes                |
| **Comments**        | Yes            | Yes (Notes)      | Yes                |
| **Forks**           | Yes            | No               | No                 |
| **Stars**           | Yes            | No               | No                 |
| **Embed**           | Yes            | Yes              | Yes                |
| **API Rate Limits** | 5000/hr (auth) | 2000/min         | Varies             |

### API Endpoint Mapping

| Operation  | GitHub               | GitLab                | Bitbucket                        |
| ---------- | -------------------- | --------------------- | -------------------------------- |
| List all   | `GET /gists`         | `GET /snippets`       | `GET /snippets`                  |
| Get one    | `GET /gists/:id`     | `GET /snippets/:id`   | `GET /snippets/:workspace/:id`   |
| Create     | `POST /gists`        | `POST /snippets`      | `POST /snippets`                 |
| Update     | `PATCH /gists/:id`   | `PUT /snippets/:id`   | `PUT /snippets/:workspace/:id`   |
| Delete     | `DELETE /gists/:id`  | `DELETE /snippets/:id`| `DELETE /snippets/:workspace/:id`|

---

## Open Questions

1. **OAuth App Registration**: Should we create a single Qepton OAuth app, or guide users to create their own?
2. **Multi-account support**: Should users be able to connect multiple providers simultaneously?
3. **Data sync**: How to handle snippets across providers (if at all)?
4. **Enterprise instances**: How to support GitHub Enterprise, GitLab self-hosted, Bitbucket Server?
5. **Offline mode**: How does OAuth affect offline capabilities in PWA?

---

## Next Steps

1. [ ] Complete Phase 1 research for all three providers
2. [ ] Create detailed technical RFC for auth provider architecture
3. [ ] Prototype GitHub Device Flow in Electron
4. [ ] Prototype GitHub OAuth in SPA mode
5. [ ] Update this document with findings

---

## References

### GitHub
- [OAuth Apps Overview](https://docs.github.com/en/apps/oauth-apps)
- [Device Flow](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps#device-flow)
- [GitHub Apps](https://docs.github.com/en/apps/creating-github-apps)
- [Gists API](https://docs.github.com/en/rest/gists)

### GitLab
- [OAuth 2.0](https://docs.gitlab.com/ee/api/oauth2.html)
- [Snippets API](https://docs.gitlab.com/ee/api/snippets.html)
- [Personal Access Tokens](https://docs.gitlab.com/ee/user/profile/personal_access_tokens.html)

### Bitbucket
- [OAuth 2.0](https://support.atlassian.com/bitbucket-cloud/docs/use-oauth-on-bitbucket-cloud/)
- [App Passwords](https://support.atlassian.com/bitbucket-cloud/docs/app-passwords/)
- [Snippets API](https://developer.atlassian.com/cloud/bitbucket/rest/api-group-snippets/)

### Security
- [OAuth 2.0 Security Best Practices](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics)
- [PKCE RFC](https://datatracker.ietf.org/doc/html/rfc7636)
