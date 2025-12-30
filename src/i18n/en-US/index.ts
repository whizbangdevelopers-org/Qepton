export default {
  app: {
    name: 'Qepton',
    tagline: 'Code Snippet Manager',
    version: 'Version {version}'
  },

  // Navigation & Layout
  nav: {
    allGists: 'All Gists',
    starred: 'Starred',
    languages: 'Languages',
    tags: 'Tags',
    settings: 'Settings'
  },

  // Authentication
  auth: {
    login: 'Login',
    logout: 'Logout',
    logoutConfirm: 'Are you sure you want to logout?',
    loginWithOAuth: 'Login with GitHub',
    loginWithToken: 'Login with Token',
    tokenPlaceholder: 'GitHub Personal Access Token',
    tokenHint: 'Paste your GitHub token with \'gist\' scope',
    tokenRequired: 'Token is required',
    invalidToken: 'Invalid GitHub token',
    generateToken: 'Generate a new token',
    welcome: 'Welcome, {name}!'
  },

  // Gists
  gists: {
    title: 'Gists',
    allGists: 'All Gists',
    create: 'New Gist',
    edit: 'Edit Gist',
    delete: 'Delete Gist',
    sync: 'Sync',
    syncing: 'Syncing...',
    lastSync: 'Last sync: {time}',
    noGists: 'No gists found',
    noResults: 'No gists match your search',
    loadingGists: 'Loading gists...',
    gistCount: '{count} Gist | {count} Gists',
    publicGist: 'Public',
    secretGist: 'Secret',
    created: 'Created {date}',
    updated: 'Updated {date}',
    files: '{count} file | {count} files',
    confirmDelete: 'Are you sure you want to delete this gist?',
    deleteSuccess: 'Gist deleted successfully',
    syncSuccess: 'Synced {count} gists',
    syncError: 'Failed to sync gists'
  },

  // Files
  files: {
    filename: 'Filename',
    language: 'Language',
    size: 'Size',
    content: 'Content',
    copy: 'Copy',
    copySuccess: 'Copied to clipboard',
    download: 'Download',
    raw: 'Raw'
  },

  // Search
  search: {
    placeholder: 'Search gists...',
    noResults: 'No results found',
    results: '{count} result | {count} results',
    filterByLanguage: 'Filter by language',
    filterByTag: 'Filter by tag',
    sortBy: 'Sort by',
    sortNewest: 'Newest first',
    sortOldest: 'Oldest first',
    sortName: 'Name A-Z'
  },

  // Tags
  tags: {
    title: 'Tags',
    noTags: 'No tags',
    addTag: 'Add tag',
    removeTag: 'Remove tag',
    pinnedTags: 'Pinned Tags',
    allTags: 'All Tags',
    tagCount: '{count} gist | {count} gists'
  },

  // Export
  export: {
    title: 'Export',
    exportGist: 'Export Gist',
    exportAll: 'Export All Gists',
    asJSON: 'Export as JSON',
    asMarkdown: 'Export as Markdown',
    includeMetadata: 'Include metadata',
    success: 'Exported {count} gist | Exported {count} gists',
    error: 'Export failed'
  },

  // Settings
  settings: {
    title: 'Settings',
    appearance: 'Appearance',
    theme: 'Theme',
    themeLight: 'Light',
    themeDark: 'Dark',
    themeAuto: 'System',
    language: 'Language',
    editor: 'Editor',
    fontSize: 'Font Size',
    lineNumbers: 'Show line numbers',
    wordWrap: 'Word wrap',
    notifications: 'Notifications',
    enableNotifications: 'Enable notifications',
    about: 'About',
    checkUpdates: 'Check for updates',
    version: 'Version',
    github: 'GitHub Repository'
  },

  // User
  user: {
    profile: 'Profile',
    gistCount: '{count} Gists',
    memberSince: 'Member since {date}'
  },

  // Actions
  actions: {
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    copy: 'Copy',
    share: 'Share',
    refresh: 'Refresh',
    close: 'Close',
    confirm: 'Confirm',
    back: 'Back',
    next: 'Next',
    loading: 'Loading...',
    retry: 'Retry'
  },

  // Errors
  errors: {
    generic: 'Something went wrong',
    network: 'Network error. Please check your connection.',
    unauthorized: 'Session expired. Please login again.',
    notFound: 'Not found',
    rateLimited: 'Rate limited. Please wait a moment.',
    serverError: 'Server error. Please try again later.'
  },

  // Time
  time: {
    justNow: 'Just now',
    minutesAgo: '{count} minute ago | {count} minutes ago',
    hoursAgo: '{count} hour ago | {count} hours ago',
    daysAgo: '{count} day ago | {count} days ago',
    yesterday: 'Yesterday',
    never: 'Never'
  }
}
