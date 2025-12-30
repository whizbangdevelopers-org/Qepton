/**
 * Pinia Store Type Definitions
 */

import type { Gist, User } from './github'

// ============================================================================
// Auth Store Types
// ============================================================================

export interface AuthState {
  accessToken: string | null
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
}

// ============================================================================
// Gists Store Types
// ============================================================================

export interface RecentGist {
  id: string
  viewedAt: number
}

export interface GistsState {
  // Gists data
  gists: Record<string, Gist>

  // Track which gists have full content loaded (lazy loading optimization)
  loadedGistIds: Set<string>
  loadingGistId: string | null

  // Tag indexing (tag name -> Set of gist IDs)
  gistTags: Record<string, Set<string>>

  // Pinned tags for quick access
  pinnedTags: string[]

  // Starred gists (GitHub stars feature)
  starredGistIds: Set<string>
  starredGists: Record<string, Gist>

  // Recently viewed gists (max 10)
  recentGists: RecentGist[]

  // Active selections
  activeGistId: string | null
  activeTag: string

  // Sync state
  isSyncing: boolean
  lastSyncTime: number | null
  syncError: string | null
}

export interface TagInfo {
  name: string
  count: number
  gistIds: string[]
  type: 'language' | 'custom'
}

// ============================================================================
// UI Store Types
// ============================================================================

export interface ModalStates {
  newGist: boolean
  editGist: boolean
  deleteGist: boolean
  rawGist: boolean
  about: boolean
  dashboard: boolean
  search: boolean
  logout: boolean
  pinnedTags: boolean
  settings: boolean
}

export interface NavDrawerSettings {
  languagesVisible: boolean
  languagesExpanded: boolean
  tagsVisible: boolean
  tagsExpanded: boolean
}

export interface UIState {
  // Modal states
  modals: ModalStates

  // Raw gist modal payload
  rawGistContent: string | null

  // UI modes
  immersiveMode: boolean

  // File expansion tracking (gistId:filename -> boolean)
  expandedFiles: Record<string, boolean>

  // Update notification
  updateAvailable: boolean
  updateInfo: UpdateInfo | null

  // File preview settings
  previewLines: number

  // Navigation drawer settings
  navDrawers: NavDrawerSettings
}

export interface UpdateInfo {
  version: string
  releaseNotes: string | null
  releaseDate: string
  downloadUrl: string
}

// ============================================================================
// Search Store Types
// ============================================================================

export interface SavedSearch {
  id: string
  query: string
  name: string
  createdAt: number
}

export type VisibilityFilter = 'all' | 'public' | 'private'
export type DateRangeFilter = 'all' | 'today' | 'week' | 'month' | 'year'

export interface SearchFilters {
  visibility: VisibilityFilter
  languages: string[]
  dateRange: DateRangeFilter
}

export interface SearchState {
  query: string
  results: Gist[]
  isSearching: boolean
  savedSearches: SavedSearch[]
  filters: SearchFilters
}

// ============================================================================
// Config Store Types
// ============================================================================

export interface ConfigState {
  // Proxy settings
  proxyEnabled: boolean
  proxyAddress: string

  // Enterprise GitHub
  enterpriseEnabled: boolean
  enterpriseHost: string

  // UI preferences
  theme: 'light' | 'dark' | 'auto'

  // Editor preferences
  editorFontSize: number
  editorTabSize: number

  // Sync preferences
  autoSync: boolean
  syncInterval: number // minutes
}
