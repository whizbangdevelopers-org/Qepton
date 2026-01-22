# macOS / iOS Build

This directory contains documentation and build scripts for Qepton on Apple platforms via Capacitor.

**Note:** iOS and macOS builds require a Mac with Xcode installed.

## Prerequisites

- macOS 13+ (Ventura or later)
- Xcode 15+ (from App Store)
- Node.js >= 18.0.0
- CocoaPods

### Installing Prerequisites

```bash
# Install Xcode from App Store, then:
xcode-select --install

# Install Homebrew (if not installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js
brew install node@20

# Install CocoaPods
brew install cocoapods
# or
sudo gem install cocoapods

# Accept Xcode license
sudo xcodebuild -license accept
```

### Verify Installation

```bash
xcodebuild -version        # Xcode 15.0+
node -v                    # v18.0.0+
pod --version              # 1.14.0+
```

## First-Time Setup

```bash
# From project root
./docs/mac-ios/setup.sh
```

This will:
1. Verify Xcode and CocoaPods installation
2. Build the web assets
3. Add the iOS platform to Capacitor
4. Install CocoaPods dependencies
5. Sync the web assets to the iOS project
6. Open Xcode

## Building for iOS

### Development Build

```bash
./docs/mac-ios/build.sh ios-dev
```

Opens Xcode for debugging on simulator or connected device.

### Run on Simulator

```bash
./docs/mac-ios/build.sh ios-sim
```

Builds and runs on the default iOS Simulator.

### Run on Device

```bash
./docs/mac-ios/build.sh ios-device
```

Requires:
- Apple Developer account (free or paid)
- Device connected via USB or on same network
- Device registered in Xcode

### Archive for App Store

```bash
./docs/mac-ios/build.sh ios-archive
```

Creates an archive ready for App Store submission or TestFlight.

## Building for macOS (Catalyst)

Qepton can run as a native macOS app via Mac Catalyst.

### Development Build

```bash
./docs/mac-ios/build.sh mac-dev
```

### Run Locally

```bash
./docs/mac-ios/build.sh mac-run
```

### Archive for Distribution

```bash
./docs/mac-ios/build.sh mac-archive
```

## Simulators

### List Available Simulators

```bash
xcrun simctl list devices
```

### Run on Specific Simulator

```bash
./docs/mac-ios/build.sh ios-sim "iPhone 15 Pro"
```

### Create New Simulator

```bash
# List available device types
xcrun simctl list devicetypes

# List available runtimes
xcrun simctl list runtimes

# Create simulator
xcrun simctl create "iPhone 15" com.apple.CoreSimulator.SimDeviceType.iPhone-15 com.apple.CoreSimulator.SimRuntime.iOS-17-0
```

## Code Signing

### Development (Free Account)

1. Open Xcode
2. Go to Xcode > Settings > Accounts
3. Add your Apple ID
4. Select project in navigator
5. Under Signing & Capabilities, select your team
6. Xcode will create a development certificate automatically

### Distribution (Paid Account - $99/year)

Required for:
- App Store distribution
- TestFlight beta testing
- Ad-hoc distribution

#### Create Certificates

1. Go to [Apple Developer Portal](https://developer.apple.com/account)
2. Certificates, Identifiers & Profiles
3. Create App Store distribution certificate
4. Download and install in Keychain

#### Create App ID

1. Identifiers > App IDs > New
2. Bundle ID: `com.whizbangdevelopers.qepton`
3. Enable capabilities: Push Notifications, Sign in with Apple, etc.

#### Create Provisioning Profile

1. Profiles > New
2. Select App Store distribution
3. Select App ID and certificate
4. Download and install

### Automatic Signing

For most development, enable "Automatically manage signing" in Xcode:

1. Select project in navigator
2. Select target "App"
3. Signing & Capabilities tab
4. Check "Automatically manage signing"
5. Select your team

## Testing

### Unit Tests (XCTest)

```bash
./docs/mac-ios/build.sh test
```

Or in Xcode: Product > Test (⌘U)

### UI Tests

```bash
./docs/mac-ios/build.sh uitest
```

### Test on Multiple Simulators

```bash
# Run tests on multiple iOS versions
xcodebuild test \
  -workspace src-capacitor/ios/App/App.xcworkspace \
  -scheme App \
  -destination 'platform=iOS Simulator,name=iPhone 15,OS=17.0' \
  -destination 'platform=iOS Simulator,name=iPhone 14,OS=16.4'
```

## Publishing

### TestFlight (Beta Testing)

1. Build archive: `./docs/mac-ios/build.sh ios-archive`
2. Open Xcode Organizer (Window > Organizer)
3. Select archive > Distribute App
4. Select TestFlight & App Store
5. Upload

### App Store

1. Complete TestFlight testing
2. Go to [App Store Connect](https://appstoreconnect.apple.com)
3. Create new app or new version
4. Fill in metadata, screenshots, description
5. Select build from TestFlight
6. Submit for review

### App Store Checklist

- [ ] App icon (1024x1024 PNG, no alpha)
- [ ] Screenshots for each device size
- [ ] App preview videos (optional)
- [ ] Description, keywords, categories
- [ ] Privacy policy URL
- [ ] Support URL
- [ ] Age rating questionnaire
- [ ] App Review notes (if needed)

## Files

| File              | Purpose                                  |
| ----------------- | ---------------------------------------- |
| `README.md`       | This documentation                       |
| `setup.sh`        | First-time setup script                  |
| `build.sh`        | Build and run script                     |
| `ExportOptions.plist` | Archive export configuration         |

## Project Structure

After setup, the iOS project is at:
```
src-capacitor/ios/
├── App/
│   ├── App/
│   │   ├── AppDelegate.swift
│   │   ├── Info.plist
│   │   └── capacitor.config.json
│   ├── App.xcodeproj/
│   └── App.xcworkspace/    # Open this in Xcode
└── Podfile
```

## Troubleshooting

### CocoaPods Install Fails

```bash
# Update CocoaPods
sudo gem install cocoapods

# Clear cache
pod cache clean --all
rm -rf ~/Library/Caches/CocoaPods

# Reinstall pods
cd src-capacitor/ios/App
rm -rf Pods Podfile.lock
pod install
```

### Signing Errors

```
Signing requires a development team
```

1. Open project in Xcode
2. Select your team in Signing & Capabilities
3. If no team available, add Apple ID in Xcode > Settings > Accounts

### Simulator Won't Launch

```bash
# Reset simulator
xcrun simctl erase all

# Or reset specific simulator
xcrun simctl erase "iPhone 15"
```

### Build Fails After Xcode Update

```bash
# Clear derived data
rm -rf ~/Library/Developer/Xcode/DerivedData

# Reinstall pods
cd src-capacitor/ios/App
pod deintegrate
pod install
```

### "Unable to boot device in current state: Booted"

The simulator is already running. Either use it or:
```bash
xcrun simctl shutdown all
```

### M1/M2 Mac Architecture Issues

For some packages on Apple Silicon:
```bash
# Run terminal with Rosetta if needed
arch -x86_64 pod install
```

Or add to Podfile:
```ruby
post_install do |installer|
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      config.build_settings['EXCLUDED_ARCHS[sdk=iphonesimulator*]'] = 'arm64'
    end
  end
end
```
