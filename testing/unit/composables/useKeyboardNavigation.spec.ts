import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import { useKeyboardNavigation } from 'src/composables/useKeyboardNavigation'
import { useGistsStore } from 'src/stores/gists'
import { useUIStore } from 'src/stores/ui'
import type { Gist } from 'src/types/github'

// Mock gists for testing
const mockGists: Gist[] = [
  {
    id: 'gist1',
    description: 'First Gist',
    public: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    files: {
      'file1.js': { filename: 'file1.js', type: 'application/javascript', language: 'JavaScript', raw_url: '', size: 100 },
      'file2.ts': { filename: 'file2.ts', type: 'application/typescript', language: 'TypeScript', raw_url: '', size: 200 }
    },
    owner: { login: 'testuser', id: 1, avatar_url: '', url: '', html_url: '' },
    url: '',
    html_url: '',
    comments: 0,
    truncated: false
  },
  {
    id: 'gist2',
    description: 'Second Gist',
    public: false,
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
    files: {
      'readme.md': { filename: 'readme.md', type: 'text/markdown', language: 'Markdown', raw_url: '', size: 50 }
    },
    owner: { login: 'testuser', id: 1, avatar_url: '', url: '', html_url: '' },
    url: '',
    html_url: '',
    comments: 0,
    truncated: false
  },
  {
    id: 'gist3',
    description: 'Third Gist',
    public: true,
    created_at: '2024-01-03T00:00:00Z',
    updated_at: '2024-01-03T00:00:00Z',
    files: {
      'script.py': { filename: 'script.py', type: 'text/x-python', language: 'Python', raw_url: '', size: 300 }
    },
    owner: { login: 'testuser', id: 1, avatar_url: '', url: '', html_url: '' },
    url: '',
    html_url: '',
    comments: 0,
    truncated: false
  }
]

describe('useKeyboardNavigation', () => {
  let gistsStore: ReturnType<typeof useGistsStore>
  let uiStore: ReturnType<typeof useUIStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    gistsStore = useGistsStore()
    uiStore = useUIStore()

    // Mock document.activeElement
    Object.defineProperty(document, 'activeElement', {
      value: document.body,
      writable: true,
      configurable: true
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // Helper to create a test component that uses the composable
  function createTestComponent(options?: Partial<Parameters<typeof useKeyboardNavigation>[0]>) {
    const defaultOptions = {
      gists: () => mockGists,
      files: () => ['file1.js', 'file2.ts'],
      expandedFiles: () => ({}),
      onSelectGist: vi.fn(),
      onCopyFile: vi.fn(),
      onToggleFile: vi.fn()
    }

    const mergedOptions = { ...defaultOptions, ...options }

    const TestComponent = defineComponent({
      setup() {
        const nav = useKeyboardNavigation(mergedOptions)
        return { nav, options: mergedOptions }
      },
      render() {
        return h('div', { class: 'test-component' })
      }
    })

    // Use the same pinia instance that was created in beforeEach
    const pinia = createPinia()
    setActivePinia(pinia)
    // Re-initialize stores with new pinia
    gistsStore = useGistsStore()
    uiStore = useUIStore()

    return mount(TestComponent, {
      global: {
        plugins: [pinia]
      }
    })
  }

  function simulateKeyDown(key: string, modifiers: Partial<KeyboardEvent> = {}) {
    const event = new KeyboardEvent('keydown', {
      key,
      code: key === ' ' ? 'Space' : `Key${key.toUpperCase()}`,
      bubbles: true,
      ...modifiers
    })
    window.dispatchEvent(event)
    return event
  }

  describe('initial state', () => {
    it('should start with no focus', () => {
      const wrapper = createTestComponent()
      const nav = wrapper.vm.nav

      expect(nav.focusedPane.value).toBe('none')
      expect(nav.focusedGistIndex.value).toBe(-1)
      expect(nav.focusedFileIndex.value).toBe(-1)

      wrapper.unmount()
    })
  })

  describe('focus management', () => {
    it('should focus gist list and set initial index', () => {
      const wrapper = createTestComponent()
      const nav = wrapper.vm.nav

      nav.focusGistList()

      expect(nav.focusedPane.value).toBe('gistList')
      expect(nav.focusedGistIndex.value).toBe(0)
      expect(nav.focusedFileIndex.value).toBe(-1)

      wrapper.unmount()
    })

    it('should focus preview pane and set initial file index', () => {
      const wrapper = createTestComponent()
      const nav = wrapper.vm.nav

      nav.focusPreviewPane()

      expect(nav.focusedPane.value).toBe('preview')
      expect(nav.focusedFileIndex.value).toBe(0)
      expect(nav.focusedGistIndex.value).toBe(-1)

      wrapper.unmount()
    })

    it('should clear focus', () => {
      const wrapper = createTestComponent()
      const nav = wrapper.vm.nav

      nav.focusGistList()
      nav.clearFocus()

      expect(nav.focusedPane.value).toBe('none')
      expect(nav.focusedGistIndex.value).toBe(-1)
      expect(nav.focusedFileIndex.value).toBe(-1)

      wrapper.unmount()
    })

    it('should toggle between panes', () => {
      const wrapper = createTestComponent()
      const nav = wrapper.vm.nav

      nav.togglePane()
      expect(nav.focusedPane.value).toBe('gistList')

      nav.togglePane()
      expect(nav.focusedPane.value).toBe('preview')

      nav.togglePane()
      expect(nav.focusedPane.value).toBe('gistList')

      wrapper.unmount()
    })

    it('should find active gist index when focusing gist list', () => {
      const wrapper = createTestComponent()
      // Set active gist after component is created (so it uses the same store)
      gistsStore.activeGistId = 'gist2'
      const nav = wrapper.vm.nav

      nav.focusGistList()

      expect(nav.focusedGistIndex.value).toBe(1)

      wrapper.unmount()
    })
  })

  describe('navigation - gist list', () => {
    it('should navigate down in gist list', () => {
      const wrapper = createTestComponent()
      const nav = wrapper.vm.nav

      nav.focusGistList()
      expect(nav.focusedGistIndex.value).toBe(0)

      nav.navigateDown()
      expect(nav.focusedGistIndex.value).toBe(1)

      nav.navigateDown()
      expect(nav.focusedGistIndex.value).toBe(2)

      wrapper.unmount()
    })

    it('should wrap to start when navigating down past end', () => {
      const wrapper = createTestComponent()
      const nav = wrapper.vm.nav

      nav.focusGistList()
      nav.focusedGistIndex.value = 2

      nav.navigateDown()
      expect(nav.focusedGistIndex.value).toBe(0)

      wrapper.unmount()
    })

    it('should navigate up in gist list', () => {
      const wrapper = createTestComponent()
      const nav = wrapper.vm.nav

      nav.focusGistList()
      nav.focusedGistIndex.value = 2

      nav.navigateUp()
      expect(nav.focusedGistIndex.value).toBe(1)

      nav.navigateUp()
      expect(nav.focusedGistIndex.value).toBe(0)

      wrapper.unmount()
    })

    it('should wrap to end when navigating up past start', () => {
      const wrapper = createTestComponent()
      const nav = wrapper.vm.nav

      nav.focusGistList()
      nav.focusedGistIndex.value = 0

      nav.navigateUp()
      expect(nav.focusedGistIndex.value).toBe(2)

      wrapper.unmount()
    })

    it('should navigate to start', () => {
      const wrapper = createTestComponent()
      const nav = wrapper.vm.nav

      nav.focusGistList()
      nav.focusedGistIndex.value = 2

      nav.navigateToStart()
      expect(nav.focusedGistIndex.value).toBe(0)

      wrapper.unmount()
    })

    it('should navigate to end', () => {
      const wrapper = createTestComponent()
      const nav = wrapper.vm.nav

      nav.focusGistList()

      nav.navigateToEnd()
      expect(nav.focusedGistIndex.value).toBe(2)

      wrapper.unmount()
    })
  })

  describe('navigation - preview pane', () => {
    it('should navigate down in file list', () => {
      const wrapper = createTestComponent()
      const nav = wrapper.vm.nav

      nav.focusPreviewPane()
      expect(nav.focusedFileIndex.value).toBe(0)

      nav.navigateDown()
      expect(nav.focusedFileIndex.value).toBe(1)

      wrapper.unmount()
    })

    it('should wrap to start when navigating down past end in file list', () => {
      const wrapper = createTestComponent()
      const nav = wrapper.vm.nav

      nav.focusPreviewPane()
      nav.focusedFileIndex.value = 1

      nav.navigateDown()
      expect(nav.focusedFileIndex.value).toBe(0)

      wrapper.unmount()
    })

    it('should navigate up in file list', () => {
      const wrapper = createTestComponent()
      const nav = wrapper.vm.nav

      nav.focusPreviewPane()
      nav.focusedFileIndex.value = 1

      nav.navigateUp()
      expect(nav.focusedFileIndex.value).toBe(0)

      wrapper.unmount()
    })

    it('should wrap to end when navigating up past start in file list', () => {
      const wrapper = createTestComponent()
      const nav = wrapper.vm.nav

      nav.focusPreviewPane()
      nav.focusedFileIndex.value = 0

      nav.navigateUp()
      expect(nav.focusedFileIndex.value).toBe(1)

      wrapper.unmount()
    })
  })

  describe('selection', () => {
    it('should call onSelectGist when selecting focused gist', () => {
      const onSelectGist = vi.fn()
      const wrapper = createTestComponent({ onSelectGist })
      const nav = wrapper.vm.nav

      nav.focusGistList()
      nav.focusedGistIndex.value = 1

      nav.selectFocusedItem()

      expect(onSelectGist).toHaveBeenCalledWith('gist2')

      wrapper.unmount()
    })

    it('should call onToggleFile when selecting focused file', () => {
      const onToggleFile = vi.fn()
      const wrapper = createTestComponent({ onToggleFile })
      const nav = wrapper.vm.nav

      nav.focusPreviewPane()
      nav.focusedFileIndex.value = 1

      nav.selectFocusedItem()

      expect(onToggleFile).toHaveBeenCalledWith('file2.ts')

      wrapper.unmount()
    })
  })

  describe('computed properties', () => {
    it('should return focused gist', () => {
      const wrapper = createTestComponent()
      const nav = wrapper.vm.nav

      nav.focusGistList()
      nav.focusedGistIndex.value = 1

      expect(nav.focusedGist.value).toEqual(mockGists[1])

      wrapper.unmount()
    })

    it('should return null when no gist is focused', () => {
      const wrapper = createTestComponent()
      const nav = wrapper.vm.nav

      expect(nav.focusedGist.value).toBeNull()

      wrapper.unmount()
    })

    it('should return focused file', () => {
      const wrapper = createTestComponent()
      const nav = wrapper.vm.nav

      nav.focusPreviewPane()
      nav.focusedFileIndex.value = 1

      expect(nav.focusedFile.value).toBe('file2.ts')

      wrapper.unmount()
    })

    it('should return null when no file is focused', () => {
      const wrapper = createTestComponent()
      const nav = wrapper.vm.nav

      expect(nav.focusedFile.value).toBeNull()

      wrapper.unmount()
    })
  })

  describe('keyboard event handling', () => {
    it('should navigate down with ArrowDown key', async () => {
      const wrapper = createTestComponent()
      const nav = wrapper.vm.nav

      nav.focusGistList()
      await nextTick()

      simulateKeyDown('ArrowDown')
      await nextTick()

      expect(nav.focusedGistIndex.value).toBe(1)

      wrapper.unmount()
    })

    it('should navigate up with ArrowUp key', async () => {
      const wrapper = createTestComponent()
      const nav = wrapper.vm.nav

      nav.focusGistList()
      nav.focusedGistIndex.value = 2
      await nextTick()

      simulateKeyDown('ArrowUp')
      await nextTick()

      expect(nav.focusedGistIndex.value).toBe(1)

      wrapper.unmount()
    })

    it('should navigate down with j key (vim-style)', async () => {
      const wrapper = createTestComponent()
      const nav = wrapper.vm.nav

      nav.focusGistList()
      await nextTick()

      simulateKeyDown('j')
      await nextTick()

      expect(nav.focusedGistIndex.value).toBe(1)

      wrapper.unmount()
    })

    it('should navigate up with k key (vim-style)', async () => {
      const wrapper = createTestComponent()
      const nav = wrapper.vm.nav

      nav.focusGistList()
      nav.focusedGistIndex.value = 2
      await nextTick()

      simulateKeyDown('k')
      await nextTick()

      expect(nav.focusedGistIndex.value).toBe(1)

      wrapper.unmount()
    })

    it('should select item with Enter key', async () => {
      const onSelectGist = vi.fn()
      const wrapper = createTestComponent({ onSelectGist })
      const nav = wrapper.vm.nav

      nav.focusGistList()
      await nextTick()

      simulateKeyDown('Enter')
      await nextTick()

      expect(onSelectGist).toHaveBeenCalledWith('gist1')

      wrapper.unmount()
    })

    it('should jump to start with Home key', async () => {
      const wrapper = createTestComponent()
      const nav = wrapper.vm.nav

      nav.focusGistList()
      nav.focusedGistIndex.value = 2
      await nextTick()

      simulateKeyDown('Home')
      await nextTick()

      expect(nav.focusedGistIndex.value).toBe(0)

      wrapper.unmount()
    })

    it('should jump to end with End key', async () => {
      const wrapper = createTestComponent()
      const nav = wrapper.vm.nav

      nav.focusGistList()
      await nextTick()

      simulateKeyDown('End')
      await nextTick()

      expect(nav.focusedGistIndex.value).toBe(2)

      wrapper.unmount()
    })

    it('should jump to start with g key (vim-style)', async () => {
      const wrapper = createTestComponent()
      const nav = wrapper.vm.nav

      nav.focusGistList()
      nav.focusedGistIndex.value = 2
      await nextTick()

      simulateKeyDown('g')
      await nextTick()

      expect(nav.focusedGistIndex.value).toBe(0)

      wrapper.unmount()
    })

    it('should jump to end with G key (vim-style)', async () => {
      const wrapper = createTestComponent()
      const nav = wrapper.vm.nav

      nav.focusGistList()
      await nextTick()

      simulateKeyDown('G', { shiftKey: true })
      await nextTick()

      expect(nav.focusedGistIndex.value).toBe(2)

      wrapper.unmount()
    })

    it('should toggle pane with Tab key', async () => {
      const wrapper = createTestComponent()
      const nav = wrapper.vm.nav

      nav.focusGistList()
      await nextTick()

      simulateKeyDown('Tab')
      await nextTick()

      expect(nav.focusedPane.value).toBe('preview')

      wrapper.unmount()
    })

    it('should clear focus with Escape key', async () => {
      const wrapper = createTestComponent()
      const nav = wrapper.vm.nav

      nav.focusGistList()
      await nextTick()

      simulateKeyDown('Escape')
      await nextTick()

      expect(nav.focusedPane.value).toBe('none')

      wrapper.unmount()
    })

    it('should not handle keys when focus is none', async () => {
      const wrapper = createTestComponent()
      const nav = wrapper.vm.nav

      await nextTick()

      simulateKeyDown('ArrowDown')
      await nextTick()

      expect(nav.focusedGistIndex.value).toBe(-1)

      wrapper.unmount()
    })
  })

  describe('conflict resolution', () => {
    it('should block navigation when inside CodeMirror editor', async () => {
      const wrapper = createTestComponent()
      const nav = wrapper.vm.nav

      nav.focusGistList()
      await nextTick()

      // Mock activeElement inside CodeMirror
      const cmEditor = document.createElement('div')
      cmEditor.className = 'cm-editor'
      const cmContent = document.createElement('div')
      cmEditor.appendChild(cmContent)
      document.body.appendChild(cmEditor)
      Object.defineProperty(document, 'activeElement', {
        value: cmContent,
        writable: true,
        configurable: true
      })

      simulateKeyDown('ArrowDown')
      await nextTick()

      // Should not have navigated
      expect(nav.focusedGistIndex.value).toBe(0)

      document.body.removeChild(cmEditor)
      wrapper.unmount()
    })

    it('should block navigation when inside input element', async () => {
      const wrapper = createTestComponent()
      const nav = wrapper.vm.nav

      nav.focusGistList()
      await nextTick()

      // Mock activeElement as input
      const input = document.createElement('input')
      Object.defineProperty(document, 'activeElement', {
        value: input,
        writable: true,
        configurable: true
      })

      simulateKeyDown('ArrowDown')
      await nextTick()

      // Should not have navigated
      expect(nav.focusedGistIndex.value).toBe(0)

      wrapper.unmount()
    })

    it('should block navigation when inside textarea element', async () => {
      const wrapper = createTestComponent()
      const nav = wrapper.vm.nav

      nav.focusGistList()
      await nextTick()

      // Mock activeElement as textarea
      const textarea = document.createElement('textarea')
      Object.defineProperty(document, 'activeElement', {
        value: textarea,
        writable: true,
        configurable: true
      })

      simulateKeyDown('ArrowDown')
      await nextTick()

      // Should not have navigated
      expect(nav.focusedGistIndex.value).toBe(0)

      wrapper.unmount()
    })

    it('should block navigation when inside contenteditable element', async () => {
      const wrapper = createTestComponent()
      const nav = wrapper.vm.nav

      nav.focusGistList()
      await nextTick()

      // Mock activeElement as contenteditable
      const div = document.createElement('div')
      div.setAttribute('contenteditable', 'true')
      Object.defineProperty(document, 'activeElement', {
        value: div,
        writable: true,
        configurable: true
      })

      simulateKeyDown('ArrowDown')
      await nextTick()

      // Should not have navigated
      expect(nav.focusedGistIndex.value).toBe(0)

      wrapper.unmount()
    })

    it('should block navigation when modal is open', async () => {
      const wrapper = createTestComponent()
      const nav = wrapper.vm.nav

      nav.focusGistList()
      await nextTick()

      // Open a modal
      uiStore.openModal('search')

      simulateKeyDown('ArrowDown')
      await nextTick()

      // Should not have navigated
      expect(nav.focusedGistIndex.value).toBe(0)

      wrapper.unmount()
    })

    it('should allow navigation when activeElement is body', async () => {
      const wrapper = createTestComponent()
      const nav = wrapper.vm.nav

      nav.focusGistList()
      await nextTick()

      Object.defineProperty(document, 'activeElement', {
        value: document.body,
        writable: true,
        configurable: true
      })

      simulateKeyDown('ArrowDown')
      await nextTick()

      expect(nav.focusedGistIndex.value).toBe(1)

      wrapper.unmount()
    })
  })

  describe('helper methods', () => {
    it('shouldBlockNavigation returns false for body', () => {
      const wrapper = createTestComponent()
      const nav = wrapper.vm.nav

      Object.defineProperty(document, 'activeElement', {
        value: document.body,
        writable: true,
        configurable: true
      })

      expect(nav.shouldBlockNavigation()).toBe(false)

      wrapper.unmount()
    })

    it('shouldBlockNavigation returns true for input', () => {
      const wrapper = createTestComponent()
      const nav = wrapper.vm.nav

      const input = document.createElement('input')
      Object.defineProperty(document, 'activeElement', {
        value: input,
        writable: true,
        configurable: true
      })

      expect(nav.shouldBlockNavigation()).toBe(true)

      wrapper.unmount()
    })

    it('isModalOpen returns correct state', () => {
      const wrapper = createTestComponent()
      const nav = wrapper.vm.nav

      expect(nav.isModalOpen()).toBe(false)

      uiStore.openModal('newGist')
      expect(nav.isModalOpen()).toBe(true)

      uiStore.closeModal('newGist')
      expect(nav.isModalOpen()).toBe(false)

      wrapper.unmount()
    })
  })
})
