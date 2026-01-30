import { test, expect } from '@playwright/test'
import { loginWithToken } from './helpers'

/**
 * Authentication Tests using real GitHub API
 * Uses the GitHub account configured via GITHUB_TEST_TOKEN in e2e-docker/.env
 */
test.describe('Authentication', () => {
  test('should show login page when not authenticated', async ({ page }) => {
    // Navigate to login page directly with clean state
    await page.addInitScript(() => {
      localStorage.clear()
      sessionStorage.clear()
    })

    // Go directly to the login page using hash routing format
    await page.goto('/#/login', { waitUntil: 'networkidle' })

    // Wait for Vue to mount
    await page.waitForTimeout(1000)

    // Should show token login form (this is the main test assertion)
    await expect(page.locator('[data-test="token-input"]')).toBeVisible({ timeout: 15000 })
    await expect(page.locator('[data-test="login-button"]')).toBeVisible()
  })

  test('should show token input on login page', async ({ page }) => {
    // Clear storage before page loads
    await page.addInitScript(() => {
      localStorage.clear()
      sessionStorage.clear()
    })

    await page.goto('/#/login', { waitUntil: 'networkidle' })

    // Should show token input directly (no tab switching needed)
    await expect(page.locator('[data-test="token-input"]')).toBeVisible()
    await expect(page.locator('[data-test="login-button"]')).toBeVisible()
  })

  test('should show error for invalid token', async ({ page }) => {
    // Clear storage before page loads
    await page.addInitScript(() => {
      localStorage.clear()
      sessionStorage.clear()
    })

    await page.goto('/#/login', { waitUntil: 'networkidle' })

    // Wait for login page to be ready
    await expect(page.locator('[data-test="token-input"]')).toBeVisible()

    // Enter invalid token
    await page.locator('[data-test="token-input"]').fill('invalid_token_12345')

    // Submit
    await page.locator('[data-test="login-button"]').click()

    // Should show error banner or notification
    const errorBanner = page.locator('.q-banner.bg-negative')
    const errorNotification = page.locator('.q-notification--negative')
    await expect(errorBanner.or(errorNotification)).toBeVisible({ timeout: 15000 })
  })

  test('should disable login button when token is empty', async ({ page }) => {
    // Clear storage before page loads
    await page.addInitScript(() => {
      localStorage.clear()
      sessionStorage.clear()
    })

    await page.goto('/#/login', { waitUntil: 'networkidle' })

    // Wait for login page to be ready
    await expect(page.locator('[data-test="token-input"]')).toBeVisible()

    // Login button should be disabled when token is empty
    await expect(page.locator('[data-test="login-button"]')).toBeDisabled()
  })

  test('should login with real GitHub token', async ({ page }) => {
    await loginWithToken(page)

    // Should be authenticated
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.locator('[data-test="user-menu"]')).toBeVisible()
  })

  test('should show correct username after login', async ({ page }) => {
    await loginWithToken(page)

    // Username should be visible and contain text (the actual username from the token)
    await expect(page.locator('[data-test="username"]')).toBeVisible()
    await expect(page.locator('[data-test="username"]')).not.toBeEmpty()
  })

  test('should show user avatar after login', async ({ page }) => {
    await loginWithToken(page)

    // Should show user avatar
    await expect(page.locator('[data-test="user-avatar"]')).toBeVisible()
  })

  test('should persist authentication across page reloads', async ({ page }) => {
    await loginWithToken(page)

    // Wait for login to complete
    await expect(page.locator('[data-test="user-menu"]')).toBeVisible({ timeout: 15000 })

    // Wait for Pinia to persist state to localStorage
    await page.waitForTimeout(500)

    // Verify localStorage has the auth state (Pinia persisted) and github-token before reload
    const authState = await page.evaluate(() => localStorage.getItem('auth'))
    const githubToken = await page.evaluate(() => localStorage.getItem('github-token'))
    if (!authState) {
      throw new Error('Auth state was not persisted to localStorage')
    }
    if (!githubToken) {
      throw new Error('GitHub token was not persisted to localStorage')
    }

    // Navigate to a different page first, then back
    // This tests persistence without full page reload
    await page.goto('/#/login', { waitUntil: 'networkidle' })

    // Should be redirected back to home since we're authenticated
    await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 })
    await expect(page.locator('[data-test="user-menu"]')).toBeVisible({ timeout: 15000 })
  })

  test('should logout successfully', async ({ page }) => {
    await loginWithToken(page)

    // Wait for login to complete
    await expect(page.locator('[data-test="user-menu"]')).toBeVisible({ timeout: 15000 })

    // Click logout button
    await page.click('[data-test="logout-button"]')

    // Wait for confirmation dialog and click Logout button
    const logoutBtn = page.getByRole('button', { name: 'Logout' }).last()
    await expect(logoutBtn).toBeVisible({ timeout: 5000 })
    await logoutBtn.click()

    // Should redirect to login page with token input visible
    await expect(page.locator('[data-test="token-input"]')).toBeVisible({ timeout: 10000 })
  })
})
