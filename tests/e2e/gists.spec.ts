import { test, expect } from '@playwright/test'
import { loginWithToken } from './helpers'

/**
 * Gist Management Tests using real GitHub API
 * Uses the wriver4-test account configured in e2e-docker/.env
 */
test.describe('Gist Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginWithToken(page)
  })

  test('should display gist list after login', async ({ page }) => {
    // Should show gist list (may need to wait for sync)
    await expect(page.locator('[data-test="gist-list"]')).toBeVisible({ timeout: 15000 })

    // Should have gist items
    await expect(page.locator('[data-test="gist-item"]').first()).toBeVisible()
  })

  test('should show user info in sidebar', async ({ page }) => {
    // Should show username (wriver4-test)
    await expect(page.locator('[data-test="username"]')).toContainText('wriver4-test')
  })

  test('should select a gist and show details', async ({ page }) => {
    // Wait for gist items to be available
    await expect(page.locator('[data-test="gist-item"]').first()).toBeVisible({ timeout: 15000 })

    // Click on first gist
    await page.locator('[data-test="gist-item"]').first().click()

    // On desktop, the preview pane shows the gist. On mobile, a dialog opens.
    // Check for either preview panel content or mobile dialog
    const previewPanel = page.locator('.gist-preview-panel')
    const mobileDialog = page.locator('.q-dialog')
    await expect(previewPanel.or(mobileDialog)).toBeVisible({ timeout: 10000 })

    // The file accordion should show
    await expect(page.locator('[data-test="file-accordion-item"]').first()).toBeVisible()
  })

  test('should display language tags in sidebar', async ({ page }) => {
    // Should show languages section
    await expect(page.locator('.text-caption:has-text("LANGUAGES")').first()).toBeVisible()
  })

  test('should display tags section in sidebar', async ({ page }) => {
    // Should show tags section (use exact match to avoid matching substrings)
    await expect(page.getByText('TAGS', { exact: true })).toBeVisible()
  })

  test('should have sync button', async ({ page }) => {
    // Sync button should be visible
    await expect(page.locator('[data-test="sync-button"]').first()).toBeVisible()
  })

  test('should have new gist button', async ({ page }) => {
    // New gist button should be visible
    await expect(page.locator('[data-test="new-gist-button"]')).toBeVisible()
  })

  test('should have logout button', async ({ page }) => {
    // Logout button should be visible
    await expect(page.locator('[data-test="logout-button"]')).toBeVisible()
  })

  test('should sync gists when clicking sync button', async ({ page }) => {
    // Click sync button
    await page.locator('[data-test="sync-button"]').first().click()

    // Should show success notification with "Synced X gists" message
    await expect(page.getByText(/Synced \d+ gists/i)).toBeVisible({ timeout: 15000 })
  })

  // CRUD Tests - New Gist, Edit Gist, Delete Gist

  test('should open new gist modal', async ({ page }) => {
    await page.click('[data-test="new-gist-button"]')
    // NewGistDialog uses maximized q-dialog
    await expect(page.locator('.new-gist-dialog')).toBeVisible()
    await expect(page.locator('[data-test="gist-description"]')).toBeVisible()
  })

  test('should have all form fields in new gist dialog', async ({ page }) => {
    // Open new gist dialog
    await page.click('[data-test="new-gist-button"]')
    await expect(page.locator('.new-gist-dialog')).toBeVisible({ timeout: 10000 })

    // Verify all form fields are present
    await expect(page.locator('.new-gist-dialog [data-test="gist-description"]')).toBeVisible()
    await expect(page.locator('.new-gist-dialog [data-test="gist-public-toggle"]')).toBeVisible()
    await expect(page.locator('.new-gist-dialog [data-test="file-name"]')).toBeVisible()
    await expect(page.locator('.new-gist-dialog [data-test="file-content"]')).toBeVisible()
    await expect(page.locator('.new-gist-dialog [data-test="add-file"]')).toBeVisible()
    await expect(page.locator('.new-gist-dialog [data-test="cancel-button"]')).toBeVisible()
    await expect(page.locator('.new-gist-dialog [data-test="submit-button"]')).toBeVisible()

    // Submit should be disabled when form is empty
    await expect(page.locator('.new-gist-dialog [data-test="submit-button"]')).toBeDisabled()
  })

  test('should open edit gist modal', async ({ page }) => {
    // Wait for gist list
    await expect(page.locator('[data-test="gist-item"]').first()).toBeVisible({ timeout: 15000 })

    // Click on first gist to select it
    await page.locator('[data-test="gist-item"]').first().click()

    // Wait for preview panel to show the gist
    await expect(page.locator('.gist-preview-panel')).toBeVisible({ timeout: 10000 })

    // Use keyboard shortcut Cmd/Ctrl+E to open edit dialog
    const modifier = process.platform === 'darwin' ? 'Meta' : 'Control'
    await page.keyboard.press(`${modifier}+e`)

    // Edit dialog should open
    await expect(page.locator('.edit-gist-dialog')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('[data-test="gist-description"]')).toBeVisible()
  })

  test('should load existing gist data in edit dialog', async ({ page }) => {
    // Wait for gist list
    await expect(page.locator('[data-test="gist-item"]').first()).toBeVisible({ timeout: 15000 })

    // Click on first gist to select it
    await page.locator('[data-test="gist-item"]').first().click()

    // Wait for preview panel to show the gist
    await expect(page.locator('.gist-preview-panel')).toBeVisible({ timeout: 10000 })

    // Use keyboard shortcut to open edit dialog
    const modifier = process.platform === 'darwin' ? 'Meta' : 'Control'
    await page.keyboard.press(`${modifier}+e`)
    await expect(page.locator('.edit-gist-dialog')).toBeVisible({ timeout: 10000 })

    // Wait for form to load with existing data
    await expect(page.locator('.edit-gist-dialog [data-test="gist-description"]')).toBeVisible()

    // Verify file fields are present
    await expect(page.locator('.edit-gist-dialog [data-test="file-name"]').first()).toBeVisible()
    await expect(page.locator('.edit-gist-dialog [data-test="file-content"]').first()).toBeVisible()

    // Save button should be enabled (form has valid data)
    await expect(page.locator('.edit-gist-dialog [data-test="save-button"]')).toBeEnabled()
  })

  test('should open delete confirmation dialog', async ({ page }) => {
    // Wait for gist list
    await expect(page.locator('[data-test="gist-item"]').first()).toBeVisible({ timeout: 15000 })

    // Click on first gist to select it
    await page.locator('[data-test="gist-item"]').first().click()

    // Wait for preview panel to show the gist
    await expect(page.locator('.gist-preview-panel')).toBeVisible({ timeout: 10000 })

    // Click Delete button in the preview panel header
    await page.locator('.gist-preview-panel').getByRole('button', { name: 'Delete' }).click()

    // Delete confirmation dialog should open - check for the confirm button as it's unique
    await expect(page.locator('[data-test="confirm-delete"]')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('[data-test="cancel-delete"]')).toBeVisible()
  })

  test('should cancel delete operation', async ({ page }) => {
    // Wait for gist list
    await expect(page.locator('[data-test="gist-item"]').first()).toBeVisible({ timeout: 15000 })

    // Click on first gist to select it
    await page.locator('[data-test="gist-item"]').first().click()

    // Wait for preview panel to show the gist
    await expect(page.locator('.gist-preview-panel')).toBeVisible({ timeout: 10000 })

    // Click Delete button in the preview panel header
    await page.locator('.gist-preview-panel').getByRole('button', { name: 'Delete' }).click()

    // Wait for delete confirmation dialog
    await expect(page.locator('[data-test="confirm-delete"]')).toBeVisible({ timeout: 5000 })

    // Click Cancel
    await page.click('[data-test="cancel-delete"]')

    // Delete dialog should close - confirm button should not be visible
    await expect(page.locator('[data-test="confirm-delete"]')).not.toBeVisible()
  })

  test('should have share button that copies link to clipboard', async ({ page, context }) => {
    // Grant clipboard permissions
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])

    // Wait for gist list
    await expect(page.locator('[data-test="gist-item"]').first()).toBeVisible({ timeout: 15000 })

    // Click on first gist to select it
    await page.locator('[data-test="gist-item"]').first().click()

    // Wait for preview panel to show the gist
    await expect(page.locator('.gist-preview-panel')).toBeVisible({ timeout: 10000 })

    // Share button should be visible
    await expect(page.locator('[data-test="share-gist-btn"]')).toBeVisible()

    // Click share button
    await page.locator('[data-test="share-gist-btn"]').click()

    // Should show success notification
    await expect(page.getByText('Link copied to clipboard')).toBeVisible({ timeout: 5000 })

    // Verify clipboard contains a gist URL
    const clipboardContent = await page.evaluate(() => navigator.clipboard.readText())
    expect(clipboardContent).toMatch(/gist\.github\.com/)
  })

  test('should open version history dialog', async ({ page }) => {
    // Wait for gist list
    await expect(page.locator('[data-test="gist-item"]').first()).toBeVisible({ timeout: 15000 })

    // Click on first gist to select it
    await page.locator('[data-test="gist-item"]').first().click()

    // Wait for preview panel to show the gist
    await expect(page.locator('.gist-preview-panel')).toBeVisible({ timeout: 10000 })

    // Version history button should be visible
    await expect(page.locator('[data-test="version-history-btn"]')).toBeVisible()

    // Click version history button
    await page.locator('[data-test="version-history-btn"]').click()

    // Should show version history dialog (using the q-dialog with data-test attribute)
    await expect(page.locator('[data-test="version-history-dialog"]')).toBeVisible({ timeout: 10000 })

    // Dialog should have title (use exact match to avoid matching "Loading version history...")
    await expect(page.getByText('Version History', { exact: true })).toBeVisible({ timeout: 5000 })

    // Should show version items
    await expect(page.locator('[data-test="version-item"]').first()).toBeVisible({ timeout: 10000 })
  })
})
