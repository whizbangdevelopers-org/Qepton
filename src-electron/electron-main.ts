import { app, BrowserWindow, ipcMain, Menu, shell } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import os from 'os'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)
import electronUpdater from 'electron-updater'
const { autoUpdater } = electronUpdater
import windowStateKeeper from 'electron-window-state'
import nconf from 'nconf'

// ESM compatibility - __dirname is not available in ESM
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// needed in case process is undefined under Linux
const platform = process.platform || os.platform()

let mainWindow: BrowserWindow | undefined

// OAuth configuration - will be loaded from config
let oauthClientId = ''

// Load configuration from .leptonrc
function loadConfig() {
  const configPath = path.join(app.getPath('home'), '.leptonrc')
  nconf.file({ file: configPath })
  oauthClientId = nconf.get('client_id') || ''
  return nconf.get()
}

function createWindow() {
  // Load config on startup
  loadConfig()

  // Window state persistence
  const mainWindowState = windowStateKeeper({
    defaultWidth: 1100,
    defaultHeight: 800
  })

  mainWindow = new BrowserWindow({
    x: mainWindowState.x,
    y: mainWindowState.y,
    width: mainWindowState.width,
    height: mainWindowState.height,
    minWidth: 636,
    minHeight: 609,
    useContentSize: true,
    icon: path.resolve(__dirname, 'icons/icon.png'),
    webPreferences: {
      contextIsolation: true,
      preload: path.resolve(
        __dirname,
        process.env.QUASAR_ELECTRON_PRELOAD || 'electron-preload.cjs'
      )
    }
  })

  // Track window state
  mainWindowState.manage(mainWindow)

  // Load the app URL - in dev it's from env, in production it's the local index.html
  const appUrl = process.env.APP_URL || `file://${path.join(__dirname, 'index.html')}`
  mainWindow.loadURL(appUrl)

  if (process.env.DEBUGGING) {
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.webContents.on('devtools-opened', () => {
      mainWindow?.webContents.closeDevTools()
    })
  }

  mainWindow.on('closed', () => {
    mainWindow = undefined
  })

  // Setup menu and auto-updater
  setupMenu()
  setupAutoUpdater()
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === undefined) {
    createWindow()
  }
})

// IPC Handlers
ipcMain.handle('open-oauth-window', async () => {
  return new Promise((resolve, reject) => {
    if (!oauthClientId) {
      reject(new Error('OAuth client_id not configured in .leptonrc'))
      return
    }

    const authWindow = new BrowserWindow({
      width: 800,
      height: 600,
      show: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    })

    const authUrl = `https://github.com/login/oauth/authorize?client_id=${oauthClientId}&scope=gist`

    authWindow.loadURL(authUrl)

    // Handle redirect to get OAuth code
    authWindow.webContents.on('will-redirect', (_event, url) => {
      try {
        const parsedUrl = new URL(url)
        const code = parsedUrl.searchParams.get('code')
        if (code) {
          authWindow.close()
          resolve(code)
        }
      } catch (e) {
        // URL parsing failed, ignore
      }
    })

    // Also handle will-navigate for some OAuth flows
    authWindow.webContents.on('will-navigate', (_event, url) => {
      try {
        const parsedUrl = new URL(url)
        const code = parsedUrl.searchParams.get('code')
        if (code) {
          authWindow.close()
          resolve(code)
        }
      } catch (e) {
        // URL parsing failed, ignore
      }
    })

    authWindow.on('closed', () => {
      reject(new Error('Authentication window was closed'))
    })
  })
})

ipcMain.handle('get-config', async () => {
  return loadConfig()
})

ipcMain.handle('save-config', async (_, key: string, value: unknown) => {
  nconf.set(key, value)
  nconf.save((err: Error | null) => {
    if (err) {
      console.error('Error saving config:', err)
    }
  })
  return true
})

ipcMain.handle('open-external', async (_, url: string) => {
  await shell.openExternal(url)
  return true
})

// Retrieve GitHub token from gh CLI (for NixOS/CLI users with keyring-based auth)
ipcMain.handle('get-gh-token', async () => {
  try {
    const { stdout } = await execAsync('gh auth token', { timeout: 5000 })
    const token = stdout.trim()
    if (token && token.startsWith('gh')) {
      return { success: true, token }
    }
    return { success: false, error: 'No valid token found' }
  } catch (error) {
    // gh CLI not installed or not authenticated
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to retrieve token from gh CLI'
    }
  }
})

// Menu setup
function setupMenu() {
  const isMac = platform === 'darwin'

  const template: Electron.MenuItemConstructorOptions[] = [
    // App menu (macOS only)
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' as const },
              { type: 'separator' as const },
              { role: 'services' as const },
              { type: 'separator' as const },
              { role: 'hide' as const },
              { role: 'hideOthers' as const },
              { role: 'unhide' as const },
              { type: 'separator' as const },
              { role: 'quit' as const }
            ]
          }
        ]
      : []),

    // File menu
    {
      label: 'File',
      submenu: [
        {
          label: 'New Gist',
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow?.webContents.send('menu-new-gist')
        },
        {
          label: 'Sync Gists',
          accelerator: 'CmdOrCtrl+R',
          click: () => mainWindow?.webContents.send('menu-sync-gists')
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
    },

    // Edit menu
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { type: 'separator' },
        {
          label: 'Edit Gist',
          accelerator: 'CmdOrCtrl+E',
          click: () => mainWindow?.webContents.send('menu-edit-gist')
        },
        {
          label: 'Delete Gist',
          accelerator: 'CmdOrCtrl+Backspace',
          click: () => mainWindow?.webContents.send('menu-delete-gist')
        }
      ]
    },

    // View menu
    {
      label: 'View',
      submenu: [
        {
          label: 'Immersive Mode',
          accelerator: 'CmdOrCtrl+I',
          click: () => mainWindow?.webContents.send('menu-toggle-immersive')
        },
        {
          label: 'Dashboard',
          accelerator: 'CmdOrCtrl+D',
          click: () => mainWindow?.webContents.send('menu-toggle-dashboard')
        },
        {
          label: 'Search',
          accelerator: 'Shift+Space',
          click: () => mainWindow?.webContents.send('menu-toggle-search')
        },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },

    // Window menu
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac
          ? [
              { type: 'separator' as const },
              { role: 'front' as const },
              { type: 'separator' as const },
              { role: 'window' as const }
            ]
          : [{ role: 'close' as const }])
      ]
    },

    // Help menu
    {
      role: 'help',
      submenu: [
        {
          label: 'Check for Updates...',
          click: () => {
            checkForUpdatesManually()
          }
        },
        { type: 'separator' },
        {
          label: 'View on GitHub',
          click: async () => {
            await shell.openExternal('https://github.com/whizbangdevelopers-org/Qepton')
          }
        },
        {
          label: 'Report Issue',
          click: async () => {
            await shell.openExternal('https://github.com/whizbangdevelopers-org/Qepton/issues')
          }
        }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

// Track if manual update check is in progress
let isManualUpdateCheck = false

// Auto-updater
function setupAutoUpdater() {
  if (process.env.DEBUGGING) {
    return // Don't check for updates in development
  }

  autoUpdater.on('error', error => {
    console.error('Auto-updater error:', error)
    if (isManualUpdateCheck) {
      mainWindow?.webContents.send('update-check-result', {
        type: 'error',
        message: error.message || 'Update check failed'
      })
      isManualUpdateCheck = false
    }
  })

  autoUpdater.on('checking-for-update', () => {
    console.log('Checking for updates...')
  })

  autoUpdater.on('update-available', info => {
    console.log('Update available:', info.version)
    mainWindow?.webContents.send('update-available', info)
    if (isManualUpdateCheck) {
      isManualUpdateCheck = false
    }
  })

  autoUpdater.on('update-not-available', info => {
    console.log('No updates available')
    if (isManualUpdateCheck) {
      mainWindow?.webContents.send('update-check-result', {
        type: 'up-to-date',
        version: info.version
      })
      isManualUpdateCheck = false
    }
  })

  autoUpdater.on('download-progress', progressObj => {
    mainWindow?.webContents.send('download-progress', progressObj)
  })

  autoUpdater.on('update-downloaded', info => {
    mainWindow?.webContents.send('update-downloaded', info)
  })

  // Check for updates after a short delay
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(err => {
      console.log('Update check failed (this is normal for development builds):', err.message)
    })
  }, 3000)
}

// Manual update check (triggered from menu)
function checkForUpdatesManually() {
  if (process.env.DEBUGGING) {
    mainWindow?.webContents.send('update-check-result', {
      type: 'error',
      message: 'Update checks are disabled in development mode'
    })
    return
  }

  isManualUpdateCheck = true
  mainWindow?.webContents.send('update-check-result', { type: 'checking' })

  autoUpdater.checkForUpdates().catch(err => {
    console.error('Manual update check failed:', err.message)
    mainWindow?.webContents.send('update-check-result', {
      type: 'error',
      message: err.message || 'Update check failed'
    })
    isManualUpdateCheck = false
  })
}

// Handle install/quit for auto-updater
ipcMain.handle('quit-and-install', async () => {
  autoUpdater.quitAndInstall()
})

// Handle manual update check from renderer
ipcMain.handle('check-for-updates', async () => {
  checkForUpdatesManually()
})
