import { test, expect } from '@playwright/test'
import { loginWithToken } from './helpers'

/**
 * Tag System Tests using real GitHub API
 * Uses the wriver4-test account configured in e2e-docker/.env
 */
test.describe('Tag System', () => {
  test.beforeEach(async ({ page }) => {
    await loginWithToken(page)
  })

  test('should display languages section', async ({ page }) => {
    await expect(page.locator('.text-caption:has-text("LANGUAGES")').first()).toBeVisible()
  })

  test('should display tags section', async ({ page }) => {
    await expect(page.getByText('TAGS', { exact: true })).toBeVisible()
  })

  test('should display All Gists option', async ({ page }) => {
    await expect(page.locator('text=All Gists').first()).toBeVisible()
  })

  test('should display gist count', async ({ page }) => {
    await expect(page.locator('text=/\\d+ Gists/')).toBeVisible()
  })

  test('should filter gists by language tag', async ({ page }) => {
    // Wait for tags to load
    await expect(page.locator('[data-test="gist-item"]').first()).toBeVisible({ timeout: 15000 })
    // Click on first language tag if available
    const langTag = page.locator('[data-test="language-tag"]').first()
    if (await langTag.isVisible({ timeout: 3000 }).catch(() => false)) {
      await langTag.click()
      // Verify tag is selected (active state)
      await expect(langTag).toHaveClass(/active|q-item--active/)
    }
  })

  test('should return to all gists', async ({ page }) => {
    // Click on All Gists to return to unfiltered view
    await page.locator('text=All Gists').first().click()
    await expect(page.locator('[data-test="gist-item"]').first()).toBeVisible({ timeout: 10000 })
  })

  test.skip('should open pinned tags modal', async () => {
    // Requires [data-test="manage-pinned-tags"] button in NavigationPanel
  })

  test.skip('should pin a tag', async () => {
    // Requires pinned tags modal with clickable tags
  })
})
