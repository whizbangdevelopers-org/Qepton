# Android Build

This directory contains documentation and build scripts for Qepton Android via Capacitor.

## Prerequisites

- Node.js >= 18.0.0
- Android Studio (with Android SDK)
- Java JDK 17+

### Installing Prerequisites

**Ubuntu/Debian:**
```bash
# Install JDK
sudo apt install openjdk-17-jdk

# Download Android Studio from https://developer.android.com/studio
# Extract and run: ./android-studio/bin/studio.sh
# Use SDK Manager to install:
#   - Android SDK Platform 34
#   - Android SDK Build-Tools
#   - Android Emulator
#   - Android SDK Platform-Tools
```

**Fedora:**
```bash
sudo dnf install java-17-openjdk-devel
# Download Android Studio from https://developer.android.com/studio
```

**Arch Linux:**
```bash
sudo pacman -S jdk17-openjdk android-studio
```

**macOS:**
```bash
brew install openjdk@17
brew install --cask android-studio
```

### Environment Setup

Add to `~/.bashrc` or `~/.zshrc`:
```bash
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin
```

## First-Time Setup

```bash
# From project root
./docs/android/setup.sh
```

This will:
1. Verify Android SDK installation
2. Build the web assets
3. Add the Android platform to Capacitor
4. Sync the web assets to the Android project
5. Open Android Studio

## Building

### Development Build

```bash
./docs/android/build.sh dev
```

Opens the project in Android Studio for debugging on emulator or connected device.

### Debug APK

```bash
./docs/android/build.sh apk
```

Output: `src-capacitor/android/app/build/outputs/apk/debug/app-debug.apk`

### Release APK (Unsigned)

```bash
./docs/android/build.sh release
```

### Signed Release APK

```bash
./docs/android/build.sh release-signed
```

Requires `docs/android/keystore.properties` (see Signing section).

## Running

### On Emulator

```bash
# List available AVDs
emulator -list-avds

# Start emulator
emulator -avd Pixel_7_API_34

# Install and run (in another terminal)
./docs/android/build.sh run
```

### On Physical Device

1. Enable Developer Options on device
2. Enable USB Debugging
3. Connect device via USB
4. Verify connection: `adb devices`
5. Run: `./docs/android/build.sh run`

### Hot Reload Development

```bash
./docs/android/build.sh live
```

This starts a live-reload server and syncs changes to the running app.

## Testing

### Unit Tests (Gradle)

```bash
cd src-capacitor/android
./gradlew test
```

### Instrumented Tests (on device/emulator)

```bash
cd src-capacitor/android
./gradlew connectedAndroidTest
```

### Lint

```bash
cd src-capacitor/android
./gradlew lint
```

## Signing

### Create Keystore

```bash
keytool -genkey -v -keystore android/qepton-release.keystore \
  -alias qepton -keyalg RSA -keysize 2048 -validity 10000
```

### Configure Signing

Create `docs/android/keystore.properties`:
```properties
storeFile=../docs/android/qepton-release.keystore
storePassword=your_store_password
keyAlias=qepton
keyPassword=your_key_password
```

**Important:** Never commit `keystore.properties` or `.keystore` files to git.

## Publishing to Google Play

### Prerequisites

- Google Play Developer account ($25 one-time fee)
- Signed release APK or AAB (Android App Bundle)

### Build AAB for Play Store

```bash
./docs/android/build.sh bundle
```

Output: `src-capacitor/android/app/build/outputs/bundle/release/app-release.aab`

### Play Store Checklist

- [ ] App icon (512x512 PNG)
- [ ] Feature graphic (1024x500 PNG)
- [ ] Screenshots (phone, 7" tablet, 10" tablet)
- [ ] Short description (80 chars max)
- [ ] Full description (4000 chars max)
- [ ] Privacy policy URL
- [ ] Content rating questionnaire
- [ ] Target audience declaration

## Files

| File                  | Purpose                              |
| --------------------- | ------------------------------------ |
| `README.md`           | This documentation                   |
| `setup.sh`            | First-time setup script              |
| `build.sh`            | Build and run script                 |
| `keystore.properties` | Signing config (git-ignored)         |
| `*.keystore`          | Release signing key (git-ignored)    |

## Troubleshooting

### SDK Not Found

```
SDK location not found. Define location with sdk.dir in local.properties
```

Create `src-capacitor/android/local.properties`:
```properties
sdk.dir=/path/to/Android/Sdk
```

### Emulator Won't Start

```bash
# Check KVM support (Linux)
egrep -c '(vmx|svm)' /proc/cpuinfo  # Should be > 0

# Enable KVM
sudo apt install qemu-kvm
sudo adduser $USER kvm
# Log out and back in
```

### Gradle Build Fails

```bash
# Clear Gradle cache
cd src-capacitor/android
./gradlew clean
rm -rf ~/.gradle/caches/
```

### ADB Device Not Found

```bash
# Restart ADB server
adb kill-server
adb start-server
adb devices
```
