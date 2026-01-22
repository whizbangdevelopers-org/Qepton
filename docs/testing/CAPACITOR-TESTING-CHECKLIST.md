# Capacitor Testing Checklist

This document outlines the current state of Capacitor mobile configuration and testing options for Qepton.

> **Issue Tracking:** See [GITHUB-ISSUES-PREVIEW.md](./GITHUB-ISSUES-PREVIEW.md) for full issue details.

---

## Mobile Monetization Strategy

**Approach:** Free mobile apps for all users; premium unlocks native-only features.

### Feature Breakdown by Tier

| Feature                     | Free | Premium | Notes                                |
| --------------------------- | ---- | ------- | ------------------------------------ |
| View gists                  | ✓    | ✓       | Core functionality                   |
| Create/edit gists           | ✓    | ✓       | Core functionality                   |
| Search & filter             | ✓    | ✓       | Core functionality                   |
| Syntax highlighting         | ✓    | ✓       | Core functionality                   |
| Dark/light theme            | ✓    | ✓       | Core functionality                   |
| Tag management              | ✓    | ✓       | Core functionality                   |
| **Offline sync**            |      | ✓       | Background sync, works without network | → Issue #25 |
| **Biometric authentication**|      | ✓       | Face ID, Touch ID, fingerprint       | → Issue #26 |
| **Haptic feedback**         |      | ✓       | Tactile response on actions          |
| **Home screen widgets**     |      | ✓       | Quick access to pinned gists         |
| **Share extension**         |      | ✓       | Share to Qepton from other apps      |
| **Siri/Google shortcuts**   |      | ✓       | Voice commands for quick actions     |
| **App icon customization**  |      | ✓       | Alternative app icons                |
| **iCloud/Drive backup**     |      | ✓       | Settings & cache backup              | → Issue #27 |

### Rationale

| Benefit                   | Description                                              |
| ------------------------- | -------------------------------------------------------- |
| Lower barrier to entry    | Free apps drive adoption, users try before they buy      |
| Clear upgrade path        | Native features are tangible, demonstrable value         |
| Simpler support           | Core bugs affect all users equally, easier to prioritize |
| Development efficiency    | Build once, gate features with license check             |
| App store visibility      | Free apps get more downloads, better ranking             |
| Competitive positioning   | GitHub mobile is free; Qepton free tier matches it       |

### Implementation Considerations

- [ ] Add license/subscription check in `usePlatform` composable
- [ ] Gate premium Capacitor plugins behind license check
- [ ] Graceful fallback when premium features unavailable
- [ ] "Upgrade to Premium" prompts for locked features
- [ ] Sync subscription status across platforms (web, desktop, mobile)

---

## Current Configuration Status

### Core Setup

- [x] Basic Capacitor config (`com.whizbangdevelopers.qepton`, v5.6.0)
- [x] Splash screen (2s duration, Qepton blue #027be3)
- [x] Status bar (dark style, themed)
- [x] Platform detection (`usePlatform` composable with capability flags)
- [x] Build scripts (`npm run dev:capacitor`, `npm run build:capacitor`)
- [x] Core plugins (@capacitor/app, haptics, keyboard, status-bar)

### Missing Testing Infrastructure

- [ ] Playwright mobile device profiles → **Issue #31**
- [ ] Capacitor plugin mocking for unit tests → **Issue #32**
- [ ] Real device testing setup (Android emulator, iOS simulator) → **Issue #33**
- [ ] Mobile-specific E2E tests
- [ ] CI/CD pipeline for mobile testing → **Issues #34, #35**

## Available Resources

| Resource               | Android                        | iOS                           |
| ---------------------- | ------------------------------ | ----------------------------- |
| Local machine (Linux)  | Android Studio installed       | Not available                 |
| Mac M1                 | Android Studio (if installed)  | Xcode + iOS Simulator         |
| GitHub Actions         | Linux runners with KVM         | macOS ARM runners             |
| Docker containers      | budtmo/docker-android          | Not supported (no nested virt)|

---

## Testing Options

### 1. Playwright Mobile Emulation (Browser-level)

| Pros                                    | Cons                                |
| --------------------------------------- | ----------------------------------- |
| Emulates mobile viewport & touch events | Can't test native Capacitor plugins |
| Good for responsive UI testing          | No native API access                |
| Uses existing E2E infrastructure        | Limited to web behavior             |

**Implementation Tasks:** → **Issue #31**

- [ ] Add mobile device profiles to `playwright.config.ts`
- [ ] Create mobile viewport test fixtures (iPhone, Android)
- [ ] Add mobile-specific E2E tests for responsive behavior
- [ ] Test touch interactions and gestures

---

### 2. Local Development Testing

#### Linux Machine (Android Only)

- [ ] Verify Android Studio installation and SDK setup
- [ ] Configure AVD (Android Virtual Device) for testing
- [ ] Add Capacitor Android platform: `npx cap add android`
- [ ] Sync and open: `npx cap sync && npx cap open android`
- [ ] Create debug APK build configuration
- [ ] Document hot-reload workflow with `npx cap run android`

#### Mac M1 (Android + iOS)

- [ ] Set up Android Studio and SDK
- [ ] Configure AVD for Android testing
- [ ] Verify Xcode installation and iOS simulators
- [ ] Add Capacitor iOS platform: `npx cap add ios`
- [ ] Sync and open: `npx cap sync && npx cap open ios`
- [ ] Create debug build configurations for both platforms
- [ ] Document hot-reload workflow with `npx cap run ios`

---

### 3. Docker Android Emulator

Docker containers can run Android emulators with KVM acceleration on Linux hosts.

#### Options

| Image                                                                            | Features                                    | Notes                        |
| -------------------------------------------------------------------------------- | ------------------------------------------- | ---------------------------- |
| [budtmo/docker-android](https://github.com/budtmo/docker-android)                | VNC, video recording, device skins, Appium  | Pro version for Android 15+  |
| [HQarroum/docker-android](https://github.com/HQarroum/docker-android)            | Minimal Alpine-based, KVM, scrcpy support   | Size-optimized, API 33 default|
| [amrka/android-emulator](https://hub.docker.com/r/amrka/android-emulator)        | Appium included, simple setup               | Good for CI integration      |

#### Requirements

- Linux host with KVM support (nested virtualization)
- `--privileged` flag for hardware acceleration
- Not compatible with macOS/Windows Docker (no nested virt in VirtualBox)

#### Implementation Tasks → **Issue #33**

- [ ] Choose Docker Android image (recommend budtmo/docker-android)
- [ ] Create `docker-compose.yml` for Android emulator
- [ ] Configure VNC access for visual debugging
- [ ] Integrate with existing `e2e-docker/` infrastructure
- [ ] Add Appium tests for native interactions
- [ ] Document startup and test execution procedures

---

### 4. GitHub Actions CI/CD

GitHub provides runners capable of mobile testing with hardware acceleration.

#### Android on GitHub Actions

Uses [ReactiveCircus/android-emulator-runner](https://github.com/marketplace/actions/android-emulator-runner) action.

| Runner             | Hardware Accel | Cost      | Speed     |
| ------------------ | -------------- | --------- | --------- |
| `ubuntu-latest`    | KVM enabled    | Free tier | Fast      |
| `ubuntu-latest-xl` | KVM enabled    | Paid      | Faster    |
| BuildJet runners   | Full KVM       | Paid      | 2.5x faster, 20x cheaper than macOS |

**Implementation Tasks:** → **Issue #34**

- [ ] Create `.github/workflows/android-test.yml`
- [ ] Enable KVM with udev rules in workflow
- [ ] Configure emulator (API 30+ with `target: google_apis`)
- [ ] Run Capacitor build and sync
- [ ] Execute Gradle connected tests
- [ ] Cache Gradle and Android SDK for faster builds

**Example workflow snippet:**

```yaml
jobs:
  android-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Enable KVM
        run: |
          echo 'KERNEL=="kvm", GROUP="kvm", MODE="0666", OPTIONS+="static_node=kvm"' | sudo tee /etc/udev/rules.d/99-kvm4all.rules
          sudo udevadm control --reload-rules
          sudo udevadm trigger --name-match=kvm

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies and build
        run: |
          npm ci
          npm run build:capacitor
          npx cap sync android

      - name: Android Emulator Test
        uses: ReactiveCircus/android-emulator-runner@v2
        with:
          api-level: 30
          target: google_apis
          arch: x86_64
          script: cd src-capacitor/android && ./gradlew connectedCheck
```

#### iOS on GitHub Actions

Uses macOS runners with Xcode and iOS Simulator.

| Runner               | Architecture | Simulators Available              | Cost       |
| -------------------- | ------------ | --------------------------------- | ---------- |
| `macos-latest`       | ARM64        | iOS 18.4, watchOS 11.x, tvOS 18.x | 10x Linux  |
| `macos-15`           | ARM64        | iOS 18.x (some issues reported)   | 10x Linux  |
| `macos-26` (preview) | ARM64 only   | Latest Xcode/iOS                  | 10x Linux  |

**Note:** [Older simulator runtimes deprecated](https://github.com/actions/runner-images/issues/13392) January 2026. Only iOS 18.4+ available.

**Implementation Tasks:** → **Issue #35**

- [ ] Create `.github/workflows/ios-test.yml`
- [ ] Use `macos-latest` or `macos-15` runner
- [ ] Select Xcode version: `sudo xcode-select -switch /Applications/Xcode_16.4.app`
- [ ] Launch iOS simulator with [futureware-tech/simulator-action](https://github.com/marketplace/actions/launch-ios-simulator)
- [ ] Run Capacitor build and sync
- [ ] Execute xcodebuild tests

**Example workflow snippet:**

```yaml
jobs:
  ios-test:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies and build
        run: |
          npm ci
          npm run build:capacitor
          npx cap sync ios

      - name: Launch iOS Simulator
        uses: futureware-tech/simulator-action@v3
        with:
          model: 'iPhone 15'

      - name: Run iOS Tests
        run: |
          cd src-capacitor/ios/App
          xcodebuild test \
            -workspace App.xcworkspace \
            -scheme App \
            -destination 'platform=iOS Simulator,name=iPhone 15'
```

---

### 5. Unit Testing with Vitest (Capacitor Mocking)

Unit tests allow testing Capacitor-dependent code without a device by mocking native plugins.

| Pros                                    | Cons                                |
| --------------------------------------- | ----------------------------------- |
| Test code paths using native features   | Doesn't test actual native behavior |
| Fast execution (runs in CI)             | Mocks may drift from real APIs      |
| No device/emulator required             | Limited to JS layer testing         |
| Catches regressions early               | Can't test native bridge issues     |

#### Capacitor Plugins Used in Qepton

| Plugin                | Import                        | Usage                          |
| --------------------- | ----------------------------- | ------------------------------ |
| `@capacitor/app`      | `App`                         | App lifecycle, back button     |
| `@capacitor/haptics`  | `Haptics`                     | Vibration feedback             |
| `@capacitor/keyboard` | `Keyboard`                    | Keyboard show/hide events      |
| `@capacitor/status-bar` | `StatusBar`                 | Status bar styling             |

#### Mock File Structure

```
tests/
├── unit/
│   ├── __mocks__/
│   │   └── @capacitor/
│   │       ├── app.ts
│   │       ├── haptics.ts
│   │       ├── keyboard.ts
│   │       └── status-bar.ts
│   └── composables/
│       └── usePlatform.spec.ts
```

#### Example Mock: `@capacitor/app`

```typescript
// tests/unit/__mocks__/@capacitor/app.ts
import { vi } from 'vitest'

export const App = {
  addListener: vi.fn((event: string, callback: Function) => {
    // Store callback for manual triggering in tests
    return Promise.resolve({ remove: vi.fn() })
  }),
  removeAllListeners: vi.fn(() => Promise.resolve()),
  getInfo: vi.fn(() => Promise.resolve({
    name: 'Qepton',
    id: 'com.whizbangdevelopers.qepton',
    build: '1',
    version: '1.0.0'
  })),
  getState: vi.fn(() => Promise.resolve({ isActive: true })),
  exitApp: vi.fn(() => Promise.resolve()),
  minimizeApp: vi.fn(() => Promise.resolve()),
}
```

#### Example Mock: `@capacitor/haptics`

```typescript
// tests/unit/__mocks__/@capacitor/haptics.ts
import { vi } from 'vitest'

export const Haptics = {
  impact: vi.fn(() => Promise.resolve()),
  notification: vi.fn(() => Promise.resolve()),
  vibrate: vi.fn(() => Promise.resolve()),
  selectionStart: vi.fn(() => Promise.resolve()),
  selectionChanged: vi.fn(() => Promise.resolve()),
  selectionEnd: vi.fn(() => Promise.resolve()),
}

export const ImpactStyle = {
  Heavy: 'HEAVY',
  Medium: 'MEDIUM',
  Light: 'LIGHT',
}

export const NotificationType = {
  Success: 'SUCCESS',
  Warning: 'WARNING',
  Error: 'ERROR',
}
```

#### Example Mock: `@capacitor/keyboard`

```typescript
// tests/unit/__mocks__/@capacitor/keyboard.ts
import { vi } from 'vitest'

export const Keyboard = {
  addListener: vi.fn((event: string, callback: Function) => {
    return Promise.resolve({ remove: vi.fn() })
  }),
  removeAllListeners: vi.fn(() => Promise.resolve()),
  show: vi.fn(() => Promise.resolve()),
  hide: vi.fn(() => Promise.resolve()),
  setAccessoryBarVisible: vi.fn(() => Promise.resolve()),
  setScroll: vi.fn(() => Promise.resolve()),
  setStyle: vi.fn(() => Promise.resolve()),
  setResizeMode: vi.fn(() => Promise.resolve()),
}
```

#### Example Mock: `@capacitor/status-bar`

```typescript
// tests/unit/__mocks__/@capacitor/status-bar.ts
import { vi } from 'vitest'

export const StatusBar = {
  setStyle: vi.fn(() => Promise.resolve()),
  setBackgroundColor: vi.fn(() => Promise.resolve()),
  show: vi.fn(() => Promise.resolve()),
  hide: vi.fn(() => Promise.resolve()),
  getInfo: vi.fn(() => Promise.resolve({
    visible: true,
    style: 'DARK'
  })),
  setOverlaysWebView: vi.fn(() => Promise.resolve()),
}

export const Style = {
  Dark: 'DARK',
  Light: 'LIGHT',
  Default: 'DEFAULT',
}
```

#### Vitest Configuration

```typescript
// vitest.config.ts (add to existing config)
export default defineConfig({
  test: {
    // ... existing config
    alias: {
      '@capacitor/app': resolve(__dirname, 'tests/unit/__mocks__/@capacitor/app.ts'),
      '@capacitor/haptics': resolve(__dirname, 'tests/unit/__mocks__/@capacitor/haptics.ts'),
      '@capacitor/keyboard': resolve(__dirname, 'tests/unit/__mocks__/@capacitor/keyboard.ts'),
      '@capacitor/status-bar': resolve(__dirname, 'tests/unit/__mocks__/@capacitor/status-bar.ts'),
    },
  },
})
```

#### Example Test: Platform Composable

```typescript
// tests/unit/composables/usePlatform.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { App } from '@capacitor/app'
import { Haptics, ImpactStyle } from '@capacitor/haptics'

// Mock Quasar Platform
vi.mock('quasar', () => ({
  Platform: {
    is: {
      capacitor: true,
      mobile: true,
      electron: false,
    }
  }
}))

describe('usePlatform on Capacitor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should register back button handler on Capacitor', async () => {
    // Import after mocks are set up
    const { usePlatform } = await import('src/composables/usePlatform')
    const platform = usePlatform()

    expect(platform.isCapacitor.value).toBe(true)
    expect(platform.platformType.value).toBe('capacitor')
  })

  it('should trigger haptic feedback on mobile', async () => {
    const { usePlatform } = await import('src/composables/usePlatform')
    const platform = usePlatform()

    await platform.triggerHaptic?.('impact')

    expect(Haptics.impact).toHaveBeenCalledWith({
      style: ImpactStyle.Medium
    })
  })

  it('should get app info', async () => {
    const info = await App.getInfo()

    expect(info.id).toBe('com.whizbangdevelopers.qepton')
    expect(info.name).toBe('Qepton')
  })
})
```

#### Testing Platform-Specific Behavior

```typescript
// tests/unit/composables/usePlatform.web.spec.ts
import { describe, it, expect, vi } from 'vitest'

// Mock Quasar Platform for web
vi.mock('quasar', () => ({
  Platform: {
    is: {
      capacitor: false,
      mobile: false,
      electron: false,
    }
  }
}))

describe('usePlatform on Web', () => {
  it('should detect web platform', async () => {
    const { usePlatform } = await import('src/composables/usePlatform')
    const platform = usePlatform()

    expect(platform.isCapacitor.value).toBe(false)
    expect(platform.platformType.value).toBe('web')
  })

  it('should not have haptic capability on web', async () => {
    const { usePlatform } = await import('src/composables/usePlatform')
    const platform = usePlatform()

    expect(platform.capabilities.value.biometricAuth).toBe(false)
  })
})
```

#### Implementation Tasks → **Issue #32**

- [ ] Create `tests/unit/__mocks__/@capacitor/` directory
- [ ] Implement mock for `@capacitor/app`
- [ ] Implement mock for `@capacitor/haptics`
- [ ] Implement mock for `@capacitor/keyboard`
- [ ] Implement mock for `@capacitor/status-bar`
- [ ] Update `vitest.config.ts` with Capacitor aliases
- [ ] Write unit tests for `usePlatform` composable
- [ ] Write unit tests for any services using Capacitor plugins
- [ ] Add tests for error handling when plugins unavailable
- [ ] Document mock usage patterns for future plugins

---

### 6. Native E2E Testing (Appium/Detox)

| Pros                              | Cons                         |
| --------------------------------- | ---------------------------- |
| Full native app testing           | Significant setup overhead   |
| Can interact with native elements | Learning curve               |
| Cross-platform support            | Slower than Playwright       |

**Implementation Tasks:**

- [ ] Evaluate Appium vs Detox for project needs
- [ ] Set up chosen framework
- [ ] Configure for Android and iOS
- [ ] Write native E2E test suite
- [ ] Integrate with CI/CD pipeline

---

## Recommended Implementation Order

| Priority | Task                              | Effort | Coverage                     | Runs In CI |
| -------- | --------------------------------- | ------ | ---------------------------- | ---------- |
| 1        | Unit tests with Capacitor mocks   | Low    | JS logic, platform detection | Yes (fast) |
| 2        | Playwright mobile emulation       | Low    | Responsive UI                | Yes        |
| 3        | Local Android testing (Linux)     | Low    | Manual native testing        | No         |
| 4        | Local iOS testing (Mac M1)        | Low    | Manual native testing        | No         |
| 5        | GitHub Actions Android CI         | Medium | Automated Android builds     | Yes        |
| 6        | GitHub Actions iOS CI             | Medium | Automated iOS builds         | Yes ($$)   |
| 7        | Docker Android emulator           | Medium | Parallelized Android testing | Yes        |
| 8        | Native E2E (Appium/Detox)         | High   | Full native interactions     | Yes        |

---

## Related Files

| File                                  | Purpose                           |
| ------------------------------------- | --------------------------------- |
| `src-capacitor/capacitor.config.json` | Main Capacitor configuration      |
| `src-capacitor/package.json`          | Mobile-specific dependencies      |
| `src/composables/usePlatform.ts`      | Platform detection & capabilities |
| `playwright.config.ts`                | E2E test configuration            |
| `e2e-docker/`                         | Docker-based E2E environment      |
| `.github/workflows/`                  | CI/CD workflow definitions        |

---

## References

- [Android Emulator Runner Action](https://github.com/marketplace/actions/android-emulator-runner)
- [GitHub Actions Android Hardware Acceleration](https://github.blog/changelog/2024-04-02-github-actions-hardware-accelerated-android-virtualization-now-available/)
- [Launch iOS Simulator Action](https://github.com/marketplace/actions/launch-ios-simulator)
- [macOS 26 Runner Preview](https://github.blog/changelog/2025-09-11-actions-macos-26-image-now-in-public-preview/)
- [budtmo/docker-android](https://github.com/budtmo/docker-android)
- [HQarroum/docker-android](https://github.com/HQarroum/docker-android)
- [BuildJet for GitHub Actions](https://buildjet.com/for-github-actions/blog/hardware-accelerated-android-emulator-on-buildjet-for-github-actions)
