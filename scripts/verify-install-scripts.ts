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
 * EVERY ROOT'S .npmrc SETS strict-allow-scripts=true, because this check runs at push, after the
 * install it judges. npm 11.19's `strict-allow-scripts` refuses an install, `ESTRICTALLOWSCRIPTS`,
 * before any script runs, when a script-bearing dependency is unnamed or approved only at another
 * version; a denied one is still skipped and an approved one still runs (measured 2026-11-10,
 * `npm install` and `npm ci`, against a local registry). Without it the install exits 0, and the
 * only record that a script ran is npm's debug log, of which it keeps the last 10 (`logs-max`): a
 * pre-push chain writes dozens, so the log of the install is gone within a minute. Under
 * `loglevel=error` the warning is not shown either. Found 2026-11-10, when a dependency update moved
 * better-sqlite3 past its pinned approval and nothing could say whether its script had run. The file
 * must be tracked: one git does not track reaches no clone. A workspace member needs one of its
 * own: `npm --prefix <member> install`, the form the cwd rules prescribe, treats the member as a
 * project of its own, reading its .npmrc and its package.json's allowScripts and not the root's,
 * and ran an unnamed script that way with exit 0 (measured the same day). So every tracked
 * package.json directory without a lockfile is judged too, on its .npmrc alone. Only the canonical spelling, as the last
 * top-level line, is read here; npm reads more (a bare key, `=TRUE`, an empty value), and any other
 * spelling is refused by name rather than guessed, as an unreadable allowScripts key is.
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
 * package.json, a script-bearing dependency resolved outside the registry, a root or member whose
 * tracked .npmrc does not end strict-allow-scripts=true, and an install in a file the E2E images run
 * without --ignore-scripts, or a rebuild there of a package not approved, are ERRORS. An
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
  /** the root's .npmrc as git tracks it, or null when git tracks none */
  npmrc: string | null
}
/** A tracked package.json with no lockfile beside it: a workspace member, judged on .npmrc alone. */
export interface MemberInput {
  path: string
  npmrc: string | null
}
/** A file the E2E images run (a Dockerfile or shell script under testing/e2e-docker/), with the
 *  package names its nearest package root's allowScripts approves. */
export interface HarnessInput {
  path: string
  text: string
  approved: string[]
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

/**
 * What a root's .npmrc says of strict-allow-scripts, read the way npm reads it where the two agree:
 * the last top-level assignment wins, and nothing after a `[section]` header is top-level (npm
 * does not honour a key there, measured). A `;` or `#` comment line never has the key's name before
 * its `=`, so it needs no rule of its own and can never count. `on` only for the canonical
 * `strict-allow-scripts=true`, spaces around `=` allowed; `unread` for any other value or a bare
 * key, which npm may read either way and this check does not guess; `off` for no file or no key.
 */
export function strictAllowScripts(npmrc: string | null): 'on' | 'off' | 'unread' {
  if (npmrc === null) return 'off'
  let state: 'on' | 'off' | 'unread' = 'off'
  for (const raw of npmrc.split(/\r?\n/)) {
    const line = raw.trim()
    if (line.startsWith('[')) break
    const eq = line.indexOf('=')
    if ((eq === -1 ? line : line.slice(0, eq)).trim() !== 'strict-allow-scripts') continue
    state = eq !== -1 && line.slice(eq + 1).trim() === 'true' ? 'on' : 'unread'
  }
  return state
}

/** The finding for a directory whose .npmrc does not turn strict on, or null when it does. */
function strictProblem(path: string, npmrc: string | null, member: boolean): string | null {
  const strict = strictAllowScripts(npmrc)
  if (strict === 'on') return null
  const where = `${path === '.' ? '' : `${path}/`}.npmrc`
  return (
    `${path}: ` +
    (npmrc === null
      ? `git tracks no ${where}`
      : strict === 'unread'
        ? `${where} sets strict-allow-scripts in a form this check does not read`
        : `${where} does not set strict-allow-scripts`) +
    (member
      ? `. An install run with --prefix on this workspace member treats it as a project of its ` +
        `own, reading this .npmrc and this package.json's allowScripts, not its root's (measured), so it `
      : `, so an install `) +
    `runs a script-bearing dependency allowScripts does not name, with only a warning, and keeps ` +
    `no record that it ran past npm's last 10 debug logs. ` +
    `Add the line \`strict-allow-scripts=true\` to ${where} and commit it.`
  )
}

/** A package spec's name, without a version: `better-sqlite3@12.8.0` and `@a/b@1.0.0` alike. */
function specName(spec: string): string {
  const at = spec.indexOf('@', spec.startsWith('@') ? 1 : 0)
  return at === -1 ? spec : spec.slice(0, at)
}

const HARNESS_INSTALL =
  /(^|&&|;|\||\(|\bthen\b|\bdo\b|\bRUN\b)\s*([A-Za-z_][A-Za-z0-9_]*=\S*\s+)*npm\s+(ci|install|i)(\s|$)/
const HARNESS_REBUILD = /(^|&&|;|\||\(|\bthen\b|\bdo\b|\bRUN\b)\s*npm\s+rebuild\b([^;&|)]*)/

/**
 * The E2E images' npm (11.6.2 in both Playwright bases, measured) predates `allowScripts`, so an
 * install there runs every dependency's install script, the denied ones included. Every install
 * a harness file runs carries --ignore-scripts, and an approved package is built after it with
 * `npm rebuild <pkg>`, naming only packages the root approves: a bare `npm rebuild` rebuilds them
 * all. Comment lines are skipped; a line is judged where npm sits at a command position.
 */
function harnessProblems(file: HarnessInput): string[] {
  const out: string[] = []
  const approved = new Set(file.approved)
  file.text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim()
    if (line.startsWith('#')) return
    const where = `${file.path}:${i + 1}`
    const install = HARNESS_INSTALL.exec(line)
    if (install && !/(^|\s)--ignore-scripts(\s|$|=)/.test(line)) {
      out.push(
        `${where}: \`npm ${install[3]}\` without --ignore-scripts, in a file the E2E images run. ` +
          `Their npm predates allowScripts, so it runs every dependency's install script, the ` +
          `denied ones included. Add --ignore-scripts, then \`npm rebuild <pkg>\` for each package ` +
          `allowScripts approves.`
      )
    }
    const rebuild = HARNESS_REBUILD.exec(line)
    if (rebuild) {
      const names = rebuild[2]
        .trim()
        .split(/\s+/)
        .filter(a => a && !a.startsWith('-'))
      if (names.length === 0) {
        out.push(
          `${where}: a bare \`npm rebuild\` runs every dependency's install script; name the approved packages`
        )
      }
      for (const n of names.map(specName)) {
        if (!approved.has(n)) {
          out.push(
            `${where}: \`npm rebuild ${n}\` runs the install script of a package allowScripts does not ` +
              `approve (approved here: ${[...approved].join(', ') || 'none'})`
          )
        }
      }
    }
  })
  return out
}

/**
 * Pure: the whole judgement, over injected roots, the workspace members beside them, and the files
 * the E2E images run. Errors fail; warnings and notes never do.
 */
export function auditInstallScripts(
  roots: RootInput[],
  members: MemberInput[] = [],
  harness: HarnessInput[] = []
): Findings {
  const errors: string[] = []
  const warnings: string[] = []
  const notes: string[] = []

  for (const file of harness) errors.push(...harnessProblems(file))

  for (const member of members) {
    const problem = strictProblem(member.path, member.npmrc, true)
    if (problem) errors.push(problem)
  }
  for (const root of roots) {
    const problem = strictProblem(root.path, root.npmrc, false)
    if (problem) errors.push(problem)
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
          `not named in allowScripts, so an install fails under strict-allow-scripts, and without ` +
          `it runs ${list.length === 1 ? 'its scripts' : 'their scripts'} with only a warning:\n` +
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
const STRICT = 'strict-allow-scripts=true\n'
const root = (
  allowScripts: Record<string, unknown> | undefined,
  packages: Record<string, LockEntry>,
  implicitGyp: string[] | null = [],
  npmrc: string | null = STRICT
): RootInput => ({
  path: 'code',
  manifest: allowScripts === undefined ? {} : { allowScripts },
  lockfile: { packages: { '': {}, ...packages } },
  implicitGyp: implicitGyp === null ? null : new Set(implicitGyp),
  npmrc
})

export function selfTest(quiet = false): number {
  const seen = { CATCH: 0, IGNORE: 0 }
  let failed = 0
  const t = (
    kind: 'CATCH' | 'IGNORE',
    label: string,
    input: RootInput[],
    want: { errors: number; warnings?: number; notes?: number },
    members: MemberInput[] = [],
    harness: HarnessInput[] = []
  ) => {
    seen[kind]++
    const f = auditInstallScripts(input, members, harness)
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
    [
      { path: 'code', manifest: null, lockfile: { packages: {} }, implicitGyp: null, npmrc: STRICT }
    ],
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

  // ── CATCH: a root whose installs would run an unnamed script rather than refuse it ──
  t('CATCH', 'git tracks no .npmrc', [root({}, {}, [], null)], { errors: 1 })
  t(
    'CATCH',
    'a workspace member with no .npmrc, though its root has one',
    [root({}, {})],
    { errors: 1 },
    [{ path: 'code/backend', npmrc: null }]
  )
  t(
    'CATCH',
    "a workspace member whose .npmrc only sets loglevel (Weaver's backend)",
    [root({}, {})],
    { errors: 1 },
    [{ path: 'code/backend', npmrc: 'loglevel=error\n' }]
  )
  t(
    'CATCH',
    'an .npmrc without the setting (loglevel=error, which also hides the warning)',
    [root({}, {}, [], 'loglevel=error\n')],
    { errors: 1 }
  )
  t('CATCH', 'strict-allow-scripts=false', [root({}, {}, [], 'strict-allow-scripts=false\n')], {
    errors: 1
  })
  t(
    'CATCH',
    'the setting commented out, with ; and with #',
    [root({}, {}, [], '; strict-allow-scripts=true\n# strict-allow-scripts=true\n')],
    { errors: 1 }
  )
  t(
    'CATCH',
    'true then false: the last assignment wins, as npm reads it',
    [root({}, {}, [], 'strict-allow-scripts=true\nstrict-allow-scripts=false\n')],
    { errors: 1 }
  )
  t(
    'CATCH',
    'the setting under a [section], which npm does not honour',
    [root({}, {}, [], '[x]\nstrict-allow-scripts=true\n')],
    { errors: 1 }
  )
  t('CATCH', 'a bare key is refused, not guessed', [root({}, {}, [], 'strict-allow-scripts\n')], {
    errors: 1
  })
  t(
    'CATCH',
    'a quoted value is refused, not guessed',
    [root({}, {}, [], 'strict-allow-scripts="true"\n')],
    { errors: 1 }
  )
  t(
    'CATCH',
    'an unnamed dependency in a root without the setting is two findings',
    [root(undefined, { 'node_modules/esbuild': dep('esbuild', '0.28.2') }, [], null)],
    { errors: 2 }
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
  t(
    'IGNORE',
    'strict-allow-scripts with spaces around =',
    [root({}, {}, [], 'strict-allow-scripts = true\n')],
    { errors: 0 }
  )
  t(
    'IGNORE',
    'false then true: the last assignment wins',
    [root({}, {}, [], 'strict-allow-scripts=false\nstrict-allow-scripts=true\n')],
    { errors: 0 }
  )
  t(
    'IGNORE',
    'the setting beside comments and other settings',
    [root({}, {}, [], '# why it is here\nloglevel=notice\nstrict-allow-scripts=true\n')],
    { errors: 0 }
  )
  t('IGNORE', 'CRLF line endings', [root({}, {}, [], 'strict-allow-scripts=true\r\n')], {
    errors: 0
  })
  t('IGNORE', 'a workspace member with the setting of its own', [root({}, {})], { errors: 0 }, [
    { path: 'code/backend', npmrc: STRICT }
  ])

  // ── The files the E2E images run, whose npm predates allowScripts ──
  const DF = 'code/testing/e2e-docker/config/Dockerfile'
  const SH = 'code/testing/e2e-docker/config/entrypoint.sh'
  const h = (path: string, text: string, approved: string[] = []): HarnessInput[] => [
    { path, text, approved }
  ]
  t(
    'CATCH',
    'harness: RUN npm ci without --ignore-scripts',
    [root({}, {})],
    { errors: 1 },
    [],
    h(DF, 'RUN npm ci\n')
  )
  t(
    'CATCH',
    'harness: a chained npm ci in an entrypoint',
    [root({}, {})],
    { errors: 1 },
    [],
    h(SH, '  cd /app/backend && npm ci && cd /app\n')
  )
  t(
    'CATCH',
    'harness: npm install and npm i',
    [root({}, {})],
    { errors: 2 },
    [],
    h(SH, 'npm install\nnpm i\n')
  )
  t(
    'CATCH',
    'harness: an install on a continued RUN line',
    [root({}, {})],
    { errors: 1 },
    [],
    h(DF, "RUN printf 'x' > /root/.npmrc \\\n && npm ci --registry=http://mirror/\n")
  )
  t(
    'CATCH',
    'harness: a bare npm rebuild',
    [root({}, {})],
    { errors: 1 },
    [],
    h(SH, 'npm rebuild\n')
  )
  t(
    'CATCH',
    'harness: a rebuild of a package allowScripts does not approve',
    [root({}, {})],
    { errors: 1 },
    [],
    h(SH, 'npm ci --ignore-scripts && npm rebuild esbuild\n', ['better-sqlite3'])
  )
  t(
    'IGNORE',
    'harness: RUN npm ci --ignore-scripts',
    [root({}, {})],
    { errors: 0 },
    [],
    h(DF, 'RUN npm ci --ignore-scripts\n')
  )
  t(
    'IGNORE',
    'harness: --ignore-scripts, then a rebuild of an approved package',
    [root({}, {})],
    { errors: 0 },
    [],
    h(SH, 'cd /app/backend && npm ci --ignore-scripts && npm rebuild better-sqlite3 && cd /app\n', [
      'better-sqlite3'
    ])
  )
  t(
    'IGNORE',
    'harness: a rebuild naming an approved package with its version, and a scoped one',
    [root({}, {})],
    { errors: 0 },
    [],
    h(SH, 'npm rebuild better-sqlite3@12.8.0 @scope/pkg\n', ['better-sqlite3', '@scope/pkg'])
  )
  t(
    'IGNORE',
    'harness: comments, npx and npm run are not installs',
    [root({}, {})],
    { errors: 0 },
    [],
    h(
      DF,
      '# this was: RUN cd backend && npm ci\nRUN npx playwright install-deps\nRUN npm run build\n'
    )
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
  const all = execFileSync('git', ['-C', repo, 'ls-files', '-z'], { encoding: 'utf-8' }).split('\0')
  const trackedSet = new Set(all)
  const tracked = all.filter(p => p === 'package-lock.json' || p.endsWith('/package-lock.json'))
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
    // The index, not the disk: the commit carries what is staged, and a clone carries only what
    // git tracks, so neither an untracked file nor an unstaged edit may satisfy the check.
    const npmrcRel = dirname(rel) === '.' ? '.npmrc' : `${dirname(rel)}/.npmrc`
    return {
      path: dirname(rel) === '.' ? '.' : dirname(rel),
      manifest: existsSync(manifestPath)
        ? (JSON.parse(readFileSync(manifestPath, 'utf-8')) as RootInput['manifest'])
        : null,
      lockfile,
      implicitGyp: readImplicitGyp(pkgRoot, lockfile.packages ?? {}),
      npmrc: trackedSet.has(npmrcRel)
        ? execFileSync('git', ['-C', repo, 'show', `:${npmrcRel}`], { encoding: 'utf-8' })
        : null
    }
  })

  // Every other tracked package.json is a workspace member (or a package with no lockfile), which
  // `npm --prefix <it>` installs as a project of its own, reading only its own .npmrc.
  const lockDirs = new Set(tracked.map(rel => dirname(rel)))
  const members: MemberInput[] = all
    .filter(p => p === 'package.json' || p.endsWith('/package.json'))
    .map(p => dirname(p))
    .filter(d => !lockDirs.has(d))
    .map(d => {
      const npmrcRel = d === '.' ? '.npmrc' : `${d}/.npmrc`
      return {
        path: d,
        npmrc: trackedSet.has(npmrcRel)
          ? execFileSync('git', ['-C', repo, 'show', `:${npmrcRel}`], { encoding: 'utf-8' })
          : null
      }
    })

  // The files the E2E images run, each judged against the allowScripts of its nearest package
  // root, read from the index like the .npmrc files.
  const rootByPath = new Map(roots.map(r => [r.path, r]))
  const harness: HarnessInput[] = all
    .filter(p => /(^|\/)testing\/e2e-docker\//.test(p))
    .filter(p => /(^|\/)Dockerfile[^/]*$/.test(p) || p.endsWith('.sh'))
    .map(p => {
      let dir = dirname(p)
      while (!rootByPath.has(dir) && dir !== '.') dir = dirname(dir)
      const policy = rootByPath.get(dir)?.manifest?.allowScripts ?? {}
      return {
        path: p,
        text: execFileSync('git', ['-C', repo, 'show', `:${p}`], { encoding: 'utf-8' }),
        approved: Object.entries(policy)
          .filter(([, v]) => v === true)
          .map(([k]) => specName(k))
      }
    })

  const { errors, warnings, notes } = auditInstallScripts(roots, members, harness)
  console.log(`  ${harness.length} file(s) the E2E images run`)
  for (const m of members) {
    console.log(
      `  ${m.path}: workspace member, strict-allow-scripts ${strictAllowScripts(m.npmrc)}`
    )
  }
  for (const r of roots) {
    const n = Object.entries(r.lockfile.packages ?? {}).filter(
      ([k, e]) =>
        k.includes('node_modules/') && !e.link && (e.hasInstallScript || r.implicitGyp?.has(k))
    ).length
    console.log(
      `  ${r.path}: ${n} script-bearing dependenc${n === 1 ? 'y' : 'ies'}, ${Object.keys(r.manifest?.allowScripts ?? {}).length} allowScripts entr${Object.keys(r.manifest?.allowScripts ?? {}).length === 1 ? 'y' : 'ies'}, strict-allow-scripts ${strictAllowScripts(r.npmrc)}`
    )
  }
  console.log('')
  for (const n of notes) console.log(`NOTE: ${n}`)
  for (const w of warnings) console.warn(`WARN: ${w}`)
  for (const e of errors) console.error(`FAIL: ${e}\n`)
  if (errors.length === 0) {
    console.log(
      `\nRESULT: PASS — every script-bearing dependency in ${roots.length} package root(s) is approved or denied, ` +
        `the .npmrc of each root and of its ${members.length} member(s) refuses an install that would run one that is not, ` +
        `and the ${harness.length} file(s) the E2E images run install with --ignore-scripts`
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
