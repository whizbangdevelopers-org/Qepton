// Copyright (c) 2026 whizBANG Developers LLC. All rights reserved.
// Licensed under MIT. See LICENSE.
/**
 * verify-install-scripts.ts — every dependency that carries an install script is named in its
 * package root's `allowScripts`, approved or denied.
 *
 * FORGE-121 (Every dependency version waits 6 days before a WBD repo or the sealed mirror adopts
 * it; security updates get no automatic bypass, only an approved and recorded exception), point
 * (3): install scripts run only for packages a repo names. npm (11.19 measured) reads
 * `allowScripts` from package.json, skips the lifecycle scripts of a package it DENIES, and still
 * RUNS those of a package it does not name, with only a "not yet covered" warning at the end of
 * the install. Its own docs say unreviewed scripts are "blocked by default"; its code
 * (@npmcli/arborist, rebuild: skips only when `isScriptAllowed(...) === false`) does not, measured
 * 2026-10-22 by a clean install whose unreviewed better-sqlite3 ran `prebuild-install`. So the rule
 * holds only while every script-bearing dependency has an entry, and a dependency change that adds
 * one undoes it silently. This is the check that it has not.
 *
 * WHAT COUNTS AS SCRIPT-BEARING, from two sources, because neither sees everything:
 *   - the lockfile's `hasInstallScript: true`, which npm writes for every explicit
 *     preinstall/install/postinstall on EVERY platform (macOS's fsevents included);
 *   - an installed package with a `binding.gyp` and no install or preinstall script, which npm
 *     builds with an implicit `node-gyp rebuild`. The lockfile does NOT record those
 *     (better-sqlite3-multiple-ciphers, measured), so they are read from `node_modules`, and only
 *     where it is installed. A root without `node_modules` is reported as checked for explicit
 *     scripts only: that is a note, never a pass in disguise.
 *
 * WHAT COUNTS AS NAMED follows npm's identity rule (arborist's script-allowed.js): a registry
 * dependency is the name and version in its lockfile `resolved` URL, never the name of the folder
 * it is installed under (an alias) or its own package.json. Keys read here: `name` (any version)
 * and `name@<exact version>` (what `npm install-scripts approve` writes, pinned). Any other key
 * form is refused rather than guessed, because a check that cannot say what a key covers cannot
 * say a package is covered.
 *
 * ENFORCEMENT IS PARTITIONED: an unnamed script-bearing dependency, an unreadable key, a missing
 * package.json and a script-bearing dependency resolved outside the registry are ERRORS. An
 * allowScripts entry that names nothing script-bearing is a WARNING (`npm install-scripts prune`),
 * since it changes no install.
 *
 * The judgement is `auditInstallScripts(roots)`, pure over injected inputs, so one proof serves
 * every repo it is shared with. Every live run checks its corpus first and refuses to judge the
 * repo when the corpus fails.
 *
 *   npx tsx scripts/verify-install-scripts.ts [--self-test]
 */

import { execFileSync } from 'child_process'
import { existsSync, readFileSync } from 'fs'
import { dirname, join, resolve } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT = resolve(__dirname, '..')

export interface LockEntry {
  version?: string
  resolved?: string
  link?: boolean
  hasInstallScript?: boolean
}
export interface RootInput {
  /** repo-relative package root, for messages */
  path: string
  /** the root's package.json, or null when it is missing */
  manifest: { allowScripts?: Record<string, unknown> } | null
  lockfile: { packages?: Record<string, LockEntry> }
  /** lockfile keys whose installed package npm builds with an implicit node-gyp; null when the
   *  root has no node_modules, so implicit builds could not be read */
  implicitGyp: Set<string> | null
}
export interface Findings {
  errors: string[]
  warnings: string[]
  notes: string[]
}

const EXACT_VERSION = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/

/** A registry tarball URL's package name and version, as npm's identity rule reads them. */
export function identityFromResolved(resolved: string): { name: string; version: string } | null {
  const m = /^https?:\/\/[^/]+\/(.+?)\/-\/([^/]+)\.tgz$/.exec(resolved)
  if (!m) return null
  const name = decodeURIComponent(m[1])
  const base = name.startsWith('@') ? name.slice(name.indexOf('/') + 1) : name
  const file = m[2]
  if (!file.startsWith(`${base}-`)) return null
  return { name, version: file.slice(base.length + 1) }
}

/** `name` -> any version; `name@1.2.3` -> that version; anything else is unreadable here. */
export function parseKey(key: string): { name: string; version: string | null } | null {
  const at = key.indexOf('@', key.startsWith('@') ? 1 : 0)
  if (at === -1) return key.length > 0 ? { name: key, version: null } : null
  const name = key.slice(0, at)
  const spec = key.slice(at + 1)
  if (!name || !EXACT_VERSION.test(spec)) return null
  return { name, version: spec }
}

/** Pure: the whole judgement, over injected roots. Errors fail; warnings and notes never do. */
export function auditInstallScripts(roots: RootInput[]): Findings {
  const errors: string[] = []
  const warnings: string[] = []
  const notes: string[] = []

  for (const root of roots) {
    if (!root.manifest) {
      errors.push(`${root.path}: a package-lock.json with no package.json beside it`)
      continue
    }
    const policy = root.manifest.allowScripts ?? {}
    const keys: { key: string; name: string; version: string | null }[] = []
    for (const key of Object.keys(policy)) {
      const parsed = parseKey(key)
      if (!parsed || typeof policy[key] !== 'boolean') {
        errors.push(
          `${root.path}: allowScripts key "${key}" is not read by this check (it reads \`name\` ` +
            `and \`name@<exact version>\`, each true or false), so what it covers is unknown`
        )
        continue
      }
      keys.push({ key, ...parsed })
    }

    const used = new Set<string>()
    const unnamed: string[] = []
    const packages = root.lockfile.packages ?? {}
    for (const [lockKey, entry] of Object.entries(packages)) {
      // A dependency lives under node_modules/; anything else is the root or a workspace member,
      // whose scripts are the project's own and outside allowScripts.
      if (!lockKey.includes('node_modules/') || entry.link) continue
      const explicit = entry.hasInstallScript === true
      const implicit = root.implicitGyp?.has(lockKey) ?? false
      if (!explicit && !implicit) continue
      const kind = explicit ? 'install script' : 'implicit node-gyp build'
      const id = entry.resolved ? identityFromResolved(entry.resolved) : null
      if (!id) {
        errors.push(
          `${root.path}: ${lockKey} has an ${kind} and resolves outside the registry ` +
            `(${entry.resolved ?? 'no resolved URL'}); review it and extend this check to its identity`
        )
        continue
      }
      const matching = keys.filter(
        k => k.name === id.name && (k.version === null || k.version === id.version)
      )
      if (matching.length === 0) {
        unnamed.push(`${id.name}@${id.version} (${kind})`)
        continue
      }
      for (const k of matching) used.add(k.key)
    }

    if (unnamed.length > 0) {
      const list = [...new Set(unnamed)].sort()
      errors.push(
        `${root.path}: ${list.length} script-bearing dependenc${list.length === 1 ? 'y' : 'ies'} ` +
          `not named in allowScripts, so npm runs ${list.length === 1 ? 'its scripts' : 'their scripts'} ` +
          `with only a warning:\n` +
          list.map(p => `  - ${p}`).join('\n') +
          `\n  Review each script, then \`npm --prefix <abs ${root.path}> install-scripts approve <pkg>\` ` +
          `(pinned to the version reviewed) or \`deny <pkg>\`, and record why.`
      )
    }
    const stale = keys.filter(k => !used.has(k.key)).map(k => k.key)
    if (stale.length > 0) {
      warnings.push(
        `${root.path}: allowScripts names ${stale.length} package(s) nothing script-bearing ` +
          `matches here: ${stale.join(', ')}` +
          (root.implicitGyp === null
            ? ' (node_modules is absent, so an implicit gyp build may be the match)'
            : '')
      )
    }
    if (root.implicitGyp === null) {
      notes.push(
        `${root.path}: no node_modules, so implicit node-gyp builds were not read; explicit scripts were`
      )
    }
  }
  return { errors, warnings, notes }
}

// ── Proof: a corpus it must pass before it may judge the repo ─────────────────────────────────

const REG = 'https://registry.npmjs.org'
const tgz = (name: string, version: string): string => {
  const base = name.startsWith('@') ? name.slice(name.indexOf('/') + 1) : name
  return `${REG}/${name}/-/${base}-${version}.tgz`
}
const dep = (name: string, version: string, hasInstallScript = true): LockEntry => ({
  version,
  resolved: tgz(name, version),
  hasInstallScript
})
const root = (
  allowScripts: Record<string, unknown> | undefined,
  packages: Record<string, LockEntry>,
  implicitGyp: string[] | null = []
): RootInput => ({
  path: 'code',
  manifest: allowScripts === undefined ? {} : { allowScripts },
  lockfile: { packages: { '': {}, ...packages } },
  implicitGyp: implicitGyp === null ? null : new Set(implicitGyp)
})

export function selfTest(quiet = false): number {
  const seen = { CATCH: 0, IGNORE: 0 }
  let failed = 0
  const t = (
    kind: 'CATCH' | 'IGNORE',
    label: string,
    input: RootInput[],
    want: { errors: number; warnings?: number; notes?: number }
  ) => {
    seen[kind]++
    const f = auditInstallScripts(input)
    const ok =
      f.errors.length === want.errors &&
      f.warnings.length === (want.warnings ?? 0) &&
      f.notes.length === (want.notes ?? 0)
    if (!ok) failed++
    if (!quiet || !ok) console.log(`  ${ok ? '✓' : '✗'} ${kind} ${label}`)
    if (!ok) {
      console.log(
        `      want ${want.errors}/${want.warnings ?? 0}/${want.notes ?? 0} error/warning/note, ` +
          `got ${f.errors.length}/${f.warnings.length}/${f.notes.length}`
      )
    }
  }

  // ── CATCH: a script npm would run with only a warning ──
  t(
    'CATCH',
    'an install script and no allowScripts at all',
    [root(undefined, { 'node_modules/esbuild': dep('esbuild', '0.28.2') })],
    { errors: 1 }
  )
  t(
    'CATCH',
    'allowScripts names a different package',
    [root({ vite: false }, { 'node_modules/esbuild': dep('esbuild', '0.28.2') }, [])],
    { errors: 1, warnings: 1 }
  )
  t(
    'CATCH',
    'a pinned approval for the version before a bump',
    [
      root(
        { 'better-sqlite3@12.8.0': true },
        { 'node_modules/better-sqlite3': dep('better-sqlite3', '12.9.0') }
      )
    ],
    { errors: 1, warnings: 1 }
  )
  t(
    'CATCH',
    'an implicit node-gyp build the lockfile does not mark',
    [root({}, { 'node_modules/cipher': dep('cipher', '13.0.3', false) }, ['node_modules/cipher'])],
    { errors: 1 }
  )
  t(
    'CATCH',
    'a nested node_modules entry with a script',
    [
      root(
        { a: false },
        { 'node_modules/a': dep('a', '1.0.0'), 'node_modules/a/node_modules/b': dep('b', '2.0.0') }
      )
    ],
    { errors: 1 }
  )
  t(
    'CATCH',
    'an alias is matched by its resolved name, not its folder',
    [root({ alias: true }, { 'node_modules/alias': dep('real', '1.0.0') })],
    { errors: 1, warnings: 1 }
  )
  t(
    'CATCH',
    'a range key is refused, not guessed',
    [root({ 'esbuild@^0.28.0': false }, { 'node_modules/esbuild': dep('esbuild', '0.28.2') })],
    { errors: 2 }
  )
  t(
    'CATCH',
    'a non-boolean value is refused',
    [root({ esbuild: 'no' }, { 'node_modules/esbuild': dep('esbuild', '0.28.2') })],
    { errors: 2 }
  )
  t(
    'CATCH',
    'a script-bearing dependency resolved outside the registry',
    [
      root(
        {},
        {
          'node_modules/x': {
            version: '1.0.0',
            resolved: 'git+ssh://git@example.com/x.git#abc',
            hasInstallScript: true
          }
        }
      )
    ],
    { errors: 1 }
  )
  t(
    'CATCH',
    'a lockfile with no package.json beside it',
    [{ path: 'code', manifest: null, lockfile: { packages: {} }, implicitGyp: null }],
    { errors: 1 }
  )
  t(
    'CATCH',
    'a scoped package unnamed',
    [root({}, { 'node_modules/@parcel/watcher': dep('@parcel/watcher', '2.6.0') })],
    { errors: 1 }
  )
  t(
    'CATCH',
    'two unnamed packages in one root arrive as ONE error',
    [root({}, { 'node_modules/a': dep('a', '1.0.0'), 'node_modules/b': dep('b', '1.0.0') })],
    { errors: 1 }
  )

  // ── IGNORE: what three repos legitimately hold ──
  t(
    'IGNORE',
    'named by bare name, approved',
    [root({ esbuild: true }, { 'node_modules/esbuild': dep('esbuild', '0.28.2') })],
    { errors: 0 }
  )
  t(
    'IGNORE',
    'named by bare name, denied',
    [root({ esbuild: false }, { 'node_modules/esbuild': dep('esbuild', '0.28.2') })],
    { errors: 0 }
  )
  t(
    'IGNORE',
    'a pinned approval at the installed version',
    [
      root(
        { 'better-sqlite3@12.8.0': true },
        { 'node_modules/better-sqlite3': dep('better-sqlite3', '12.8.0') }
      )
    ],
    { errors: 0 }
  )
  t(
    'IGNORE',
    'a scoped package named',
    [
      root(
        { '@parcel/watcher': false },
        { 'node_modules/@parcel/watcher': dep('@parcel/watcher', '2.6.0') }
      )
    ],
    { errors: 0 }
  )
  t(
    'IGNORE',
    'an alias named by its resolved name',
    [root({ real: false }, { 'node_modules/alias': dep('real', '1.0.0') })],
    { errors: 0 }
  )
  t(
    'IGNORE',
    'a dependency without scripts needs no entry',
    [root({}, { 'node_modules/vue': dep('vue', '3.5.0', false) })],
    { errors: 0 }
  )
  t(
    'IGNORE',
    "a workspace member's own script is the project's, not a dependency's",
    [
      root(
        {},
        {
          backend: { version: '1.0.0', hasInstallScript: true },
          'node_modules/app-backend': { resolved: 'backend', link: true }
        }
      )
    ],
    { errors: 0 }
  )
  t(
    'IGNORE',
    'an implicit gyp build named',
    [
      root({ cipher: false }, { 'node_modules/cipher': dep('cipher', '13.0.3', false) }, [
        'node_modules/cipher'
      ])
    ],
    { errors: 0 }
  )
  t(
    'IGNORE',
    'an entry naming nothing script-bearing WARNS, never errors',
    [root({ gone: false }, {})],
    { errors: 0, warnings: 1 }
  )
  t(
    'IGNORE',
    'no node_modules: explicit scripts still checked, implicit ones noted',
    [root({ esbuild: false }, { 'node_modules/esbuild': dep('esbuild', '0.28.2') }, null)],
    { errors: 0, notes: 1 }
  )
  t(
    'IGNORE',
    'a prerelease pin matches its own version',
    [root({ 'x@2.0.0-beta.1': true }, { 'node_modules/x': dep('x', '2.0.0-beta.1') })],
    { errors: 0 }
  )

  const total = seen.CATCH + seen.IGNORE
  if (!quiet || failed)
    console.log(`\n  auditor-contract: catch=${seen.CATCH} ignore=${seen.IGNORE}`)
  console.log(`install-scripts self-test: ${total - failed} passed, ${failed} failed`)
  return failed ? 1 : 0
}

// ── The repository, read ──────────────────────────────────────────────────────────────────────

/** Lockfile keys whose installed package has a binding.gyp and no install/preinstall script. */
function readImplicitGyp(pkgRoot: string, packages: Record<string, LockEntry>): Set<string> | null {
  if (!existsSync(join(pkgRoot, 'node_modules'))) return null
  const out = new Set<string>()
  for (const [key, entry] of Object.entries(packages)) {
    if (!key.includes('node_modules/') || entry.link) continue
    const dir = join(pkgRoot, key)
    if (!existsSync(join(dir, 'binding.gyp'))) continue
    let scripts: Record<string, string> = {}
    try {
      scripts = (JSON.parse(readFileSync(join(dir, 'package.json'), 'utf-8')).scripts ??
        {}) as Record<string, string>
    } catch {
      // An unreadable installed package.json is treated as declaring nothing, as npm treats it.
    }
    if (!scripts.install && !scripts.preinstall) out.add(key)
  }
  return out
}

function main(): number {
  console.log('--- Install scripts named in allowScripts ---\n')
  if (selfTest(true) !== 0) {
    console.error('\nFAIL: the corpus failed, so this check refuses to judge the repository')
    return 1
  }
  const repo = execFileSync('git', ['-C', ROOT, 'rev-parse', '--show-toplevel'], {
    encoding: 'utf-8'
  }).trim()
  const tracked = execFileSync('git', ['-C', repo, 'ls-files', '-z'], { encoding: 'utf-8' })
    .split('\0')
    .filter(p => p === 'package-lock.json' || p.endsWith('/package-lock.json'))
  if (tracked.length === 0) {
    console.error(
      'FAIL: no tracked package-lock.json, so there is nothing this check could have read'
    )
    return 1
  }

  const roots: RootInput[] = tracked.map(rel => {
    const pkgRoot = dirname(join(repo, rel))
    const lockfile = JSON.parse(readFileSync(join(repo, rel), 'utf-8')) as RootInput['lockfile']
    const manifestPath = join(pkgRoot, 'package.json')
    return {
      path: dirname(rel) === '.' ? '.' : dirname(rel),
      manifest: existsSync(manifestPath)
        ? (JSON.parse(readFileSync(manifestPath, 'utf-8')) as RootInput['manifest'])
        : null,
      lockfile,
      implicitGyp: readImplicitGyp(pkgRoot, lockfile.packages ?? {})
    }
  })

  const { errors, warnings, notes } = auditInstallScripts(roots)
  for (const r of roots) {
    const n = Object.entries(r.lockfile.packages ?? {}).filter(
      ([k, e]) =>
        k.includes('node_modules/') && !e.link && (e.hasInstallScript || r.implicitGyp?.has(k))
    ).length
    console.log(
      `  ${r.path}: ${n} script-bearing dependenc${n === 1 ? 'y' : 'ies'}, ${Object.keys(r.manifest?.allowScripts ?? {}).length} allowScripts entr${Object.keys(r.manifest?.allowScripts ?? {}).length === 1 ? 'y' : 'ies'}`
    )
  }
  console.log('')
  for (const n of notes) console.log(`NOTE: ${n}`)
  for (const w of warnings) console.warn(`WARN: ${w}`)
  for (const e of errors) console.error(`FAIL: ${e}\n`)
  if (errors.length === 0) {
    console.log(
      `\nRESULT: PASS — every script-bearing dependency in ${roots.length} package root(s) is approved or denied`
    )
    return 0
  }
  console.error(`RESULT: FAIL — ${errors.length} finding(s)`)
  return 1
}

if (process.argv.includes('--self-test')) {
  console.log('--- Install scripts named in allowScripts (self-test) ---\n')
  process.exit(selfTest())
}
process.exit(main())
