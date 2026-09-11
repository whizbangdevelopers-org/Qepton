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

import { readFileSync, readdirSync, statSync } from 'fs'
import { join, relative, extname, dirname } from 'path'
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
   * and tested.
   */
  validate?: (match: RegExpMatchArray, line: string) => boolean
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
  /(?:api[-_]?key|secret|password|passwd|pwd|pass|token|credential|auth[-_]?key|private[-_]?key|access[-_]?key)/i

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
const ENV_VAR_NAME_HOLDER = /(?:_env|_env_var|_var|_var_name|_env_name|_key_name)$/i
const ENV_VAR_NAME_VALUE = /^[A-Z][A-Z0-9_]{2,}$/

/** Values that are the CORRECT thing to commit — templates, not secrets. */
const PLACEHOLDER_VALUE =
  /^(?:CHANGE_ME|CHANGEME|REPLACE_ME|TODO|TBD|<.*>|\{\{?.*\}?\}|\$\{.*\}|x{3,}|\*{3,}|your[-_]|example|dummy|redacted|\.{3})/i

/**
 * Human prose in ANY language — letters, spaces, light punctuation, nothing else.
 * \p{L} rather than A-Za-z on purpose: an earlier cut of this logic called the Spanish
 * translation 'password' => 'Contraseña' a secret, because it counted ñ as a symbol.
 * A credential carries entropy; a word does not, whatever alphabet it is written in.
 */
const PROSE_VALUE = /^[\p{L}\s'’.,!?()/-]+$/u

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
  if (PROSE_VALUE.test(value)) return false
  return /[^\p{L}]/u.test(value) || value.length >= 16
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
    //
    // The attribute form is FIRST on purpose. Alternation is ordered, and on an XML line the
    // assignment branch happily matches name="TEST_DB_PASS" — key `name`, which is not
    // secret-shaped — and the finding is discarded before the attribute branch is ever tried.
    // That silently reinstated the exact miss this rule exists to prevent.
    //
    // No 20-char minimum and no alphanumeric-only class — those two limits are what made the
    // previous rule blind to a live production password.
    pattern:
      /(?:name\s*=\s*["']([^"'\n]+)["']\s+value\s*=\s*["']([^"'\n]{6,})["']|["']?([A-Za-z_$][\w$-]*)["']?\s*(?:=>|[:=])\s*["']([^"'\n]{6,})["'])/i,
    // .php/.xml/.yml/.env/.sh matter: the DemoCRM leak lived in .php and phpunit.xml, and
    // a rule that only reads the languages you like is not a control.
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
      '.conf'
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
    validate: m => {
      const key = m[1] ?? m[3] ?? ''
      const value = m[2] ?? m[4] ?? ''
      if (!SECRET_NAME.test(key)) return false // not a credential-shaped name at all
      if (UI_STRING_NAME.test(key)) return false // $label_password = "Password"
      // PASSWORD_FILE=/run/secrets/… and accessTokenUrl = 'https://…/access_token' name a LOCATION —
      // unless the value is a URL that carries the credential itself.
      if (
        (SECRET_LOCATION_NAME.test(key) || SECRET_LOCATION_NAME_CAMEL.test(key)) &&
        !URL_CARRIES_CREDENTIAL.test(value)
      )
        return false
      // TOKEN_ENV = 'APP_GITHUB_TOKEN' — the NAME of the variable, not its value. Same class.
      if (ENV_VAR_NAME_HOLDER.test(key) && ENV_VAR_NAME_VALUE.test(value)) return false
      if (/^[./~]|^[A-Za-z]:[\\/]/.test(value)) return false // the value is a path, not a secret
      if (/^test_/i.test(value)) return false // fixture logins, not credentials
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
      return isCredentialValue(value)
    }
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
      '.md'
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
    pattern: /\[\s*(req\.(params|query|body)\.|input|key|prop)\s*[^\]]*\]\s*=/,
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
 * The two rules that hunt for credentials, as opposed to code shapes.
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
const SECRET_RULE_IDS = new Set(['hardcoded-secret', 'known-secret-format'])
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
 * on the offending line or the one above it. ~/.claude/rules/never-game-auditors.md already
 * names this convention and calls a bare `sast-ignore[rule-id]` — one with no justification —
 * a form of gaming. It was never actually implemented, which is worse than it sounds: with no
 * legitimate way past a false positive, the only escape is to reword the code until the regex
 * stops matching, which is precisely the behaviour that rule forbids. The pattern below will
 * not match without a reason, so a bare suppression cannot be committed.
 */
function suppressionFor(ruleId: string): RegExp {
  const id = ruleId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`sast-ignore\\[${id}\\]:\\s*\\S+`, 'i')
}

function scanFile(filePath: string, rule: Rule): Finding[] {
  const relPath = relative(process.cwd(), filePath)

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

    const match = line.match(rule.pattern)
    if (!match) continue
    if (rule.excludePatterns?.some(p => p.test(line))) continue
    if (rule.validate && !rule.validate(match, line)) continue

    // Suppressed on this line or the one above — and only WITH a stated reason.
    if (suppression.test(line) || (i > 0 && suppression.test(lines[i - 1]))) continue

    // NEVER echo a secret into CI logs — that just relocates the leak. Report the identifier
    // and the location, which is everything a human needs to go fix it, and nothing an
    // attacker reading a build log can use. (The first cut of this redacted the KEY and
    // printed the VALUE, which is precisely backwards.)
    const isSecretRule = rule.id === 'hardcoded-secret' || rule.id === 'known-secret-format'
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

    const expectCatch = line.startsWith('CATCH ')
    const expectIgnore = line.startsWith('IGNORE ')
    if (!expectCatch && !expectIgnore) continue
    if (expectCatch) catches++
    else ignores++

    const subject = line.slice(line.indexOf(' ') + 1)
    const caught = secretRules.some(rule => {
      const m = subject.match(rule.pattern)
      if (!m) return false
      if (rule.excludePatterns?.some(p => p.test(subject))) return false
      if (rule.validate && !rule.validate(m, subject)) return false
      return true
    })

    if (expectCatch && !caught) failures.push(`MISSED (should catch):  ${subject}`)
    if (expectIgnore && caught) failures.push(`FALSE POSITIVE:         ${subject}`)
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

function main() {
  selfTest()

  const rootDir = process.cwd()

  // scripts/, config/ and tests/ are scanned too. The previous list was ['src', 'backend/src'],
  // and in the codebase where this was proven against real leaks, EVERY hardcoded credential
  // lived outside those two directories — in test helpers, migration scripts, config and the
  // webroot. A scanner pointed only at the tidy directories reports clean because it is not
  // looking, which is the most expensive kind of green.
  //
  // The scan is RULE-AWARE, and the distinction is deliberate:
  //
  //   SECRET rules scan WIDE. Credentials hide in test helpers, migration scripts, config and
  //   the webroot — that is the entire lesson above. Narrow scanning is how the old rule stayed
  //   blind.
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
  const NARROW = asDirs(['src', 'backend/src'])
  const WIDE = asDirs(['src', 'backend/src', 'scripts', 'config', 'tests', 'test', 'public'])

  const allExtensions = [...new Set(rules.flatMap(r => r.extensions))]
  const narrowFiles = NARROW.flatMap(d => walkDir(d, allExtensions))
  const wideFiles = WIDE.flatMap(d => walkDir(d, allExtensions))

  // Root-level config files (.env, phpunit.xml, docker-compose.yml …) are where credentials
  // most often sit, and they are in no directory at all — so the WIDE (secret) scan includes them.
  for (const entry of readdirSync(rootDir)) {
    const full = join(rootDir, entry)
    try {
      if (statSync(full).isFile() && allExtensions.includes(extname(entry))) wideFiles.push(full)
    } catch {
      /* unreadable — skip */
    }
  }

  const findings: Finding[] = []
  for (const rule of rules) {
    const pool = SECRET_RULE_IDS.has(rule.id) ? wideFiles : narrowFiles
    const relevantFiles = pool.filter(f => rule.extensions.includes(extname(f)))
    for (const file of relevantFiles) {
      findings.push(...scanFile(file, rule))
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
