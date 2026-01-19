/**
 * Markdown Rendering Service
 * Uses markdown-it with syntax highlighting, task lists, and KaTeX math support
 */

import MarkdownIt from 'markdown-it'
import MdTaskList from 'markdown-it-task-lists'
import MdKatex from '@vscode/markdown-it-katex'
import hljs from 'highlight.js'

/**
 * Configure markdown-it instance
 */
const md = new MarkdownIt({
  html: false, // Disable HTML tags for security
  linkify: true, // Auto-convert URLs to links
  typographer: true, // Enable smartquotes and other typographic replacements
  breaks: false, // Don't convert '\n' to <br>

  // Syntax highlighting function
  highlight: (code: string, language: string) => {
    if (language && hljs.getLanguage(language)) {
      try {
        return hljs.highlight(code, { language }).value
      } catch (error) {
        console.warn(`[Markdown] Failed to highlight code as ${language}:`, error)
      }
    }

    // Fallback to auto-detection
    try {
      return hljs.highlightAuto(code).value
    } catch (error) {
      console.warn('[Markdown] Failed to auto-highlight code:', error)
      return code
    }
  }
})

// Add plugins
md.use(MdTaskList, {
  enabled: true,
  label: true,
  labelAfter: true
})

md.use(MdKatex, {
  throwOnError: false,
  errorColor: '#cc0000'
})

/**
 * Render markdown string to HTML
 *
 * @param markdown - The markdown string to render
 * @returns Rendered HTML string
 */
export function renderMarkdown(markdown: string): string {
  if (!markdown || markdown.trim().length === 0) {
    return ''
  }

  try {
    return md.render(markdown)
  } catch (error) {
    console.error('[Markdown] Rendering failed:', error)
    return '<pre class="error">Failed to render markdown</pre>'
  }
}

/**
 * Render inline markdown (without wrapping in <p> tags)
 *
 * @param markdown - The markdown string to render
 * @returns Rendered HTML string
 */
export function renderInlineMarkdown(markdown: string): string {
  if (!markdown || markdown.trim().length === 0) {
    return ''
  }

  try {
    return md.renderInline(markdown)
  } catch (error) {
    console.error('[Markdown] Inline rendering failed:', error)
    return markdown
  }
}

/**
 * Extract plain text from markdown (strip formatting)
 *
 * @param markdown - The markdown string
 * @returns Plain text
 */
export function stripMarkdown(markdown: string): string {
  const html = renderMarkdown(markdown)

  // Create a temporary DOM element to extract text
  const temp = document.createElement('div')
  temp.innerHTML = html

  return temp.textContent || temp.innerText || ''
}

/**
 * Check if content is likely markdown
 *
 * @param content - Content to check
 * @returns True if content appears to be markdown
 */
export function isMarkdown(content: string): boolean {
  if (!content) return false

  // Check for common markdown patterns
  const markdownPatterns = [
    /^#{1,6}\s/m, // Headers
    /\[.+\]\(.+\)/, // Links
    /!\[.+\]\(.+\)/, // Images
    /```/, // Code blocks
    /^\s*[-*+]\s/m, // Unordered lists
    /^\s*\d+\.\s/m, // Ordered lists
    /\*\*.+\*\*/, // Bold
    /\*.+\*/, // Italic
    /~~.+~~/ // Strikethrough
  ]

  return markdownPatterns.some(pattern => pattern.test(content))
}

// Export the configured instance for advanced usage
export { md as markdownIt }
