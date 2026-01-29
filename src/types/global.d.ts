/**
 * Global Type Declarations
 */

declare const __APP_VERSION__: string

/**
 * Vite Environment Variables
 */
interface ImportMetaEnv {
  readonly VITE_DEMO_MODE?: string
  readonly VITE_DEMO_GITHUB_TOKEN?: string
  readonly VITE_DEMO_TOKEN_B64?: string
  readonly VITE_DEMO_TOKEN_P1?: string
  readonly VITE_DEMO_TOKEN_P2?: string
  readonly VITE_DEMO_CONFIG_GIST_ID?: string
  readonly VITE_HCAPTCHA_SITEKEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.svg' {
  const src: string
  export default src
}

declare module 'markdown-it-task-lists' {
  import type MarkdownIt from 'markdown-it'
  const plugin: MarkdownIt.PluginSimple
  export default plugin
}

declare module '@vscode/markdown-it-katex' {
  import type MarkdownIt from 'markdown-it'
  const plugin: MarkdownIt.PluginSimple
  export default plugin
}

declare module 'twitter-text' {
  export function extractHashtags(text: string): string[]
  export function extractHashtagsWithIndices(
    text: string
  ): Array<{ hashtag: string; indices: [number, number] }>
}
