// Copyright (c) 2026 whizBANG Developers LLC. All rights reserved.
// Licensed under MIT. See LICENSE.
/**
 * WHICH HEADER LINES ARE PER-REPO — the one definition, read by every consumer.
 *
 * `audit:template-divergence` uses it to decide whether two copies of a shared file MATCH;
 * `sync-shared-file.ts` uses it to decide what to PRESERVE when overwriting one with the other;
 * `sync:template` uses it to decide what to MAKE match. Those three have to agree by construction.
 * Held as separate copies they would drift, and the failure would be silent in the worst
 * direction: a sync that clobbers a line the auditor then reports as forked, or — worse — one the
 * auditor normalises away so nobody ever sees it.
 *
 * That is not hypothetical. Propagating a shared lib by hand on 2026-08-25 overwrote the
 * template's `{{LICENSE_IDENTIFIER}}` with a downstream repo's proprietary line, three times in
 * one session. Every instance was caught by looking afterwards, which is exactly the control that
 * fails on the day nobody looks.
 *
 * ── THERE USED TO BE TWO OF THESE, AND THEY DISAGREED (FORGE-54) ──────────────────────────────
 * `lib/template-normalise.ts` held a second, independently-written copy of these rules. FORGE-54
 * (template-normalise is retired; per-repo-header is the single normalisation predicate) retired
 * it rather than merging it, and the reason is worth keeping next to the surviving pattern,
 * because the tempting repair imports the defect:
 *
 *   template-normalise rule 2:  /^.*\b[a-z0-9-]+-free:\s*never-publish\b.*$\n?/gm
 *   per-repo-header rule 2:     /^[ \t]*(?:\/\/|#)[ \t]*[a-z][a-z0-9]*-free:.*\r?\n/gm   (was)
 *
 * The first is anchored on `^.*`, so it strips any line MENTIONING the marker — docblock prose,
 * test-fixture strings — as readily as a real marker. The second required a `//` or `#` opener,
 * so it was precise about comments and BLIND to the HTML-comment form every markdown-family file
 * uses. Measured across the declared set: Weaver 16 file instances / 25 lines, Gantry 6 files /
 * 9 lines, replicated independently. Taking the broader pattern would have made the survivor
 * over-strip; so rule 2 below is widened by ANCHORING ON A COMMENT OPENER IMMEDIATELY FOLLOWED BY
 * THE MARKER TOKEN, and never by `^.*`.
 *
 * That distinction is the whole rule, and the corpus at the bottom pins it in both directions:
 * `<!-- weaver-free: never-publish -->` must be stripped, and ` * the \`weaver-free:\` marker`
 * must NOT be. If you widen this pattern again, add both halves of the new case.
 *
 * NORMALISATION IS LINE-SHAPED, NOT BLOCK-SHAPED. The obvious generalisation — skip the whole
 * leading comment run — would swallow corpus headers, and a corpus header is the spec its rules
 * are held to. Blinding the checker to that is a silent coverage cut. So each per-repo line is
 * named individually and everything else — the copyright line, every docblock, all logic — still
 * compares byte-for-byte.
 */
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

/**
 * A comment opener, for the publish-marker rule ONLY.
 *
 * `<!--` and `/*` and a bare `*` are here so the HTML-comment and block-comment marker forms are
 * seen; they are NOT a licence to match mid-line. The marker token must follow the opener with
 * only whitespace between, which is what keeps docblock PROSE about a marker out of the match.
 */
const COMMENT_OPENER = String.raw`(?:\/\/|#|<!--|\/\*|\*)`

export const PER_REPO_HEADER_LINES: [RegExp, string][] = [
  [
    /^.*(Licensed under .*|Proprietary and confidential\. Do not distribute\.).*$/gm,
    '<licence line — per repo, see audit:license-headers>'
  ],
  [
    // `weaver-free:`, `gantry-free:`, … — a publish marker naming the mirror it is excluded from.
    //
    // REMOVED, not substituted. The licence line exists on both sides, so a placeholder makes them
    // equal; a publish marker exists only where there IS a mirror, so substituting leaves the
    // marked file one line longer and still forked.
    new RegExp(String.raw`^[ \t]*${COMMENT_OPENER}[ \t]*[a-z][a-z0-9]*-free:.*\r?\n`, 'gm'),
    ''
  ]
]

/** The comparison form: two copies of a shared file are "identical" iff these match. */
export function normaliseForCompare(body: string): string {
  let out = body
  for (const [re, placeholder] of PER_REPO_HEADER_LINES) out = out.replace(re, placeholder)
  return out
}

/**
 * The per-repo lines a destination file owns and a sync must NOT inherit from upstream.
 *
 * Returned verbatim and in file order. `licence` is the single licence line (files carry exactly
 * one); `publishMarkers` is every `<repo>-free:` line, each WITH its trailing newline, because
 * they are removed rather than substituted and so must be re-inserted whole.
 */
export function extractPerRepoLines(body: string): {
  licence: string | null
  publishMarkers: string[]
} {
  const [licenceRule, markerRule] = PER_REPO_HEADER_LINES
  const licence = body.match(new RegExp(licenceRule![0].source, 'm'))?.[0] ?? null
  const publishMarkers = body.match(new RegExp(markerRule![0].source, 'gm')) ?? []
  return { licence, publishMarkers }
}

/**
 * Publish-marker DECLARATIONS, found by a deliberately different mechanism.
 *
 * This is NOT the predicate above and must never be reconciled with it. It exists so a guard can
 * check marker preservation WITHOUT re-using the rule it is guarding. `sync-shared-file.ts` used
 * to verify its own graft with `extractPerRepoLines`, so when that rule was blind to a marker the
 * guard counted 0 before and 0 after, `0 !== 0` was false, and the tool deleted a
 * `never-publish` marker while logging "publish marker(s) preserved" — the exact failure it was
 * built to prevent (FORGE-54). A guard that shares its subject's blind spot is not a guard.
 *
 * THE INDEPENDENCE IS STRUCTURAL, NOT MERELY A SECOND COPY. Rule 2 enumerates comment openers;
 * this strips ANY leading punctuation run and then requires the marker token first. So a comment
 * syntax nobody added to rule 2 — `-- weaver-free:` in SQL, say — is invisible to the rule and
 * still visible here, which is the case where a guard has to survive its subject being wrong.
 *
 * It is deliberately NOT a scan for every line MENTIONING a marker. That was the first draft, and
 * it is over-broad in the direction that gets a guard switched off: upstream legitimately editing
 * a docblock that discusses a marker would refuse the sync. Requiring the token to lead means
 * prose about a marker is not a declaration, which is the same boundary the corpus pins.
 */
export function publishMarkerDeclarations(body: string): string[] {
  return body.split(/\r?\n/).filter(l => /^[\s/*#<!-]*[a-z][a-z0-9]*-free:/.test(l))
}

/** A file's content with the per-repo lines normalised away, or null when it cannot be read. */
export function normalisedBody(path: string): string | null {
  try {
    return normaliseForCompare(readFileSync(path, 'utf-8'))
  } catch {
    return null
  }
}

/** Hash of the normalised content, or null when the file cannot be read. */
export function normalisedHash(path: string): string | null {
  const body = normalisedBody(path)
  return body === null ? null : createHash('sha256').update(body).digest('hex')
}

/** True when both files exist and match under normalisation. */
export function matchesArchetype(a: string, b: string): boolean {
  const ha = normalisedHash(a)
  const hb = normalisedHash(b)
  return ha !== null && hb !== null && ha === hb
}

/* ────────────────────────────────────────────────────────────────────────────────────────────
 * CORPUS — paired, and the IGNORE half is the one that matters.
 *
 * The CATCH half proves the rule can fire. The IGNORE half proves it did not become
 * `template-normalise` while nobody was looking: a rule that strips prose about a marker
 * over-strips exactly as the retired one did, and a rule that flags legitimate input gets
 * switched off, after which it catches nothing at all.
 * ──────────────────────────────────────────────────────────────────────────────────────────── */

/** Lines the publish-marker rule MUST strip. */
const MARKER_CATCH: [string, string][] = [
  ['line comment', '// weaver-free: never-publish — Dev-only tooling.\n'],
  ['hash comment', '# weaver-free: never-publish — internal auditor.\n'],
  ['html comment', '<!-- weaver-free: never-publish — Dev-only doc. -->\n'],
  ['block comment open', '/* gantry-free: never-publish — reason. */\n'],
  ['block comment continuation', ' * weaver-free: never-publish — reason.\n'],
  ['indented line comment', '    // weaver-free: never-publish — nested.\n'],
  ['no reason, still a declaration', '// weaver-free: never-publish\n'],
  ['other product prefix', '// qepton-free: never-publish — reason.\n']
]

/** Lines the publish-marker rule MUST NOT touch. */
const MARKER_IGNORE: [string, string][] = [
  ['docblock prose ABOUT a marker', ' * The `weaver-free: never-publish` marker is per-repo.\n'],
  ['prose naming the token mid-sentence', '// per-repo-header accepts content after `-free:`.\n'],
  ['manifest prose', '# publish-marker pattern: template-normalise required never-publish;\n'],
  ['a quoted fixture string', "  ['marker', '// weaver-free: never-publish'],\n"],
  ['plain code that happens to end in -free', 'const isFree = tier === "free:"\n'],
  ['the licence line itself', '// Licensed under {{LICENSE_IDENTIFIER}}. See LICENSE.\n']
]

export function selfTest(): number {
  let fails = 0
  const t = (label: string, cond: boolean) => {
    console.log(`  ${cond ? 'ok   ' : 'FAIL '} ${label}`)
    if (!cond) fails++
  }

  console.log('\n  publish marker — CATCH (must be stripped)')
  for (const [label, line] of MARKER_CATCH) {
    t(label, normaliseForCompare(line) === '')
  }

  console.log('\n  publish marker — IGNORE (must survive untouched)')
  for (const [label, line] of MARKER_IGNORE) {
    // The licence case is normalised by rule 1 by design; every other case must be byte-identical.
    const out = normaliseForCompare(line)
    t(label, label === 'the licence line itself' ? out !== '' : out === line)
  }

  console.log('\n  licence line — both flavours: a tiered product and a proprietary one')
  const TIERED = '// Licensed under AGPL-3.0 (Free) or BSL-1.1 (Solo/Team/Fabrick). See LICENSE.\n'
  const PROPRIETARY = '// Proprietary and confidential. Do not distribute.\n'
  const PLACEHOLDER = '// Licensed under {{LICENSE_IDENTIFIER}}. See LICENSE.\n'
  t(
    'tiered and proprietary normalise EQUAL',
    normaliseForCompare(TIERED) === normaliseForCompare(PROPRIETARY)
  )
  t(
    'placeholder and proprietary normalise EQUAL',
    normaliseForCompare(PLACEHOLDER) === normaliseForCompare(PROPRIETARY)
  )
  t(
    'proprietary licence is extracted, not missed',
    extractPerRepoLines(PROPRIETARY).licence !== null
  )

  console.log('\n  extraction — the sync path reads the same rule the comparison does')
  const HTML_MARKED = [
    '<!-- Copyright (c) 2026 whizBANG Developers LLC. All rights reserved. -->',
    '<!-- Licensed under AGPL-3.0 (Free) or BSL-1.1. See LICENSE. -->',
    '<!-- weaver-free: never-publish — Dev-only doc. -->',
    '',
    '# Heading',
    ''
  ].join('\n')
  const html = extractPerRepoLines(HTML_MARKED)
  t('html-comment marker is extracted (was 0 before FORGE-54)', html.publishMarkers.length === 1)
  t('html-comment licence is extracted', html.licence !== null)

  console.log('\n  the independent guard — different mechanism, same boundary')
  const decl = publishMarkerDeclarations
  for (const [label, line] of MARKER_CATCH) {
    t(`guard sees the ${label} declaration`, decl(line).length === 1)
  }
  t(
    'guard sees a syntax rule 2 does NOT enumerate (SQL `--`)',
    decl('-- weaver-free: never-publish — reason.\n').length === 1
  )
  t(
    '...and rule 2 is indeed blind to it, so the guard is not a second copy',
    normaliseForCompare('-- weaver-free: never-publish — reason.\n') !== ''
  )
  for (const [label, line] of MARKER_IGNORE) {
    if (label === 'the licence line itself') continue
    t(`guard does NOT call the ${label} a declaration`, decl(line).length === 0)
  }

  console.log(`\n  ${fails === 0 ? 'PASS' : `FAIL — ${fails}`}\n`)
  return fails
}

/**
 * Run the corpus only when this file IS the entry point.
 *
 * A bare `process.argv[2] === '--self-test'` here is a trap: this is a library, so every consumer
 * invoked with `--self-test` — `sync-shared-file.ts`, `audit-template-divergence.ts` — would
 * import it, hit that check, run THIS corpus and `process.exit` before its own self-test ran. It
 * would report a confident PASS for a suite that never executed. Caught 2026-09-01 by the tail of
 * a sync-shared-file self-test printing per-repo-header's case names.
 */
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.includes('--self-test')) process.exit(selfTest() === 0 ? 0 : 1)
}
