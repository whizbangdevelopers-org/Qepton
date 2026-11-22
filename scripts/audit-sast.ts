// Copyright (c) 2026 whizBANG Developers LLC. All rights reserved.
// Licensed under MIT. See LICENSE.
/**
 * SAST (Static Application Security Testing) Auditor
 *
 * Scans source code for common security anti-patterns:
 * - Command injection (child_process with unsanitized input)
 * - SQL injection (string concatenation in queries)
 * - XSS (innerHTML, v-html with user input)
 * - Path traversal (unsanitized path joins)
 * - Hardcoded secrets (API keys, passwords in source)
 * - Eval usage
 * - Prototype pollution patterns
 *
 * Uses regex scanning — no external dependencies required.
 */

import { execFileSync } from 'child_process'
import { readFileSync, readdirSync, statSync, lstatSync } from 'fs'
import { join, relative, extname, dirname, isAbsolute } from 'path'
import { fileURLToPath } from 'url'

// ES module — no __dirname. Needed to locate the regression corpus relative to this file
// rather than to the caller's cwd, so the self-test works from any directory.
const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))

interface Finding {
  rule: string
  severity: 'error' | 'warning'
  file: string
  line: number
  match: string
}

interface Rule {
  id: string
  description: string
  severity: 'error' | 'warning'
  pattern: RegExp
  extensions: string[]
  /** Lines matching any exclude pattern are skipped */
  excludePatterns?: RegExp[]
  /** Files matching any of these paths are skipped */
  excludePaths?: RegExp[]
  /**
   * Second-stage judgement on a regex hit. Returns false to discard it.
   *
   * A regex alone cannot separate a credential from a UI label or a translated word, and
   * trying to express that in one pattern produces something nobody can read or justify.
   * The match groups are handed here instead, where the reasoning can be stated in prose
   * and tested. `nearby` is the line and the three on either side of it (just the line, in the
   * corpus), for a judgement a sibling key decides (isTokenizerPiece).
   */
  validate?: (match: RegExpMatchArray, line: string, nearby: string) => boolean
}

/* -------------------------------------------------------------------------- */
/* Secret detection                                                            */
/*                                                                             */
/* The rule below replaces one that sat in this chain named `hardcoded-secret` and could   */
/* not see a single real secret. Measured against the credentials found live in the DemoCRM */
/* webroot in July 2026 — served to the open internet by a debug page whose IP guard had    */
/* been commented out — it missed ALL of them, for six independent reasons:                 */
/*                                                                                          */
/*   1. It demanded 20+ characters. The production password was 14.                         */
/*   2. Its value class was [A-Za-z0-9+/=_-], so any password containing punctuation        */
/*      (the test credential ended in '!') was invisible.                                   */
/*   3. It scanned only .ts/.js/.vue/.json. The credentials were in .php and phpunit.xml.   */
/*   4. It scanned only src/ and backend/src/. Every real one lived in tests/, scripts/,    */
/*      config/ or the webroot.                                                             */
/*   5. It skipped any line containing the word "test" — and a test-database password is    */
/*      still a password.                                                                   */
/*   6. It skipped any line containing "//", so `password: 'x' // prod` was invisible.      */
/*                                                                                          */
/* An auditor that names the right bug and cannot see it is worse than no auditor: it       */
/* issues a green tick that a reader trusts. All six defects are fixed below, and the       */
/* corpus above is the regression test. Note that the real credential VALUES are            */
/* deliberately not reproduced in this comment — a dead password in a source comment is     */
/* still a credential literal in source, and this rule correctly flags its own file for it. */
/* -------------------------------------------------------------------------- */

/**
 * An identifier that names a credential. Matched anywhere in the name, so camelCase
 * (`prodPassword`, `testPass`), snake_case (`crm_password`) and SCREAMING_CASE
 * (`TEST_DB_PASS`) all land — the previous rule demanded a `_`/`-` separator and so could
 * not see any of the camelCase ones.
 */
const SECRET_NAME =
  /(?:api[-_]?key|secret|password|passwd|pwd|pass(?!ed|ing|age)|token|credential|auth[-_]?key|private[-_]?key|access[-_]?key)/i

/** Identifier fragments that mean display text, never a credential. */
const UI_STRING_NAME =
  /label|aria|placeholder|title|text|hint|heading|caption|msg|message|error|desc|confirm|prompt|column|field/i

/**
 * A name ending in _FILE / _PATH holds the LOCATION of a secret, not the secret.
 *
 * This exclusion is load-bearing, not a convenience. `ENGRAM_COGNEE_PASSWORD_FILE=/run/
 * secrets/…` is the sops-nix convention (`sops.secrets` → read via `*_FILE`) and is exactly
 * the pattern this whole audit exists to push people toward. Flagging it would mean the
 * auditor's loudest complaint is aimed at the one team doing it right — the fastest way
 * imaginable to teach everyone that the check is noise and should be silenced.
 */
const SECRET_LOCATION_NAME = /(?:_file|_path|_filepath|_dir|_location|_uri|_url)$/i

/**
 * The same LOCATION suffix, spelled camelCase. The rule above only read snake_case, so on
 * 2026-09-10 Qepton's `accessTokenUrl` — GitHub's public OAuth token ENDPOINT — was reported as
 * a hardcoded secret. That is the camelCase blind spot this rule's own comments warn about, in
 * the IGNORE direction: the direction that gets an auditor switched off. Case-SENSITIVE on
 * purpose: the capital marks the word boundary, so `tokenProfile` is not read as `…File`.
 */
const SECRET_LOCATION_NAME_CAMEL = /(?:File|FilePath|Path|Dir|Location|Uri|URI|Url|URL)$/

/**
 * nginx's `proxy_pass`, spelt `proxyPass` in a NixOS virtual host, is the upstream ADDRESS a
 * location forwards to. Its name holds `pass`, so it read as a password field the first time the
 * scan read .nix files: three `proxyPass = "http://127.0.0.1:…"` lines in king's webserver.nix,
 * 2026-11-22. Exact names only, and the URL test below still applies, so an upstream URL that
 * carries a credential stays a finding.
 */
const PROXY_PASS_NAME = /^proxy[-_]?pass$/i

/**
 * A URL that CARRIES a credential is the credential, whatever its name says — basic-auth
 * userinfo (`https://user:pass@host`) or a credential-named query parameter. Without this, the
 * location exemption would wave through exactly the webhook and token URLs that leak. It applies
 * to both spellings, so it also closes that hole for the snake_case names above.
 */
const URL_CARRIES_CREDENTIAL =
  /:\/\/[^\s/@:]+:[^\s/@]+@|[?&](?:token|access_token|api[-_]?key|key|secret|password|passwd|pwd|sig|signature)=/i

/**
 * A constant that holds the NAME OF AN ENVIRONMENT VARIABLE, not a credential.
 *
 * Exactly the class `SECRET_LOCATION_NAME` above already exempts — `PASSWORD_FILE=/run/secrets/…`
 * is a pointer to where the secret lives, and so is `TOKEN_ENV = 'APP_GITHUB_TOKEN'`. The pointer
 * is the CORRECT thing to have in source; it is what a hardcoded credential is replaced BY, so
 * flagging it tells an author that doing the right thing is a violation.
 *
 * Deliberately narrow, and BOTH halves must hold: the identifier ends in a name-of-a-name suffix,
 * AND the value is a bare SCREAMING_SNAKE env-var identifier. A real credential satisfying both
 * would have to be all-caps, underscore-only, entropy-free, and assigned to something called
 * `*_ENV` — at which point it is not a credential anyone could use.
 *
 * The corpus asserts the near-miss in the other direction: a REAL provider token assigned to a
 * constant with this same name shape is still caught, because the exemption turns on the VALUE
 * being a bare identifier. That case lives in `fixtures/sast-secret-corpus.txt` and is
 * deliberately not quoted here — this rule flags a credential-shaped string whether or not it sits
 * in a comment, which is correct and which this docblock tripped on its first run.
 */
/**
 * One sops value: `ENC[AES256_GCM,data:<b64>,iv:<b64>,tag:<b64>,type:<kind>]`, nothing else. The
 * lengths are AES-256-GCM's: a 32-byte IV is 44 base64 characters and a 16-byte tag is 24, and
 * the data is whole base64. All 63 sops values in the fleet's repositories have exactly that
 * shape (measured 2026-11-22). Until then each field took any base64-alphabet run, so a plaintext
 * wrapped in the envelope's shape passed (`data:hunter2hunter2,iv:x,tag:y`, found by a peer
 * session the same day). A value built to imitate ciphertext still passes; no static check stops
 * that. An accidental one no longer does.
 */
const SOPS_CIPHERTEXT =
  /^ENC\[AES256_GCM,data:(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?,iv:[A-Za-z0-9+/]{43}=,tag:[A-Za-z0-9+/]{22}==,type:[a-z]+\]$/

/**
 * A name that declares a PATTERN, holding pattern syntax, FINDS credentials; it is not one.
 * Ported 2026-11-22 from anvil's audit-credential-fallbacks.py, so the two auditors agree, when
 * this scan first read anvil and reported github-token-scan.sh's TOKEN_RE, the regex that locates
 * GitHub tokens. Both halves are required, so a regex-looking value under a credential name is
 * still a literal. `+` is left out of the syntax on purpose: base64 carries it, and counting it
 * let a base64 secret under a …_PATTERN name through in anvil the day the exemption landed. The
 * camelCase spelling (`tokenPattern`) is added here, because this archetype's repos are TypeScript.
 */
const PATTERN_NAME = /(?:_(?:re|regex|pattern)|Regex|Pattern)$/i
const REGEX_SYNTAX = /[[\](){}|\\*?^]/

/**
 * An LLM's tokenizer piece, not a credential: a `token` key beside a `logprob` key, which is how
 * llama-server and the OpenAI API report token probabilities. Found 2026-11-22 when this scan
 * first read anvil: its duplicate judge's recorded outputs hold word pieces such as an underscore
 * and a capitalised word, and the name alone cannot tell an NLP token from an auth token. The
 * sibling key can (corpus section "an LLM's tokenizer piece"). `nearby` is
 * the finding's line and the three on either side, since a JSON record puts `logprob` on the next
 * line; the corpus passes the line alone, and TOKENIZER_CASES pin the multi-line form.
 */
function isTokenizerPiece(key: string, nearby: string): boolean {
  return key === 'token' && /["']?(?:logprob|top_logprobs)["']?\s*:/.test(nearby)
}

const ENV_VAR_NAME_HOLDER = /(?:_env|_env_var|_var|_var_name|_env_name|_key_name)$/i
const ENV_VAR_NAME_VALUE = /^[A-Z][A-Z0-9_]{2,}$/

/**
 * Values that are the CORRECT thing to commit — templates and demo fixtures, not secrets.
 * `demo[-_]` is here because Weaver's demo mode returns `demo_private_key…` as a fake VAPID
 * key; a value literally prefixed `demo_`/`demo-` is a placeholder of the same class as
 * example/dummy/sample, in any repo. `mock[-_]` joined them 2026-10-01, when scanning testing/
 * found Qepton's E2E helper seeding `mock_token_for_testing`. (Weaver carried `demo`, `sample`,
 * `fake` and `placeholder` before the template did; the template caught up the same day.)
 */
const PLACEHOLDER_VALUE =
  /^(?:CHANGE_ME|CHANGEME|REPLACE_ME|TODO|TBD|<.*>|\{\{?.*\}?\}|\$\{.*\}|x{3,}|\*{3,}|your[-_]|example|sample|demo[-_]|dummy|mock[-_]|fake|placeholder|redacted|\.{3})/i

/**
 * Human prose in ANY language — letters, spaces, light punctuation, nothing else.
 * \p{L} rather than A-Za-z on purpose: an earlier cut of this logic called the Spanish
 * translation 'password' => 'Contraseña' a secret, because it counted ñ as a symbol.
 * A credential carries entropy; a word does not, whatever alphabet it is written in.
 */
const PROSE_VALUE = /^[\p{L}\s'’.,!?()/-]+$/u

/**
 * A SENTENCE — several words, plus the punctuation prose actually uses and `PROSE_VALUE` above
 * deliberately excludes (a colon, an em dash, a section mark, an ampersand).
 *
 * Added 2026-09-20, when a DECLARATION file tripped this rule: `"audit:token-reach": "docs/…§
 * GitHub tokens — run at mint, at rotation, …"`. The key capture begins after the namespace colon,
 * so the rule saw `token-reach` assigned three lines of English and called it a credential. The
 * available non-fixes were both forbidden — renaming the auditor to dodge the regex is the
 * input-rewording `~/.claude/rules/never-game-auditors.md` refuses, and a JSON file cannot carry a
 * `sast-ignore` comment on the offending line.
 *
 * FOUR whitespace-separated words is the gate, and it opens no new blind spot: `PROSE_VALUE`
 * already treats a multi-word letter-only string as prose, so a space-separated passphrase was
 * never caught by this rule to begin with. Digits stay OUT of the class on purpose — `hunter2hunter2`
 * is exactly the fourteen-character password this rule exists to see, and a credential that
 * contains four spaces and no digit is not a shape any generator produces.
 */
const PROSE_SENTENCE = /^(?=(?:\S+\s+){3,}\S)[\p{L}\s'’"“”§:;,.!?()/\-—–&%+*_]+$/u

/**
 * Is this string plausibly a credential rather than a word, a label, or a template?
 *
 * Length alone is a bad test — that is precisely how the old rule missed a 14-character
 * production password. Entropy is the signal: a secret contains something that is not a
 * letter, or is long enough that no word is.
 */
function isCredentialValue(value: string): boolean {
  if (value.length < 6) return false
  if (PLACEHOLDER_VALUE.test(value)) return false
  // A `\uXXXX` escape is an ENCODING of one character, not four hex digits of entropy. A JSON file
  // written with ensure_ascii — which is this portfolio's convention for its declaration files —
  // spells `§` and `—` that way, and the hex digits were enough to make a paragraph of English read
  // as a credential. Normalising to a letter cannot weaken detection: a generated secret contains
  // no `\uXXXX` runs, and anything else in the value is still judged below.
  const plain = value.replace(/\\u[0-9a-fA-F]{4}/g, 'x')
  if (PROSE_VALUE.test(plain)) return false
  if (PROSE_SENTENCE.test(plain)) return false
  return /[^\p{L}]/u.test(value) || value.length >= 16
}

/**
 * Does `value` repeat a word of its own name, other than the credential word? That is the
 * default-credential shape: a Postgres password that is the word postgres, a MySQL root password
 * that is the word root, an admin password that is the word admin. It is judged by the echo, not
 * by entropy, so it applies at any length from two characters. The corpus section "a value that
 * repeats its own name" holds the cases; they are not quoted here, because this rule reads
 * comments too.
 *
 * Found 2026-11-22, when king's oracle.nix set Oracle's admin password to the word oracle and
 * this scan, in king's pre-push that day, passed it. `isCredentialValue` reads an all-letters
 * value as a word, which is right for a translation table and let through the most common
 * hardcoded passwords there are, and the six-character floor kept a four-letter one from being
 * judged at all.
 *
 * Three conditions, each from a measured case:
 * - The name ENDS in the credential term, so the credential is what it names. Gantry's
 *   CHANNEL_SECRET_PURPOSE names the purpose a channel's secret is filed under, and its value,
 *   a word of its own name, is a label (2026-11-22, the first run of this check).
 * - The echo is a word BEFORE that term; the term itself never counts, so a label that repeats
 *   it stays a label.
 * - The value is lower-case letters and digits. A default is typed at a prompt; a display label
 *   (a show-password button's "Show") is capitalised. A lower-case label under a name ending in
 *   the term is the edge this leaves, and a reasoned suppression covers it.
 * The value may be several such words joined by `-`, `.` or `_`, the FIRST of them the echo: a
 * service's default names the service, then its role or host, and reads as prose to
 * isCredentialValue. anvil's credential-fallback auditor carries one, a past Engram default, as a
 * must-catch fixture that this scan passed the same day. Any word was tried first, and read a
 * pytest fixture that merely contains a word of its name (anvil, the same run).
 * Names split at `_`, `-`, `.` and a camelCase boundary, and a placeholder stays a placeholder.
 */
const SECRET_NAME_TAIL = new RegExp(`(?:${SECRET_NAME.source})$`, 'i')
function isNameEchoCredential(key: string, value: string): boolean {
  if (!/^[a-z0-9]+(?:[-._][a-z0-9]+)*$/.test(value) || value.length < 2) return false
  if (PLACEHOLDER_VALUE.test(value)) return false
  const tail = SECRET_NAME_TAIL.exec(key)
  if (!tail) return false
  const first = value.split(/[-._]/)[0]
  return key
    .slice(0, tail.index)
    .split(/[^A-Za-z0-9]+|(?<=[a-z0-9])(?=[A-Z])/)
    .some(w => w.length > 1 && w.toLowerCase() === first)
}

/**
 * Is `key` assigned `value` a hardcoded credential? The one judgement both secret-assignment
 * rules make, quoted and unquoted, so they cannot disagree about what counts.
 */
function isHardcodedSecret(key: string, value: string): boolean {
  if (!SECRET_NAME.test(key)) return false // not a credential-shaped name at all
  if (UI_STRING_NAME.test(key)) return false // $label_password = "Password"
  // `publicKeyToken="31bf3856ad364e35"` is the PUBLIC strong-name identifier of a Windows or .NET
  // component, printed in every unattend.xml and assembly reference. Its name contains `token`
  // and its value is 16 hex digits, so it read as a credential when testing/ was first scanned
  // (Weaver, 2026-10-01). Exact name only: `privateKeyToken` and any other `*Token` stay findings.
  if (/^public[-_]?key[-_]?token$/i.test(key)) return false
  // PASSWORD_FILE=/run/secrets/… and accessTokenUrl = 'https://…/access_token' name a LOCATION —
  // unless the value is a URL that carries the credential itself.
  if (
    (SECRET_LOCATION_NAME.test(key) ||
      SECRET_LOCATION_NAME_CAMEL.test(key) ||
      PROXY_PASS_NAME.test(key)) &&
    !URL_CARRIES_CREDENTIAL.test(value)
  )
    return false
  // TOKEN_ENV = 'APP_GITHUB_TOKEN' — the NAME of the variable, not its value. Same class.
  if (ENV_VAR_NAME_HOLDER.test(key) && ENV_VAR_NAME_VALUE.test(value)) return false
  // TOKEN_RE = '(ghp|gho)_[A-Za-z0-9]{36}…', the pattern that finds a credential (PATTERN_NAME).
  if (PATTERN_NAME.test(key) && REGEX_SYNTAX.test(value)) return false
  // The value is a path, not a secret: absolute, relative, home, a drive letter, or one rooted
  // at a variable (`"$ROOT/secrets/app.yaml"`, added 2026-09-18, when Gantry's sops wrapper
  // naming the file it decrypts from was reported as a hardcoded secret). The variable must
  // START the value and be followed by a separator; the corpus pins both halves.
  if (/^[./~]|^[A-Za-z]:[\\/]|^\$[A-Za-z_][A-Za-z0-9_]*\//.test(value)) return false
  if (/^test_/i.test(value)) return false // fixture logins, not credentials
  // A sops-encrypted value is ciphertext: the form a long-lived secret is SUPPOSED to take in git
  // (~/.claude/rules/secrets.md). Found 2026-11-22 when the scan first read Gantry's repo-root
  // secrets/gantry.yaml: `jwt-secret: ENC[AES256_GCM,…]` was reported, and its five siblings were
  // not only because their names hold no secret word. The whole envelope must be present, data,
  // iv, tag and type, so an `ENC[…]` wrapped around a plaintext value is still judged below.
  if (SOPS_CIPHERTEXT.test(value)) return false
  // A shell EXPANSION is not a literal — `SECRET="$(openssl rand …)"`, `SECRET="$OTHER"`,
  // `SECRET=${OTHER}`, `SECRET=`cmd``. This is the one thing a static checker CAN decide with
  // certainty here, and excluding it cannot weaken literal detection: a literal has no
  // expansion in it by definition.
  //
  // Ported from Weaver 2026-08-13, where the rule flagged a per-run random secret generated
  // from /dev/urandom. Rewording that line to dodge the regex would have been gaming the
  // auditor; the value genuinely is not hardcoded, so the rule was wrong.
  //
  // Weaver's FIRST attempt was "any dollar sign anywhere", and its corpus rejected it on the
  // spot: a literal password that merely CONTAINS a dollar is still a literal, and still the
  // leak this rule exists to catch. Both shapes are in the corpus under "shell expansions are
  // not literals" — deliberately there and not quoted here, because a credential-shaped string
  // in source is the thing being forbidden, comment or not.
  // So the test is for an actual EXPANSION — `$(`, a backtick, `${`, or a value that is
  // ENTIRELY a bare variable reference — never for the character.
  if (/\$\(|`|\$\{/.test(value) || /^\$[A-Za-z_][A-Za-z0-9_]*$/.test(value)) return false
  // Grafana's own indirection, `$__file{/run/…}`, `$__env{VAR}` or `$__vault{…}`, is how a
  // NixOS Grafana reads a secret from sops. As the WHOLE value it names where the secret is, the
  // same as `${…}`; with anything around it, the value is still judged. Found 2026-11-22, when the
  // scan first read anvil's monitor.nix and reported its admin_password and secret_key.
  if (/^\$__(?:file|env|vault)\{[^{}]+\}$/.test(value)) return false
  if (isNameEchoCredential(key, value)) return true
  return isCredentialValue(value)
}

/**
 * Does the unquoted `value` that `m` matched begin an angle-bracketed placeholder on `line`?
 * `TOKEN=<registration token>` says what goes there, and PLACEHOLDER_VALUE exempts `<…>` already,
 * but the shell-assignment shape ends a value at the first space, so it saw `<registration` with
 * no `>`. Read from the line, so a `<` with no closing `>` stays a literal. Found 2026-11-22 in a
 * comment in anvil's forgejo-runner-microvm.nix, the first time a scan read it.
 */
function angledPlaceholderAt(line: string, m: RegExpMatchArray, value: string): boolean {
  if (!value.startsWith('<') || m.index === undefined) return false
  const at = m.index + m[0].lastIndexOf(value)
  return /^<[^<>\n]+>/.test(line.slice(at))
}

/**
 * Is `content` a literal written into the secret-named file at `path`? The judgement for
 * `secret-file-content`. The PATH is what is judged by name, since a file called initial-password
 * holds a password whatever its content looks like, so no placeholder or entropy exemption
 * applies: `CHANGEME` written there is the password. Only content that is not a literal is let
 * through: tmpfiles' `-` (no argument) and an expansion, which is computed where it runs.
 */
function isSecretFileContent(path: string, content: string): boolean {
  if (!SECRET_NAME.test(path)) return false
  if (content === '-') return false
  if (/\$\(|`|\$\{/.test(content)) return false
  return content.length > 0
}

const rules: Rule[] = [
  {
    id: 'command-injection',
    description: 'Potential command injection — exec/spawn with template literal or concatenation',
    severity: 'error',
    pattern: /\b(exec|execSync|spawn|spawnSync)\s*\(\s*(`[^`]*\$\{|[^'"][^,)]*\+)/,
    extensions: ['.ts', '.js'],
    excludePaths: [/node_modules/, /\.spec\.ts$/, /scripts\/audit-sast\.ts$/]
  },
  {
    id: 'eval-usage',
    description: 'Use of eval() or Function() constructor',
    severity: 'error',
    pattern: /\b(eval|Function)\s*\(/,
    extensions: ['.ts', '.js', '.vue'],
    excludePatterns: [/\/\/.*\beval\b/, /['"]eval['"]/],
    excludePaths: [/node_modules/, /\.spec\.ts$/]
  },
  {
    id: 'innerhtml-xss',
    description: 'Direct innerHTML assignment — use textContent or sanitize',
    severity: 'warning',
    pattern: /\.innerHTML\s*=/,
    extensions: ['.ts', '.js', '.vue'],
    excludePaths: [/node_modules/, /\.spec\.ts$/]
  },
  {
    id: 'v-html-xss',
    description: 'v-html directive with dynamic binding — XSS risk if user-controlled',
    severity: 'warning',
    pattern: /v-html\s*=\s*"/,
    extensions: ['.vue'],
    excludePatterns: [/v-html="'[^']*'"/], // Static strings are fine
    excludePaths: [/node_modules/]
  },
  {
    id: 'sql-injection',
    description: 'String concatenation in SQL query — use parameterized queries',
    severity: 'error',
    pattern:
      /\b(query|execute|run)\s*\(\s*(`[^`]*\$\{|['"][^'"]*['"]\s*\+).*(?:SELECT|INSERT|UPDATE|DELETE|DROP)/i,
    extensions: ['.ts', '.js'],
    excludePaths: [/node_modules/, /\.spec\.ts$/]
  },
  {
    id: 'hardcoded-secret',
    description: 'Credential assigned to a literal — load it from a secret store, not source',
    severity: 'error',
    // Capture ANY identifier assigned a string literal, then judge the NAME in validate().
    // Trying to encode "is this a secret-ish name" inside the pattern is what broke the last
    // one: it required a _ or - separator, so `$prodPassword` and `$testPass` (camelCase) did
    // not match, and `->` before `crm_password` was not an accepted boundary. Two alternatives:
    //
    //   1. attribute pair  <env name="TEST_DB_PASS" value="…"/>   (XML / phpunit / CI config)
    //   2. assignment      $password = '…'   'password' => '…'   password: '…'   PASS="…"
    //                      $cfg['blowfish_secret'] = '…'   (an element: `]` before the `=`)
    //
    // The element form was missed until 2026-11-22, and it is how PHP's own config files are
    // written: phpMyAdmin's cookie key sat on king as `$cfg['blowfish_secret'] = '…'`, inside a Nix
    // string, and this rule could see neither the `]` nor the `.nix` file around it.
    //
    // The attribute form is FIRST on purpose. Alternation is ordered, and on an XML line the
    // assignment branch happily matches name="TEST_DB_PASS" — key `name`, which is not
    // secret-shaped — and the finding is discarded before the attribute branch is ever tried.
    // That silently reinstated the exact miss this rule exists to prevent.
    //
    // No 20-char minimum and no alphanumeric-only class — those two limits are what made the
    // previous rule blind to a live production password. The value floor is two characters, not
    // six: a value that repeats its own name (isNameEchoCredential) is a credential at any length,
    // and every other value still has to pass isCredentialValue's six (2026-11-22).
    pattern:
      /(?:name\s*=\s*["']([^"'\n]+)["']\s+value\s*=\s*["']([^"'\n]{2,})["']|["']?([A-Za-z_$][\w$-]*)["']?\]?\s*(?:=>|[:=])\s*["']([^"'\n]{2,})["'])/i,
    // .php/.xml/.yml/.env/.sh matter: the DemoCRM leak lived in .php and phpunit.xml, and
    // a rule that only reads the languages you like is not a control. .nix matters for the same
    // reason: a NixOS module writes other languages' config inside its strings (PHP, INI, shell),
    // and every repo built from this archetype ships one under code/nixos/.
    extensions: [
      '.ts',
      '.js',
      '.vue',
      '.json',
      '.php',
      '.xml',
      '.yml',
      '.yaml',
      '.env',
      '.sh',
      '.py',
      '.ini',
      '.conf',
      '.nix'
    ],
    // No blanket /test/ or /\/\/.*/ exclusion here — both were holes big enough to drive the
    // real leak through. Discrimination happens in validate(), on the captured VALUE.
    excludePaths: [
      /node_modules/,
      /\.spec\.ts$/,
      /package(-lock)?\.json$/,
      /\.example\./,
      /\.sample\./
    ],
    validate: (m, line, nearby) =>
      !keyInsideQuotedString(m, line) &&
      !isTokenizerPiece(m[1] ?? m[3] ?? '', nearby) &&
      isHardcodedSecret(m[1] ?? m[3] ?? '', m[2] ?? m[4] ?? '')
  },
  {
    id: 'hardcoded-secret-unquoted',
    description:
      'Credential assigned an UNQUOTED literal in a config file — load it from a secret store',
    severity: 'error',
    // `hardcoded-secret` above reads a QUOTED value only, and YAML, .env, shell and INI files are
    // written unquoted as often as not. So `POSTGRES_PASSWORD: app_password` in a committed
    // docker-compose.yml passed this scan clean on 2026-10-01, in the very file class the
    // root-level scan below names as "where credentials most often sit". The rule's own comment
    // said .yml/.env/.sh "matter"; its pattern could not see how those files are written.
    //
    // A SEPARATE rule rather than a third branch, because it is only sound in config formats: in
    // code, `password = readPassword()` is an assignment from a call, not a literal. The judgement
    // is the same one — `isHardcodedSecret` — so the two rules cannot drift on what counts.
    //
    // Two shapes, in this order:
    //
    //   1. a WHOLE LINE: an optional `export ` or YAML list dash, a key, `:` or `=`, ONE unquoted
    //      token, then only a comment. A value with a space in it (`${{ secrets.X }}`,
    //      `` `cat file` ``, a sentence) does not match, which is the shape of every legitimate
    //      unquoted value under a credential-shaped key measured across four repos that day.
    //   2. a SHELL ASSIGNMENT anywhere on the line: `KEY=value` with no space around `=`, ended by
    //      whitespace, `;`, `&`, `|` or the line's end. That is an env prefix on a command,
    //      `PGPASSWORD=… psql`, or one line of a `\`-continued block. Shape 1 cannot see either,
    //      and Gantry's E2E entrypoint passed a fixed JWT secret exactly that way.
    //
    // Both take values from two characters, for the name-echo case (isNameEchoCredential), and
    // isCredentialValue still holds every other value to six.
    pattern:
      /^\s*(?:export\s+|-\s+)?["']?([A-Za-z_][\w.-]*)["']?\s*[:=]\s*([^\s"'#][^\s#]+)\s*(?:#.*)?$|(?:^|\s)(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=([^\s"'#\\][^\s;&|]+)(?=[\s;&|]|$)/,
    extensions: ['.yml', '.yaml', '.env', '.sh', '.ini', '.conf'],
    excludePaths: [/node_modules/, /\.example\./, /\.sample\./],
    validate: (m, line) =>
      !angledPlaceholderAt(line, m, m[2] ?? m[4] ?? '') &&
      isHardcodedSecret(m[1] ?? m[3] ?? '', m[2] ?? m[4] ?? '')
  },
  {
    id: 'hardcoded-secret-unquoted',
    description:
      'Credential assigned an UNQUOTED literal in shell inside a Nix string — load it from a secret store',
    severity: 'error',
    // Shape 2 above, for Nix. A NixOS module carries shell in its strings (a unit's script, a
    // writeShellScript), so `PGPASSWORD=… psql` sits in a .nix file as often as in a .sh one.
    // Shape 1 is left out on purpose: in Nix `password = config.services.x.password;` is an
    // expression, and the whole-line shape reads its value as a literal. The `[.nix]` corpus lines
    // pin both halves. Same id and the same judgement, so one suppression spelling covers both.
    pattern: /(?:^|\s)(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=([^\s"'#\\][^\s;&|]+)(?=[\s;&|]|$)/,
    extensions: ['.nix'],
    excludePaths: [/node_modules/, /\.example\./, /\.sample\./],
    validate: (m, line) =>
      !angledPlaceholderAt(line, m, m[2] ?? '') && isHardcodedSecret(m[1] ?? '', m[2] ?? '')
  },
  {
    id: 'secret-file-content',
    description:
      'A literal written into a file named as a secret — generate it on the host, or decrypt it there',
    severity: 'error',
    // A file whose PATH says password, secret, token or key holds a credential whatever is written
    // into it, so the value test the assignment rules apply (entropy, placeholders) does not apply
    // here. Measured 2026-11-22 on king: a systemd-tmpfiles rule wrote a dictionary word into
    // pgAdmin's first-run password file (`f /var/lib/pgadmin/initial-password 0600 … - <word>`),
    // and the word became the live admin login. The assignment rules could not see it twice over:
    // there is no assignment, and a short lower-case word reads as a word, which is right for a key
    // and wrong for a file named as a password.
    //
    // Covered: tmpfiles.d's f, f+, F, w and w+ lines, in a .conf file or inside a Nix string. The
    // groups are the path and the argument, so the report names the file and redacts what it holds.
    // Not covered, because no instance has been measured: environment.etc."…".text, writeText, and
    // tmpfiles.settings' attribute form, whose argument sits on its own line.
    pattern:
      /(?:^|["'\s])[fFw]\+?\s+(\/\S+)\s+\S+\s+\S+\s+\S+\s+\S+\s+([^"'\s][^"'\n]*?)\s*(?=["']|$)/,
    extensions: ['.nix', '.conf'],
    excludePaths: [/node_modules/],
    validate: m => isSecretFileContent(m[1] ?? '', m[2] ?? '')
  },
  {
    id: 'known-secret-format',
    description: 'A recognisable live credential format is present in source',
    severity: 'error',
    // Provider-issued tokens have unmistakable prefixes. These are near-zero false positive
    // and near-total loss if they leak, so they are matched on shape alone — no key name and
    // no assignment required, because a leaked token does not care how it got there.
    pattern: new RegExp(
      [
        'AKIA[0-9A-Z]{16}', // AWS access key id
        'gh[pousr]_[A-Za-z0-9]{36,}', // GitHub PAT / OAuth / server / refresh
        'github_pat_[A-Za-z0-9_]{60,}', // GitHub fine-grained PAT
        'sk-ant-[A-Za-z0-9_-]{20,}', // Anthropic
        'sk-[A-Za-z0-9]{32,}', // OpenAI and similar
        'xox[baprs]-[A-Za-z0-9-]{10,}', // Slack
        'sk_live_[A-Za-z0-9]{16,}', // Stripe live
        'AIza[0-9A-Za-z_-]{35}', // Google API key
        '-----BEGIN [A-Z ]*PRIVATE KEY-----', // PEM private key of any flavour
        'eyJ[A-Za-z0-9_-]{10,}\\.[A-Za-z0-9_-]{10,}\\.[A-Za-z0-9_-]{10,}' // signed JWT
      ].join('|')
    ),
    extensions: [
      '.ts',
      '.js',
      '.vue',
      '.json',
      '.php',
      '.xml',
      '.yml',
      '.yaml',
      '.env',
      '.sh',
      '.py',
      '.ini',
      '.conf',
      '.md',
      '.nix'
    ],
    excludePaths: [/node_modules/, /package(-lock)?\.json$/]
  },
  {
    id: 'path-traversal',
    description: 'Path join with user input without sanitization',
    severity: 'warning',
    pattern: /path\.(join|resolve)\s*\([^)]*req\.(params|query|body)/,
    extensions: ['.ts', '.js'],
    excludePaths: [/node_modules/, /\.spec\.ts$/]
  },
  {
    id: 'prototype-pollution',
    description: 'Bracket notation assignment with dynamic key — prototype pollution risk',
    severity: 'warning',
    // A member access (`obj[key] =`), so the `[` follows a name, `]` or `)`, and an assignment,
    // so not `==` or `===`. Until 2026-10-24 the `[` could follow anything, and the array
    // destructuring `const [keys, counts] = …` was reported as bracket assignment in Gantry and
    // Weaver. The archetype's fix (quasar-project-template b92f93c); `PATTERN_CASES` pins both halves.
    pattern: /[\w$\])]\[\s*(req\.(params|query|body)\.|input|key|prop)\s*[^\]]*\]\s*=(?!=)/,
    extensions: ['.ts', '.js'],
    excludePaths: [/node_modules/, /\.spec\.ts$/]
  },
  {
    id: 'insecure-random',
    description: 'Math.random() used for security-sensitive operation — use crypto.randomUUID()',
    severity: 'warning',
    pattern: /Math\.random\(\)/,
    extensions: ['.ts', '.js'],
    excludePatterns: [/mock|demo|sample|test|color|animation|delay|jitter/i],
    excludePaths: [/node_modules/, /\.spec\.ts$/, /mock/]
  }
]

/**
 * The rules that hunt for credentials, as opposed to code shapes.
 *
 * The distinction is load-bearing in exactly one place: this scanner's own rule table
 * necessarily CONTAINS every pattern it hunts for (`Math.random()`, `eval(`, …), so the
 * code-pattern rules match their own definitions and report the scanner as vulnerable. Those
 * rules therefore skip this file.
 *
 * The SECRET rules deliberately do NOT skip it. A scanner can hold a hardcoded credential
 * exactly like any other file — and this one did: an earlier draft of the comment above
 * quoted the real leaked passwords verbatim to explain what the old rule missed, and these
 * rules caught it. Exempting the scanner wholesale would have hidden that.
 */
const SECRET_RULE_IDS = new Set([
  'hardcoded-secret',
  'hardcoded-secret-unquoted',
  'secret-file-content',
  'known-secret-format'
])

/**
 * The first match on `line` that the rule's validator accepts. EVERY match is tried.
 *
 * This used `line.match(rule.pattern)`, which returns the FIRST match only, and a validator that
 * rejected it ended the line. So `<connection host="db.example" password="…"/>` passed clean:
 * `host=` matched first, was not credential-shaped, and the password beside it was never judged.
 * XML puts several attributes on a line as a matter of course. Found 2026-10-01, when a corpus
 * case for an exemption could not fail because the line's first attribute shadowed the second.
 */
function firstFinding(rule: Rule, line: string, nearby: string = line): RegExpMatchArray | null {
  // Not `matchAll`: its matches never overlap, so a match `validate` rejected swallowed every match
  // that began inside it. In `echo 'host:' x; DB_PASSWORD='…'` the rejected `host` match runs from
  // the first quote to the third, and the assignment inside it was never tried (2026-10-02).
  //
  // After a rejection the scan resumes past the quote and identifier the match began on, never
  // inside them. One character on was tried first and failed its corpus: a rejected
  // `publicKeyToken` was retried as `ublicKeyToken`, a name no exemption covers.
  const flags = rule.pattern.flags.includes('g') ? rule.pattern.flags : `${rule.pattern.flags}g`
  const re = new RegExp(rule.pattern.source, flags)
  for (let m = re.exec(line); m; m = re.exec(line)) {
    if (!rule.validate || rule.validate(m, line, nearby)) return m
    const began = /^["']?[\w$-]*/.exec(line.slice(m.index))![0].length
    re.lastIndex = m.index + Math.max(1, began)
  }
  return null
}

/**
 * `'setPasswordLinkHours:' /srv/app/policy.ts … '…'` is a quoted STRING that ends in a colon, not an
 * assignment: the quote after the colon closes the string the key began in. The assignment branch
 * read it as a key and a quoted value, and flagged prose as a credential (Gantry, 2026-10-02: a
 * handoff's grep pattern for a setting that holds a number of hours). So a key that a quote opens,
 * with no closing quote of its own before the separator, where the separator is followed by that
 * same quote, is inside a string. A properly quoted key (`'password': '…'`) and a different quote
 * (`'PASS="…"'`, an assignment inside a shell string) both stay findings; the corpus pins both.
 */
function keyInsideQuotedString(m: RegExpMatchArray, line: string): boolean {
  const key = m[3]
  if (key === undefined || m.index === undefined) return false
  const keyStart = m.index + m[0].indexOf(key)
  const open = line[keyStart - 1]
  if (open !== '"' && open !== "'") return false
  const after = /^(["']?)\s*(?:=>|[:=])\s*(["'])/.exec(line.slice(keyStart + key.length))
  return after !== null && after[1] !== open && after[2] === open
}
const SELF = /scripts\/audit-sast\.ts$/

function walkDir(dir: string, extensions: string[]): string[] {
  const files: string[] = []
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry)
    if (
      entry === 'node_modules' ||
      entry === 'dist' ||
      entry === '.stryker-tmp' ||
      entry === 'coverage'
    )
      continue
    const stat = statSync(fullPath)
    if (stat.isDirectory()) {
      files.push(...walkDir(fullPath, extensions))
    } else if (extensions.includes(extname(entry))) {
      files.push(fullPath)
    }
  }
  return files
}

/**
 * Suppression, with the reason REQUIRED:
 *
 *     // sast-ignore[hardcoded-secret]: <why this is not a real finding>
 *
 * where `suppressedAt` reads it: the offending line, the comment block or line above it, or above
 * the opening tag of the element it sits in. ~/.claude/rules/never-game-auditors.md already
 * * names this convention and calls a bare `sast-ignore[rule-id]` — one with no justification —
 * a form of gaming. It was never actually implemented, which is worse than it sounds: with no
 * legitimate way past a false positive, the only escape is to reword the code until the regex
 * stops matching, which is precisely the behaviour that rule forbids. The pattern below will
 * not match without a reason, so a bare suppression cannot be committed.
 */
function suppressionFor(ruleId: string): RegExp {
  const id = ruleId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`sast-ignore\\[${id}\\]:\\s*\\S+`, 'i')
}

/**
 * Whether the finding on `lines[i]` is suppressed: on its line or the one above, or, for a finding
 * on an attribute inside a tag that spans lines, on the tag's first line or the one above it. A
 * template element writes its attributes one per line, and no comment can sit inside a tag, so
 * until 2026-10-24 a `v-html` in such an element had no way to be suppressed at all. Measured in
 * Qepton, where both of a gist preview's reasoned `v-html` suppressions sat above their element and
 * were not read. A reason written over a comment block directly above counts too, wherever in the
 * block the marker is: Weaver's `microvm.ts` explains two in four lines. `SUPPRESSION_CASES` pins it.
 */
function suppressedAt(lines: readonly string[], i: number, suppression: RegExp): boolean {
  if (suppression.test(lines[i]!) || (i > 0 && suppression.test(lines[i - 1]!))) return true
  // The comment block directly above, line by line, until a line that is not a comment.
  for (let k = i - 1; k >= 0 && /^\s*(\/\/|\/?\*|<!--|#)/.test(lines[k]!); k--) {
    if (suppression.test(lines[k]!)) return true
  }
  // Up from the finding to the line its tag opens on, never past a line that closes a tag.
  for (let k = i - 1; k >= 0 && k >= i - 30; k--) {
    const above = lines[k]!
    if (/^\s*</.test(above) && !/>/.test(above.replace(/^\s*<[^\s>]*/, ''))) {
      return suppression.test(above) || (k > 0 && suppression.test(lines[k - 1]!))
    }
    if (/>/.test(above)) return false
  }
  return false
}

/** Paired cases for `suppressedAt`, asserted in selfTest. */
const SUPPRESSION_CASES: { lines: string[]; at: number; suppressed: boolean; why: string }[] = [
  {
    why: 'the line above the finding',
    lines: ['// sast-ignore[v-html-xss]: escaped upstream', 'x.innerHTML = y'],
    at: 1,
    suppressed: true
  },
  {
    why: 'a reason written over the comment block directly above',
    lines: [
      '    // sast-ignore[v-html-xss]: `html` is escaped by highlight(), which',
      '    // reads every character of the source and writes none of it raw, so',
      '    // nothing a user types reaches this element as markup.',
      '    el.innerHTML = html'
    ],
    at: 3,
    suppressed: true
  },
  {
    why: 'a comment block that code separates from the finding does not reach it',
    lines: [
      '// sast-ignore[v-html-xss]: about the next line only',
      'a.innerHTML = escaped',
      'b.innerHTML = untrusted'
    ],
    at: 2,
    suppressed: false
  },
  {
    why: 'above the opening tag of a multi-line element',
    lines: [
      '<!-- sast-ignore[v-html-xss]: markdown-it with html:false -->',
      '<div',
      '  v-if="shown"',
      '  class="preview"',
      '  v-html="rendered"',
      '/>'
    ],
    at: 4,
    suppressed: true
  },
  {
    why: 'a bare suppression, with no reason, never counts',
    lines: ['<!-- sast-ignore[v-html-xss] -->', '<div', '  v-html="rendered"', '/>'],
    at: 2,
    suppressed: false
  },
  {
    why: "an earlier element's suppression does not reach past where that element closes",
    lines: [
      '<!-- sast-ignore[v-html-xss]: the first one is escaped -->',
      '<div',
      '  v-html="first"',
      '/>',
      '<div v-html="second" />'
    ],
    at: 4,
    suppressed: false
  }
]

/** The line and the three on either side: what a judgement such as isTokenizerPiece reads. */
function nearbyLines(lines: readonly string[], i: number): string {
  return lines.slice(Math.max(0, i - 3), i + 4).join('\n')
}

/**
 * A corpus line that holds several source lines, joined by RECORD_JOIN: the first is the line
 * judged and the rest follow it, read through nearbyLines as the scan reads a file. For a
 * judgement a neighbouring line decides (isTokenizerPiece). Not `\n`, which corpus lines already
 * contain as text.
 */
const RECORD_JOIN = ' ⏎ '

function scanFile(filePath: string, rule: Rule, reportBase: string): Finding[] {
  const relPath = relative(reportBase, filePath)

  if (rule.excludePaths?.some(p => p.test(relPath))) return []

  // Code-pattern rules skip this scanner's own source (its rule table contains the patterns
  // it hunts for). Secret rules do not — see SECRET_RULE_IDS.
  if (SELF.test(relPath) && !SECRET_RULE_IDS.has(rule.id)) return []

  const content = readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')
  const findings: Finding[] = []
  const suppression = suppressionFor(rule.id)

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (rule.excludePatterns?.some(p => p.test(line))) continue
    const match = firstFinding(rule, line, nearbyLines(lines, i))
    if (!match) continue

    // Suppressed on this line or the one above, or above its tag (`suppressedAt`), and only WITH a
    // stated reason.
    if (suppressedAt(lines, i, suppression)) continue

    // NEVER echo a secret into CI logs — that just relocates the leak. Report the identifier
    // and the location, which is everything a human needs to go fix it, and nothing an
    // attacker reading a build log can use. (The first cut of this redacted the KEY and
    // printed the VALUE, which is precisely backwards.) Every secret rule, read from
    // SECRET_RULE_IDS: until 2026-11-22 this named two of them, so a hardcoded-secret-unquoted
    // finding printed its line, value and all.
    const isSecretRule = SECRET_RULE_IDS.has(rule.id)
    const secretKey = match[1] ?? match[3] ?? ''

    findings.push({
      rule: rule.id,
      severity: rule.severity,
      file: relPath,
      line: i + 1,
      match: isSecretRule
        ? secretKey
          ? `${secretKey} = [REDACTED]`
          : '[REDACTED credential]'
        : line.trim().substring(0, 120)
    })
  }

  return findings
}

/**
 * Prove the secret rules still work, BEFORE trusting them to scan anything.
 *
 * This is the control that the old rule lacked, and its absence is the whole story: a rule
 * with no test only ever tells you it found nothing. It never tells you it CANNOT find
 * anything. That rule sat green in this chain while blind to a production password that was
 * being served on the open internet.
 *
 * Corpus: scripts/fixtures/sast-secret-corpus.txt (synthetic values, real shapes). If a
 * MUST-CATCH line stops matching or a MUST-IGNORE line starts, this exits non-zero and says
 * so, rather than scanning the repo and reporting a clean bill of health it cannot back up.
 */
/**
 * Paired cases for the code-pattern rules, asserted beside the secret corpus. The secret corpus is
 * a contract shared byte-identical across repos; these rules are each repo's own, so their cases
 * live with them. Each half was measured: the IGNORE lines are what the rule wrongly reported.
 */
const PATTERN_CASES: { rule: string; catch: string[]; ignore: string[] }[] = [
  {
    rule: 'prototype-pollution',
    catch: [
      'out[key] = toJsonSchema(value)',
      ';(node as Record<string, unknown>)[key] = value',
      'target[req.body.name] = value',
      'alias[key.slice(0, -2)] = join(base, target)'
    ],
    ignore: [
      'const [keys, counts] = await Promise.all([keysOf(a), counts(ids)])',
      'const [key, value] = line.trim().split(/\\s+/)',
      'if (seen[key] === value) return',
      'if (cache[key] == null) return'
    ]
  }
]

function selfTest(): void {
  const corpusPath = join(SCRIPT_DIR, 'fixtures', 'sast-secret-corpus.txt')
  let corpus: string
  try {
    corpus = readFileSync(corpusPath, 'utf-8')
  } catch {
    console.error('\n  ✗ SAST self-test corpus missing: scripts/fixtures/sast-secret-corpus.txt')
    console.error('    The secret rules are unverified — refusing to report a clean scan.\n')
    process.exit(1)
  }

  const secretRules = rules.filter(r => SECRET_RULE_IDS.has(r.id))
  const failures: string[] = []
  let catches = 0
  let ignores = 0

  for (const raw of corpus.split('\n')) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue

    // `CATCH <line>` is judged by every secret rule. `CATCH[.nix] <line>` is judged only by the
    // rules that read .nix files, which is how the corpus pins a rule that one format must not
    // apply (in Nix, `password = config.x;` is an expression, so the whole-line unquoted shape is
    // not run there). A line in neither form used to be skipped without a word, so a misspelt
    // directive dropped its case from the contract unnoticed; it now fails the self-test.
    const directive = /^(CATCH|IGNORE)(?:\[(\.[a-z0-9]+)\])? ([\s\S]*)$/.exec(line)
    if (!directive) {
      failures.push(`UNREADABLE CORPUS LINE: ${line}`)
      continue
    }
    const expectCatch = directive[1] === 'CATCH'
    const expectIgnore = !expectCatch
    if (expectCatch) catches++
    else ignores++

    const subject = directive[3]!
    const format = directive[2]
    const judges = format ? secretRules.filter(r => r.extensions.includes(format)) : secretRules
    if (judges.length === 0) failures.push(`NO SECRET RULE READS ${format}:  ${subject}`)
    const record = subject.split(RECORD_JOIN)
    const judged = record[0]!
    // The scan's own path, `firstFinding` with `nearbyLines`, so the corpus tests what the scan
    // actually does.
    const caught = judges.some(
      rule =>
        !rule.excludePatterns?.some(p => p.test(judged)) &&
        firstFinding(rule, judged, nearbyLines(record, 0)) !== null
    )

    if (expectCatch && !caught) failures.push(`MISSED (should catch):  ${subject}`)
    if (expectIgnore && caught) failures.push(`FALSE POSITIVE:         ${subject}`)
  }

  for (const c of SUPPRESSION_CASES) {
    if (c.suppressed) catches++
    else ignores++
    if (suppressedAt(c.lines, c.at, suppressionFor('v-html-xss')) !== c.suppressed) {
      failures.push(`SUPPRESSION ${c.suppressed ? 'MISSED' : 'WRONGLY READ'}: ${c.why}`)
    }
  }

  for (const c of PATTERN_CASES) {
    const rule = rules.find(r => r.id === c.rule)
    if (!rule) {
      failures.push(`NO SUCH RULE:           ${c.rule}`)
      continue
    }
    for (const subject of c.catch) {
      catches++
      if (firstFinding(rule, subject) === null) failures.push(`MISSED [${c.rule}]:  ${subject}`)
    }
    for (const subject of c.ignore) {
      ignores++
      if (firstFinding(rule, subject) !== null)
        failures.push(`FALSE POSITIVE [${c.rule}]: ${subject}`)
    }
  }

  if (failures.length > 0) {
    console.error(
      `\n  ✗ SAST secret rules FAILED their own regression corpus (${failures.length}):\n`
    )
    for (const f of failures) console.error(`    ${f}`)
    console.error('\n  The secret rules are broken. A clean scan from here would be meaningless.')
    console.error('  Fix scripts/audit-sast.ts — do not weaken the corpus.\n')
    process.exit(1)
  }
  // The corpus already gated this run; this line makes BOTH halves visible so
  // audit:auditor-contracts can see them rather than trust they exist.
  console.log(`  auditor-contract: catch=${catches} ignore=${ignores}`)
}

/**
 * Every file git tracks in the repository that `dir` is in, as absolute paths: the universe the
 * secret rules scan, because it is exactly what a push publishes. Symlinks, submodules and files
 * deleted from the working tree are left out, since none has content of its own here to read.
 *
 * Refuses when git cannot list them. A scan of an unknown file set that came back clean would be
 * reporting on nothing, and that is the failure this whole rule set exists to stop.
 */
function trackedFiles(dir: string): string[] {
  let top: string
  let listing: string
  try {
    top = execFileSync('git', ['-C', dir, 'rev-parse', '--show-toplevel'], {
      encoding: 'utf-8'
    }).trim()
    listing = execFileSync('git', ['-C', top, 'ls-files', '-z'], {
      encoding: 'utf-8',
      maxBuffer: 256 * 1024 * 1024
    })
  } catch {
    console.error(`\n  ✗ SAST: git cannot list the files tracked in ${dir}.`)
    console.error(
      '    The secret rules scan every tracked file; with no list, a clean scan would mean'
    )
    console.error('    nothing. Run it from a git checkout.\n')
    process.exit(1)
  }
  return listing
    .split('\0')
    .filter(Boolean)
    .map(p => join(top, p))
    .filter(p => {
      try {
        return lstatSync(p).isFile()
      } catch {
        return false
      }
    })
}

/**
 * `--repo <absolute path>`: scan ANOTHER repository's tracked files with the secret rules only.
 * The code-pattern rules are this archetype's own and read its src/; the secret rules are the
 * portfolio's contract and apply to any repository. king's NixOS config runs this from its
 * pre-push (`/home/mark/etc`), the way it already reads anvil's checkout for its host list.
 */
function repoArgument(argv: readonly string[]): string | null {
  const at = argv.indexOf('--repo')
  if (at === -1) return null
  const repo = argv[at + 1]
  if (!repo || !isAbsolute(repo)) {
    console.error('\n  ✗ SAST: --repo needs an absolute path to a git checkout.\n')
    process.exit(2)
  }
  return repo
}

function main() {
  selfTest()

  const rootDir = process.cwd()
  const otherRepo = repoArgument(process.argv.slice(2))

  // The scan is RULE-AWARE, and the distinction is deliberate:
  //
  //   SECRET rules scan EVERY TRACKED FILE in the repository (`trackedFiles`), whatever directory it
  //   is in. Credentials hide in test helpers, migration scripts, config and the webroot, and in
  //   the codebase where this was proven against real leaks every one lived outside src/. The scan
  //   then grew one directory at a time: scripts/, config/ and tests/, then testing/ and the
  //   repository's .github (2026-10-01), each added after something was found where nobody looked.
  //   Measured 2026-11-22, that list still missed about half of every repository's scannable files:
  //   332 of 561 here, 744 of 1501 in Weaver, 503 of 1572 in Gantry and 204 of 409 in Qepton,
  //   among them code/nixos/, every repo-root scripts/ and .claude/hooks/. A list of directories is
  //   a claim about where secrets are; what git tracks is what a push publishes.
  //
  //   CODE-PATTERN rules (command-injection, xss, …) scan only app code (src, backend/src).
  //   They target attacker-reachable server/client code. Pointing them at scripts/ floods the
  //   report with build-tool calls — `execSync(\`git ${cmd}\`)`, `execSync(\`npm ls ${pkg}\`)` —
  //   that exec internal, non-attacker-controlled values. That noise trains people to ignore the
  //   auditor, and widening these rules' scope was never the goal; finding secrets was.
  //
  // Ported from Weaver 2026-08-21, where it was already proven. Before it, this scaffold's own
  // compliance auditors tripped command-injection on their own `npm ls` calls — a rule firing on
  // legitimate input, which is the state in which a rule gets switched off.
  const asDirs = (names: string[]) =>
    names
      .map(d => join(rootDir, d))
      .filter(d => {
        try {
          return statSync(d).isDirectory()
        } catch {
          return false
        }
      })
  const NARROW = otherRepo ? [] : asDirs(['src', 'backend/src'])

  const allExtensions = [...new Set(rules.flatMap(r => r.extensions))]
  const narrowFiles = NARROW.flatMap(d => walkDir(d, allExtensions))
  const wideFiles = trackedFiles(otherRepo ?? rootDir).filter(f =>
    allExtensions.includes(extname(f))
  )
  // Findings name a file relative to the repository scanned with --repo, and to the code directory
  // otherwise, as they always have.
  const reportBase = otherRepo ?? rootDir

  const findings: Finding[] = []
  for (const rule of rules) {
    if (otherRepo && !SECRET_RULE_IDS.has(rule.id)) continue
    const pool = SECRET_RULE_IDS.has(rule.id) ? wideFiles : narrowFiles
    const relevantFiles = pool.filter(f => rule.extensions.includes(extname(f)))
    for (const file of relevantFiles) {
      findings.push(...scanFile(file, rule, reportBase))
    }
  }

  const errors = findings.filter(f => f.severity === 'error')
  const warnings = findings.filter(f => f.severity === 'warning')

  const scannedCount = new Set([...narrowFiles, ...wideFiles]).size
  console.log(`\n  SAST Scan — ${scannedCount} files, ${rules.length} rules\n`)

  if (findings.length === 0) {
    console.log('  ✓ No security findings\n')
    process.exit(0)
  }

  if (errors.length > 0) {
    console.log(`  ERRORS (${errors.length}):\n`)
    for (const f of errors) {
      console.log(`    ✗ [${f.rule}] ${f.file}:${f.line}`)
      console.log(`      ${f.match}\n`)
    }
  }

  if (warnings.length > 0) {
    console.log(`  WARNINGS (${warnings.length}):\n`)
    for (const f of warnings) {
      console.log(`    ⚠ [${f.rule}] ${f.file}:${f.line}`)
      console.log(`      ${f.match}\n`)
    }
  }

  console.log(`  Summary: ${errors.length} errors, ${warnings.length} warnings\n`)

  if (errors.length > 0) {
    process.exit(1)
  }
}

main()
