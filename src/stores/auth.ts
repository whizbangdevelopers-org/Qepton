/**
 * Auth Store
 * Manages user authentication state and GitHub token
 */

import { defineStore } from 'pinia'
import { githubAPI } from 'src/services/github-api'
import type { AuthState } from 'src/types/store'

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    accessToken: null,
    user: null,
    isAuthenticated: false,
    isLoading: false
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
    logout(): void {
      this.accessToken = null
      this.user = null
      this.isAuthenticated = false

      // Clear from localStorage
      localStorage.removeItem('github-token')

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
    paths: ['accessToken', 'isAuthenticated', 'user']
  }
})
