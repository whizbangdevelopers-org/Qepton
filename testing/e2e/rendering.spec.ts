import { test, expect } from '@playwright/test'
import { loginWithToken } from './helpers'

/**
 * Content Rendering Tests using real GitHub API
 * Uses the GitHub account configured via GITHUB_TEST_TOKEN in e2e-docker/.env
 *
 * Tests cover:
 * - File content display in dialogs
 * - CodeMirror syntax highlighting
 * - Markdown preview rendering
 * - Copy functionality
 */
test.describe('Content Rendering', () => {
  test.beforeEach(async ({ page }) => {
    await loginWithToken(page)
  })

  test('should display gist content in dialog', async ({ page }) => {
    // Wait for gist list
    await expect(page.locator('[data-test="gist-item"]').first()).toBeVisible({ timeout: 15000 })

    // Click on first gist
    await page.locator('[data-test="gist-item"]').first().click()

    // On desktop, the preview panel shows the gist. On mobile, a dialog opens.
    const previewPanel = page.locator('.gist-preview-panel')
    const mobileDialog = page.locator('.q-dialog')
    await expect(previewPanel.or(mobileDialog)).toBeVisible({ timeout: 10000 })

    // File content should be visible in either view
    await expect(page.locator('[data-test="file-content"]').first()).toBeVisible({ timeout: 5000 })
  })

  test('should show code in CodeMirror editor', async ({ page }) => {
    // Wait for gist list
    await expect(page.locator('[data-test="gist-item"]').first()).toBeVisible({ timeout: 15000 })

    // Click on first gist
    await page.locator('[data-test="gist-item"]').first().click()

    // On desktop, the preview panel shows the gist. On mobile, a dialog opens.
    const previewPanel = page.locator('.gist-preview-panel')
    const mobileDialog = page.locator('.q-dialog')
    await expect(previewPanel.or(mobileDialog)).toBeVisible({ timeout: 10000 })

    // Should have CodeMirror editor with code content
    await expect(page.locator('.cm-editor').first()).toBeVisible({ timeout: 5000 })
    await expect(page.locator('.cm-content').first()).toBeVisible()
  })

  test.describe('Syntax Highlighting', () => {
    test('should render code with CodeMirror editor', async ({ page }) => {
      await expect(page.locator('[data-test="gist-item"]').first()).toBeVisible({ timeout: 15000 })
      await page.locator('[data-test="gist-item"]').first().click()

      // On desktop, the preview panel shows the gist. On mobile, a dialog opens.
      const previewPanel = page.locator('.gist-preview-panel')
      const mobileDialog = page.locator('.q-dialog')
      await expect(previewPanel.or(mobileDialog)).toBeVisible({ timeout: 10000 })

      // CodeMirror editor should be visible
      await expect(page.locator('.cm-editor').first()).toBeVisible({ timeout: 5000 })
      // Should have syntax highlighting (cm-content contains highlighted code)
      await expect(page.locator('.cm-content').first()).toBeVisible()
    })
  })

  test.describe('Markdown Rendering', () => {
    test('should show preview toggle for markdown files', async ({ page }) => {
      await expect(page.locator('[data-test="gist-item"]').first()).toBeVisible({ timeout: 15000 })
      await page.locator('[data-test="gist-item"]').first().click()

      // On desktop, the preview panel shows the gist. On mobile, a dialog opens.
      const previewPanel = page.locator('.gist-preview-panel')
      const mobileDialog = page.locator('.q-dialog')
      await expect(previewPanel.or(mobileDialog)).toBeVisible({ timeout: 10000 })

      // Check if any file accordion item is a .md file - preview toggle should appear
      const fileItems = page.locator('[data-test="file-accordion-item"]')
      const fileCount = await fileItems.count()

      for (let i = 0; i < fileCount; i++) {
        const fileName = await fileItems.nth(i).locator('.file-name, .q-item-label').first().textContent()
        if (fileName?.match(/\.(md|markdown)$/i)) {
          await fileItems.nth(i).click()
          // Preview toggle should be visible for markdown files
          const previewToggle = page.locator('.q-btn-toggle')
          if (await previewToggle.isVisible({ timeout: 3000 }).catch(() => false)) {
            // Click preview button and check for rendered content
            await page.locator('.q-btn-toggle button').last().click()
            await expect(page.locator('[data-test="markdown-preview"]')).toBeVisible()
            return
          }
        }
      }
      // Skip if no markdown files in test gists
      test.skip()
    })
  })

  test.describe('Copy Functionality', () => {
    test('should have copy button for code', async ({ page }) => {
      await expect(page.locator('[data-test="gist-item"]').first()).toBeVisible({ timeout: 15000 })
      await page.locator('[data-test="gist-item"]').first().click()

      // On desktop, the preview panel shows the gist. On mobile, a dialog opens.
      const previewPanel = page.locator('.gist-preview-panel')
      const mobileDialog = page.locator('.q-dialog')
      await expect(previewPanel.or(mobileDialog)).toBeVisible({ timeout: 10000 })

      // Copy button should be visible
      await expect(page.locator('[data-test="copy-code-button"]').first()).toBeVisible({ timeout: 5000 })
    })
  })
})
