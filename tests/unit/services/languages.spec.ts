import { describe, it, expect } from 'vitest'
import {
  SUPPORTED_LANGUAGES,
  UNSUPPORTED_LANGUAGES,
  getLanguageById,
  getLanguageByExtension
} from 'src/services/languages'

describe('Languages Service', () => {
  describe('SUPPORTED_LANGUAGES', () => {
    it('should have 25 supported languages', () => {
      expect(SUPPORTED_LANGUAGES).toHaveLength(25)
    })

    it('should have unique language ids', () => {
      const ids = SUPPORTED_LANGUAGES.map(l => l.id)
      const uniqueIds = [...new Set(ids)]
      expect(ids).toEqual(uniqueIds)
    })

    it('should include common languages', () => {
      const ids = SUPPORTED_LANGUAGES.map(l => l.id)
      expect(ids).toContain('javascript')
      expect(ids).toContain('typescript')
      expect(ids).toContain('python')
      expect(ids).toContain('java')
      expect(ids).toContain('go')
      expect(ids).toContain('rust')
    })

    it('should have valid structure for each language', () => {
      SUPPORTED_LANGUAGES.forEach(lang => {
        expect(lang).toHaveProperty('id')
        expect(lang).toHaveProperty('name')
        expect(lang).toHaveProperty('extensions')
        expect(typeof lang.id).toBe('string')
        expect(typeof lang.name).toBe('string')
        expect(Array.isArray(lang.extensions)).toBe(true)
        expect(lang.extensions.length).toBeGreaterThan(0)
      })
    })
  })

  describe('UNSUPPORTED_LANGUAGES', () => {
    it('should have 18 unsupported languages', () => {
      expect(UNSUPPORTED_LANGUAGES).toHaveLength(18)
    })

    it('should not overlap with supported languages', () => {
      const supportedIds = SUPPORTED_LANGUAGES.map(l => l.id)
      const unsupportedIds = UNSUPPORTED_LANGUAGES.map(l => l.id)
      
      unsupportedIds.forEach(id => {
        expect(supportedIds).not.toContain(id)
      })
    })
  })

  describe('getLanguageById', () => {
    it('should return language definition for valid id', () => {
      const result = getLanguageById('javascript')
      
      expect(result).toBeDefined()
      expect(result?.id).toBe('javascript')
      expect(result?.name).toBe('JavaScript')
      expect(result?.extensions).toContain('js')
    })

    it('should return undefined for invalid id', () => {
      const result = getLanguageById('nonexistent')
      expect(result).toBeUndefined()
    })

    it('should return undefined for empty string', () => {
      const result = getLanguageById('')
      expect(result).toBeUndefined()
    })

    it('should be case-sensitive', () => {
      const result = getLanguageById('JavaScript')
      expect(result).toBeUndefined()
    })

    it('should find all supported languages', () => {
      SUPPORTED_LANGUAGES.forEach(lang => {
        const result = getLanguageById(lang.id)
        expect(result).toBeDefined()
        expect(result?.id).toBe(lang.id)
      })
    })
  })

  describe('getLanguageByExtension', () => {
    it('should return language for valid extension', () => {
      const result = getLanguageByExtension('js')
      
      expect(result).toBeDefined()
      expect(result?.id).toBe('javascript')
    })

    it('should handle multiple extensions for same language', () => {
      expect(getLanguageByExtension('js')?.id).toBe('javascript')
      expect(getLanguageByExtension('mjs')?.id).toBe('javascript')
      expect(getLanguageByExtension('cjs')?.id).toBe('javascript')
    })

    it('should return undefined for unknown extension', () => {
      const result = getLanguageByExtension('xyz')
      expect(result).toBeUndefined()
    })

    it('should be case-insensitive', () => {
      expect(getLanguageByExtension('JS')?.id).toBe('javascript')
      expect(getLanguageByExtension('Ts')?.id).toBe('typescript')
      expect(getLanguageByExtension('PY')?.id).toBe('python')
    })

    it('should find TypeScript variants', () => {
      expect(getLanguageByExtension('ts')?.id).toBe('typescript')
      expect(getLanguageByExtension('mts')?.id).toBe('typescript')
      expect(getLanguageByExtension('cts')?.id).toBe('typescript')
    })

    it('should find JSX and TSX', () => {
      expect(getLanguageByExtension('jsx')?.id).toBe('jsx')
      expect(getLanguageByExtension('tsx')?.id).toBe('tsx')
    })

    it('should find markdown extensions', () => {
      expect(getLanguageByExtension('md')?.id).toBe('markdown')
      expect(getLanguageByExtension('markdown')?.id).toBe('markdown')
    })

    it('should find YAML extensions', () => {
      expect(getLanguageByExtension('yaml')?.id).toBe('yaml')
      expect(getLanguageByExtension('yml')?.id).toBe('yaml')
    })

    it('should find C/C++ extensions', () => {
      expect(getLanguageByExtension('c')?.id).toBe('cpp')
      expect(getLanguageByExtension('cpp')?.id).toBe('cpp')
      expect(getLanguageByExtension('h')?.id).toBe('cpp')
      expect(getLanguageByExtension('hpp')?.id).toBe('cpp')
    })

    it('should find XML-related extensions', () => {
      expect(getLanguageByExtension('xml')?.id).toBe('xml')
      expect(getLanguageByExtension('svg')?.id).toBe('xml')
      expect(getLanguageByExtension('xsl')?.id).toBe('xml')
    })

    it('should return undefined for empty string', () => {
      const result = getLanguageByExtension('')
      expect(result).toBeUndefined()
    })
  })
})
