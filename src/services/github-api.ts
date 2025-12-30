/**
 * GitHub API Service
 * Migrated from Lepton's request-promise implementation to Axios
 * Supports: OAuth, Enterprise GitHub, Proxy, Pagination
 */

import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios'
import type { Gist, User, OAuthTokenResponse, GitHubAPIConfig } from 'src/types/github'

const TAG = '[GitHub API]'
const TIMEOUT = 20000 // 20 seconds
const USER_AGENT = 'hackjutsu-lepton-app'
const GISTS_PER_PAGE = 100

class GitHubAPIService {
  private client: AxiosInstance
  private token: string | null = null
  private baseURL: string
  private proxyConfig: AxiosRequestConfig = {}

  constructor() {
    // Use proxy in browser/development mode, direct API in Electron
    // Check if we're running in Electron by looking for window.require
    const isElectron = typeof window !== 'undefined' && typeof (window as Window & { require?: unknown }).require !== 'undefined'
    this.baseURL = isElectron ? 'https://api.github.com' : '/api/github'

    this.client = axios.create({
      timeout: TIMEOUT,
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/vnd.github.v3+json'
      }
    })

    // Request interceptor to add auth token
    this.client.interceptors.request.use((config) => {
      if (this.token) {
        config.headers.Authorization = `token ${this.token}`
      }
      config.baseURL = this.baseURL
      Object.assign(config, this.proxyConfig)
      return config
    })

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error(`${TAG} Request failed:`, error.message)
        return Promise.reject(error)
      }
    )
  }

  /**
   * Configure the API service
   */
  configure(config: GitHubAPIConfig): void {
    if (config.token) {
      this.setToken(config.token)
    }

    if (config.enterpriseHost) {
      this.setEnterpriseHost(config.enterpriseHost)
    }

    if (config.proxyUri) {
      this.setProxy(config.proxyUri)
    }
  }

  /**
   * Set authentication token
   */
  setToken(token: string): void {
    this.token = token
    console.debug(`${TAG} Token configured`)
  }

  /**
   * Set Enterprise GitHub host
   */
  setEnterpriseHost(host: string): void {
    this.baseURL = `https://${host}/api/v3`
    console.debug(`${TAG} Enterprise host set to ${host}`)
  }

  /**
   * Set proxy configuration
   */
  setProxy(proxyUri: string): void {
    // Note: Axios doesn't support proxy-agent directly in browser
    // This would need to be handled by Electron's net module or a custom agent
    console.debug(`${TAG} Proxy configuration: ${proxyUri}`)
    // In Electron, you'd configure this via session.setProxy
    // For now, we'll keep this as a placeholder
  }

  /**
   * Exchange OAuth code for access token
   */
  async exchangeAccessToken(
    clientId: string,
    clientSecret: string,
    code: string
  ): Promise<OAuthTokenResponse> {
    console.debug(`${TAG} Exchanging OAuth code for access token`)

    const response = await axios.post<OAuthTokenResponse>(
      'https://github.com/login/oauth/access_token',
      {
        client_id: clientId,
        client_secret: clientSecret,
        code
      },
      {
        headers: {
          'Accept': 'application/json'
        },
        timeout: TIMEOUT
      }
    )

    return response.data
  }

  /**
   * Get authenticated user's profile
   */
  async getUserProfile(): Promise<User> {
    console.debug(`${TAG} Getting user profile`)

    const response = await this.client.get<User>('/user')
    return response.data
  }

  /**
   * Get a single gist by ID
   */
  async getSingleGist(gistId: string): Promise<Gist> {
    console.debug(`${TAG} Getting single gist ${gistId}`)

    const response = await this.client.get<Gist>(`/gists/${gistId}`)
    return response.data
  }

  /**
   * Get all gists for a user (with pagination)
   * Uses Link header for pagination (V2) with fallback to sequential requests (V1)
   * By default returns lightweight gist list without file content for fast initial load.
   * File content is loaded on-demand when viewing individual gists.
   */
  async getAllGists(username: string): Promise<Gist[]> {
    console.debug(`${TAG} Getting all gists for ${username}`)

    let gistList: Gist[]
    try {
      gistList = await this.getAllGistsV2(username)
    } catch (error) {
      console.warn(`${TAG} V2 failed, falling back to V1`, error)
      gistList = await this.getAllGistsV1(username)
    }

    console.debug(`${TAG} Fetched ${gistList.length} gists (lightweight, no file content)`)

    return gistList.sort((a, b) =>
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    )
  }

  /**
   * Get all gists using Link header pagination (faster)
   */
  private async getAllGistsV2(username: string): Promise<Gist[]> {
    console.debug(`${TAG} [V2] Fetching gists with Link header pagination`)

    // Get first page
    const firstPage = await this.fetchGistPage(username, 1)
    const gists: Gist[] = firstPage.data

    // Parse Link header to get total pages
    const linkHeader = firstPage.headers.link
    if (!linkHeader) {
      console.debug(`${TAG} [V2] No Link header found (single page or 2FA)`)
      return gists
    }

    // Extract max page number from Link header
    // Format: <url?page=2>; rel="next", <url?page=5>; rel="last"
    const matches = linkHeader.match(/page=(\d+)/g)
    if (!matches || matches.length === 0) {
      return gists
    }

    const pageNumbers = matches.map((match: string) => parseInt(match.split('=')[1]))
    const maxPage = Math.max(...pageNumbers)

    console.debug(`${TAG} [V2] Found ${maxPage} total pages`)

    // Fetch remaining pages in parallel
    const pagePromises: Promise<Gist[]>[] = []
    for (let page = 2; page <= maxPage; page++) {
      pagePromises.push(
        this.fetchGistPage(username, page).then(response => response.data)
      )
    }

    const additionalPages = await Promise.all(pagePromises)
    additionalPages.forEach(pageGists => gists.push(...pageGists))

    // Sort by updated_at (newest first)
    return gists.sort((a, b) =>
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    )
  }

  /**
   * Get all gists using sequential pagination (fallback for 2FA)
   */
  private async getAllGistsV1(username: string): Promise<Gist[]> {
    console.debug(`${TAG} [V1] Fetching gists with sequential pagination`)

    const gists: Gist[] = []
    const maxPages = 100

    for (let page = 1; page <= maxPages; page++) {
      try {
        const response = await this.fetchGistPage(username, page)
        const pageGists = response.data

        if (pageGists.length === 0) {
          console.debug(`${TAG} [V1] Reached empty page at ${page}`)
          break
        }

        gists.push(...pageGists)
        console.debug(`${TAG} [V1] Page ${page}: ${pageGists.length} gists`)

        // If we got less than the max per page, we're done
        if (pageGists.length < GISTS_PER_PAGE) {
          break
        }
      } catch (error) {
        console.error(`${TAG} [V1] Error on page ${page}:`, error)
        break
      }
    }

    return gists
  }

  /**
   * Fetch a single page of gists
   */
  private async fetchGistPage(username: string, page: number) {
    return await this.client.get<Gist[]>(`/users/${username}/gists`, {
      params: {
        per_page: GISTS_PER_PAGE,
        page
      }
    })
  }

  /**
   * Create a new gist
   */
  async createGist(
    description: string,
    files: Record<string, { content: string }>,
    isPublic: boolean = true
  ): Promise<Gist> {
    console.debug(`${TAG} Creating new gist`)

    const response = await this.client.post<Gist>('/gists', {
      description,
      public: isPublic,
      files
    })

    return response.data
  }

  /**
   * Update an existing gist
   */
  async updateGist(
    gistId: string,
    description: string,
    files: Record<string, { content: string } | null>
  ): Promise<Gist> {
    console.debug(`${TAG} Updating gist ${gistId}`)

    const response = await this.client.patch<Gist>(`/gists/${gistId}`, {
      description,
      files
    })

    return response.data
  }

  /**
   * Delete a gist
   */
  async deleteGist(gistId: string): Promise<void> {
    console.debug(`${TAG} Deleting gist ${gistId}`)

    await this.client.delete(`/gists/${gistId}`)
  }

  /**
   * Get rate limit status
   */
  async getRateLimit() {
    const response = await this.client.get('/rate_limit')
    return response.data
  }

  /**
   * Get all starred gists for the authenticated user
   */
  async getStarredGists(): Promise<Gist[]> {
    console.debug(`${TAG} Getting starred gists`)

    const gists: Gist[] = []
    let page = 1
    const maxPages = 50

    while (page <= maxPages) {
      const response = await this.client.get<Gist[]>('/gists/starred', {
        params: {
          per_page: GISTS_PER_PAGE,
          page
        }
      })

      if (response.data.length === 0) break

      gists.push(...response.data)

      if (response.data.length < GISTS_PER_PAGE) break
      page++
    }

    console.debug(`${TAG} Found ${gists.length} starred gists`)
    return gists
  }

  /**
   * Check if a gist is starred
   */
  async isGistStarred(gistId: string): Promise<boolean> {
    try {
      await this.client.get(`/gists/${gistId}/star`)
      return true
    } catch (error: unknown) {
      if (error instanceof Error && 'response' in error) {
        const axiosError = error as { response?: { status: number } }
        if (axiosError.response?.status === 404) {
          return false
        }
      }
      throw error
    }
  }

  /**
   * Star a gist
   */
  async starGist(gistId: string): Promise<void> {
    console.debug(`${TAG} Starring gist ${gistId}`)
    await this.client.put(`/gists/${gistId}/star`)
  }

  /**
   * Unstar a gist
   */
  async unstarGist(gistId: string): Promise<void> {
    console.debug(`${TAG} Unstarring gist ${gistId}`)
    await this.client.delete(`/gists/${gistId}/star`)
  }

  /**
   * Find the Qepton settings gist (private gist with specific filename)
   */
  async findSettingsGist(): Promise<Gist | null> {
    console.debug(`${TAG} Looking for settings gist`)
    
    try {
      const response = await this.client.get<Gist[]>('/gists', {
        params: { per_page: 100 }
      })
      
      const settingsGist = response.data.find(gist => 
        !gist.public && 
        Object.keys(gist.files).some(name => name === '.qepton-settings.json')
      )
      
      if (settingsGist) {
        console.debug(`${TAG} Found settings gist: ${settingsGist.id}`)
        return await this.getSingleGist(settingsGist.id)
      }
      
      console.debug(`${TAG} No settings gist found`)
      return null
    } catch (error) {
      console.error(`${TAG} Error finding settings gist:`, error)
      return null
    }
  }

  /**
   * Create the Qepton settings gist
   */
  async createSettingsGist(settings: Record<string, unknown>): Promise<Gist> {
    console.debug(`${TAG} Creating settings gist`)
    
    return await this.createGist(
      'Qepton Settings (do not delete)',
      {
        '.qepton-settings.json': {
          content: JSON.stringify(settings, null, 2)
        }
      },
      false // private
    )
  }

  /**
   * Update the Qepton settings gist
   */
  async updateSettingsGist(gistId: string, settings: Record<string, unknown>): Promise<Gist> {
    console.debug(`${TAG} Updating settings gist ${gistId}`)
    
    return await this.updateGist(
      gistId,
      'Qepton Settings (do not delete)',
      {
        '.qepton-settings.json': {
          content: JSON.stringify(settings, null, 2)
        }
      }
    )
  }

  /**
   * Get settings from the settings gist
   */
  async getSettings(): Promise<{ gistId: string; settings: Record<string, unknown> } | null> {
    const gist = await this.findSettingsGist()
    if (!gist) return null
    
    try {
      const file = gist.files['.qepton-settings.json']
      if (!file?.content) return null
      
      return {
        gistId: gist.id,
        settings: JSON.parse(file.content)
      }
    } catch (error) {
      console.error(`${TAG} Error parsing settings:`, error)
      return null
    }
  }

  /**
   * Save settings to the settings gist (creates if doesn't exist)
   */
  async saveSettings(settings: Record<string, unknown>, existingGistId?: string): Promise<string> {
    if (existingGistId) {
      await this.updateSettingsGist(existingGistId, settings)
      return existingGistId
    }
    
    const gist = await this.createSettingsGist(settings)
    return gist.id
  }
}

// Export singleton instance
export const githubAPI = new GitHubAPIService()

// Export class for testing
export { GitHubAPIService }
