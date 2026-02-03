import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSearchStore } from 'src/stores/search'

vi.mock('src/services/search', () => ({
  searchService: {
    search: vi.fn((query: string) => {
      if (query === 'test') return [{ id: 'gist1' }, { id: 'gist2' }]
      if (query === '/test/i') return [{ id: 'gist3' }]
      return []
    }),
    isRegexQuery: vi.fn((query: string) => query.startsWith('/') && query.includes('/')),
    parseRegex: vi.fn((query: string) => {
      if (query === '/test/i') return /test/i
      if (query === '/[invalid/') return null
      return null
    })
  }
}))

vi.mock('src/services/settings-sync', () => ({
  settingsSync: {
    saveSettings: vi.fn()
  }
}))

describe('Search Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('Initial State', () => {
    it('should initialize with empty query', () => {
      const store = useSearchStore()
      expect(store.query).toBe('')
    })

    it('should initialize with empty results', () => {
      const store = useSearchStore()
      expect(store.results).toEqual([])
    })

    it('should initialize with isSearching false', () => {
      const store = useSearchStore()
      expect(store.isSearching).toBe(false)
    })

    it('should initialize with empty savedSearches', () => {
      const store = useSearchStore()
      expect(store.savedSearches).toEqual([])
    })

    it('should initialize with default filters', () => {
      const store = useSearchStore()
      expect(store.filters).toEqual({
        visibility: 'all',
        languages: [],
        dateRange: 'all'
      })
    })
  })

  describe('Getters', () => {
    it('isActive should return false for empty query', () => {
      const store = useSearchStore()
      expect(store.isActive).toBe(false)
    })

    it('isActive should return true for non-empty query', () => {
      const store = useSearchStore()
      store.query = 'test'
      expect(store.isActive).toBe(true)
    })

    it('isActive should return false for whitespace-only query', () => {
      const store = useSearchStore()
      store.query = '   '
      expect(store.isActive).toBe(false)
    })

    it('resultCount should return number of results', () => {
      const store = useSearchStore()
      store.results = [{ id: '1' }, { id: '2' }] as never[]
      expect(store.resultCount).toBe(2)
    })

    it('hasResults should return false when no results', () => {
      const store = useSearchStore()
      expect(store.hasResults).toBe(false)
    })

    it('hasResults should return true when results exist', () => {
      const store = useSearchStore()
      store.results = [{ id: '1' }] as never[]
      expect(store.hasResults).toBe(true)
    })

    it('hasNoResults should return true when query exists but no results', () => {
      const store = useSearchStore()
      store.query = 'test'
      store.results = []
      expect(store.hasNoResults).toBe(true)
    })

    it('hasNoResults should return false when query is empty', () => {
      const store = useSearchStore()
      store.query = ''
      store.results = []
      expect(store.hasNoResults).toBe(false)
    })

    it('isCurrentQuerySaved should detect saved queries', () => {
      const store = useSearchStore()
      store.savedSearches = [{ id: '1', query: 'test', name: 'test', createdAt: Date.now() }]
      store.query = 'TEST'
      expect(store.isCurrentQuerySaved).toBe(true)
    })

    it('sortedSavedSearches should sort by most recent', () => {
      const store = useSearchStore()
      const older = { id: '1', query: 'old', name: 'old', createdAt: 1000 }
      const newer = { id: '2', query: 'new', name: 'new', createdAt: 2000 }
      store.savedSearches = [older, newer]
      expect(store.sortedSavedSearches[0].id).toBe('2')
    })

    it('hasActiveFilters should detect active filters', () => {
      const store = useSearchStore()
      expect(store.hasActiveFilters).toBe(false)

      store.filters.visibility = 'public'
      expect(store.hasActiveFilters).toBe(true)
    })

    it('activeFilterCount should count active filters', () => {
      const store = useSearchStore()
      expect(store.activeFilterCount).toBe(0)

      store.filters.visibility = 'public'
      store.filters.languages = ['JavaScript', 'Python']
      store.filters.dateRange = 'week'
      expect(store.activeFilterCount).toBe(4)
    })
  })

  describe('Actions', () => {
    describe('search', () => {
      it('should search and update results', () => {
        const store = useSearchStore()
        store.search('test')
        expect(store.query).toBe('test')
        expect(store.results).toHaveLength(2)
      })

      it('should clear results for empty query', () => {
        const store = useSearchStore()
        store.results = [{ id: '1' }] as never[]
        store.search('')
        expect(store.results).toEqual([])
      })

      it('should handle errors gracefully', async () => {
        const store = useSearchStore()
        const { searchService } = await import('src/services/search')
        vi.mocked(searchService.search).mockImplementationOnce(() => {
          throw new Error('Search error')
        })
        store.search('error')
        expect(store.results).toEqual([])
      })
    })

    describe('clearSearch', () => {
      it('should clear query and results', () => {
        const store = useSearchStore()
        store.query = 'test'
        store.results = [{ id: '1' }] as never[]
        store.isSearching = true

        store.clearSearch()

        expect(store.query).toBe('')
        expect(store.results).toEqual([])
        expect(store.isSearching).toBe(false)
      })
    })

    describe('setQuery', () => {
      it('should update query without searching', () => {
        const store = useSearchStore()
        store.setQuery('test')
        expect(store.query).toBe('test')
        expect(store.results).toEqual([])
      })
    })

    describe('getResult', () => {
      it('should return result by index', () => {
        const store = useSearchStore()
        store.results = [{ id: '1' }, { id: '2' }] as never[]
        expect(store.getResult(0)).toEqual({ id: '1' })
      })

      it('should return null for invalid index', () => {
        const store = useSearchStore()
        store.results = [{ id: '1' }] as never[]
        expect(store.getResult(5)).toBeNull()
      })
    })

    describe('saveSearch', () => {
      it('should save current query', () => {
        const store = useSearchStore()
        store.query = 'my search'
        store.saveSearch()
        expect(store.savedSearches).toHaveLength(1)
        expect(store.savedSearches[0].query).toBe('my search')
      })

      it('should not save short queries', () => {
        const store = useSearchStore()
        store.query = 'a'
        store.saveSearch()
        expect(store.savedSearches).toHaveLength(0)
      })

      it('should not save duplicate queries', () => {
        const store = useSearchStore()
        store.savedSearches = [{ id: '1', query: 'test', name: 'test', createdAt: Date.now() }]
        store.query = 'test'
        store.saveSearch()
        expect(store.savedSearches).toHaveLength(1)
      })

      it('should allow custom name', () => {
        const store = useSearchStore()
        store.query = 'my query'
        store.saveSearch('Custom Name')
        expect(store.savedSearches[0].name).toBe('Custom Name')
      })
    })

    describe('deleteSavedSearch', () => {
      it('should delete saved search by id', () => {
        const store = useSearchStore()
        store.savedSearches = [
          { id: '1', query: 'test1', name: 'test1', createdAt: 1 },
          { id: '2', query: 'test2', name: 'test2', createdAt: 2 }
        ]
        store.deleteSavedSearch('1')
        expect(store.savedSearches).toHaveLength(1)
        expect(store.savedSearches[0].id).toBe('2')
      })
    })

    describe('applySavedSearch', () => {
      it('should apply saved search query', () => {
        const store = useSearchStore()
        store.savedSearches = [{ id: '1', query: 'test', name: 'test', createdAt: 1 }]
        store.applySavedSearch('1')
        expect(store.query).toBe('test')
      })
    })

    describe('renameSavedSearch', () => {
      it('should rename saved search', () => {
        const store = useSearchStore()
        store.savedSearches = [{ id: '1', query: 'test', name: 'test', createdAt: 1 }]
        store.renameSavedSearch('1', 'New Name')
        expect(store.savedSearches[0].name).toBe('New Name')
      })

      it('should fallback to query if name is empty', () => {
        const store = useSearchStore()
        store.savedSearches = [{ id: '1', query: 'test', name: 'old', createdAt: 1 }]
        store.renameSavedSearch('1', '')
        expect(store.savedSearches[0].name).toBe('test')
      })
    })

    describe('Filter actions', () => {
      it('setVisibilityFilter should update visibility', () => {
        const store = useSearchStore()
        store.setVisibilityFilter('public')
        expect(store.filters.visibility).toBe('public')
      })

      it('toggleLanguageFilter should add language', () => {
        const store = useSearchStore()
        store.toggleLanguageFilter('JavaScript')
        expect(store.filters.languages).toContain('JavaScript')
      })

      it('toggleLanguageFilter should remove language', () => {
        const store = useSearchStore()
        store.filters.languages = ['JavaScript']
        store.toggleLanguageFilter('JavaScript')
        expect(store.filters.languages).not.toContain('JavaScript')
      })

      it('removeLanguageFilter should remove specific language', () => {
        const store = useSearchStore()
        store.filters.languages = ['JavaScript', 'Python']
        store.removeLanguageFilter('JavaScript')
        expect(store.filters.languages).toEqual(['Python'])
      })

      it('setDateRangeFilter should update date range', () => {
        const store = useSearchStore()
        store.setDateRangeFilter('week')
        expect(store.filters.dateRange).toBe('week')
      })

      it('clearFilters should reset all filters', () => {
        const store = useSearchStore()
        store.filters.visibility = 'public'
        store.filters.languages = ['JavaScript']
        store.filters.dateRange = 'week'

        store.clearFilters()

        expect(store.filters.visibility).toBe('all')
        expect(store.filters.languages).toEqual([])
        expect(store.filters.dateRange).toBe('all')
      })
    })
  })
})
