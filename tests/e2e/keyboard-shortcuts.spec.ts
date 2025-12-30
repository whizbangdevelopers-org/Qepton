import { test, expect } from '@playwright/test'
import { loginWithToken, getModifierKey } from './helpers'

/**
 * Keyboard Shortcuts Tests using real GitHub API
 * Uses the wriver4-test account configured in e2e-docker/.env
 */
test.describe('Keyboard Shortcuts', () => {
  const modifier = getModifierKey()

  test.beforeEach(async ({ page }) => {
    await loginWithToken(page)
  })

  test('should have navigation panel visible', async ({ page }) => {
    await expect(page.locator('[data-test="navigation-panel"]')).toBeVisible()
  })

  test('should have header toolbar buttons', async ({ page }) => {
    await expect(page.locator('[data-test="sync-button"]').first()).toBeVisible()
    await expect(page.locator('[data-test="search-button"]')).toBeVisible()
    await expect(page.locator('[data-test="theme-toggle"]')).toBeVisible()
  })

  test('Cmd/Ctrl+N should open new gist modal', async ({ page }) => {
    await page.keyboard.press(`${modifier}+n`)
    await expect(page.locator('.new-gist-dialog')).toBeVisible()
  })

  test('Cmd/Ctrl+E should open edit modal when gist is selected', async ({ page }) => {
    // First select a gist
    await expect(page.locator('[data-test="gist-item"]').first()).toBeVisible({ timeout: 15000 })
    await page.locator('[data-test="gist-item"]').first().click()
    await expect(page.locator('.q-dialog')).toBeVisible()
    // Close detail dialog
    await page.keyboard.press('Escape')
    // Now use shortcut to open edit
    await page.keyboard.press(`${modifier}+e`)
    await expect(page.locator('.edit-gist-dialog')).toBeVisible()
  })

  test('Shift+Space should open search', async ({ page }) => {
    await page.keyboard.press('Shift+Space')
    await expect(page.locator('[data-test="search-dialog"]')).toBeVisible()
  })

  test('Cmd/Ctrl+D should toggle dashboard', async ({ page }) => {
    await page.keyboard.press(`${modifier}+d`)
    await expect(page.locator('[data-test="dashboard-dialog"]')).toBeVisible()
  })

  test('Escape should close modals', async ({ page }) => {
    await page.keyboard.press('Shift+Space')
    await expect(page.locator('[data-test="search-dialog"]')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.locator('[data-test="search-dialog"]')).not.toBeVisible()
  })
})
