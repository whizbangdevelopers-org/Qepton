import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useUIStore } from 'src/stores/ui'

vi.mock('src/services/settings-sync', () => ({
  settingsSync: {
    saveSettings: vi.fn()
  }
}))

describe('UI Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('Initial State', () => {
    it('should initialize with all modals closed', () => {
      const store = useUIStore()
      expect(store.modals.newGist).toBe(false)
      expect(store.modals.editGist).toBe(false)
      expect(store.modals.deleteGist).toBe(false)
      expect(store.modals.rawGist).toBe(false)
      expect(store.modals.about).toBe(false)
      expect(store.modals.search).toBe(false)
      expect(store.modals.settings).toBe(false)
    })

    it('should initialize with immersiveMode false', () => {
      const store = useUIStore()
      expect(store.immersiveMode).toBe(false)
    })

    it('should initialize with empty expandedFiles', () => {
      const store = useUIStore()
      expect(store.expandedFiles).toEqual({})
    })

    it('should initialize with default navDrawers', () => {
      const store = useUIStore()
      expect(store.navDrawers).toEqual({
        allGistsVisible: true,
        starredVisible: true,
        recentsVisible: true,
        languagesVisible: true,
        languagesExpanded: true,
        tagsVisible: true,
        tagsExpanded: true
      })
    })

    it('should initialize with empty tagColors', () => {
      const store = useUIStore()
      expect(store.tagColors).toEqual({})
    })

    it('should initialize with showTagColors true', () => {
      const store = useUIStore()
      expect(store.showTagColors).toBe(true)
    })

    it('should initialize with updateAvailable false', () => {
      const store = useUIStore()
      expect(store.updateAvailable).toBe(false)
      expect(store.updateInfo).toBeNull()
    })
  })

  describe('Getters', () => {
    it('isAnyModalOpen should return false when no modals open', () => {
      const store = useUIStore()
      expect(store.isAnyModalOpen).toBe(false)
    })

    it('isAnyModalOpen should return true when a modal is open', () => {
      const store = useUIStore()
      store.modals.about = true
      expect(store.isAnyModalOpen).toBe(true)
    })

    it('openModals should return list of open modal names', () => {
      const store = useUIStore()
      store.modals.about = true
      store.modals.search = true
      expect(store.openModals).toContain('about')
      expect(store.openModals).toContain('search')
      expect(store.openModals).toHaveLength(2)
    })

    it('isFileExpanded should check file expansion state', () => {
      const store = useUIStore()
      store.expandedFiles['file1'] = true
      expect(store.isFileExpanded('file1')).toBe(true)
      expect(store.isFileExpanded('file2')).toBe(false)
    })
  })

  describe('Modal Actions', () => {
    it('openModal should open specified modal', () => {
      const store = useUIStore()
      store.openModal('newGist')
      expect(store.modals.newGist).toBe(true)
    })

    it('openModal with rawGist should set payload', () => {
      const store = useUIStore()
      store.openModal('rawGist', 'test content')
      expect(store.modals.rawGist).toBe(true)
      expect(store.rawGistContent).toBe('test content')
    })

    it('closeModal should close specified modal', () => {
      const store = useUIStore()
      store.modals.newGist = true
      store.closeModal('newGist')
      expect(store.modals.newGist).toBe(false)
    })

    it('closeModal rawGist should clear content', () => {
      const store = useUIStore()
      store.modals.rawGist = true
      store.rawGistContent = 'test'
      store.closeModal('rawGist')
      expect(store.rawGistContent).toBeNull()
    })

    it('closeAllModals should close all modals', () => {
      const store = useUIStore()
      store.modals.newGist = true
      store.modals.about = true
      store.modals.search = true

      store.closeAllModals()

      expect(store.modals.newGist).toBe(false)
      expect(store.modals.about).toBe(false)
      expect(store.modals.search).toBe(false)
    })

    it('toggleModal should toggle modal state', () => {
      const store = useUIStore()
      store.toggleModal('about')
      expect(store.modals.about).toBe(true)
      store.toggleModal('about')
      expect(store.modals.about).toBe(false)
    })
  })

  describe('Immersive Mode Actions', () => {
    it('toggleImmersiveMode should toggle state', () => {
      const store = useUIStore()
      store.toggleImmersiveMode()
      expect(store.immersiveMode).toBe(true)
      store.toggleImmersiveMode()
      expect(store.immersiveMode).toBe(false)
    })

    it('enableImmersiveMode should enable', () => {
      const store = useUIStore()
      store.enableImmersiveMode()
      expect(store.immersiveMode).toBe(true)
    })

    it('disableImmersiveMode should disable', () => {
      const store = useUIStore()
      store.immersiveMode = true
      store.disableImmersiveMode()
      expect(store.immersiveMode).toBe(false)
    })

    it('immersive mode changes should sync settings', async () => {
      const store = useUIStore()
      const { settingsSync } = await import('src/services/settings-sync')
      store.toggleImmersiveMode()
      expect(settingsSync.saveSettings).toHaveBeenCalled()
    })
  })

  describe('File Expansion Actions', () => {
    it('toggleFileExpansion should toggle file state', () => {
      const store = useUIStore()
      store.toggleFileExpansion('file1')
      expect(store.expandedFiles['file1']).toBe(true)
      store.toggleFileExpansion('file1')
      expect(store.expandedFiles['file1']).toBe(false)
    })

    it('expandFile should expand specific file', () => {
      const store = useUIStore()
      store.expandFile('file1')
      expect(store.expandedFiles['file1']).toBe(true)
    })

    it('collapseFile should collapse specific file', () => {
      const store = useUIStore()
      store.expandedFiles['file1'] = true
      store.collapseFile('file1')
      expect(store.expandedFiles['file1']).toBe(false)
    })

    it('expandAllFiles should expand multiple files', () => {
      const store = useUIStore()
      store.expandAllFiles(['file1', 'file2', 'file3'])
      expect(store.expandedFiles['file1']).toBe(true)
      expect(store.expandedFiles['file2']).toBe(true)
      expect(store.expandedFiles['file3']).toBe(true)
    })

    it('collapseAllFiles should collapse multiple files', () => {
      const store = useUIStore()
      store.expandedFiles = { file1: true, file2: true, file3: true }
      store.collapseAllFiles(['file1', 'file2'])
      expect(store.expandedFiles['file1']).toBe(false)
      expect(store.expandedFiles['file2']).toBe(false)
      expect(store.expandedFiles['file3']).toBe(true)
    })
  })

  describe('Update Actions', () => {
    it('setUpdateAvailable should set update info', () => {
      const store = useUIStore()
      const updateInfo = { version: '2.0.0', releaseNotes: 'New features' }
      store.setUpdateAvailable(updateInfo)
      expect(store.updateAvailable).toBe(true)
      expect(store.updateInfo).toEqual(updateInfo)
    })

    it('dismissUpdate should clear update state', () => {
      const store = useUIStore()
      store.updateAvailable = true
      store.updateInfo = { version: '2.0.0' }
      store.dismissUpdate()
      expect(store.updateAvailable).toBe(false)
      expect(store.updateInfo).toBeNull()
    })
  })

  describe('Nav Drawer Actions', () => {
    it('toggleNavDrawerVisibility should toggle languages visibility', () => {
      const store = useUIStore()
      store.toggleNavDrawerVisibility('languages')
      expect(store.navDrawers.languagesVisible).toBe(false)
    })

    it('toggleNavDrawerVisibility should toggle tags visibility', () => {
      const store = useUIStore()
      store.toggleNavDrawerVisibility('tags')
      expect(store.navDrawers.tagsVisible).toBe(false)
    })

    it('toggleNavDrawerVisibility should toggle allGists visibility', () => {
      const store = useUIStore()
      store.toggleNavDrawerVisibility('allGists')
      expect(store.navDrawers.allGistsVisible).toBe(false)
    })

    it('toggleNavDrawerVisibility should toggle starred visibility', () => {
      const store = useUIStore()
      store.toggleNavDrawerVisibility('starred')
      expect(store.navDrawers.starredVisible).toBe(false)
    })

    it('toggleNavDrawerVisibility should toggle recents visibility', () => {
      const store = useUIStore()
      store.toggleNavDrawerVisibility('recents')
      expect(store.navDrawers.recentsVisible).toBe(false)
    })

    it('toggleNavDrawerExpanded should toggle languages expanded', () => {
      const store = useUIStore()
      store.toggleNavDrawerExpanded('languages')
      expect(store.navDrawers.languagesExpanded).toBe(false)
    })

    it('toggleNavDrawerExpanded should toggle tags expanded', () => {
      const store = useUIStore()
      store.toggleNavDrawerExpanded('tags')
      expect(store.navDrawers.tagsExpanded).toBe(false)
    })
  })

  describe('Tag Color Actions', () => {
    it('setTagColor should set color for a tag', () => {
      const store = useUIStore()
      store.setTagColor('javascript', '#f59e0b')
      expect(store.tagColors['javascript']).toBe('#f59e0b')
    })

    it('setTagColor should overwrite existing color', () => {
      const store = useUIStore()
      store.setTagColor('javascript', '#f59e0b')
      store.setTagColor('javascript', '#3b82f6')
      expect(store.tagColors['javascript']).toBe('#3b82f6')
    })

    it('removeTagColor should remove color for a tag', () => {
      const store = useUIStore()
      store.tagColors['javascript'] = '#f59e0b'
      store.removeTagColor('javascript')
      expect(store.tagColors['javascript']).toBeUndefined()
    })

    it('removeTagColor should not error for non-existent tag', () => {
      const store = useUIStore()
      expect(() => store.removeTagColor('nonexistent')).not.toThrow()
    })

    it('toggleShowTagColors should toggle showTagColors', () => {
      const store = useUIStore()
      expect(store.showTagColors).toBe(true)
      store.toggleShowTagColors()
      expect(store.showTagColors).toBe(false)
      store.toggleShowTagColors()
      expect(store.showTagColors).toBe(true)
    })

    it('tag color changes should sync settings', async () => {
      const store = useUIStore()
      const { settingsSync } = await import('src/services/settings-sync')
      store.setTagColor('test', '#ff0000')
      expect(settingsSync.saveSettings).toHaveBeenCalled()
    })
  })

  describe('Reset Action', () => {
    it('reset should clear all UI state', () => {
      const store = useUIStore()
      store.modals.about = true
      store.immersiveMode = true
      store.expandedFiles = { file1: true }
      store.updateAvailable = true
      store.updateInfo = { version: '2.0.0' }

      store.reset()

      expect(store.modals.about).toBe(false)
      expect(store.immersiveMode).toBe(false)
      expect(store.expandedFiles).toEqual({})
      expect(store.updateAvailable).toBe(false)
      expect(store.updateInfo).toBeNull()
    })
  })

  describe('Keyboard Focus Setting', () => {
    it('should initialize with showKeyboardFocus false', () => {
      const store = useUIStore()
      expect(store.showKeyboardFocus).toBe(false)
    })

    it('toggleKeyboardFocus should toggle showKeyboardFocus', () => {
      const store = useUIStore()
      expect(store.showKeyboardFocus).toBe(false)
      store.toggleKeyboardFocus()
      expect(store.showKeyboardFocus).toBe(true)
      store.toggleKeyboardFocus()
      expect(store.showKeyboardFocus).toBe(false)
    })
  })

  describe('Clone Gist Modal', () => {
    it('should initialize with cloneGist modal closed', () => {
      const store = useUIStore()
      expect(store.modals.cloneGist).toBe(false)
    })

    it('openModal should open cloneGist modal', () => {
      const store = useUIStore()
      store.openModal('cloneGist')
      expect(store.modals.cloneGist).toBe(true)
    })

    it('closeModal should close cloneGist modal', () => {
      const store = useUIStore()
      store.modals.cloneGist = true
      store.closeModal('cloneGist')
      expect(store.modals.cloneGist).toBe(false)
    })
  })

  describe('Help Modal', () => {
    it('should initialize with help modal closed', () => {
      const store = useUIStore()
      expect(store.modals.help).toBe(false)
    })

    it('openModal should open help modal', () => {
      const store = useUIStore()
      store.openModal('help')
      expect(store.modals.help).toBe(true)
    })

    it('closeModal should close help modal', () => {
      const store = useUIStore()
      store.modals.help = true
      store.closeModal('help')
      expect(store.modals.help).toBe(false)
    })
  })
})
