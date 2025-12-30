import { describe, it, expect } from 'vitest'
import {
  renderNotebook,
  isJupyterNotebook,
  isJupyterFile,
  extractNotebookMetadata,
  countCells
} from 'src/services/jupyter'

// Sample notebook data for testing
const sampleNotebook = {
  nbformat: 4,
  nbformat_minor: 5,
  metadata: {
    kernelspec: {
      name: 'python3',
      display_name: 'Python 3'
    },
    language_info: {
      name: 'python',
      version: '3.9.0'
    }
  },
  cells: [
    {
      cell_type: 'markdown',
      metadata: {},
      source: ['# Hello World\n', 'This is a test notebook.']
    },
    {
      cell_type: 'code',
      execution_count: 1,
      metadata: {},
      source: ['print("Hello, World!")'],
      outputs: [
        {
          output_type: 'stream',
          name: 'stdout',
          text: ['Hello, World!\n']
        }
      ]
    },
    {
      cell_type: 'code',
      execution_count: 2,
      metadata: {},
      source: ['x = 1 + 2\n', 'x'],
      outputs: [
        {
          output_type: 'execute_result',
          data: {
            'text/plain': ['3']
          },
          execution_count: 2
        }
      ]
    },
    {
      cell_type: 'raw',
      metadata: {},
      source: ['Raw cell content']
    }
  ]
}

describe('Jupyter Service', () => {
  describe('isJupyterNotebook', () => {
    it('should return true for valid notebook object', () => {
      expect(isJupyterNotebook(sampleNotebook)).toBe(true)
    })

    it('should return true for valid notebook JSON string', () => {
      expect(isJupyterNotebook(JSON.stringify(sampleNotebook))).toBe(true)
    })

    it('should return false for invalid JSON', () => {
      expect(isJupyterNotebook('not valid json')).toBe(false)
    })

    it('should return false for object without required properties', () => {
      expect(isJupyterNotebook({ foo: 'bar' })).toBe(false)
      expect(isJupyterNotebook({ cells: [] })).toBe(false)
      expect(isJupyterNotebook({ metadata: {} })).toBe(false)
    })

    it('should return false for null or undefined', () => {
      expect(isJupyterNotebook(null as unknown as object)).toBe(false)
    })
  })

  describe('isJupyterFile', () => {
    it('should return true for .ipynb files', () => {
      expect(isJupyterFile('notebook.ipynb')).toBe(true)
      expect(isJupyterFile('my-analysis.ipynb')).toBe(true)
      expect(isJupyterFile('path/to/file.ipynb')).toBe(true)
    })

    it('should return true for .IPYNB (case insensitive)', () => {
      expect(isJupyterFile('notebook.IPYNB')).toBe(true)
      expect(isJupyterFile('notebook.IpYnB')).toBe(true)
    })

    it('should return false for non-jupyter files', () => {
      expect(isJupyterFile('script.py')).toBe(false)
      expect(isJupyterFile('notebook.json')).toBe(false)
      expect(isJupyterFile('file.txt')).toBe(false)
      expect(isJupyterFile('ipynb')).toBe(false)
    })

    it('should return false for empty string', () => {
      expect(isJupyterFile('')).toBe(false)
    })

    it('should return false for filenames ending with ipynb but no dot', () => {
      expect(isJupyterFile('notebookipynb')).toBe(false)
    })
  })

  describe('extractNotebookMetadata', () => {
    it('should extract kernelspec from notebook', () => {
      const metadata = extractNotebookMetadata(sampleNotebook)
      expect(metadata.kernelspec).toEqual({
        name: 'python3',
        display_name: 'Python 3'
      })
    })

    it('should extract language_info from notebook', () => {
      const metadata = extractNotebookMetadata(sampleNotebook)
      expect(metadata.language_info).toEqual({
        name: 'python',
        version: '3.9.0'
      })
    })

    it('should extract nbformat version', () => {
      const metadata = extractNotebookMetadata(sampleNotebook)
      expect(metadata.nbformat).toBe(4)
      expect(metadata.nbformat_minor).toBe(5)
    })

    it('should handle notebook as JSON string', () => {
      const metadata = extractNotebookMetadata(JSON.stringify(sampleNotebook))
      expect(metadata.kernelspec?.name).toBe('python3')
    })

    it('should return empty object for invalid input', () => {
      const metadata = extractNotebookMetadata('invalid json')
      expect(metadata).toEqual({})
    })
  })

  describe('countCells', () => {
    it('should count total cells', () => {
      const counts = countCells(sampleNotebook)
      expect(counts.total).toBe(4)
    })

    it('should count code cells', () => {
      const counts = countCells(sampleNotebook)
      expect(counts.code).toBe(2)
    })

    it('should count markdown cells', () => {
      const counts = countCells(sampleNotebook)
      expect(counts.markdown).toBe(1)
    })

    it('should count raw cells', () => {
      const counts = countCells(sampleNotebook)
      expect(counts.raw).toBe(1)
    })

    it('should handle notebook as JSON string', () => {
      const counts = countCells(JSON.stringify(sampleNotebook))
      expect(counts.total).toBe(4)
    })

    it('should return zeros for invalid input', () => {
      const counts = countCells('invalid json')
      expect(counts).toEqual({ total: 0, code: 0, markdown: 0, raw: 0 })
    })

    it('should handle empty cells array', () => {
      const emptyNotebook = { ...sampleNotebook, cells: [] }
      const counts = countCells(emptyNotebook)
      expect(counts.total).toBe(0)
    })
  })

  describe('renderNotebook', () => {
    it('should render notebook to HTML string', () => {
      const html = renderNotebook(sampleNotebook)
      expect(typeof html).toBe('string')
      expect(html.length).toBeGreaterThan(0)
    })

    it('should include notebook content in rendered HTML', () => {
      const html = renderNotebook(sampleNotebook)
      // Should contain the markdown heading
      expect(html).toContain('Hello World')
      // Should contain the code output
      expect(html).toContain('Hello, World!')
    })

    it('should handle notebook as JSON string', () => {
      const html = renderNotebook(JSON.stringify(sampleNotebook))
      expect(typeof html).toBe('string')
      expect(html.length).toBeGreaterThan(0)
    })

    it('should return error HTML for invalid notebook', () => {
      const html = renderNotebook('invalid json')
      expect(html).toContain('Failed to render')
      expect(html).toContain('error')
    })

    it('should render multiple cells', () => {
      const html = renderNotebook(sampleNotebook)
      // Check for presence of different cell types
      expect(html).toContain('Hello World')  // markdown
      expect(html).toContain('print')  // code
    })
  })
})
