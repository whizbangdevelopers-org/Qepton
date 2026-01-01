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
  { id: 'angular', name: 'Angular', extensions: ['ng'] },
  { id: 'shell', name: 'Shell/Bash', extensions: ['sh', 'bash', 'zsh'] },
  { id: 'ruby', name: 'Ruby', extensions: ['rb'] },
  { id: 'swift', name: 'Swift', extensions: ['swift'] },
  { id: 'kotlin', name: 'Kotlin', extensions: ['kt', 'kts'] },
  { id: 'scala', name: 'Scala', extensions: ['scala'] },
  { id: 'r', name: 'R', extensions: ['r', 'R'] },
  { id: 'lua', name: 'Lua', extensions: ['lua'] },
  { id: 'perl', name: 'Perl', extensions: ['perl', 'pl', 'pm'] },
  { id: 'haskell', name: 'Haskell', extensions: ['hs', 'lhs'] },
  { id: 'erlang', name: 'Erlang', extensions: ['erl', 'hrl'] },
  { id: 'clojure', name: 'Clojure', extensions: ['clj', 'cljs', 'cljc', 'edn'] },
  { id: 'dart', name: 'Dart', extensions: ['dart'] },
  { id: 'groovy', name: 'Groovy', extensions: ['groovy', 'gradle'] },
  { id: 'powershell', name: 'PowerShell', extensions: ['ps1', 'psm1', 'psd1'] },
  { id: 'dockerfile', name: 'Dockerfile', extensions: ['dockerfile', 'Dockerfile'] },
  { id: 'toml', name: 'TOML', extensions: ['toml'] },
  { id: 'protobuf', name: 'Protocol Buffers', extensions: ['proto'] },
  { id: 'csharp', name: 'C#', extensions: ['cs'] },
  { id: 'lisp', name: 'Common Lisp', extensions: ['lisp', 'lsp', 'cl'] },
  { id: 'scheme', name: 'Scheme', extensions: ['scm', 'ss'] },
  { id: 'fortran', name: 'Fortran', extensions: ['f', 'f90', 'f95', 'f03', 'for'] },
  { id: 'cobol', name: 'COBOL', extensions: ['cob', 'cbl', 'cobol'] },
  { id: 'pascal', name: 'Pascal', extensions: ['pas', 'pp'] },
  { id: 'diff', name: 'Diff', extensions: ['diff', 'patch'] },
  { id: 'nginx', name: 'Nginx', extensions: ['conf', 'nginx'] }
]

export const UNSUPPORTED_LANGUAGES: LanguageDefinition[] = [
  { id: 'elixir', name: 'Elixir', extensions: ['ex', 'exs'] },
  { id: 'graphql', name: 'GraphQL', extensions: ['graphql', 'gql'] },
  { id: 'julia', name: 'Julia', extensions: ['jl'] },
  { id: 'ocaml', name: 'OCaml', extensions: ['ml', 'mli'] },
  { id: 'fsharp', name: 'F#', extensions: ['fs', 'fsi', 'fsx'] },
  { id: 'zig', name: 'Zig', extensions: ['zig'] },
  { id: 'nim', name: 'Nim', extensions: ['nim'] },
  { id: 'crystal', name: 'Crystal', extensions: ['cr'] },
  { id: 'v', name: 'V', extensions: ['v'] },
  { id: 'solidity', name: 'Solidity', extensions: ['sol'] }
]

export function getLanguageById(id: string): LanguageDefinition | undefined {
  return SUPPORTED_LANGUAGES.find(lang => lang.id === id)
}

export function getLanguageByExtension(ext: string): LanguageDefinition | undefined {
  return SUPPORTED_LANGUAGES.find(lang => lang.extensions.includes(ext.toLowerCase()))
}
