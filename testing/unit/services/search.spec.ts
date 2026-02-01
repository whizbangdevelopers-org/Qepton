import { describe, it, expect, beforeEach } from 'vitest'
import { SearchService } from 'src/services/search'
import type { Gist } from 'src/types/github'

const createMockGist = (overrides: Partial<Gist> = {}): Gist => ({
  id: 'gist-1',
  description: 'Test gist description',
  public: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  html_url: 'https://gist.github.com/test',
  files: {
    'test.js': {
      filename: 'test.js',
      language: 'JavaScript',
      type: 'text/javascript',
      raw_url: 'https://gist.githubusercontent.com/test',
      size: 100,
      content: 'console.log("hello")'
    }
  },
  owner: { login: 'testuser', id: 1, avatar_url: '' },
  ...overrides
})

describe('Search Service', () => {
  let searchService: SearchService

  beforeEach(() => {
    searchService = new SearchService()
  })

  describe('buildIndex', () => {
    it('should build index from gist object', () => {
      const gists = {
        'gist-1': createMockGist({ id: 'gist-1' }),
        'gist-2': createMockGist({ id: 'gist-2' })
      }

      searchService.buildIndex(gists)

      const stats = searchService.getIndexStats()
      expect(stats.isInitialized).toBe(true)
      expect(stats.totalItems).toBe(2)
    })

    it('should build index from gist array', () => {
      const gists = [
        createMockGist({ id: 'gist-1' }),
        createMockGist({ id: 'gist-2' }),
        createMockGist({ id: 'gist-3' })
      ]

      searchService.buildIndex(gists)

      const stats = searchService.getIndexStats()
      expect(stats.totalItems).toBe(3)
    })

    it('should create multiple entries for multi-file gists', () => {
      const gist = createMockGist({
        files: {
          'file1.js': {
            filename: 'file1.js',
            language: 'JavaScript',
            type: 'text/javascript',
            raw_url: '',
            size: 100
          },
          'file2.py': {
            filename: 'file2.py',
            language: 'Python',
            type: 'text/python',
            raw_url: '',
            size: 100
          }
        }
      })

      searchService.buildIndex([gist])

      const stats = searchService.getIndexStats()
      expect(stats.totalItems).toBe(2)
    })

    it('should handle gists with no files', () => {
      const gist = createMockGist({ files: {} })

      searchService.buildIndex([gist])

      const stats = searchService.getIndexStats()
      expect(stats.totalItems).toBe(1)
    })
  })

  describe('search (fuzzy)', () => {
    beforeEach(() => {
      searchService.buildIndex([
        createMockGist({
          id: 'gist-1',
          description: 'JavaScript utility functions',
          files: {
            'utils.js': {
              filename: 'utils.js',
              language: 'JavaScript',
              type: 'text/javascript',
              raw_url: '',
              size: 100
            }
          }
        }),
        createMockGist({
          id: 'gist-2',
          description: 'Python data analysis scripts',
          files: {
            'analysis.py': {
              filename: 'analysis.py',
              language: 'Python',
              type: 'text/python',
              raw_url: '',
              size: 100
            }
          }
        }),
        createMockGist({
          id: 'gist-3',
          description: 'React component examples',
          files: {
            'component.tsx': {
              filename: 'component.tsx',
              language: 'TypeScript',
              type: 'text/typescript',
              raw_url: '',
              size: 100
            }
          }
        })
      ])
    })

    it('should return empty array for short query', () => {
      const results = searchService.search('a')
      expect(results).toEqual([])
    })

    it('should return empty array for empty query', () => {
      const results = searchService.search('')
      expect(results).toEqual([])
    })

    it('should find gists by description', () => {
      const results = searchService.search('utility')
      expect(results).toHaveLength(1)
      expect(results[0].id).toBe('gist-1')
    })

    it('should find gists by partial match', () => {
      const results = searchService.search('script')
      expect(results.length).toBeGreaterThan(0)
    })

    it('should return empty array when no matches', () => {
      const results = searchService.search('nonexistent')
      expect(results).toEqual([])
    })

    it('should deduplicate gists with multiple matching files', () => {
      searchService.buildIndex([
        createMockGist({
          id: 'multi-file',
          description: 'test description',
          files: {
            'test1.js': {
              filename: 'test1.js',
              language: 'JavaScript',
              type: 'text/javascript',
              raw_url: '',
              size: 100
            },
            'test2.js': {
              filename: 'test2.js',
              language: 'JavaScript',
              type: 'text/javascript',
              raw_url: '',
              size: 100
            }
          }
        })
      ])

      const results = searchService.search('JavaScript')
      expect(results).toHaveLength(1)
    })
  })

  describe('Regex Search', () => {
    describe('isRegexQuery', () => {
      it('should detect regex patterns', () => {
        expect(searchService.isRegexQuery('/test/')).toBe(true)
        expect(searchService.isRegexQuery('/test/i')).toBe(true)
        expect(searchService.isRegexQuery('/test/gi')).toBe(true)
      })

      it('should not detect non-regex patterns', () => {
        expect(searchService.isRegexQuery('test')).toBe(false)
        expect(searchService.isRegexQuery('/test')).toBe(false)
        expect(searchService.isRegexQuery('test/')).toBe(false)
      })
    })

    describe('parseRegex', () => {
      it('should parse valid regex', () => {
        const regex = searchService.parseRegex('/test/i')
        expect(regex).toBeInstanceOf(RegExp)
        expect(regex?.flags).toBe('i')
      })

      it('should return null for invalid regex', () => {
        const regex = searchService.parseRegex('/[invalid/')
        expect(regex).toBeNull()
      })

      it('should return null for non-regex string', () => {
        const regex = searchService.parseRegex('not a regex')
        expect(regex).toBeNull()
      })
    })

    describe('regexSearch', () => {
      beforeEach(() => {
        searchService.buildIndex([
          createMockGist({
            id: 'gist-1',
            description: 'JavaScript utility',
            files: {
              'utils.js': {
                filename: 'utils.js',
                language: 'JavaScript',
                type: 'text/javascript',
                raw_url: '',
                size: 100
              }
            }
          }),
          createMockGist({
            id: 'gist-2',
            description: 'Python scripts',
            files: {
              'scripts.py': {
                filename: 'scripts.py',
                language: 'Python',
                type: 'text/python',
                raw_url: '',
                size: 100
              }
            }
          }),
          createMockGist({
            id: 'gist-3',
            description: 'java code',
            files: {
              'Main.java': {
                filename: 'Main.java',
                language: 'Java',
                type: 'text/java',
                raw_url: '',
                size: 100
              }
            }
          })
        ])
      })

      it('should search with regex', () => {
        const results = searchService.regexSearch(/utility/)
        expect(results).toHaveLength(1)
        expect(results[0].id).toBe('gist-1')
      })

      it('should search case-insensitive with flag', () => {
        const results = searchService.regexSearch(/UTILITY/i)
        expect(results).toHaveLength(1)
      })

      it('should search with complex patterns', () => {
        const results = searchService.regexSearch(/java/i)
        expect(results.length).toBeGreaterThanOrEqual(2)
      })

      it('should search file content', () => {
        searchService.buildIndex([
          createMockGist({
            id: 'content-gist',
            description: 'no match here',
            files: {
              'test.js': {
                filename: 'test.js',
                language: 'JavaScript',
                type: 'text/javascript',
                raw_url: '',
                size: 100,
                content: 'function uniquePatternXYZ() {}'
              }
            }
          })
        ])

        const results = searchService.regexSearch(/uniquePatternXYZ/)
        expect(results).toHaveLength(1)
        expect(results[0].id).toBe('content-gist')
      })
    })

    describe('search with regex pattern', () => {
      beforeEach(() => {
        searchService.buildIndex([
          createMockGist({ id: 'gist-1', description: 'API endpoint handler' }),
          createMockGist({ id: 'gist-2', description: 'Authentication module' })
        ])
      })

      it('should use regex search for regex patterns', () => {
        const results = searchService.search('/API/i')
        expect(results).toHaveLength(1)
        expect(results[0].id).toBe('gist-1')
      })

      it('should fallback to fuzzy search for invalid regex', () => {
        const results = searchService.search('/[invalid/')
        expect(Array.isArray(results)).toBe(true)
      })
    })
  })

  describe('Index Manipulation', () => {
    describe('addToIndex', () => {
      it('should add gist to existing index', () => {
        searchService.buildIndex([createMockGist({ id: 'gist-1' })])

        const newGist = createMockGist({ id: 'gist-2', description: 'New unique gist' })
        searchService.addToIndex(newGist)

        const stats = searchService.getIndexStats()
        expect(stats.totalItems).toBe(2)

        const results = searchService.search('unique')
        expect(results).toHaveLength(1)
        expect(results[0].id).toBe('gist-2')
      })
    })

    describe('updateInIndex', () => {
      it('should update existing gist', () => {
        searchService.buildIndex([createMockGist({ id: 'gist-1', description: 'Old description' })])

        const updatedGist = createMockGist({ id: 'gist-1', description: 'New updated description' })
        searchService.updateInIndex(updatedGist)

        const oldResults = searchService.search('Old')
        expect(oldResults).toHaveLength(0)

        const newResults = searchService.search('updated')
        expect(newResults).toHaveLength(1)
      })
    })

    describe('removeFromIndex', () => {
      it('should remove gist from index', () => {
        searchService.buildIndex([
          createMockGist({ id: 'gist-1', description: 'First gist' }),
          createMockGist({ id: 'gist-2', description: 'Second gist' })
        ])

        searchService.removeFromIndex('gist-1')

        const stats = searchService.getIndexStats()
        expect(stats.totalItems).toBe(1)

        const results = searchService.search('First')
        expect(results).toHaveLength(0)
      })
    })

    describe('resetIndex', () => {
      it('should clear the index', () => {
        searchService.buildIndex([createMockGist()])
        searchService.resetIndex()

        const stats = searchService.getIndexStats()
        expect(stats.isInitialized).toBe(false)
        expect(stats.totalItems).toBe(0)
      })
    })
  })

  describe('getIndexStats', () => {
    it('should return stats for empty index', () => {
      const stats = searchService.getIndexStats()
      expect(stats.isInitialized).toBe(false)
      expect(stats.totalItems).toBe(0)
    })

    it('should return correct stats after building index', () => {
      searchService.buildIndex([createMockGist({ id: 'gist-1' }), createMockGist({ id: 'gist-2' })])

      const stats = searchService.getIndexStats()
      expect(stats.isInitialized).toBe(true)
      expect(stats.totalItems).toBe(2)
    })
  })
})
