/**
 * Code Formatter Service
 * Uses Prettier to format code in the browser
 */

import * as prettier from 'prettier/standalone'
import prettierPluginBabel from 'prettier/plugins/babel'
import prettierPluginEstree from 'prettier/plugins/estree'
import prettierPluginHtml from 'prettier/plugins/html'
import prettierPluginCss from 'prettier/plugins/postcss'
import prettierPluginMarkdown from 'prettier/plugins/markdown'
import prettierPluginYaml from 'prettier/plugins/yaml'
import prettierPluginTypeScript from 'prettier/plugins/typescript'

// Parser mapping based on file extension or language
const PARSER_MAP: Record<string, string> = {
  // JavaScript/TypeScript
  js: 'babel',
  jsx: 'babel',
  ts: 'typescript',
  tsx: 'typescript',
  mjs: 'babel',
  cjs: 'babel',

  // Web
  html: 'html',
  htm: 'html',
  vue: 'vue',
  css: 'css',
  scss: 'scss',
  less: 'less',

  // Data formats
  json: 'json',
  yaml: 'yaml',
  yml: 'yaml',

  // Documentation
  md: 'markdown',
  markdown: 'markdown'
}

// Language name to parser mapping (for GitHub Gist language field)
const LANGUAGE_PARSER_MAP: Record<string, string> = {
  javascript: 'babel',
  typescript: 'typescript',
  html: 'html',
  css: 'css',
  scss: 'scss',
  less: 'less',
  json: 'json',
  yaml: 'yaml',
  markdown: 'markdown',
  vue: 'vue'
}

// All plugins needed for formatting
const plugins = [
  prettierPluginBabel,
  prettierPluginEstree,
  prettierPluginHtml,
  prettierPluginCss,
  prettierPluginMarkdown,
  prettierPluginYaml,
  prettierPluginTypeScript
]

export interface FormatResult {
  success: boolean
  formatted?: string
  error?: string
}

/**
 * Get the Prettier parser for a given filename or language
 */
export function getParser(filename: string, language?: string): string | null {
  // Try by file extension first
  const ext = filename.split('.').pop()?.toLowerCase()
  if (ext && PARSER_MAP[ext]) {
    return PARSER_MAP[ext]
  }

  // Try by language name
  if (language) {
    const langLower = language.toLowerCase()
    if (LANGUAGE_PARSER_MAP[langLower]) {
      return LANGUAGE_PARSER_MAP[langLower]
    }
  }

  return null
}

/**
 * Check if a file can be formatted
 */
export function canFormat(filename: string, language?: string): boolean {
  return getParser(filename, language) !== null
}

/**
 * Format code using Prettier
 */
export async function formatCode(
  code: string,
  filename: string,
  language?: string
): Promise<FormatResult> {
  const parser = getParser(filename, language)

  if (!parser) {
    return {
      success: false,
      error: `No formatter available for this file type`
    }
  }

  try {
    const formatted = await prettier.format(code, {
      parser,
      plugins,
      // Default options matching .prettierrc.json
      semi: false,
      singleQuote: true,
      tabWidth: 2,
      trailingComma: 'none',
      printWidth: 100,
      bracketSpacing: true,
      arrowParens: 'avoid',
      endOfLine: 'lf'
    })

    return {
      success: true,
      formatted
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Formatter] Format error:', message)
    return {
      success: false,
      error: message
    }
  }
}

/**
 * Get supported file extensions
 */
export function getSupportedExtensions(): string[] {
  return Object.keys(PARSER_MAP)
}

/**
 * Get supported languages
 */
export function getSupportedLanguages(): string[] {
  return Object.keys(LANGUAGE_PARSER_MAP)
}
