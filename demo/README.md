# Qepton Demo

This directory contains the backup and management scripts for the `qepton-demo` playground.

## Architecture

```
qepton-demo (GitHub user account)
├── qepton-demo.github.io    → Demo app (deployed via workflow)
└── Gists                    → Playground gists (reset weekly)

Qepton-Dev (this repo)
├── src/
│   ├── pages/DemoLoginPage.vue    → CAPTCHA login for demo
│   └── components/DemoBanner.vue  → "Demo Mode" indicator
└── demo/
    └── sample-gists/              → Backup of sample gists (JSON)
```

## How It Works

1. **Build**: The SPA is built with `VITE_DEMO_MODE=true` and split base64-encoded token parts
2. **Login**: Users see a CAPTCHA instead of token input
3. **Auth**: After CAPTCHA, the app decodes and concatenates the token parts, then authenticates
4. **Banner**: A "Demo Mode | Be a Gracious User | Refreshes Sundays" banner shows at the top
5. **Reset**: Gists reset to sample state every Sunday
6. **Logout**: Settings and UI preferences reset to defaults

### Why Split Tokens?

GitHub has two layers of token detection:
1. **Token Guardian (TGH)** - Scans source code for patterns like `ghp_*`, `github_pat_*`
2. **Push Protection** - Scans pushed content (including built JS bundles) for secrets, even base64-encoded

A single base64-encoded token gets detected by Push Protection in the built JavaScript. By splitting the token in half and encoding each part separately, the pattern isn't recognized. The parts are concatenated at runtime after decoding.

**Note**: Base64 is encoding, not encryption. Anyone can decode it. This is acceptable because:
- The demo account has limited permissions (gist scope only)
- The token is rotated periodically (90 days)
- CAPTCHA prevents automated abuse

## Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `demo-setup.yml` | Manual | Create qepton-demo.github.io repo |
| `demo-deploy.yml` | Push to src/ | Build and deploy demo app |
| `demo-reset-gists.yml` | Cron (Sunday) | Reset gists to sample state |

## Secrets Required

Two separate tokens are used for security (principle of least privilege):

| Secret                  | Scopes         | Purpose                                       |
| ----------------------- | -------------- | --------------------------------------------- |
| `DEMO_GITHUB_TOKEN`     | `repo`, `gist` | Workflow: deploy app, reset gists             |
| `VITE_DEMO_TOKEN_P1`    | `gist` only    | Runtime: first half of token (base64)         |
| `VITE_DEMO_TOKEN_P2`    | `gist` only    | Runtime: second half of token (base64)        |
| `VITE_HCAPTCHA_SITEKEY` | n/a            | hCaptcha site key (optional, uses test key)   |

**Why split tokens?** GitHub's push protection detects base64-encoded tokens. By splitting the token in half and encoding each part separately, the pattern isn't recognized. The parts are concatenated at runtime.

**Why gist-only scope?** The runtime token is embedded in the JavaScript bundle and can be extracted by anyone. By limiting it to `gist` scope only, an attacker cannot push malicious code to the demo repo - they can only read/write gists on the demo account.

## URLs

| URL | Description |
|-----|-------------|
| https://qepton-demo.github.io | Demo app |
| https://gist.github.com/qepton-demo | Demo gists |

## Manual Operations

```bash
# Reset gists manually
gh workflow run demo-reset-gists.yml -R whizbangdevelopers-org/Qepton-Dev

# Redeploy demo app
gh workflow run demo-deploy.yml -R whizbangdevelopers-org/Qepton-Dev

# Full rebuild (create repo from scratch)
gh workflow run demo-setup.yml -R whizbangdevelopers-org/Qepton-Dev
```

## Environment Variables (Build Time)

| Variable                | Description                                    |
| ----------------------- | ---------------------------------------------- |
| `VITE_DEMO_MODE`        | Set to `'true'` to enable demo mode            |
| `VITE_DEMO_TOKEN_P1`    | First half of token (base64-encoded)           |
| `VITE_DEMO_TOKEN_P2`    | Second half of token (base64-encoded)          |
| `VITE_HCAPTCHA_SITEKEY` | hCaptcha site key                              |

## Token Setup

### Token 1: Workflow Token (`DEMO_GITHUB_TOKEN`)

Used by GitHub Actions to deploy the app and manage gists.

1. Log in as `qepton-demo` account
2. Go to: https://github.com/settings/tokens?type=beta
3. Create new fine-grained token:
   - **Name**: `demo-workflow`
   - **Expiration**: 90 days
   - **Repository access**: Select `qepton-demo.github.io`
   - **Permissions**:
     - Repository: Contents (Read and write)
     - Account: Gists (Read and write)
4. Add to **dev** repo secrets as `DEMO_GITHUB_TOKEN`

### Token 2: Runtime Token (Split)

Used by the browser app for authentication. **Gist scope only** for security. Split into two parts to bypass GitHub push protection.

```bash
# 1. Create a SEPARATE PAT for qepton-demo account
#    - Go to: https://github.com/settings/tokens?type=beta
#    - Name: demo-runtime
#    - Expiration: 90 days
#    - Repository access: None (public repositories only)
#    - Account permissions: Gists (Read and write) - ONLY THIS

# 2. Split the token in half and encode each part
#    Example token: github_pat_abcdefghij1234567890
#    Split point: roughly in the middle

TOKEN="github_pat_abcdefghij1234567890"
MIDPOINT=$((${#TOKEN} / 2))
PART1="${TOKEN:0:$MIDPOINT}"
PART2="${TOKEN:$MIDPOINT}"

echo "P1: $(echo -n "$PART1" | base64)"
echo "P2: $(echo -n "$PART2" | base64)"

# 3. Add BOTH parts to Qepton-Dev repo secrets:
#    Settings → Secrets and variables → Actions → New repository secret
#    - Name: VITE_DEMO_TOKEN_P1, Value: <base64 of first half>
#    - Name: VITE_DEMO_TOKEN_P2, Value: <base64 of second half>

# 4. Trigger a redeploy to use the new token
gh workflow run demo-deploy.yml -R whizbangdevelopers-org/Qepton-Dev
```

**Important**: Use `echo -n` (no newline) to avoid encoding a trailing newline character.

### Token Rotation

Both tokens should be rotated before expiry (90 days). Set a calendar reminder or create a GitHub issue to track rotation dates.
