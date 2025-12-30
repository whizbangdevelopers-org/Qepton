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

    // Should show gist detail dialog with file content
    await expect(page.locator('.q-dialog')).toBeVisible()
    await expect(page.locator('[data-test="file-content"]')).toBeVisible()
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

    // Click on first gist to open detail view
    await page.locator('[data-test="gist-item"]').first().click()
    await expect(page.locator('.q-dialog')).toBeVisible()

    // Click Edit button (in header)
    await page.getByRole('button', { name: 'Edit' }).first().click()

    // Edit dialog should open
    await expect(page.locator('.edit-gist-dialog')).toBeVisible()
    await expect(page.locator('[data-test="gist-description"]')).toBeVisible()
  })

  test('should load existing gist data in edit dialog', async ({ page }) => {
    // Wait for gist list
    await expect(page.locator('[data-test="gist-item"]').first()).toBeVisible({ timeout: 15000 })

    // Click on first gist to open detail view
    await page.locator('[data-test="gist-item"]').first().click()
    await expect(page.locator('.q-dialog')).toBeVisible()

    // Click Edit button
    await page.getByRole('button', { name: 'Edit' }).first().click()
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

    // Click on first gist to open detail view
    await page.locator('[data-test="gist-item"]').first().click()
    await expect(page.locator('.q-dialog')).toBeVisible()

    // Click Delete button in the gist detail dialog
    await page.locator('.gist-detail-card').getByRole('button', { name: 'Delete' }).first().click()

    // Delete confirmation dialog should open - check for the confirm button as it's unique
    await expect(page.locator('[data-test="confirm-delete"]')).toBeVisible()
    await expect(page.locator('[data-test="cancel-delete"]')).toBeVisible()
  })

  test('should cancel delete operation', async ({ page }) => {
    // Wait for gist list
    await expect(page.locator('[data-test="gist-item"]').first()).toBeVisible({ timeout: 15000 })

    // Click on first gist to open detail view
    await page.locator('[data-test="gist-item"]').first().click()
    await expect(page.locator('.q-dialog')).toBeVisible()

    // Click Delete button in the gist detail dialog
    await page.locator('.gist-detail-card').getByRole('button', { name: 'Delete' }).first().click()

    // Wait for delete confirmation dialog
    await expect(page.locator('[data-test="confirm-delete"]')).toBeVisible()

    // Click Cancel
    await page.click('[data-test="cancel-delete"]')

    // Delete dialog should close - confirm button should not be visible
    await expect(page.locator('[data-test="confirm-delete"]')).not.toBeVisible()
  })
})
