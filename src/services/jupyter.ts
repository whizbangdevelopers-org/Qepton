/**
 * Jupyter Notebook Rendering Service
 * Custom browser-compatible renderer for .ipynb files
 */

import Prism from 'prismjs'
import { renderMarkdown } from './markdown'

import 'prismjs/components/prism-python'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-bash'

interface NotebookCell {
  cell_type: 'code' | 'markdown' | 'raw'
  source: string | string[]
  outputs?: NotebookOutput[]
  execution_count?: number | null
  metadata?: Record<string, unknown>
}

interface NotebookOutput {
  output_type: 'stream' | 'execute_result' | 'display_data' | 'error'
  text?: string | string[]
  data?: Record<string, string | string[]>
  name?: string
  ename?: string
  evalue?: string
  traceback?: string[]
}

interface NotebookData {
  cells: NotebookCell[]
  metadata: {
    kernelspec?: { name: string; display_name: string }
    language_info?: { name: string; version: string }
  }
  nbformat: number
  nbformat_minor: number
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function getSourceText(source: string | string[]): string {
  return Array.isArray(source) ? source.join('') : source
}

function highlightCode(code: string, language: string): string {
  const lang = language.toLowerCase()
  const prismLang = lang === 'python3' ? 'python' : lang

  if (Prism.languages[prismLang]) {
    return Prism.highlight(code, Prism.languages[prismLang], prismLang)
  }
  return escapeHtml(code)
}

function renderOutput(output: NotebookOutput): string {
  switch (output.output_type) {
    case 'stream': {
      const text = getSourceText(output.text || '')
      const className = output.name === 'stderr' ? 'nb-stderr' : 'nb-stdout'
      return `<div class="${className}"><pre>${escapeHtml(text)}</pre></div>`
    }
    case 'execute_result':
    case 'display_data': {
      if (output.data) {
        if (output.data['text/html']) {
          return `<div class="nb-html">${getSourceText(output.data['text/html'])}</div>`
        }
        if (output.data['image/png']) {
          const imgData = getSourceText(output.data['image/png'])
          return `<div class="nb-image"><img src="data:image/png;base64,${imgData}" /></div>`
        }
        if (output.data['image/jpeg']) {
          const imgData = getSourceText(output.data['image/jpeg'])
          return `<div class="nb-image"><img src="data:image/jpeg;base64,${imgData}" /></div>`
        }
        if (output.data['text/plain']) {
          return `<div class="nb-text"><pre>${escapeHtml(getSourceText(output.data['text/plain']))}</pre></div>`
        }
      }
      return ''
    }
    case 'error': {
      const traceback = (output.traceback || []).join('\n')
      return `<div class="nb-error"><pre>${escapeHtml(traceback)}</pre></div>`
    }
    default:
      return ''
  }
}

function renderCell(cell: NotebookCell, language: string): string {
  const source = getSourceText(cell.source)

  switch (cell.cell_type) {
    case 'markdown':
      return `<div class="nb-cell nb-markdown">${renderMarkdown(source)}</div>`

    case 'code': {
      const execCount = cell.execution_count != null ? `[${cell.execution_count}]` : '[ ]'
      const highlighted = highlightCode(source, language)
      const outputs = (cell.outputs || []).map(renderOutput).join('')

      return `
        <div class="nb-cell nb-code">
          <div class="nb-input">
            <span class="nb-prompt nb-in">${execCount}</span>
            <pre><code class="language-${language}">${highlighted}</code></pre>
          </div>
          ${outputs ? `<div class="nb-output">${outputs}</div>` : ''}
        </div>
      `
    }

    case 'raw':
      return `<div class="nb-cell nb-raw"><pre>${escapeHtml(source)}</pre></div>`

    default:
      return ''
  }
}

/**
 * Render a Jupyter Notebook (.ipynb) file
 */
export function renderNotebook(notebookJson: string | object): string {
  try {
    const data: NotebookData =
      typeof notebookJson === 'string' ? JSON.parse(notebookJson) : notebookJson

    const language = data.metadata?.language_info?.name || 'python'
    const cells = data.cells.map(cell => renderCell(cell, language)).join('')

    return `<div class="nb-notebook">${cells}</div>`
  } catch (error) {
    console.error('[Jupyter] Failed to render notebook:', error)
    return `<div class="nb-error">
      <h3>Failed to render Jupyter Notebook</h3>
      <p>The notebook file may be corrupted or in an unsupported format.</p>
      <pre>${error instanceof Error ? error.message : String(error)}</pre>
    </div>`
  }
}

/**
 * Check if content is a Jupyter Notebook
 */
export function isJupyterNotebook(content: string | object): boolean {
  try {
    const data = typeof content === 'string' ? JSON.parse(content) : content

    return (
      typeof data === 'object' &&
      data !== null &&
      'cells' in data &&
      'metadata' in data &&
      'nbformat' in data
    )
  } catch {
    return false
  }
}

/**
 * Check if a filename has Jupyter Notebook extension
 */
export function isJupyterFile(filename: string): boolean {
  return /\.ipynb$/i.test(filename)
}

/**
 * Extract metadata from a Jupyter Notebook
 */
export function extractNotebookMetadata(notebookJson: string | object): {
  kernelspec?: { name: string; display_name: string }
  language_info?: { name: string; version: string }
  nbformat?: number
  nbformat_minor?: number
} {
  try {
    const data = typeof notebookJson === 'string' ? JSON.parse(notebookJson) : notebookJson

    return {
      kernelspec: data.metadata?.kernelspec,
      language_info: data.metadata?.language_info,
      nbformat: data.nbformat,
      nbformat_minor: data.nbformat_minor
    }
  } catch (error) {
    console.error('[Jupyter] Failed to extract metadata:', error)
    return {}
  }
}

/**
 * Count cells in a Jupyter Notebook
 */
export function countCells(notebookJson: string | object): {
  total: number
  code: number
  markdown: number
  raw: number
} {
  try {
    const data = typeof notebookJson === 'string' ? JSON.parse(notebookJson) : notebookJson

    const cells = data.cells || []

    return {
      total: cells.length,
      code: cells.filter((c: { cell_type: string }) => c.cell_type === 'code').length,
      markdown: cells.filter((c: { cell_type: string }) => c.cell_type === 'markdown').length,
      raw: cells.filter((c: { cell_type: string }) => c.cell_type === 'raw').length
    }
  } catch (error) {
    console.error('[Jupyter] Failed to count cells:', error)
    return { total: 0, code: 0, markdown: 0, raw: 0 }
  }
}
