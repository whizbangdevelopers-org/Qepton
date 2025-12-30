// GitHub API Response Types

export interface GistOwner {
  login: string
  id: number
  avatar_url: string
  gravatar_id: string
  url: string
  html_url: string
  followers_url: string
  following_url: string
  gists_url: string
  starred_url: string
  subscriptions_url: string
  organizations_url: string
  repos_url: string
  events_url: string
  received_events_url: string
  type: string
  site_admin: boolean
}

export interface GistFile {
  filename: string
  type: string
  language: string | null
  raw_url: string
  size: number
  truncated?: boolean
  content?: string
}

export interface Gist {
  id: string
  url: string
  forks_url: string
  commits_url: string
  node_id: string
  git_pull_url: string
  git_push_url: string
  html_url: string
  files: Record<string, GistFile>
  public: boolean
  created_at: string
  updated_at: string
  description: string
  comments: number
  user: null
  comments_url: string
  owner: GistOwner
  truncated: boolean
  forks?: unknown[]
  history?: unknown[]
}

export interface User {
  login: string
  id: number
  node_id: string
  avatar_url: string
  gravatar_id: string
  url: string
  html_url: string
  followers_url: string
  following_url: string
  gists_url: string
  starred_url: string
  subscriptions_url: string
  organizations_url: string
  repos_url: string
  events_url: string
  received_events_url: string
  type: string
  site_admin: boolean
  name: string
  company: string | null
  blog: string
  location: string | null
  email: string | null
  hireable: boolean | null
  bio: string | null
  twitter_username: string | null
  public_repos: number
  public_gists: number
  followers: number
  following: number
  created_at: string
  updated_at: string
}

export interface OAuthTokenResponse {
  access_token: string
  token_type: string
  scope: string
}

export interface GitHubAPIConfig {
  token?: string
  enterpriseHost?: string
  proxyUri?: string
  userAgent?: string
}
