// Copyright (c) 2026 whizBANG Developers LLC. All rights reserved.
// Licensed under MIT. See LICENSE.

/**
 * ONE definition of "this shared file matches the archetype", used by every consumer.
 *
 * Two tools ask that question — `audit:template-divergence` (does it still match?) and
 * `sync:template` (make it match) — and they must agree, because a reporter and a repairer that
 * disagree are worse than either alone: the repairer moves files the reporter never flagged, and
 * the reporter keeps flagging files the repairer thinks it fixed.
 *
 * They disagreed on the day this was extracted. The auditor normalised two per-repo line classes
 * before hashing; the newly-written sync script compared raw bytes. Measured on the same 30-path
 * manifest: **auditor 13 forked, sync script 29** — 16 files reported as diverged that were
 * correctly synced and differed only in a licence header. The sync script was the wrong one, and
 * replicating the normalisation into it would have set up the next divergence rather than fixing
 * this one.
 *
 * ── WHY THESE TWO LINES ARE EXEMPT, AND NOTHING ELSE IS ───────────────────────────────────────
 * A shared guard is shared CODE, not a shared licence. The archetype is licence-blank by design
 * (`{{LICENSE_IDENTIFIER}}`); Gantry is proprietary; Weaver is dual. All three are correct, and
 * comparing the licence line would also be circular — the auditor is itself on the manifest, so
 * its own header would fork the moment any consumer declared a different licence.
 *
 * The publish marker (`weaver-free: never-publish …`) is per-repo for the same reason: an
 * archetype has no mirror to be excluded from. Dropping the marker to satisfy a checker would
 * break the gate that reads it — the tail wagging the dog.
 *
 * NORMALISATION IS LINE-SHAPED, NOT BLOCK-SHAPED, and that bound is load-bearing. The obvious
 * generalisation — skip the whole leading comment run — would swallow corpus headers, and a
 * corpus header is the spec its rules are held to. Blinding the checker to that is a silent
 * coverage cut. So each normalised line is named individually; the copyright line, every docblock
 * and all logic still compare byte-for-byte.
 */

import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

/** The only lines allowed to differ between a project's copy and the archetype's. */
export const PER_REPO_HEADER_LINES: [RegExp, string][] = [
  [
    /^.*(Licensed under .*|Proprietary and confidential\. Do not distribute\.).*$/gm,
    '<licence line — per repo, see audit:license-headers>',
  ],
  [
    // `weaver-free:`, `gantry-free:`, … — a publish marker naming the mirror it is excluded from.
    // REMOVED, not substituted: the line exists on only one side, so a placeholder would make the
    // two sides differ by the placeholder itself.
    /^.*\b[a-z0-9-]+-free:\s*never-publish\b.*$\n?/gm,
    '',
  ],
]

/** A file's content with the per-repo lines normalised away. */
export function normalisedBody(path: string): string | null {
  try {
    let body = readFileSync(path, 'utf-8')
    for (const [re, placeholder] of PER_REPO_HEADER_LINES) body = body.replace(re, placeholder)
    return body
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
