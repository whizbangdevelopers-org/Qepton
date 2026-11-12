// Copyright (c) 2026 whizBANG Developers LLC. All rights reserved.
// Licensed under MIT. See LICENSE.
/**
 * audit:hooks — the guards are wired, they are not forked, and they still behave.
 *
 * WHAT THIS REPLACED, AND WHY
 * ---------------------------
 * `audit:hooks` used to be exactly one command: `bash ../.claude/hooks/core/block-dangerous.sh
 * --self-test`. That tested one implementation of one hook, and said nothing about whether any
 * hook a session actually LOADS is that implementation.
 *
 * It wasn't. This repo carries two hook trees — `<repo>/.claude/hooks/{core,stack}/` for sessions
 * rooted at the repo, and `code/.claude/hooks/` (flat) for sessions rooted at code/ — each wired by
 * its own settings.json. On 2026-08-12 two of the six pairs had forked:
 *
 *   - block-dangerous.sh   — code/ held the February version: no self-test, and a naive
 *                            `grep -qE 'npx\s+playwright\s+test'` that would have blocked an
 *                            innocent `git commit -m "never run npx playwright test"`. The root
 *                            copy had been fixed on 08-11 and grown paired MUST-BLOCK/MUST-ALLOW
 *                            cases. `audit:hooks` tested only the root copy, so the untested one
 *                            was the one guarding every code session.
 *   - precompact-context.sh — forked the OTHER way: code/ was right (E2E 9031/3220, Gantry's real
 *                            ports) and root still carried the template's 9020/3120. A hook that
 *                            injects a wrong port table into every compaction teaches the wrong
 *                            ports indefinitely.
 *
 * Both directions matter, which is why this checks for DIVERGENCE rather than assuming either tree
 * is authoritative. Same failure as the eight licence headers and the CONTRIBUTING hooksPath line:
 * fixed in one copy, left standing in the other.
 *
 * THE THREE CHECKS
 * ----------------
 *   1. RESOLVE   — every hook command in every settings.json points at a file that exists and is
 *                  executable. A hook that fails to resolve does not error; it silently stops
 *                  guarding, which is indistinguishable from a guard that passed.
 *   2. NO FORK   — a hook present in both trees is either byte-identical, or a delegator that execs
 *                  the other. Two valid forms, no third: an independent second implementation is
 *                  the thing that rots.
 *   3. BEHAVE    — block-dangerous is driven end to end through EVERY path that references it, with
 *                  paired cases: a real bare `npx playwright test` must exit 2, and prose about it
 *                  inside a commit message must exit 0. This is the regression corpus, expressed
 *                  behaviourally — a guard that blocks everything gets switched off on its first
 *                  real run, so the MUST-ALLOW half is as load-bearing as the MUST-BLOCK half.
 *
 * Check 3 is what makes the delegator honest: it is verified by running it, not by reading it, so
 * pasting an implementation back into the delegator does not quietly pass.
 *
 * Checks 4 and 5 (inline hooks; every hook file wired) and 6 (DELIVER: a PreToolUse/PostToolUse
 * hook's words reach the session) are described where they are defined.
 */
import { execFileSync, spawnSync } from 'node:child_process'
import { accessSync, constants, readFileSync, statSync } from 'node:fs'
import { basename, dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const PKG = join(dirname(fileURLToPath(import.meta.url)), '..')
const REPO = execFileSync('git', ['-C', PKG, 'rev-parse', '--show-toplevel'], {
  encoding: 'utf-8'
}).trim()

const GREEN = '\x1b[32m'
const RED = '\x1b[31m'
const YELLOW = '\x1b[33m'
const DIM = '\x1b[2m'
const OFF = '\x1b[0m'

interface HookRef {
  settings: string // repo-relative settings file
  projectDir: string // absolute dir the relative command resolves against
  command: string // raw command string
  path: string // absolute resolved path of the script
  event: string // the hooks key it is wired under: PreToolUse, PostToolUse, PreCompact, …
}

/** Every `command` string under a settings file's `hooks` tree, at any depth. */
function hookCommands(node: unknown, out: string[] = []): string[] {
  if (Array.isArray(node)) {
    for (const v of node) hookCommands(v, out)
  } else if (node && typeof node === 'object') {
    const rec = node as Record<string, unknown>
    if (typeof rec.command === 'string') out.push(rec.command)
    for (const v of Object.values(rec)) hookCommands(v, out)
  }
  return out
}

function collectHookRefs(problems: string[], inlineOut: InlineHook[]): HookRef[] {
  const settingsFiles = execFileSync('git', ['-C', REPO, 'ls-files'], { encoding: 'utf-8' })
    .split('\n')
    .filter(p => /(^|\/)\.claude\/settings(\.local)?\.json$/.test(p))

  const refs: HookRef[] = []
  for (const rel of settingsFiles) {
    let parsed: unknown
    try {
      parsed = JSON.parse(readFileSync(join(REPO, rel), 'utf-8'))
    } catch (e) {
      problems.push(
        `${rel} is not valid JSON — no hook it declares can load (${(e as Error).message})`
      )
      continue
    }
    // A settings file at <dir>/.claude/settings.json has project dir <dir>; its `./…` commands
    // resolve against that, not against the repo root and not against the caller's cwd.
    const projectDir = resolve(join(REPO, rel), '..', '..')
    const hooks = (parsed as { hooks?: unknown }).hooks
    const events =
      hooks && typeof hooks === 'object' ? Object.entries(hooks as Record<string, unknown>) : []
    for (const [event, groups] of events) {
      for (const command of hookCommands(groups)) {
        // First token is the script; anything after it is arguments.
        const token = command.trim().split(/\s+/)[0]!
        if (!/\.(sh|bash|ts|js|mjs|cjs|py)$/.test(token)) {
          inlineOut.push({ settings: rel, command })
          continue
        }
        refs.push({ settings: rel, projectDir, command, path: resolve(projectDir, token), event })
      }
    }
  }
  return refs
}

export interface InlineHook {
  settings: string
  command: string
}

/**
 * Pure: can this inline command DENY the tool call?
 *
 * Conservative by construction — it looks for the two ways a PreToolUse hook refuses (a `deny`
 * permission decision, or exit status 2). Anything that can refuse is a GUARD and is held to the
 * rule below; anything else is passive and merely warned about.
 */
export function inlineCanDeny(command: string): boolean {
  return /permissionDecision|["']deny["']|\bexit[ \t]+2\b/.test(command)
}

/**
 * Check 4 — a hook that can DENY must be a script file, never inline shell.
 *
 * WHY THIS IS A BAN AND NOT A CONTRACT
 * ------------------------------------
 * The obvious alternative is to let inline guards declare paired cases in a manifest, the way
 * auditors declare their proofs. That was measured first and rejected: portfolio-wide there were
 * 41 script hooks and exactly ONE inline command — a guard, duplicating a script hook that already
 * did the job correctly and was already tested. Building a declaration mechanism for a population
 * of one is machinery for something that should not exist.
 *
 * The reason to ban rather than manage is structural, not stylistic. An inline hook has no
 * `--self-test` entrypoint and nowhere to put a corpus, so it cannot satisfy the
 * prove-it-can-fail contract IN PRINCIPLE — not "has not yet". It also lives in JSON, so it is
 * never linted and never reviewed as code.
 *
 * That is not hypothetical. The one instance grepped the RAW command for
 * `(^|[;&|[:space:]])npx playwright test` — a space is not a command boundary — and denied a
 * `git commit -F -` whose message merely described the rule. It also denied `npm run e2e:live` by
 * matching the NAME, while `audit:e2e-docker-only` honours that same script as a sanctioned
 * exemption with a written reason on the line. Two guards in one repo, disagreeing about one
 * command, and only one of them was testable.
 *
 * Passive inline hooks (echo, log, notify) are warned rather than failed: they cannot block anyone's
 * work, so failing the build over them would be over-broad for no measured benefit.
 */
function checkInline(inline: InlineHook[], problems: string[], warnings: string[]): void {
  for (const h of inline) {
    const oneline = h.command.replace(/\s+/g, ' ').slice(0, 90)
    if (inlineCanDeny(h.command)) {
      problems.push(
        `${h.settings} wires an INLINE shell guard that can deny:\n` +
          `      ${oneline}…\n` +
          '      A guard that can refuse must be a script file, so it can carry a --self-test and a\n' +
          '      paired corpus. Inline shell can carry neither, and is not linted or reviewed as code.'
      )
    } else {
      warnings.push(
        `${h.settings} wires an inline command (passive — cannot deny):\n` +
          `      ${oneline}\n` +
          '      Untestable by construction. Prefer a script file.'
      )
    }
  }
  console.log(
    `  ${GREEN}✓${OFF} ${inline.length} inline hook command(s)` +
      (inline.length === 0 ? ' — every wired hook is a script file' : '')
  )
}

/** Check 1 — the wiring points at something that can actually run. */
function checkResolves(refs: HookRef[], problems: string[]): void {
  for (const ref of refs) {
    let ok = false
    try {
      ok = statSync(ref.path).isFile()
      accessSync(ref.path, constants.X_OK)
    } catch {
      ok = false
    }
    if (!ok) {
      problems.push(
        `${ref.settings} wires "${ref.command}" -> ${relative(REPO, ref.path)}\n` +
          '      which is missing or not executable. That hook silently never runs.'
      )
    }
  }
  console.log(`  ${GREEN}✓${OFF} ${refs.length} wired hook path(s) resolve and are executable`)
}

/**
 * Per-LOCATION header lines, excluded from the comparison — the same normalisation
 * audit:template-divergence performs, for the same reason and no further.
 *
 * The two hook trees sit on opposite sides of a licence boundary. Under the copyright rule,
 * everything below `code/` is distributed and everything above it is Dev-only proprietary, and
 * `audit:license-headers` ENFORCES that per path. So the two copies of a hook are *required* to
 * carry different licence lines, and the publish marker exists only on the distributed side.
 * Comparing those lines compares two things a different auditor guarantees will differ, which
 * would report every pair as forked forever — and a check that fires on every input gets switched
 * off, after which it catches nothing at all.
 *
 * Deliberately LINE-shaped, not block-shaped. Skipping the whole leading comment run would blind
 * this to the docblock, and a hook's docblock is where its behaviour is explained — exactly what
 * you want to notice diverging. Each normalised line is named individually; everything else,
 * including every line of logic, still compares byte-for-byte.
 */
const PER_LOCATION_HEADER: [RegExp, string][] = [
  [
    /^.*(Licensed under .*|Proprietary and confidential\. Do not distribute\.).*$/gm,
    '<licence line — per path, see audit:license-headers>'
  ],
  // REMOVED, not substituted: a publish marker exists only where the file is publishable, so a
  // placeholder would leave the marked copy one line longer and still forked.
  [/^[ \t]*#[ \t]*[a-z][a-z0-9]*-free:.*\r?\n/gm, '']
]

function normalised(path: string): string {
  let text = readFileSync(path, 'utf-8')
  for (const [re, sub] of PER_LOCATION_HEADER) text = text.replace(re, sub)
  return text
}

/**
 * Check 5 — the converse of check 1. Every hook FILE is wired by some settings.json.
 *
 * Check 1 asks "does each wired hook resolve?" and check 5 asks "is each hook wired?". Only
 * together do they cover the surface, exactly as the auditor-contract manifest requires both that
 * every chain entry has a row AND that every row names a live entry: a one-directional check can
 * only ever confirm what it already sees.
 *
 * Found immediately, 2026-08-13: Weaver carried SIX hook files at the repo root that no
 * settings.json referenced. They looked live — same names as the wired copies, same content after
 * the fork reconciliation — and fired for nobody. That is worse than absent, because check 2 was
 * dutifully comparing a live tree against a dead one and reporting the differences as forks
 * needing a decision, when half the pair was inert. It also meant a whole tree of guards could rot
 * with nothing to notice.
 *
 * WARNS rather than fails: a repo may legitimately keep a hook it has deliberately unwired, and a
 * hard failure would make deleting a wiring line break the build before the file is removed.
 */
/**
 * A path inside a vendored feed baseline is NOT a hook — it is a recorded copy of the bytes this
 * repo fed downstream, kept in a consumer so `audit:core-drift` can check the FLOOR offline
 * (FORGE-87).
 *
 * It is deliberately never wired and deliberately never edited, so both of this checker's
 * questions are the wrong ones to ask of it: "is it wired?" answers no by design, and "has it
 * forked?" pairs it against the very hook it is the baseline FOR — the one comparison that is
 * SUPPOSED to differ once a repo extends. Measured 2026-09-12 in Gantry, on the first run after
 * the baseline was vendored: two warnings, both true about the file and false about its meaning,
 * sitting directly above a real fork finding.
 *
 * Inert in THIS repo, which is the feed source and carries no baseline of its own — it lives here
 * because this file is held byte-identical across the portfolio, so a consumer-only patch would
 * fork it. Same shape and same reasoning as the `lib/` exclusion below: the universe of a check
 * must be the universe its question applies to. `audit:core-drift` owns that tree; nothing here does.
 */
const isFeedBaseline = (p: string): boolean =>
  p.includes('/.feed-baseline/') || p.startsWith('.feed-baseline/')

/**
 * The hook NEGATIVE-TEST harness is not a hook either: `negative-tests/*.sh` and the runner
 * `run-negative-tests.sh` that sits at the root of a hook tree.
 *
 * Both of this checker's questions are wrong about it, for the same reasons as the feed baseline.
 * The runner is invoked by `audit:hooks-negative`, not by a settings.json, so "is it wired?" answers
 * no by design. And a per-hook test is named after the hook it breaks, BY CONVENTION —
 * `negative-tests/block-dangerous.sh` tests `block-dangerous.sh` — so pairing by basename read
 * every test as a "fork" of its own subject. Measured 2026-09-12: the archetype printed 5 forks and
 * 5 "fires for nobody" notices, and 3 of the forks and all 5 notices were the harness — the two
 * real forks sat among them. Gantry, on adopting block-sweep-staging.sh with its test, printed 3
 * forks and 5 notices, every one of them the harness.
 *
 * `audit:hooks-negative` owns that tree: it runs every test, refuses on an empty set, and a test
 * whose hook is gone fails there at neg_begin. The runner already leaves every path under a
 * negative-tests directory out of ITS hook universe; this makes the two agree.
 *
 * Matched by PATH SEGMENT, never by substring, so a real hook whose name merely contains
 * "negative-tests" stays in the universe — see HOOK_UNIVERSE_CASES.
 */
const isNegativeTestHarness = (p: string): boolean =>
  /(^|\/)\.claude\/hooks\/negative-tests\//.test(p) ||
  /(^|\/)\.claude\/hooks\/run-negative-tests\.sh$/.test(p)

/**
 * The ONE definition of which tracked files are hooks, read by both the fork check and the wired
 * check. Each used to carry its own copy of the filter, which is how an exclusion lands in one
 * and not the other.
 */
export function inHookUniverse(p: string): boolean {
  return /\.claude\/hooks\/.*\.sh$/.test(p) && !isFeedBaseline(p) && !isNegativeTestHarness(p)
}

/** Paired corpus for `inHookUniverse`. Both halves are real paths from this portfolio's trees. */
const HOOK_UNIVERSE_CASES: [boolean, string][] = [
  [true, '.claude/hooks/core/block-dangerous.sh'],
  [true, 'code/.claude/hooks/block-sweep-staging.sh'],
  [true, '.claude/hooks/block-dangerous.sh'], // a FLAT root tree, where the runner also lives
  [true, '.claude/hooks/lib/strip-heredocs.sh'], // a lib stays in: checkWired asks it a different question
  [true, '.claude/hooks/core/negative-tests-reminder.sh'], // substring, not a segment
  [false, '.claude/hooks/negative-tests/block-dangerous.sh'],
  [false, '.claude/hooks/negative-tests/lib.sh'],
  [false, '.claude/hooks/negative-tests/run-negative-tests.sh'],
  [false, '.claude/hooks/run-negative-tests.sh'],
  [false, '.claude/.feed-baseline/.claude/hooks/core/block-dangerous.sh'],
  [false, 'code/.claude/hooks/block-dangerous.md']
]

function hookUniverseSelfTest(): string[] {
  return HOOK_UNIVERSE_CASES.filter(([expect, p]) => inHookUniverse(p) !== expect).map(
    ([expect, p]) => `MUST ${expect ? 'be' : 'NOT be'} in the hook universe: ${p}`
  )
}

function checkWired(refs: HookRef[], warnings: string[]): void {
  const wired = new Set(refs.map(r => r.path))
  const all = execFileSync('git', ['-C', REPO, 'ls-files'], { encoding: 'utf-8' })
    .split('\n')
    .filter(inHookUniverse)

  // A file under `.claude/hooks/lib/` is SOURCED by a hook; it is never named in a settings.json,
  // and it never can be. Asking "is it wired?" of a library is the wrong question, and the answer
  // was two permanent warnings that were true about the fact and false about the meaning —
  // "it looks live and fires for nobody" said of unwrap-interpreter.sh, which fires inside every
  // guard in the tree. Standing warnings that cannot be actioned are how a warning stops being
  // read, and this one sat directly above real fork findings.
  //
  // The signal is kept, not suppressed: the right question for a lib is whether anything SOURCES
  // it, which still catches a genuinely dead helper.
  const libs = all.filter(p => /\.claude\/hooks\/lib\//.test(p))
  const files = all.filter(p => !libs.includes(p))

  // SEARCH THE WHOLE REPO, NOT JUST THE HOOK FILES.
  //
  // A lib's consumers are not all hooks. `command-forms.sh` is sourced by
  // `code/scripts/verify-hook-forms.sh`, an auditor — so a scan limited to `.claude/hooks/`
  // reported a live, load-bearing helper as dead code. Measured 2026-08-25, in the first run of
  // this very check: it replaced one false warning ("wired by nothing", asked of a file that can
  // never be wired) with another, which is the failure mode a checker's IGNORE half exists to
  // catch. The universe of a reference check must be the universe the reference can come from.
  const consumers = execFileSync('git', ['-C', REPO, 'ls-files'], { encoding: 'utf-8' })
    .split('\n')
    .filter(Boolean)
    .filter(p => !libs.includes(p))
  const corpus = consumers
    .map(p => {
      try {
        return readFileSync(join(REPO, p), 'utf-8')
      } catch {
        return ''
      }
    })
    .join('\n')
  for (const lib of libs) {
    if (!corpus.includes(basename(lib))) {
      warnings.push(
        `${lib} is referenced by no tracked file — a helper nothing loads is dead code.\n` +
          '      Either source it from the consumer that needs it, or delete it.'
      )
    }
  }

  const orphans = files.filter(p => !wired.has(join(REPO, p)))
  for (const p of orphans) {
    warnings.push(
      `${p} is wired by no settings.json — it looks live and fires for nobody.\n` +
        '      Either wire it, or delete it. An unwired guard rots with nothing to notice.'
    )
  }
  const libNote = libs.length ? `, ${libs.length} sourced lib(s)` : ''
  console.log(
    orphans.length === 0
      ? `  ${GREEN}✓${OFF} ${files.length} hook file(s), all wired${libNote}`
      : `  ${YELLOW}!${OFF} ${files.length} hook file(s), ${YELLOW}${orphans.length} wired by nothing${OFF}${libNote}`
  )
}

/** Does `file` delegate to `target` rather than reimplementing it? */
function delegatesTo(file: string, target: string): boolean {
  const text = readFileSync(file, 'utf-8')
  if (!/\bexec\b/.test(text)) return false
  return text.includes(basename(target)) && /\.claude\/hooks\//.test(text)
}

/**
 * Check 2 — a hook in both trees is byte-identical (modulo the per-location header) or a
 * delegator. Never a second independent implementation.
 *
 * THIS ONE WARNS; IT DOES NOT FAIL. Checks 1 and 3 are unambiguous — a hook that does not resolve
 * is not guarding, and a guard that blocks prose is wrong — so those stay hard failures. A fork is
 * different: which side is authoritative is a human call, and the answer differs per hook. Weaver's
 * two trees are rooted at different directories, so several of its pairs differ in real logic
 * (`^src/` against `^(code/)?src/`, `rules/testing.md` against `rules/stack/testing.md`) precisely
 * because the sessions they serve see different relative paths. Some of those should collapse to a
 * delegator; some are legitimate. Failing the build on all of them would get the check disabled,
 * and then it would catch nothing at all.
 *
 * Same reasoning, and the same wording, as audit:template-divergence — which warns for exactly this
 * reason and has been the right call there. The warning makes the fork loud; a human reconciles it.
 */
function checkNoFork(warnings: string[]): number {
  const before = warnings.length
  const all = execFileSync('git', ['-C', REPO, 'ls-files'], { encoding: 'utf-8' })
    .split('\n')
    .filter(inHookUniverse)

  const byName = new Map<string, string[]>()
  for (const p of all) {
    const list = byName.get(basename(p))
    if (list) list.push(p)
    else byName.set(basename(p), [p])
  }

  let pairs = 0
  for (const [name, paths] of byName) {
    if (paths.length < 2) continue
    pairs++
    const [first, ...rest] = paths as [string, ...string[]]
    const firstAbs = join(REPO, first)
    for (const other of rest) {
      const otherAbs = join(REPO, other)
      const identical = normalised(firstAbs) === normalised(otherAbs)
      const delegates = delegatesTo(otherAbs, firstAbs) || delegatesTo(firstAbs, otherAbs)
      if (!identical && !delegates) {
        warnings.push(
          `${name} has forked: ${first} and ${other} differ and neither delegates.\n` +
            '      Two implementations of one guard drift, and only one of them is ever tested.\n' +
            '      Decide which side moved, reconcile, then make the other identical or a delegator.'
        )
      }
    }
  }
  const forked = warnings.length - before
  console.log(
    forked === 0
      ? `  ${GREEN}✓${OFF} ${pairs} hook(s) present in more than one tree: no forks`
      : `  ${YELLOW}!${OFF} ${pairs} hook(s) present in more than one tree: ${YELLOW}${forked} forked${OFF}`
  )
  return forked
}

/**
 * Check 3 — behavioural, paired. Run each wired block-dangerous with a command that MUST be
 * blocked and prose that MUST NOT be.
 */
/**
 * Paired corpus for the inline classifier. The IGNORE half is load-bearing: a classifier that
 * calls every inline command a guard would fail the build over an `echo`, and would be switched
 * off within a day.
 */
const INLINE_MUST_DENY: [string, string][] = [
  ['permission decision', `printf '{"hookSpecificOutput":{"permissionDecision":"deny"}}'`],
  ['single-quoted deny', `echo "{'permissionDecision': 'deny'}"`],
  ['exit 2', 'grep -q forbidden && exit 2'],
  ['exit 2, tab-separated', 'grep -q forbidden && exit\t2']
]
const INLINE_MUST_PASS: [string, string][] = [
  ['a plain reminder', 'echo "remember to run the docker harness"'],
  ['appending to a log', `jq -r '.tool_input.command' >> /tmp/hook.log`],
  ['a no-op', 'true'],
  // `exit 0` and the word "denied" in prose are NOT a refusal — the classifier must not key on
  // either, or a passive notifier that mentions denial gets failed as a guard.
  ['explicit allow', 'exit 0'],
  ['prose mentioning denial', 'echo "this hook never denied anything"']
]

function inlineSelfTest(): string[] {
  const fails: string[] = []
  for (const [name, cmd] of INLINE_MUST_DENY) {
    if (!inlineCanDeny(cmd)) fails.push(`MUST classify as guard but did not: ${name}`)
  }
  for (const [name, cmd] of INLINE_MUST_PASS) {
    if (inlineCanDeny(cmd)) fails.push(`MUST classify as passive but flagged: ${name}`)
  }
  return fails
}

const BEHAVIOUR_CASES: { rc: number; label: string; command: string }[] = [
  { rc: 2, label: 'MUST BLOCK', command: 'npx playwright test' }, // e2e-docker-only-ignore: test payload for the guard, never executed
  { rc: 2, label: 'MUST BLOCK', command: 'git push origin main --force' },
  { rc: 0, label: 'MUST ALLOW', command: 'git commit -m "never run bare npx playwright test"' },
  { rc: 0, label: 'MUST ALLOW', command: 'git status' },
  // THE WRAPPED PAIR. Every case above is a BARE command, and a corpus of bare commands cannot
  // fail a guard whose only defect is the wrapper.
  //
  // Measured 2026-08-25: Weaver's code/ copy of block-dangerous.sh passed this check 4/4 while
  // 4/4 wrapped violations went straight through it — `git reset --hard`, `git push --force`,
  // `rm -rf /etc` and a bare playwright runner, each ALLOWED once wrapped. The check was green
  // about the thing it exists to catch, which is worse than absent: it certified the bypass.
  //
  // `bash -c '…'` is not an exotic evasion. ~/.claude/rules/standardize-on-bash.md INSTRUCTS
  // authors to write it, because the Bash tool runs zsh. Obeying one house rule disarmed the
  // guard set until .claude/hooks/lib/unwrap-interpreter.sh taught the scanners that an
  // interpreter's -c body is CODE, not the prose that quoting usually marks.
  { rc: 2, label: 'MUST BLOCK', command: "bash -c 'git push origin main --force'" },
  // The IGNORE half, so the fix cannot degrade into "refuse anything containing bash -c" — a
  // guard that blocks the house-standard wrapper outright gets switched off within a day.
  { rc: 0, label: 'MUST ALLOW', command: "bash -c 'git status'" }
]

/** Returns how many wired guards were exercised, so the caller can report both halves. */
function checkBehaviour(refs: HookRef[], problems: string[]): number {
  const CASES = BEHAVIOUR_CASES

  const guards = refs.filter(r => basename(r.path) === 'block-dangerous.sh')
  if (!guards.length) {
    problems.push(
      'no settings.json wires block-dangerous.sh — the dangerous-command guard is not active'
    )
    return 0
  }

  for (const guard of guards) {
    let passed = 0
    for (const c of CASES) {
      const payload = JSON.stringify({ tool_name: 'Bash', tool_input: { command: c.command } })
      const res = spawnSync('bash', [guard.path], { input: payload, encoding: 'utf-8' })
      if (res.status !== c.rc) {
        problems.push(
          `${relative(REPO, guard.path)} (wired by ${guard.settings})\n` +
            `      ${c.label}: \`${c.command}\` -> exit ${res.status}, expected ${c.rc}`
        )
      } else {
        passed++
      }
    }
    // COUNT WHAT PASSED. This line printed `${CASES.length}/${CASES.length}` with a green tick
    // unconditionally — after the loop, regardless of what the loop found. Measured 2026-08-25:
    // a guard failing the wrapped case still displayed "✓ … — 6/6 paired cases", with the real
    // failure reported further down. A per-item green above an aggregate red is how a reader
    // concludes the red is someone else's problem.
    const ok = passed === CASES.length
    console.log(
      `  ${ok ? `${GREEN}✓${OFF}` : `${RED}✗${OFF}`} ${relative(REPO, guard.path)} ${DIM}(${guard.settings})${OFF} — ${passed}/${CASES.length} paired cases`
    )
  }
  return guards.length
}

/**
 * The implementation's own self-test, still run — it covers rules this file does not enumerate.
 *
 * DERIVED FROM THE WIRING, not from a fixed path. The first version hardcoded
 * `.claude/hooks/core/block-dangerous.sh`, which is this repo's layout and nobody else's: Weaver
 * keeps its root hooks flat, and a repo scaffolded tomorrow may do something else again. A shared
 * checker that hardcodes one repo's tree either forks on contact or silently self-tests nothing.
 *
 * Deriving is also strictly stronger. A repo with the guard in two trees now gets BOTH
 * implementations self-tested, which is precisely the gap that let a February copy of
 * block-dangerous.sh — no self-test, and a naive grep that would have blocked an innocent commit
 * message — sit guarding every `code/` session while the audit tested only the root copy.
 */
function checkSelfTest(refs: HookRef[], problems: string[]): void {
  const impls = [
    ...new Set(refs.filter(r => basename(r.path) === 'block-dangerous.sh').map(r => r.path))
  ]
  if (!impls.length) {
    problems.push('no wired block-dangerous.sh to self-test — check 3 would be vacuous')
    return
  }
  for (const impl of impls) {
    const res = spawnSync('bash', [impl, '--self-test'], { encoding: 'utf-8' })
    if (res.status !== 0) {
      problems.push(
        `${relative(REPO, impl)} --self-test failed:\n` +
          (res.stdout || res.stderr || '')
            .split('\n')
            .slice(-12)
            .map(l => `      ${l}`)
            .join('\n')
      )
      continue
    }
    const passed = (res.stdout.match(/✓/g) ?? []).length
    console.log(`  ${GREEN}✓${OFF} ${relative(REPO, impl)} --self-test: ${passed} case(s) pass`)
  }
}

/**
 * Check 6 — DELIVER. Every hook wired under PreToolUse or PostToolUse says what it does on the way
 * out, in one of three forms, and a hook that speaks proves its words arrive.
 *
 * WHY. A PreToolUse or PostToolUse hook that exits 0 is read by the session only through
 * `hookSpecificOutput.additionalContext`; its plain stdout and its stderr reach nobody. Measured
 * 2026-11-11: six hooks in four repos printed to plain stdout, their headers saying the opposite,
 * and inject-knowledge alone had logged 342 firings since 2026-08-12 that no session saw. All six
 * were fixed that day, and nothing stopped the seventh.
 *
 * THE THREE FORMS, read from the implementation a delegator execs:
 *   delivers — it calls emit_context or writes hookSpecificOutput. Its --self-test must then pass
 *              and carry an `ok` case naming additionalContext, so its delivery is shown, not
 *              claimed.
 *   guard    — it can only refuse (exit or return 2, or a permission decision), and a refusal's
 *              stderr IS read.
 *   silent   — it neither speaks nor refuses, and says so with the reason on its own line:
 *              `# hook-output: none — <why>`.
 * Anything else is UNDECLARED, which is the shape all six defects had.
 *
 * WHAT IT CANNOT SEE: a guard that also prints advice to plain stdout before exiting 0. Reading
 * that needs a parse of the shell, not a match on its text; the guards in this portfolio either
 * refuse or stay quiet, which the population measured on the day this was written.
 */
export type DeliveryKind = 'delivers' | 'guard' | 'silent' | 'undeclared'

const SILENT_DECLARATION = /^#\s*hook-output:\s*none\s+—\s+(\S.{9,})$/m

export function deliveryKind(text: string): DeliveryKind {
  if (/\bemit_context\b|hookSpecificOutput/.test(text)) return 'delivers'
  if (SILENT_DECLARATION.test(text)) return 'silent'
  if (/\b(exit|return)[ \t]+2\b|permissionDecision/.test(text)) return 'guard'
  return 'undeclared'
}

/** Does a self-test's output carry a PASSING case that names additionalContext? */
export function hasDeliveryCase(stdout: string): boolean {
  return /^[ \t]*(ok|✓)\b[^\n]*additionalContext/m.test(stdout)
}

// half, label, hook text, the kind it must read as
const DELIVERY_KIND_CASES: [string, string, string, DeliveryKind][] = [
  [
    'CATCH',
    'prints its advice and exits 0',
    '#!/usr/bin/env bash\necho "## advice"\nexit 0\n',
    'undeclared'
  ],
  ['CATCH', 'a silent declaration with no reason', '# hook-output: none —\nexit 0\n', 'undeclared'],
  ['IGNORE', 'delivers through emit_context', 'emit_context PreToolUse "x"\n', 'delivers'],
  [
    'IGNORE',
    'writes hookSpecificOutput itself',
    `printf '{"hookSpecificOutput":{}}'\n`,
    'delivers'
  ],
  [
    'IGNORE',
    'a guard that refuses with exit 2',
    'grep -q x && { echo no >&2; exit 2; }\nexit 0\n',
    'guard'
  ],
  ['IGNORE', 'a guard that refuses with return 2', 'review() { return 2; }\nreview\n', 'guard'],
  [
    'IGNORE',
    'a silent hook with its reason',
    '# hook-output: none — it records each call, says nothing\n',
    'silent'
  ]
]
// half, label, self-test output, whether it shows delivery
const DELIVERY_CASE_CASES: [string, string, string, boolean][] = [
  ['CATCH', 'a self-test with no delivery case', '  ok    a sentence is silent\n', false],
  [
    'CATCH',
    'a FAILING delivery case',
    '  FAIL  a run gets the message as PreToolUse additionalContext\n',
    false
  ],
  [
    'IGNORE',
    'a passing delivery case',
    '  ok    a run gets the message as PreToolUse additionalContext\n',
    true
  ]
]

function deliverySelfTest(): string[] {
  const fails: string[] = []
  for (const [half, label, text, want] of DELIVERY_KIND_CASES) {
    const got = deliveryKind(text)
    if (got !== want) fails.push(`${half} ${label}: read as ${got}, want ${want}`)
  }
  for (const [half, label, out, want] of DELIVERY_CASE_CASES) {
    if (hasDeliveryCase(out) !== want) fails.push(`${half} ${label}: want ${want}`)
  }
  return fails
}

/** The file a delegator execs, followed to its end; the file itself when it is not a delegator. */
function implementationOf(path: string, depth = 0): string {
  let text: string
  try {
    text = readFileSync(path, 'utf-8')
  } catch {
    return path
  }
  const m = /IMPL="\$\{HOOK_DIR\}\/([^"]+)"/.exec(text)
  if (!m || !/\bexec\b/.test(text) || depth > 4) return path
  return implementationOf(resolve(dirname(path), m[1]!), depth + 1)
}

function checkDelivery(refs: HookRef[], problems: string[]): number {
  const seen = new Map<string, DeliveryKind>()
  const selfTested = new Map<string, boolean>()
  for (const ref of refs) {
    if (ref.event !== 'PreToolUse' && ref.event !== 'PostToolUse') continue
    const impl = implementationOf(ref.path)
    const where = `${relative(REPO, ref.path)} (${ref.event}, ${ref.settings})`
    let text: string
    try {
      text = readFileSync(impl, 'utf-8')
    } catch {
      continue // check 1 reports a hook that does not resolve
    }
    const kind = deliveryKind(text)
    seen.set(impl, kind)
    if (kind === 'undeclared') {
      problems.push(
        `${where} neither delivers, refuses, nor declares itself silent.\n` +
          '      A PreToolUse/PostToolUse hook that exits 0 reaches the session only through\n' +
          '      additionalContext: call emit_context (.claude/hooks/lib/emit-context.sh), or, when it\n' +
          '      says nothing, declare it: `# hook-output: none — <why>`.'
      )
      continue
    }
    if (kind !== 'delivers' || selfTested.has(impl)) continue
    const res = spawnSync('bash', [impl, '--self-test'], { encoding: 'utf-8', timeout: 120_000 })
    const shown = res.status === 0 && hasDeliveryCase(res.stdout ?? '')
    selfTested.set(impl, shown)
    if (!shown) {
      problems.push(
        `${where} delivers to the session, and no passing --self-test case shows it arriving.\n` +
          (res.status !== 0
            ? `      --self-test exited ${res.status ?? 'on a signal'}.\n`
            : "      Add an `ok` case naming additionalContext that parses the hook's own output.\n")
      )
    }
  }
  const counts = [...seen.values()].reduce<Record<string, number>>((a, k) => {
    a[k] = (a[k] ?? 0) + 1
    return a
  }, {})
  console.log(
    `  ${GREEN}✓${OFF} delivery: ${counts.delivers ?? 0} deliver (each self-tested), ` +
      `${counts.guard ?? 0} guard, ${counts.silent ?? 0} silent, ` +
      `${counts.undeclared ?? 0} undeclared ${DIM}(PreToolUse/PostToolUse implementations)${OFF}`
  )
  return seen.size
}

function main(): number {
  console.log('\n  Hooks — wired, unforked, and still behaving\n')
  const problems: string[] = []
  const warnings: string[] = []

  const inline: InlineHook[] = []
  const refs = collectHookRefs(problems, inline)
  if (!refs.length) {
    console.log(
      `\n${RED}RESULT: FAIL${OFF} — no hook references found; refusing to pass vacuously.\n`
    )
    return 1
  }

  checkResolves(refs, problems)
  const forkedPairs = checkNoFork(warnings)
  checkWired(refs, warnings)
  checkInline(inline, problems, warnings)
  checkSelfTest(refs, problems)
  const guards = checkBehaviour(refs, problems)

  // Check 6's two predicates are pure, so their corpus runs before anything they found is trusted.
  const delivery = deliverySelfTest()
  if (delivery.length) {
    console.error(`${RED}✗ delivery self-test FAILED — refusing to report${OFF}`)
    for (const f of delivery) console.error(`    ${f}`)
    return 1
  }
  checkDelivery(refs, problems)

  const classifier = inlineSelfTest()
  if (classifier.length) {
    console.error(`${RED}✗ inline-classifier self-test FAILED — refusing to report${OFF}`)
    for (const f of classifier) console.error(`    ${f}`)
    return 1
  }

  // Check 2 and the wired check both read the universe; a predicate that fails its corpus has
  // already produced wrong findings above, so nothing is reported rather than a wrong list.
  const universe = hookUniverseSelfTest()
  if (universe.length) {
    console.error(`${RED}✗ hook-universe self-test FAILED — refusing to report${OFF}`)
    for (const f of universe) console.error(`    ${f}`)
    return 1
  }

  // Both halves of check 3, counted per wired guard, so audit:auditor-contracts can SEE them
  // rather than trust they exist. A guard that blocks everything gets switched off as surely as
  // one that blocks nothing, so the MUST-ALLOW half is as load-bearing as the MUST-BLOCK half.
  // A universe case that keeps a real hook IN is a catch (dropping it would hide a fork); one that
  // keeps a non-hook OUT is an ignore (admitting it is a false finding).
  const mustBlock =
    BEHAVIOUR_CASES.filter(c => c.rc === 2).length * guards +
    INLINE_MUST_DENY.length +
    HOOK_UNIVERSE_CASES.filter(([expect]) => expect).length +
    DELIVERY_KIND_CASES.filter(([half]) => half === 'CATCH').length +
    DELIVERY_CASE_CASES.filter(([half]) => half === 'CATCH').length
  const mustAllow =
    BEHAVIOUR_CASES.filter(c => c.rc === 0).length * guards +
    INLINE_MUST_PASS.length +
    HOOK_UNIVERSE_CASES.filter(([expect]) => !expect).length +
    DELIVERY_KIND_CASES.filter(([half]) => half === 'IGNORE').length +
    DELIVERY_CASE_CASES.filter(([half]) => half === 'IGNORE').length
  console.log(`  auditor-contract: catch=${mustBlock} ignore=${mustAllow}`)

  if (warnings.length) {
    console.log('')
    for (const w of warnings) console.log(`${YELLOW}  ! ${w}${OFF}`)
    console.log(
      // COUNT THE FORKS, NOT THE WARNINGS. This read `warnings.length`, so every unrelated
      // warning was reported as a fork: on 2026-08-25 Weaver printed "4 forked hook pair(s)" for
      // 2 forks plus 2 library notices, and after the forks were reconciled it still said "2
      // forked hook pair(s)" directly beneath its own "no forks" line and "0 forked pair(s)" in
      // the RESULT. A summary that contradicts the detail above it teaches the reader to skip it.
      `${YELLOW}  ${forkedPairs} forked hook pair(s)${warnings.length > forkedPairs ? ` and ${warnings.length - forkedPairs} other warning(s)` : ''} — loud, not fatal. Which side is ` +
        `authoritative is a human call; reconcile to a delegator or make them identical.${OFF}`
    )
  }

  if (problems.length) {
    console.log('')
    for (const p of problems) console.log(`${RED}  ✗ ${p}${OFF}`)
    console.log(`\n${RED}\x1b[1mRESULT: FAIL${OFF} — a guard is missing, forked, or misbehaving.\n`)
    return 1
  }
  // The PASS line must not contradict the warnings printed directly above it. A green that says
  // "none has forked" while five forks scroll past is worse than a red — it teaches the reader
  // that the warnings are noise.
  console.log(
    `\n${GREEN}\x1b[1mRESULT: PASS${OFF} — every wired hook resolves and behaves` +
      (warnings.length
        ? `, ${YELLOW}with ${forkedPairs} forked pair(s) and ${warnings.length - forkedPairs} other warning(s)${OFF}\n`
        : ', none has forked\n')
  )
  return 0
}

process.exit(main())
