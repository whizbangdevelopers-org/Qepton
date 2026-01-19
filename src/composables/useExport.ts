/**
 * Export Composable
 * Provides functionality to export gists in various formats (JSON, Markdown, ZIP)
 */

import { ref } from 'vue'
import { useQuasar } from 'quasar'
import type { Gist, GistFile } from 'src/types/github'

export interface ExportOptions {
  format: 'json' | 'markdown' | 'zip'
  includeMetadata?: boolean
  includeContent?: boolean
}

export interface ExportResult {
  filename: string
  content: string | Blob
  mimeType: string
}

export function useExport() {
  const $q = useQuasar()
  const isExporting = ref(false)

  /**
   * Export a single gist to JSON format
   */
  function exportGistToJSON(gist: Gist, includeMetadata = true): ExportResult {
    const data = includeMetadata
      ? {
          id: gist.id,
          description: gist.description,
          public: gist.public,
          created_at: gist.created_at,
          updated_at: gist.updated_at,
          files: gist.files,
          owner: {
            login: gist.owner?.login,
            avatar_url: gist.owner?.avatar_url
          },
          html_url: gist.html_url
        }
      : {
          description: gist.description,
          files: Object.fromEntries(
            Object.entries(gist.files).map(([name, file]: [string, GistFile]) => [
              name,
              { filename: file.filename, content: file.content }
            ])
          )
        }

    return {
      filename: `gist-${gist.id}.json`,
      content: JSON.stringify(data, null, 2),
      mimeType: 'application/json'
    }
  }

  /**
   * Export a single gist to Markdown format
   */
  function exportGistToMarkdown(gist: Gist, includeMetadata = true): ExportResult {
    const lines: string[] = []

    // Title from description
    const title = gist.description || 'Untitled Gist'
    lines.push(`# ${title}`)
    lines.push('')

    // Metadata section
    if (includeMetadata) {
      lines.push('## Metadata')
      lines.push('')
      lines.push(`- **ID:** ${gist.id}`)
      lines.push(`- **Public:** ${gist.public ? 'Yes' : 'No'}`)
      lines.push(`- **Created:** ${new Date(gist.created_at).toLocaleString()}`)
      lines.push(`- **Updated:** ${new Date(gist.updated_at).toLocaleString()}`)
      if (gist.owner) {
        lines.push(`- **Owner:** ${gist.owner.login}`)
      }
      lines.push(`- **URL:** ${gist.html_url}`)
      lines.push('')
    }

    // Files section
    lines.push('## Files')
    lines.push('')

    Object.values(gist.files).forEach((file: GistFile) => {
      lines.push(`### ${file.filename}`)
      lines.push('')

      // Determine language for code block
      const language = file.language?.toLowerCase() || ''

      if (file.content) {
        lines.push('```' + language)
        lines.push(file.content)
        lines.push('```')
      } else {
        lines.push('*Content not loaded*')
      }
      lines.push('')
    })

    return {
      filename: `gist-${gist.id}.md`,
      content: lines.join('\n'),
      mimeType: 'text/markdown'
    }
  }

  /**
   * Export multiple gists to a single JSON file
   */
  function exportGistsToJSON(gists: Gist[], includeMetadata = true): ExportResult {
    const data = gists.map(gist => {
      if (includeMetadata) {
        return {
          id: gist.id,
          description: gist.description,
          public: gist.public,
          created_at: gist.created_at,
          updated_at: gist.updated_at,
          files: gist.files,
          owner: gist.owner
            ? {
                login: gist.owner.login,
                avatar_url: gist.owner.avatar_url
              }
            : undefined,
          html_url: gist.html_url
        }
      }
      return {
        description: gist.description,
        files: Object.fromEntries(
          Object.entries(gist.files).map(([name, file]: [string, GistFile]) => [
            name,
            { filename: file.filename, content: file.content }
          ])
        )
      }
    })

    const timestamp = new Date().toISOString().split('T')[0]

    return {
      filename: `gists-export-${timestamp}.json`,
      content: JSON.stringify(
        { gists: data, exportedAt: new Date().toISOString(), count: gists.length },
        null,
        2
      ),
      mimeType: 'application/json'
    }
  }

  /**
   * Export multiple gists to a single Markdown file
   */
  function exportGistsToMarkdown(gists: Gist[], includeMetadata = true): ExportResult {
    const lines: string[] = []
    const timestamp = new Date().toISOString().split('T')[0]

    lines.push('# Gists Export')
    lines.push('')
    lines.push(`**Exported:** ${new Date().toLocaleString()}`)
    lines.push(`**Total Gists:** ${gists.length}`)
    lines.push('')
    lines.push('---')
    lines.push('')

    // Table of contents
    lines.push('## Table of Contents')
    lines.push('')
    gists.forEach((gist, index) => {
      const title = gist.description || 'Untitled Gist'
      lines.push(`${index + 1}. [${title}](#gist-${index + 1})`)
    })
    lines.push('')
    lines.push('---')
    lines.push('')

    // Individual gists
    gists.forEach((gist, index) => {
      const title = gist.description || 'Untitled Gist'
      lines.push(`## Gist ${index + 1}: ${title} {#gist-${index + 1}}`)
      lines.push('')

      if (includeMetadata) {
        lines.push(`- **ID:** ${gist.id}`)
        lines.push(`- **Public:** ${gist.public ? 'Yes' : 'No'}`)
        lines.push(`- **Created:** ${new Date(gist.created_at).toLocaleString()}`)
        lines.push(`- **URL:** ${gist.html_url}`)
        lines.push('')
      }

      // Files
      Object.values(gist.files).forEach((file: GistFile) => {
        lines.push(`### ${file.filename}`)
        lines.push('')
        const language = file.language?.toLowerCase() || ''
        if (file.content) {
          lines.push('```' + language)
          lines.push(file.content)
          lines.push('```')
        } else {
          lines.push('*Content not loaded*')
        }
        lines.push('')
      })

      lines.push('---')
      lines.push('')
    })

    return {
      filename: `gists-export-${timestamp}.md`,
      content: lines.join('\n'),
      mimeType: 'text/markdown'
    }
  }

  /**
   * Download a file to the user's device
   */
  function downloadFile(result: ExportResult): void {
    const blob =
      result.content instanceof Blob
        ? result.content
        : new Blob([result.content], { type: result.mimeType })

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = result.filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  /**
   * Export and download a single gist
   */
  async function exportGist(gist: Gist, options: ExportOptions): Promise<void> {
    isExporting.value = true

    try {
      let result: ExportResult

      switch (options.format) {
        case 'json':
          result = exportGistToJSON(gist, options.includeMetadata ?? true)
          break
        case 'markdown':
          result = exportGistToMarkdown(gist, options.includeMetadata ?? true)
          break
        default:
          throw new Error(`Unsupported export format: ${options.format}`)
      }

      downloadFile(result)

      $q.notify({
        type: 'positive',
        message: `Exported gist as ${options.format.toUpperCase()}`,
        icon: 'download'
      })
    } catch (error) {
      console.error('[Export] Failed to export gist:', error)
      $q.notify({
        type: 'negative',
        message: 'Failed to export gist',
        icon: 'error'
      })
    } finally {
      isExporting.value = false
    }
  }

  /**
   * Export and download multiple gists
   */
  async function exportGists(gists: Gist[], options: ExportOptions): Promise<void> {
    if (gists.length === 0) {
      $q.notify({
        type: 'warning',
        message: 'No gists to export',
        icon: 'warning'
      })
      return
    }

    isExporting.value = true

    try {
      let result: ExportResult

      switch (options.format) {
        case 'json':
          result = exportGistsToJSON(gists, options.includeMetadata ?? true)
          break
        case 'markdown':
          result = exportGistsToMarkdown(gists, options.includeMetadata ?? true)
          break
        default:
          throw new Error(`Unsupported export format: ${options.format}`)
      }

      downloadFile(result)

      $q.notify({
        type: 'positive',
        message: `Exported ${gists.length} gists as ${options.format.toUpperCase()}`,
        icon: 'download'
      })
    } catch (error) {
      console.error('[Export] Failed to export gists:', error)
      $q.notify({
        type: 'negative',
        message: 'Failed to export gists',
        icon: 'error'
      })
    } finally {
      isExporting.value = false
    }
  }

  /**
   * Copy gist content to clipboard
   */
  async function copyToClipboard(
    content: string,
    message = 'Copied to clipboard'
  ): Promise<boolean> {
    try {
      if ('clipboard' in navigator) {
        await navigator.clipboard.writeText(content)
        $q.notify({
          type: 'positive',
          message,
          icon: 'content_copy',
          timeout: 2000
        })
        return true
      }
      return false
    } catch (error) {
      console.error('[Export] Failed to copy to clipboard:', error)
      $q.notify({
        type: 'negative',
        message: 'Failed to copy to clipboard',
        icon: 'error'
      })
      return false
    }
  }

  /**
   * Copy a single file's content to clipboard
   */
  async function copyFileContent(file: GistFile): Promise<boolean> {
    if (!file.content) {
      $q.notify({
        type: 'warning',
        message: 'File content not loaded',
        icon: 'warning'
      })
      return false
    }
    return copyToClipboard(file.content, `Copied ${file.filename}`)
  }

  /**
   * Copy gist as JSON to clipboard
   */
  async function copyGistAsJSON(gist: Gist): Promise<boolean> {
    const result = exportGistToJSON(gist, false)
    return copyToClipboard(result.content as string, 'Copied gist as JSON')
  }

  /**
   * Copy gist as Markdown to clipboard
   */
  async function copyGistAsMarkdown(gist: Gist): Promise<boolean> {
    const result = exportGistToMarkdown(gist, false)
    return copyToClipboard(result.content as string, 'Copied gist as Markdown')
  }

  return {
    // State
    isExporting,

    // Single gist exports
    exportGist,
    exportGistToJSON,
    exportGistToMarkdown,

    // Multiple gists exports
    exportGists,
    exportGistsToJSON,
    exportGistsToMarkdown,

    // Clipboard operations
    copyToClipboard,
    copyFileContent,
    copyGistAsJSON,
    copyGistAsMarkdown,

    // Utilities
    downloadFile
  }
}
