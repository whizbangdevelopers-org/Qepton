# Qepton Flathub Publishing Guide

This guide covers getting Qepton published to Flathub.

## Overview

Flathub requires:
1. A separate GitHub repository: `flathub/com.whizbangdevelopers.Qepton`
2. Your manifest must use **remote sources** (URLs, not local paths)
3. AppStream metadata must pass validation
4. Screenshots must be hosted online

---

## Prerequisites

### Install Tools

**Ubuntu/Debian:**
```bash
sudo apt install flatpak flatpak-builder appstream
flatpak remote-add --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo
```

**Fedora:**
```bash
sudo dnf install flatpak flatpak-builder appstream
flatpak remote-add --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo
```

**NixOS:**
```nix
# configuration.nix
services.flatpak.enable = true;
environment.systemPackages = with pkgs; [ flatpak-builder appstream ];
```

### Install Runtimes

```bash
flatpak install flathub org.freedesktop.Platform//24.08
flatpak install flathub org.freedesktop.Sdk//24.08
flatpak install flathub org.electronjs.Electron2.BaseApp//24.08
```

---

## Step 1: Prepare Your GitHub Release

Before submitting to Flathub, ensure you have:

1. **A tagged release** with AppImage:
   ```bash
   git tag v1.0.11
   git push origin v1.0.11
   # GitHub Actions will create the release with AppImage
   ```

2. **Screenshots** in your repo:
   ```
   docs/screenshots/
   ├── main-light.png   (1280x720, default)
   ├── main-dark.png    (1280x720)
   └── search.png       (1280x720)
   ```

3. **Calculate SHA256** of your AppImage:
   ```bash
   sha256sum Qepton-1.0.11-x86_64.AppImage
   ```

---

## Step 2: Fix the Metadata

**IMPORTANT:** The metainfo.xml file needs manual fixes due to output filtering.

Edit `flatpak/com.whizbangdevelopers.Qepton.metainfo.xml`:
- Change `<n>` to `<name>` (line 4)
- Change `</n>` to `</name>` (line 4)  
- Change `<n>` to `<name>` (line 10)
- Change `</n>` to `</name>` (line 10)

The corrected lines should read:
```xml
  <name>Qepton</name>
  ...
  <developer id="com.whizbangdevelopers">
    <name>whizBANG Developers</name>
  </developer>
```

### Validate Metadata

```bash
appstreamcli validate flatpak/com.whizbangdevelopers.Qepton.metainfo.xml
```

Fix any errors before proceeding.

---

## Step 3: Update the Manifest for Flathub

Edit `flatpak/com.whizbangdevelopers.Qepton.yml`:

1. Replace the AppImage URL with your actual release URL
2. Replace `REPLACE_WITH_SHA256_FROM_sha256sum_COMMAND` with actual sha256

For Flathub submission, the manifest must use **remote sources**:

```yaml
sources:
  - type: file
    url: https://github.com/whizbangdevelopers/Qepton/releases/download/v1.0.11/Qepton-1.0.11-x86_64.AppImage
    sha256: abc123...  # actual sha256
    dest-filename: Qepton-1.0.11.AppImage
```

---

## Step 4: Test Locally

### Quick Test

```bash
cd flatpak
chmod +x build-flatpak.sh
./build-flatpak.sh all
./build-flatpak.sh install
./build-flatpak.sh test
```

### Manual Build

```bash
cd flatpak

# Build the Electron app
cd ..
npm run build:electron
cd flatpak

# Copy AppImage
cp ../dist/electron/Packaged/*.AppImage .

# Build flatpak using local manifest
flatpak-builder --force-clean --user \
    --install-deps-from=flathub \
    build-dir local-build.yml

# Create bundle
flatpak build-bundle repo qepton.flatpak com.whizbangdevelopers.Qepton

# Install and test
flatpak --user install qepton.flatpak
flatpak run com.whizbangdevelopers.Qepton
```

---

## Step 5: Submit to Flathub

### Create Your Flathub Repository

1. Go to [github.com/flathub/flathub](https://github.com/flathub/flathub)
2. Click "New submission" or create an issue
3. Wait for approval to create `flathub/com.whizbangdevelopers.Qepton`

### Prepare the Repository

Once approved, your repo will be created at:
`https://github.com/flathub/com.whizbangdevelopers.Qepton`

Structure:
```
com.whizbangdevelopers.Qepton/
├── com.whizbangdevelopers.Qepton.yml      # Manifest (remote sources!)
├── com.whizbangdevelopers.Qepton.metainfo.xml
├── com.whizbangdevelopers.Qepton.desktop
├── qepton.sh
└── flathub.json                           # Optional: build config
```

### Create flathub.json (Optional)

```json
{
  "only-arches": ["x86_64"],
  "skip-appstream-check": false
}
```

### Submit PR

```bash
# Clone your Flathub repo
git clone git@github.com:flathub/com.whizbangdevelopers.Qepton.git
cd com.whizbangdevelopers.Qepton

# Copy files (use remote-source version of manifest)
cp /path/to/Qepton/flatpak/*.yml .
cp /path/to/Qepton/flatpak/*.xml .
cp /path/to/Qepton/flatpak/*.desktop .
cp /path/to/Qepton/flatpak/qepton.sh .

# Commit and push
git add .
git commit -m "Initial submission"
git push origin main
```

The Flathub build bot will automatically build and test your submission.

---

## Step 6: Updating Releases

For new releases:

1. Create a new GitHub release with AppImage
2. Update the Flathub manifest:
   - New version in URL
   - New sha256
   - Update releases in metainfo.xml

3. Commit to your Flathub repo:
   ```bash
   git commit -am "Update to v1.0.12"
   git push
   ```

The build bot will automatically rebuild.

---

## Troubleshooting

### Build Fails: "sha256 mismatch"

Recalculate the sha256:
```bash
sha256sum Qepton-*.AppImage
```

### Build Fails: "AppStream validation failed"

```bash
appstreamcli validate com.whizbangdevelopers.Qepton.metainfo.xml
```

Common issues:
- Missing `<name>` tag (check for `<n>` typo)
- Screenshot URLs not accessible
- Missing required fields

### App Crashes: "zypak" errors

Ensure the Electron BaseApp is installed:
```bash
flatpak install flathub org.electronjs.Electron2.BaseApp//24.08
```

### Permission Denied Errors

Check your `finish-args` in the manifest. Common additions:
```yaml
finish-args:
  - --filesystem=xdg-documents  # Access Documents folder
  - --socket=ssh-auth           # SSH agent access
```

### Icons Not Showing

Ensure icons are installed to correct paths:
```
/app/share/icons/hicolor/128x128/apps/com.whizbangdevelopers.Qepton.png
```

---

## Files Reference

| File | Purpose |
|------|---------|
| `com.whizbangdevelopers.Qepton.yml` | Flatpak manifest |
| `com.whizbangdevelopers.Qepton.metainfo.xml` | AppStream metadata |
| `com.whizbangdevelopers.Qepton.desktop` | Desktop entry |
| `qepton.sh` | Wrapper script |
| `build-flatpak.sh` | Local build script |

---

## Quick Reference

```bash
# Build locally
./build-flatpak.sh all

# Install local build
./build-flatpak.sh install

# Run
flatpak run com.whizbangdevelopers.Qepton

# Uninstall
flatpak uninstall com.whizbangdevelopers.Qepton

# Validate metadata
appstreamcli validate com.whizbangdevelopers.Qepton.metainfo.xml

# Check what permissions the app has
flatpak info --show-permissions com.whizbangdevelopers.Qepton
```

---

## Useful Links

- [Flathub Submission Guidelines](https://github.com/flathub/flathub/wiki/App-Submission)
- [Flatpak Documentation](https://docs.flatpak.org/)
- [AppStream Metadata](https://freedesktop.org/software/appstream/docs/)
- [Electron BaseApp](https://github.com/nickvergessen/electron2-base-app)
