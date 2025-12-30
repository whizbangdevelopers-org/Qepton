export interface LanguageDefinition {
  id: string
  name: string
  extensions: string[]
}

export const SUPPORTED_LANGUAGES: LanguageDefinition[] = [
  { id: 'javascript', name: 'JavaScript', extensions: ['js', 'mjs', 'cjs'] },
  { id: 'typescript', name: 'TypeScript', extensions: ['ts', 'mts', 'cts'] },
  { id: 'jsx', name: 'JSX', extensions: ['jsx'] },
  { id: 'tsx', name: 'TSX', extensions: ['tsx'] },
  { id: 'python', name: 'Python', extensions: ['py', 'pyw'] },
  { id: 'java', name: 'Java', extensions: ['java'] },
  { id: 'json', name: 'JSON', extensions: ['json', 'jsonc'] },
  { id: 'html', name: 'HTML', extensions: ['html', 'htm'] },
  { id: 'css', name: 'CSS', extensions: ['css'] },
  { id: 'scss', name: 'SCSS', extensions: ['scss'] },
  { id: 'sass', name: 'Sass', extensions: ['sass'] },
  { id: 'less', name: 'Less', extensions: ['less'] },
  { id: 'markdown', name: 'Markdown', extensions: ['md', 'markdown'] },
  { id: 'sql', name: 'SQL', extensions: ['sql'] },
  { id: 'yaml', name: 'YAML', extensions: ['yaml', 'yml'] },
  { id: 'go', name: 'Go', extensions: ['go'] },
  { id: 'rust', name: 'Rust', extensions: ['rs'] },
  { id: 'cpp', name: 'C/C++', extensions: ['c', 'h', 'cpp', 'cc', 'cxx', 'hpp', 'hxx'] },
  { id: 'php', name: 'PHP', extensions: ['php'] },
  { id: 'vue', name: 'Vue', extensions: ['vue'] },
  { id: 'xml', name: 'XML', extensions: ['xml', 'svg', 'xsl', 'xslt'] },
  { id: 'wast', name: 'WebAssembly', extensions: ['wast', 'wat'] },
  { id: 'nix', name: 'Nix', extensions: ['nix'] },
  { id: 'liquid', name: 'Liquid', extensions: ['liquid'] },
  { id: 'angular', name: 'Angular', extensions: ['ng'] }
]

export const UNSUPPORTED_LANGUAGES: LanguageDefinition[] = [
  { id: 'shell', name: 'Shell/Bash', extensions: ['sh', 'bash', 'zsh'] },
  { id: 'ruby', name: 'Ruby', extensions: ['rb'] },
  { id: 'swift', name: 'Swift', extensions: ['swift'] },
  { id: 'kotlin', name: 'Kotlin', extensions: ['kt', 'kts'] },
  { id: 'scala', name: 'Scala', extensions: ['scala'] },
  { id: 'r', name: 'R', extensions: ['r'] },
  { id: 'lua', name: 'Lua', extensions: ['lua'] },
  { id: 'perl', name: 'Perl', extensions: ['perl', 'pl'] },
  { id: 'haskell', name: 'Haskell', extensions: ['hs'] },
  { id: 'elixir', name: 'Elixir', extensions: ['ex', 'exs'] },
  { id: 'clojure', name: 'Clojure', extensions: ['clj', 'cljs'] },
  { id: 'dart', name: 'Dart', extensions: ['dart'] },
  { id: 'groovy', name: 'Groovy', extensions: ['groovy'] },
  { id: 'powershell', name: 'PowerShell', extensions: ['ps1', 'psm1'] },
  { id: 'dockerfile', name: 'Dockerfile', extensions: ['dockerfile'] },
  { id: 'toml', name: 'TOML', extensions: ['toml'] },
  { id: 'graphql', name: 'GraphQL', extensions: ['graphql', 'gql'] },
  { id: 'protobuf', name: 'Protocol Buffers', extensions: ['proto'] }
]

export function getLanguageById(id: string): LanguageDefinition | undefined {
  return SUPPORTED_LANGUAGES.find(lang => lang.id === id)
}

export function getLanguageByExtension(ext: string): LanguageDefinition | undefined {
  return SUPPORTED_LANGUAGES.find(lang => lang.extensions.includes(ext.toLowerCase()))
}
