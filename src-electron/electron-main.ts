import { app, BrowserWindow, ipcMain, Menu, shell } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import os from 'os'
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
          label: 'View on GitHub',
          click: async () => {
            await shell.openExternal('https://github.com/hackjutsu/Lepton')
          }
        },
        {
          label: 'Report Issue',
          click: async () => {
            await shell.openExternal('https://github.com/hackjutsu/Lepton/issues')
          }
        }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

// Auto-updater
function setupAutoUpdater() {
  if (process.env.DEBUGGING) {
    return // Don't check for updates in development
  }

  autoUpdater.on('error', error => {
    console.error('Auto-updater error:', error)
  })

  autoUpdater.on('checking-for-update', () => {
    console.log('Checking for updates...')
  })

  autoUpdater.on('update-available', info => {
    console.log('Update available:', info.version)
    mainWindow?.webContents.send('update-available', info)
  })

  autoUpdater.on('update-not-available', () => {
    console.log('No updates available')
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

// Handle install/quit for auto-updater
ipcMain.handle('quit-and-install', async () => {
  autoUpdater.quitAndInstall()
})
