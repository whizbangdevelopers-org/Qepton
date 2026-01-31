export * from './auth'
export * from './testData'
export * from './githubApi'

import { Page } from '@playwright/test'

/**
 * Wait for network to be idle (useful after actions that trigger API calls)
 */
export async function waitForNetworkIdle(page: Page, timeout = 5000): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout })
}

/**
 * Get the modifier key for the current platform (Meta for Mac, Control for others)
 */
export function getModifierKey(): 'Meta' | 'Control' {
  // In Playwright tests, we can check the platform
  return process.platform === 'darwin' ? 'Meta' : 'Control'
}

/**
 * Press a keyboard shortcut with the correct modifier key
 */
export async function pressShortcut(page: Page, key: string): Promise<void> {
  const modifier = getModifierKey()
  await page.keyboard.press(`${modifier}+${key}`)
}

/**
 * Wait for a notification to appear
 */
export async function waitForNotification(
  page: Page,
  type: 'positive' | 'negative' | 'warning' | 'info' = 'positive'
): Promise<void> {
  await page.waitForSelector(`.q-notification--${type}`, { timeout: 5000 })
}

/**
 * Dismiss all notifications
 */
export async function dismissNotifications(page: Page): Promise<void> {
  const notifications = page.locator('.q-notification__actions button')
  const count = await notifications.count()

  for (let i = 0; i < count; i++) {
    await notifications.nth(i).click()
  }
}

/**
 * Take a screenshot with a descriptive name
 */
export async function takeScreenshot(page: Page, name: string): Promise<void> {
  await page.screenshot({
    path: `playwright-report/screenshots/${name}.png`,
    fullPage: true
  })
}

/**
 * Mock user data using GitHub's octocat sample user
 * This is GitHub's official test user available at https://api.github.com/users/octocat
 */
const OCTOCAT_USER = {
  login: 'octocat',
  id: 583231,
  avatar_url: 'https://avatars.githubusercontent.com/u/583231?v=4',
  name: 'The Octocat',
  html_url: 'https://github.com/octocat'
}

/**
 * Mock gists data for testing
 */
const MOCK_GISTS = [
  {
    id: 'mock-gist-1',
    description: '[Test Gist] A sample gist for testing #test',
    public: true,
    html_url: 'https://gist.github.com/octocat/mock-gist-1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    files: {
      'test.js': {
        filename: 'test.js',
        language: 'JavaScript',
        raw_url: 'https://gist.githubusercontent.com/octocat/mock-gist-1/raw/test.js',
        content: 'console.log("Hello World")',
        size: 28
      }
    },
    owner: {
      login: 'octocat',
      avatar_url: 'https://avatars.githubusercontent.com/u/583231?v=4'
    }
  },
  {
    id: 'mock-gist-2',
    description: '[Another Gist] Python example #python',
    public: true,
    html_url: 'https://gist.github.com/octocat/mock-gist-2',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    files: {
      'main.py': {
        filename: 'main.py',
        language: 'Python',
        raw_url: 'https://gist.githubusercontent.com/octocat/mock-gist-2/raw/main.py',
        content: 'print("Hello Python")',
        size: 21
      }
    },
    owner: {
      login: 'octocat',
      avatar_url: 'https://avatars.githubusercontent.com/u/583231?v=4'
    }
  },
  {
    id: 'mock-gist-3',
    description: 'Markdown README example',
    public: true,
    html_url: 'https://gist.github.com/octocat/mock-gist-3',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    files: {
      'README.md': {
        filename: 'README.md',
        language: 'Markdown',
        raw_url: 'https://gist.githubusercontent.com/octocat/mock-gist-3/raw/README.md',
        content: '# Hello World\n\nThis is a **test** markdown file.\n\n- Item 1\n- Item 2',
        size: 65
      }
    },
    owner: {
      login: 'octocat',
      avatar_url: 'https://avatars.githubusercontent.com/u/583231?v=4'
    }
  }
]

/**
 * Mock API responses for testing without real GitHub access
 * Uses octocat as the mock user (GitHub's official sample user)
 */
export async function mockGitHubAPI(page: Page): Promise<void> {
  await page.route('**/api.github.com/**', async route => {
    const url = route.request().url()
    const method = route.request().method()

    // Mock user endpoint - required for authentication
    if (url.includes('/user') && !url.includes('/gists')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(OCTOCAT_USER)
      })
      return
    }

    // Mock gists list endpoint
    if (url.match(/\/gists\/?$/) || (url.includes('/users/') && url.includes('/gists'))) {
      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(MOCK_GISTS)
        })
        return
      }
      if (method === 'POST') {
        // Create new gist
        const body = route.request().postDataJSON()
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'new-gist-' + Date.now(),
            description: body?.description || '',
            public: body?.public ?? true,
            html_url: 'https://gist.github.com/octocat/new-gist',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            files: body?.files || {},
            owner: OCTOCAT_USER
          })
        })
        return
      }
    }

    // Mock single gist endpoint
    if (url.match(/\/gists\/[a-zA-Z0-9-]+$/)) {
      if (method === 'GET') {
        const gistId = url.split('/').pop()
        const gist = MOCK_GISTS.find(g => g.id === gistId) || MOCK_GISTS[0]
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(gist)
        })
        return
      }
      if (method === 'PATCH') {
        const body = route.request().postDataJSON()
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ...MOCK_GISTS[0],
            description: body?.description || MOCK_GISTS[0].description,
            files: body?.files || MOCK_GISTS[0].files
          })
        })
        return
      }
      if (method === 'DELETE') {
        await route.fulfill({ status: 204 })
        return
      }
    }

    // Default: pass through
    await route.continue()
  })
}
