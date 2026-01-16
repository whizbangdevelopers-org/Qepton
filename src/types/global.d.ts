/**
 * Global Type Declarations
 */

declare const __APP_VERSION__: string

declare module '*.svg' {
  const src: string
  export default src
}

declare module 'markdown-it-task-lists' {
  import type MarkdownIt from 'markdown-it'
  const plugin: MarkdownIt.PluginSimple
  export default plugin
}

declare module 'markdown-it-katex' {
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
