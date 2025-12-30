import { test, expect } from '@playwright/test'
import { loginWithToken } from './helpers'

/**
 * Authentication Tests using real GitHub API
 * Uses the wriver4-test account configured in e2e-docker/.env
 */
test.describe('Authentication', () => {

  test('should show login page when not authenticated', async ({ page }) => {
    // Clear any existing auth and go to home
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.removeItem('auth')
      localStorage.removeItem('github-token')
      sessionStorage.clear()
    })
    await page.reload()

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/)

    // Should show app branding
    await expect(page.locator('text=Qepton')).toBeVisible()

    // Should show token login form (OAuth is hidden)
    await expect(page.locator('[data-test="token-input"]')).toBeVisible()
    await expect(page.locator('[data-test="login-button"]')).toBeVisible()
  })

  test('should show token input on login page', async ({ page }) => {
    await page.goto('/#/login')

    // Should show token input directly (no tab switching needed)
    await expect(page.locator('[data-test="token-input"]')).toBeVisible()
    await expect(page.locator('[data-test="login-button"]')).toBeVisible()
  })

  test('should show error for invalid token', async ({ page }) => {
    await page.goto('/#/login')

    // Wait for login page to be ready
    await expect(page.locator('[data-test="token-input"]')).toBeVisible()

    // Enter invalid token
    await page.fill('[data-test="token-input"]', 'invalid_token_12345')

    // Submit
    await page.click('[data-test="login-button"]')

    // Should show error banner or notification
    const errorBanner = page.locator('.q-banner.bg-negative')
    const errorNotification = page.locator('.q-notification--negative')
    await expect(errorBanner.or(errorNotification)).toBeVisible({ timeout: 15000 })
  })

  test('should disable login button when token is empty', async ({ page }) => {
    await page.goto('/#/login')

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

    // Username should be visible (wriver4-test is our test account)
    await expect(page.locator('[data-test="username"]')).toBeVisible()
    await expect(page.locator('[data-test="username"]')).toContainText('wriver4-test')
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

    // Reload page
    await page.reload()

    // Should still be authenticated
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
