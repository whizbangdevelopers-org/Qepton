/**
 * Settings Sync Service
 * Syncs user settings across devices via a private GitHub Gist
 */

import { githubAPI } from './github-api'

const TAG = '[Settings Sync]'
const DEBOUNCE_MS = 2000

export interface SyncableSettings {
  pinnedTags: string[]
  activeTag: string
  recentGists: Array<{ id: string; viewedAt: number }>
  savedSearches: Array<{ id: string; query: string; name: string; createdAt: number }>
  immersiveMode: boolean
  navDrawers: {
    allGistsVisible: boolean
    starredVisible: boolean
    recentsVisible: boolean
    languagesVisible: boolean
    languagesExpanded: boolean
    tagsVisible: boolean
    tagsExpanded: boolean
  }
  gistListView: 'list' | 'card'
  gistSort: {
    sortBy: 'updated' | 'name'
    direction: 'asc' | 'desc'
  }
  tagColors: Record<string, string>
  showTagColors: boolean
  lastModified: number
}

class SettingsSyncService {
  private settingsGistId: string | null = null
  private debounceTimer: ReturnType<typeof setTimeout> | null = null
  private isSyncing = false
  private isEnabled = false
  private pendingSettings: Partial<SyncableSettings> | null = null

  enable(): void {
    this.isEnabled = true
    console.debug(`${TAG} Sync enabled`)
  }

  disable(): void {
    this.isEnabled = false
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = null
    }
    console.debug(`${TAG} Sync disabled`)
  }

  isActive(): boolean {
    return this.isEnabled
  }

  async loadRemoteSettings(): Promise<SyncableSettings | null> {
    if (!this.isEnabled) return null

    console.debug(`${TAG} Loading remote settings`)
    try {
      const result = await githubAPI.getSettings()
      if (result) {
        this.settingsGistId = result.gistId
        console.debug(`${TAG} Loaded settings from gist ${result.gistId}`)
        return result.settings as unknown as SyncableSettings
      }
      return null
    } catch (error) {
      console.error(`${TAG} Failed to load remote settings:`, error)
      return null
    }
  }

  saveSettings(settings: Partial<SyncableSettings>): void {
    if (!this.isEnabled) return

    this.pendingSettings = {
      ...this.pendingSettings,
      ...settings,
      lastModified: Date.now()
    }

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
    }

    this.debounceTimer = setTimeout(() => {
      this.flushPendingSettings()
    }, DEBOUNCE_MS)
  }

  private async flushPendingSettings(): Promise<void> {
    if (!this.pendingSettings || this.isSyncing) return

    this.isSyncing = true
    const settingsToSave = { ...this.pendingSettings }
    this.pendingSettings = null

    try {
      console.debug(`${TAG} Saving settings to GitHub`)

      let fullSettings: Record<string, unknown> = settingsToSave

      if (this.settingsGistId) {
        const existing = await githubAPI.getSettings()
        if (existing) {
          fullSettings = { ...existing.settings, ...settingsToSave }
        }
      }

      this.settingsGistId = await githubAPI.saveSettings(
        fullSettings,
        this.settingsGistId ?? undefined
      )

      console.debug(`${TAG} Settings saved successfully`)
    } catch (error) {
      console.error(`${TAG} Failed to save settings:`, error)
      this.pendingSettings = settingsToSave as Partial<SyncableSettings>
    } finally {
      this.isSyncing = false
    }
  }

  async forceSync(settings: SyncableSettings): Promise<void> {
    if (!this.isEnabled) return

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = null
    }

    this.pendingSettings = settings
    await this.flushPendingSettings()
  }

  mergeSettings(
    local: Partial<SyncableSettings>,
    remote: SyncableSettings | null
  ): SyncableSettings {
    if (!remote) {
      return {
        pinnedTags: [],
        activeTag: 'All Gists',
        recentGists: [],
        savedSearches: [],
        immersiveMode: false,
        navDrawers: {
          allGistsVisible: true,
          starredVisible: true,
          recentsVisible: true,
          languagesVisible: true,
          languagesExpanded: true,
          tagsVisible: true,
          tagsExpanded: true
        },
        gistListView: 'list',
        gistSort: {
          sortBy: 'updated',
          direction: 'desc'
        },
        tagColors: {},
        showTagColors: true,
        lastModified: Date.now(),
        ...local
      }
    }

    const localTime = (local as SyncableSettings).lastModified || 0
    const remoteTime = remote.lastModified || 0

    if (remoteTime > localTime) {
      console.debug(`${TAG} Using remote settings (newer)`)
      return { ...remote, ...local }
    }

    console.debug(`${TAG} Using local settings (newer)`)
    return { ...remote, ...local }
  }

  getSettingsGistId(): string | null {
    return this.settingsGistId
  }

  setSettingsGistId(id: string): void {
    this.settingsGistId = id
  }
}

export const settingsSync = new SettingsSyncService()
