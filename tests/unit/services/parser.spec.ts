import { describe, it, expect } from 'vitest'
import {
  parseDescription,
  extractLanguageTags,
  extractCustomTags,
  addLangPrefix,
  parseLangName,
  buildDescription
} from 'src/services/parser'
import type { Gist } from 'src/types/github'

describe('Parser Service', () => {
  describe('parseDescription', () => {
    it('should parse description with bracketed title and Twitter hashtags', () => {
      const result = parseDescription('[My Title] This is a description #tag1 #tag2')

      expect(result.title).toBe('My Title')
      expect(result.description).toBe('This is a description #tag1 #tag2')
      expect(result.customTags).toEqual(['tag1', 'tag2'])
      expect(result.tagStyle).toBe('twitter')
    })

    it('should parse description with legacy tags format', () => {
      const result = parseDescription('[My Title] Description #tags: tag1, tag2, tag3')

      expect(result.title).toBe('My Title')
      expect(result.customTags).toEqual(['tag1', 'tag2', 'tag3'])
      expect(result.tagStyle).toBe('legacy')
    })

    it('should handle description without title', () => {
      const result = parseDescription('Just a description #tag')

      expect(result.title).toBe('')
      expect(result.customTags).toEqual(['tag'])
      expect(result.tagStyle).toBe('twitter')
    })

    it('should handle empty description', () => {
      const result = parseDescription('')

      expect(result.title).toBe('')
      expect(result.description).toBe('No description')
      expect(result.customTags).toEqual([])
      expect(result.tagStyle).toBe('none')
    })

    it('should handle null/undefined description', () => {
      const result = parseDescription(null)

      expect(result.title).toBe('')
      expect(result.description).toBe('No description')
      expect(result.customTags).toEqual([])
    })

    it('should extract multiple hashtags', () => {
      const result = parseDescription('Description #javascript #react #typescript')

      expect(result.customTags).toEqual(['javascript', 'react', 'typescript'])
    })

    it('should handle title with special characters', () => {
      const result = parseDescription('[React: Best Practices] A guide to React')

      expect(result.title).toBe('React: Best Practices')
    })

    it('should handle description with only hashtags', () => {
      const result = parseDescription('#javascript #python')

      expect(result.customTags).toEqual(['javascript', 'python'])
    })

    it('should handle nested brackets in title', () => {
      const result = parseDescription('[My [Complex] Title] Description')

      // Matches first bracket pair
      expect(result.title).toBe('My [Complex')
    })

    it('should extract title with whitespace', () => {
      const result = parseDescription('[  Spaced Title  ] Description')

      expect(result.title).toBe('  Spaced Title  ')
    })

    it('should handle legacy tags with different separators', () => {
      // Chinese comma and Japanese separator
      const result = parseDescription('Description #tags: tag1，tag2、tag3')

      expect(result.customTags).toEqual(['tag1', 'tag2', 'tag3'])
      expect(result.tagStyle).toBe('legacy')
    })
  })

  describe('extractLanguageTags', () => {
    const createMockGist = (files: Record<string, { language: string | null }>): Gist => ({
      id: 'test-gist',
      description: 'Test',
      public: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      html_url: 'https://gist.github.com/test',
      files: Object.fromEntries(
        Object.entries(files).map(([filename, data]) => [
          filename,
          {
            filename,
            language: data.language,
            type: 'text/plain',
            raw_url: 'https://raw.githubusercontent.com/...',
            size: 100
          }
        ])
      ),
      owner: {
        login: 'testuser',
        id: 1,
        avatar_url: 'https://avatars.githubusercontent.com/u/1'
      }
    })

    it('should extract language tags from files', () => {
      const gist = createMockGist({
        'test.js': { language: 'JavaScript' },
        'style.css': { language: 'CSS' }
      })

      const tags = extractLanguageTags(gist)

      expect(tags).toContain('lang@JavaScript')
      expect(tags).toContain('lang@CSS')
    })

    it('should handle files with null language by excluding them', () => {
      const gist = createMockGist({
        'test.js': { language: 'JavaScript' },
        'test.txt': { language: null }
      })

      const tags = extractLanguageTags(gist)

      expect(tags).toContain('lang@JavaScript')
      expect(tags).not.toContain('lang@null')
    })

    it('should deduplicate language tags', () => {
      const gist = createMockGist({
        'file1.js': { language: 'JavaScript' },
        'file2.js': { language: 'JavaScript' },
        'file3.js': { language: 'JavaScript' }
      })

      const tags = extractLanguageTags(gist)

      const jsTagCount = tags.filter(t => t === 'lang@JavaScript').length
      expect(jsTagCount).toBe(1)
    })

    it('should return "lang@Other" when no files have languages', () => {
      const gist = createMockGist({})

      const tags = extractLanguageTags(gist)

      expect(tags).toEqual(['lang@Other'])
    })

    it('should preserve case', () => {
      const gist = createMockGist({
        'test.py': { language: 'Python' }
      })

      const tags = extractLanguageTags(gist)

      expect(tags).toContain('lang@Python')
      expect(tags).not.toContain('lang@python')
    })
  })

  describe('extractCustomTags', () => {
    const createGistWithDescription = (description: string): Gist => ({
      id: 'test-gist',
      description,
      public: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      html_url: 'https://gist.github.com/test',
      files: {},
      owner: {
        login: 'testuser',
        id: 1,
        avatar_url: 'https://avatars.githubusercontent.com/u/1'
      }
    })

    it('should extract custom tags from description', () => {
      const gist = createGistWithDescription('[Title] Description #javascript #react')

      const tags = extractCustomTags(gist)

      expect(tags).toContain('javascript')
      expect(tags).toContain('react')
    })

    it('should handle description without tags', () => {
      const gist = createGistWithDescription('Just a description without tags')

      const tags = extractCustomTags(gist)

      expect(tags).toEqual([])
    })

    it('should handle empty description', () => {
      const gist = createGistWithDescription('')

      const tags = extractCustomTags(gist)

      expect(tags).toEqual([])
    })

    it('should handle tags with numbers', () => {
      const gist = createGistWithDescription('Description #es6 #web2024')

      const tags = extractCustomTags(gist)

      expect(tags).toContain('es6')
      expect(tags).toContain('web2024')
    })
  })

  describe('addLangPrefix', () => {
    it('should add lang@ prefix to language', () => {
      expect(addLangPrefix('JavaScript')).toBe('lang@JavaScript')
    })

    it('should return lang@Other for null', () => {
      expect(addLangPrefix(null)).toBe('lang@Other')
    })

    it('should return lang@Other for undefined', () => {
      expect(addLangPrefix(undefined)).toBe('lang@Other')
    })

    it('should trim whitespace', () => {
      expect(addLangPrefix('  Python  ')).toBe('lang@Python')
    })
  })

  describe('parseLangName', () => {
    it('should extract language from lang@ prefix', () => {
      expect(parseLangName('lang@JavaScript')).toBe('JavaScript')
    })

    it('should return input if no prefix', () => {
      expect(parseLangName('JavaScript')).toBe('JavaScript')
    })
  })

  describe('buildDescription', () => {
    it('should build description with title and Twitter-style tags', () => {
      const result = buildDescription('My Title', 'Description', ['tag1', 'tag2'], 'twitter')

      expect(result).toBe('[My Title] Description #tag1 #tag2')
    })

    it('should build description with legacy-style tags', () => {
      const result = buildDescription('My Title', 'Description', ['tag1', 'tag2'], 'legacy')

      expect(result).toBe('[My Title] Description #tags: tag1, tag2')
    })

    it('should build description without title', () => {
      const result = buildDescription('', 'Description', ['tag1'], 'twitter')

      expect(result).toBe('Description #tag1')
    })

    it('should build description without tags', () => {
      const result = buildDescription('Title', 'Description', [], 'twitter')

      expect(result).toBe('[Title] Description')
    })
  })
})
