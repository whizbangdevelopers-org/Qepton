#!/usr/bin/env bash
# Copyright (c) 2026 whizBANG Developers LLC. All rights reserved.
# Licensed under MIT. See LICENSE.
#
# verify-lands-with-tests.sh — a test lands with the feature code it covers, and a new page lands with its
# E2E spec and its documentation. Run by the git commit-msg hook, on the commit being made.
#
#   --commit-msg <file>   judge the commit git is making now (the commit-msg hook's call)
#   --commit <sha>        judge a commit already made, by the same rules (measurement)
#   --self-test           the paired corpus, in scratch repositories, through real `git commit`s
#
# THE RULES
#   1. A commit that changes feature code, beyond its comments, carries a test file: a unit spec
#      or an E2E spec. Feature code is src/**/*.{vue,ts} and backend/src/**/*.ts in the package
#      this script sits in, less spec and declaration files. A deletion is not a change to test.
#   2. A commit that adds a page (src/pages/*.vue) carries an E2E spec (testing/e2e/*.spec.ts).
#   3. ...and a hand-written doc: docs/**/*.md or src/pages/HelpPage.vue. A generated doc does not
#      count, since regenerating one is not writing it.
#   A commit whose message says `[skip-e2e-check: <why>]` passes, and the reason is printed. The
#   bare marker refuses: an exemption with no reason is gaming the gate.
#
# WHY IT IS A GIT HOOK, AND WHAT IT REPLACED
# ------------------------------------------
# It replaces require-e2e-docs.sh, a Claude PreToolUse hook that was dead in Gantry, the template
# and Qepton from the day it was written, and that could not have worked as designed even alive:
#   - It matched `^src/` against `git diff --name-only`, which prints repository-root paths
#     (`code/src/...`), so it never saw feature code in a repository whose package is code/.
#   - It read the session directory's whole index. A path-limited commit (`git commit -- <paths>`,
#     the house form, because sessions share an index) commits a different set of files.
#   - It saw only a `git commit` typed into the Bash tool. The house rule puts any shell logic in a
#     script file, and `bash /abs/commit.sh` contains no `git commit` for it to see.
# A commit-msg hook sees the commit itself, however it is made, by whom, and from where; inside it
# `git diff --cached` reads the index git is about to commit, which for a path-limited commit is
# the temporary one holding exactly the named paths. It also has the message, so the skip marker
# and its reason can be read.
#
# WHY THESE RULES, MEASURED 2026-11-11 on every commit since 2026-09-01
# --------------------------------------------------------------------
# The old rule demanded an E2E spec AND a doc in every commit that touched feature code. Applied
# to Gantry's 1,204 commits it refused 229 of the 305 feature commits. Two things made that wrong:
# this portfolio's order is Decisions -> Plan -> Tests -> Code, so an E2E spec's stubs land in the
# planning commit and its bodies with the build, and most feature commits are backend, security
# or dependency work whose test is a unit spec, which the old rule ignored. "Any test file" refused
# 23, and 15 of those changed only comments (a decision citation, a renamed word). A new page
# without an E2E spec in its own commit happened once.

set -uo pipefail

SELF="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/$(basename "${BASH_SOURCE[0]}")"
PKG="$(cd "$(dirname "$SELF")/.." && pwd)"

FEATURE_RE='^(src/.*\.(vue|ts)|backend/src/.*\.ts)$'
NOT_FEATURE_RE='(\.(spec|test)\.(ts|js)|\.d\.ts)$'
TEST_RE='\.(spec|test)\.(ts|js)$'
E2E_RE='^testing/e2e/.*\.spec\.ts$'
DOC_RE='^(docs/.*\.md|src/pages/HelpPage\.vue)$'
PAGE_RE='^src/pages/.*\.vue$'
# A changed line that is only a comment or blank. A line of code with a comment after it is code.
COMMENT_LINE_RE='^[[:space:]]*($|//|/\*|\*|<!--|-->)'

# ── what the commit changes ─────────────────────────────────────────────────────────────────────
# Both modes answer the same three questions, so the rules below are written once.
#   changes        name-status lines, paths relative to the package
#   file_diff <p>  the zero-context patch of one package-relative path
#   file_head <p>  the first lines of one path as committed
MODE="" SHA="" ROOT="" PREFIX=""

init_repo() {
  ROOT="$(git -C "$PKG" rev-parse --show-toplevel)" || return 1
  PREFIX="$(git -C "$PKG" rev-parse --show-prefix)" || return 1
}

relative_flag() {
  if [ -n "$PREFIX" ]; then printf -- '--relative=%s' "$PREFIX"; else printf -- '--relative'; fi
}

changes() {
  if [ "$MODE" = index ]; then
    git -C "$ROOT" diff --cached --name-status -M "$(relative_flag)"
  else
    git -C "$ROOT" diff-tree -r --root -M --no-commit-id --name-status "$(relative_flag)" "$SHA"
  fi
}

# file_diff <path> [<old path>] — a rename's old path goes in the pathspec too, or git cannot pair
# the two and reports the new path as an added file, every line of it changed.
file_diff() {
  local specs=("$PREFIX$1")
  [ -n "${2:-}" ] && specs+=("$PREFIX$2")
  if [ "$MODE" = index ]; then
    git -C "$ROOT" diff --cached -U0 -M "$(relative_flag)" -- "${specs[@]}"
  else
    git -C "$ROOT" diff-tree -p -U0 --root -M --no-commit-id "$(relative_flag)" "$SHA" -- "${specs[@]}"
  fi
}

file_head() {
  if [ "$MODE" = index ]; then
    git -C "$ROOT" show ":$PREFIX$1" 2>/dev/null | head -n 5
  else
    git -C "$ROOT" show "$SHA:$PREFIX$1" 2>/dev/null | head -n 5
  fi
}

# substantive <path> [<old path>] — true when the change touches a line that is not a comment.
substantive() {
  local line
  while IFS= read -r line; do
    case "$line" in
      '+++ '*|'--- '*) continue ;;
      '+'*|'-'*) ;;
      *) continue ;;
    esac
    if ! grep -qE "$COMMENT_LINE_RE" <<<"${line:1}"; then return 0; fi
  done < <(file_diff "$1" "${2:-}")
  return 1
}

# judge <message> — print what the commit lacks, and return 1 when it lacks anything.
judge() {
  local msg="$1" st path rest old feature=() page=() has_test=0 has_e2e=0 has_doc=0
  local reason
  reason="$(grep -oE '\[skip-e2e-check:[[:space:]]*[^]]*[^][:space:]][^]]*\]' <<<"$msg" | head -n 1)"
  if [ -n "$reason" ]; then
    echo "verify-lands-with-tests: skipped — ${reason}"
    return 0
  fi
  if grep -qF '[skip-e2e-check' <<<"$msg"; then
    echo "verify-lands-with-tests: REFUSED — the skip marker carries no reason." >&2
    echo "  Write it as [skip-e2e-check: <why no test or doc belongs in this commit>]." >&2
    return 1
  fi

  while IFS=$'\t' read -r st path rest; do
    [ -n "$st" ] || continue
    # A rename or copy lists the old path, then the new one; the new one is what lands.
    old=""
    case "$st" in R*|C*) old="$path"; path="$rest" ;; esac
    case "$st" in D*) continue ;; esac
    if [[ "$path" =~ $TEST_RE ]]; then has_test=1; fi
    if [[ "$path" =~ $E2E_RE ]]; then has_e2e=1; fi
    if [[ "$path" =~ $DOC_RE ]] && ! file_head "$path" | grep -q 'GENERATED'; then has_doc=1; fi
    if [[ "$path" =~ $FEATURE_RE ]] && ! [[ "$path" =~ $NOT_FEATURE_RE ]] && substantive "$path" "$old"; then
      feature+=("$path")
    fi
    if [[ "$st" == A* && "$path" =~ $PAGE_RE ]]; then page+=("$path"); fi
  done < <(changes)

  local missing=0
  if [ "${#feature[@]}" -gt 0 ] && [ "$has_test" -eq 0 ]; then
    echo "verify-lands-with-tests: REFUSED — feature code changed with no test in the commit:" >&2
    printf '    %s\n' "${feature[@]}" >&2
    echo "  Add the unit spec or E2E spec that covers it to this commit." >&2
    missing=1
  fi
  if [ "${#page[@]}" -gt 0 ] && [ "$has_e2e" -eq 0 ]; then
    echo "verify-lands-with-tests: REFUSED — a new page with no E2E spec in the commit:" >&2
    printf '    %s\n' "${page[@]}" >&2
    echo "  Add testing/e2e/<area>.spec.ts, which its plan's stubs should already name." >&2
    missing=1
  fi
  if [ "${#page[@]}" -gt 0 ] && [ "$has_doc" -eq 0 ]; then
    echo "verify-lands-with-tests: REFUSED — a new page with no documentation in the commit:" >&2
    printf '    %s\n' "${page[@]}" >&2
    echo "  Add to docs/ or src/pages/HelpPage.vue. A regenerated doc does not count." >&2
    missing=1
  fi
  if [ "$missing" -ne 0 ]; then
    echo "  If no test or doc belongs here, say why: [skip-e2e-check: <why>] in the message." >&2
    return 1
  fi
  return 0
}

# ── --self-test ─────────────────────────────────────────────────────────────────────────────────
# Real commits in scratch repositories, through this script installed as their commit-msg hook,
# in both layouts a package takes: under code/, and at the repository root. A path-limited commit
# is one of the cases, because the temporary index git builds for it is what the old gate misread.
self_test() {
  set +e
  local fails=0 scratch catch=0 ignore=0
  # Counted from the cases as they run, so the contract line cannot drift from the corpus.
  tally() { case "$1" in CATCH*) catch=$((catch + 1)) ;; IGNORE*) ignore=$((ignore + 1)) ;; esac; }
  ok() { tally "$1"; printf '  ok    %s\n' "$1"; }
  bad() { tally "$1"; printf '  FAIL  %s\n' "$1"; fails=$((fails + 1)); }
  scratch="$(mktemp -d)"
  # Scratch git sees nothing of the caller's git environment: inside a real hook GIT_INDEX_FILE and
  # GIT_DIR point at the caller's repository, and a scratch commit would read or write that one.
  sg() {
    env -u GIT_CONFIG_COUNT -u GIT_DIR -u GIT_WORK_TREE -u GIT_INDEX_FILE -u GIT_PREFIX \
      GIT_CONFIG_GLOBAL=/dev/null GIT_CONFIG_NOSYSTEM=1 \
      git -c user.name=selftest -c user.email=selftest@invalid -c commit.gpgsign=false \
      -c init.defaultBranch=main "$@"
  }
  # make_repo <name> <package prefix, "" or "code/"> — a repository whose commit-msg hook is a
  # copy of this script placed in its package, as the real hook calls it.
  make_repo() {
    local r="$scratch/$1" p="$2"
    sg init -q "$r"
    mkdir -p "$r/${p}scripts" "$r/${p}hooks" "$r/${p}src/pages" "$r/${p}backend/src" \
      "$r/${p}testing/e2e" "$r/${p}testing/unit" "$r/${p}docs"
    cp "$SELF" "$r/${p}scripts/verify-lands-with-tests.sh"
    printf '#!/usr/bin/env bash\nexec bash "%s" --commit-msg "$1"\n' "$r/${p}scripts/verify-lands-with-tests.sh" \
      >"$r/${p}hooks/commit-msg"
    chmod +x "$r/${p}hooks/commit-msg"
    sg -C "$r" config core.hooksPath "${p}hooks"
    printf 'export const a = 1\n' >"$r/${p}src/a.ts"
    printf 'export const b = 1\n' >"$r/${p}backend/src/b.ts"
    printf '# guide\n' >"$r/${p}docs/guide.md"
    # An existing spec, as a build commit finds its plan's stubs. The path-limited case depends on
    # it: a NEW spec left out of the commit is invisible to a working-tree read too, so only a
    # modified one tells the commit's index from the checkout.
    printf 'it.todo("a")\n' >"$r/${p}testing/unit/a.spec.ts"
    # Tracked, so a case's clean-up cannot remove the directories the next case writes into.
    for d in src/pages testing/e2e testing/unit; do : >"$r/${p}$d/.keep"; done
    sg -C "$r" add -A && sg -C "$r" commit -q -m "base [skip-e2e-check: the fixture's first commit]" \
      && sg -C "$r" rev-parse HEAD >"$scratch/$1.base"
  }
  # attempt <want: pass|refuse[:<text the refusal must name>]> <label> <repo> <commit args...> —
  # every case starts from the fixture's base commit, so a case that commits cannot change what
  # the next one sees. A refusal can be asked for BY ITS REASON, where another rule would refuse
  # the same commit and hide the one under test.
  attempt() {
    local want="${1%%:*}" why="" label="$2" r="$scratch/$3" base="$scratch/$3.base" got
    case "$1" in *:*) why="${1#*:}" ;; esac
    shift 3
    if sg -C "$r" commit -q "$@" >"$scratch/out" 2>&1; then got=pass; else got=refuse; fi
    if [ "$got" = "$want" ] && { [ -z "$why" ] || grep -qF "$why" "$scratch/out"; }; then ok "$label"
    else bad "$label — want $1, got $got: $(tr '\n' ' ' <"$scratch/out" | cut -c1-160)"; fi
    sg -C "$r" reset -q --hard "$(cat "$base")"
    sg -C "$r" clean -q -fd
  }

  echo "verify-lands-with-tests.sh — self-test"
  for layout in code root; do
    local p="" r="$layout"
    [ "$layout" = code ] && p="code/"
    if ! make_repo "$r" "$p" >"$scratch/out" 2>&1; then
      bad "the $layout layout's fixture could not be built: $(tr '\n' ' ' <"$scratch/out")"
      continue
    fi
    local R="$scratch/$r"
    echo "  — package at ${p:-the repository root}"

    printf 'export const a = 2\n' >"$R/${p}src/a.ts"; sg -C "$R" add -A
    attempt refuse "CATCH  feature code changed with no test ($layout)" "$r" -m 'change a'

    printf 'export const b = 2\n' >"$R/${p}backend/src/b.ts"; sg -C "$R" add -A
    attempt refuse "CATCH  backend code changed with no test ($layout)" "$r" -m 'change b'

    printf 'export const a = 2\n' >"$R/${p}src/a.ts"
    printf 'it("a", () => {})\n' >"$R/${p}testing/unit/a.spec.ts"; sg -C "$R" add -A
    attempt pass "IGNORE feature code with its unit spec ($layout)" "$r" -m 'change a, tested'

    printf 'export const a = 2\n' >"$R/${p}src/a.ts"
    printf 'it("a", () => {})\n' >"$R/${p}testing/unit/a.spec.ts"; sg -C "$R" add -A
    attempt refuse "CATCH  a path-limited commit leaves the staged spec out ($layout)" "$r" \
      -m 'change a only' -- "${p}src/a.ts"

    printf 'export const a = 2\n' >"$R/${p}src/a.ts"
    printf 'it("a", () => {})\n' >"$R/${p}testing/unit/a.spec.ts"
    printf 'export const b = 9\n' >"$R/${p}backend/src/b.ts"; sg -C "$R" add -A
    attempt pass "IGNORE a path-limited commit is judged on its own paths, not the index ($layout)" "$r" \
      -m 'change a, tested' -- "${p}src/a.ts" "${p}testing/unit/a.spec.ts"

    printf '// why a is one\nexport const a = 1\n' >"$R/${p}src/a.ts"; sg -C "$R" add -A
    attempt pass "IGNORE a change to comments only ($layout)" "$r" -m 'comment a'

    sg -C "$R" rm -q "${p}src/a.ts"
    attempt pass "IGNORE deleting feature code ($layout)" "$r" -m 'drop a'

    printf '# more\n' >>"$R/${p}docs/guide.md"; sg -C "$R" add -A
    attempt pass "IGNORE a docs-only commit ($layout)" "$r" -m 'docs'

    printf 'export const a = 3\n' >"$R/${p}src/a.ts"; sg -C "$R" add -A
    attempt pass "IGNORE a skip that gives its reason ($layout)" "$r" \
      -m 'bump a [skip-e2e-check: a constant the fixture does not test]'

    printf 'export const a = 3\n' >"$R/${p}src/a.ts"; sg -C "$R" add -A
    attempt 'refuse:carries no reason' "CATCH  a bare skip marker ($layout)" "$r" -m 'bump a [skip-e2e-check]'

    printf 'export const a = 3\n' >"$R/${p}src/a.ts"; sg -C "$R" add -A
    attempt 'refuse:carries no reason' "CATCH  a marker whose reason is blank ($layout)" "$r" \
      -m 'bump a [skip-e2e-check:   ]'

    printf '<template><div /></template>\n' >"$R/${p}src/pages/NewPage.vue"
    printf 'it("p", () => {})\n' >"$R/${p}testing/unit/new.spec.ts"
    printf '# new page\n' >>"$R/${p}docs/guide.md"; sg -C "$R" add -A
    attempt refuse "CATCH  a new page with no E2E spec ($layout)" "$r" -m 'new page'

    printf '<template><div /></template>\n' >"$R/${p}src/pages/NewPage.vue"
    printf 'test("p", async () => {})\n' >"$R/${p}testing/e2e/new.spec.ts"
    printf '<!-- GENERATED by scripts/x.ts -->\n# coverage\n' >"$R/${p}docs/coverage.md"; sg -C "$R" add -A
    attempt refuse "CATCH  a new page whose only doc is generated ($layout)" "$r" -m 'new page'

    printf '<template><div /></template>\n' >"$R/${p}src/pages/NewPage.vue"
    printf 'test("p", async () => {})\n' >"$R/${p}testing/e2e/new.spec.ts"
    printf '# new page\n' >>"$R/${p}docs/guide.md"; sg -C "$R" add -A
    attempt pass "IGNORE a new page with its E2E spec and its doc ($layout)" "$r" -m 'new page'

    sg -C "$R" mv "${p}src/a.ts" "${p}src/renamed.ts"
    attempt pass "IGNORE a rename that changes no line ($layout)" "$r" -m 'rename a'
  done

  # Merging judges nothing new: each side's commits were judged when they were made.
  local R="$scratch/code"
  if [ -d "$R" ]; then
    sg -C "$R" checkout -q -b side
    printf 'export const a = 5\n' >"$R/code/src/a.ts"; sg -C "$R" add -A
    sg -C "$R" commit -q -m 'side [skip-e2e-check: the merge case needs an untested side]' >/dev/null 2>&1
    sg -C "$R" checkout -q main
    printf '# main\n' >>"$R/code/docs/guide.md"; sg -C "$R" add -A; sg -C "$R" commit -q -m 'main docs'
    if sg -C "$R" merge -q --no-ff -m 'merge side' side >"$scratch/out" 2>&1; then
      ok 'IGNORE a merge commit'
    else bad "IGNORE a merge commit — refused: $(tr '\n' ' ' <"$scratch/out" | cut -c1-160)"; fi

    if env -u GIT_DIR -u GIT_INDEX_FILE -u GIT_WORK_TREE bash "$R/code/scripts/verify-lands-with-tests.sh" \
      --commit "$(sg -C "$R" rev-parse HEAD)" >/dev/null 2>&1; then
      ok 'IGNORE --commit passes a merge commit'
    else bad 'IGNORE --commit passes a merge commit'; fi
  fi

  # --commit judges a made commit by the same rules. The commit it refuses is made in a repository
  # that never installed the gate, which is what a commit from before the gate looks like.
  local P="$scratch/plain"
  if sg init -q "$P" && mkdir -p "$P/code/scripts" "$P/code/src" \
    && cp "$SELF" "$P/code/scripts/verify-lands-with-tests.sh" \
    && printf 'export const a = 1\n' >"$P/code/src/a.ts" \
    && sg -C "$P" add -A && sg -C "$P" commit -q -m 'untested' >/dev/null 2>&1; then
    if env -u GIT_DIR -u GIT_INDEX_FILE -u GIT_WORK_TREE bash "$P/code/scripts/verify-lands-with-tests.sh" \
      --commit "$(sg -C "$P" rev-parse HEAD)" >/dev/null 2>&1; then
      bad 'CATCH  --commit refuses a made commit the hook would have refused'
    else ok 'CATCH  --commit refuses a made commit the hook would have refused'; fi
  else bad 'the --commit fixture could not be built'; fi

  rm -rf "$scratch"
  echo "  auditor-contract: catch=$catch ignore=$ignore"
  if [ "$fails" -eq 0 ]; then echo "  ✓ verify-lands-with-tests is correct"; return 0; fi
  echo "  ✗ $fails case(s) wrong — fix the gate, never the corpus."
  return 1
}

case "${1:-}" in
  --self-test)
    self_test; exit $? ;;
  --commit-msg)
    [ -n "${2:-}" ] && [ -r "$2" ] || { echo "verify-lands-with-tests: --commit-msg needs the message file git passes" >&2; exit 1; }
    init_repo || { echo "verify-lands-with-tests: $PKG is not in a git repository" >&2; exit 1; }
    # A merge judges nothing new: each side's commits were judged when they were made.
    if git -C "$ROOT" rev-parse -q --verify MERGE_HEAD >/dev/null 2>&1; then exit 0; fi
    MODE=index
    judge "$(grep -v '^#' "$2")"; exit $? ;;
  --commit)
    [ -n "${2:-}" ] || { echo "verify-lands-with-tests: --commit needs a commit" >&2; exit 1; }
    init_repo || { echo "verify-lands-with-tests: $PKG is not in a git repository" >&2; exit 1; }
    MODE=commit; SHA="$(git -C "$ROOT" rev-parse --verify "$2^{commit}")" || exit 1
    if [ "$(git -C "$ROOT" rev-list --parents -n 1 "$SHA" | wc -w)" -gt 2 ]; then exit 0; fi
    judge "$(git -C "$ROOT" log -1 --format=%B "$SHA")"; exit $? ;;
  *)
    echo "usage: verify-lands-with-tests.sh --commit-msg <file> | --commit <sha> | --self-test" >&2
    exit 1 ;;
esac
