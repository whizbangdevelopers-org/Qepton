# Arch Linux VM Setup for Qepton Testing

Minimal Arch Linux VM setup for testing Qepton pacman package installation.

## VM Specifications

| Resource | Value   |
| -------- | ------- |
| CPUs     | 2       |
| RAM      | 2 GB    |
| Storage  | 20 GB   |
| Firmware | UEFI    |

## Prerequisites

```bash
# Ubuntu/Debian
sudo apt install virt-manager qemu-kvm libvirt-daemon-system ovmf

# Fedora
sudo dnf install virt-manager qemu-kvm libvirt edk2-ovmf

# Arch Linux
sudo pacman -S virt-manager qemu-full libvirt edk2-ovmf

# Enable libvirt
sudo systemctl enable --now libvirtd
sudo usermod -aG libvirt $USER
# Log out and back in
```

Download ISO:
```bash
wget https://mirrors.kernel.org/archlinux/iso/latest/archlinux-x86_64.iso
```

## Create VM

1. Open **virt-manager** → **Create a new virtual machine**
2. Select ISO: `archlinux-x86_64.iso`
3. OS: **Arch Linux**, Memory: **2048**, CPUs: **2**
4. Storage: **20 GB**
5. Check **Customize configuration before install**
6. Set Firmware: **UEFI x86_64: OVMF_CODE.fd**
7. **Begin Installation**

## Install Arch (Quick)

```bash
# Partition disk
fdisk /dev/vda
# g (GPT), n 1 +512M (EFI), t 1, n 2 (rest), w

# Format
mkfs.fat -F32 /dev/vda1
mkfs.ext4 /dev/vda2

# Mount and install
mount /dev/vda2 /mnt
mkdir /mnt/boot
mount /dev/vda1 /mnt/boot
pacstrap /mnt base linux linux-firmware sudo networkmanager openssh

# Configure
genfstab -U /mnt >> /mnt/etc/fstab
arch-chroot /mnt

ln -sf /usr/share/zoneinfo/UTC /etc/localtime
echo "en_US.UTF-8 UTF-8" >> /etc/locale.gen && locale-gen
echo "LANG=en_US.UTF-8" > /etc/locale.conf
echo "archvm" > /etc/hostname
passwd  # set root password

useradd -m -G wheel -s /bin/bash testuser
passwd testuser
echo "%wheel ALL=(ALL:ALL) NOPASSWD: ALL" >> /etc/sudoers

systemctl enable NetworkManager sshd

# Bootloader
bootctl install
cat > /boot/loader/entries/arch.conf << EOF
title Arch Linux
linux /vmlinuz-linux
initrd /initramfs-linux.img
options root=/dev/vda2 rw
EOF

exit
reboot
```

Remove ISO from VM, then boot.

## Install Desktop (Minimal)

```bash
# Login as testuser
sudo pacman -Syu

# Minimal X11 + Window Manager
sudo pacman -S xorg-server xorg-xinit openbox xterm

# Start X manually when needed
echo "exec openbox-session" > ~/.xinitrc
startx
```

## Test Qepton Pacman Package

### Copy Package to VM

From host machine:
```bash
# Get VM IP
virsh domifaddr archvm

# Copy package
scp qepton-1.0.0-1-x86_64.pkg.tar.zst testuser@<vm-ip>:~/
```

### Install

```bash
# Install package
sudo pacman -U ~/qepton-1.0.0-1-x86_64.pkg.tar.zst

# Verify installed
pacman -Qi qepton
```

### Run

```bash
# Start X if not running
startx

# In xterm, run Qepton
qepton
```

### Uninstall

```bash
sudo pacman -R qepton

# Verify removed
pacman -Qi qepton  # Should show "not found"
```

## Test Checklist

- [ ] Package installs without dependency errors
- [ ] `pacman -Qi qepton` shows correct metadata
- [ ] App launches from command line
- [ ] App appears in application menu (if using desktop)
- [ ] Login/OAuth works
- [ ] Gists load and display
- [ ] Editor opens and saves
- [ ] Search works
- [ ] Theme switching works
- [ ] App closes cleanly
- [ ] Package uninstalls cleanly
- [ ] No leftover files after uninstall

## Quick VM Commands

```bash
# Snapshot before testing
virsh snapshot-create-as archvm --name "clean"

# Restore after testing
virsh snapshot-revert archvm --snapshotname "clean"

# SSH into VM
ssh testuser@$(virsh domifaddr archvm | grep -oE '192\.[0-9.]+')

# Shutdown
virsh shutdown archvm
```

## Building Pacman Package

To create a pacman package, you need a `PKGBUILD` file. See [docs/PKGBUILD-GUIDE.md](PKGBUILD-GUIDE.md) for details.
