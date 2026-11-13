// Copyright (c) 2026 whizBANG Developers LLC. All rights reserved.
// Licensed under MIT. See LICENSE.

/**
 * audit:dependency-patches — FORGE-142 (A defect in a dependency is fixed in the dependency, by a
 * patch the archetype carries and applies at every install until the dependency releases the fix;
 * the first is Quasar's queued focus).
 *
 * Fails when:
 *   1. a patch in patches/ is malformed, or names a test that does not exist;
 *   2. a patch is not in place in this checkout's install, or no longer applies to it (the applier's
 *      own --check, so the gate and the install read one rule);
 *   3. an install path can leave a patch out: package.json has no `postinstall` running the applier
 *      (it covers every `npm ci` and `npm install` made with scripts), or a tracked Dockerfile, shell
 *      script or workflow installs the code root with `--ignore-scripts` and never runs the applier
 *      after it, or the Nix package builds with buildNpmPackage and never runs it. That build installs
 *      with `npm ci --ignore-scripts` and then `npm rebuild`, and a bare rebuild runs the root's
 *      postinstall on npm 11.19 (measured 2026-11-13), but not where a package sets dontNpmRebuild,
 *      and the build's own npm is another version: a step of its own makes it certain.
 *
 * Self-tests its install-path reader on a paired corpus before reading the tree, and refuses to read
 * it when a case fails: a reader that finds no install would report every tree clean.
 *
 *   npx tsx scripts/verify-dependency-patches.ts [--self-test]
 */

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { applyPatches, loadPatches } from './apply-dependency-patches'

const APPLIER = 'apply-dependency-patches'

export type Kind = 'dockerfile' | 'shell' | 'workflow' | 'nix'

/** Dockerfile lines joined across `\` continuations, each with the line it starts on. */
function logicalLines(text: string, joinContinuations: boolean): { line: number; text: string }[] {
  const raw = text.split('\n')
  const out: { line: number; text: string }[] = []
  for (let i = 0; i < raw.length; i++) {
    const start = i + 1
    let joined = raw[i]
    while (joinContinuations && /\\\s*$/.test(joined) && i + 1 < raw.length) {
      i += 1
      joined = joined.replace(/\\\s*$/, ' ') + raw[i]
    }
    out.push({ line: start, text: joined })
  }
  return out
}

/** Does this command install the CODE ROOT (not a member such as backend/) with npm? */
function rootInstall(command: string): boolean {
  const withoutComment = command.replace(/(^|\s)#.*$/, '')
  const install = /\bnpm\s+(ci|install|i)\b/.exec(withoutComment)
  if (!install) return false
  const before = withoutComment.slice(0, install.index)
  // a `cd` into a member first, or `--prefix`/`-w` naming one, installs the member
  const cd = /\bcd\s+(\S+)\s*&&[^&]*$/.exec(before)
  if (cd && !/^(\/app|\.|"\$\{?GITHUB_WORKSPACE\}?\/code"|code)\/?$/.test(cd[1])) return false
  const after = withoutComment.slice(install.index)
  if (/\s--prefix(=|\s+)\S/.test(after) || /\s(-w|--workspace)(=|\s+)\S/.test(after)) return false
  return true
}

/** The problems an install file has: a root install with scripts off and no applier after it. */
export function installGaps(name: string, text: string, kind: Kind): string[] {
  if (kind === 'nix') {
    if (!/\bbuildNpmPackage\b/.test(text)) return []
    return text.includes(APPLIER)
      ? []
      : [
          `${name}: builds with buildNpmPackage and never runs scripts/${APPLIER}.ts; whether its ` +
            `npm rebuild runs the root's postinstall depends on its npm and on dontNpmRebuild, so the build names the step`
        ]
  }
  const gaps: string[] = []
  let pending: number | null = null
  for (const { line, text: command } of logicalLines(text, kind === 'dockerfile')) {
    const live = command.replace(/(^|\s)#.*$/, '')
    if (live.includes(APPLIER)) pending = null
    if (rootInstall(live) && /--ignore-scripts\b/.test(live)) pending ??= line
  }
  if (pending !== null) {
    gaps.push(
      `${name}:${pending}: installs the code root with --ignore-scripts and never runs ` +
        `scripts/${APPLIER}.ts after it, so its install has no dependency patches`
    )
  }
  return gaps
}

interface Case {
  name: string
  kind: Kind
  text: string
  gaps: number
}

/** CATCH (gaps > 0) and IGNORE (gaps 0) cases, each a shape a real install path takes. */
export const CORPUS: Case[] = [
  {
    name: 'a Dockerfile root install with scripts off and no applier',
    kind: 'dockerfile',
    text: 'COPY package*.json ./\nRUN npm ci --ignore-scripts\nCOPY . .\n',
    gaps: 1
  },
  {
    name: 'the applier after the copy covers it',
    kind: 'dockerfile',
    text: 'RUN npm ci --ignore-scripts\nCOPY . .\nRUN npx tsx scripts/apply-dependency-patches.ts\n',
    gaps: 0
  },
  {
    name: 'an applier BEFORE the install does not',
    kind: 'dockerfile',
    text: 'RUN npx tsx scripts/apply-dependency-patches.ts\nRUN npm ci --ignore-scripts\n',
    gaps: 1
  },
  {
    name: 'a continued RUN with the install inside it',
    kind: 'dockerfile',
    text: 'RUN npm config set registry x \\\n && npm ci --ignore-scripts --registry=http://m:4873/\nCOPY . .\n',
    gaps: 1
  },
  {
    name: 'a member install is not the root',
    kind: 'dockerfile',
    text: 'RUN cd backend && npm ci --ignore-scripts\n',
    gaps: 0
  },
  {
    name: 'a root install with scripts on runs postinstall',
    kind: 'dockerfile',
    text: 'RUN npm ci\n',
    gaps: 0
  },
  {
    name: 'a commented-out install is not an install',
    kind: 'dockerfile',
    text: '# RUN npm ci --ignore-scripts\n',
    gaps: 0
  },
  {
    name: 'an applier named only in a comment does not cover it',
    kind: 'dockerfile',
    text: 'RUN npm ci --ignore-scripts\n# then apply-dependency-patches\n',
    gaps: 1
  },
  {
    name: 'an entrypoint installing only the backend',
    kind: 'shell',
    text: '  cd /app/backend && npm ci --ignore-scripts && cd /app\n',
    gaps: 0
  },
  {
    name: 'an entrypoint installing the root with scripts off',
    kind: 'shell',
    text: 'cd /app && npm ci --ignore-scripts\nexec node x\n',
    gaps: 1
  },
  {
    name: 'a --prefix install of a member',
    kind: 'workflow',
    text: '        run: npm ci --prefix backend --ignore-scripts\n',
    gaps: 0
  },
  {
    name: 'a workflow root install with scripts off',
    kind: 'workflow',
    text: '        run: npm ci --ignore-scripts\n        run: npm test\n',
    gaps: 1
  },
  {
    name: 'a workflow root install with scripts on',
    kind: 'workflow',
    text: '        run: npm ci\n',
    gaps: 0
  },
  {
    name: 'a buildNpmPackage with no applier',
    kind: 'nix',
    text: 'pkgs.buildNpmPackage {\n  buildPhase = "npx quasar build";\n}\n',
    gaps: 1
  },
  {
    name: 'a buildNpmPackage running the applier',
    kind: 'nix',
    text: 'pkgs.buildNpmPackage {\n  buildPhase = "npx tsx scripts/apply-dependency-patches.ts; npx quasar build";\n}\n',
    gaps: 0
  },
  {
    name: 'a nix file that builds no npm package',
    kind: 'nix',
    text: '{ services.x.enable = true; }\n',
    gaps: 0
  }
]

export function selfTest(): string[] {
  const failures: string[] = []
  for (const c of CORPUS) {
    const got = installGaps('case', c.text, c.kind).length
    if (got !== c.gaps) failures.push(`${c.name}: ${got} gap(s), expected ${c.gaps}`)
  }
  if (!CORPUS.some(c => c.gaps > 0) || !CORPUS.some(c => c.gaps === 0))
    failures.push('the corpus lacks a CATCH or an IGNORE half')
  return failures
}

function kindOf(path: string): Kind | null {
  const base = path.split('/').at(-1) ?? ''
  if (/^Dockerfile/.test(base)) return 'dockerfile'
  if (base.endsWith('.sh')) return 'shell'
  if (/^\.github\/workflows\/.+\.ya?ml$/.test(path)) return 'workflow'
  if (/(^|\/)nixos\/.+\.nix$/.test(path)) return 'nix'
  return null
}

function main(): void {
  const failures = selfTest()
  if (failures.length > 0) {
    for (const f of failures) console.error(`  ✗ corpus: ${f}`)
    console.error(
      'audit:dependency-patches REFUSES to read the tree: its install-path reader fails its corpus'
    )
    process.exit(1)
  }
  const catches = CORPUS.filter(c => c.gaps > 0).length
  const ignores = CORPUS.filter(c => c.gaps === 0).length
  console.log(`  ✓ corpus: ${CORPUS.length} cases (${catches} catch, ${ignores} ignore)`)
  // The line audit:auditor-contracts reads to judge this proof's two halves.
  console.log(`  auditor-contract: catch=${catches} ignore=${ignores}`)
  if (process.argv.includes('--self-test')) return

  const code = resolve(dirname(fileURLToPath(import.meta.url)), '..')
  const repo = execFileSync('git', ['-C', code, 'rev-parse', '--show-toplevel'], {
    encoding: 'utf8'
  }).trim()
  const problems: string[] = []

  let patches: ReturnType<typeof loadPatches> = []
  try {
    patches = loadPatches(join(code, 'patches'))
  } catch (e) {
    problems.push((e as Error).message)
  }
  for (const p of patches) {
    if (!existsSync(join(code, p.test)))
      problems.push(`patches: ${p.id} names a test that does not exist, ${p.test}`)
  }
  problems.push(...applyPatches(code, patches, { check: true }).problems)

  if (patches.length > 0) {
    const pkg = JSON.parse(readFileSync(join(code, 'package.json'), 'utf8')) as {
      scripts?: Record<string, string>
    }
    if (!pkg.scripts?.postinstall?.includes(APPLIER)) {
      problems.push(
        `package.json: no postinstall running scripts/${APPLIER}.ts, so an npm ci with scripts installs no patches`
      )
    }
    const tracked = execFileSync('git', ['-C', repo, 'ls-files', '-z'], { encoding: 'utf8' })
      .split('\0')
      .filter(Boolean)
    let read = 0
    for (const path of tracked) {
      const kind = kindOf(path)
      if (kind === null) continue
      read += 1
      problems.push(...installGaps(path, readFileSync(join(repo, path), 'utf8'), kind))
    }
    // A reader that found nothing to read would report every tree clean.
    if (read === 0)
      problems.push(
        'no Dockerfile, shell script, workflow or Nix file was read: the reader is not seeing this tree'
      )
    console.log(`  read ${read} install file(s), ${patches.length} patch(es)`)
  }

  if (problems.length > 0) {
    for (const p of problems) console.error(`  ✗ ${p}`)
    console.error(`audit:dependency-patches: FAIL, ${problems.length} problem(s)`)
    process.exit(1)
  }
  console.log(
    'audit:dependency-patches: PASS, every patch is in place and every install path applies it'
  )
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main()
