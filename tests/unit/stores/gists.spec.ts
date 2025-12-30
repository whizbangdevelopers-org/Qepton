import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useGistsStore } from 'src/stores/gists'
import type { Gist } from 'src/types/github'

// Mock the GitHub API service
vi.mock('src/services/github-api', () => ({
  githubAPI: {
    getAllGists: vi.fn(),
    createGist: vi.fn(),
    updateGist: vi.fn(),
    deleteGist: vi.fn()
  }
}))

// Mock search service
vi.mock('src/services/search', () => ({
  searchService: {
    buildIndex: vi.fn(),
    addToIndex: vi.fn(),
    updateInIndex: vi.fn(),
    removeFromIndex: vi.fn()
  }
}))

// Mock parser service
vi.mock('src/services/parser', () => ({
  extractLanguageTags: vi.fn((gist) => {
    const tags: string[] = []
    Object.values(gist.files || {}).forEach((file: { language?: string }) => {
      if (file.language) {
        tags.push(`lang@${file.language}`)
      }
    })
    return [...new Set(tags)]
  }),
  extractCustomTags: vi.fn((gist) => {
    const match = gist.description?.match(/#(\w+)/g)
    return match ? match.map((t: string) => t.slice(1)) : []
  }),
  parseDescription: vi.fn((desc) => ({
    title: null,
    description: desc || '',
    tags: []
  }))
}))

describe('Gists Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('Initial State', () => {
    it('should initialize with empty gists', () => {
      const store = useGistsStore()

      expect(store.gists).toEqual({})
      expect(store.totalGists).toBe(0)
    })

    it('should initialize with null activeGistId', () => {
      const store = useGistsStore()

      expect(store.activeGistId).toBeNull()
      expect(store.activeGist).toBeNull()
    })

    it('should initialize with "All Gists" as active tag', () => {
      const store = useGistsStore()

      expect(store.activeTag).toBe('All Gists')
    })

    it('should initialize with empty pinned tags', () => {
      const store = useGistsStore()

      expect(store.pinnedTags).toEqual([])
    })

    it('should initialize with isSyncing false', () => {
      const store = useGistsStore()

      expect(store.isSyncing).toBe(false)
    })
  })

  describe('Getters', () => {
    it('should return active gist when gistId is set', () => {
      const store = useGistsStore()

      const mockGist: Gist = {
        id: 'gist123',
        description: 'Test Gist',
        public: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        html_url: 'https://gist.github.com/test',
        files: {},
        owner: { login: 'testuser', id: 1, avatar_url: '' }
      }

      store.gists['gist123'] = mockGist
      store.activeGistId = 'gist123'

      expect(store.activeGist).toEqual(mockGist)
    })

    it('should return gists sorted by updated_at', () => {
      const store = useGistsStore()

      store.gists = {
        'old': {
          id: 'old',
          description: 'Old',
          updated_at: '2024-01-01T00:00:00Z',
          created_at: '2024-01-01T00:00:00Z',
          public: true,
          html_url: '',
          files: {},
          owner: { login: 'test', id: 1, avatar_url: '' }
        },
        'new': {
          id: 'new',
          description: 'New',
          updated_at: '2024-12-01T00:00:00Z',
          created_at: '2024-12-01T00:00:00Z',
          public: true,
          html_url: '',
          files: {},
          owner: { login: 'test', id: 1, avatar_url: '' }
        }
      }

      const sorted = store.allGistsArray
      expect(sorted[0].id).toBe('new')
      expect(sorted[1].id).toBe('old')
    })

    it('should filter gists by tag', () => {
      const store = useGistsStore()

      store.gists = {
        'gist1': {
          id: 'gist1',
          description: 'JS Gist',
          updated_at: '2024-01-01T00:00:00Z',
          created_at: '2024-01-01T00:00:00Z',
          public: true,
          html_url: '',
          files: {},
          owner: { login: 'test', id: 1, avatar_url: '' }
        },
        'gist2': {
          id: 'gist2',
          description: 'Python Gist',
          updated_at: '2024-01-02T00:00:00Z',
          created_at: '2024-01-02T00:00:00Z',
          public: true,
          html_url: '',
          files: {},
          owner: { login: 'test', id: 1, avatar_url: '' }
        }
      }

      store.gistTags = {
        'lang@JavaScript': new Set(['gist1']),
        'lang@Python': new Set(['gist2'])
      }

      const jsGists = store.gistsByTag('lang@JavaScript')
      expect(jsGists).toHaveLength(1)
      expect(jsGists[0].id).toBe('gist1')
    })

    it('should return all gists for "All Gists" tag', () => {
      const store = useGistsStore()

      store.gists = {
        'gist1': {
          id: 'gist1',
          description: 'Gist 1',
          updated_at: '2024-01-01T00:00:00Z',
          created_at: '2024-01-01T00:00:00Z',
          public: true,
          html_url: '',
          files: {},
          owner: { login: 'test', id: 1, avatar_url: '' }
        },
        'gist2': {
          id: 'gist2',
          description: 'Gist 2',
          updated_at: '2024-01-02T00:00:00Z',
          created_at: '2024-01-02T00:00:00Z',
          public: true,
          html_url: '',
          files: {},
          owner: { login: 'test', id: 1, avatar_url: '' }
        }
      }

      const allGists = store.gistsByTag('All Gists')
      expect(allGists).toHaveLength(2)
    })

    it('should return correct stats', () => {
      const store = useGistsStore()

      store.gists = {
        'gist1': {} as Gist,
        'gist2': {} as Gist
      }

      store.gistTags = {
        'lang@JavaScript': new Set(['gist1']),
        'lang@Python': new Set(['gist2']),
        'custom-tag': new Set(['gist1', 'gist2'])
      }

      const stats = store.stats
      expect(stats.totalGists).toBe(2)
      expect(stats.totalTags).toBe(3)
      expect(stats.languageTags).toBe(2)
      expect(stats.customTags).toBe(1)
    })
  })

  describe('Actions', () => {
    it('should set active gist', () => {
      const store = useGistsStore()

      store.setActiveGist('gist123')

      expect(store.activeGistId).toBe('gist123')
    })

    it('should clear active gist with null', () => {
      const store = useGistsStore()
      store.activeGistId = 'gist123'

      store.setActiveGist(null)

      expect(store.activeGistId).toBeNull()
    })

    it('should set active tag', () => {
      const store = useGistsStore()

      store.setActiveTag('lang@JavaScript')

      expect(store.activeTag).toBe('lang@JavaScript')
    })

    it('should toggle pinned tag (add)', () => {
      const store = useGistsStore()

      store.togglePinnedTag('lang@JavaScript')

      expect(store.pinnedTags).toContain('lang@JavaScript')
    })

    it('should toggle pinned tag (remove)', () => {
      const store = useGistsStore()
      store.pinnedTags = ['lang@JavaScript']

      store.togglePinnedTag('lang@JavaScript')

      expect(store.pinnedTags).not.toContain('lang@JavaScript')
    })

    it('should pin a tag', () => {
      const store = useGistsStore()

      store.pinTag('custom-tag')

      expect(store.pinnedTags).toContain('custom-tag')
    })

    it('should not duplicate when pinning already pinned tag', () => {
      const store = useGistsStore()
      store.pinnedTags = ['custom-tag']

      store.pinTag('custom-tag')

      expect(store.pinnedTags.filter(t => t === 'custom-tag')).toHaveLength(1)
    })

    it('should unpin a tag', () => {
      const store = useGistsStore()
      store.pinnedTags = ['tag1', 'tag2']

      store.unpinTag('tag1')

      expect(store.pinnedTags).not.toContain('tag1')
      expect(store.pinnedTags).toContain('tag2')
    })
  })

  describe('Tag Indexing', () => {
    it('should index gist tags correctly', () => {
      const store = useGistsStore()

      const gist: Gist = {
        id: 'gist1',
        description: 'Test #custom',
        public: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        html_url: '',
        files: {
          'test.js': {
            filename: 'test.js',
            language: 'JavaScript',
            type: 'text/javascript',
            raw_url: '',
            size: 100
          }
        },
        owner: { login: 'test', id: 1, avatar_url: '' }
      }

      store.indexGistTags(gist)

      expect(store.gistTags['lang@JavaScript']).toBeDefined()
      expect(store.gistTags['lang@JavaScript'].has('gist1')).toBe(true)
    })

    it('should remove gist from tags', () => {
      const store = useGistsStore()

      store.gistTags = {
        'lang@JavaScript': new Set(['gist1', 'gist2']),
        'custom': new Set(['gist1'])
      }

      store.removeGistFromTags('gist1')

      expect(store.gistTags['lang@JavaScript'].has('gist1')).toBe(false)
      expect(store.gistTags['lang@JavaScript'].has('gist2')).toBe(true)
      // 'custom' tag should be removed entirely since it's now empty
      expect(store.gistTags['custom']).toBeUndefined()
    })
  })

  describe('Sync State', () => {
    it('should track sync error', () => {
      const store = useGistsStore()

      store.syncError = 'Network error'

      expect(store.syncError).toBe('Network error')
    })

    it('should track last sync time', () => {
      const store = useGistsStore()
      const now = Date.now()

      store.lastSyncTime = now

      expect(store.lastSyncTime).toBe(now)
    })
  })
})
