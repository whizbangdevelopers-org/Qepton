/**
 * Search Service using Fuse.js
 * Provides fuzzy search across gists by id, description, language, and filenames
 * Supports regex search with /pattern/flags syntax
 */

import Fuse, { type IFuseOptions } from 'fuse.js'
import type { Gist } from 'src/types/github'

const REGEX_PATTERN = /^\/(.+)\/([gimsuy]*)$/

interface SearchableGist {
  id: string
  description: string
  language: string
  filename: string
  // Keep reference to original gist for easy retrieval
  _gist: Gist
}

const fuseOptions: IFuseOptions<SearchableGist> = {
  shouldSort: true,
  threshold: 0.2,
  location: 0,
  distance: 100,
  minMatchCharLength: 1,
  keys: [
    { name: 'id', weight: 0.3 },
    { name: 'description', weight: 0.4 },
    { name: 'language', weight: 0.2 },
    { name: 'filename', weight: 0.1 }
  ],
  // Modern Fuse.js options (v6+)
  ignoreLocation: true,
  findAllMatches: true
}

class SearchService {
  private fuse: Fuse<SearchableGist> | null = null
  private fuseIndex: SearchableGist[] = []

  /**
   * Build search index from gists
   */
  buildIndex(gists: Record<string, Gist> | Gist[]): void {
    const gistArray = Array.isArray(gists) ? gists : Object.values(gists)

    this.fuseIndex = this.flattenGistsForSearch(gistArray)
    this.fuse = new Fuse(this.fuseIndex, fuseOptions)

    console.debug(`[Search] Index built with ${this.fuseIndex.length} searchable items`)
  }

  /**
   * Flatten gists into searchable items (one per file)
   */
  private flattenGistsForSearch(gists: Gist[]): SearchableGist[] {
    const searchableItems: SearchableGist[] = []

    gists.forEach(gist => {
      const files = gist.files || {}
      const fileNames = Object.keys(files)

      if (fileNames.length === 0) {
        // Gist with no files (edge case)
        searchableItems.push({
          id: gist.id,
          description: gist.description || '',
          language: '',
          filename: '',
          _gist: gist
        })
      } else {
        // Create one searchable item per file
        fileNames.forEach(filename => {
          const file = files[filename]
          searchableItems.push({
            id: gist.id,
            description: gist.description || '',
            language: file.language || '',
            filename: filename,
            _gist: gist
          })
        })
      }
    })

    return searchableItems
  }

  /**
   * Check if query is a regex pattern
   */
  isRegexQuery(query: string): boolean {
    return REGEX_PATTERN.test(query.trim())
  }

  /**
   * Parse regex pattern from query string
   * Returns null if not a valid regex
   */
  parseRegex(query: string): RegExp | null {
    const match = query.trim().match(REGEX_PATTERN)
    if (!match) return null

    try {
      return new RegExp(match[1], match[2])
    } catch {
      return null
    }
  }

  /**
   * Search gists using regex pattern
   */
  regexSearch(regex: RegExp): Gist[] {
    const seenGistIds = new Set<string>()
    const matchingGists: Gist[] = []

    this.fuseIndex.forEach(item => {
      if (seenGistIds.has(item._gist.id)) return

      const matches =
        regex.test(item.description) ||
        regex.test(item.filename) ||
        regex.test(item.language) ||
        regex.test(item.id) ||
        this.regexMatchesFileContent(item._gist, regex)

      if (matches) {
        seenGistIds.add(item._gist.id)
        matchingGists.push(item._gist)
      }
    })

    return matchingGists
  }

  /**
   * Check if regex matches any file content in a gist
   */
  private regexMatchesFileContent(gist: Gist, regex: RegExp): boolean {
    const files = gist.files || {}
    for (const filename of Object.keys(files)) {
      const file = files[filename]
      if (file.content && regex.test(file.content)) {
        return true
      }
    }
    return false
  }

  /**
   * Search gists by query string (fuzzy or regex)
   */
  search(query: string): Gist[] {
    const trimmedQuery = query.trim()

    if (!trimmedQuery || trimmedQuery.length <= 1) {
      return []
    }

    // Check for regex pattern
    if (this.isRegexQuery(trimmedQuery)) {
      const regex = this.parseRegex(trimmedQuery)
      if (regex) {
        const results = this.regexSearch(regex)
        console.debug(`[Search] Regex "${trimmedQuery}" returned ${results.length} results`)
        return results
      }
      // Invalid regex, fall through to fuzzy search
      console.warn(`[Search] Invalid regex pattern: ${trimmedQuery}`)
    }

    if (!this.fuse) {
      console.warn('[Search] Search index not initialized')
      return []
    }

    const results = this.fuse.search(trimmedQuery)

    // Deduplicate gists (same gist might match multiple files)
    const seenGistIds = new Set<string>()
    const uniqueGists: Gist[] = []

    results.forEach(result => {
      const gist = result.item._gist
      if (!seenGistIds.has(gist.id)) {
        seenGistIds.add(gist.id)
        uniqueGists.push(gist)
      }
    })

    console.debug(`[Search] Query "${query}" returned ${uniqueGists.length} results`)

    return uniqueGists
  }

  /**
   * Add a single gist to the search index
   */
  addToIndex(gist: Gist): void {
    const newItems = this.flattenGistsForSearch([gist])
    this.fuseIndex.push(...newItems)

    // Rebuild Fuse instance with updated index
    this.fuse = new Fuse(this.fuseIndex, fuseOptions)

    console.debug(`[Search] Added gist ${gist.id} to index`)
  }

  /**
   * Update a gist in the search index
   */
  updateInIndex(gist: Gist): void {
    // Remove old entries for this gist
    this.fuseIndex = this.fuseIndex.filter(item => item.id !== gist.id)

    // Add updated gist
    const newItems = this.flattenGistsForSearch([gist])
    this.fuseIndex.push(...newItems)

    // Rebuild Fuse instance
    this.fuse = new Fuse(this.fuseIndex, fuseOptions)

    console.debug(`[Search] Updated gist ${gist.id} in index`)
  }

  /**
   * Remove a gist from the search index
   */
  removeFromIndex(gistId: string): void {
    this.fuseIndex = this.fuseIndex.filter(item => item.id !== gistId)

    // Rebuild Fuse instance
    this.fuse = new Fuse(this.fuseIndex, fuseOptions)

    console.debug(`[Search] Removed gist ${gistId} from index`)
  }

  /**
   * Reset the search index
   */
  resetIndex(): void {
    this.fuseIndex = []
    this.fuse = null

    console.debug('[Search] Index reset')
  }

  /**
   * Get index statistics
   */
  getIndexStats() {
    return {
      totalItems: this.fuseIndex.length,
      isInitialized: this.fuse !== null
    }
  }
}

// Export singleton instance
export const searchService = new SearchService()

// Export class for testing
export { SearchService }
