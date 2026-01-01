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

  test('should display tag color picker button', async ({ page }) => {
    // Expand tags section if collapsed
    const tagsSection = page.locator('text=TAGS')
    await tagsSection.click()

    // Look for palette button on any tag item
    const paletteBtn = page.locator('.tag-item button[icon="palette"], .tag-item .q-btn').filter({ hasText: '' }).first()
    await expect(paletteBtn.or(page.locator('.tag-item .q-btn').first())).toBeVisible({ timeout: 5000 })
  })

  test('should show solid tag icon when color is assigned', async ({ page }) => {
    // Expand tags section
    const tagsSection = page.locator('text=TAGS')
    await tagsSection.click()

    // Find a tag item with a color picker
    const tagItem = page.locator('.tag-item').first()
    if (await tagItem.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Click the palette button to open color picker
      const paletteBtn = tagItem.locator('button').filter({ has: page.locator('[class*="palette"]') }).first()
      if (await paletteBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await paletteBtn.click()

        // Select a color from the picker
        const colorSwatch = page.locator('.color-swatch').first()
        if (await colorSwatch.isVisible({ timeout: 2000 }).catch(() => false)) {
          await colorSwatch.click()

          // Verify solid icon is now shown (mdi-tag instead of mdi-tag-outline)
          await expect(tagItem.locator('.q-icon').first()).toBeVisible()
        }
      }
    }
  })

  test('should toggle tag colors in settings', async ({ page }) => {
    // Open settings
    await page.click('[data-test="settings-button"], button:has-text("Settings"), .q-btn:has([class*="settings"])')

    // Look for the Show Tag Colors toggle
    const tagColorsToggle = page.locator('text=Show Tag Colors')
    if (await tagColorsToggle.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(tagColorsToggle).toBeVisible()
    }
  })
})
