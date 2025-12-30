import { Page, expect } from '@playwright/test'

/**
 * Login with a GitHub personal access token
 * Uses GITHUB_TEST_TOKEN environment variable
 */
export async function loginWithToken(page: Page): Promise<void> {
  const token = process.env.GITHUB_TEST_TOKEN

  if (!token) {
    throw new Error('GITHUB_TEST_TOKEN environment variable is required for E2E tests')
  }

  // Navigate to login using hash routing format
  await page.goto('/#/login')

  // Clear all auth storage after page loads but before Vue hydrates
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  // Reload to get a fresh state without any persisted auth
  await page.reload()

  // Wait for login page to be ready
  await expect(page.locator('[data-test="token-input"]')).toBeVisible({ timeout: 10000 })

  // Enter token
  await page.fill('[data-test="token-input"]', token)

  // Submit
  await page.click('[data-test="login-button"]')

  // Wait for either:
  // 1. Username visible (success - redirected to main page)
  // 2. Error banner (failure - still on login page)
  const successIndicator = page.locator('[data-test="username"]')
  const errorIndicator = page.locator('.q-banner.bg-negative')

  // Race between success and error
  await expect(successIndicator.or(errorIndicator)).toBeVisible({ timeout: 30000 })

  // If error is shown, fail with descriptive message
  if (await errorIndicator.isVisible()) {
    const errorText = await errorIndicator.textContent()
    throw new Error(`Login failed: ${errorText}`)
  }

  // Verify we're on main page (hash route should be #/ not #/login)
  await expect(page).toHaveURL(/#\/$/)
}

/**
 * Login with mock authentication for tests that don't need real GitHub access
 * Uses octocat as the mock user (GitHub's official sample user)
 */
export async function loginWithMock(page: Page): Promise<void> {
  // Set mock auth state in localStorage before navigating
  // Uses 'auth' key for Pinia persisted state
  await page.addInitScript(() => {
    localStorage.setItem('auth', JSON.stringify({
      accessToken: 'mock_token_for_testing',
      user: {
        login: 'octocat',
        id: 583231,
        avatar_url: 'https://avatars.githubusercontent.com/u/583231?v=4',
        name: 'The Octocat'
      },
      isAuthenticated: true
    }))
    localStorage.setItem('github-token', 'mock_token_for_testing')
  })

  await page.goto('/')

  // Should be on main page, not login
  await expect(page).not.toHaveURL(/\/login/)
}

/**
 * Logout the current user
 */
export async function logout(page: Page): Promise<void> {
  // Open user menu
  await page.click('[data-test="user-menu"]')

  // Click logout
  await page.click('[data-test="logout-button"]')

  // Confirm logout if modal appears
  const confirmButton = page.locator('[data-test="confirm-logout"]')
  if (await confirmButton.isVisible()) {
    await confirmButton.click()
  }

  // Should redirect to login
  await expect(page).toHaveURL(/\/login/)
}

/**
 * Clear all stored authentication data
 * Uses addInitScript to clear storage before the page loads
 */
export async function clearAuth(page: Page): Promise<void> {
  await page.addInitScript(() => {
    // Clear Pinia persisted auth store
    localStorage.removeItem('auth')
    // Clear manually stored GitHub token
    localStorage.removeItem('github-token')
    sessionStorage.clear()
  })
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  const authData = await page.evaluate(() => {
    return localStorage.getItem('auth')
  })

  if (!authData) return false

  try {
    const parsed = JSON.parse(authData)
    return parsed.isAuthenticated === true
  } catch {
    return false
  }
}
