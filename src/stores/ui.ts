/**
 * UI Store
 * Manages UI state including modals, immersive mode, and file expansion
 */

import { defineStore } from 'pinia'
import { settingsSync } from 'src/services/settings-sync'
import type { UIState, ModalStates, UpdateInfo } from 'src/types/store'

export const useUIStore = defineStore('ui', {
  state: (): UIState => ({
    modals: {
      newGist: false,
      editGist: false,
      deleteGist: false,
      rawGist: false,
      about: false,
      dashboard: false,
      search: false,
      logout: false,
      pinnedTags: false,
      settings: false
    },
    rawGistContent: null,
    immersiveMode: false,
    expandedFiles: {},
    updateAvailable: false,
    updateInfo: null,
    previewLines: 5,
    navDrawers: {
      languagesVisible: true,
      languagesExpanded: true,
      tagsVisible: true,
      tagsExpanded: true
    }
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
    isFileExpanded: (state) => (fileId: string): boolean => {
      return state.expandedFiles[fileId] || false
    }
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
      settingsSync.saveSettings({ immersiveMode: this.immersiveMode, navDrawers: { ...this.navDrawers } })
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
    toggleNavDrawerVisibility(drawer: 'languages' | 'tags'): void {
      if (drawer === 'languages') {
        this.navDrawers.languagesVisible = !this.navDrawers.languagesVisible
      } else {
        this.navDrawers.tagsVisible = !this.navDrawers.tagsVisible
      }
      settingsSync.saveSettings({ immersiveMode: this.immersiveMode, navDrawers: { ...this.navDrawers } })
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
      settingsSync.saveSettings({ immersiveMode: this.immersiveMode, navDrawers: { ...this.navDrawers } })
    }
  },

  // Persist UI preferences
  persist: {
    paths: ['immersiveMode', 'expandedFiles', 'navDrawers']
  }
})
