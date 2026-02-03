import { test, expect } from '@playwright/test'
import { loginWithToken, getModifierKey } from './helpers'

/**
 * UI Modes Tests using real GitHub API
 * Uses the GitHub account configured via GITHUB_TEST_TOKEN in e2e-docker/.env
 */
test.describe('UI Modes', () => {
  test.beforeEach(async ({ page }) => {
    await loginWithToken(page)
  })

  test('should have theme toggle button', async ({ page }) => {
    await expect(page.locator('[data-test="theme-toggle"]')).toBeVisible()
  })

  test('should have about button', async ({ page }) => {
    await expect(page.locator('[data-test="about-button"]')).toBeVisible()
  })

  test('should have dashboard button', async ({ page }) => {
    await expect(page.locator('[data-test="dashboard-button"]')).toBeVisible()
  })

  test('should toggle theme', async ({ page }) => {
    await page.locator('[data-test="theme-toggle"]').click()
    await expect(page.locator('body')).toHaveClass(/body--dark/)
    await page.locator('[data-test="theme-toggle"]').click()
    await expect(page.locator('body')).not.toHaveClass(/body--dark/)
  })

  test.describe('Immersive Mode', () => {
    const modifier = getModifierKey()

    test('should toggle immersive mode with keyboard', async ({ page }) => {
      // Verify header is visible
      await expect(page.locator('.q-header')).toBeVisible()
      // Toggle immersive mode
      await page.keyboard.press(`${modifier}+i`)
      // Header should be hidden
      await expect(page.locator('.q-header')).not.toBeVisible()
      // Toggle back
      await page.keyboard.press(`${modifier}+i`)
      await expect(page.locator('.q-header')).toBeVisible()
    })
  })

  test.describe('Dashboard', () => {
    test('should open dashboard dialog with button', async ({ page }) => {
      await page.click('[data-test="dashboard-button"]')
      await expect(page.locator('[data-test="dashboard-dialog"]')).toBeVisible()
    })

    test('should display statistics', async ({ page }) => {
      await page.click('[data-test="dashboard-button"]')
      await expect(page.locator('[data-test="dashboard-dialog"]')).toBeVisible()
      await expect(page.getByText('Total Gists')).toBeVisible()
      await expect(page.getByText('Custom Tags', { exact: true })).toBeVisible()
    })

    test('should close dashboard with close button', async ({ page }) => {
      await page.click('[data-test="dashboard-button"]')
      await expect(page.locator('[data-test="dashboard-dialog"]')).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(page.locator('[data-test="dashboard-dialog"]')).not.toBeVisible()
    })
  })

  test.describe('About Dialog', () => {
    test('should open about dialog with button', async ({ page }) => {
      await page.click('[data-test="about-button"]')
      await expect(page.locator('[data-test="about-dialog"]')).toBeVisible()
    })

    test('should display app info', async ({ page }) => {
      await page.click('[data-test="about-button"]')
      await expect(page.locator('[data-test="about-dialog"]')).toBeVisible()
      await expect(
        page.locator('[data-test="about-dialog"]').getByText('About Qepton')
      ).toBeVisible()
      await expect(page.locator('[data-test="about-dialog"]').getByText('Version')).toBeVisible()
    })

    test('should close about dialog', async ({ page }) => {
      await page.click('[data-test="about-button"]')
      await expect(page.locator('[data-test="about-dialog"]')).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(page.locator('[data-test="about-dialog"]')).not.toBeVisible()
    })
  })

  test.describe('Settings Dialog', () => {
    test('should have settings button in toolbar', async ({ page }) => {
      await expect(page.locator('[data-test="settings-button"]')).toBeVisible()
    })

    test('should open settings dialog with button', async ({ page }) => {
      await page.click('[data-test="settings-button"]')
      await expect(page.locator('[data-test="settings-dialog"]')).toBeVisible()
    })

    test('should display Languages and Editor tabs', async ({ page }) => {
      await page.click('[data-test="settings-button"]')
      await expect(page.locator('[data-test="settings-dialog"]')).toBeVisible()
      await expect(
        page.locator('[data-test="settings-dialog"]').getByRole('tab', { name: 'Languages' })
      ).toBeVisible()
      await expect(
        page.locator('[data-test="settings-dialog"]').getByRole('tab', { name: 'Editor' })
      ).toBeVisible()
    })

    test('should show supported languages list', async ({ page }) => {
      await page.click('[data-test="settings-button"]')
      await expect(page.locator('[data-test="settings-dialog"]')).toBeVisible()
      // Click on the Languages tab to see the supported languages list
      await page.getByRole('tab', { name: 'Languages' }).click()
      await expect(page.getByText(/Supported Languages/)).toBeVisible()
      await expect(page.getByText('JavaScript')).toBeVisible()
      await expect(page.getByText('TypeScript')).toBeVisible()
      await expect(page.getByText('Python')).toBeVisible()
    })

    test('should switch to Editor tab', async ({ page }) => {
      await page.click('[data-test="settings-button"]')
      await expect(page.locator('[data-test="settings-dialog"]')).toBeVisible()
      await page.getByRole('tab', { name: 'Editor' }).click()
      await expect(page.getByText('Editor Preferences')).toBeVisible()
      await expect(page.getByText('Line Wrapping')).toBeVisible()
      await expect(page.getByText('Tab Size')).toBeVisible()
    })

    test('should close settings dialog', async ({ page }) => {
      await page.click('[data-test="settings-button"]')
      await expect(page.locator('[data-test="settings-dialog"]')).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(page.locator('[data-test="settings-dialog"]')).not.toBeVisible()
    })
  })
})
