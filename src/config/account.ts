/**
 * OAuth Account Configuration
 *
 * GitHub OAuth credentials for Lepton.
 * You need to create a GitHub OAuth App to use OAuth authentication:
 * https://github.com/settings/developers
 *
 * For token-based authentication, no configuration is needed here.
 */

export interface OAuthConfig {
  client_id: string
  client_secret: string
}

// Default OAuth configuration
// These can be overridden in ~/.leptonrc
export const oauthConfig: OAuthConfig = {
  // Your GitHub OAuth App client ID
  client_id: '',
  // Your GitHub OAuth App client secret
  client_secret: ''
}

// GitHub OAuth endpoints
export const githubOAuth = {
  authorizeUrl: 'https://github.com/login/oauth/authorize',
  accessTokenUrl: 'https://github.com/login/oauth/access_token',
  scope: 'gist'
}

// GitHub Enterprise support
export interface EnterpriseConfig {
  baseUrl: string
  apiUrl: string
}

export const defaultEnterpriseConfig: EnterpriseConfig = {
  baseUrl: 'https://github.com',
  apiUrl: 'https://api.github.com'
}
