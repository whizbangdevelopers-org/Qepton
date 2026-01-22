# Pacman Package Build

This directory contains files for building Qepton as an Arch Linux pacman package.

## Files

| File             | Purpose                           |
| ---------------- | --------------------------------- |
| `PKGBUILD`       | Package build script              |
| `qepton.desktop` | Desktop entry for app menu        |
| `qepton.sh`      | Launcher script                   |
| `build.sh`       | Local build script                |

## Building Locally

```bash
# From this directory
./build.sh

# Or manually
makepkg -s
```

Output: `qepton-<version>-1-x86_64.pkg.tar.zst`

## Installing

```bash
sudo pacman -U qepton-1.0.8-1-x86_64.pkg.tar.zst
```

## Verifying Installation

```bash
# Check package info
pacman -Qi qepton

# List installed files
pacman -Ql qepton

# Run the app
qepton
```

## Uninstalling

```bash
sudo pacman -R qepton
```

## GitHub Actions

The release workflow builds this package automatically. The package is built in an Arch Linux container and uploaded to GitHub Releases.

## AUR (Future)

To publish to AUR:

1. Create AUR account at https://aur.archlinux.org
2. Generate SSH key and add to AUR account
3. Clone AUR package: `git clone ssh://aur@aur.archlinux.org/qepton.git`
4. Copy PKGBUILD and update `.SRCINFO`: `makepkg --printsrcinfo > .SRCINFO`
5. Commit and push

## Testing

See [docs/ARCHLINUX-VM-SETUP.md](../docs/ARCHLINUX-VM-SETUP.md) for VM-based testing.
