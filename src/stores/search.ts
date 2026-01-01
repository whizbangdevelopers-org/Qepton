/**
 * Search Store
 * Manages search state and integrates with the search service
 */

import { defineStore } from 'pinia'
import { searchService } from 'src/services/search'
import { settingsSync } from 'src/services/settings-sync'
import type { SearchState, SavedSearch, VisibilityFilter, DateRangeFilter } from 'src/types/store'
import type { Gist } from 'src/types/github'

export const useSearchStore = defineStore('search', {
  state: (): SearchState => ({
    query: '',
    results: [],
    isSearching: false,
    savedSearches: [],
    filters: {
      visibility: 'all',
      languages: [],
      dateRange: 'all'
    }
  }),

  getters: {
    /**
     * Check if search is active (has query)
     */
    isActive: (state): boolean => {
      return state.query.trim().length > 0
    },

    /**
     * Check if current query is a regex pattern
     */
    isRegexQuery: (state): boolean => {
      return searchService.isRegexQuery(state.query)
    },

    /**
     * Check if current regex query is valid
     */
    isValidRegex: (state): boolean => {
      if (!searchService.isRegexQuery(state.query)) return true
      return searchService.parseRegex(state.query) !== null
    },

    /**
     * Get result count
     */
    resultCount: (state): number => {
      return state.results.length
    },

    /**
     * Check if there are results
     */
    hasResults: (state): boolean => {
      return state.results.length > 0
    },

    /**
     * Check if search returned no results
     */
    hasNoResults: (state): boolean => {
      return state.query.trim().length > 0 && state.results.length === 0
    },

    /**
     * Check if current query is already saved
     */
    isCurrentQuerySaved: (state): boolean => {
      const trimmed = state.query.trim().toLowerCase()
      return state.savedSearches.some(s => s.query.toLowerCase() === trimmed)
    },

    /**
     * Get saved searches sorted by most recent
     */
    sortedSavedSearches: (state): SavedSearch[] => {
      return [...state.savedSearches].sort((a, b) => b.createdAt - a.createdAt)
    },

    /**
     * Check if any filters are active
     */
    hasActiveFilters: (state): boolean => {
      return (
        state.filters.visibility !== 'all' ||
        state.filters.languages.length > 0 ||
        state.filters.dateRange !== 'all'
      )
    },

    /**
     * Get count of active filters
     */
    activeFilterCount: (state): number => {
      let count = 0
      if (state.filters.visibility !== 'all') count++
      if (state.filters.languages.length > 0) count += state.filters.languages.length
      if (state.filters.dateRange !== 'all') count++
      return count
    }
  },

  actions: {
    /**
     * Perform search
     */
    search(query: string): void {
      this.query = query
      this.isSearching = true

      try {
        if (!query || query.trim().length === 0) {
          this.results = []
          return
        }

        // Use search service
        this.results = searchService.search(query)

        console.debug(`[Search] Query "${query}" returned ${this.results.length} results`)
      } catch (error) {
        console.error('[Search] Search failed:', error)
        this.results = []
      } finally {
        this.isSearching = false
      }
    },

    /**
     * Clear search
     */
    clearSearch(): void {
      this.query = ''
      this.results = []
      this.isSearching = false

      console.debug('[Search] Search cleared')
    },

    /**
     * Update query without searching (for controlled input)
     */
    setQuery(query: string): void {
      this.query = query
    },

    /**
     * Get a specific result by index
     */
    getResult(index: number): Gist | null {
      return this.results[index] || null
    },

    /**
     * Save current search query
     */
    saveSearch(name?: string): void {
      const query = this.query.trim()
      if (!query || query.length < 2) return

      if (this.isCurrentQuerySaved) {
        console.debug('[Search] Query already saved')
        return
      }

      const savedSearch: SavedSearch = {
        id: crypto.randomUUID(),
        query,
        name: name || query,
        createdAt: Date.now()
      }

      this.savedSearches.push(savedSearch)
      settingsSync.saveSettings({ savedSearches: [...this.savedSearches] })
      console.debug(`[Search] Saved search: "${query}"`)
    },

    /**
     * Delete a saved search
     */
    deleteSavedSearch(id: string): void {
      const index = this.savedSearches.findIndex(s => s.id === id)
      if (index !== -1) {
        this.savedSearches.splice(index, 1)
        settingsSync.saveSettings({ savedSearches: [...this.savedSearches] })
        console.debug(`[Search] Deleted saved search: ${id}`)
      }
    },

    /**
     * Apply a saved search
     */
    applySavedSearch(id: string): void {
      const saved = this.savedSearches.find(s => s.id === id)
      if (saved) {
        this.search(saved.query)
        console.debug(`[Search] Applied saved search: "${saved.query}"`)
      }
    },

    /**
     * Rename a saved search
     */
    renameSavedSearch(id: string, newName: string): void {
      const saved = this.savedSearches.find(s => s.id === id)
      if (saved) {
        saved.name = newName.trim() || saved.query
        settingsSync.saveSettings({ savedSearches: [...this.savedSearches] })
        console.debug(`[Search] Renamed saved search: ${id} -> "${saved.name}"`)
      }
    },

    /**
     * Set visibility filter
     */
    setVisibilityFilter(visibility: VisibilityFilter): void {
      this.filters.visibility = visibility
      console.debug(`[Search] Visibility filter: ${visibility}`)
    },

    /**
     * Toggle language filter
     */
    toggleLanguageFilter(language: string): void {
      const index = this.filters.languages.indexOf(language)
      if (index === -1) {
        this.filters.languages.push(language)
      } else {
        this.filters.languages.splice(index, 1)
      }
      console.debug(`[Search] Language filters: ${this.filters.languages.join(', ')}`)
    },

    /**
     * Remove language filter
     */
    removeLanguageFilter(language: string): void {
      const index = this.filters.languages.indexOf(language)
      if (index !== -1) {
        this.filters.languages.splice(index, 1)
      }
    },

    /**
     * Set date range filter
     */
    setDateRangeFilter(dateRange: DateRangeFilter): void {
      this.filters.dateRange = dateRange
      console.debug(`[Search] Date range filter: ${dateRange}`)
    },

    /**
     * Clear all filters
     */
    clearFilters(): void {
      this.filters.visibility = 'all'
      this.filters.languages = []
      this.filters.dateRange = 'all'
      console.debug('[Search] Filters cleared')
    },

    /**
     * Reset all search state (called on logout)
     */
    $reset(): void {
      this.query = ''
      this.results = []
      this.isSearching = false
      this.savedSearches = []
      this.filters = {
        visibility: 'all',
        languages: [],
        dateRange: 'all'
      }
      console.debug('[Search] Store reset')
    }
  },

  persist: {
    paths: ['savedSearches', 'filters']
  }
})
