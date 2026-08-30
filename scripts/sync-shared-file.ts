// Copyright (c) 2026 whizBANG Developers LLC. All rights reserved.
// Licensed under MIT. See LICENSE.
/**
 * SYNC A SHARED FILE DOWN FROM THE TEMPLATE, WITHOUT CLOBBERING THIS REPO'S HEADER.
 *
 * `audit:template-divergence` tells you a shared file has forked. Acting on that meant `cp`, and
 * `cp` is wrong in a specific, quiet way: the licence line and any `<repo>-free:` publish marker
 * are PER-REPO, and the auditor normalises them away — so a copy that overwrites them looks
 * correct to the very checker that sent you here.
 *
 * Measured 2026-08-25, propagating one shared lib by hand: the template's
 * `{{LICENSE_IDENTIFIER}}` was overwritten with a downstream repo's proprietary line three times
 * in one session, and a `weaver-free: never-publish` marker was dropped from a file whose
 * exclusion depends on it. Every instance was caught by looking afterwards. "Remember to check"
 * is not a control; this is.
 *
 * WHAT IT DOES
 *   1. captures the destination's per-repo lines BEFORE touching it
 *   2. copies the upstream body over
 *   3. restores the destination's licence line and re-inserts its publish markers
 *   4. VERIFIES the result now normalises equal to upstream — and restores the original file if
 *      it does not, so a partial sync cannot be left behind
 *
 * Step 4 is the point. Without it this is just a `cp` with extra steps and the same failure mode.
 *
 * USAGE
 *   npx tsx scripts/sync-shared-file.ts                 # report every forked/missing shared file
 *   npx tsx scripts/sync-shared-file.ts --apply         # sync them all
 *   npx tsx scripts/sync-shared-file.ts --apply <path>… # sync only these
 *   npx tsx scripts/sync-shared-file.ts --self-test
 *
 * A file MISSING here is copied whole; its licence line is then whatever upstream had, which is
 * wrong for this repo — so the run tells you to finish with `audit:license-headers --apply`,
 * which is the tool that owns that question. This one deliberately does not re-implement it.
 */
import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs'
import { join, dirname, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { normaliseForCompare, extractPerRepoLines } from './lib/per-repo-header.js'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const REPO_CODE = join(SCRIPT_DIR, '..')

/**
 * The repo root and this repo's package root, DERIVED — never assumed to be `<scripts>/../..`.
 *
 * That assumption holds wherever the package is `<repo>/code` and breaks in a repo that keeps
 * several products side by side. Measured 2026-08-30 in qepton-project, whose `code/` holds six
 * sibling products: the naive form made this tool open
 * `<repo>/code/code/quasar.aliases.js` and die with ENOENT.
 *
 * `audit-template-divergence.ts` — same directory, same manifest, same rows — was given the
 * derivation first and this file was not, so a fix reached one of two siblings that must agree.
 * They read the SAME manifest; a path model that differs between them is the same defect the
 * manifest exists to prevent, one layer down.
 *
 * No-op where the package is `<repo>/code`: the substitution replaces `code/` with `code/`.
 */
const REPO_ROOT = execFileSync('git', ['-C', SCRIPT_DIR, 'rev-parse', '--show-toplevel'], {
  encoding: 'utf-8',
}).trim()
const PACKAGE_ROOT = relative(REPO_ROOT, REPO_CODE).split(sep).join('/')

/** Resolve a declared path against THIS repo, re-rooting the package-relative rows. */
function localRel(rel: string): string {
  return rel.startsWith('code/') && PACKAGE_ROOT !== 'code'
    ? `${PACKAGE_ROOT}/${rel.slice('code/'.length)}`
    : rel
}
const MANIFEST = join(SCRIPT_DIR, 'shared-with-template.txt')

const RED = '[31m'
const GREEN = '[32m'
const YELLOW = '[33m'
const DIM = '[2m'
const RESET = '[0m'

function isDir(p: string): boolean {
  try {
    return statSync(p).isDirectory()
  } catch {
    return false
  }
}

function findTemplateRoot(): string | null {
  const candidates = [
    process.env.TEMPLATE_ROOT,
    join(process.env.HOME ?? '', 'Projects', 'active', 'quasar-project-template'),
  ].filter((p): p is string => Boolean(p))
  return candidates.find(p => isDir(join(p, '.git'))) ?? null
}

function manifestPaths(): string[] {
  return readFileSync(MANIFEST, 'utf-8')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#'))
}

/**
 * Graft `upstream` onto `local`, keeping local's per-repo lines.
 *
 * Pure so the self-test can pin it without touching a filesystem — the mutation path below is a
 * thin wrapper.
 *
 * Returns null ONLY on a shape mismatch — one side carries a licence line and the other does not.
 * Where NEITHER does (a data manifest), the upstream body is returned unchanged, because there is
 * nothing per-repo to preserve and a copy is the whole operation.
 */
export function graft(upstreamBody: string, localBody: string): string | null {
  const local = extractPerRepoLines(localBody)
  const up = extractPerRepoLines(upstreamBody)

  // NEITHER side carries a licence line — a data file such as the shared manifest itself. There
  // is nothing per-repo to preserve, so a straight copy is not merely safe, it is the whole
  // operation. Refusing here would have made the tool unable to sync its OWN manifest, which is
  // the file most likely to move.
  if (!local.licence && !up.licence) return upstreamBody

  // One side has a licence line and the other does not. That is a shape mismatch, not a sync:
  // guessing which way it should go is exactly the judgement this tool exists to avoid making.
  if (!local.licence || !up.licence) return null

  let out = upstreamBody
  out = out.replace(up.licence, local.licence)

  // Publish markers: upstream's (if any) go, local's come back, immediately after the licence
  // line. They are REMOVED by the comparison rather than substituted, so upstream cannot carry a
  // placeholder for them and position has to be chosen here.
  for (const m of up.publishMarkers) out = out.replace(m, '')
  if (local.publishMarkers.length) {
    const anchor = local.licence
    out = out.replace(anchor + '\n', anchor + '\n' + local.publishMarkers.join(''))
  }
  return out
}

interface Finding {
  path: string
  state: 'forked' | 'missing'
}

function survey(templateRoot: string, only: string[]): Finding[] {
  const wanted = only.length ? new Set(only) : null
  const out: Finding[] = []
  for (const rel of manifestPaths()) {
    if (wanted && !wanted.has(rel)) continue
    const upstream = join(templateRoot, rel)
    const local = join(REPO_ROOT, localRel(rel))
    if (!existsSync(upstream)) continue
    if (!existsSync(local)) {
      out.push({ path: rel, state: 'missing' })
      continue
    }
    const a = normaliseForCompare(readFileSync(upstream, 'utf-8'))
    const b = normaliseForCompare(readFileSync(local, 'utf-8'))
    if (a !== b) out.push({ path: rel, state: 'forked' })
  }
  return out
}

function apply(templateRoot: string, f: Finding): { ok: boolean; note: string } {
  const upstreamPath = join(templateRoot, f.path)
  const localPath = join(REPO_ROOT, localRel(f.path))
  const upstreamBody = readFileSync(upstreamPath, 'utf-8')

  if (f.state === 'missing') {
    writeFileSync(localPath, upstreamBody)
    return { ok: true, note: 'copied whole — run audit:license-headers --apply to set the licence' }
  }

  const localBody = readFileSync(localPath, 'utf-8')
  const grafted = graft(upstreamBody, localBody)
  if (grafted === null) {
    return { ok: false, note: 'no licence line to preserve — refusing rather than guessing' }
  }

  writeFileSync(localPath, grafted)

  // VERIFY, and roll back on failure. A sync that half-worked is worse than one that refused:
  // the file looks synced, the auditor may even agree, and the header is wrong.
  if (normaliseForCompare(grafted) !== normaliseForCompare(upstreamBody)) {
    writeFileSync(localPath, localBody)
    return { ok: false, note: 'result did not match upstream — original restored, nothing changed' }
  }
  const back = extractPerRepoLines(grafted)
  const before = extractPerRepoLines(localBody)
  if (back.licence !== before.licence || back.publishMarkers.length !== before.publishMarkers.length) {
    writeFileSync(localPath, localBody)
    return { ok: false, note: 'per-repo lines not preserved — original restored, nothing changed' }
  }
  return { ok: true, note: 'synced; licence line and publish marker(s) preserved' }
}

function selfTest(): number {
  let fails = 0
  const t = (label: string, cond: boolean) => {
    console.log(`  ${cond ? 'ok   ' : 'FAIL '} ${label}`)
    if (!cond) fails++
  }

  const UP = [
    '// Copyright (c) 2026 whizBANG Developers LLC. All rights reserved.',
    '// Licensed under {{LICENSE_IDENTIFIER}}. See LICENSE.',
    '/** shared docblock */',
    'export const x = 1',
    '',
  ].join('\n')

  const LOCAL_PROP = [
    '// Copyright (c) 2026 whizBANG Developers LLC. All rights reserved.',
    '// Proprietary and confidential. Do not distribute.',
    '/** OLD docblock */',
    'export const x = 0',
    '',
  ].join('\n')

  const LOCAL_MARKED = [
    '// Copyright (c) 2026 whizBANG Developers LLC. All rights reserved.',
    '// Licensed under AGPL-3.0 (Free) or BSL-1.1. See LICENSE.',
    '// weaver-free: never-publish — Dev-only tooling.',
    '/** OLD docblock */',
    'export const x = 0',
    '',
  ].join('\n')

  // The three properties the whole tool exists for.
  const g1 = graft(UP, LOCAL_PROP)
  t('upstream BODY is adopted', (g1 ?? '').includes('export const x = 1'))
  t("destination's licence line survives", (g1 ?? '').includes('Proprietary and confidential'))
  t("upstream's licence placeholder does NOT leak in", !(g1 ?? '').includes('{{LICENSE_IDENTIFIER}}'))

  const g2 = graft(UP, LOCAL_MARKED)
  t('publish marker survives the sync', (g2 ?? '').includes('weaver-free: never-publish'))
  t('marker is re-inserted directly after the licence line',
    /Licensed under AGPL-3\.0[^\n]*\n\/\/ weaver-free:/.test(g2 ?? ''))
  t('grafted result normalises EQUAL to upstream',
    normaliseForCompare(g2 ?? '') === normaliseForCompare(UP))

  // IGNORE half — refuse rather than guess, EXCEPT where there is nothing to guess about.
  t('a destination with NO licence line, upstream HAS one → refused',
    graft(UP, 'export const x = 0\n') === null)
  t('an upstream with NO licence line, destination HAS one → refused',
    graft('export const x = 1\n', LOCAL_PROP) === null)
  t('NEITHER side has a licence line (a data manifest) → straight copy, not a refusal',
    graft('# upstream data\nrow\n', '# local data\nold\n') === '# upstream data\nrow\n')

  // A file already in sync must be a no-op through the graft.
  const already = graft(UP, graft(UP, LOCAL_PROP)!)
  t('re-grafting an already-synced file changes nothing (idempotent)',
    already === graft(UP, LOCAL_PROP))

  console.log(`\nauditor-contract: catch=7 ignore=3`)
  console.log(fails === 0 ? `self-test: 10 passed, 0 failed` : `self-test: ${fails} FAILED`)
  return fails === 0 ? 0 : 1
}

function main(): void {
  const argv = process.argv.slice(2)
  if (argv.includes('--self-test')) process.exit(selfTest())

  const doApply = argv.includes('--apply')
  const only = argv.filter(a => !a.startsWith('--'))

  const templateRoot = findTemplateRoot()
  if (!templateRoot) {
    console.error(`\n${RED}✗${RESET} template checkout not found — set TEMPLATE_ROOT.\n`)
    process.exit(1)
  }
  if (templateRoot === REPO_ROOT) {
    console.log(`\n${DIM}This IS the template — nothing to sync down.${RESET}\n`)
    process.exit(0)
  }

  const findings = survey(templateRoot, only)
  console.log(`\n[1mShared-file sync${RESET} ${DIM}(upstream: ${templateRoot})${RESET}\n`)
  if (!findings.length) {
    console.log(`${GREEN}✓${RESET} every declared shared file already matches upstream\n`)
    process.exit(0)
  }
  if (!doApply) {
    for (const f of findings) {
      console.log(`  ${YELLOW}⚠${RESET} ${f.state.toUpperCase().padEnd(7)} ${f.path}`)
    }
    console.log(`\n${DIM}  Re-run with --apply to sync. Direction is a human call: if THIS repo`)
    console.log(`  holds the fix, promote it upstream first instead.${RESET}\n`)
    process.exit(0)
  }
  let bad = 0
  for (const f of findings) {
    const r = apply(templateRoot, f)
    if (!r.ok) bad++
    console.log(`  ${r.ok ? GREEN + '✓' : RED + '✗'}${RESET} ${f.path}\n      ${DIM}${r.note}${RESET}`)
  }
  console.log(
    `\n${DIM}  Then: npx tsx scripts/verify-license-headers.ts --apply` +
      `\n  and re-run audit:template-divergence to confirm.${RESET}\n`,
  )
  process.exit(bad ? 1 : 0)
}

main()
