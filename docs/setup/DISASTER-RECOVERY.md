# Disaster Recovery

Quick setup guide for cloning and resuming development on a new machine.

## Clone and Go

```bash
git clone git@github.com:whizbangdevelopers/Qepton-Dev.git
cd Qepton-Dev
npm install
```

That's it. All secrets and configs are tracked in this private repo.

## What's Tracked vs Regenerated

| Tracked (ready to use)                           | Regenerated (automatic)                          |
| ------------------------------------------------ | ------------------------------------------------ |
| `.env`, `.env.local`                             | `node_modules/` → `npm install`                  |
| `e2e-docker/.env`                                | `.quasar/` → auto-generated on dev               |
| `docs/android/*.keystore`, `keystore.properties` | `src-capacitor/android/`, `ios/` → `npx cap add` |
| `docs/mac-ios/ExportOptions.plist`               | Build outputs (`dist/`, `www/`)                  |
| `.claude/` settings                              | `playwright-report/`, `test-results/`            |

## Optional One-Time Setup

### Mobile Development

```bash
npx cap add android
npx cap add ios
```

### E2E Testing

```bash
cd e2e-docker
./scripts/setup.sh
```

## Security Note

This repo is private and must remain private. It contains:

- Android signing keys (`.keystore`, `.jks`)
- iOS export configuration
- GitHub tokens (in `.env` files)
- CI/CD secrets
