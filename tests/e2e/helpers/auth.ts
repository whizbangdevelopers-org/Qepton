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

  // Clear storage first using addInitScript to ensure it runs before Vue loads
  await page.addInitScript(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  // Navigate to login using hash routing format with networkidle
  await page.goto('/#/login', { waitUntil: 'networkidle' })

  // Wait for Vue app to fully mount - check for the login form
  await expect(page.locator('[data-test="token-input"]')).toBeVisible({ timeout: 15000 })

  // Small delay to ensure Vue has fully hydrated
  await page.waitForTimeout(300)

  // Enter token using fill (which clears existing text first)
  await page.locator('[data-test="token-input"]').fill(token)

  // Wait a moment for the button to become enabled
  await expect(page.locator('[data-test="login-button"]')).toBeEnabled({ timeout: 5000 })

  // Click login button
  await page.locator('[data-test="login-button"]').click()

  // Wait for navigation to complete - either success or error
  // Success: user-menu appears (which contains the username)
  // Error: error banner appears while still on login page
  const successIndicator = page.locator('[data-test="user-menu"]')
  const errorIndicator = page.locator('.q-banner.bg-negative')

  // Wait with a generous timeout for the login API call to complete
  await expect(successIndicator.or(errorIndicator)).toBeVisible({ timeout: 45000 })

  // If error is shown, fail with descriptive message
  if (await errorIndicator.isVisible()) {
    const errorText = await errorIndicator.textContent()
    throw new Error(`Login failed: ${errorText}`)
  }

  // Wait for the main page to fully load (URL should not be login)
  await expect(page).not.toHaveURL(/\/login/, { timeout: 10000 })

  // Wait for network to settle after login (gist sync happens in background)
  await page.waitForLoadState('networkidle', { timeout: 30000 })
}

/**
 * Login with mock authentication for tests that don't need real GitHub access
 * Uses octocat as the mock user (GitHub's official sample user)
 */
export async function loginWithMock(page: Page): Promise<void> {
  // Set mock auth state in localStorage before navigating
  // Uses 'auth' key for Pinia persisted state
  await page.addInitScript(() => {
    localStorage.setItem(
      'auth',
      JSON.stringify({
        accessToken: 'mock_token_for_testing',
        user: {
          login: 'octocat',
          id: 583231,
          avatar_url: 'https://avatars.githubusercontent.com/u/583231?v=4',
          name: 'The Octocat'
        },
        isAuthenticated: true
      })
    )
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
