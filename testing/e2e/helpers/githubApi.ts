import { TestGist } from './testData'

/**
 * Direct GitHub API helpers for E2E tests
 * Used to create/cleanup test data without going through the UI
 */

const GITHUB_API_BASE = 'https://api.github.com'

interface GitHubGist {
  id: string
  description: string
  public: boolean
  html_url: string
  files: Record<string, { filename: string; content: string; language?: string }>
}

/**
 * Get the test token from environment
 */
function getTestToken(): string {
  const token = process.env.GITHUB_TEST_TOKEN
  if (!token) {
    throw new Error('GITHUB_TEST_TOKEN environment variable is required')
  }
  return token
}

/**
 * Create a gist via GitHub API
 */
export async function createGistViaAPI(gist: TestGist): Promise<GitHubGist> {
  const token = getTestToken()

  const response = await fetch(`${GITHUB_API_BASE}/gists`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28'
    },
    body: JSON.stringify({
      description: gist.description,
      public: gist.public,
      files: gist.files
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to create gist: ${response.status} ${error}`)
  }

  return response.json()
}

/**
 * Delete a gist via GitHub API
 */
export async function deleteGistViaAPI(gistId: string): Promise<void> {
  const token = getTestToken()

  const response = await fetch(`${GITHUB_API_BASE}/gists/${gistId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    }
  })

  if (!response.ok && response.status !== 404) {
    const error = await response.text()
    throw new Error(`Failed to delete gist: ${response.status} ${error}`)
  }
}

/**
 * List all gists for the authenticated user
 */
export async function listGistsViaAPI(): Promise<GitHubGist[]> {
  const token = getTestToken()

  const response = await fetch(`${GITHUB_API_BASE}/gists`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    }
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to list gists: ${response.status} ${error}`)
  }

  return response.json()
}

/**
 * Find gists by tag in description
 */
export async function findGistsByTag(tag: string): Promise<GitHubGist[]> {
  const gists = await listGistsViaAPI()
  return gists.filter(g => g.description?.includes(`#${tag}`))
}

/**
 * Delete all gists matching a tag (for cleanup)
 */
export async function deleteGistsByTag(tag: string): Promise<number> {
  const gists = await findGistsByTag(tag)
  let deleted = 0

  for (const gist of gists) {
    try {
      await deleteGistViaAPI(gist.id)
      deleted++
    } catch (error) {
      console.error(`Failed to delete gist ${gist.id}:`, error)
    }
  }

  return deleted
}

/**
 * Clean up all E2E test gists (those with #automated-test or #e2e-test tags)
 */
export async function cleanupTestGists(): Promise<number> {
  const gists = await listGistsViaAPI()
  const testGists = gists.filter(
    g =>
      g.description?.includes('#automated-test') ||
      g.description?.includes('#e2e-test') ||
      g.description?.includes('[E2E Test]')
  )

  let deleted = 0
  for (const gist of testGists) {
    try {
      await deleteGistViaAPI(gist.id)
      deleted++
    } catch (error) {
      console.error(`Failed to delete gist ${gist.id}:`, error)
    }
  }

  return deleted
}

/**
 * Get current authenticated user info
 */
export async function getCurrentUser(): Promise<{ login: string; id: number; avatar_url: string }> {
  const token = getTestToken()

  const response = await fetch(`${GITHUB_API_BASE}/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    }
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get user: ${response.status} ${error}`)
  }

  return response.json()
}

/**
 * Verify the test token is valid
 */
export async function verifyTestToken(): Promise<boolean> {
  try {
    await getCurrentUser()
    return true
  } catch {
    return false
  }
}
