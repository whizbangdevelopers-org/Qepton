/**
 * UI Store
 * Manages UI state including modals, immersive mode, and file expansion
 */

import { defineStore } from 'pinia'
import { settingsSync } from 'src/services/settings-sync'
import type {
  UIState,
  ModalStates,
  UpdateInfo,
  GistListView,
  GistSortOption,
  GistSortDirection
} from 'src/types/store'

export const useUIStore = defineStore('ui', {
  state: (): UIState => ({
    modals: {
      newGist: false,
      editGist: false,
      deleteGist: false,
      cloneGist: false,
      rawGist: false,
      about: false,
      dashboard: false,
      help: false,
      search: false,
      logout: false,
      pinnedTags: false,
      settings: false,
      versionHistory: false
    },
    rawGistContent: null,
    immersiveMode: false,
    expandedFiles: {},
    updateAvailable: false,
    updateInfo: null,
    previewLines: 5,
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
    bulkOperationsEnabled: false,
    showKeyboardFocus: false
  }),

  getters: {
    /**
     * Check if any modal is open
     */
    isAnyModalOpen: (state): boolean => {
      return Object.values(state.modals).some(isOpen => isOpen)
    },

    /**
     * Get list of open modals
     */
    openModals: (state): string[] => {
      return Object.entries(state.modals)
        .filter(([, isOpen]) => isOpen)
        .map(([name]) => name)
    },

    /**
     * Check if a specific file is expanded
     */
    isFileExpanded:
      state =>
      (fileId: string): boolean => {
        return state.expandedFiles[fileId] || false
      },

    /**
     * Check if list view is active
     */
    isListView: (state): boolean => state.gistListView === 'list',

    /**
     * Check if card view is active
     */
    isCardView: (state): boolean => state.gistListView === 'card'
  },

  actions: {
    /**
     * Open a modal
     */
    openModal(modalName: keyof ModalStates, payload: string | null = null): void {
      this.modals[modalName] = true

      if (modalName === 'rawGist' && payload) {
        this.rawGistContent = payload
      }

      console.debug(`[UI] Opened modal: ${modalName}`)
    },

    /**
     * Close a modal
     */
    closeModal(modalName: keyof ModalStates): void {
      this.modals[modalName] = false

      if (modalName === 'rawGist') {
        this.rawGistContent = null
      }

      console.debug(`[UI] Closed modal: ${modalName}`)
    },

    /**
     * Close all modals
     */
    closeAllModals(): void {
      Object.keys(this.modals).forEach(modalName => {
        this.modals[modalName as keyof ModalStates] = false
      })

      this.rawGistContent = null

      console.debug('[UI] Closed all modals')
    },

    /**
     * Toggle a modal
     */
    toggleModal(modalName: keyof ModalStates): void {
      this.modals[modalName] = !this.modals[modalName]

      console.debug(`[UI] Toggled modal: ${modalName} -> ${this.modals[modalName]}`)
    },

    /**
     * Toggle immersive mode
     */
    toggleImmersiveMode(): void {
      this.immersiveMode = !this.immersiveMode
      settingsSync.saveSettings({
        immersiveMode: this.immersiveMode,
        navDrawers: { ...this.navDrawers }
      })
      console.debug(`[UI] Immersive mode: ${this.immersiveMode}`)
    },

    /**
     * Enable immersive mode
     */
    enableImmersiveMode(): void {
      this.immersiveMode = true
      settingsSync.saveSettings({ immersiveMode: true, navDrawers: { ...this.navDrawers } })
    },

    /**
     * Disable immersive mode
     */
    disableImmersiveMode(): void {
      this.immersiveMode = false
      settingsSync.saveSettings({ immersiveMode: false, navDrawers: { ...this.navDrawers } })
    },

    /**
     * Toggle file expansion
     */
    toggleFileExpansion(fileId: string): void {
      this.expandedFiles[fileId] = !this.expandedFiles[fileId]
    },

    /**
     * Expand a file
     */
    expandFile(fileId: string): void {
      this.expandedFiles[fileId] = true
    },

    /**
     * Collapse a file
     */
    collapseFile(fileId: string): void {
      this.expandedFiles[fileId] = false
    },

    /**
     * Expand all files for a gist
     */
    expandAllFiles(fileIds: string[]): void {
      fileIds.forEach(fileId => {
        this.expandedFiles[fileId] = true
      })
    },

    /**
     * Collapse all files for a gist
     */
    collapseAllFiles(fileIds: string[]): void {
      fileIds.forEach(fileId => {
        this.expandedFiles[fileId] = false
      })
    },

    /**
     * Set update available
     */
    setUpdateAvailable(info: UpdateInfo): void {
      this.updateAvailable = true
      this.updateInfo = info

      console.debug('[UI] Update available:', info.version)
    },

    /**
     * Dismiss update notification
     */
    dismissUpdate(): void {
      this.updateAvailable = false
      this.updateInfo = null
    },

    /**
     * Reset UI state (useful for logout)
     */
    reset(): void {
      this.closeAllModals()
      this.rawGistContent = null
      this.immersiveMode = false
      this.expandedFiles = {}
      this.updateAvailable = false
      this.updateInfo = null

      console.debug('[UI] State reset')
    },

    /**
     * Toggle nav drawer visibility
     */
    toggleNavDrawerVisibility(drawer: 'allGists' | 'starred' | 'recents' | 'languages' | 'tags'): void {
      if (drawer === 'allGists') {
        this.navDrawers.allGistsVisible = !this.navDrawers.allGistsVisible
      } else if (drawer === 'starred') {
        this.navDrawers.starredVisible = !this.navDrawers.starredVisible
      } else if (drawer === 'recents') {
        this.navDrawers.recentsVisible = !this.navDrawers.recentsVisible
      } else if (drawer === 'languages') {
        this.navDrawers.languagesVisible = !this.navDrawers.languagesVisible
      } else {
        this.navDrawers.tagsVisible = !this.navDrawers.tagsVisible
      }
      settingsSync.saveSettings({
        immersiveMode: this.immersiveMode,
        navDrawers: { ...this.navDrawers }
      })
    },

    /**
     * Toggle nav drawer expanded state
     */
    toggleNavDrawerExpanded(drawer: 'languages' | 'tags'): void {
      if (drawer === 'languages') {
        this.navDrawers.languagesExpanded = !this.navDrawers.languagesExpanded
      } else {
        this.navDrawers.tagsExpanded = !this.navDrawers.tagsExpanded
      }
      settingsSync.saveSettings({
        immersiveMode: this.immersiveMode,
        navDrawers: { ...this.navDrawers }
      })
    },

    /**
     * Set gist list view mode
     */
    setGistListView(view: GistListView): void {
      this.gistListView = view
      settingsSync.saveSettings({ gistListView: view })
      console.debug(`[UI] Gist list view: ${view}`)
    },

    /**
     * Toggle gist list view between list and card
     */
    toggleGistListView(): void {
      this.gistListView = this.gistListView === 'list' ? 'card' : 'list'
      settingsSync.saveSettings({ gistListView: this.gistListView })
      console.debug(`[UI] Toggled gist list view: ${this.gistListView}`)
    },

    /**
     * Set gist sort option
     */
    setGistSort(sortBy: GistSortOption, direction?: GistSortDirection): void {
      // If same sort option clicked, toggle direction
      if (this.gistSort.sortBy === sortBy && direction === undefined) {
        this.gistSort.direction = this.gistSort.direction === 'asc' ? 'desc' : 'asc'
      } else {
        this.gistSort.sortBy = sortBy
        if (direction !== undefined) {
          this.gistSort.direction = direction
        }
      }
      settingsSync.saveSettings({ gistSort: { ...this.gistSort } })
      console.debug(`[UI] Gist sort: ${this.gistSort.sortBy} ${this.gistSort.direction}`)
    },

    /**
     * Toggle sort direction
     */
    toggleSortDirection(): void {
      this.gistSort.direction = this.gistSort.direction === 'asc' ? 'desc' : 'asc'
      settingsSync.saveSettings({ gistSort: { ...this.gistSort } })
      console.debug(`[UI] Sort direction: ${this.gistSort.direction}`)
    },

    /**
     * Set a tag's color
     */
    setTagColor(tag: string, color: string): void {
      this.tagColors[tag] = color
      settingsSync.saveSettings({ tagColors: { ...this.tagColors } })
      console.debug(`[UI] Set tag color: ${tag} -> ${color}`)
    },

    /**
     * Remove a tag's color
     */
    removeTagColor(tag: string): void {
      delete this.tagColors[tag]
      settingsSync.saveSettings({ tagColors: { ...this.tagColors } })
      console.debug(`[UI] Removed tag color: ${tag}`)
    },

    /**
     * Toggle show tag colors
     */
    toggleShowTagColors(): void {
      this.showTagColors = !this.showTagColors
      settingsSync.saveSettings({ showTagColors: this.showTagColors })
      console.debug(`[UI] Show tag colors: ${this.showTagColors}`)
    },

    toggleBulkOperations(): void {
      this.bulkOperationsEnabled = !this.bulkOperationsEnabled
      console.debug(`[UI] Bulk operations: ${this.bulkOperationsEnabled}`)
    },

    setBulkOperations(enabled: boolean): void {
      this.bulkOperationsEnabled = enabled
      console.debug(`[UI] Bulk operations: ${this.bulkOperationsEnabled}`)
    },

    toggleKeyboardFocus(): void {
      this.showKeyboardFocus = !this.showKeyboardFocus
      console.debug(`[UI] Keyboard focus: ${this.showKeyboardFocus}`)
    }
  },

  // Persist UI preferences
  persist: {
    paths: ['immersiveMode', 'expandedFiles', 'navDrawers', 'gistListView', 'gistSort', 'tagColors', 'showTagColors', 'bulkOperationsEnabled', 'showKeyboardFocus']
  }
})
