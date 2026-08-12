// Copyright (c) 2026 whizBANG Developers LLC. All rights reserved.
// Licensed under AGPL-3.0 (Free) or BSL-1.1 (Solo/Team/Fabrick) with AI Training Restriction. See LICENSE.
/**
 * audit:command-cwd — a committed script must not invoke npm, git, or source cwd-dependently.
 *
 * WHY THIS EXISTS
 * ---------------
 * Two invariants — "pin every npm op" and "pin every git op" — were enforced ONLY by Claude Code
 * PreToolUse hooks (~/.claude/hooks/enforce-absolute-{npm,git}-cwd.sh). Measured 2026-07-31 while
 * recording FORGE-36 (Agent-governance substrate is vendor-neutral from row one — Engram rows,
 * projected per consumer): neither had any vendor-neutral backstop. They are real controls that
 * exist inside one vendor's tool, on one machine. Switch AI, or run on any host that is not king,
 * and they vanish — silently, with no failing check to notice it. foundry already has zero hooks
 * and runs an agent daily.
 *
 * WHAT THIS CAN AND CANNOT DO — state it plainly, because the difference matters
 * -----------------------------------------------------------------------------
 * It CANNOT replace the hooks. A hook intercepts a command before it runs; an auditor inspects
 * files after they are written. Nothing vendor-neutral can intercept an agent's live shell.
 *
 * What it CAN do is stop the bad form being COMMITTED, and that is the half that compounds. A
 * script or runbook carrying `npm run x` teaches the failure to every future reader — human or
 * AI, on any machine — and gets copied. The hook protects one session; this protects the corpus.
 *
 * THE IGNORE HALF IS THE HARD HALF
 * --------------------------------
 * 39 of 69 tracked scripts legitimately anchor their own directory first
 * (`cd "$(dirname "$0")"`, `SCRIPT_DIR=`, `ROOT="$(cd …)"`). Those are cwd-independent BY
 * CONSTRUCTION and flagging them would make this a rule that fires on correct code — which,
 * per ~/.claude/rules/never-game-auditors.md, is how an auditor gets switched off on its first
 * real run.
 *
 * THE UNIVERSE HAS TO MATCH THE CONSUMER'S (fixed 2026-08-11)
 * ----------------------------------------------------------
 * This scanned `git ls-files '*.sh'`. Git hooks are named `pre-push` and `pre-commit` — no
 * extension — so **no git hook had ever been scanned, in any repo in the portfolio**, and the
 * `.githooks/` exemption below it was dead code guarding a set that never arrived. Qepton's
 * pre-push hook called bare `npm run lint` from a repo whose package lives at `code/Qepton-Dev/`;
 * every check in it died with `Missing script`, and its "security audit" iterated a manifest list
 * that resolved to nothing and therefore reported 0 criticals — a gate that could not fail.
 * `audit:command-cwd` reported PASS throughout. Selection is now by extension OR shebang.
 *
 * WHAT THE `.githooks/` EXEMPTION GOT RIGHT, AND WRONG
 * ---------------------------------------------------
 * Its premise — git runs hooks with cwd = the working-tree root — is true, and for **git** ops it
 * is sufficient: a bare `git status` in a hook reports on the right repo. For **npm** it is not,
 * and the gap is the whole bug: cwd = the repo ROOT, while package.json lives at `code/` (or
 * `code/Qepton-Dev/`). So npm ops in a hook are held to the rule, with one relaxation the premise
 * does earn — a plain `cd code` IS an anchor inside a hook (Weaver's own pre-push relies on it),
 * because the directory it starts from is guaranteed. Elsewhere a relative cd anchors nothing.
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Paths are DERIVED, never hardcoded to a project's layout — this auditor is fed to the template
 * and from there to every WBD project, and a literal `code/` segment would make each copy subtly
 * project-shaped and put them out of sync (which `audit:template-divergence` then flags forever).
 *
 *   PKG  = the npm package root — this file is always at <pkg>/scripts/verify-command-cwd.ts
 *   REPO = the git repo root — ASKED OF GIT, not assumed to be PKG/..
 *
 * The repo root is not a fixed distance from the package. In weaver, the template and Gantry the
 * package is `code/` — one level below the git root; in Qepton it is `code/Qepton-Dev/`, two.
 * Assuming `PKG/..` would make `git ls-files` scan the wrong tree and report honestly about the
 * wrong project — the exact failure this auditor exists to prevent. (This note previously said
 * `code/Qepton-Dev/` "is itself a git root". Checked 2026-08-11: it is not, and there is no nested
 * `.git` there. The derivation is right either way, which is why the wrong reason survived.)
 */
const PKG = join(dirname(fileURLToPath(import.meta.url)), '..')
const REPO = execFileSync('git', ['-C', PKG, 'rev-parse', '--show-toplevel'], { encoding: 'utf-8' }).trim()

/**
 * npm ops that resolve a package root from cwd. Matched in two parts, NOT as one pattern:
 * `npm` must be at command position, and an op word must appear somewhere after it. A single
 * `npm\s+(run|ci|…)` regex — the obvious first cut — misses `npm --prefix code run build`,
 * because the flag sits between the two. That is precisely the RELATIVE-prefix form the rule
 * forbids, so the naive pattern was blind to the most likely real violation. The self-test
 * corpus caught it before this auditor ever scanned a file.
 */
const NPM_CMD = /^\s*npm\b/
const NPM_OP = /\b(run|ci|install|i|test|exec|audit|rebuild|update|prune|dedupe)\b/

/**
 * npm at a command position that is not the start of the line: after a shell operator, inside a
 * command substitution, after `if`/`then`, or inside a quoted string handed to a runner function.
 * The last of those is not hypothetical — Qepton's hook is written as
 *
 *     run_check "lint" "npm run lint"
 *
 * which executes the quoted string. A start-of-line matcher cannot see it, so widening the scan to
 * hooks would have been pointless without this. Prose lines are excluded instead of trying to tell
 * an executed string from a printed one: `echo "then npm run build"` is documentation, and a rule
 * that flags documentation is one that gets switched off.
 */
const NPM_EMBEDDED = /(?:^|[;&|(]|\bif\b|\bthen\b|\belse\b|["'])\s*npm\b/
const PROSE_CMD = /^\s*(echo|printf|cat|#)\b/
/** git ops that resolve a repository from cwd. Read-only ones count: they report the WRONG repo. */
const GIT_OP = /^\s*git\s+(add|commit|push|pull|checkout|switch|fetch|merge|rebase|status|diff|log|rev-parse|ls-files|stash|tag)\b/

/**
 * `source` / `.` of a RELATIVE path — the third member of this family, added 2026-08-07.
 *
 * Keyed on the argument being PATH-SHAPED (contains a `/`) rather than on the verb, because `.`
 * is one character and `source` is an ordinary English word: matching the verb alone fires on
 * prose. `source myfunc` (no slash) is a PATH/function lookup, not a cwd-relative file.
 *
 * This one fails harder than its siblings. npm and git report loudly about the wrong target;
 * a missed `source` sets nothing, so the consumer silently keeps its DEFAULT. Measured
 * 2026-08-07: `. tools/engram-client-env.sh` after a cwd reset left ENGRAM_PG_HOST at
 * 127.0.0.1, and the tool printed "SKIP: unreachable — not a pass, not a failure" and exited
 * **0**. The runner reported success over a run that did nothing.
 */
const SRC_OP = /^\s*(\.|source)\s+\S*\//
/** Absolute literal, or a variable the shell expands (tolerated for non-npm — see the rule). */
const SRC_PINNED = /^\s*(\.|source)\s+(\/|["']?\$)/

/** An absolute pin on the invocation itself. */
const NPM_PINNED = /--prefix\s+\//
const GIT_PINNED = /git\s+-C\s+\//

/**
 * A `--prefix` carrying a variable or command substitution, accepted ONLY in a file that derives
 * its own repo root. `npm --prefix "$CODE" run x` after `ROOT="$(git rev-parse --show-toplevel)"`
 * is cwd-independent by construction and is the house form for a hook that must work in any clone,
 * where an absolute literal cannot. Without the derivation in the same file, a bare `"$VAR"` is
 * opaque — exactly what the Claude Code hook refuses — and stays a finding.
 */
const NPM_PINNED_VAR = /--prefix\s+"?\$/
const ROOT_DERIVED = /\$\(\s*git\s+rev-parse\s+--show-toplevel\s*\)/

/**
 * The file establishes its own directory anchor, so every later relative command is
 * cwd-independent by construction. This is the correct pattern, not a violation.
 */
const ANCHORS = [
  /cd\s+"?\$\(dirname\s/,           // cd "$(dirname "$0")"
  /cd\s+"?\$\{0%\/\*\}/,            // cd "${0%/*}"
  /SCRIPT_DIR=/,
  /ROOT="?\$\(cd\s/,
  /cd\s+"\$REPO_ROOT"/,
  /cd\s+\//,                        // an absolute cd anywhere earlier
]

export interface Finding { file: string; line: number; text: string; kind: 'npm' | 'git' | 'source' }

/** Pure: given a file's contents, which lines invoke npm/git/source cwd-dependently? */
export function findCwdDependentCommands(content: string, path = ''): Finding[] {
  const isHook = /\.githooks\//.test(path)
  const lines = content.split('\n')
  // Inside a hook, cwd is guaranteed to be the working-tree root, so ANY cd reaches a known place.
  const anchors = isHook ? [...ANCHORS, /^\s*cd\s+\S/m] : ANCHORS
  if (anchors.some(a => a.test(content))) return []
  const rootDerived = ROOT_DERIVED.test(content)

  const out: Finding[] = []
  lines.forEach((raw, i) => {
    const line = raw.replace(/#.*$/, '')            // strip trailing comments
    if (!line.trim() || /^\s*#/.test(raw)) return
    const npmPinned = NPM_PINNED.test(line) || (rootDerived && NPM_PINNED_VAR.test(line))
    const npmInvoked = NPM_CMD.test(line) || (!PROSE_CMD.test(line) && NPM_EMBEDDED.test(line))
    if (npmInvoked && NPM_OP.test(line) && !npmPinned) {
      out.push({ file: path, line: i + 1, text: raw.trim(), kind: 'npm' })
    }
    // git ops are exempt in a hook and only there: cwd = the working-tree root is git's own
    // guarantee, so a bare `git status` reports on the repo being pushed. npm gets no such pass —
    // the package root is not the repo root in any project in this portfolio.
    if (!isHook && GIT_OP.test(line) && !GIT_PINNED.test(line)) {
      out.push({ file: path, line: i + 1, text: raw.trim(), kind: 'git' })
    }
    if (SRC_OP.test(line) && !SRC_PINNED.test(line)) {
      out.push({ file: path, line: i + 1, text: raw.trim(), kind: 'source' })
    }
  })
  return out
}

/**
 * Self-test. An auditor with no corpus only ever reports that it found nothing; it can never
 * report that it CANNOT find anything, and those are indistinguishable from outside
 * (.claude/rules/core/security.md). Both halves are asserted: what it MUST catch, and what it
 * MUST NOT flag — a checker that flags everything is as broken as one that flags nothing.
 */
const MUST_CATCH: [string, string, string?][] = [
  ['bare npm run', 'npm run build\n'],
  ['relative --prefix', 'npm --prefix code run build\n'],
  ['bare npm ci', '  npm ci\n'],
  ['bare git add', 'git add src/foo.ts\n'],
  ['bare git push', 'git push origin main\n'],
  ['read-only git is still wrong', 'git status --short\n'],
  // Qepton's real pre-push, 2026-08-11: every check died with `Missing script` because the package
  // is at code/Qepton-Dev/ while cwd is the repo root. Invisible for as long as hooks went
  // unscanned. Each case is isolated — an earlier draft paired the run_check form with a bare
  // `npm run` line, so it passed on the bare line and proved nothing about the form it covers.
  ['hook: npm inside a runner-function argument', 'run_check "lint" "npm run lint"\n', 'code/.githooks/pre-push'],
  ['hook: npm after `if`', 'if npm run typecheck > /dev/null 2>&1; then\n  echo ok\nfi\n', 'code/.githooks/pre-push'],
  ['npm inside a command substitution', 'c=$(npm audit --json)\n'],
  ['hook: derives a root it never applies', 'AUDIT_ROOT="$(git rev-parse --show-toplevel)"\nnpm run lint\n', 'code/.githooks/pre-push'],
  ['non-hook: relative cd anchors nothing', 'cd code\nnpm run build\n'],
  ['relative source', '. tools/engram-client-env.sh\n'],
  ['relative source, keyword', 'source tools/env.sh\n'],
  ['dot-slash relative', '. ./env.sh\n'],
  // The redirect is idiomatic and is what hides "No such file or directory".
  ['relative source, redirect masked', '. tools/env.sh >/dev/null 2>&1\n'],
]
const MUST_IGNORE: [string, string, string?][] = [
  ['absolute --prefix', 'npm --prefix /abs/pkg run build\n'],
  // The three correct hook shapes in the portfolio. Flagging any of these would make the rule fire
  // on the very pattern it asks for, and a rule that does that gets deleted. The first is THIS
  // repo's own pre-push.
  ["hook: `cd code` — cwd is guaranteed here", 'cd code\nnpm run test:prepush\n', 'code/.githooks/pre-push'],
  ["hook: derived root + \"$CODE\"", 'ROOT="$(git rev-parse --show-toplevel)"\nCODE="$ROOT/code"\nnpm --prefix "$CODE" run test:precommit\n', 'code/.githooks/pre-push'],
  ['hook: inline substitution in --prefix', 'npm --prefix "$(git rev-parse --show-toplevel)/code" run build:all\n', 'code/.githooks/pre-push'],
  ['hook: bare read-only git is fine — cwd IS the repo', 'git rev-parse --show-toplevel\ngit diff --cached\ncd code\nnpm ci\n', 'code/.githooks/pre-push'],
  ['git -C absolute', 'git -C /abs/repo status\n'],
  ['self-anchored via dirname', 'cd "$(dirname "$0")"\nnpm run build\ngit add .\n'],
  ['self-anchored via SCRIPT_DIR', 'SCRIPT_DIR=/x\ncd "$SCRIPT_DIR"\nnpm ci\n'],
  ['absolute cd first', 'cd /home/mark/proj\nnpm run test\n'],
  ['commented out', '# npm run build\n'],
  ['prose mentioning npm run', 'echo "then npm run build"\n'],
  ['unrelated npm word', 'echo npm-is-great\n'],
  ['absolute source', '. /home/mark/x/env.sh\n'],
  ['absolute source, keyword', 'source /home/mark/x/env.sh\n'],
  // Tolerated by cwd-independent-tooling.md for non-npm: the shell expands it.
  ['absolute-valued variable', '. "$ANVIL/tools/env.sh"\n'],
  // `.` is one char and `source` is an English word — keying on the VERB alone
  // fires on prose, which is how an auditor gets switched off on its first run.
  ['bare word, no slash', 'source myfunc\n'],
  ['prose mentioning source', 'echo "source the env first"\n'],
  ['a relative script arg is not a source', 'python3 ./x.py\n'],
]

function selfTest(): string[] {
  const fails: string[] = []
  for (const [name, src, path] of MUST_CATCH) {
    if (findCwdDependentCommands(src, path ?? 'x.sh').length === 0) fails.push(`MUST CATCH but did not: ${name}`)
  }
  for (const [name, src, path] of MUST_IGNORE) {
    const f = findCwdDependentCommands(src, path ?? 'x.sh')
    if (f.length > 0) fails.push(`MUST IGNORE but flagged: ${name} -> ${f[0]!.text}`)
  }
  return fails
}

function main(): void {
  console.log('\x1b[1mCommand cwd-Independence Audit\x1b[0m')
  console.log('\x1b[2mCommitted scripts must not invoke npm/git/source cwd-dependently (FORGE-36)\x1b[0m\n')

  const fails = selfTest()
  if (fails.length) {
    console.log('\x1b[31m✗ SELF-TEST FAILED — refusing to scan with a broken matcher\x1b[0m')
    fails.forEach(f => console.log(`    ${f}`))
    process.exit(1)
  }
  console.log(`  \x1b[32m✓\x1b[0m self-test: ${MUST_CATCH.length} catch + ${MUST_IGNORE.length} ignore cases\n`)

  // Selection is by extension OR shebang. `'*.sh'` alone silently excluded every git hook —
  // they are named `pre-push` / `pre-commit` — which is how a hook whose every line was broken
  // sat inside a green audit. Same shape as verify-shell-safety.ts's isShell().
  const candidates = execFileSync('git', ['-C', REPO, 'ls-files'], { encoding: 'utf-8' })
    .split('\n').filter(f => f && !f.includes('node_modules'))

  const findings: Finding[] = []
  const tracked: string[] = []
  for (const f of candidates) {
    let content: string
    try { content = readFileSync(join(REPO, f), 'utf-8') } catch { continue }
    const isShell = /\.(sh|bash)$/.test(f) || /^#!.*\b(bash|sh|zsh)\b/.test(content.split('\n')[0] ?? '')
    if (!isShell) continue
    tracked.push(f)
    findings.push(...findCwdDependentCommands(content, f))
  }

  const dir = join(PKG, 'reports', 'command-cwd')
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'latest.json'), JSON.stringify({ scanned: tracked.length, findings }, null, 2))

  if (findings.length) {
    console.log(`\x1b[31m✗ ${findings.length} cwd-dependent invocation(s) in ${tracked.length} scanned script(s):\x1b[0m\n`)
    for (const f of findings) {
      console.log(`  \x1b[31m${f.file}:${f.line}\x1b[0m  ${f.text}`)
    }
    console.log('\n  Fix: `npm --prefix /abs/path run x`, `git -C /abs/path <cmd>`, or anchor the')
    console.log('  script once with `cd "$(dirname "$0")"` / an absolute cd before the command.')
    console.log('  See ~/.claude/rules/cwd-independent-tooling.md')
    process.exit(1)
  }

  console.log(`\x1b[32m\x1b[1mRESULT: PASS\x1b[0m — ${tracked.length} script(s), no cwd-dependent npm/git/source`)
}

if (process.argv[1] && process.argv[1].endsWith('verify-command-cwd.ts')) main()
