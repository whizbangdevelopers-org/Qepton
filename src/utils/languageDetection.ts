export const extensionToLanguageMap: Record<string, string> = {
  js: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  jsx: 'jsx',
  ts: 'typescript',
  mts: 'typescript',
  cts: 'typescript',
  tsx: 'tsx',
  py: 'python',
  pyw: 'python',
  java: 'java',
  json: 'json',
  jsonc: 'json',
  html: 'html',
  htm: 'html',
  css: 'css',
  scss: 'scss',
  sass: 'sass',
  less: 'less',
  md: 'markdown',
  markdown: 'markdown',
  sql: 'sql',
  yaml: 'yaml',
  yml: 'yaml',
  go: 'go',
  rs: 'rust',
  c: 'cpp',
  h: 'cpp',
  cpp: 'cpp',
  cc: 'cpp',
  cxx: 'cpp',
  hpp: 'cpp',
  hxx: 'cpp',
  php: 'php',
  vue: 'vue',
  xml: 'xml',
  svg: 'xml',
  xsl: 'xml',
  xslt: 'xml',
  wast: 'wast',
  wat: 'wast',
  nix: 'nix',
  liquid: 'liquid',
  svelte: 'html',
  angular: 'angular',
  ng: 'angular',
  sh: 'shell',
  bash: 'shell',
  zsh: 'shell',
  rb: 'ruby',
  swift: 'swift',
  kt: 'kotlin',
  kts: 'kotlin',
  scala: 'scala',
  r: 'r',
  lua: 'lua',
  perl: 'perl',
  pl: 'perl'
}

export function getLanguageFromFilename(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  return extensionToLanguageMap[ext] || ''
}

export function getExtensionFromFilename(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || ''
}

export function isMarkdownFile(filename: string): boolean {
  const ext = getExtensionFromFilename(filename)
  return ext === 'md' || ext === 'markdown'
}
