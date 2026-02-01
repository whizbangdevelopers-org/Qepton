import { test, expect } from '@playwright/test'
import { loginWithToken } from './helpers'

/**
 * Search Functionality Tests using real GitHub API
 * Uses the GitHub account configured via GITHUB_TEST_TOKEN in e2e-docker/.env
 */
test.describe('Search Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await loginWithToken(page)
  })

  test('should have search button in header', async ({ page }) => {
    await expect(page.locator('[data-test="search-button"]')).toBeVisible()
  })

  test('should open search dialog with button click', async ({ page }) => {
    await page.click('[data-test="search-button"]')
    await expect(page.locator('[data-test="search-dialog"]')).toBeVisible()
    await expect(page.locator('[data-test="search-input"]')).toBeVisible()
  })

  test('should open search dialog with keyboard shortcut', async ({ page }) => {
    await page.keyboard.press('Shift+Space')
    await expect(page.locator('[data-test="search-dialog"]')).toBeVisible()
  })

  test('should close search dialog with Escape', async ({ page }) => {
    await page.click('[data-test="search-button"]')
    await expect(page.locator('[data-test="search-dialog"]')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.locator('[data-test="search-dialog"]')).not.toBeVisible()
  })

  test('should show message for short query', async ({ page }) => {
    await page.click('[data-test="search-button"]')
    await expect(page.locator('[data-test="search-dialog"]')).toBeVisible()
    await page.locator('[data-test="search-dialog"] input').fill('a')
    await expect(
      page.locator('[data-test="search-dialog"]').getByText('Type at least 2 characters')
    ).toBeVisible()
  })

  test('should search gists by description', async ({ page }) => {
    await page.click('[data-test="search-button"]')
    await expect(page.locator('[data-test="search-dialog"]')).toBeVisible()
    await page.locator('[data-test="search-dialog"] input').fill('test')
    // Wait for results or "No results" message
    await expect(
      page
        .locator('[data-test="search-result-0"]')
        .or(page.locator('[data-test="search-dialog"]').getByText('No results'))
    ).toBeVisible({ timeout: 5000 })
  })

  test('should navigate to gist from search results', async ({ page }) => {
    await page.click('[data-test="search-button"]')
    await expect(page.locator('[data-test="search-dialog"]')).toBeVisible()
    await page.locator('[data-test="search-dialog"] input').fill('test')
    // If results exist, click the first one
    const firstResult = page.locator('[data-test="search-result-0"]')
    if (await firstResult.isVisible({ timeout: 3000 }).catch(() => false)) {
      await firstResult.click()
      await expect(page.locator('[data-test="search-dialog"]')).not.toBeVisible()
    }
  })
})
