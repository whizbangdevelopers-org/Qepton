<template>
  <q-layout view="hHh lpR fFf">
    <!-- Update Banner (Electron only) -->
    <q-banner
      v-if="uiStore.updateAvailable && isElectron"
      class="update-banner bg-primary text-white"
      dense
    >
      <template v-slot:avatar>
        <q-icon name="system_update" />
      </template>
      <div>
        Update available: v{{ appVersion }} → v{{ uiStore.updateInfo?.version }}
        <q-btn
          v-if="uiStore.updateInfo?.releaseNotes"
          flat
          dense
          size="sm"
          color="white"
          label="What's New"
          class="q-ml-sm"
          @click="showReleaseNotes = true"
        />
      </div>
      <template v-slot:action>
        <q-btn
          flat
          color="white"
          label="Install & Restart"
          @click="installUpdate"
        />
        <q-btn
          flat
          color="white"
          label="Later"
          @click="uiStore.dismissUpdate"
        />
      </template>
    </q-banner>

    <!-- Release Notes Dialog -->
    <q-dialog v-model="showReleaseNotes">
      <q-card style="min-width: 400px; max-width: 600px;">
        <q-card-section class="row items-center">
          <div class="text-h6">What's New in v{{ uiStore.updateInfo?.version }}</div>
          <q-space />
          <q-btn icon="close" flat round dense @click="showReleaseNotes = false" />
        </q-card-section>
        <q-separator />
        <q-card-section class="release-notes-content">
          <div v-html="formattedReleaseNotes"></div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Later" @click="showReleaseNotes = false" />
          <q-btn color="primary" label="Install & Restart" @click="installUpdate" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Header (hidden in immersive mode) -->
    <q-header v-if="!uiStore.immersiveMode" elevated>
      <q-toolbar>
        <div class="logo-container">
          <img
            :src="logoUrl"
            alt="Qepton"
            class="toolbar-logo"
          />
        </div>

        <q-space />

        <!-- Search Button -->
        <q-btn
          flat
          round
          dense
          icon="search"
          @click="uiStore.openModal('search')"
          data-test="search-button"
        >
          <q-tooltip>Search (Shift+Space)</q-tooltip>
        </q-btn>

        <!-- Sync Button -->
        <q-btn
          flat
          round
          dense
          icon="sync"
          :loading="gistsStore.isSyncing"
          @click="handleSync"
          data-test="sync-button"
        >
          <q-tooltip>Sync Gists (Cmd/Ctrl+R)</q-tooltip>
        </q-btn>

        <!-- Dashboard Button -->
        <q-btn
          flat
          round
          dense
          icon="mdi-chart-box"
          @click="uiStore.openModal('dashboard')"
          data-test="dashboard-button"
        >
          <q-tooltip>Dashboard (Cmd/Ctrl+D)</q-tooltip>
        </q-btn>

        <!-- Theme Toggle -->
        <q-btn
          flat
          round
          dense
          :icon="$q.dark.isActive ? 'light_mode' : 'dark_mode'"
          @click="toggleTheme"
          data-test="theme-toggle"
        >
          <q-tooltip>Toggle Theme</q-tooltip>
        </q-btn>

        <!-- Help Button -->
        <q-btn
          flat
          round
          dense
          icon="help"
          @click="uiStore.openModal('help')"
          data-test="help-button"
        >
          <q-tooltip>Help</q-tooltip>
        </q-btn>

        <!-- Settings Button -->
        <q-btn
          flat
          round
          dense
          icon="settings"
          @click="uiStore.openModal('settings')"
          data-test="settings-button"
        >
          <q-tooltip>Settings</q-tooltip>
        </q-btn>

        <!-- About Button -->
        <q-btn
          flat
          round
          dense
          icon="info"
          @click="uiStore.openModal('about')"
          data-test="about-button"
        >
          <q-tooltip>About</q-tooltip>
        </q-btn>
      </q-toolbar>
    </q-header>

    <!-- Left Drawer: Navigation Panel -->
    <q-drawer
      v-if="!uiStore.immersiveMode"
      v-model="leftDrawerOpen"
      show-if-above
      bordered
      :width="280"
      data-test="navigation-panel"
    >
      <NavigationPanel />
    </q-drawer>

    <!-- Main Content -->
    <q-page-container>
      <router-view />
    </q-page-container>

    <!-- Dialogs -->
    <NewGistDialog />
    <EditGistDialog />
    <DeleteGistDialog />
    <SearchDialog />
    <AboutDialog />
    <CloneGistDialog />
    <DashboardDialog />
    <HelpDialog />
    <LogoutDialog />
    <PinnedTagsDialog />
    <RawGistDialog />
    <SettingsDialog />
    <VersionHistoryDialog />
  </q-layout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useQuasar } from 'quasar'
import { useUIStore } from 'src/stores/ui'
import { useGistsStore } from 'src/stores/gists'
import { themeService } from 'src/services/theme'
import logoUrl from 'src/assets/images/logos/qepton-wordmark.svg'
import NavigationPanel from 'src/components/NavigationPanel.vue'
import NewGistDialog from 'src/components/NewGistDialog.vue'
import EditGistDialog from 'src/components/EditGistDialog.vue'
import DeleteGistDialog from 'src/components/DeleteGistDialog.vue'
import SearchDialog from 'src/components/SearchDialog.vue'
import AboutDialog from 'src/components/AboutDialog.vue'
import CloneGistDialog from 'src/components/CloneGistDialog.vue'
import DashboardDialog from 'src/components/DashboardDialog.vue'
import HelpDialog from 'src/components/HelpDialog.vue'
import LogoutDialog from 'src/components/LogoutDialog.vue'
import PinnedTagsDialog from 'src/components/PinnedTagsDialog.vue'
import RawGistDialog from 'src/components/RawGistDialog.vue'
import SettingsDialog from 'src/components/SettingsDialog.vue'
import VersionHistoryDialog from 'src/components/VersionHistoryDialog.vue'

const $q = useQuasar()
const uiStore = useUIStore()
const gistsStore = useGistsStore()

const leftDrawerOpen = ref(true)
const showReleaseNotes = ref(false)

// App version and platform detection
// eslint-disable-next-line no-undef
const appVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0'
const isElectron = typeof window !== 'undefined' && 'electronAPI' in window

// Format release notes (handle markdown-ish content from GitHub)
const formattedReleaseNotes = computed(() => {
  const notes = uiStore.updateInfo?.releaseNotes
  if (!notes) return ''
  // Basic markdown-like formatting
  return notes
    .replace(/^### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^## (.+)$/gm, '<h3>$1</h3>')
    .replace(/^# (.+)$/gm, '<h2>$1</h2>')
    .replace(/^\* (.+)$/gm, '<li>$1</li>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\n\n/g, '<br><br>')
})

// Install update (Electron only)
function installUpdate() {
  showReleaseNotes.value = false
  if (window.electronAPI) {
    window.electronAPI.quitAndInstall()
  }
}

function toggleTheme() {
  themeService.toggleTheme()
}

async function handleSync() {
  try {
    await Promise.all([gistsStore.syncGists(), gistsStore.syncStarredGists()])
    $q.notify({
      type: 'positive',
      message: `Synced ${gistsStore.totalGists} gists`,
      icon: 'check_circle'
    })
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: 'Sync failed. Please check your connection.',
      icon: 'error'
    })
  }
}

// Keyboard shortcuts
function handleKeyDown(event: KeyboardEvent) {
  const isMac = navigator.userAgent.toUpperCase().indexOf('MAC') >= 0
  const cmdOrCtrl = isMac ? event.metaKey : event.ctrlKey

  // Cmd/Ctrl + R: Sync
  if (cmdOrCtrl && event.key === 'r') {
    event.preventDefault()
    handleSync()
  }

  // Cmd/Ctrl + N: New Gist
  if (cmdOrCtrl && event.key === 'n') {
    event.preventDefault()
    uiStore.openModal('newGist')
  }

  // Cmd/Ctrl + E: Edit Gist
  if (cmdOrCtrl && event.key === 'e' && gistsStore.activeGist) {
    event.preventDefault()
    uiStore.openModal('editGist')
  }

  // Cmd/Ctrl + D: Dashboard
  if (cmdOrCtrl && event.key === 'd') {
    event.preventDefault()
    uiStore.toggleModal('dashboard')
  }

  // Cmd/Ctrl + I: Immersive Mode
  if (cmdOrCtrl && event.key === 'i') {
    event.preventDefault()
    uiStore.toggleImmersiveMode()
  }

  // Shift + Space: Search
  if (event.shiftKey && event.code === 'Space') {
    event.preventDefault()
    uiStore.openModal('search')
  }

  // Escape: Close modals or exit immersive mode
  if (event.key === 'Escape') {
    if (uiStore.isAnyModalOpen) {
      uiStore.closeAllModals()
    } else if (uiStore.immersiveMode) {
      uiStore.toggleImmersiveMode()
    }
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})
</script>

<style lang="scss" scoped>
.q-toolbar {
  background: linear-gradient(135deg, #1a1a2e 0%, #2d2d44 100%);
  color: white;
  min-height: 64px;
  padding: 8px 16px;
}

.logo-container {
  width: 280px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.toolbar-logo {
  height: 48px;
  width: auto;
}

.update-banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 9999;
}

.release-notes-content {
  max-height: 400px;
  overflow-y: auto;

  :deep(h2),
  :deep(h3),
  :deep(h4) {
    margin: 0.5em 0;
    color: var(--q-primary);
  }

  :deep(ul) {
    margin: 0.5em 0;
    padding-left: 1.5em;
  }

  :deep(li) {
    margin: 0.25em 0;
  }

  :deep(code) {
    background: rgba(0, 0, 0, 0.1);
    padding: 0.1em 0.3em;
    border-radius: 3px;
    font-family: monospace;
  }
}
</style>
