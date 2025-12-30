/**
 * Settings Store
 * Coordinates cross-device settings sync via GitHub Gist
 */

import { defineStore } from 'pinia'
import { settingsSync, type SyncableSettings } from 'src/services/settings-sync'
import { useGistsStore } from './gists'
import { useUIStore } from './ui'
import { useSearchStore } from './search'

interface SettingsState {
  syncEnabled: boolean
  lastSyncTime: number | null
  isSyncing: boolean
  syncError: string | null
}

export const useSettingsStore = defineStore('settings', {
  state: (): SettingsState => ({
    syncEnabled: false,
    lastSyncTime: null,
    isSyncing: false,
    syncError: null
  }),

  getters: {
    isSyncActive: (state): boolean => state.syncEnabled && settingsSync.isActive()
  },

  actions: {
    async enableSync(): Promise<void> {
      this.syncEnabled = true
      settingsSync.enable()
      await this.pullSettings()
      console.debug('[Settings] Sync enabled')
    },

    disableSync(): void {
      this.syncEnabled = false
      settingsSync.disable()
      console.debug('[Settings] Sync disabled')
    },

    async pullSettings(): Promise<void> {
      if (!this.syncEnabled) return

      this.isSyncing = true
      this.syncError = null

      try {
        const remote = await settingsSync.loadRemoteSettings()
        
        if (remote) {
          this.applySettings(remote)
          this.lastSyncTime = Date.now()
          console.debug('[Settings] Pulled remote settings')
        }
      } catch (error) {
        this.syncError = error instanceof Error ? error.message : 'Sync failed'
        console.error('[Settings] Pull failed:', error)
      } finally {
        this.isSyncing = false
      }
    },

    async pushSettings(): Promise<void> {
      if (!this.syncEnabled) return

      const settings = this.collectSettings()
      settingsSync.saveSettings(settings)
    },

    async forcePush(): Promise<void> {
      if (!this.syncEnabled) return

      this.isSyncing = true
      try {
        const settings = this.collectSettings()
        await settingsSync.forceSync(settings)
        this.lastSyncTime = Date.now()
      } finally {
        this.isSyncing = false
      }
    },

    collectSettings(): SyncableSettings {
      const gistsStore = useGistsStore()
      const uiStore = useUIStore()
      const searchStore = useSearchStore()

      return {
        pinnedTags: gistsStore.pinnedTags,
        activeTag: gistsStore.activeTag,
        recentGists: gistsStore.recentGists,
        savedSearches: searchStore.savedSearches,
        immersiveMode: uiStore.immersiveMode,
        navDrawers: { ...uiStore.navDrawers },
        lastModified: Date.now()
      }
    },

    applySettings(settings: SyncableSettings): void {
      const gistsStore = useGistsStore()
      const uiStore = useUIStore()
      const searchStore = useSearchStore()

      if (settings.pinnedTags) {
        gistsStore.$patch({ pinnedTags: settings.pinnedTags })
      }
      if (settings.activeTag) {
        gistsStore.$patch({ activeTag: settings.activeTag })
      }
      if (settings.recentGists) {
        gistsStore.$patch({ recentGists: settings.recentGists })
      }
      if (settings.savedSearches) {
        searchStore.$patch({ savedSearches: settings.savedSearches })
      }
      if (typeof settings.immersiveMode === 'boolean') {
        uiStore.$patch({ immersiveMode: settings.immersiveMode })
      }
      if (settings.navDrawers) {
        uiStore.$patch({ navDrawers: settings.navDrawers })
      }

      console.debug('[Settings] Applied settings from sync')
    },

    syncPinnedTags(tags: string[]): void {
      if (this.syncEnabled) {
        settingsSync.saveSettings({ pinnedTags: tags })
      }
    },

    syncActiveTag(tag: string): void {
      if (this.syncEnabled) {
        settingsSync.saveSettings({ activeTag: tag })
      }
    },

    syncRecentGists(recent: Array<{ id: string; viewedAt: number }>): void {
      if (this.syncEnabled) {
        settingsSync.saveSettings({ recentGists: recent })
      }
    },

    syncSavedSearches(searches: Array<{ id: string; query: string; name: string; createdAt: number }>): void {
      if (this.syncEnabled) {
        settingsSync.saveSettings({ savedSearches: searches })
      }
    },

    syncUISettings(immersiveMode: boolean, navDrawers: SyncableSettings['navDrawers']): void {
      if (this.syncEnabled) {
        settingsSync.saveSettings({ immersiveMode, navDrawers })
      }
    }
  },

  persist: {
    paths: ['syncEnabled', 'lastSyncTime']
  }
})
