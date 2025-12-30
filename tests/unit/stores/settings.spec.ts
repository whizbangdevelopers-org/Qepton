import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSettingsStore } from 'src/stores/settings'
import { useGistsStore } from 'src/stores/gists'
import { useUIStore } from 'src/stores/ui'
import { useSearchStore } from 'src/stores/search'
import { settingsSync } from 'src/services/settings-sync'

vi.mock('src/services/settings-sync', () => ({
  settingsSync: {
    enable: vi.fn(),
    disable: vi.fn(),
    isActive: vi.fn(() => true),
    loadRemoteSettings: vi.fn(),
    saveSettings: vi.fn(),
    forceSync: vi.fn()
  }
}))

vi.mock('src/services/search', () => ({
  searchService: {
    buildIndex: vi.fn(),
    addToIndex: vi.fn(),
    updateInIndex: vi.fn(),
    removeFromIndex: vi.fn()
  }
}))

vi.mock('src/services/parser', () => ({
  extractLanguageTags: vi.fn(() => []),
  extractCustomTags: vi.fn(() => []),
  parseDescription: vi.fn((desc) => ({ title: null, description: desc || '', tags: [] }))
}))

describe('Settings Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('Initial State', () => {
    it('should initialize with sync disabled', () => {
      const store = useSettingsStore()
      expect(store.syncEnabled).toBe(false)
    })

    it('should initialize with null lastSyncTime', () => {
      const store = useSettingsStore()
      expect(store.lastSyncTime).toBeNull()
    })

    it('should initialize with isSyncing false', () => {
      const store = useSettingsStore()
      expect(store.isSyncing).toBe(false)
    })

    it('should initialize with null syncError', () => {
      const store = useSettingsStore()
      expect(store.syncError).toBeNull()
    })
  })

  describe('Getters', () => {
    it('isSyncActive should return true when enabled and service active', () => {
      const store = useSettingsStore()
      store.syncEnabled = true
      vi.mocked(settingsSync).isActive.mockReturnValue(true)
      expect(store.isSyncActive).toBe(true)
    })

    it('isSyncActive should return false when disabled', () => {
      const store = useSettingsStore()
      store.syncEnabled = false
      expect(store.isSyncActive).toBe(false)
    })
  })

  describe('Enable/Disable Sync', () => {
    it('enableSync should enable sync and pull settings', async () => {
      const store = useSettingsStore()
      vi.mocked(settingsSync).loadRemoteSettings.mockResolvedValue(null)

      await store.enableSync()

      expect(store.syncEnabled).toBe(true)
      expect(vi.mocked(settingsSync).enable).toHaveBeenCalled()
      expect(vi.mocked(settingsSync).loadRemoteSettings).toHaveBeenCalled()
    })

    it('disableSync should disable sync', () => {
      const store = useSettingsStore()
      store.syncEnabled = true

      store.disableSync()

      expect(store.syncEnabled).toBe(false)
      expect(vi.mocked(settingsSync).disable).toHaveBeenCalled()
    })
  })

  describe('Pull Settings', () => {
    it('pullSettings should load and apply remote settings', async () => {
      const store = useSettingsStore()
      store.syncEnabled = true

      const remoteSettings = {
        pinnedTags: ['tag1', 'tag2'],
        activeTag: 'tag1',
        recentGists: [],
        savedSearches: [],
        immersiveMode: true,
        navDrawers: {
          languagesVisible: true,
          languagesExpanded: false,
          tagsVisible: true,
          tagsExpanded: true
        },
        lastModified: Date.now()
      }

      vi.mocked(settingsSync).loadRemoteSettings.mockResolvedValue(remoteSettings)

      await store.pullSettings()

      expect(store.lastSyncTime).not.toBeNull()
      const gistsStore = useGistsStore()
      expect(gistsStore.pinnedTags).toEqual(['tag1', 'tag2'])
    })

    it('pullSettings should handle errors', async () => {
      const store = useSettingsStore()
      store.syncEnabled = true

      vi.mocked(settingsSync).loadRemoteSettings.mockRejectedValue(new Error('Network error'))

      await store.pullSettings()

      expect(store.syncError).toBe('Network error')
    })

    it('pullSettings should skip when sync disabled', async () => {
      const store = useSettingsStore()
      store.syncEnabled = false

      await store.pullSettings()

      expect(vi.mocked(settingsSync).loadRemoteSettings).not.toHaveBeenCalled()
    })
  })

  describe('Push Settings', () => {
    it('pushSettings should save settings', async () => {
      const store = useSettingsStore()
      store.syncEnabled = true

      await store.pushSettings()

      expect(vi.mocked(settingsSync).saveSettings).toHaveBeenCalled()
    })

    it('pushSettings should skip when sync disabled', async () => {
      const store = useSettingsStore()
      store.syncEnabled = false

      await store.pushSettings()

      expect(vi.mocked(settingsSync).saveSettings).not.toHaveBeenCalled()
    })
  })

  describe('Force Push', () => {
    it('forcePush should force sync settings', async () => {
      const store = useSettingsStore()
      store.syncEnabled = true

      await store.forcePush()

      expect(vi.mocked(settingsSync).forceSync).toHaveBeenCalled()
      expect(store.lastSyncTime).not.toBeNull()
    })
  })

  describe('Collect Settings', () => {
    it('collectSettings should gather settings from all stores', () => {
      const settingsStore = useSettingsStore()
      const gistsStore = useGistsStore()
      const uiStore = useUIStore()
      const searchStore = useSearchStore()

      gistsStore.pinnedTags = ['tag1']
      gistsStore.activeTag = 'tag1'
      gistsStore.recentGists = [{ id: 'g1', viewedAt: 1000 }]
      uiStore.immersiveMode = true
      searchStore.savedSearches = [{ id: 's1', query: 'test', name: 'test', createdAt: 1000 }]

      const settings = settingsStore.collectSettings()

      expect(settings.pinnedTags).toEqual(['tag1'])
      expect(settings.activeTag).toBe('tag1')
      expect(settings.recentGists).toHaveLength(1)
      expect(settings.savedSearches).toHaveLength(1)
      expect(settings.immersiveMode).toBe(true)
      expect(settings.lastModified).toBeDefined()
    })
  })

  describe('Apply Settings', () => {
    it('applySettings should update all stores', () => {
      const settingsStore = useSettingsStore()
      const gistsStore = useGistsStore()
      const uiStore = useUIStore()
      const searchStore = useSearchStore()

      const settings = {
        pinnedTags: ['remote-tag'],
        activeTag: 'remote-tag',
        recentGists: [{ id: 'remote-gist', viewedAt: 2000 }],
        savedSearches: [{ id: 'rs1', query: 'remote', name: 'remote', createdAt: 2000 }],
        immersiveMode: true,
        navDrawers: {
          languagesVisible: false,
          languagesExpanded: true,
          tagsVisible: true,
          tagsExpanded: false
        },
        lastModified: Date.now()
      }

      settingsStore.applySettings(settings)

      expect(gistsStore.pinnedTags).toEqual(['remote-tag'])
      expect(gistsStore.activeTag).toBe('remote-tag')
      expect(gistsStore.recentGists).toHaveLength(1)
      expect(searchStore.savedSearches).toHaveLength(1)
      expect(uiStore.immersiveMode).toBe(true)
      expect(uiStore.navDrawers.languagesVisible).toBe(false)
    })
  })

  describe('Individual Sync Methods', () => {
    it('syncPinnedTags should save pinned tags', () => {
      const store = useSettingsStore()
      store.syncEnabled = true

      store.syncPinnedTags(['tag1', 'tag2'])

      expect(vi.mocked(settingsSync).saveSettings).toHaveBeenCalledWith({ pinnedTags: ['tag1', 'tag2'] })
    })

    it('syncActiveTag should save active tag', () => {
      const store = useSettingsStore()
      store.syncEnabled = true

      store.syncActiveTag('my-tag')

      expect(vi.mocked(settingsSync).saveSettings).toHaveBeenCalledWith({ activeTag: 'my-tag' })
    })

    it('syncRecentGists should save recent gists', () => {
      const store = useSettingsStore()
      store.syncEnabled = true

      const recent = [{ id: 'g1', viewedAt: 1000 }]
      store.syncRecentGists(recent)

      expect(vi.mocked(settingsSync).saveSettings).toHaveBeenCalledWith({ recentGists: recent })
    })

    it('syncSavedSearches should save searches', () => {
      const store = useSettingsStore()
      store.syncEnabled = true

      const searches = [{ id: 's1', query: 'test', name: 'test', createdAt: 1000 }]
      store.syncSavedSearches(searches)

      expect(vi.mocked(settingsSync).saveSettings).toHaveBeenCalledWith({ savedSearches: searches })
    })

    it('syncUISettings should save UI settings', () => {
      const store = useSettingsStore()
      store.syncEnabled = true

      const navDrawers = {
        languagesVisible: true,
        languagesExpanded: true,
        tagsVisible: true,
        tagsExpanded: true
      }
      store.syncUISettings(true, navDrawers)

      expect(vi.mocked(settingsSync).saveSettings).toHaveBeenCalledWith({
        immersiveMode: true,
        navDrawers
      })
    })

    it('sync methods should skip when disabled', () => {
      const store = useSettingsStore()
      store.syncEnabled = false

      store.syncPinnedTags(['tag1'])
      store.syncActiveTag('tag1')
      store.syncRecentGists([])
      store.syncSavedSearches([])

      expect(vi.mocked(settingsSync).saveSettings).not.toHaveBeenCalled()
    })
  })
})
