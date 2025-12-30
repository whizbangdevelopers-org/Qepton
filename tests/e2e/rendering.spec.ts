import { test, expect } from '@playwright/test'
import { loginWithToken } from './helpers'

/**
 * Content Rendering Tests using real GitHub API
 * Uses the wriver4-test account configured in e2e-docker/.env
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

    // Dialog should open with file content
    await expect(page.locator('.q-dialog')).toBeVisible()
    await expect(page.locator('[data-test="file-content"]')).toBeVisible()
  })

  test('should show code in CodeMirror editor', async ({ page }) => {
    // Wait for gist list
    await expect(page.locator('[data-test="gist-item"]').first()).toBeVisible({ timeout: 15000 })

    // Click on first gist
    await page.locator('[data-test="gist-item"]').first().click()

    // Should have CodeMirror editor with code content
    await expect(page.locator('[data-test="file-content"] .cm-editor')).toBeVisible()
    await expect(page.locator('[data-test="file-content"] .cm-content')).toBeVisible()
  })

  test.describe('Syntax Highlighting', () => {
    test('should render code with CodeMirror editor', async ({ page }) => {
      await expect(page.locator('[data-test="gist-item"]').first()).toBeVisible({ timeout: 15000 })
      await page.locator('[data-test="gist-item"]').first().click()
      await expect(page.locator('.q-dialog')).toBeVisible()
      
      // CodeMirror editor should be visible
      await expect(page.locator('.cm-editor')).toBeVisible()
      // Should have syntax highlighting (cm-content contains highlighted code)
      await expect(page.locator('.cm-content')).toBeVisible()
    })
  })

  test.describe('Markdown Rendering', () => {
    test('should show preview toggle for markdown files', async ({ page }) => {
      await expect(page.locator('[data-test="gist-item"]').first()).toBeVisible({ timeout: 15000 })
      await page.locator('[data-test="gist-item"]').first().click()
      await expect(page.locator('.q-dialog')).toBeVisible()
      
      // Check if any tab is a .md file - preview toggle should appear
      const tabs = page.locator('.q-tab')
      const tabCount = await tabs.count()
      
      for (let i = 0; i < tabCount; i++) {
        const tabLabel = await tabs.nth(i).textContent()
        if (tabLabel?.match(/\.(md|markdown)$/i)) {
          await tabs.nth(i).click()
          // Preview toggle should be visible for markdown files
          await expect(page.locator('.q-btn-toggle')).toBeVisible()
          // Click preview button and check for rendered content
          await page.locator('.q-btn-toggle button').last().click()
          await expect(page.locator('[data-test="markdown-preview"]')).toBeVisible()
          return
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
      await expect(page.locator('.q-dialog')).toBeVisible()
      await expect(page.locator('[data-test="copy-code-button"]').first()).toBeVisible()
    })
  })
})
