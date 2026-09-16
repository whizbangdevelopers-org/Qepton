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
 * A requested path this repo's manifest does not declare is REPORTED and fails the run. It used to
 * be dropped without a word: on 2026-09-16 `--apply <manifest> <new row>` printed one ✓ for the
 * manifest, exited 0, and never copied the new file, because the request was filtered against the
 * manifest as it stood BEFORE the manifest was synced. So a requested manifest is now synced first,
 * and the remaining requests are read against the result.
 *
 * A file MISSING here is copied whole; its licence line is then whatever upstream had, which is
 * wrong for this repo — so the run tells you to finish with `audit:license-headers --apply`,
 * which is the tool that owns that question. This one deliberately does not re-implement it.
 */
import { readFileSync, writeFileSync, existsSync, statSync, chmodSync } from 'node:fs'
import { join, dirname, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import {
  normaliseForCompare,
  extractPerRepoLines,
  publishMarkerDeclarations
} from './lib/per-repo-header.js'

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
  encoding: 'utf-8'
}).trim()
const PACKAGE_ROOT = relative(REPO_ROOT, REPO_CODE).split(sep).join('/')

/** Resolve a declared path against THIS repo, re-rooting the package-relative rows. */
function localRel(rel: string): string {
  return rel.startsWith('code/') && PACKAGE_ROOT !== 'code'
    ? `${PACKAGE_ROOT}/${rel.slice('code/'.length)}`
    : rel
}
const MANIFEST = join(SCRIPT_DIR, 'shared-with-template.txt')
/** The manifest's own row, as the manifest declares it (package-relative, like every code/ row). */
const MANIFEST_ROW = 'code/scripts/shared-with-template.txt'

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
    join(process.env.HOME ?? '', 'Projects', 'active', 'quasar-project-template')
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
  state: 'forked' | 'missing' | 'no-upstream'
}

/**
 * Sort a request list into what this repo can act on. Pure, so the self-test pins it.
 *   undeclared — requested, but this repo's manifest has no such row: nothing can be done for it
 *   inSync     — declared, and the survey found nothing to do
 */
export function classifyRequests(
  only: string[],
  declared: Set<string>,
  findingPaths: Set<string>
): { undeclared: string[]; inSync: string[] } {
  const undeclared = only.filter(p => !declared.has(p))
  const inSync = only.filter(p => declared.has(p) && !findingPaths.has(p))
  return { undeclared, inSync }
}

/** A requested manifest goes first, so the rest of the run reads the manifest it just received. */
export function manifestFirst(only: string[]): string[] {
  return only.includes(MANIFEST_ROW)
    ? [MANIFEST_ROW, ...only.filter(p => p !== MANIFEST_ROW)]
    : only
}

function survey(templateRoot: string, only: string[]): Finding[] {
  const wanted = only.length ? new Set(only) : null
  const out: Finding[] = []
  for (const rel of manifestPaths()) {
    if (wanted && !wanted.has(rel)) continue
    const upstream = join(templateRoot, rel)
    const local = join(REPO_ROOT, localRel(rel))
    if (!existsSync(upstream)) {
      // A full scan leaves this to audit:template-divergence, which fails on it. A REQUESTED row is
      // reported here, because silence would read as "already in sync".
      if (wanted) out.push({ path: rel, state: 'no-upstream' })
      continue
    }
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
  if (f.state === 'no-upstream') {
    return {
      ok: false,
      note: 'the template has no such file — the manifest row names nothing upstream'
    }
  }
  const upstreamBody = readFileSync(upstreamPath, 'utf-8')

  if (f.state === 'missing') {
    writeFileSync(localPath, upstreamBody)
    // The MODE travels with the file. writeFileSync creates 0644, so an executable script arrived
    // non-executable — measured 2026-09-16 on run-root-self-tests.sh, tracked 100755 upstream.
    chmodSync(localPath, statSync(upstreamPath).mode & 0o777)
    // `git add` FIRST, and that ordering is not a nicety. verify-license-headers derives its file
    // set from `git ls-files`, deliberately — a header asserts authorship over distributed source,
    // so untracked build output must never be stamped. The consequence here is that a file this
    // branch has just created is INVISIBLE to the tool this note sends you to: it reports
    // "0 file(s) rewritten", exits 0, and leaves the upstream placeholder licence in place.
    // Measured 2026-09-01 syncing sync-template.ts into Weaver — the placeholder survived a clean
    // --apply run, and only a `git add` made the fixer see it.
    return {
      ok: true,
      note:
        'copied whole — now: git add it, THEN audit:license-headers --apply ' +
        '(the fixer reads git ls-files, so it cannot see an untracked file)'
    }
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

  // THE MARKER HALF IS CHECKED WITH A DIFFERENT MECHANISM ON PURPOSE (FORGE-54).
  //
  // This used to read `back.publishMarkers.length !== before.publishMarkers.length` — the same
  // `extractPerRepoLines` the graft above depends on. When that rule was blind to the HTML-comment
  // marker form, the guard compared 0 against 0, `0 !== 0` was false, and the tool deleted a
  // `never-publish` marker from a markdown-family file while logging "publish marker(s)
  // preserved". A guard that shares its subject's blind spot cannot fail when its subject does.
  //
  // Compared as a SET of contents, not a count: graft deliberately MOVES a marker to sit under the
  // licence line, so position changes and content must not. A count would also be a lossy
  // projection — it cannot distinguish "kept both" from "dropped one and gained another".
  const kept = new Set(publishMarkerDeclarations(grafted).map(l => l.trim()))
  const lost = publishMarkerDeclarations(localBody).filter(l => !kept.has(l.trim()))
  if (back.licence !== before.licence || lost.length) {
    writeFileSync(localPath, localBody)
    const why = lost.length
      ? `publish marker(s) would be LOST: ${lost.map(l => l.trim()).join(' | ')}`
      : 'licence line not preserved'
    return { ok: false, note: `${why} — original restored, nothing changed` }
  }
  return { ok: true, note: 'synced; licence line and publish marker(s) preserved' }
}

function selfTest(): number {
  let fails = 0
  const seen = { catch: 0, ignore: 0 }
  // CATCH: the tool must act — adopt, preserve, refuse, report. IGNORE: it must leave legitimate
  // input alone. The contract line below is COUNTED from these. Until 2026-09-16 it was a
  // hand-typed `catch=11 ignore=4`: the total matched the fifteen cases, and nothing would have
  // kept it matching when a case was added.
  let kind: 'catch' | 'ignore' = 'catch'
  const t = (label: string, cond: boolean) => {
    seen[kind]++
    console.log(`  ${cond ? 'ok   ' : 'FAIL '} ${kind.toUpperCase().padEnd(6)} ${label}`)
    if (!cond) fails++
  }

  const UP = [
    '// Copyright (c) 2026 whizBANG Developers LLC. All rights reserved.',
    '// Licensed under {{LICENSE_IDENTIFIER}}. See LICENSE.',
    '/** shared docblock */',
    'export const x = 1',
    ''
  ].join('\n')

  const LOCAL_PROP = [
    '// Copyright (c) 2026 whizBANG Developers LLC. All rights reserved.',
    '// Proprietary and confidential. Do not distribute.',
    '/** OLD docblock */',
    'export const x = 0',
    ''
  ].join('\n')

  const LOCAL_MARKED = [
    '// Copyright (c) 2026 whizBANG Developers LLC. All rights reserved.',
    '// Licensed under AGPL-3.0 (Free) or BSL-1.1. See LICENSE.',
    '// weaver-free: never-publish — Dev-only tooling.',
    '/** OLD docblock */',
    'export const x = 0',
    ''
  ].join('\n')

  // The three properties the whole tool exists for.
  const g1 = graft(UP, LOCAL_PROP)
  t('upstream BODY is adopted', (g1 ?? '').includes('export const x = 1'))
  t("destination's licence line survives", (g1 ?? '').includes('Proprietary and confidential'))
  t(
    "upstream's licence placeholder does NOT leak in",
    !(g1 ?? '').includes('{{LICENSE_IDENTIFIER}}')
  )

  const g2 = graft(UP, LOCAL_MARKED)
  t('publish marker survives the sync', (g2 ?? '').includes('weaver-free: never-publish'))
  t(
    'marker is re-inserted directly after the licence line',
    /Licensed under AGPL-3\.0[^\n]*\n\/\/ weaver-free:/.test(g2 ?? '')
  )
  t(
    'grafted result normalises EQUAL to upstream',
    normaliseForCompare(g2 ?? '') === normaliseForCompare(UP)
  )

  // Refuse rather than guess, EXCEPT where there is nothing to guess about.
  t(
    'a destination with NO licence line, upstream HAS one → refused',
    graft(UP, 'export const x = 0\n') === null
  )
  t(
    'an upstream with NO licence line, destination HAS one → refused',
    graft('export const x = 1\n', LOCAL_PROP) === null
  )
  kind = 'ignore'
  t(
    'NEITHER side has a licence line (a data manifest) → straight copy, not a refusal',
    graft('# upstream data\nrow\n', '# local data\nold\n') === '# upstream data\nrow\n'
  )

  // A file already in sync must be a no-op through the graft.
  const already = graft(UP, graft(UP, LOCAL_PROP)!)
  t(
    're-grafting an already-synced file changes nothing (idempotent)',
    already === graft(UP, LOCAL_PROP)
  )
  kind = 'catch'

  // ── FORGE-54 REGRESSION: the markdown-family file this tool used to silently unpublish ──────
  //
  // Every case above uses `//` comments, which is why this shipped. The live defect needed an
  // HTML-comment marker: extraction returned 0, the graft dropped the marker, and the guard
  // compared 0 against 0 and reported success. Reproduced against the real per-repo-header before
  // the fix; these assertions fail on the pre-FORGE-54 rule.
  const UP_MD = [
    '<!-- Copyright (c) 2026 whizBANG Developers LLC. All rights reserved. -->',
    '<!-- Licensed under {{LICENSE_IDENTIFIER}}. See LICENSE. -->',
    '',
    '# Shared doc',
    'upstream body',
    ''
  ].join('\n')
  const LOCAL_MD = [
    '<!-- Copyright (c) 2026 whizBANG Developers LLC. All rights reserved. -->',
    '<!-- Licensed under AGPL-3.0 (Free) or BSL-1.1. See LICENSE. -->',
    '<!-- weaver-free: never-publish — Dev-only doc. -->',
    '',
    '# Shared doc',
    'old body',
    ''
  ].join('\n')
  const g3 = graft(UP_MD, LOCAL_MD)
  t(
    'html-comment publish marker SURVIVES the sync',
    (g3 ?? '').includes('weaver-free: never-publish')
  )
  t('html-comment destination licence survives', (g3 ?? '').includes('AGPL-3.0'))
  t(
    'html-comment graft normalises EQUAL to upstream',
    normaliseForCompare(g3 ?? '') === normaliseForCompare(UP_MD)
  )

  // The guard itself, independent of whether graft is correct today. If a future edit reintroduces
  // the drop, THIS is what has to catch it — so it is asserted directly rather than via graft.
  const dropped = LOCAL_MD.split('\n')
    .filter(l => !l.includes('weaver-free:'))
    .join('\n')
  const keptSet = new Set(publishMarkerDeclarations(dropped).map(l => l.trim()))
  t(
    'guard would REFUSE a graft that dropped the html marker',
    publishMarkerDeclarations(LOCAL_MD).filter(l => !keptSet.has(l.trim())).length === 1
  )

  // IGNORE half for the guard: upstream rewriting a docblock that merely DISCUSSES a marker is a
  // legitimate sync and must not be refused. An over-broad guard refuses it, gets switched off,
  // and then catches nothing at all.
  const proseLocal =
    '// Licensed under AGPL-3.0. See LICENSE.\n * the `weaver-free:` marker\ncode\n'
  const proseKept = new Set(
    publishMarkerDeclarations('// Licensed under AGPL-3.0. See LICENSE.\ncode\n').map(l => l.trim())
  )
  kind = 'ignore'
  t(
    'guard does NOT fire when upstream edits prose that mentions a marker',
    publishMarkerDeclarations(proseLocal).filter(l => !proseKept.has(l.trim())).length === 0
  )

  // ── REQUESTS: nothing asked for is dropped without a line (2026-09-16) ─────────────────────────
  const declared = new Set(['code/scripts/a.ts', 'scripts/b.sh'])
  kind = 'catch'
  const r1 = classifyRequests(['scripts/new.sh'], declared, new Set())
  t(
    'a requested path the manifest does not declare is reported',
    r1.undeclared.join() === 'scripts/new.sh'
  )
  t(
    'a requested manifest is synced BEFORE the paths requested with it',
    manifestFirst(['scripts/new.sh', MANIFEST_ROW]).join() === `${MANIFEST_ROW},scripts/new.sh`
  )
  const r2 = classifyRequests(['scripts/b.sh'], declared, new Set())
  t(
    'a declared request with nothing to do is reported as in sync',
    r2.inSync.join() === 'scripts/b.sh'
  )
  kind = 'ignore'
  const r3 = classifyRequests(['scripts/b.sh'], declared, new Set(['scripts/b.sh']))
  t(
    'a declared request with work to do is neither undeclared nor in sync',
    r3.undeclared.length === 0 && r3.inSync.length === 0
  )
  t(
    'a request list without the manifest keeps its order',
    manifestFirst(['b', 'a']).join() === 'b,a'
  )
  t(
    'no request at all is not an undeclared request',
    classifyRequests([], declared, new Set()).undeclared.length === 0
  )

  console.log(`\nauditor-contract: catch=${seen.catch} ignore=${seen.ignore}`)
  const ran = seen.catch + seen.ignore
  console.log(fails === 0 ? `self-test: ${ran} passed, 0 failed` : `self-test: ${fails} FAILED`)
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

  console.log(`\n[1mShared-file sync${RESET} ${DIM}(upstream: ${templateRoot})${RESET}\n`)
  let bad = 0
  const report = (ok: boolean, path: string, note: string): void => {
    if (!ok) bad++
    console.log(`  ${ok ? GREEN + '✓' : RED + '✗'}${RESET} ${path}\n      ${DIM}${note}${RESET}`)
  }

  // The manifest first, when it is requested with --apply: every other request is judged against
  // the manifest this run leaves behind, not the one it started with.
  const requests = manifestFirst(only)
  if (doApply && requests[0] === MANIFEST_ROW) {
    const pending = survey(templateRoot, [MANIFEST_ROW])
    if (!pending.length) report(true, MANIFEST_ROW, 'already matches upstream')
    for (const f of pending) {
      const r = apply(templateRoot, f)
      report(r.ok, f.path, r.note)
    }
  }

  const findings = survey(templateRoot, requests).filter(f => !(doApply && f.path === MANIFEST_ROW))
  const { undeclared, inSync } = classifyRequests(
    requests,
    new Set(manifestPaths()),
    new Set(findings.map(f => f.path))
  )
  for (const p of undeclared) {
    report(
      false,
      p,
      "not declared in this repo's manifest — nothing was done. If upstream now declares it, " +
        `request ${MANIFEST_ROW} in the same --apply run.`
    )
  }
  for (const p of inSync) {
    if (doApply && p === MANIFEST_ROW) continue // reported above, as synced or in sync
    console.log(`  ${GREEN}✓${RESET} ${p}\n      ${DIM}already matches upstream${RESET}`)
  }

  if (!findings.length) {
    if (!only.length)
      console.log(`${GREEN}✓${RESET} every declared shared file already matches upstream\n`)
    process.exit(bad ? 1 : 0)
  }
  if (!doApply) {
    for (const f of findings) {
      console.log(`  ${YELLOW}⚠${RESET} ${f.state.toUpperCase().padEnd(11)} ${f.path}`)
    }
    console.log(`\n${DIM}  Re-run with --apply to sync. Direction is a human call: if THIS repo`)
    console.log(`  holds the fix, promote it upstream first instead.${RESET}\n`)
    process.exit(bad || findings.some(f => f.state === 'no-upstream') ? 1 : 0)
  }
  for (const f of findings) {
    const r = apply(templateRoot, f)
    report(r.ok, f.path, r.note)
  }
  console.log(
    `\n${DIM}  Then: npx tsx scripts/verify-license-headers.ts --apply` +
      `\n  and re-run audit:template-divergence to confirm.${RESET}\n`
  )
  process.exit(bad ? 1 : 0)
}

main()
