# NixOS VM Testing Setup

Configure QEMU/KVM virtual machines on NixOS for testing Qepton release artifacts across multiple Linux distributions.

## Quick Reference: All Test Scripts

| Script | Platform | Usage |
|--------|----------|-------|
| `scripts/test-fedora-vm.sh` | Linux (Fedora) | `./scripts/test-fedora-vm.sh <ip> <version>` |
| `scripts/test-arch-vm.sh` | Linux (Arch) | `./scripts/test-arch-vm.sh <ip> <version>` |
| `scripts/test-debian-vm.sh` | Linux (Debian) | `./scripts/test-debian-vm.sh <ip> <version>` |
| `scripts/test-windows.ps1` | Windows | `.\test-windows.ps1 -Version "1.0.12"` |

For macOS, test manually on your Mac Mini M1.

## NixOS Host Configuration

Add the following to your NixOS configuration (`/etc/nixos/configuration.nix`):

```nix
{ config, pkgs, ... }:

{
  # Enable virtualization
  virtualisation.libvirtd = {
    enable = true;
    qemu = {
      package = pkgs.qemu_kvm;
      ovmf.enable = true;        # UEFI support
      ovmf.packages = [ pkgs.OVMFFull.fd ];
      swtpm.enable = true;       # TPM emulation (optional)
    };
  };

  # Add your user to libvirtd group
  users.users.YOUR_USERNAME.extraGroups = [ "libvirtd" ];

  # Install VM management tools
  environment.systemPackages = with pkgs; [
    virt-manager       # GUI for VM management
    virt-viewer        # VM display
    libguestfs         # VM image tools
    spice-gtk          # Better VM display performance
  ];

  # Enable default network for VMs
  networking.firewall.trustedInterfaces = [ "virbr0" ];
}
```

After editing, rebuild:
```bash
sudo nixos-rebuild switch
```

Log out and back in for group membership to take effect.

## VM Storage Location

By default, VMs are stored in `/var/lib/libvirt/images/`. Consider creating a dedicated pool:

```bash
# Create a pool in your home directory (easier backups)
mkdir -p ~/VMs/qepton-testing

# Define the pool in libvirt
virsh pool-define-as qepton-testing dir --target ~/VMs/qepton-testing
virsh pool-autostart qepton-testing
virsh pool-start qepton-testing
```

## Test VMs

We maintain VMs for each Linux package format:

| VM Name        | Distro        | Tests              | ISO                                                      |
| -------------- | ------------- | ------------------ | -------------------------------------------------------- |
| `fedora-test`  | Fedora 40+    | rpm, Flatpak       | [Fedora Workstation](https://fedoraproject.org/workstation/download/) |
| `arch-test`    | Arch Linux    | pacman             | [Arch ISO](https://archlinux.org/download/)              |
| `debian-test`  | Debian 12     | deb (compatibility)| [Debian](https://www.debian.org/download)                |

## Fedora VM Setup

### Create VM

```bash
# Download Fedora Workstation ISO
cd ~/Downloads
wget https://download.fedoraproject.org/pub/fedora/linux/releases/40/Workstation/x86_64/iso/Fedora-Workstation-Live-x86_64-40-1.14.iso

# Create VM via virt-manager GUI or CLI:
virt-install \
  --name fedora-test \
  --ram 4096 \
  --vcpus 2 \
  --disk size=30,pool=qepton-testing \
  --cdrom ~/Downloads/Fedora-Workstation-Live-x86_64-40-1.14.iso \
  --os-variant fedora40 \
  --graphics spice \
  --boot uefi
```

### Post-Install Configuration

After installing Fedora in the VM:

```bash
# Update system
sudo dnf update -y

# Install testing dependencies
sudo dnf install -y \
  flatpak \
  gnome-software-plugin-flatpak \
  xdg-desktop-portal \
  xdg-desktop-portal-gtk

# Add Flathub (for Flatpak testing)
flatpak remote-add --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo

# Enable SSH for easy file transfer
sudo systemctl enable --now sshd

# Get VM IP for SCP
ip addr show | grep 'inet '
```

### Testing RPM Package

```bash
# From NixOS host - copy RPM to VM
scp dist/electron/Packaged/qepton-1.0.12.x86_64.rpm user@VM_IP:~/

# In Fedora VM
sudo dnf install ~/qepton-1.0.12.x86_64.rpm

# Verify
rpm -qi qepton
qepton  # Launch app

# Test uninstall
sudo dnf remove qepton
```

### Testing Flatpak Bundle

```bash
# From NixOS host - copy Flatpak bundle to VM
scp flatpak-build/qepton.flatpak user@VM_IP:~/

# In Fedora VM - install bundle
flatpak install --user ~/qepton.flatpak

# Run
flatpak run com.whizbangdevelopers.Qepton

# Test uninstall
flatpak uninstall com.whizbangdevelopers.Qepton
```

## Arch Linux VM Setup

See [ARCHLINUX-VM-SETUP.md](ARCHLINUX-VM-SETUP.md) for detailed Arch VM creation.

Quick setup:
```bash
virt-install \
  --name arch-test \
  --ram 2048 \
  --vcpus 2 \
  --disk size=20,pool=qepton-testing \
  --cdrom ~/Downloads/archlinux-x86_64.iso \
  --os-variant archlinux \
  --graphics spice \
  --boot uefi
```

## Debian VM Setup (deb Compatibility Testing)

```bash
# Download Debian ISO
wget https://cdimage.debian.org/debian-cd/current/amd64/iso-cd/debian-12.*-amd64-netinst.iso

virt-install \
  --name debian-test \
  --ram 2048 \
  --vcpus 2 \
  --disk size=20,pool=qepton-testing \
  --cdrom ~/Downloads/debian-12.*-amd64-netinst.iso \
  --os-variant debian12 \
  --graphics spice \
  --boot uefi
```

## VM Management Scripts

Create `~/bin/qepton-vm-test.sh`:

```bash
#!/usr/bin/env bash
# Quick VM testing helper

set -e

VM_NAME="${1:-fedora-test}"
ARTIFACT="${2:-}"

usage() {
    echo "Usage: $0 <vm-name> [artifact-path]"
    echo ""
    echo "VMs: fedora-test, arch-test, debian-test"
    echo ""
    echo "Examples:"
    echo "  $0 fedora-test                    # Start Fedora VM"
    echo "  $0 fedora-test ./qepton.rpm       # Start VM and copy artifact"
    echo "  $0 arch-test ./qepton.pkg.tar.zst"
    exit 1
}

get_vm_ip() {
    virsh domifaddr "$VM_NAME" 2>/dev/null | grep -oE '192\.[0-9.]+' | head -1
}

# Start VM if not running
if ! virsh list --name | grep -q "^${VM_NAME}$"; then
    echo "Starting $VM_NAME..."
    virsh start "$VM_NAME"
    echo "Waiting for VM to boot..."
    sleep 30
fi

# Get IP
VM_IP=$(get_vm_ip)
if [ -z "$VM_IP" ]; then
    echo "Could not get VM IP. Is the VM running?"
    exit 1
fi
echo "VM IP: $VM_IP"

# Copy artifact if provided
if [ -n "$ARTIFACT" ] && [ -f "$ARTIFACT" ]; then
    echo "Copying $ARTIFACT to VM..."
    scp "$ARTIFACT" "user@${VM_IP}:~/"
    echo "Artifact copied. SSH with: ssh user@$VM_IP"
fi

# Open viewer
virt-viewer "$VM_NAME" &
```

## Snapshot Management

Create clean snapshots after initial setup for quick reset between tests:

```bash
# Create snapshot (VM should be shut down for consistent state)
virsh shutdown fedora-test
virsh snapshot-create-as fedora-test --name "clean-install" --description "Fresh Fedora with Flatpak ready"

# List snapshots
virsh snapshot-list fedora-test

# Revert to clean state before each test
virsh snapshot-revert fedora-test --snapshotname "clean-install"
virsh start fedora-test

# Delete old snapshots
virsh snapshot-delete fedora-test --snapshotname "old-snapshot"
```

## Release Testing Workflow

For each release:

1. **Build artifacts** on your build machine
2. **Create verification issue** using the Release Verification template
3. **Test native platforms first** (Ubuntu laptop, Win10, Mac Mini)
4. **Boot VMs and test**:
   ```bash
   # Revert to clean state
   virsh snapshot-revert fedora-test --snapshotname "clean-install"
   virsh start fedora-test

   # Copy and test RPM
   ./qepton-vm-test.sh fedora-test ./dist/electron/Packaged/qepton-*.rpm

   # Test Flatpak
   ./qepton-vm-test.sh fedora-test ./flatpak-build/qepton.flatpak
   ```
5. **Document results** in the verification issue
6. **Update README matrix** with verified version

## Test Checklist (All Formats)

For each package format, verify:

- [ ] Package installs without errors
- [ ] Package metadata is correct (`rpm -qi`, `dpkg -s`, `pacman -Qi`, `flatpak info`)
- [ ] App launches from CLI
- [ ] App appears in desktop menu (if applicable)
- [ ] Window renders correctly
- [ ] GitHub OAuth login works
- [ ] Gists fetch and display
- [ ] Code editor works (open, edit, save)
- [ ] Search works
- [ ] Theme switching works
- [ ] App closes cleanly (no zombie processes)
- [ ] Package uninstalls cleanly
- [ ] No leftover files/configs after uninstall

## Troubleshooting

### VM Won't Start - UEFI Missing

```bash
# Check OVMF is available
ls /run/libvirt/nix-ovmf/

# If empty, ensure ovmf.enable = true in your NixOS config
```

### No Network in VM

```bash
# Start the default network
virsh net-start default
virsh net-autostart default
```

### Slow VM Performance

Add to VM XML (`virsh edit VM_NAME`):
```xml
<cpu mode='host-passthrough'/>
```

Or use virt-manager: CPU → Copy host CPU configuration

### Permission Denied on Images

```bash
# Fix permissions
sudo chown -R $USER:libvirtd ~/VMs/qepton-testing
```

## Future: Proxmox Integration

When your Proxmox server is ready, you can automate this further:

1. Create VM templates for each distro
2. Use cloud-init for automated provisioning
3. Script: clone template → boot → copy artifact → install → screenshot → destroy
4. Run as part of release workflow

See Proxmox documentation for template creation and API automation.
