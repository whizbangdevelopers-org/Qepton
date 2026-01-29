# Post-Release Testing

Testing workflow after triggering a release. The PWA deploys quickly while native builds take longer - use that time efficiently.

## Folder Structure

```
testing/post-release/
├── README.md              # This file
├── PROXMOX-TESTING.md     # Proxmox VM automation setup
└── scripts/
    ├── test-all-vms.sh    # Run all VM tests
    ├── test-fedora-vm.sh  # Fedora: RPM + Flatpak + Snap
    ├── test-arch-vm.sh    # Arch: pacman
    ├── test-debian-vm.sh  # Debian/Ubuntu: .deb
    ├── test-appimage-vm.sh # Any Linux: AppImage
    └── test-windows.ps1   # Windows installer
```

## Build Timeline

```
Release triggered
    │
    ├─► PWA/GitHub Pages    ~2-3 min   ◄── Test this first!
    │
    ├─► AppImage            ~8-10 min
    ├─► .deb                ~8-10 min
    ├─► .rpm                ~10-12 min
    ├─► Flatpak             ~12-15 min
    ├─► Snap                ~15-20 min
    │
    └─► Windows/Mac         ~15-25 min
```

## Phase 1: PWA Testing (While Waiting)

The PWA at https://whizbangdevelopers.github.io/Qepton deploys within minutes. Test manually:

### Quick Smoke Test

- [ ] Load the PWA in browser
- [ ] Verify version number in settings/about
- [ ] Login with GitHub OAuth
- [ ] Load gists list
- [ ] Open a gist, verify syntax highlighting
- [ ] Create a test gist
- [ ] Delete the test gist
- [ ] Test search functionality
- [ ] Toggle dark/light mode

### Browser Matrix (if time permits)

| Browser | Status | Notes |
| ------- | ------ | ----- |
| Chrome  |        |       |
| Firefox |        |       |
| Safari  |        |       |
| Edge    |        |       |

### PWA-Specific

- [ ] Install as PWA (Add to Home Screen)
- [ ] Launch from home screen
- [ ] Offline indicator shows when disconnected
- [ ] Service worker caches static assets

## Phase 2: Native Builds

Once builds complete, test via Proxmox VMs or manually.

### VM Testing Scripts

Configure your VMs once:

```bash
mkdir -p ~/.config/qepton
cat > ~/.config/qepton/vms.env << 'EOF'
FEDORA_VM=192.168.122.100
ARCH_VM=192.168.122.101
DEBIAN_VM=192.168.122.102
EOF
```

Run tests:

```bash
# Test all configured VMs
./scripts/test-all-vms.sh <version>

# Test in parallel (faster)
./scripts/test-all-vms.sh <version> --parallel

# Test specific VMs only
./scripts/test-all-vms.sh <version> --only fedora,arch

# Or run individual scripts
./scripts/test-fedora-vm.sh 192.168.x.x <version>   # RPM + Flatpak + Snap
./scripts/test-arch-vm.sh 192.168.x.x <version>     # pacman
./scripts/test-debian-vm.sh 192.168.x.x <version>   # .deb
./scripts/test-appimage-vm.sh 192.168.x.x <version> # AppImage (any Linux)
```

See [PROXMOX-TESTING.md](./PROXMOX-TESTING.md) for automated VM provisioning.

### Manual Testing Checklist

#### Linux (AppImage/deb/rpm)

- [ ] Download and install
- [ ] App launches without errors
- [ ] Window controls work (minimize, maximize, close)
- [ ] OAuth login flow completes
- [ ] Gists load and display correctly
- [ ] File operations work (create, edit, delete)
- [ ] App appears in system menu/launcher

#### Flatpak

- [ ] `flatpak install` succeeds
- [ ] App launches in sandboxed environment
- [ ] OAuth redirect works (portal integration)
- [ ] Filesystem access works where permitted

#### Snap

- [ ] `snap install` succeeds
- [ ] Confinement doesn't break functionality
- [ ] Auto-updates work

#### Windows

- [ ] Installer runs without SmartScreen block (signed)
- [ ] App launches
- [ ] System tray integration works
- [ ] Uninstaller works cleanly

#### macOS

- [ ] DMG mounts, app drags to Applications
- [ ] App launches without Gatekeeper block (signed/notarized)
- [ ] Menu bar integration works

## Phase 3: Playwright E2E (Optional)

For thorough regression testing, run the full E2E suite against deployed instances:

```bash
# Against PWA
TEST_URL=https://whizbangdevelopers.github.io/Qepton npm run test:e2e

# Against local Electron build
npm run test:e2e:electron
```

## Issue Tracking

If issues are found:

1. Note the version, platform, and reproduction steps
2. Check if it's a regression (worked in previous version?)
3. File issue in Qepton-Dev with `post-release` label
4. Determine severity:
   - **Blocker**: Yank release, fix, re-release
   - **High**: Hotfix in next patch
   - **Medium/Low**: Add to next milestone

## Release Verification Checklist

Copy this for each release:

```markdown
## Release v<VERSION> Verification

**Release Date:** YYYY-MM-DD
**Tester:**

### PWA
- [ ] Deployed and accessible
- [ ] Version matches
- [ ] Core functionality works

### Linux
- [ ] AppImage - tested
- [ ] .deb - tested
- [ ] .rpm - tested
- [ ] Flatpak - tested
- [ ] Snap - tested

### Desktop
- [ ] Windows - tested
- [ ] macOS - tested

### Notes
<any issues or observations>
```
