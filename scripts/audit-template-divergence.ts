// Copyright (c) 2026 whizBANG Developers LLC. All rights reserved.
// Licensed under MIT. See LICENSE.
/**
 * audit-template-divergence.ts — shared portfolio files must not fork.
 *
 * WHY
 *
 * quasar-project-template and every project descended from it (Weaver, Gantry, Qepton) carry
 * copies of shared infrastructure. Those copies can diverge, and the portfolio has already been
 * bitten: the template and Weaver forked on scripts/audit-sast.ts — the template was fixed,
 * Weaver kept the broken copy, and both were true for an unknown length of time. The only sync
 * tooling was a sonnet agent invoked manually before releases, whose content check read "the
 * first 20 lines and flag if substantially different". A fork deep in a rules array is invisible
 * to that.
 *
 * This is the deterministic backstop. It runs in the compliance chain, every push, no judgment
 * and no memory required: for each file declared in scripts/shared-with-template.txt, the
 * project's copy must byte-match the template's. A mismatch WARNS.
 *
 * WARN, NOT FAIL — on purpose, same discipline as audit:core-drift's staleness check. Divergence
 * can be caused by either side (the template advanced, OR this project has a fix worth promoting
 * upstream), so which direction is authoritative is a human call. A hard fail would break a
 * project's CI every time the template moved. The warning makes the fork loud; a human reconciles
 * it (promote up, or re-sync down).
 *
 * DEGRADES TO SILENCE when it cannot run — the template repo is not on this machine (CI, a fresh
 * clone), git/fs unavailable. A divergence signal that broke CI in those cases would be worse
 * than no signal.
 *
 * A BROKEN MANIFEST IS A FAILURE, not a warning: if a declared path is missing from the TEMPLATE,
 * the list itself is wrong and must be fixed. That is the one thing this auditor is strict about,
 * because a manifest that points at nothing is a checker that checks nothing.
 */

import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join, dirname, resolve, relative, sep } from 'path'
import { fileURLToPath } from 'url'
import { execFileSync } from 'child_process'

import { normalisedHash as sha256 } from './lib/template-normalise.js'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))

/**
 * The git repo root — ASKED OF GIT, never assumed to be `<scripts>/../..`.
 *
 * The naive form is correct in every repo whose package sits at `<repo>/code/`, and silently wrong
 * in one that nests it deeper. Measured 2026-08-30: for qepton-project, whose package is at
 * `code/Qepton-Dev/`, `resolve(SCRIPT_DIR, '..', '..')` yields `<repo>/code` — so every declared
 * path would have been resolved against the wrong tree and reported honestly about a directory
 * nobody meant.
 *
 * `verify-command-cwd.ts` already derives its root this way and its docblock names this exact
 * repo as the reason. The two auditors sit in the same directory and disagreed on how to find the
 * root they both scan; this is the sibling adopting the idiom that was already documented as
 * correct. Verified a NO-OP for the three repos whose package is at `code/` — the git root and the
 * `../..` root are the same path there — and correct for the one where they differ.
 */
const REPO_ROOT = execFileSync('git', ['-C', SCRIPT_DIR, 'rev-parse', '--show-toplevel'], {
  encoding: 'utf-8',
}).trim()
const MANIFEST = join(SCRIPT_DIR, 'shared-with-template.txt')

/**
 * The licence line is EXCLUDED from the comparison, deliberately — added 2026-08-11.
 *
 * These files are meant to be byte-identical portfolio-wide; their licence headers are meant to be
 * per-repo. Both are correct, and they are incompatible, so one of them has to give. It cannot be
 * the licence: the template is licence-blank by design (`{{LICENSE_IDENTIFIER}}`) and Gantry is
 * proprietary, and it was exactly a copied-along Weaver header that put an AGPL/BSL claim on eight
 * Gantry files. A shared guard is shared CODE, not a shared licence.
 *
 * Comparing the licence line would also be circular: this very file is on the shared manifest, so
 * its own header would fork the moment any consumer declared a different licence — and the fix for
 * that fork is this exemption.
 *
 * EXTENDED 2026-08-13 to the per-repo PUBLISH MARKER, for the same reason and no further.
 *
 * Weaver annotates files excluded from its public mirror with a `weaver-free: never-publish …`
 * line that `audit:free-tree` reads against its sync-exclude manifest. That line is as per-repo as
 * the licence — a template has no mirror to exclude from — and it kept two correctly-synced files
 * reporting as forked. The alternative was for Weaver to drop the marker, which would have broken a
 * gate that reads it, to satisfy a checker: the tail wagging the dog.
 *
 * NORMALISATION IS DELIBERATELY LINE-SHAPED, NOT BLOCK-SHAPED. The obvious generalisation — skip
 * the whole leading comment run — would have swallowed the corpus headers, and a corpus header is
 * the spec its rules are held to (`sast-secret-corpus.txt` opens with the reasoning for every
 * class it pins). Blinding the checker to that is a silent coverage cut, which is the failure this
 * whole exchange has been about. So each normalised line is named individually and everything else
 * — the copyright line, every docblock, all logic — still compares byte-for-byte.
 */
function isDir(path: string): boolean {
  try {
    return statSync(path).isDirectory()
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

// ---------------------------------------------------------------------------
// Reach — is anything portfolio-wide MISSING from the template entirely?
//
// The manifest check answers "do the DECLARED shared files still match?". It cannot answer
// "should this file have been declared in the first place?" — and that is the gap both of this
// portfolio's real incidents fell through:
//
//   - two Weaver knowledge entries sat unprojected into the archetype for 17 days;
//   - three core rules were weaver-ahead and surfaced only via a hand-written carry-in.
//
// Neither was on the manifest, so neither was ever compared. A file nobody declared is a file
// nobody checks, and "never declared" is indistinguishable from "in sync" when the only control
// is a declared-list diff.
//
// `.claude/rules/core/` is the population with a machine-checkable claim attached: core/ MEANS
// stack-agnostic — that is the entire premise of the core/stack split, which exists because
// universal invariants hidden behind a TypeScript glob never loaded in a PHP repo. A core rule
// that exists in only one repo contradicts its own directory.
//
// PRESENCE, not equality. Weaver's core/security.md legitimately names sops-nix and Decision
// WVR-73; the template's cannot. Demanding byte-equality here would force either a permanent
// false fork-warning or the deletion of project-specific detail. Presence is the assertion that
// actually holds for this population — equality is what the manifest above is for.
// ---------------------------------------------------------------------------

/**
 * core/ rules that are legitimately project-specific despite living in core/.
 * Each carries a reason — a bare exemption is gaming (never-game-auditors.md).
 */
const REACH_EXEMPT: Record<string, string> = {
  'terminology.md':
    'Product vocabulary by definition — tier names, Rethread, Ply, Jacquard, license-key ' +
    'prefixes. It lives in core/ because it must ALWAYS load, not because it is portfolio-wide. ' +
    'The template carries its own.',
}

/**
 * Knowledge categories present in a store, DERIVED from the store rather than listed.
 *
 * This was `['lessons', 'gotchas']`, hardcoded — and this template's own store has carried a
 * `heuristics/` directory the whole time, so the reach check below has been scanning a strictly
 * smaller universe than it reported on, and printing green. That is the
 * "an auditor's universe must match its consumer's" failure occurring inside the auditor whose
 * job is to catch that class.
 *
 * Caught 2026-08-13 by the Weaver session, which refused to overwrite its copy with this one on
 * exactly these grounds. Weaver solves it by importing SUBDIRS from a vocab module backed by a
 * vendored engram projection — correct there, and more apparatus than this file should drag into
 * every scaffolded project. Reading the directory is the same principle with no dependency: the
 * categories are whatever the store actually has, so a third one is visible the day it appears.
 */
function knowledgeCategories(base: string): string[] {
  try {
    return readdirSync(base, { withFileTypes: true })
      .filter(e => e.isDirectory())
      .map(e => e.name)
      .sort()
  } catch {
    return []
  }
}

/** Entry ids declared `scope: universal` in a project's knowledge store. */
function universalEntryIds(root: string): Set<string> {
  const out = new Set<string>()
  const base = join(root, 'code', 'docs', 'knowledge')
  for (const cat of knowledgeCategories(base)) {
    const dir = join(base, cat)
    let files: string[]
    try {
      files = readdirSync(dir).filter(f => f.endsWith('.md'))
    } catch {
      continue
    }
    for (const f of files) {
      let text: string
      try {
        text = readFileSync(join(dir, f), 'utf-8')
      } catch {
        continue
      }
      const re = /<!--\s*entry:([A-Za-z0-9-]+)\s*-->([\s\S]*?)(?=<!--\s*entry:|$)/g
      let m: RegExpExecArray | null
      while ((m = re.exec(text)) !== null) {
        if (/^scope:\s*universal\s*$/m.test(m[2]!)) out.add(m[1]!)
      }
    }
  }
  return out
}

/**
 * A `scope: universal` entry is, by its own declaration, true for any project on any stack — that
 * is what the rung MEANS, and it is why the projection copies it into every scaffolding template.
 * So an entry marked universal that never arrives upstream is contradicting its own scope, in
 * exactly the way a core/ rule that exists in one repo contradicts its directory.
 *
 * This is the half the earlier reach check did not cover, and it is where the 17-day incident
 * actually happened: two entries were unroutable, reached no consumer, and nothing noticed —
 * because the only thing watching was a human writing a carry-in note.
 */
function checkKnowledgeReach(templateRoot: string): void {
  const mine = universalEntryIds(REPO_ROOT)
  if (mine.size === 0) {
    console.log('  Reach (knowledge) — no scope:universal entries here; skipped.\n')
    return
  }

  const theirs = universalEntryIds(templateRoot)
  if (theirs.size === 0) {
    console.warn(
      '  ⚠ the template has NO scope:universal entries — either its store moved, or this check\n' +
        '    is reading the wrong path and has gone blind. Verify before trusting a later PASS.\n',
    )
    return
  }

  const missing = [...mine].filter(id => !theirs.has(id)).sort()
  if (missing.length === 0) {
    console.log(`  ✓ reach (knowledge) — all ${mine.size} scope:universal entr(ies) reach the template.\n`)
    return
  }

  for (const id of missing.slice(0, 12)) {
    console.warn(`  ⚠ UNIVERSAL but NOT IN TEMPLATE: ${id}`)
  }
  if (missing.length > 12) console.warn(`  ⚠ …and ${missing.length - 12} more`)
  console.warn(
    '\n    These declare themselves true for any project on any stack, but never arrived upstream.\n' +
      '    Re-run the knowledge projection, or correct the scope if they are not actually universal.\n' +
      '    Warning only — which of the two it is, is a human call.\n',
  )
}

function checkReach(templateRoot: string): void {
  const coreDir = join(REPO_ROOT, '.claude', 'rules', 'core')
  if (!isDir(coreDir)) {
    console.log('  Reach — no .claude/rules/core/ here; skipped (split not adopted).\n')
    return
  }

  let mine: string[]
  try {
    mine = readdirSync(coreDir).filter(f => f.endsWith('.md')).sort()
  } catch {
    return
  }

  // Saturation guard: an empty population would report clean forever.
  if (mine.length === 0) {
    console.error('  ✗ .claude/rules/core/ exists but holds no rules — this check has gone blind.\n')
    process.exit(1)
  }

  const exempt = mine.filter(f => REACH_EXEMPT[f])
  const missing = mine.filter(
    f => !REACH_EXEMPT[f] && sha256(join(templateRoot, '.claude', 'rules', 'core', f)) === null,
  )

  if (missing.length === 0) {
    const n = mine.length - exempt.length
    const suffix = exempt.length > 0 ? ` (${exempt.length} exempt)` : ''
    console.log(`  ✓ reach — all ${n} portfolio-wide core rule(s) reach the template${suffix}.\n`)
    return
  }

  for (const f of missing) {
    console.warn(`  ⚠ NOT IN TEMPLATE (core/ means stack-agnostic): .claude/rules/core/${f}`)
  }
  console.warn(
    '\n    A core/ rule is stack-agnostic by definition, so one that exists only here is either\n' +
      '      • owed upstream — extract it, editing for generality on the way up; or\n' +
      '      • not actually portfolio-wide — move it out of core/, or add it to REACH_EXEMPT\n' +
      '        with a reason.\n' +
      '    Warning only — which of the two it is, is a human call.\n',
  )
}

// ---------------------------------------------------------------------------
// Reach, the OTHER way — what does the archetype carry under .claude/ that this repo does not?
//
// checkReach() and checkKnowledgeReach() both run project → archetype: "is anything of mine owed
// upstream?" Nothing asked the reverse, and the reverse is where a scaffolded project silently
// falls behind. Measured in Gantry, 2026-08-28: `.claude/hooks/lib/command-forms.sh` and
// `.claude/rules/conventions/decisions.md` were both absent, and BOTH were found by a hand diff
// during a one-off review — no auditor was capable of reporting either. Gantry's own
// verify-hooks.ts even carried a comment naming command-forms.sh as a live consumer of a file
// this repo does not have.
//
// This is the same argument checkReach()'s own docblock makes, pointed the other way: "a file
// nobody declared is a file nobody checks, and 'never declared' is indistinguishable from 'in
// sync' when the only control is a manifest."
//
// ── WHY DIRECTORY ADOPTION, AND NOT AN EXEMPTION LIST ────────────────────────────────────────
// The naive version flags every archetype file a project lacks, which is wrong for a project that
// has legitimately not taken a whole layer — a repo with no `.claude/rules/stack/` is not behind,
// it is a different stack. So the rule is derived from the consumer rather than listed here:
//
//   directory absent here  → the layer was never adopted. Silent.
//   directory present here → partial adoption. A file missing from it is drift, and is reported.
//
// That needs no maintenance, cannot drift, and gives the IGNORE half for free — which matters,
// because a checker that flags every legitimately-absent file gets switched off on its first run
// and then catches nothing at all.
//
// ── WHAT IS EXEMPT BY DOCTRINE, AND WHY EACH ─────────────────────────────────────────────────
// Only two, both structural rather than a matter of taste:
//
//   rules/core/, hooks/core/  — owned by `audit:core-drift`, which already reports "nothing
//                               unfed" against a checksum manifest. ONE OWNER PER ARTIFACT
//                               (core/single-source-generated.md): two checkers reporting the
//                               same absence is how a finding gets read twice and fixed never.
//   rules/product/            — "one product only. Never leaves it." (feed-core.sh). A product
//                               repo's product/ rules are its own; comparing them is a category
//                               error, not a gap.
const ARCHETYPE_REACH_SKIP_DIRS = ['rules/core', 'hooks/core', 'rules/product']

/** Every file under a directory, as paths relative to it. Returns [] if the dir is absent. */
function filesUnder(root: string, prefix = ''): string[] {
  let entries: import('fs').Dirent[]
  try {
    entries = readdirSync(join(root, prefix), { withFileTypes: true })
  } catch {
    return []
  }
  const out: string[] = []
  for (const e of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const rel = prefix ? `${prefix}/${e.name}` : e.name
    if (e.isDirectory()) out.push(...filesUnder(root, rel))
    else out.push(rel)
  }
  return out
}

export type ArchetypeReach = {
  /** present in the archetype, absent here, inside a directory this repo HAS adopted */
  missing: string[]
  /** whole layers this repo has not adopted — silent, but counted so a vacuous pass is visible */
  unadopted: string[]
  /** archetype files considered (after the doctrinal skips) */
  considered: number
}

export function archetypeReach(archetypeClaude: string, projectClaude: string): ArchetypeReach {
  const skip = (rel: string) => ARCHETYPE_REACH_SKIP_DIRS.some(d => rel === d || rel.startsWith(`${d}/`))

  const theirs = filesUnder(archetypeClaude).filter(f => !skip(f))
  const missing: string[] = []
  const unadopted = new Set<string>()

  for (const rel of theirs) {
    if (statSafe(join(projectClaude, rel))) continue

    const dir = rel.includes('/') ? rel.slice(0, rel.lastIndexOf('/')) : ''
    // A top-level file (dir === '') is inside `.claude/` itself, which exists by construction —
    // so it is always "adopted" and its absence is always drift.
    if (dir && !isDir(join(projectClaude, dir))) {
      unadopted.add(dir)
      continue
    }
    missing.push(rel)
  }

  return { missing, unadopted: [...unadopted].sort(), considered: theirs.length }
}

function statSafe(p: string): boolean {
  try {
    statSync(p)
    return true
  } catch {
    return false
  }
}

function checkArchetypeReach(templateRoot: string): void {
  const archetypeClaude = join(templateRoot, '.claude')
  const projectClaude = join(REPO_ROOT, '.claude')

  if (!isDir(projectClaude)) {
    console.log('  Reach (archetype) — no .claude/ here; skipped.\n')
    return
  }

  const { missing, unadopted, considered } = archetypeReach(archetypeClaude, projectClaude)

  // Saturation guard, same discipline as checkReach(): an empty population would report clean
  // forever, and "found nothing" would be indistinguishable from "cannot find anything".
  if (considered === 0) {
    console.error(
      '  ✗ the archetype has no comparable files under .claude/ — this check has gone blind.\n' +
        '    Verify the template path before trusting a later PASS.\n',
    )
    process.exit(1)
  }

  const note = unadopted.length > 0 ? ` (${unadopted.length} unadopted layer(s): ${unadopted.join(', ')})` : ''

  if (missing.length === 0) {
    console.log(`  ✓ reach (archetype) — all ${considered} archetype .claude/ file(s) present here${note}.\n`)
    return
  }

  for (const f of missing) {
    console.warn(`  ⚠ IN ARCHETYPE, NOT HERE: .claude/${f}`)
  }
  console.warn(
    `\n    Each sits in a directory this repo HAS adopted, so it is a partial adoption rather than\n` +
      '    a layer this project declined. Either:\n' +
      '      • take it — `npm run sync:template -- --pull` if it is declared, else copy it and fix\n' +
      '        the licence header for this repo; or\n' +
      '      • record why not — if the archetype file is wrong HERE (its claims do not hold in this\n' +
      '        repo), fix it upstream first; a wrong file copied down is worse than an absent one.\n' +
      `    Warning only — which of the two it is, is a human call.${note ? `\n    Unadopted layers are silent by design: ${unadopted.join(', ')}.` : ''}\n`,
  )
}

/**
 * The DECLARED SET each side is checking, and where they disagree.
 *
 * WHY THIS EXISTS, and it is not "nothing saw it". `shared-with-template.txt` is itself a declared
 * shared file, so a set difference already showed up as `⚠ FORKED … shared-with-template.txt` —
 * one line saying the file differs, among several others saying the same about ordinary files.
 * What no output ever said is what that particular fork MEANS: the two repos are no longer
 * checking the same list.
 *
 * Measured 2026-08-29. The archetype and Gantry declared `sync-template.ts` +
 * `lib/template-normalise.ts`; Weaver declared `sync-shared-file.ts` + `lib/per-repo-header.ts`
 * and carried neither of the first pair. Two sync lineages, two-for-two substitution — and all
 * three manifests read 35 rows, so every count agreed they were healthy. Cardinality was never
 * the property; the SET is.
 *
 * Reported, never fatal: which side is authoritative is the same human call as any other
 * divergence. The failure this fixes is an uninformative signal, not a missing one.
 */
export function declaredSetDiff(mineRaw: string, theirsRaw: string): { onlyMine: string[]; onlyTheirs: string[] } {
  const parse = (s: string) =>
    new Set(s.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#')))
  const mine = parse(mineRaw)
  const theirs = parse(theirsRaw)
  return {
    onlyMine: [...mine].filter(x => !theirs.has(x)).sort(),
    onlyTheirs: [...theirs].filter(x => !mine.has(x)).sort(),
  }
}

/**
 * Where THIS repo's package sits, derived from this script's own location.
 *
 * The manifest's 31 `code/…` rows are package-relative in effect: `code/scripts/x` means "the
 * scripts directory of the package". That reads identically in three repos because their package
 * IS `<repo>/code`. It is wrong in a repo that keeps several products side by side.
 *
 * Measured 2026-08-30: qepton-project's `code/` holds SIX sibling products — Qepton, Qepton-Dev,
 * Qepton-Plugins, Qepton-Plugins-Premium, Qepton-Premium, nur-packages — so its package root is
 * `code/Qepton-Dev`. That is a deliberate tier layout, not drift from this archetype, and the
 * repo must not be restructured to satisfy a path convention.
 *
 * So the prefix is DERIVED rather than declared: no directive in the manifest, no per-repo row,
 * and the file stays byte-identical portfolio-wide — which matters because the manifest declares
 * ITSELF and any directive would show up as a fork. `scripts/` and `.claude/` rows are
 * repo-relative and are left alone.
 *
 * A provable no-op where the package is `<repo>/code`: the substitution replaces `code/` with
 * `code/`. Corpus covers both directions.
 */
const PACKAGE_ROOT = relative(REPO_ROOT, resolve(SCRIPT_DIR, '..')).split(sep).join('/')

/** Resolve a declared path against THIS repo, re-rooting the package-relative rows. */
export function localPath(rel: string, packageRoot: string): string {
  return rel.startsWith('code/') && packageRoot !== 'code'
    ? `${packageRoot}/${rel.slice('code/'.length)}`
    : rel
}

function main(): void {
  const paths = readFileSync(MANIFEST, 'utf-8')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#'))

  if (paths.length === 0) {
    console.error('\n  ✗ shared-with-template.txt declares no files — refusing to pass vacuously.\n')
    process.exit(1)
  }

  const templateRoot = findTemplateRoot()
  if (!templateRoot) {
    console.log('\n  Template divergence — template repo not on this machine; skipped.')
    console.log('  (Set TEMPLATE_ROOT to enable. Not an error — this is expected in CI.)\n')
    return
  }

  // Running inside the template itself: it is the source of truth and cannot fork from itself.
  // Just validate that every declared path actually exists here — a broken manifest is a bug.
  const isTemplate = resolve(templateRoot) === REPO_ROOT
  if (isTemplate) {
    const absent = paths.filter(p => sha256(join(REPO_ROOT, localPath(p, PACKAGE_ROOT))) === null)
    if (absent.length > 0) {
      console.error('\n  ✗ shared-with-template.txt lists files that do not exist in the template:')
      for (const p of absent) console.error(`      ${p}`)
      console.error('    Fix the manifest — a declared path that points at nothing checks nothing.\n')
      process.exit(1)
    }
    console.log(`\n  Template divergence — source of truth; ${paths.length} shared file(s) present.\n`)
    return
  }

  const forked: string[] = []
  const missingHere: string[] = []
  const missingUpstream: string[] = []

  for (const rel of paths) {
    const mine = sha256(join(REPO_ROOT, localPath(rel, PACKAGE_ROOT)))
    const theirs = sha256(join(templateRoot, rel))

    if (theirs === null) {
      missingUpstream.push(rel) // manifest is stale / path renamed upstream
      continue
    }
    if (mine === null) {
      missingHere.push(rel)
      continue
    }
    if (mine !== theirs) forked.push(rel)
  }

  console.log(
    `\n  Template divergence — ${paths.length} shared file(s) vs ${templateRoot.replace(process.env.HOME ?? '~', '~')}\n`,
  )

  // A path missing UPSTREAM means the declared list no longer matches the template — the list is
  // wrong, and that is a hard failure (the one thing this auditor is strict about).
  if (missingUpstream.length > 0) {
    console.error('  ✗ declared shared files are missing from the TEMPLATE — the manifest is stale:')
    for (const p of missingUpstream) console.error(`      ${p}`)
    console.error('    Fix scripts/shared-with-template.txt (here and upstream) to match reality.\n')
    process.exit(1)
  }

  if (forked.length === 0 && missingHere.length === 0) {
    console.log('  ✓ every shared file matches the template. No forks.\n')
    checkReach(templateRoot)
    checkKnowledgeReach(templateRoot)
    checkArchetypeReach(templateRoot)
    return
  }

  // Divergence is a WARNING — loud, listed, non-fatal.
  for (const p of missingHere) console.warn(`  ⚠ MISSING here (present upstream): ${p}`)
  for (const p of forked) console.warn(`  ⚠ FORKED from template:              ${p}`)

  // The manifest forking is not an ordinary fork: it means the two sides are checking DIFFERENT
  // LISTS, and every subsequent line of this report is computed from only one of them. Say so.
  if (forked.some(p => p.endsWith('shared-with-template.txt'))) {
    const upstreamManifest = join(templateRoot, 'code/scripts/shared-with-template.txt')
    if (statSafe(upstreamManifest)) {
      const { onlyMine, onlyTheirs } = declaredSetDiff(
        readFileSync(MANIFEST, 'utf-8'),
        readFileSync(upstreamManifest, 'utf-8'),
      )
      if (onlyMine.length > 0 || onlyTheirs.length > 0) {
        console.warn('\n  ⚠ THE MANIFESTS DECLARE DIFFERENT SETS — this repo and the archetype are')
        console.warn('    checking different lists, so neither report can see the other\'s files.')
        for (const p of onlyMine) console.warn(`      only HERE:      ${p}`)
        for (const p of onlyTheirs) console.warn(`      only ARCHETYPE: ${p}`)
        console.warn(
          `    Counts agree at ${onlyMine.length === onlyTheirs.length ? 'the same number on both sides' : 'different numbers'}` +
            ' — a row count cannot detect a substitution, which is how two\n' +
            '    sync lineages ran portfolio-wide at 35 rows each until 2026-08-29.\n',
        )
      }
    }
  }
  console.warn(
    '\n    These files are meant to be identical portfolio-wide. One side has changed. Reconcile:\n' +
      '      • the template moved  → re-sync the file down into this project;\n' +
      '      • this project has a fix → promote it up into the template, then re-sync everyone.\n' +
      '    Warning only — not a failure. Divergence direction is a human call.\n',
  )
  checkReach(templateRoot)
  checkKnowledgeReach(templateRoot)
  checkArchetypeReach(templateRoot)
}

// ---------------------------------------------------------------------------
// --self-test — the proof this auditor can FAIL.
//
// `scripts/data/auditor-contracts.json` carried this auditor as `proof: "debt"` with the note:
// "NO PROOF — needs a negative test that forks one shared file and confirms it is reported, plus
// a synced file as the ignore half. The per-repo header normalisation needs its own pair: it is
// what stops correctly-synced files reading as forked." That debt is paid here, and the new
// archetype-reach leg ships with its pair rather than adding to it — a leg with no proof is the
// thing the debt entry was complaining about.
//
// Everything runs against synthetic trees in a temp dir. No repo state is read or written.
function selfTest(): number {
  const cases: [boolean, string, string][] = []
  const t = (kind: 'catch' | 'ignore', name: string, ok: boolean) => cases.push([ok, kind, name])

  const tmp = mkdtempSync(join(tmpdir(), 'tmpl-divergence-'))
  const w = (root: string, rel: string, body: string) => {
    mkdirSync(join(root, dirname(rel)), { recursive: true })
    writeFileSync(join(root, rel), body)
  }

  try {
    // ── LEG 1: fork detection + per-repo header normalisation ──────────────────────────────────
    const arch = join(tmp, 'archetype')
    const proj = join(tmp, 'project')
    const LOGIC = 'export const RULES = [1, 2, 3]\n'

    w(arch, 'shared.ts', `// Copyright (c) 2026 X\n// Licensed under {{LICENSE_IDENTIFIER}}. See LICENSE.\n${LOGIC}`)
    w(proj, 'shared.ts', `// Copyright (c) 2026 X\n// Proprietary and confidential. Do not distribute.\n${LOGIC}`)
    t(
      'ignore',
      'a file differing ONLY by its licence line is NOT a fork',
      sha256(join(arch, 'shared.ts')) === sha256(join(proj, 'shared.ts')),
    )

    w(proj, 'forked.ts', `// Copyright (c) 2026 X\n// Proprietary and confidential. Do not distribute.\nexport const RULES = [1, 2]\n`)
    w(arch, 'forked.ts', `// Copyright (c) 2026 X\n// Licensed under {{LICENSE_IDENTIFIER}}. See LICENSE.\n${LOGIC}`)
    t(
      'catch',
      'a one-element difference in the LOGIC is a fork, licence line notwithstanding',
      sha256(join(arch, 'forked.ts')) !== sha256(join(proj, 'forked.ts')),
    )

    // The normalisation must stay LINE-shaped. If it ever swallowed the whole leading comment
    // run, a corpus header — the spec its rules are held to — would stop being compared.
    w(arch, 'corpus.txt', '# CATCH rule-a a-value\n# spec header\nCATCH rule-a real\n')
    w(proj, 'corpus.txt', '# CATCH rule-a a-value\n# spec header CHANGED\nCATCH rule-a real\n')
    t(
      'catch',
      'a changed corpus/docblock header is still a fork (normalisation is line-shaped)',
      sha256(join(arch, 'corpus.txt')) !== sha256(join(proj, 'corpus.txt')),
    )

    // ── LEG 2: archetype reach ─────────────────────────────────────────────────────────────────
    const aC = join(tmp, 'a-claude')
    const pC = join(tmp, 'p-claude')

    w(aC, 'hooks/lib/unwrap-interpreter.sh', 'x')
    w(aC, 'hooks/lib/command-forms.sh', 'x') //          adopted dir, absent here  → CATCH
    w(aC, 'rules/conventions/versioning.md', 'x')
    w(aC, 'rules/conventions/decisions.md', 'x') //      adopted dir, absent here  → CATCH
    w(aC, 'rules/stack/frontend.md', 'x') //             UNADOPTED layer           → ignore
    w(aC, 'rules/product/demo-content.md', 'x') //       doctrine: never travels   → ignore
    w(aC, 'rules/core/security.md', 'x') //              owned by audit:core-drift → ignore
    w(aC, 'hooks/core/block-dangerous.sh', 'x') //       owned by audit:core-drift → ignore
    w(aC, 'settings.json', 'x')

    w(pC, 'hooks/lib/unwrap-interpreter.sh', 'x')
    w(pC, 'rules/conventions/versioning.md', 'x')
    w(pC, 'settings.json', 'x')
    // THE DOCTRINAL DIRECTORIES MUST BE *ADOPTED* HERE, OR THEIR IGNORE CASES PASS FOR THE WRONG
    // REASON. First draft left these absent, so the adoption rule silenced them and emptying
    // ARCHETYPE_REACH_SKIP_DIRS entirely still produced a green self-test — three assertions that
    // proved nothing about the thing they named. Caught by breaking the skip list on purpose and
    // finding the suite unmoved. Each dir now holds a DIFFERENT file from the archetype's, so the
    // only mechanism that can keep the archetype's file out of `missing` is the skip list itself.
    w(pC, 'rules/core/copyright.md', 'x') //          adopted; archetype's security.md still absent
    w(pC, 'hooks/core/precompact-context.sh', 'x') // adopted; archetype's block-dangerous.sh absent
    w(pC, 'rules/product/gantry-only.md', 'x') //     adopted; archetype's demo-content.md absent

    const r = archetypeReach(aC, pC)
    t('catch', 'a file missing from an ADOPTED directory is reported', r.missing.includes('hooks/lib/command-forms.sh'))
    t('catch', 'the conventions/ case is reported too (two independent dirs)', r.missing.includes('rules/conventions/decisions.md'))
    t('ignore', 'an UNADOPTED layer is silent — a different stack is not drift', !r.missing.includes('rules/stack/frontend.md'))
    t('ignore', 'the unadopted layer is still COUNTED, so a vacuous pass is visible', r.unadopted.includes('rules/stack'))
    t('ignore', 'rules/product/ never travels (feed-core.sh doctrine)', !r.missing.some(f => f.startsWith('rules/product/')))
    t('ignore', 'rules/core/ is audit:core-drift\'s to report, not this one\'s', !r.missing.some(f => f.startsWith('rules/core/')))
    t('ignore', 'hooks/core/ likewise', !r.missing.some(f => f.startsWith('hooks/core/')))
    t('ignore', 'a file present in BOTH is not reported', !r.missing.includes('settings.json'))
    t('catch', 'the reported set is exactly the two real gaps, nothing else', r.missing.length === 2)

    // A project that took nothing must not read as clean.
    const empty = archetypeReach(aC, join(tmp, 'nonexistent-claude'))
    t('catch', 'a project with NO adopted layer reports its top-level gap rather than passing', empty.missing.includes('settings.json'))

    // ── LEG 4: declaredSetDiff — the manifests themselves ─────────────────────────────────────
    // The CATCH case is deliberately count-neutral. That is the whole point: the live defect ran
    // at 35 rows on every side while two of the rows had been swapped for two others, so a case
    // where the counts differ would prove nothing about the failure this leg exists to detect.
    const LINEAGE_A = '# comment\ncode/scripts/sync-template.ts\ncode/scripts/lib/template-normalise.ts\ncode/scripts/verify-hooks.ts\n'
    const LINEAGE_B = '# comment\ncode/scripts/sync-shared-file.ts\ncode/scripts/lib/per-repo-header.ts\ncode/scripts/verify-hooks.ts\n'

    const swapped = declaredSetDiff(LINEAGE_A, LINEAGE_B)
    t('catch', 'a two-for-two substitution at EQUAL row counts is reported',
      swapped.onlyMine.length === 2 && swapped.onlyTheirs.length === 2)
    t('catch', 'the substitution names BOTH sides, not just what is missing here',
      swapped.onlyMine.includes('code/scripts/sync-template.ts') &&
      swapped.onlyTheirs.includes('code/scripts/sync-shared-file.ts'))
    t('catch', 'a one-sided addition is reported',
      declaredSetDiff(LINEAGE_A + 'code/scripts/extra.ts\n', LINEAGE_A).onlyMine.length === 1)

    // The IGNORE half decides whether this survives: a manifest that differs only in PROSE must
    // not be reported as a set difference, because comments are where every reason lives and they
    // legitimately differ per repo.
    t('ignore', 'identical sets with different comments are NOT a set difference',
      (() => {
        const d = declaredSetDiff('# one reason\n' + LINEAGE_A, '# a different reason\n\n' + LINEAGE_A)
        return d.onlyMine.length === 0 && d.onlyTheirs.length === 0
      })())
    t('ignore', 'whitespace and blank lines do not create phantom rows',
      (() => {
        const d = declaredSetDiff(LINEAGE_A, LINEAGE_A.replace(/\n/g, '\n\n').replace('code/scripts/sync-template.ts', '  code/scripts/sync-template.ts  '))
        return d.onlyMine.length === 0 && d.onlyTheirs.length === 0
      })())
    t('ignore', 'identical manifests report no difference',
      (() => { const d = declaredSetDiff(LINEAGE_A, LINEAGE_A); return d.onlyMine.length === 0 && d.onlyTheirs.length === 0 })())


    // ── LEG 5: localPath — a package that is not <repo>/code ──────────────────────────────────
    // The IGNORE half is the one that matters here: three of four repos keep their package at
    // `code/`, so this must be a provable no-op for them or it silently re-roots the whole
    // portfolio. The CATCH half is qepton-project, whose code/ holds six sibling products.
    t('ignore', 'package at code/ — a code/ row is untouched',
      localPath('code/scripts/verify-hooks.ts', 'code') === 'code/scripts/verify-hooks.ts')
    t('ignore', 'package at code/ — a repo-relative row is untouched',
      localPath('scripts/add-decision.sh', 'code') === 'scripts/add-decision.sh')
    t('ignore', 'a .claude/ row is repo-relative in EVERY layout',
      localPath('.claude/hooks/lib/strip-heredocs.sh', 'code/Qepton-Dev') === '.claude/hooks/lib/strip-heredocs.sh')
    t('ignore', 'a nested package leaves non-code/ rows alone',
      localPath('scripts/verify-decision-table.py', 'code/Qepton-Dev') === 'scripts/verify-decision-table.py')
    t('catch', 'a nested package re-roots a code/ row',
      localPath('code/scripts/verify-hooks.ts', 'code/Qepton-Dev') === 'code/Qepton-Dev/scripts/verify-hooks.ts')
    t('catch', 're-rooting rewrites only the FIRST segment, not every occurrence',
      localPath('code/scripts/lib/code-utils.ts', 'code/Qepton-Dev') === 'code/Qepton-Dev/scripts/lib/code-utils.ts')

  } finally {
    rmSync(tmp, { recursive: true, force: true })
  }

  const fails = cases.filter(([ok]) => !ok)
  for (const [ok, kind, name] of cases) {
    console.log(`  ${ok ? '\x1b[32mok  \x1b[0m' : '\x1b[31mFAIL\x1b[0m'} ${kind.toUpperCase().padEnd(6)} ${name}`)
  }
  const nCatch = cases.filter(([, k]) => k === 'catch').length
  console.log(`\n  auditor-contract: catch=${nCatch} ignore=${cases.length - nCatch}`)
  if (fails.length > 0) {
    console.error(`\n\x1b[31m\x1b[1mSELF-TEST FAILED\x1b[0m — ${fails.length}/${cases.length}\n`)
    return 1
  }
  console.log(`\n\x1b[32m\x1b[1mSELF-TEST PASS\x1b[0m — ${cases.length} paired case(s)\n`)
  return 0
}

if (process.argv.includes('--self-test')) process.exit(selfTest())

main()
