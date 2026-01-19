/**
 * Keyboard Navigation Composable
 *
 * Provides keyboard navigation for the gist list and file preview panels.
 * Handles conflict resolution with CodeMirror editors and form inputs.
 *
 * Supported shortcuts:
 * - Arrow Up/Down: Navigate gist list or file list
 * - Enter: Select/expand focused item
 * - Home/End: Jump to first/last item
 * - Tab: Switch focus between panes (gist list <-> preview)
 * - Cmd/Ctrl+C: Copy focused file content
 * - Escape: Clear focus / close expanded items
 *
 * Conflict Resolution:
 * - Shortcuts are disabled when focus is inside CodeMirror editors
 * - Shortcuts are disabled when focus is inside form inputs (input, textarea, select)
 * - Electron, PWA, and Capacitor modes are all supported
 */

import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useUIStore } from 'src/stores/ui'
import { useGistsStore } from 'src/stores/gists'
import type { Gist } from 'src/types/github'

export type FocusPane = 'gistList' | 'preview' | 'none'

interface KeyboardNavigationOptions {
  /** Callback when a gist should be selected */
  onSelectGist?: (gistId: string) => void
  /** Callback when file content should be copied */
  onCopyFile?: (content: string | undefined) => void
  /** Callback when a file should be expanded/collapsed */
  onToggleFile?: (filename: string) => void
  /** List of gists to navigate (usually filteredGists) */
  gists: () => Gist[]
  /** List of files in active gist */
  files: () => string[]
  /** Map of expanded file states */
  expandedFiles: () => Record<string, boolean>
}

export function useKeyboardNavigation(options: KeyboardNavigationOptions) {
  const uiStore = useUIStore()
  const gistsStore = useGistsStore()

  // Focus state
  const focusedPane = ref<FocusPane>('none')
  const focusedGistIndex = ref(-1)
  const focusedFileIndex = ref(-1)

  // Computed helpers
  const gistCount = computed(() => options.gists().length)
  const fileCount = computed(() => options.files().length)

  const focusedGist = computed(() => {
    const gists = options.gists()
    if (focusedGistIndex.value >= 0 && focusedGistIndex.value < gists.length) {
      return gists[focusedGistIndex.value]
    }
    return null
  })

  const focusedFile = computed(() => {
    const files = options.files()
    if (focusedFileIndex.value >= 0 && focusedFileIndex.value < files.length) {
      return files[focusedFileIndex.value]
    }
    return null
  })

  /**
   * Check if keyboard navigation should be blocked
   * Returns true if focus is in an interactive element that needs keyboard input
   */
  function shouldBlockNavigation(): boolean {
    const activeElement = document.activeElement

    if (!activeElement) return false

    // Block if inside a CodeMirror editor
    if (activeElement.closest('.cm-editor')) {
      return true
    }

    // Block if inside form inputs
    const tagName = activeElement.tagName.toLowerCase()
    if (['input', 'textarea', 'select'].includes(tagName)) {
      return true
    }

    // Block if element is contenteditable
    if (activeElement.getAttribute('contenteditable') === 'true') {
      return true
    }

    // Block if a Quasar dialog/modal has focus (check for q-dialog class)
    if (activeElement.closest('.q-dialog')) {
      // Allow navigation only if not in an input inside the dialog
      const dialogInputs = activeElement.closest('.q-dialog')?.querySelectorAll('input, textarea, select')
      if (dialogInputs && dialogInputs.length > 0) {
        for (const input of dialogInputs) {
          if (document.activeElement === input) {
            return true
          }
        }
      }
    }

    return false
  }

  /**
   * Check if any modal is open
   */
  function isModalOpen(): boolean {
    return uiStore.isAnyModalOpen
  }

  /**
   * Set focus to the gist list pane
   */
  function focusGistList() {
    focusedPane.value = 'gistList'
    focusedFileIndex.value = -1
    if (focusedGistIndex.value < 0 && gistCount.value > 0) {
      // Find currently active gist index or default to 0
      const activeIndex = options.gists().findIndex(g => g.id === gistsStore.activeGistId)
      focusedGistIndex.value = activeIndex >= 0 ? activeIndex : 0
    }
  }

  /**
   * Set focus to the preview pane
   */
  function focusPreviewPane() {
    focusedPane.value = 'preview'
    focusedGistIndex.value = -1
    if (focusedFileIndex.value < 0 && fileCount.value > 0) {
      focusedFileIndex.value = 0
    }
  }

  /**
   * Clear all focus
   */
  function clearFocus() {
    focusedPane.value = 'none'
    focusedGistIndex.value = -1
    focusedFileIndex.value = -1
  }

  /**
   * Navigate up in the current list
   */
  function navigateUp() {
    if (focusedPane.value === 'gistList') {
      if (focusedGistIndex.value > 0) {
        focusedGistIndex.value--
      } else if (gistCount.value > 0) {
        // Wrap to end
        focusedGistIndex.value = gistCount.value - 1
      }
    } else if (focusedPane.value === 'preview') {
      if (focusedFileIndex.value > 0) {
        focusedFileIndex.value--
      } else if (fileCount.value > 0) {
        // Wrap to end
        focusedFileIndex.value = fileCount.value - 1
      }
    }
  }

  /**
   * Navigate down in the current list
   */
  function navigateDown() {
    if (focusedPane.value === 'gistList') {
      if (focusedGistIndex.value < gistCount.value - 1) {
        focusedGistIndex.value++
      } else if (gistCount.value > 0) {
        // Wrap to start
        focusedGistIndex.value = 0
      }
    } else if (focusedPane.value === 'preview') {
      if (focusedFileIndex.value < fileCount.value - 1) {
        focusedFileIndex.value++
      } else if (fileCount.value > 0) {
        // Wrap to start
        focusedFileIndex.value = 0
      }
    }
  }

  /**
   * Jump to first item
   */
  function navigateToStart() {
    if (focusedPane.value === 'gistList' && gistCount.value > 0) {
      focusedGistIndex.value = 0
    } else if (focusedPane.value === 'preview' && fileCount.value > 0) {
      focusedFileIndex.value = 0
    }
  }

  /**
   * Jump to last item
   */
  function navigateToEnd() {
    if (focusedPane.value === 'gistList' && gistCount.value > 0) {
      focusedGistIndex.value = gistCount.value - 1
    } else if (focusedPane.value === 'preview' && fileCount.value > 0) {
      focusedFileIndex.value = fileCount.value - 1
    }
  }

  /**
   * Select/activate the focused item
   */
  function selectFocusedItem() {
    if (focusedPane.value === 'gistList' && focusedGist.value) {
      options.onSelectGist?.(focusedGist.value.id)
    } else if (focusedPane.value === 'preview' && focusedFile.value) {
      options.onToggleFile?.(focusedFile.value)
    }
  }

  /**
   * Switch focus between panes
   */
  function togglePane() {
    if (focusedPane.value === 'gistList') {
      focusPreviewPane()
    } else if (focusedPane.value === 'preview') {
      focusGistList()
    } else {
      // No focus yet, start with gist list
      focusGistList()
    }
  }

  /**
   * Copy the focused file content
   */
  function copyFocusedFile() {
    if (focusedPane.value !== 'preview' || !focusedFile.value) return

    const activeGist = gistsStore.activeGist
    if (!activeGist) return

    const file = activeGist.files[focusedFile.value]
    if (file) {
      options.onCopyFile?.(file.content)
    }
  }

  /**
   * Main keyboard event handler
   */
  function handleKeyDown(event: KeyboardEvent) {
    // Skip if navigation should be blocked
    if (shouldBlockNavigation()) return

    // Skip if any modal is open (let modal handle its own keys)
    if (isModalOpen()) return

    const isMac = navigator.userAgent.toUpperCase().indexOf('MAC') >= 0
    const cmdOrCtrl = isMac ? event.metaKey : event.ctrlKey

    switch (event.key) {
      case 'ArrowUp':
        if (focusedPane.value !== 'none') {
          event.preventDefault()
          navigateUp()
        }
        break

      case 'ArrowDown':
        if (focusedPane.value !== 'none') {
          event.preventDefault()
          navigateDown()
        }
        break

      case 'Enter':
        if (focusedPane.value !== 'none') {
          event.preventDefault()
          selectFocusedItem()
        }
        break

      case 'Home':
        if (focusedPane.value !== 'none') {
          event.preventDefault()
          navigateToStart()
        }
        break

      case 'End':
        if (focusedPane.value !== 'none') {
          event.preventDefault()
          navigateToEnd()
        }
        break

      case 'Tab':
        // Only handle Tab for pane switching when we have focus
        if (focusedPane.value !== 'none' && !event.shiftKey && !cmdOrCtrl) {
          event.preventDefault()
          togglePane()
        }
        break

      case 'c':
        // Cmd/Ctrl+C: Copy focused file (only when not in an input)
        if (cmdOrCtrl && focusedPane.value === 'preview' && focusedFile.value) {
          // Don't prevent default - allow native copy if text is selected
          // Only copy file if no text selection
          const selection = window.getSelection()
          if (!selection || selection.toString().length === 0) {
            event.preventDefault()
            copyFocusedFile()
          }
        }
        break

      case 'j':
        // j: Navigate down (vim-style, without modifier)
        if (!cmdOrCtrl && !event.shiftKey && !event.altKey) {
          if (focusedPane.value !== 'none') {
            event.preventDefault()
            navigateDown()
          }
        }
        break

      case 'k':
        // k: Navigate up (vim-style, without modifier)
        // Note: Cmd+K is handled by IndexPage for search focus
        if (!cmdOrCtrl && !event.shiftKey && !event.altKey) {
          if (focusedPane.value !== 'none') {
            event.preventDefault()
            navigateUp()
          }
        }
        break

      case 'g':
        // g: Go to first item (vim-style)
        if (!cmdOrCtrl && !event.shiftKey && !event.altKey) {
          if (focusedPane.value !== 'none') {
            event.preventDefault()
            navigateToStart()
          }
        }
        break

      case 'G':
        // G (Shift+g): Go to last item (vim-style)
        if (!cmdOrCtrl && event.shiftKey && !event.altKey) {
          if (focusedPane.value !== 'none') {
            event.preventDefault()
            navigateToEnd()
          }
        }
        break

      case 'Escape':
        if (focusedPane.value !== 'none') {
          event.preventDefault()
          clearFocus()
        }
        break
    }
  }

  // Reset focus indices when gist list changes
  watch(
    () => options.gists().length,
    (newLength) => {
      if (focusedGistIndex.value >= newLength) {
        focusedGistIndex.value = Math.max(0, newLength - 1)
      }
    }
  )

  // Reset file focus when active gist changes
  watch(
    () => gistsStore.activeGistId,
    () => {
      if (focusedPane.value === 'preview') {
        focusedFileIndex.value = 0
      }
    }
  )

  // Lifecycle
  onMounted(() => {
    window.addEventListener('keydown', handleKeyDown)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown)
  })

  return {
    // State
    focusedPane,
    focusedGistIndex,
    focusedFileIndex,
    focusedGist,
    focusedFile,

    // Actions
    focusGistList,
    focusPreviewPane,
    clearFocus,
    navigateUp,
    navigateDown,
    navigateToStart,
    navigateToEnd,
    selectFocusedItem,
    togglePane,

    // Helpers
    shouldBlockNavigation,
    isModalOpen
  }
}
