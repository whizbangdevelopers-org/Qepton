/**
 * Electron Preload Script
 * Exposes a secure API from the main process to the renderer process
 * using contextBridge for context isolation.
 */

import { contextBridge, ipcRenderer } from 'electron'

// Expose electronAPI to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // OAuth
  openOAuthWindow: () => ipcRenderer.invoke('open-oauth-window'),

  // Config
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (key: string, value: unknown) => ipcRenderer.invoke('save-config', key, value),

  // External links
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),

  // Menu event listeners
  onMenuNewGist: (callback: () => void) => {
    ipcRenderer.on('menu-new-gist', callback)
    return () => ipcRenderer.removeListener('menu-new-gist', callback)
  },
  onMenuSyncGists: (callback: () => void) => {
    ipcRenderer.on('menu-sync-gists', callback)
    return () => ipcRenderer.removeListener('menu-sync-gists', callback)
  },
  onMenuEditGist: (callback: () => void) => {
    ipcRenderer.on('menu-edit-gist', callback)
    return () => ipcRenderer.removeListener('menu-edit-gist', callback)
  },
  onMenuDeleteGist: (callback: () => void) => {
    ipcRenderer.on('menu-delete-gist', callback)
    return () => ipcRenderer.removeListener('menu-delete-gist', callback)
  },
  onMenuToggleImmersive: (callback: () => void) => {
    ipcRenderer.on('menu-toggle-immersive', callback)
    return () => ipcRenderer.removeListener('menu-toggle-immersive', callback)
  },
  onMenuToggleDashboard: (callback: () => void) => {
    ipcRenderer.on('menu-toggle-dashboard', callback)
    return () => ipcRenderer.removeListener('menu-toggle-dashboard', callback)
  },
  onMenuToggleSearch: (callback: () => void) => {
    ipcRenderer.on('menu-toggle-search', callback)
    return () => ipcRenderer.removeListener('menu-toggle-search', callback)
  },

  // Update listeners
  onUpdateAvailable: (callback: (event: Electron.IpcRendererEvent, info: UpdateInfo) => void) => {
    ipcRenderer.on('update-available', callback)
    return () => ipcRenderer.removeListener('update-available', callback)
  },
  onDownloadProgress: (
    callback: (event: Electron.IpcRendererEvent, progress: DownloadProgress) => void
  ) => {
    ipcRenderer.on('download-progress', callback)
    return () => ipcRenderer.removeListener('download-progress', callback)
  },
  onUpdateDownloaded: (callback: (event: Electron.IpcRendererEvent, info: UpdateInfo) => void) => {
    ipcRenderer.on('update-downloaded', callback)
    return () => ipcRenderer.removeListener('update-downloaded', callback)
  },

  // Update actions
  quitAndInstall: () => ipcRenderer.invoke('quit-and-install'),

  // Cleanup
  removeAllListeners: (channel: string) => ipcRenderer.removeAllListeners(channel)
})

// Type definitions for update info
interface UpdateInfo {
  version: string
  releaseDate: string
  releaseNotes?: string | null
}

interface DownloadProgress {
  bytesPerSecond: number
  percent: number
  transferred: number
  total: number
}

// Declare the electronAPI type for TypeScript
declare global {
  interface Window {
    electronAPI: {
      // OAuth
      openOAuthWindow: () => Promise<string>

      // Config
      getConfig: () => Promise<Record<string, unknown>>
      saveConfig: (key: string, value: unknown) => Promise<boolean>

      // External links
      openExternal: (url: string) => Promise<boolean>

      // Menu listeners (return cleanup function)
      onMenuNewGist: (callback: () => void) => () => void
      onMenuSyncGists: (callback: () => void) => () => void
      onMenuEditGist: (callback: () => void) => () => void
      onMenuDeleteGist: (callback: () => void) => () => void
      onMenuToggleImmersive: (callback: () => void) => () => void
      onMenuToggleDashboard: (callback: () => void) => () => void
      onMenuToggleSearch: (callback: () => void) => () => void

      // Update listeners (return cleanup function)
      onUpdateAvailable: (
        callback: (event: Electron.IpcRendererEvent, info: UpdateInfo) => void
      ) => () => void
      onDownloadProgress: (
        callback: (event: Electron.IpcRendererEvent, progress: DownloadProgress) => void
      ) => () => void
      onUpdateDownloaded: (
        callback: (event: Electron.IpcRendererEvent, info: UpdateInfo) => void
      ) => () => void

      // Update actions
      quitAndInstall: () => Promise<void>

      // Cleanup
      removeAllListeners: (channel: string) => void
    }
  }
}
