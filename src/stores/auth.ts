/**
 * Auth Store
 * Manages user authentication state and GitHub token
 */

import { defineStore } from 'pinia'
import { githubAPI } from 'src/services/github-api'
import type { AuthState } from 'src/types/store'
import type { User } from 'src/types/github'

// Lazy imports to avoid circular dependency issues at module load time
// These are only used inside the logout() action after Pinia is initialized
let _useGistsStore: typeof import('./gists').useGistsStore | null = null
let _useSearchStore: typeof import('./search').useSearchStore | null = null
let _useSettingsStore: typeof import('./settings').useSettingsStore | null = null
let _useUiStore: typeof import('./ui').useUiStore | null = null

async function getGistsStore() {
  if (!_useGistsStore) {
    const module = await import('./gists')
    _useGistsStore = module.useGistsStore
  }
  return _useGistsStore()
}

async function getSearchStore() {
  if (!_useSearchStore) {
    const module = await import('./search')
    _useSearchStore = module.useSearchStore
  }
  return _useSearchStore()
}

async function getSettingsStore() {
  if (!_useSettingsStore) {
    const module = await import('./settings')
    _useSettingsStore = module.useSettingsStore
  }
  return _useSettingsStore()
}

async function getUiStore() {
  if (!_useUiStore) {
    const module = await import('./ui')
    _useUiStore = module.useUiStore
  }
  return _useUiStore()
}

// Demo user configuration
const DEMO_USERNAME = 'qepton-demo'
const DEMO_USER = {
  login: DEMO_USERNAME,
  id: 0,
  avatar_url: 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y&s=200',
  name: 'Demo User',
  public_gists: 0,
  html_url: `https://github.com/${DEMO_USERNAME}`,
  type: 'User'
} as User

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    accessToken: null,
    user: null,
    isAuthenticated: false,
    isLoading: false,
    isDemoMode: false,
    demoUsername: undefined
  }),

  getters: {
    /**
     * Get username
     */
    username: (state): string | undefined => state.user?.login,

    /**
     * Get avatar URL
     */
    avatarUrl: (state): string | undefined => state.user?.avatar_url,

    /**
     * Get user's full name
     */
    fullName: (state): string | undefined => state.user?.name,

    /**
     * Get user's email
     */
    email: (state): string | undefined => state.user?.email || undefined,

    /**
     * Get public gist count
     */
    publicGists: (state): number => state.user?.public_gists || 0
  },

  actions: {
    /**
     * Login with GitHub personal access token
     */
    async loginWithToken(token: string): Promise<void> {
      this.isLoading = true

      try {
        // Configure GitHub API with token
        githubAPI.setToken(token)

        // Fetch user profile to validate token
        const user = await githubAPI.getUserProfile()

        // Update state
        this.accessToken = token
        this.user = user
        this.isAuthenticated = true

        // Persist to localStorage
        localStorage.setItem('github-token', token)

        console.debug('[Auth] Login successful:', user.login)
      } catch (error) {
        console.error('[Auth] Login failed:', error)
        this.logout()
        throw new Error('Invalid GitHub token')
      } finally {
        this.isLoading = false
      }
    },

    /**
     * Login as demo user
     * If token provided, uses authenticated API for private gists
     * Otherwise uses unauthenticated API for public gists only
     */
    async loginAsDemo(token?: string): Promise<void> {
      this.isLoading = true

      try {
        if (token) {
          // Authenticated demo mode - can access private gists
          githubAPI.setToken(token)
          this.accessToken = token
        } else {
          // Unauthenticated demo mode - public gists only
          githubAPI.clearToken()
          this.accessToken = null
        }

        // Set demo user
        this.user = DEMO_USER
        this.isAuthenticated = true
        this.isDemoMode = true
        this.demoUsername = DEMO_USERNAME

        // Mark as demo mode in localStorage
        localStorage.setItem('qepton-demo-mode', 'true')

        console.debug('[Auth] Demo login successful', token ? '(authenticated)' : '(unauthenticated)')
      } finally {
        this.isLoading = false
      }
    },

    /**
     * Login with OAuth code
     */
    async loginWithOAuth(code: string, clientId: string, clientSecret: string): Promise<void> {
      this.isLoading = true

      try {
        // Exchange code for access token
        const response = await githubAPI.exchangeAccessToken(clientId, clientSecret, code)

        // Login with the received token
        await this.loginWithToken(response.access_token)

        console.debug('[Auth] OAuth login successful')
      } catch (error) {
        console.error('[Auth] OAuth login failed:', error)
        this.logout()
        throw new Error('OAuth authentication failed')
      } finally {
        this.isLoading = false
      }
    },

    /**
     * Logout (clear session)
     */
    async logout(): Promise<void> {
      const wasDemo = this.isDemoMode

      this.accessToken = null
      this.user = null
      this.isAuthenticated = false
      this.isDemoMode = false
      this.demoUsername = undefined

      // Clear from localStorage
      localStorage.removeItem('github-token')
      localStorage.removeItem('qepton-demo-mode')

      // Reset related stores (using lazy imports to avoid circular dependency)
      const gistsStore = await getGistsStore()
      gistsStore.$reset()

      const searchStore = await getSearchStore()
      searchStore.$reset()

      // In demo mode, also reset settings and UI to defaults
      // This ensures next demo user starts fresh
      if (wasDemo) {
        const settingsStore = await getSettingsStore()
        settingsStore.$reset()

        const uiStore = await getUiStore()
        uiStore.$reset()

        console.debug('[Auth] Demo logout - all settings reset to defaults')
      }

      console.debug('[Auth] Logged out')
    },

    /**
     * Restore session from localStorage
     */
    async restoreSession(): Promise<boolean> {
      const token = localStorage.getItem('github-token')

      if (!token) {
        return false
      }

      try {
        await this.loginWithToken(token)
        return true
      } catch (error) {
        console.warn('[Auth] Session restoration failed:', error)
        this.logout()
        return false
      }
    },

    /**
     * Refresh user profile
     */
    async refreshProfile(): Promise<void> {
      if (!this.isAuthenticated) {
        throw new Error('Not authenticated')
      }

      try {
        const user = await githubAPI.getUserProfile()
        this.user = user
        console.debug('[Auth] Profile refreshed')
      } catch (error) {
        console.error('[Auth] Profile refresh failed:', error)
        throw error
      }
    },

    /**
     * Update configuration (enterprise host, proxy)
     */
    updateConfig(config: { enterpriseHost?: string; proxyUri?: string }): void {
      if (config.enterpriseHost) {
        githubAPI.setEnterpriseHost(config.enterpriseHost)
        console.debug('[Auth] Enterprise host configured:', config.enterpriseHost)
      }

      if (config.proxyUri) {
        githubAPI.setProxy(config.proxyUri)
        console.debug('[Auth] Proxy configured:', config.proxyUri)
      }
    }
  },

  // Persist auth state - include isAuthenticated and user for immediate restore
  persist: {
    paths: ['accessToken', 'isAuthenticated', 'user', 'isDemoMode', 'demoUsername']
  }
})
