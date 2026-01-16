/**
 * Platform Detection Composable
 * Provides utilities for detecting and adapting to different platforms
 */

import { computed, ref } from 'vue'
import { Platform } from 'quasar'

export type PlatformType = 'electron' | 'pwa' | 'capacitor' | 'web'

export function usePlatform() {
  // Detect current platform
  const isElectron = ref(!!window.electronAPI)
  const isCapacitor = ref(Platform.is.capacitor)
  const isPWA = ref(
    window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  )
  const isMobile = ref(Platform.is.mobile)
  const isDesktop = ref(Platform.is.desktop)
  const isMac = ref(Platform.is.mac)
  const isWindows = ref(Platform.is.win)
  const isLinux = ref(Platform.is.linux)
  const isIOS = ref(Platform.is.ios)
  const isAndroid = ref(Platform.is.android)

  // Current platform type
  const platformType = computed<PlatformType>(() => {
    if (isElectron.value) return 'electron'
    if (isCapacitor.value) return 'capacitor'
    if (isPWA.value) return 'pwa'
    return 'web'
  })

  // Platform-specific capabilities
  const capabilities = computed(() => ({
    // OAuth popup support
    oauthPopup: isElectron.value,
    // Native file system access
    fileSystem: isElectron.value,
    // Push notifications
    pushNotifications: isPWA.value || isCapacitor.value,
    // Biometric authentication
    biometrics: isCapacitor.value && (isIOS.value || isAndroid.value),
    // Native share API
    share: isCapacitor.value || 'share' in navigator,
    // Offline support
    offline: isPWA.value || isCapacitor.value || isElectron.value,
    // Auto-updates
    autoUpdate: isElectron.value,
    // Native menus
    nativeMenus: isElectron.value,
    // Keyboard shortcuts (full support)
    keyboardShortcuts: isDesktop.value,
    // Touch gestures
    touchGestures: isMobile.value,
    // Deep linking
    deepLinking: isCapacitor.value || isElectron.value
  }))

  // Open external URL (platform-aware)
  const openExternal = async (url: string) => {
    if (isElectron.value && window.electronAPI) {
      await window.electronAPI.openExternal(url)
    } else {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }

  // Share content (platform-aware)
  const share = async (data: ShareData): Promise<boolean> => {
    // Try native share API first
    if (navigator.share) {
      try {
        await navigator.share(data)
        return true
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Share failed:', err)
        }
        return false
      }
    }
    // Fallback: copy to clipboard
    if (data.url && 'clipboard' in navigator) {
      try {
        await navigator.clipboard.writeText(data.url)
        return true
      } catch {
        return false
      }
    }
    return false
  }

  // Get platform-specific keyboard shortcut modifier
  const modifierKey = computed(() => {
    if (isMac.value) return '⌘'
    return 'Ctrl'
  })

  // Format keyboard shortcut for display
  const formatShortcut = (shortcut: string): string => {
    return shortcut
      .replace('CmdOrCtrl', modifierKey.value)
      .replace('Cmd', '⌘')
      .replace('Ctrl', isMac.value ? '⌃' : 'Ctrl')
      .replace('Alt', isMac.value ? '⌥' : 'Alt')
      .replace('Shift', isMac.value ? '⇧' : 'Shift')
  }

  return {
    // Platform detection
    platformType,
    isElectron,
    isCapacitor,
    isPWA,
    isMobile,
    isDesktop,
    isMac,
    isWindows,
    isLinux,
    isIOS,
    isAndroid,

    // Capabilities
    capabilities,

    // Platform-aware utilities
    openExternal,
    share,
    modifierKey,
    formatShortcut
  }
}
