/**
 * Electron IPC Boot File
 * Sets up IPC event listeners for menu shortcuts and updates
 * Only active when running in Electron environment
 */

import { boot } from 'quasar/wrappers'
import { Notify } from 'quasar'
import { useUIStore } from 'src/stores/ui'
import { useGistsStore } from 'src/stores/gists'

export default boot(() => {
  // Only run in Electron environment
  if (!window.electronAPI) {
    console.debug('[Electron IPC] Not running in Electron, skipping setup')
    return
  }

  console.debug('[Electron IPC] Setting up IPC event listeners')

  // Get stores
  const uiStore = useUIStore()
  const gistsStore = useGistsStore()

  // Cleanup functions for listeners
  const cleanups: Array<() => void> = []

  // Menu shortcuts
  cleanups.push(
    window.electronAPI.onMenuNewGist(() => {
      console.debug('[Electron IPC] Menu: New Gist')
      uiStore.openModal('newGist')
    })
  )

  cleanups.push(
    window.electronAPI.onMenuSyncGists(async () => {
      console.debug('[Electron IPC] Menu: Sync Gists')
      await Promise.all([gistsStore.syncGists(), gistsStore.syncStarredGists()])
    })
  )

  cleanups.push(
    window.electronAPI.onMenuEditGist(() => {
      console.debug('[Electron IPC] Menu: Edit Gist')
      uiStore.openModal('editGist')
    })
  )

  cleanups.push(
    window.electronAPI.onMenuDeleteGist(() => {
      console.debug('[Electron IPC] Menu: Delete Gist')
      uiStore.openModal('deleteGist')
    })
  )

  cleanups.push(
    window.electronAPI.onMenuToggleImmersive(() => {
      console.debug('[Electron IPC] Menu: Toggle Immersive')
      uiStore.toggleImmersiveMode()
    })
  )

  cleanups.push(
    window.electronAPI.onMenuToggleDashboard(() => {
      console.debug('[Electron IPC] Menu: Toggle Dashboard')
      uiStore.toggleModal('dashboard')
    })
  )

  cleanups.push(
    window.electronAPI.onMenuToggleSearch(() => {
      console.debug('[Electron IPC] Menu: Toggle Search')
      uiStore.toggleModal('search')
    })
  )

  // Update listeners
  cleanups.push(
    window.electronAPI.onUpdateAvailable((_, info) => {
      console.debug('[Electron IPC] Update available:', info.version)
      uiStore.setUpdateAvailable({
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes
      })
    })
  )

  cleanups.push(
    window.electronAPI.onDownloadProgress((_, progress) => {
      console.debug('[Electron IPC] Download progress:', progress.percent.toFixed(1) + '%')
    })
  )

  cleanups.push(
    window.electronAPI.onUpdateDownloaded((_, info) => {
      console.debug('[Electron IPC] Update downloaded:', info.version)
    })
  )

  // Manual update check result listener
  cleanups.push(
    window.electronAPI.onUpdateCheckResult((_, result) => {
      console.debug('[Electron IPC] Update check result:', result)
      if (result.type === 'checking') {
        Notify.create({
          type: 'info',
          message: 'Checking for updates...',
          icon: 'update',
          timeout: 2000
        })
      } else if (result.type === 'up-to-date') {
        Notify.create({
          type: 'positive',
          message: `You're running the latest version (v${result.version})`,
          icon: 'check_circle',
          timeout: 3000
        })
      } else if (result.type === 'error') {
        Notify.create({
          type: 'warning',
          message: result.message || 'Update check failed',
          icon: 'warning',
          timeout: 4000
        })
      }
    })
  )

  // Cleanup on app unmount (optional, mainly for HMR)
  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      console.debug('[Electron IPC] Cleaning up listeners')
      cleanups.forEach(cleanup => cleanup())
    })
  }

  console.debug('[Electron IPC] Setup complete')
})
