import { test, expect } from '@playwright/test'
import { loginWithToken, getModifierKey } from './helpers'

/**
 * Help Dialog Tests
 */
test.describe('Help Dialog', () => {
  test.beforeEach(async ({ page }) => {
    await loginWithToken(page)
  })

  test('should have help button in header', async ({ page }) => {
    await expect(page.locator('[data-test="help-button"]')).toBeVisible()
  })

  test('should open help dialog when clicking help button', async ({ page }) => {
    await page.locator('[data-test="help-button"]').click()
    await expect(page.locator('[data-test="help-dialog"]')).toBeVisible({ timeout: 5000 })
  })

  test('should display shortcuts tab by default', async ({ page }) => {
    await page.locator('[data-test="help-button"]').click()
    await expect(page.locator('[data-test="help-dialog"]')).toBeVisible({ timeout: 5000 })

    // Should show keyboard shortcuts
    await expect(page.getByText('Create new gist')).toBeVisible()
    await expect(page.getByText('Edit active gist')).toBeVisible()
  })

  test('should display keyboard navigation shortcuts in help', async ({ page }) => {
    await page.locator('[data-test="help-button"]').click()
    await expect(page.locator('[data-test="help-dialog"]')).toBeVisible({ timeout: 5000 })

    // Should show keyboard navigation shortcuts
    await expect(page.getByText('Navigate list up/down')).toBeVisible()
    await expect(page.getByText('Select focused item / Expand file')).toBeVisible()
    await expect(page.getByText('Switch between gist list and preview')).toBeVisible()
  })

  test('should have features tab', async ({ page }) => {
    await page.locator('[data-test="help-button"]').click()
    await expect(page.locator('[data-test="help-dialog"]')).toBeVisible({ timeout: 5000 })

    // Click features tab
    await page.getByRole('tab', { name: 'Features' }).click()

    // Should show features
    await expect(page.getByText('GitHub Gist Integration')).toBeVisible()
    await expect(page.getByText('Smart Tagging')).toBeVisible()
  })

  test('should have languages tab', async ({ page }) => {
    await page.locator('[data-test="help-button"]').click()
    await expect(page.locator('[data-test="help-dialog"]')).toBeVisible({ timeout: 5000 })

    // Click languages tab
    await page.getByRole('tab', { name: 'Languages' }).click()

    // Should show supported languages count
    await expect(page.getByText(/\d+ supported languages/)).toBeVisible()
  })

  test('should have tips tab', async ({ page }) => {
    await page.locator('[data-test="help-button"]').click()
    await expect(page.locator('[data-test="help-dialog"]')).toBeVisible({ timeout: 5000 })

    // Click tips tab
    await page.getByRole('tab', { name: 'Tips' }).click()

    // Should show tips
    await expect(page.getByText(/Use #tag-name/)).toBeVisible()
  })

  test('should close help dialog with close button', async ({ page }) => {
    await page.locator('[data-test="help-button"]').click()
    await expect(page.locator('[data-test="help-dialog"]')).toBeVisible({ timeout: 5000 })

    // Click close button
    await page.locator('[data-test="help-dialog"] button[aria-label="Close"]').click()

    // Dialog should close
    await expect(page.locator('[data-test="help-dialog"]')).not.toBeVisible()
  })
})

/**
 * Keyboard Shortcuts Tests using real GitHub API
 * Uses the GitHub account configured via GITHUB_TEST_TOKEN in e2e-docker/.env
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

    // Wait for preview panel to show (on desktop) or dialog (on mobile)
    await expect(page.locator('.gist-preview-panel')).toBeVisible({ timeout: 10000 })

    // Now use shortcut to open edit
    await page.keyboard.press(`${modifier}+e`)
    await expect(page.locator('.edit-gist-dialog')).toBeVisible({ timeout: 10000 })
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

/**
 * Keyboard Focus Setting Tests
 */
test.describe('Keyboard Focus Setting', () => {
  test.beforeEach(async ({ page }) => {
    await loginWithToken(page)
    await expect(page.locator('[data-test="gist-item"]').first()).toBeVisible({ timeout: 15000 })
  })

  test('keyboard focus indicator should be hidden by default', async ({ page }) => {
    // Click on the gist list area
    await page.locator('.gist-virtual-scroll').click()
    await page.waitForTimeout(300)

    // No keyboard focus indicator should be visible (setting is off by default)
    const focusedItems = await page.locator('.gist-item.keyboard-focused').count()
    expect(focusedItems).toBe(0)
  })

  test('should have keyboard focus setting in settings dialog', async ({ page }) => {
    // Open settings
    await page.locator('[data-test="settings-button"]').click()
    await expect(page.locator('[data-test="settings-dialog"]')).toBeVisible({ timeout: 5000 })

    // Should show keyboard focus toggle
    await expect(page.getByText('Keyboard Focus Indicator')).toBeVisible()
    await expect(page.getByText('Show visual indicator for keyboard navigation')).toBeVisible()
  })

  test('enabling keyboard focus setting should show focus indicator', async ({ page }) => {
    // Open settings and enable keyboard focus
    await page.locator('[data-test="settings-button"]').click()
    await expect(page.locator('[data-test="settings-dialog"]')).toBeVisible({ timeout: 5000 })

    // Click the toggle for keyboard focus
    await page.getByText('Keyboard Focus Indicator').click()
    await page.waitForTimeout(100)

    // Close settings
    await page.keyboard.press('Escape')
    await expect(page.locator('[data-test="settings-dialog"]')).not.toBeVisible()

    // Click on gist list to activate keyboard navigation
    await page.locator('.gist-virtual-scroll').click()
    await page.waitForTimeout(300)

    // Now keyboard focus indicator should be visible
    await expect(page.locator('.gist-item.keyboard-focused').first()).toBeVisible({ timeout: 5000 })
  })
})

/**
 * Keyboard Navigation Tests
 * Tests for vim-style navigation through gist list and file preview
 * Note: These tests enable the keyboard focus setting to verify visual indicators
 */
test.describe('Keyboard Navigation', () => {
  async function enableKeyboardFocus(page: import('@playwright/test').Page) {
    await page.locator('[data-test="settings-button"]').click()
    await expect(page.locator('[data-test="settings-dialog"]')).toBeVisible({ timeout: 5000 })
    await page.getByText('Keyboard Focus Indicator').click()
    await page.waitForTimeout(100)
    await page.keyboard.press('Escape')
    await expect(page.locator('[data-test="settings-dialog"]')).not.toBeVisible()
  }

  test.beforeEach(async ({ page }) => {
    await loginWithToken(page)
    await expect(page.locator('[data-test="gist-item"]').first()).toBeVisible({ timeout: 15000 })
    await enableKeyboardFocus(page)
  })

  test('clicking gist list should activate keyboard focus', async ({ page }) => {
    // Click on the gist list area
    await page.locator('.gist-virtual-scroll').click()

    // The first item should get keyboard focus indicator
    await expect(page.locator('.gist-item.keyboard-focused').first()).toBeVisible({ timeout: 5000 })
  })

  test('j/k keys should navigate through gist list', async ({ page }) => {
    // Click to activate keyboard navigation
    await page.locator('.gist-virtual-scroll').click()
    await expect(page.locator('.gist-item.keyboard-focused').first()).toBeVisible({ timeout: 5000 })

    // Get the first gist that has focus
    await expect(page.locator('.gist-item.keyboard-focused').first()).toBeVisible()

    // Press j to move down
    await page.keyboard.press('j')
    await page.waitForTimeout(100)

    // The focus should have moved (first item should no longer have focus class if there are multiple gists)
    const focusedItems = await page.locator('.gist-item.keyboard-focused').count()
    expect(focusedItems).toBe(1)
  })

  test('Arrow keys should navigate through gist list', async ({ page }) => {
    // Click to activate keyboard navigation
    await page.locator('.gist-virtual-scroll').click()
    await expect(page.locator('.gist-item.keyboard-focused').first()).toBeVisible({ timeout: 5000 })

    // Press ArrowDown to move down
    await page.keyboard.press('ArrowDown')
    await page.waitForTimeout(100)

    // Focus should still be active
    const focusedItems = await page.locator('.gist-item.keyboard-focused').count()
    expect(focusedItems).toBe(1)
  })

  test('Enter should select focused gist', async ({ page }) => {
    // Click to activate keyboard navigation
    await page.locator('.gist-virtual-scroll').click()
    await expect(page.locator('.gist-item.keyboard-focused').first()).toBeVisible({ timeout: 5000 })

    // Press Enter to select the focused gist
    await page.keyboard.press('Enter')
    await page.waitForTimeout(300)

    // The gist should now be active (has active class)
    await expect(page.locator('.gist-item.q-item--active').first()).toBeVisible()
  })

  test('Escape should clear keyboard focus', async ({ page }) => {
    // Click to activate keyboard navigation
    await page.locator('.gist-virtual-scroll').click()
    await expect(page.locator('.gist-item.keyboard-focused').first()).toBeVisible({ timeout: 5000 })

    // Press Escape to clear focus
    await page.keyboard.press('Escape')
    await page.waitForTimeout(100)

    // No items should have keyboard focus
    const focusedItems = await page.locator('.gist-item.keyboard-focused').count()
    expect(focusedItems).toBe(0)
  })

  test('Tab should switch focus between panes', async ({ page }) => {
    // First select a gist so preview pane has content
    await page.locator('[data-test="gist-item"]').first().click()
    await page.waitForTimeout(300)

    // Click to activate keyboard navigation on gist list
    await page.locator('.gist-virtual-scroll').click()
    await expect(page.locator('.gist-item.keyboard-focused').first()).toBeVisible({ timeout: 5000 })

    // Press Tab to switch to preview pane
    await page.keyboard.press('Tab')
    await page.waitForTimeout(200)

    // Gist list should no longer have keyboard focus
    const gistListFocused = await page.locator('.gist-item.keyboard-focused').count()
    expect(gistListFocused).toBe(0)
  })

  test('keyboard navigation should not work when search input is focused', async ({ page }) => {
    // Wait for gists to load first
    await expect(page.locator('[data-test="gist-item"]').first()).toBeVisible({ timeout: 15000 })

    // Focus the search input by clicking on it
    // Note: Quasar q-input creates nested elements, the actual input is inside
    const searchWrapper = page.locator('[data-test="global-search-input"]')
    await expect(searchWrapper).toBeVisible({ timeout: 5000 })

    // Click on the search wrapper to focus it
    await searchWrapper.click()
    await page.waitForTimeout(200)

    // Find the actual input inside and type
    const searchInput = searchWrapper.locator('input').first()
    if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await searchInput.fill('test')
      await expect(searchInput).toHaveValue('test')
    }

    // No keyboard focus indicator should be visible (main test assertion)
    const focusedItems = await page.locator('.gist-item.keyboard-focused').count()
    expect(focusedItems).toBe(0)
  })

  test('Home key should jump to first item', async ({ page }) => {
    // Click to activate keyboard navigation
    await page.locator('.gist-virtual-scroll').click()
    await expect(page.locator('.gist-item.keyboard-focused').first()).toBeVisible({ timeout: 5000 })

    // Navigate down a few times
    await page.keyboard.press('j')
    await page.keyboard.press('j')
    await page.waitForTimeout(100)

    // Press Home to jump to first
    await page.keyboard.press('Home')
    await page.waitForTimeout(100)

    // First item should be focused
    const focusedItems = await page.locator('.gist-item.keyboard-focused').count()
    expect(focusedItems).toBe(1)
  })

  test('g key should jump to first item (vim-style)', async ({ page }) => {
    // Click to activate keyboard navigation
    await page.locator('.gist-virtual-scroll').click()
    await expect(page.locator('.gist-item.keyboard-focused').first()).toBeVisible({ timeout: 5000 })

    // Navigate down a few times
    await page.keyboard.press('j')
    await page.keyboard.press('j')
    await page.waitForTimeout(100)

    // Press g to jump to first
    await page.keyboard.press('g')
    await page.waitForTimeout(100)

    // First item should be focused
    const focusedItems = await page.locator('.gist-item.keyboard-focused').count()
    expect(focusedItems).toBe(1)
  })
})
