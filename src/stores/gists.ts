/**
 * Gists Store
 * Manages gists data, tags, and synchronization with GitHub
 */

import { defineStore } from 'pinia'
import { githubAPI } from 'src/services/github-api'
import { searchService } from 'src/services/search'
import { settingsSync } from 'src/services/settings-sync'
import { extractLanguageTags, extractCustomTags, parseDescription } from 'src/services/parser'
import type { GistsState, TagInfo } from 'src/types/store'
import type { Gist } from 'src/types/github'
import { useAuthStore } from './auth'

/**
 * Pre-loaded starter tags for organizing gists.
 * These appear in the UI even when no gists use them yet,
 * helping new users discover the tagging system.
 */
export const STARTER_TAGS = ['Prompt', 'Code', 'Notebook', 'Note'] as const
export type StarterTag = (typeof STARTER_TAGS)[number]

export const useGistsStore = defineStore('gists', {
  state: (): GistsState => ({
    gists: {},
    loadedGistIds: new Set(),
    loadingGistId: null,
    gistTags: {},
    pinnedTags: [],
    pinnedGistIds: new Set(),
    starredGistIds: new Set(),
    starredGists: {},
    recentGists: [],
    activeGistId: null,
    activeTag: 'All Gists',
    selectedGistIds: new Set(),
    isSyncing: false,
    lastSyncTime: null,
    syncError: null
  }),

  getters: {
    /**
     * Get active gist
     */
    activeGist: (state): Gist | null => {
      return state.activeGistId ? state.gists[state.activeGistId] : null
    },

    /**
     * Get all gists as array (sorted by updated_at)
     */
    allGistsArray: (state): Gist[] => {
      return Object.values(state.gists).sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      )
    },

    /**
     * Get gists for a specific tag
     */
    gistsByTag:
      state =>
      (tag: string): Gist[] => {
        if (tag === 'All Gists') {
          return Object.values(state.gists).sort(
            (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
          )
        }

        if (tag === 'Starred') {
          return Object.values(state.starredGists).sort(
            (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
          )
        }

        if (tag === 'Pinned') {
          return Array.from(state.pinnedGistIds)
            .map(id => state.gists[id] || state.starredGists[id])
            .filter(Boolean)
            .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        }

        if (tag === 'Recent') {
          return state.recentGists
            .map(r => state.gists[r.id] || state.starredGists[r.id])
            .filter(Boolean)
        }

        const gistIds = state.gistTags[tag] || new Set()
        return Array.from(gistIds)
          .map(id => state.gists[id])
          .filter(Boolean)
          .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      },

    /**
     * Get recent gists array (sorted by most recently viewed)
     */
    recentGistsArray: (state): Gist[] => {
      return state.recentGists
        .map(r => state.gists[r.id] || state.starredGists[r.id])
        .filter(Boolean)
    },

    /**
     * Get recent gists count
     */
    recentCount: (state): number => {
      return state.recentGists.filter(r => state.gists[r.id] || state.starredGists[r.id]).length
    },

    /**
     * Get all unique tags
     */
    allTags: (state): string[] => {
      return Object.keys(state.gistTags).sort()
    },

    /**
     * Get language tags only
     */
    languageTags: (state): string[] => {
      return Object.keys(state.gistTags)
        .filter(tag => tag.startsWith('lang@'))
        .sort()
    },

    /**
     * Get custom (user-defined) tags only
     */
    customTags: (state): string[] => {
      return Object.keys(state.gistTags)
        .filter(tag => !tag.startsWith('lang@'))
        .sort()
    },

    /**
     * Get starter tags that haven't been used yet.
     * These are shown as suggestions in the navigation panel.
     */
    unusedStarterTags: (state): string[] => {
      const usedTags = new Set(Object.keys(state.gistTags).map(t => t.toLowerCase()))
      return STARTER_TAGS.filter(tag => !usedTags.has(tag.toLowerCase()))
    },

    /**
     * Get all custom tags including unused starter tags.
     * Used tags come first (sorted), then unused starter tags.
     */
    customTagsWithStarters: (state): Array<{ tag: string; count: number; isStarter: boolean }> => {
      const usedTags = Object.keys(state.gistTags)
        .filter(tag => !tag.startsWith('lang@'))
        .sort()
        .map(tag => ({
          tag,
          count: state.gistTags[tag]?.size || 0,
          isStarter: STARTER_TAGS.some(s => s.toLowerCase() === tag.toLowerCase())
        }))

      const usedTagsLower = new Set(usedTags.map(t => t.tag.toLowerCase()))
      const unusedStarters = STARTER_TAGS
        .filter(tag => !usedTagsLower.has(tag.toLowerCase()))
        .map(tag => ({
          tag,
          count: 0,
          isStarter: true
        }))

      return [...usedTags, ...unusedStarters]
    },

    /**
     * Get tag info with counts
     */
    tagInfo:
      state =>
      (tag: string): TagInfo | null => {
        const gistIds = state.gistTags[tag]
        if (!gistIds) return null

        return {
          name: tag,
          count: gistIds.size,
          gistIds: Array.from(gistIds),
          type: tag.startsWith('lang@') ? 'language' : 'custom'
        }
      },

    /**
     * Get total gist count
     */
    totalGists: (state): number => {
      return Object.keys(state.gists).length
    },

    /**
     * Get statistics
     */
    stats: (
      state
    ): { totalGists: number; totalTags: number; languageTags: number; customTags: number } => {
      const allTags = Object.keys(state.gistTags)
      return {
        totalGists: Object.keys(state.gists).length,
        totalTags: allTags.length,
        languageTags: allTags.filter(tag => tag.startsWith('lang@')).length,
        customTags: allTags.filter(tag => !tag.startsWith('lang@')).length
      }
    },

    /**
     * Get starred gists as array (sorted by updated_at)
     */
    starredGistsArray: (state): Gist[] => {
      return Object.values(state.starredGists).sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      )
    },

    /**
     * Get starred gists count
     */
    starredCount: (state): number => {
      return state.starredGistIds.size
    },

    /**
     * Check if a gist is starred
     */
    isStarred:
      state =>
      (gistId: string): boolean => {
        return state.starredGistIds.has(gistId)
      },

    /**
     * Get pinned gists as array (sorted by updated_at)
     */
    pinnedGistsArray: (state): Gist[] => {
      return Array.from(state.pinnedGistIds)
        .map(id => state.gists[id] || state.starredGists[id])
        .filter(Boolean)
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    },

    /**
     * Get pinned gists count
     */
    pinnedCount: (state): number => {
      return state.pinnedGistIds.size
    },

    /**
     * Check if a gist is pinned
     */
    isGistPinned:
      state =>
      (gistId: string): boolean => {
        return state.pinnedGistIds.has(gistId)
      },

    /**
     * Check if a gist has full content loaded
     */
    isGistLoaded:
      state =>
      (gistId: string): boolean => {
        return state.loadedGistIds.has(gistId)
      },

    /**
     * Check if a gist is currently loading
     */
    isGistLoading:
      state =>
      (gistId: string): boolean => {
        return state.loadingGistId === gistId
      },

    /**
     * Check if a gist is selected (for bulk operations)
     */
    isGistSelected:
      state =>
      (gistId: string): boolean => {
        return state.selectedGistIds.has(gistId)
      },

    /**
     * Get count of selected gists
     */
    selectedCount: (state): number => {
      return state.selectedGistIds.size
    },

    /**
     * Get selected gists as array
     */
    selectedGistsArray: (state): Gist[] => {
      return Array.from(state.selectedGistIds)
        .map(id => state.gists[id])
        .filter(Boolean)
    }
  },

  actions: {
    /**
     * Sync all gists from GitHub
     */
    async syncGists(): Promise<void> {
      const authStore = useAuthStore()

      if (!authStore.isAuthenticated) {
        throw new Error('Not authenticated')
      }

      // Use demo username in demo mode, otherwise regular username
      const username = authStore.isDemoMode ? authStore.demoUsername : authStore.username
      if (!username) {
        throw new Error('No username available')
      }

      this.isSyncing = true
      this.syncError = null

      try {
        console.debug(`[Gists] Starting sync for ${username}${authStore.isDemoMode ? ' (demo mode)' : ''}...`)

        // Fetch all gists from GitHub (works without auth for public gists)
        const gists = await githubAPI.getAllGists(username)

        console.debug(`[Gists] Fetched ${gists.length} gists`)

        // Clear existing data
        this.gists = {}
        this.gistTags = {}
        this.loadedGistIds = new Set()

        // Process each gist
        gists.forEach(gist => {
          // Store gist
          this.gists[gist.id] = gist

          // Extract and index language tags
          const langTags = extractLanguageTags(gist)
          langTags.forEach(tag => {
            if (!this.gistTags[tag]) {
              this.gistTags[tag] = new Set()
            }
            this.gistTags[tag].add(gist.id)
          })

          // Extract and index custom tags
          const customTags = extractCustomTags(gist)
          customTags.forEach(tag => {
            if (!this.gistTags[tag]) {
              this.gistTags[tag] = new Set()
            }
            this.gistTags[tag].add(gist.id)
          })
        })

        // Update sync time
        this.lastSyncTime = Date.now()

        // Rebuild search index
        searchService.buildIndex(this.gists)

        console.debug('[Gists] Sync completed successfully')
      } catch (error) {
        console.error('[Gists] Sync failed:', error)
        this.syncError = error instanceof Error ? error.message : 'Sync failed'
        throw error
      } finally {
        this.isSyncing = false
      }
    },

    /**
     * Fetch full gist content on demand (lazy loading)
     * Returns the gist with full file content
     */
    async fetchGistContent(gistId: string): Promise<Gist | null> {
      if (this.loadedGistIds.has(gistId)) {
        return this.gists[gistId] || null
      }

      if (this.loadingGistId === gistId) {
        return this.gists[gistId] || null
      }

      this.loadingGistId = gistId

      try {
        console.debug(`[Gists] Fetching full content for gist ${gistId}`)
        const fullGist = await githubAPI.getSingleGist(gistId)

        this.gists[gistId] = fullGist
        this.loadedGistIds.add(gistId)

        searchService.updateInIndex(fullGist)

        console.debug(`[Gists] Loaded full content for gist ${gistId}`)
        return fullGist
      } catch (error) {
        console.error(`[Gists] Failed to fetch gist ${gistId}:`, error)
        return null
      } finally {
        this.loadingGistId = null
      }
    },

    /**
     * Track a gist as recently viewed
     */
    trackRecentGist(gistId: string): void {
      const MAX_RECENT = 10

      this.recentGists = this.recentGists.filter(r => r.id !== gistId)

      this.recentGists.unshift({ id: gistId, viewedAt: Date.now() })

      if (this.recentGists.length > MAX_RECENT) {
        this.recentGists = this.recentGists.slice(0, MAX_RECENT)
      }

      settingsSync.saveSettings({ recentGists: this.recentGists })
    },

    /**
     * Clear all recent gists
     */
    clearRecentGists(): void {
      this.recentGists = []
      settingsSync.saveSettings({ recentGists: [] })
      console.debug('[Gists] Recent gists cleared')
    },

    /**
     * Create a new gist
     */
    async createGist(
      description: string,
      files: Record<string, { content: string }>,
      isPublic: boolean = true
    ): Promise<Gist> {
      const authStore = useAuthStore()
      if (authStore.isDemoMode) {
        throw new Error('Cannot create gists in demo mode')
      }

      try {
        console.debug('[Gists] Creating new gist')

        const newGist = await githubAPI.createGist(description, files, isPublic)

        // Add to local state
        this.gists[newGist.id] = newGist
        this.loadedGistIds.add(newGist.id)

        // Index tags
        this.indexGistTags(newGist)

        // Add to search index
        searchService.addToIndex(newGist)

        console.debug('[Gists] Gist created:', newGist.id)

        return newGist
      } catch (error) {
        console.error('[Gists] Create failed:', error)
        throw error
      }
    },

    /**
     * Update an existing gist
     */
    async updateGist(
      gistId: string,
      description: string,
      files: Record<string, { content: string } | null>
    ): Promise<Gist> {
      const authStore = useAuthStore()
      if (authStore.isDemoMode) {
        throw new Error('Cannot update gists in demo mode')
      }

      try {
        console.debug('[Gists] Updating gist:', gistId)

        const updatedGist = await githubAPI.updateGist(gistId, description, files)

        // Remove old tag associations
        this.removeGistFromTags(gistId)

        // Update in local state
        this.gists[gistId] = updatedGist
        this.loadedGistIds.add(gistId)

        // Re-index tags
        this.indexGistTags(updatedGist)

        // Update search index
        searchService.updateInIndex(updatedGist)

        console.debug('[Gists] Gist updated:', gistId)

        return updatedGist
      } catch (error) {
        console.error('[Gists] Update failed:', error)
        throw error
      }
    },

    /**
     * Delete a gist
     */
    async deleteGist(gistId: string): Promise<void> {
      const authStore = useAuthStore()
      if (authStore.isDemoMode) {
        throw new Error('Cannot delete gists in demo mode')
      }

      try {
        console.debug('[Gists] Deleting gist:', gistId)

        await githubAPI.deleteGist(gistId)

        // Remove from tags
        this.removeGistFromTags(gistId)

        // Remove from state
        delete this.gists[gistId]

        // Remove from search index
        searchService.removeFromIndex(gistId)

        // Clear active gist if deleted
        if (this.activeGistId === gistId) {
          this.activeGistId = null
        }

        console.debug('[Gists] Gist deleted:', gistId)
      } catch (error) {
        console.error('[Gists] Delete failed:', error)
        throw error
      }
    },

    /**
     * Set active gist
     */
    setActiveGist(gistId: string | null): void {
      this.activeGistId = gistId
    },

    /**
     * Set active tag
     */
    setActiveTag(tag: string): void {
      this.activeTag = tag
      settingsSync.saveSettings({ activeTag: tag })
    },

    /**
     * Toggle pinned tag
     */
    togglePinnedTag(tag: string): void {
      const index = this.pinnedTags.indexOf(tag)

      if (index > -1) {
        this.pinnedTags.splice(index, 1)
      } else {
        this.pinnedTags.push(tag)
      }
      settingsSync.saveSettings({ pinnedTags: [...this.pinnedTags] })
    },

    /**
     * Pin a tag
     */
    pinTag(tag: string): void {
      if (!this.pinnedTags.includes(tag)) {
        this.pinnedTags.push(tag)
        settingsSync.saveSettings({ pinnedTags: [...this.pinnedTags] })
      }
    },

    /**
     * Unpin a tag
     */
    unpinTag(tag: string): void {
      const index = this.pinnedTags.indexOf(tag)
      if (index > -1) {
        this.pinnedTags.splice(index, 1)
        settingsSync.saveSettings({ pinnedTags: [...this.pinnedTags] })
      }
    },

    /**
     * Reorder pinned tags (for drag-and-drop)
     */
    reorderPinnedTags(newOrder: string[]): void {
      this.pinnedTags = newOrder
      settingsSync.saveSettings({ pinnedTags: [...this.pinnedTags] })
    },

    /**
     * Helper: Index tags for a gist
     */
    indexGistTags(gist: Gist): void {
      // Language tags
      const langTags = extractLanguageTags(gist)
      langTags.forEach(tag => {
        if (!this.gistTags[tag]) {
          this.gistTags[tag] = new Set()
        }
        this.gistTags[tag].add(gist.id)
      })

      // Custom tags
      const customTags = extractCustomTags(gist)
      customTags.forEach(tag => {
        if (!this.gistTags[tag]) {
          this.gistTags[tag] = new Set()
        }
        this.gistTags[tag].add(gist.id)
      })
    },

    /**
     * Helper: Remove gist from all tag associations
     */
    removeGistFromTags(gistId: string): void {
      Object.keys(this.gistTags).forEach(tag => {
        this.gistTags[tag].delete(gistId)

        // Remove tag if no gists remain
        if (this.gistTags[tag].size === 0) {
          delete this.gistTags[tag]
        }
      })
    },

    /**
     * Get gist title (from parsed description)
     */
    getGistTitle(gistId: string): string {
      const gist = this.gists[gistId]
      if (!gist) return ''

      const parsed = parseDescription(gist.description)
      return parsed.title || gist.description || 'Untitled'
    },

    /**
     * Sync starred gists from GitHub
     */
    async syncStarredGists(): Promise<void> {
      const authStore = useAuthStore()
      if (authStore.isDemoMode) {
        // Skip starred gists sync in demo mode (requires auth)
        console.debug('[Gists] Skipping starred gists sync in demo mode')
        return
      }

      try {
        console.debug('[Gists] Syncing starred gists...')

        const starredGists = await githubAPI.getStarredGists()

        this.starredGistIds = new Set(starredGists.map(g => g.id))
        this.starredGists = {}
        starredGists.forEach(gist => {
          this.starredGists[gist.id] = gist
        })

        console.debug(`[Gists] Synced ${starredGists.length} starred gists`)
      } catch (error) {
        console.error('[Gists] Failed to sync starred gists:', error)
        throw error
      }
    },

    /**
     * Star a gist
     */
    async starGist(gistId: string): Promise<void> {
      const authStore = useAuthStore()
      if (authStore.isDemoMode) {
        throw new Error('Cannot star gists in demo mode')
      }

      try {
        console.debug('[Gists] Starring gist:', gistId)

        await githubAPI.starGist(gistId)

        this.starredGistIds.add(gistId)

        const gist = this.gists[gistId]
        if (gist) {
          this.starredGists[gistId] = gist
        }

        console.debug('[Gists] Gist starred:', gistId)
      } catch (error) {
        console.error('[Gists] Failed to star gist:', error)
        throw error
      }
    },

    /**
     * Unstar a gist
     */
    async unstarGist(gistId: string): Promise<void> {
      const authStore = useAuthStore()
      if (authStore.isDemoMode) {
        throw new Error('Cannot unstar gists in demo mode')
      }

      try {
        console.debug('[Gists] Unstarring gist:', gistId)

        await githubAPI.unstarGist(gistId)

        this.starredGistIds.delete(gistId)
        delete this.starredGists[gistId]

        console.debug('[Gists] Gist unstarred:', gistId)
      } catch (error) {
        console.error('[Gists] Failed to unstar gist:', error)
        throw error
      }
    },

    /**
     * Toggle star status for a gist
     */
    async toggleStar(gistId: string): Promise<void> {
      if (this.starredGistIds.has(gistId)) {
        await this.unstarGist(gistId)
      } else {
        await this.starGist(gistId)
      }
    },

    /**
     * Pin a gist (local only, stored in localStorage)
     */
    pinGist(gistId: string): void {
      if (!this.pinnedGistIds.has(gistId)) {
        this.pinnedGistIds.add(gistId)
        console.debug('[Gists] Gist pinned:', gistId)
      }
    },

    /**
     * Unpin a gist
     */
    unpinGist(gistId: string): void {
      if (this.pinnedGistIds.has(gistId)) {
        this.pinnedGistIds.delete(gistId)
        console.debug('[Gists] Gist unpinned:', gistId)
      }
    },

    /**
     * Toggle pin status for a gist
     */
    togglePinGist(gistId: string): void {
      if (this.pinnedGistIds.has(gistId)) {
        this.unpinGist(gistId)
      } else {
        this.pinGist(gistId)
      }
    },

    /**
     * Toggle gist selection (for bulk operations)
     */
    toggleGistSelection(gistId: string): void {
      if (this.selectedGistIds.has(gistId)) {
        this.selectedGistIds.delete(gistId)
      } else {
        this.selectedGistIds.add(gistId)
      }
    },

    /**
     * Select a gist (for bulk operations)
     */
    selectGist(gistId: string): void {
      this.selectedGistIds.add(gistId)
    },

    /**
     * Deselect a gist (for bulk operations)
     */
    deselectGist(gistId: string): void {
      this.selectedGistIds.delete(gistId)
    },

    /**
     * Select all gists from a given array
     */
    selectAllGists(gistIds: string[]): void {
      gistIds.forEach(id => this.selectedGistIds.add(id))
    },

    /**
     * Deselect all gists
     */
    deselectAllGists(): void {
      this.selectedGistIds.clear()
    },

    /**
     * Bulk delete selected gists
     */
    async bulkDeleteGists(gistIds: string[]): Promise<{ success: string[]; failed: string[] }> {
      const success: string[] = []
      const failed: string[] = []

      for (const gistId of gistIds) {
        try {
          await this.deleteGist(gistId)
          success.push(gistId)
          this.selectedGistIds.delete(gistId)
        } catch {
          failed.push(gistId)
        }
      }

      return { success, failed }
    },

    /**
     * Reset all gists state (called on logout)
     */
    $reset(): void {
      this.gists = {}
      this.loadedGistIds = new Set()
      this.loadingGistId = null
      this.gistTags = {}
      this.pinnedTags = []
      this.pinnedGistIds = new Set()
      this.starredGistIds = new Set()
      this.starredGists = {}
      this.recentGists = []
      this.activeGistId = null
      this.activeTag = 'All Gists'
      this.selectedGistIds = new Set()
      this.isSyncing = false
      this.lastSyncTime = null
      this.syncError = null

      // Clear search index
      searchService.resetIndex()

      console.debug('[Gists] Store reset')
    }
  },

  // Persist certain state
  persist: {
    paths: ['pinnedTags', 'pinnedGistIds', 'lastSyncTime', 'activeTag', 'recentGists'],
    serializer: {
      serialize: (state) => {
        // Convert Sets to arrays for JSON serialization
        const serializable = { ...state }
        if (serializable.pinnedGistIds instanceof Set) {
          serializable.pinnedGistIds = Array.from(serializable.pinnedGistIds) as unknown as Set<string>
        }
        return JSON.stringify(serializable)
      },
      deserialize: (value) => {
        const state = JSON.parse(value)
        // Convert arrays back to Sets
        if (Array.isArray(state.pinnedGistIds)) {
          state.pinnedGistIds = new Set(state.pinnedGistIds)
        }
        return state
      }
    }
  }
})
