/**
 * Global Setup for E2E Tests
 * Validates GitHub API accessibility and token before running any tests
 */

import { execFileSync } from 'child_process'

/**
 * Check if GitHub API is accessible (health check)
 * This validates that network connectivity and GitHub services are available
 */
function checkGitHubApiHealth(): boolean {
  console.log('Step 1: Checking GitHub API accessibility...')

  try {
    const result = execFileSync('curl', ['-s', '-w', '\n%{http_code}', 'https://api.github.com'], {
      encoding: 'utf-8',
      timeout: 15000
    })

    const lines = result.trim().split('\n')
    const httpCode = lines.pop()

    if (httpCode === '200') {
      console.log('  ✓ GitHub API is accessible')
      return true
    } else {
      console.error(`  ✗ GitHub API returned HTTP ${httpCode}`)
      return false
    }
  } catch (error) {
    console.error('  ✗ Failed to reach GitHub API')
    if (error instanceof Error) {
      if (error.message.includes('ETIMEDOUT') || error.message.includes('timeout')) {
        console.error('    Network timeout - check your internet connection')
      } else {
        console.error(`    ${error.message}`)
      }
    }
    return false
  }
}

/**
 * Check if GitHub OAuth endpoint is accessible
 * This validates OAuth infrastructure is available (even though OAuth is disabled in web UI)
 */
function checkOAuthEndpoint(): boolean {
  console.log('Step 2: Checking GitHub OAuth endpoint...')

  try {
    const result = execFileSync(
      'curl',
      ['-s', '-w', '\n%{http_code}', '-o', '/dev/null', 'https://github.com/login/oauth/authorize'],
      { encoding: 'utf-8', timeout: 15000 }
    )

    const httpCode = result.trim()

    // OAuth authorize page returns 200 (shows login) or 302 (redirect to login)
    if (httpCode === '200' || httpCode === '302') {
      console.log('  ✓ GitHub OAuth endpoint is accessible')
      return true
    } else {
      console.error(`  ✗ GitHub OAuth returned HTTP ${httpCode}`)
      return false
    }
  } catch (error) {
    console.error('  ✗ Failed to reach GitHub OAuth endpoint')
    if (error instanceof Error) {
      console.error(`    ${error.message}`)
    }
    return false
  }
}

async function globalSetup() {
  const token = process.env.GITHUB_TEST_TOKEN

  console.log('\n========================================')
  console.log('E2E Test Setup: Pre-flight Checks')
  console.log('========================================\n')

  // Step 1: Check GitHub API health
  if (!checkGitHubApiHealth()) {
    console.error('')
    console.error('ERROR: Cannot reach GitHub API.')
    console.error('Please check your network connection and try again.')
    console.error('')
    process.exit(1)
  }

  // Step 2: Check OAuth endpoint accessibility
  if (!checkOAuthEndpoint()) {
    console.error('')
    console.error('WARNING: GitHub OAuth endpoint not accessible.')
    console.error('OAuth login tests may fail, but token login should work.')
    console.error('')
    // Don't exit - OAuth is disabled anyway, just warn
  }

  console.log('')
  console.log('Step 3: Validating GitHub token...')

  // Check if token is provided
  if (!token) {
    console.error('  ✗ GITHUB_TEST_TOKEN environment variable is not set.')
    console.error('')
    console.error('To fix this:')
    console.error(
      '  1. Generate a token at: https://github.com/settings/tokens/new?scopes=gist&description=Qepton'
    )
    console.error('  2. Set the environment variable:')
    console.error('     export GITHUB_TEST_TOKEN=ghp_your_token_here')
    console.error('')
    console.error('  Or add it to e2e-docker/.env file:')
    console.error('     GITHUB_TEST_TOKEN=ghp_your_token_here')
    console.error('')
    process.exit(1)
  }

  // Validate token format
  if (!token.startsWith('ghp_') && !token.startsWith('github_pat_')) {
    console.error('  ✗ GITHUB_TEST_TOKEN has invalid format.')
    console.error('')
    console.error('GitHub tokens should start with "ghp_" or "github_pat_"')
    console.error(`Your token starts with: "${token.substring(0, 4)}..."`)
    console.error('')
    process.exit(1)
  }

  // Validate token with GitHub API using curl
  try {
    const result = execFileSync(
      'curl',
      ['-s', '-w', '\n%{http_code}', '-H', `Authorization: token ${token}`, 'https://api.github.com/user'],
      { encoding: 'utf-8', timeout: 30000 }
    )

    const lines = result.trim().split('\n')
    const httpCode = lines.pop()
    const body = lines.join('\n')

    if (httpCode !== '200') {
      let parsed: { message?: string } = {}
      try {
        parsed = JSON.parse(body)
      } catch {
        // ignore parse error
      }

      console.error(`  ✗ Token validation failed (HTTP ${httpCode})`)
      console.error('')

      if (httpCode === '401') {
        console.error('The token is invalid or has been revoked.')
        console.error('')
        console.error('To fix this:')
        console.error(
          '  1. Generate a new token at: https://github.com/settings/tokens/new?scopes=gist&description=Qepton'
        )
        console.error('  2. Update GITHUB_TEST_TOKEN with the new token')
      } else if (httpCode === '403') {
        console.error('The token does not have sufficient permissions or rate limit exceeded.')
        console.error(`Message: ${parsed.message || 'Unknown error'}`)
      } else {
        console.error(`Message: ${parsed.message || body}`)
      }
      console.error('')
      process.exit(1)
    }

    // Token is valid - show user info
    const user = JSON.parse(body)
    console.log(`  ✓ Token valid for user: ${user.login}`)
    console.log(`    Public gists: ${user.public_gists}`)
    console.log('')
    console.log('========================================')
    console.log('All pre-flight checks passed!')
    console.log('Proceeding with E2E tests...')
    console.log('========================================\n')
  } catch (error) {
    console.error('  ✗ Failed to validate token')
    console.error('')
    if (error instanceof Error) {
      if (error.message.includes('ETIMEDOUT') || error.message.includes('timeout')) {
        console.error('Request timed out. Check your network connection.')
      } else {
        console.error(`Error: ${error.message}`)
      }
    }
    console.error('')
    process.exit(1)
  }
}

export default globalSetup
