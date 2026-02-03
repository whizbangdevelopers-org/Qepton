import { describe, it, expect } from 'vitest'
import {
  extensionToLanguageMap,
  getLanguageFromFilename,
  getExtensionFromFilename,
  isMarkdownFile
} from 'src/utils/languageDetection'

describe('Language Detection Utils', () => {
  describe('extensionToLanguageMap', () => {
    it('should have mappings for common extensions', () => {
      expect(extensionToLanguageMap['js']).toBe('javascript')
      expect(extensionToLanguageMap['ts']).toBe('typescript')
      expect(extensionToLanguageMap['py']).toBe('python')
      expect(extensionToLanguageMap['go']).toBe('go')
      expect(extensionToLanguageMap['rs']).toBe('rust')
    })

    it('should map jsx and tsx separately', () => {
      expect(extensionToLanguageMap['jsx']).toBe('jsx')
      expect(extensionToLanguageMap['tsx']).toBe('tsx')
    })

    it('should map C/C++ extensions to cpp', () => {
      expect(extensionToLanguageMap['c']).toBe('cpp')
      expect(extensionToLanguageMap['cpp']).toBe('cpp')
      expect(extensionToLanguageMap['h']).toBe('cpp')
      expect(extensionToLanguageMap['hpp']).toBe('cpp')
    })
  })

  describe('getLanguageFromFilename', () => {
    it('should detect JavaScript files', () => {
      expect(getLanguageFromFilename('app.js')).toBe('javascript')
      expect(getLanguageFromFilename('module.mjs')).toBe('javascript')
      expect(getLanguageFromFilename('config.cjs')).toBe('javascript')
    })

    it('should detect TypeScript files', () => {
      expect(getLanguageFromFilename('app.ts')).toBe('typescript')
      expect(getLanguageFromFilename('module.mts')).toBe('typescript')
      expect(getLanguageFromFilename('config.cts')).toBe('typescript')
    })

    it('should detect JSX and TSX files', () => {
      expect(getLanguageFromFilename('Component.jsx')).toBe('jsx')
      expect(getLanguageFromFilename('Component.tsx')).toBe('tsx')
    })

    it('should detect Python files', () => {
      expect(getLanguageFromFilename('script.py')).toBe('python')
      expect(getLanguageFromFilename('gui.pyw')).toBe('python')
    })

    it('should detect markup files', () => {
      expect(getLanguageFromFilename('index.html')).toBe('html')
      expect(getLanguageFromFilename('page.htm')).toBe('html')
      expect(getLanguageFromFilename('styles.css')).toBe('css')
      expect(getLanguageFromFilename('styles.scss')).toBe('scss')
      expect(getLanguageFromFilename('styles.sass')).toBe('sass')
      expect(getLanguageFromFilename('styles.less')).toBe('less')
    })

    it('should detect markdown files', () => {
      expect(getLanguageFromFilename('README.md')).toBe('markdown')
      expect(getLanguageFromFilename('doc.markdown')).toBe('markdown')
    })

    it('should detect data format files', () => {
      expect(getLanguageFromFilename('data.json')).toBe('json')
      expect(getLanguageFromFilename('config.yaml')).toBe('yaml')
      expect(getLanguageFromFilename('config.yml')).toBe('yaml')
      expect(getLanguageFromFilename('query.sql')).toBe('sql')
    })

    it('should detect systems programming languages', () => {
      expect(getLanguageFromFilename('main.go')).toBe('go')
      expect(getLanguageFromFilename('main.rs')).toBe('rust')
      expect(getLanguageFromFilename('main.c')).toBe('cpp')
      expect(getLanguageFromFilename('main.cpp')).toBe('cpp')
    })

    it('should detect framework-specific files', () => {
      expect(getLanguageFromFilename('App.vue')).toBe('vue')
      expect(getLanguageFromFilename('template.liquid')).toBe('liquid')
      expect(getLanguageFromFilename('config.nix')).toBe('nix')
    })

    it('should detect XML-related files', () => {
      expect(getLanguageFromFilename('data.xml')).toBe('xml')
      expect(getLanguageFromFilename('icon.svg')).toBe('xml')
      expect(getLanguageFromFilename('style.xsl')).toBe('xml')
    })

    it('should handle case-insensitive extensions', () => {
      expect(getLanguageFromFilename('app.JS')).toBe('javascript')
      expect(getLanguageFromFilename('app.Ts')).toBe('typescript')
      expect(getLanguageFromFilename('README.MD')).toBe('markdown')
    })

    it('should return empty string for unknown extensions', () => {
      expect(getLanguageFromFilename('file.xyz')).toBe('')
      expect(getLanguageFromFilename('file.unknown')).toBe('')
    })

    it('should return empty string for files without extension', () => {
      expect(getLanguageFromFilename('Makefile')).toBe('')
      expect(getLanguageFromFilename('Dockerfile')).toBe('')
    })

    it('should handle multiple dots in filename', () => {
      expect(getLanguageFromFilename('app.test.ts')).toBe('typescript')
      expect(getLanguageFromFilename('styles.module.css')).toBe('css')
      expect(getLanguageFromFilename('config.prod.json')).toBe('json')
    })

    it('should handle empty filename', () => {
      expect(getLanguageFromFilename('')).toBe('')
    })
  })

  describe('getExtensionFromFilename', () => {
    it('should extract extension from filename', () => {
      expect(getExtensionFromFilename('app.js')).toBe('js')
      expect(getExtensionFromFilename('styles.css')).toBe('css')
    })

    it('should return lowercase extension', () => {
      expect(getExtensionFromFilename('app.JS')).toBe('js')
      expect(getExtensionFromFilename('README.MD')).toBe('md')
    })

    it('should get last extension for multiple dots', () => {
      expect(getExtensionFromFilename('app.test.ts')).toBe('ts')
      expect(getExtensionFromFilename('file.tar.gz')).toBe('gz')
    })

    it('should return empty string for no extension', () => {
      expect(getExtensionFromFilename('Makefile')).toBe('makefile')
      expect(getExtensionFromFilename('')).toBe('')
    })
  })

  describe('isMarkdownFile', () => {
    it('should return true for .md files', () => {
      expect(isMarkdownFile('README.md')).toBe(true)
      expect(isMarkdownFile('docs/guide.md')).toBe(true)
    })

    it('should return true for .markdown files', () => {
      expect(isMarkdownFile('README.markdown')).toBe(true)
    })

    it('should be case-insensitive', () => {
      expect(isMarkdownFile('README.MD')).toBe(true)
      expect(isMarkdownFile('file.Markdown')).toBe(true)
    })

    it('should return false for non-markdown files', () => {
      expect(isMarkdownFile('app.js')).toBe(false)
      expect(isMarkdownFile('styles.css')).toBe(false)
      expect(isMarkdownFile('data.json')).toBe(false)
    })

    it('should return false for files without extension', () => {
      expect(isMarkdownFile('Makefile')).toBe(false)
    })
  })
})
