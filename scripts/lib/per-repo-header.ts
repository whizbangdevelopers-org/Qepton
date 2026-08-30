// Copyright (c) 2026 whizBANG Developers LLC. All rights reserved.
// Licensed under MIT. See LICENSE.
/**
 * WHICH HEADER LINES ARE PER-REPO — the one definition, read by two consumers.
 *
 * `audit:template-divergence` uses it to decide whether two copies of a shared file MATCH;
 * `sync-shared-file.ts` uses it to decide what to PRESERVE when overwriting one with the other.
 * Those two have to agree by construction. Held as separate copies they would drift, and the
 * failure would be silent in the worst direction: a sync that clobbers a line the auditor then
 * reports as forked, or — worse — one the auditor normalises away so nobody ever sees it.
 *
 * That is not hypothetical. Propagating a shared lib by hand on 2026-08-25 overwrote the
 * template's `{{LICENSE_IDENTIFIER}}` with a downstream repo's proprietary line, three times in
 * one session. Every instance was caught by looking afterwards, which is exactly the control that
 * fails on the day nobody looks.
 *
 * NORMALISATION IS LINE-SHAPED, NOT BLOCK-SHAPED. The obvious generalisation — skip the whole
 * leading comment run — would swallow corpus headers, and a corpus header is the spec its rules
 * are held to. Blinding the checker to that is a silent coverage cut. So each per-repo line is
 * named individually and everything else — the copyright line, every docblock, all logic — still
 * compares byte-for-byte.
 */
export const PER_REPO_HEADER_LINES: [RegExp, string][] = [
  [
    /^.*(Licensed under .*|Proprietary and confidential\. Do not distribute\.).*$/gm,
    '<licence line — per repo, see audit:license-headers>',
  ],
  [
    // `weaver-free:`, `gantry-free:`, … — a publish marker naming the mirror it is excluded from.
    //
    // REMOVED, not substituted. The licence line exists on both sides, so a placeholder makes them
    // equal; a publish marker exists only where there IS a mirror, so substituting leaves the
    // marked file one line longer and still forked.
    /^[ \t]*(?:\/\/|#)[ \t]*[a-z][a-z0-9]*-free:.*\r?\n/gm,
    '',
  ],
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
