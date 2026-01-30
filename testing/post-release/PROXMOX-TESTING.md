# Proxmox Automated Release Testing

This guide covers setting up Proxmox VE for automated Qepton release testing. Once configured, you can spin up fresh VMs, test release artifacts, and tear them down - similar to CI but on your own hardware.

## Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Proxmox VE Host                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  fedora-    │  │   arch-     │  │  debian-    │              │
│  │  template   │  │  template   │  │  template   │              │
│  │  (cloud)    │  │  (cloud)    │  │  (cloud)    │              │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
│         │                │                │                      │
│         ▼                ▼                ▼                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │ fedora-test │  │  arch-test  │  │ debian-test │  ◄── Cloned  │
│  │   (clone)   │  │   (clone)   │  │   (clone)   │      on      │
│  │             │  │             │  │             │      demand  │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  NixOS Workstation  │
                    │  (runs test scripts)│
                    └─────────────────┘
```

## Prerequisites

- Proxmox VE 8.x installed
- Network configured (DHCP or static IPs for VMs)
- DNS resolved (or use IP addresses)
- API token created for automation

## Initial Proxmox Setup

### 1. Create API Token

On Proxmox web UI or CLI:

```bash
# On Proxmox host
pveum user add qepton-test@pve
pveum aclmod / -user qepton-test@pve -role PVEVMAdmin
pveum user token add qepton-test@pve automation --privsep=0
```

Save the token ID and secret. You'll need:
- Token ID: `qepton-test@pve!automation`
- Secret: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

### 2. Download Cloud Images

```bash
# On Proxmox host
cd /var/lib/vz/template/iso

# Fedora Cloud (for rpm + Flatpak)
wget https://download.fedoraproject.org/pub/fedora/linux/releases/40/Cloud/x86_64/images/Fedora-Cloud-Base-Generic.x86_64-40-1.14.qcow2

# Arch Linux Cloud (for pacman)
wget https://geo.mirror.pkgbuild.com/images/latest/Arch-Linux-x86_64-cloudimg.qcow2

# Debian Cloud (for deb compatibility)
wget https://cloud.debian.org/images/cloud/bookworm/latest/debian-12-generic-amd64.qcow2
```

### 3. Create VM Templates

#### Fedora Template (VM ID 9000)

```bash
# Create VM
qm create 9000 --name fedora-template --memory 4096 --cores 2 --net0 virtio,bridge=vmbr0

# Import cloud image as disk
qm importdisk 9000 /var/lib/vz/template/iso/Fedora-Cloud-Base-Generic.x86_64-40-1.14.qcow2 local-lvm

# Attach disk
qm set 9000 --scsihw virtio-scsi-pci --scsi0 local-lvm:vm-9000-disk-0

# Add cloud-init drive
qm set 9000 --ide2 local-lvm:cloudinit

# Set boot order
qm set 9000 --boot c --bootdisk scsi0

# Enable QEMU agent
qm set 9000 --agent enabled=1

# Configure cloud-init defaults
qm set 9000 --ciuser testuser
qm set 9000 --cipassword "testing123"
qm set 9000 --sshkeys ~/.ssh/id_rsa.pub
qm set 9000 --ipconfig0 ip=dhcp

# Convert to template
qm template 9000
```

#### Arch Template (VM ID 9001)

```bash
qm create 9001 --name arch-template --memory 2048 --cores 2 --net0 virtio,bridge=vmbr0
qm importdisk 9001 /var/lib/vz/template/iso/Arch-Linux-x86_64-cloudimg.qcow2 local-lvm
qm set 9001 --scsihw virtio-scsi-pci --scsi0 local-lvm:vm-9001-disk-0
qm set 9001 --ide2 local-lvm:cloudinit
qm set 9001 --boot c --bootdisk scsi0
qm set 9001 --agent enabled=1
qm set 9001 --ciuser testuser
qm set 9001 --cipassword "testing123"
qm set 9001 --sshkeys ~/.ssh/id_rsa.pub
qm set 9001 --ipconfig0 ip=dhcp
qm template 9001
```

#### Debian Template (VM ID 9002)

```bash
qm create 9002 --name debian-template --memory 2048 --cores 2 --net0 virtio,bridge=vmbr0
qm importdisk 9002 /var/lib/vz/template/iso/debian-12-generic-amd64.qcow2 local-lvm
qm set 9002 --scsihw virtio-scsi-pci --scsi0 local-lvm:vm-9002-disk-0
qm set 9002 --ide2 local-lvm:cloudinit
qm set 9002 --boot c --bootdisk scsi0
qm set 9002 --agent enabled=1
qm set 9002 --ciuser testuser
qm set 9002 --cipassword "testing123"
qm set 9002 --sshkeys ~/.ssh/id_rsa.pub
qm set 9002 --ipconfig0 ip=dhcp
qm template 9002
```

## NixOS Client Configuration

Add to your NixOS configuration to enable Proxmox API access:

```nix
{ config, pkgs, ... }:

{
  environment.systemPackages = with pkgs; [
    # Proxmox CLI tools
    python3Packages.proxmoxer
    jq
    curl
  ];
}
```

Create a credentials file at `~/.config/qepton/proxmox.env`:

```bash
PROXMOX_HOST="192.168.1.100"  # Your Proxmox IP
PROXMOX_USER="qepton-test@pve"
PROXMOX_TOKEN_ID="automation"
PROXMOX_TOKEN_SECRET="your-token-secret-here"
PROXMOX_NODE="pve"  # Your node name
```

## Automation Scripts

### Main Test Runner

Create `scripts/test-proxmox.sh`:

```bash
#!/usr/bin/env bash
# test-proxmox.sh - Automated release testing via Proxmox
#
# Usage:
#   ./scripts/test-proxmox.sh <version> [distro]
#   ./scripts/test-proxmox.sh 1.0.12           # Test all distros
#   ./scripts/test-proxmox.sh 1.0.12 fedora    # Test Fedora only

set -e

VERSION="${1:-}"
DISTRO="${2:-all}"

if [ -z "$VERSION" ]; then
    echo "Usage: $0 <version> [distro]"
    echo "  distro: fedora, arch, debian, or all (default)"
    exit 1
fi

# Load credentials
if [ -f ~/.config/qepton/proxmox.env ]; then
    source ~/.config/qepton/proxmox.env
else
    echo "Error: ~/.config/qepton/proxmox.env not found"
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Template IDs
declare -A TEMPLATES=(
    ["fedora"]=9000
    ["arch"]=9001
    ["debian"]=9002
)

# Test VM IDs (will be cloned from templates)
declare -A TEST_VMS=(
    ["fedora"]=100
    ["arch"]=101
    ["debian"]=102
)

# Proxmox API helper
pve_api() {
    local method="$1"
    local endpoint="$2"
    shift 2

    curl -s -k -X "$method" \
        -H "Authorization: PVEAPIToken=${PROXMOX_USER}!${PROXMOX_TOKEN_ID}=${PROXMOX_TOKEN_SECRET}" \
        "https://${PROXMOX_HOST}:8006/api2/json${endpoint}" \
        "$@"
}

# Clone VM from template
clone_vm() {
    local distro="$1"
    local template_id="${TEMPLATES[$distro]}"
    local vm_id="${TEST_VMS[$distro]}"

    echo "Cloning ${distro} from template ${template_id} to VM ${vm_id}..."

    # Delete existing VM if present
    pve_api DELETE "/nodes/${PROXMOX_NODE}/qemu/${vm_id}" 2>/dev/null || true
    sleep 2

    # Clone
    pve_api POST "/nodes/${PROXMOX_NODE}/qemu/${template_id}/clone" \
        -d "newid=${vm_id}" \
        -d "name=${distro}-test" \
        -d "full=1"

    # Wait for clone
    sleep 10

    # Start VM
    pve_api POST "/nodes/${PROXMOX_NODE}/qemu/${vm_id}/status/start"

    echo "Waiting for VM to boot..."
    sleep 60
}

# Get VM IP address
get_vm_ip() {
    local vm_id="$1"

    # Try QEMU agent first
    local ip=$(pve_api GET "/nodes/${PROXMOX_NODE}/qemu/${vm_id}/agent/network-get-interfaces" 2>/dev/null \
        | jq -r '.data.result[] | select(.name != "lo") | .["ip-addresses"][]? | select(.["ip-address-type"] == "ipv4") | .["ip-address"]' \
        | head -1)

    if [ -n "$ip" ] && [ "$ip" != "null" ]; then
        echo "$ip"
        return 0
    fi

    # Fallback: check ARP table on Proxmox (requires SSH access)
    echo ""
    return 1
}

# Destroy test VM
destroy_vm() {
    local distro="$1"
    local vm_id="${TEST_VMS[$distro]}"

    echo "Destroying ${distro} test VM..."
    pve_api POST "/nodes/${PROXMOX_NODE}/qemu/${vm_id}/status/stop" 2>/dev/null || true
    sleep 5
    pve_api DELETE "/nodes/${PROXMOX_NODE}/qemu/${vm_id}" 2>/dev/null || true
}

# Run tests for a distro
test_distro() {
    local distro="$1"

    echo ""
    echo "========================================="
    echo "  Testing ${distro} - v${VERSION}"
    echo "========================================="
    echo ""

    # Clone fresh VM
    clone_vm "$distro"

    # Get IP
    local vm_ip=""
    for i in {1..12}; do
        vm_ip=$(get_vm_ip "${TEST_VMS[$distro]}")
        if [ -n "$vm_ip" ]; then
            break
        fi
        echo "Waiting for IP... (attempt $i/12)"
        sleep 10
    done

    if [ -z "$vm_ip" ]; then
        echo "Error: Could not get VM IP address"
        destroy_vm "$distro"
        return 1
    fi

    echo "VM IP: $vm_ip"

    # Run distro-specific test script
    case "$distro" in
        fedora)
            "$SCRIPT_DIR/test-fedora-vm.sh" "$vm_ip" "$VERSION"
            ;;
        arch)
            "$SCRIPT_DIR/test-arch-vm.sh" "$vm_ip" "$VERSION"
            ;;
        debian)
            "$SCRIPT_DIR/test-debian-vm.sh" "$vm_ip" "$VERSION"
            ;;
    esac

    local result=$?

    # Cleanup
    destroy_vm "$distro"

    return $result
}

# Main
echo "Qepton Proxmox Release Testing"
echo "Version: $VERSION"
echo "Distros: $DISTRO"
echo ""

if [ "$DISTRO" = "all" ]; then
    for d in fedora arch debian; do
        test_distro "$d" || echo "Warning: $d tests had failures"
    done
else
    test_distro "$DISTRO"
fi

echo ""
echo "Testing complete!"
```

### Arch Linux Test Script

Create `scripts/test-arch-vm.sh`:

```bash
#!/usr/bin/env bash
# test-arch-vm.sh - Test pacman package on Arch Linux VM
#
# Usage: ./scripts/test-arch-vm.sh <vm-ip> <version>

set -e

VM_HOST="${1:-}"
VERSION="${2:-}"
SSH_OPTS="-o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new"
SSH_USER="${SSH_USER:-testuser}"

if [ -z "$VM_HOST" ] || [ -z "$VERSION" ]; then
    echo "Usage: $0 <vm-host> <version>"
    exit 1
fi

echo "Testing Qepton v${VERSION} pacman package on Arch Linux"
echo ""

# Wait for SSH
echo "Waiting for SSH..."
for i in {1..30}; do
    if ssh $SSH_OPTS "${SSH_USER}@${VM_HOST}" "echo OK" 2>/dev/null; then
        break
    fi
    sleep 5
done

# Install dependencies (xvfb for headless testing)
echo "Installing test dependencies..."
ssh $SSH_OPTS "${SSH_USER}@${VM_HOST}" "sudo pacman -Syu --noconfirm xorg-server-xvfb"

# Download pacman package
PACMAN_URL="https://github.com/whizbangdevelopers/Qepton-Dev/releases/download/v${VERSION}/qepton-${VERSION}-1-x86_64.pkg.tar.zst"
echo "Downloading pacman package..."
ssh $SSH_OPTS "${SSH_USER}@${VM_HOST}" "curl -fLo ~/qepton.pkg.tar.zst '$PACMAN_URL'" || {
    echo "Warning: Could not download from Dev repo, trying Free repo..."
    PACMAN_URL="https://github.com/whizbangdevelopers/Qepton/releases/download/v${VERSION}/qepton-${VERSION}-1-x86_64.pkg.tar.zst"
    ssh $SSH_OPTS "${SSH_USER}@${VM_HOST}" "curl -fLo ~/qepton.pkg.tar.zst '$PACMAN_URL'"
}

# Install
echo "Installing pacman package..."
ssh $SSH_OPTS "${SSH_USER}@${VM_HOST}" "sudo pacman -U --noconfirm ~/qepton.pkg.tar.zst"

# Verify
echo "Verifying installation..."
ssh $SSH_OPTS "${SSH_USER}@${VM_HOST}" "pacman -Qi qepton"

# Smoke test
echo "Running smoke test..."
ssh $SSH_OPTS "${SSH_USER}@${VM_HOST}" "timeout 10 xvfb-run -a qepton --no-sandbox 2>&1 || true" | head -20

# Uninstall
echo "Uninstalling..."
ssh $SSH_OPTS "${SSH_USER}@${VM_HOST}" "sudo pacman -R --noconfirm qepton"

echo "✓ Arch Linux pacman tests complete"
```

### Debian Test Script

Create `scripts/test-debian-vm.sh`:

```bash
#!/usr/bin/env bash
# test-debian-vm.sh - Test deb package on Debian VM
#
# Usage: ./scripts/test-debian-vm.sh <vm-ip> <version>

set -e

VM_HOST="${1:-}"
VERSION="${2:-}"
SSH_OPTS="-o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new"
SSH_USER="${SSH_USER:-testuser}"

if [ -z "$VM_HOST" ] || [ -z "$VERSION" ]; then
    echo "Usage: $0 <vm-host> <version>"
    exit 1
fi

echo "Testing Qepton v${VERSION} deb package on Debian"
echo ""

# Wait for SSH
echo "Waiting for SSH..."
for i in {1..30}; do
    if ssh $SSH_OPTS "${SSH_USER}@${VM_HOST}" "echo OK" 2>/dev/null; then
        break
    fi
    sleep 5
done

# Install dependencies
echo "Installing test dependencies..."
ssh $SSH_OPTS "${SSH_USER}@${VM_HOST}" "sudo apt-get update && sudo apt-get install -y xvfb curl"

# Download deb package
DEB_URL="https://github.com/whizbangdevelopers/Qepton-Dev/releases/download/v${VERSION}/qepton_${VERSION}_amd64.deb"
echo "Downloading deb package..."
ssh $SSH_OPTS "${SSH_USER}@${VM_HOST}" "curl -fLo ~/qepton.deb '$DEB_URL'" || {
    echo "Warning: Could not download from Dev repo, trying Free repo..."
    DEB_URL="https://github.com/whizbangdevelopers/Qepton/releases/download/v${VERSION}/qepton_${VERSION}_amd64.deb"
    ssh $SSH_OPTS "${SSH_USER}@${VM_HOST}" "curl -fLo ~/qepton.deb '$DEB_URL'"
}

# Install
echo "Installing deb package..."
ssh $SSH_OPTS "${SSH_USER}@${VM_HOST}" "sudo dpkg -i ~/qepton.deb || sudo apt-get install -f -y"

# Verify
echo "Verifying installation..."
ssh $SSH_OPTS "${SSH_USER}@${VM_HOST}" "dpkg -s qepton"

# Smoke test
echo "Running smoke test..."
ssh $SSH_OPTS "${SSH_USER}@${VM_HOST}" "timeout 10 xvfb-run -a qepton --no-sandbox 2>&1 || true" | head -20

# Uninstall
echo "Uninstalling..."
ssh $SSH_OPTS "${SSH_USER}@${VM_HOST}" "sudo apt-get remove -y qepton"

echo "✓ Debian deb tests complete"
```

## Usage

### Manual Testing (Before Proxmox is Ready)

Use the standalone VM test scripts with your existing Fedora VM:

```bash
# Test on your running Fedora VM
./scripts/test-fedora-vm.sh 192.168.122.100 1.0.12
```

### Automated Testing (After Proxmox Setup)

```bash
# Test all distros
./scripts/test-proxmox.sh 1.0.12

# Test specific distro
./scripts/test-proxmox.sh 1.0.12 fedora
./scripts/test-proxmox.sh 1.0.12 arch
```

## Integration with Release Workflow

Once Proxmox is fully configured, you can add it as a self-hosted runner or call the API from your CI:

### Option 1: Self-Hosted Runner on NixOS

```nix
# NixOS configuration for GitHub Actions runner
services.github-runners.qepton-proxmox = {
  enable = true;
  url = "https://github.com/whizbangdevelopers/Qepton-Dev";
  tokenFile = "/etc/github-runner-token";
  extraLabels = [ "proxmox" "self-hosted" ];
};
```

Then in your workflow:

```yaml
verify-proxmox:
  runs-on: [self-hosted, proxmox]
  steps:
    - uses: actions/checkout@v4
    - run: ./scripts/test-proxmox.sh ${{ github.ref_name#v }}
```

### Option 2: Webhook Trigger

Set up a webhook that triggers your NixOS machine to run tests when a release is published.

## Maintenance

### Updating Templates

When new distro versions are released:

```bash
# Download new cloud image
wget <new-image-url>

# Delete old template
qm destroy 9000

# Create new template (same steps as initial setup)
qm create 9000 ...
```

### Disk Space

Cloud-init clones are linked clones by default (share base image). For full clones that can be modified:

```bash
qm clone 9000 100 --full 1
```

Monitor disk usage:

```bash
pvesm status
```

## Troubleshooting

### VM Won't Get IP

1. Check DHCP server is running on your network
2. Verify cloud-init network config: `qm cloudinit dump <vmid> network`
3. Check QEMU agent is running in VM

### SSH Connection Refused

1. Cloud-init may still be running - wait longer
2. Check VM console in Proxmox web UI
3. Verify SSH key was injected: `qm cloudinit dump <vmid> user`

### API Authentication Fails

1. Verify token hasn't expired
2. Check token has correct permissions
3. Test with: `curl -k "https://proxmox:8006/api2/json/version" -H "Authorization: PVEAPIToken=..."`
