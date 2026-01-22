# Qepton Snap Store Publishing Guide

This guide covers getting Qepton published to the Ubuntu Snap Store.

## Overview

There are two workflows:
1. **Automated (GitHub Actions)** - Builds and publishes on tagged releases
2. **Manual (Local)** - Build and upload from your machine

---

## Prerequisites

### 1. Create a Snapcraft Account

1. Go to [snapcraft.io](https://snapcraft.io)
2. Click "Sign in" and create an Ubuntu One account
3. Once logged in, go to "My Account" → "Developer settings"

### 2. Register Your Snap Name

```bash
# Install snapcraft
sudo snap install snapcraft --classic

# Login to Snapcraft
snapcraft login

# Register the snap name (do this once)
snapcraft register qepton
```

If `qepton` is taken, you'll need to choose a different name.

### 3. Generate Store Credentials for GitHub Actions

```bash
# Generate credentials (valid for 1 year by default)
snapcraft export-login --snaps=qepton --channels=edge,stable credentials.txt

# View the credentials (you'll add this to GitHub Secrets)
cat credentials.txt
```

**Important**: Keep `credentials.txt` secure and delete it after adding to GitHub.

---

## GitHub Actions Setup

### Add the Secret

1. Go to your GitHub repo → Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Name: `SNAPCRAFT_STORE_CREDENTIALS`
4. Value: Paste the entire contents of `credentials.txt`

### How It Works

The new `snap.yml` workflow:
- **On tagged releases (v*)**: Builds snap and publishes to `edge` channel
- **Manual trigger**: Option to publish to `stable` channel
- **Always**: Uploads snap as GitHub Release asset

### Publishing Channels

| Channel | Purpose | Risk Level |
|---------|---------|------------|
| `edge` | Latest builds, may be unstable | High |
| `beta` | Feature testing | Medium |
| `candidate` | Release candidates | Low |
| `stable` | Production releases | Lowest |

Recommended flow: `edge` → test → `stable`

---

## Local Build & Publish

### Build the Snap

```bash
cd /home/mark/Projects/Qepton

# Option 1: Use snapcraft directly (requires LXD or Multipass)
snapcraft

# Option 2: Build with electron-builder first, then package
npm run build:electron
# Then use the snap from dist/electron/Packaged/
```

### Install LXD (if needed)

```bash
# On NixOS, add to configuration.nix:
virtualisation.lxd.enable = true;
users.users.mark.extraGroups = [ "lxd" ];

# Then initialize LXD
sudo lxd init --auto

# Or use Multipass instead
sudo snap install multipass
```

### Upload to Store

```bash
# Upload to edge channel
snapcraft upload qepton_1.0.11_amd64.snap --release=edge

# Promote to stable after testing
snapcraft release qepton 1 stable
# (where 1 is the revision number from upload)
```

### Check Store Status

```bash
# View all revisions
snapcraft status qepton

# View store listing
snapcraft list-revisions qepton
```

---

## Testing Your Snap

### Install from Edge Channel

```bash
sudo snap install qepton --edge
```

### Install Local Build

```bash
sudo snap install qepton_1.0.11_amd64.snap --dangerous
```

### Test Confinement

```bash
# Check what interfaces are connected
snap connections qepton

# View logs if there are issues
snap logs qepton
journalctl --user -u snap.qepton.qepton
```

---

## Troubleshooting

### Common Build Issues

**Error: "Failed to build snap"**
- Ensure LXD or Multipass is installed and running
- Try `snapcraft clean` then rebuild

**Error: "Cannot allocate memory"**
- LXD/Multipass VMs need RAM; try closing other apps
- Use `--destructive-mode` to build on host (not recommended)

**Error: "GLIBC version not found"**
- The snap base (core22) may need different stage-packages
- Check that all required libraries are listed

### GitHub Actions Issues

**Error: "SNAPCRAFT_STORE_CREDENTIALS not set"**
- Verify the secret is added correctly
- Regenerate credentials if expired

**Error: "Snap name not registered"**
- Run `snapcraft register qepton` locally first

**Build succeeds but snap doesn't install**
- Check the snap's confinement settings
- Review `snap logs` for permission errors

### Confinement Issues

If the app can't access network or files:

```bash
# Connect additional interfaces
sudo snap connect qepton:network :network
sudo snap connect qepton:home :home
```

---

## Snap Store Listing

After your first upload, enhance your listing at [snapcraft.io/qepton](https://snapcraft.io/qepton):

1. Add screenshots (1280x720 recommended)
2. Write a detailed description
3. Add a banner image (720x240)
4. Set categories: Development, Utilities
5. Add links to GitHub, website

---

## Files Created

| File | Purpose |
|------|---------|
| `snap/snapcraft.yaml` | Snap build configuration |
| `.github/workflows/snap.yml` | GitHub Actions workflow |

---

## Quick Reference

```bash
# Build locally
snapcraft

# Upload to edge
snapcraft upload *.snap --release=edge

# Promote to stable
snapcraft release qepton <revision> stable

# Check status
snapcraft status qepton

# View credentials expiry
snapcraft whoami
```
