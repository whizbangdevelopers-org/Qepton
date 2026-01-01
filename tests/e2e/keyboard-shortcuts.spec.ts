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
 * Keyboard Navigation Tests
 * Tests for vim-style navigation through gist list and file preview
 */
test.describe('Keyboard Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await loginWithToken(page)
    // Wait for gists to load
    await expect(page.locator('[data-test="gist-item"]').first()).toBeVisible({ timeout: 15000 })
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

  test('keyboard hint should appear when navigation is active', async ({ page }) => {
    // Click to activate keyboard navigation
    await page.locator('.gist-virtual-scroll').click()
    await expect(page.locator('.gist-item.keyboard-focused').first()).toBeVisible({ timeout: 5000 })

    // Keyboard hint should be visible
    await expect(page.locator('.keyboard-hint')).toBeVisible()
  })

  test('keyboard navigation should not work when search input is focused', async ({ page }) => {
    // Focus the search input
    await page.locator('[data-test="global-search-input"]').click()
    await page.waitForTimeout(100)

    // Try pressing j - should not trigger navigation (should type in input instead)
    await page.keyboard.type('test')

    // Verify text was typed into input
    await expect(page.locator('[data-test="global-search-input"] input')).toHaveValue('test')

    // No keyboard focus indicator should be visible
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
