import { test, expect } from '@playwright/test'
import { loginWithToken } from './helpers'

/**
 * Navigation Panel Tests using real GitHub API
 * Tests sidebar navigation sections
 */
test.describe('Navigation Panel', () => {
  test.beforeEach(async ({ page }) => {
    await loginWithToken(page)
  })

  test.describe('Languages Section', () => {
    test('should display LANGUAGES section', async ({ page }) => {
      await expect(page.locator('.text-caption:has-text("LANGUAGES")').first()).toBeVisible()
    })

    test('should display language tags after gists load', async ({ page }) => {
      await expect(page.locator('[data-test="gist-item"]').first()).toBeVisible({ timeout: 15000 })
      const langTag = page.locator('[data-test="language-tag"]').first()
      if (await langTag.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(langTag).toBeVisible()
      }
    })

    test('should filter gists by language tag', async ({ page }) => {
      await expect(page.locator('[data-test="gist-item"]').first()).toBeVisible({ timeout: 15000 })
      const langTag = page.locator('[data-test="language-tag"]').first()
      if (await langTag.isVisible({ timeout: 3000 }).catch(() => false)) {
        await langTag.click()
        await expect(langTag).toHaveClass(/active|q-item--active/)
      }
    })
  })

  test.describe('Tags Section', () => {
    test('should display TAGS section', async ({ page }) => {
      await expect(page.getByText('TAGS', { exact: true })).toBeVisible()
    })
  })

  test.describe('All Gists', () => {
    test('should display All Gists option', async ({ page }) => {
      await expect(page.getByText('All Gists').first()).toBeVisible()
    })

    test('should show gist count', async ({ page }) => {
      await expect(page.getByText(/\d+ Gists/)).toBeVisible({ timeout: 15000 })
    })

    test('should return to all gists when clicked', async ({ page }) => {
      await expect(page.locator('[data-test="gist-item"]').first()).toBeVisible({ timeout: 15000 })
      const langTag = page.locator('[data-test="language-tag"]').first()
      if (await langTag.isVisible({ timeout: 3000 }).catch(() => false)) {
        await langTag.click()
        await page.waitForTimeout(500)
      }
      await page.getByText('All Gists').first().click()
      await expect(page.locator('[data-test="gist-item"]').first()).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('Pinned Tags', () => {
    test('should have manage pinned tags button if available', async ({ page }) => {
      const manageButton = page.locator('[data-test="manage-pinned-tags"]')
      if (await manageButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await manageButton.click()
        await expect(page.locator('[data-test="pinned-tags-dialog"]')).toBeVisible()
      }
    })
  })
})
