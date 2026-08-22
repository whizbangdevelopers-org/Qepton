// Copyright (c) 2026 whizBANG Developers LLC. All rights reserved.
// Licensed under MIT. See LICENSE.
/**
 * audit:push-gates — the production build must be gated by a chain that actually runs.
 *
 * WHY THIS EXISTS
 * ---------------
 * `npm run build` sat in NO chained gate here: absent from test:precommit, test:prepush and
 * test:compliance. That is why this scaffold shipped a config that could not build for months and
 * nobody noticed — there was nothing to notice it. The build was repaired on 2026-08-11; nothing
 * kept it repaired, so the next breakage would have been silent in exactly the same way.
 *
 * Adding `build:all` to a chain is the fix. This auditor is what stops the fix from quietly coming
 * undone, and it checks the two halves separately because they fail independently:
 *
 *   1. The pre-push HOOK reaches a build script.   ← what protects this repo today
 *   2. `test:prepush` reaches a build script.      ← what a generated project inherits
 *
 * Both are needed. A project that rewires its hook still inherits (2); a repo whose hook gates on a
 * narrower chain than test:prepush (this one does — see below) is still covered by (1).
 *
 * WHY NOT SIMPLY CHECK `'build' in scripts['test:prepush']`
 * --------------------------------------------------------
 * Because that predicate can be true while nothing runs it. Neither this repo's pre-push hook nor
 * Gantry's invoked `test:prepush` at all — they call named gates directly — so editing that one
 * script would have satisfied the check and gated nothing. Gantry has already been bitten by the
 * same shape from the other direction: `audit:command-cwd` was chained into test:prepush and, the
 * hook never calling it, ran zero times. The hook is the artifact that executes; read that.
 *
 * WHY THE TEMPLATE'S HOOK GATES A NARROWER CHAIN
 * ----------------------------------------------
 * `test:prepush` includes `test:security`, a bare `npm audit --audit-level=high` that fails here on
 * the unresolved quasar/vite advisories. Gating the template's own pushes on it would block work on
 * an open dependency decision. So the hook gates compliance + build; the script keeps the full shape
 * a scaffolded project should adopt.
 *
 * KNOWN LIMIT, STATED RATHER THAN PAPERED OVER
 * --------------------------------------------
 * Script references are recovered by token, not by parsing shell — the hook may call `npm run X`
 * directly or pass X to its own runner function (`run_gate "1/4" build:all`), and a shell parser
 * that handled both would be more machinery than the problem deserves. Full-line `#` comments are
 * stripped first, so a header that merely NAMES a gate does not satisfy it. A namespaced token
 * inside an `echo` string would — accepted, because the failure it permits (claiming a gate you
 * also print) is not one anybody reaches by accident.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const PKG = join(dirname(fileURLToPath(import.meta.url)), '..')
const REPO = execFileSync('git', ['-C', PKG, 'rev-parse', '--show-toplevel'], { encoding: 'utf-8' }).trim()
const HOOK_DIR = join(PKG, '.githooks')
const HOOK = join(HOOK_DIR, 'pre-push')

/** A namespaced script reference (`test:compliance`), or a bare one on an `npm … run` line. */
const NAMESPACED = /\b[a-z][a-z0-9]*:[a-z0-9:_-]+\b/g
const BARE = /\b(?:build|lint|typecheck|format)\b/g
const NPM_RUN = /\bnpm\b[^\n]*\brun\b/
const IS_BUILD = /^build(:|$)/
const IS_TYPECHECK_SCRIPTS = /^typecheck:scripts$/

export type Scripts = Record<string, string>

/** Pure: script names referenced by a shell/script body, ignoring full-line comments. */
export function referencedScripts(text: string, scripts: Scripts): string[] {
  const out = new Set<string>()
  for (const raw of text.split('\n')) {
    if (/^\s*#/.test(raw)) continue
    const toks = [...raw.matchAll(NAMESPACED)].map((m) => m[0])
    if (NPM_RUN.test(raw)) toks.push(...[...raw.matchAll(BARE)].map((m) => m[0]))
    for (const t of toks) if (t in scripts) out.add(t)
  }
  return [...out]
}

/** Pure: every script reachable from `start` by following one script's calls into another. */
export function reachable(start: string[], scripts: Scripts): Set<string> {
  const seen = new Set<string>()
  const queue = [...start]
  while (queue.length) {
    const name = queue.shift()!
    if (seen.has(name) || !(name in scripts)) continue
    seen.add(name)
    queue.push(...referencedScripts(scripts[name], scripts))
  }
  return seen
}

/** Pure: does anything reachable from `start` build the app? */
export function gatesBuild(start: string[], scripts: Scripts): boolean {
  return [...reachable(start, scripts)].some((n) => IS_BUILD.test(n))
}

/**
 * Pure: does anything reachable from `start` typecheck scripts/ and codebase-mcp/?
 *
 * CONDITIONAL, and deliberately so: it is only an invariant for a repo that DEFINES
 * `typecheck:scripts`. A repo without one is not in violation, it simply has no such surface —
 * and a rule that fires on a repo which cannot satisfy it gets switched off, after which it
 * catches nothing at all.
 *
 * Added 2026-08-22, from a live instance of exactly the failure this file's docblock describes.
 * `typecheck:scripts` was added to `test:precommit` in four repos on one day. In two of them no
 * hook invoked `test:precommit` at all, so the new gate ran zero times while every reasonable
 * predicate about it ("is it in the chain?") answered yes. The build half of this auditor had
 * already been bitten twice by that shape; this is the third.
 */
export function gatesTypecheckScripts(start: string[], scripts: Scripts): boolean {
  if (!('typecheck:scripts' in scripts)) return true
  return [...reachable(start, scripts)].some((n) => IS_TYPECHECK_SCRIPTS.test(n))
}

// ── Self-test ───────────────────────────────────────────────────────────────────────────────────
// The IGNORE half matters as much as the CATCH half: a gate auditor that fires on a correctly
// gated repo gets deleted, after which it catches nothing at all.
const SCRIPTS: Scripts = {
  build: 'quasar build -m pwa',
  'build:all': 'npm run build && npm run build:backend',
  'build:backend': 'npm --prefix backend run build',
  'test:precommit': 'npm run lint && npm run typecheck && npm run typecheck:scripts',
  'typecheck:scripts': 'tsc -p tsconfig.scripts.json',
  'test:security': 'npm audit --audit-level=high',
  'test:compliance': 'npm run audit:sast && npm run audit:command-cwd',
  'test:prepush': 'npm run test:precommit && npm run build:all && npm run test:security',
  'audit:sast': 'npx tsx scripts/audit-sast.ts',
  'audit:command-cwd': 'npx tsx scripts/verify-command-cwd.ts',
  lint: 'eslint .',
  typecheck: 'vue-tsc --noEmit',
}

const MUST_CATCH: [string, string][] = [
  ['the state this repo was in — hook gates compliance only', '#!/usr/bin/env bash\ncd code\nnpm run test:compliance\n'],
  ['a hook that only lints', '#!/usr/bin/env bash\nnpm run lint\n'],
  // The exact false pass the naive `'build' in test:prepush` predicate would have given.
  ['header NAMES build:all, body never runs it', '#!/usr/bin/env bash\n# gates: test:precommit, build:all, test:security\nnpm run test:compliance\n'],
  ['reaches a script that stops short of the build', '#!/usr/bin/env bash\nnpm run test:precommit\n'],
]
// The typecheck:scripts half. Same populations, different predicate — a hook can gate the build
// perfectly and still never typecheck the auditors that gate everything else.
const MUST_CATCH_TS: [string, string][] = [
  ['gates compliance + security + build, never the type chain', '#!/usr/bin/env bash\nnpm run test:compliance\nnpm run test:security\nnpm run build:all\n'],
  ['invokes named checks individually and omits this one', '#!/usr/bin/env bash\nnpm run lint\nnpm run typecheck\nnpm run build\n'],
  ['a hook that only builds', '#!/usr/bin/env bash\nnpm run build:all\n'],
]
const MUST_IGNORE_TS: [string, string][] = [
  ['reaches it via test:precommit', '#!/usr/bin/env bash\nnpm run test:precommit\nnpm run build:all\n'],
  ['reaches it via test:prepush', '#!/usr/bin/env bash\nnpm run test:prepush\n'],
  ['invokes typecheck:scripts directly', '#!/usr/bin/env bash\nnpm run typecheck:scripts\nnpm run build:all\n'],
  ['a runner function taking it as an argument', '#!/usr/bin/env bash\nrun_check "types" "npm --prefix /abs run typecheck:scripts"\nrun_gate "2/2" build:all\n'],
]

const MUST_IGNORE: [string, string][] = [
  ['direct npm run build:all', '#!/usr/bin/env bash\nnpm run test:compliance\nnpm run build:all\n'],
  ['bare `build` on an npm run line', '#!/usr/bin/env bash\nnpm --prefix /abs/code run build\n'],
  ["Weaver's shape — one chained script that reaches it", '#!/usr/bin/env bash\nnpm run test:prepush\n'],
  ['a runner function taking the script as an argument', '#!/usr/bin/env bash\nrun_gate "2/4" build:all\nrun_gate "3/4" test:security\n'],
]

function selfTest(): string[] {
  const fails: string[] = []
  for (const [name, hook] of MUST_CATCH) {
    if (gatesBuild(referencedScripts(hook, SCRIPTS), SCRIPTS)) fails.push(`MUST CATCH but passed: ${name}`)
  }
  for (const [name, hook] of MUST_IGNORE) {
    if (!gatesBuild(referencedScripts(hook, SCRIPTS), SCRIPTS)) fails.push(`MUST IGNORE but flagged: ${name}`)
  }
  for (const [name, hook] of MUST_CATCH_TS) {
    if (gatesTypecheckScripts(referencedScripts(hook, SCRIPTS), SCRIPTS)) fails.push(`MUST CATCH (ts) but passed: ${name}`)
  }
  for (const [name, hook] of MUST_IGNORE_TS) {
    if (!gatesTypecheckScripts(referencedScripts(hook, SCRIPTS), SCRIPTS)) fails.push(`MUST IGNORE (ts) but flagged: ${name}`)
  }
  // A repo with no such script must never be flagged — the conditional half of the invariant.
  const noTs: Scripts = { build: 'quasar build', lint: 'eslint .' }
  if (!gatesTypecheckScripts(['lint'], noTs)) fails.push('MUST IGNORE (ts): repo that defines no typecheck:scripts')
  return fails
}

// ── Scan ────────────────────────────────────────────────────────────────────────────────────────
function main(): number {
  console.log('\x1b[1mPush Gate Audit\x1b[0m')
  console.log('\x1b[2mThe production build must be gated by a chain that actually runs\x1b[0m\n')

  const fails = selfTest()
  if (fails.length) {
    console.error('\x1b[31m✗ SELF-TEST FAILED — refusing to report with a broken matcher\x1b[0m')
    for (const f of fails) console.error(`    ${f}`)
    return 1
  }
  const nCatch = MUST_CATCH.length + MUST_CATCH_TS.length
  const nIgnore = MUST_IGNORE.length + MUST_IGNORE_TS.length + 1
  console.log(`  \x1b[32m✓\x1b[0m self-test: ${nCatch} catch + ${nIgnore} ignore cases`)
  // audit:auditor-contracts reads this line to see BOTH halves rather than trust they exist.
  console.log(`  auditor-contract: catch=${nCatch} ignore=${nIgnore}`)

  const scripts: Scripts = JSON.parse(readFileSync(join(PKG, 'package.json'), 'utf-8')).scripts ?? {}
  const problems: string[] = []

  if (!existsSync(HOOK)) {
    problems.push(`no pre-push hook at ${relative(REPO, HOOK)} — nothing gates a push at all`)
  } else {
    const hook = readFileSync(HOOK, 'utf-8')
    const entry = referencedScripts(hook, scripts)
    if (!entry.length) {
      problems.push(`${relative(REPO, HOOK)} invokes no npm script this package defines`)
    } else if (!gatesBuild(entry, scripts)) {
      problems.push(
        `${relative(REPO, HOOK)} runs [${entry.join(', ')}] — none of which reaches a build script.\n` +
          '      A push can therefore ship a tree that does not compile.'
      )
    } else {
      console.log(`  \x1b[32m✓\x1b[0m pre-push hook reaches the build via [${entry.join(', ')}]`)
    }
    if (entry.length && !gatesTypecheckScripts(entry, scripts)) {
      problems.push(
        `${relative(REPO, HOOK)} runs [${entry.join(', ')}] — none of which reaches \`typecheck:scripts\`,\n` +
          '      which this package defines. scripts/ is run by tsx, which strips types without\n' +
          '      checking them, so nothing would type it on a push.'
      )
    } else if (entry.length && 'typecheck:scripts' in scripts) {
      console.log('  \x1b[32m✓\x1b[0m pre-push hook reaches typecheck:scripts')
    }
  }

  if (!('test:prepush' in scripts)) {
    problems.push('no `test:prepush` script — a generated project inherits no push chain')
  } else if (!gatesBuild(['test:prepush'], scripts)) {
    problems.push(
      '`test:prepush` does not reach a build script. Even where the hook gates it here, every\n' +
        '      project generated from this template inherits that chain and would not.'
    )
  } else {
    console.log('  \x1b[32m✓\x1b[0m test:prepush reaches the build (what a scaffold inherits)')
  }

  // Hook CONTENT is committed; hook ACTIVATION is local config, absent by design in CI.
  if (!process.env.CI) {
    const want = relative(REPO, HOOK_DIR)
    let got = ''
    try {
      got = execFileSync('git', ['-C', REPO, 'config', 'core.hooksPath'], { encoding: 'utf-8' }).trim()
    } catch {
      got = ''
    }
    if (got !== want) {
      problems.push(
        `core.hooksPath is ${got ? `"${got}"` : 'unset'}, so the hook above never runs here.\n` +
          `      Fix, from the repo root:  git config core.hooksPath ${want}`
      )
    } else {
      console.log(`  \x1b[32m✓\x1b[0m core.hooksPath = ${want}`)
    }
  }

  if (problems.length) {
    console.log('')
    for (const p of problems) console.log(`\x1b[31m  ✗ ${p}\x1b[0m`)
    console.log('\n\x1b[31m\x1b[1mRESULT: FAIL\x1b[0m — the build is not gated where it needs to be.')
    return 1
  }
  console.log('\n\x1b[32m\x1b[1mRESULT: PASS\x1b[0m — the build is gated by a chain that runs')
  return 0
}

process.exit(main())
