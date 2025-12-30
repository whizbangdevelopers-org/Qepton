<template>
  <div class="user-panel q-pa-md" data-test="user-menu">
    <!-- User Avatar & Info -->
    <div class="user-info text-center">
      <q-avatar size="80px" class="q-mb-md" data-test="user-avatar">
        <img :src="authStore.avatarUrl || defaultAvatar" alt="User avatar" />
      </q-avatar>

      <div class="text-h6 q-mb-xs" data-test="username">{{ authStore.username }}</div>
      <div v-if="authStore.fullName" class="text-caption text-grey-7 q-mb-sm">
        {{ authStore.fullName }}
      </div>

      <!-- Stats -->
      <div class="row justify-center q-gutter-sm q-mb-md">
        <q-chip dense size="sm" color="primary" text-color="white">
          <q-icon name="mdi-code-braces" size="xs" class="q-mr-xs" />
          {{ gistsStore.totalGists }} Gists
        </q-chip>
      </div>

      <!-- Last Sync Time -->
      <div v-if="gistsStore.lastSyncTime" class="text-caption text-grey-6 q-mb-md">
        Last sync: {{ formatLastSync }}
      </div>

      <!-- Action Buttons -->
      <div class="q-gutter-sm">
        <q-btn
          color="primary"
          icon="add"
          label="New Gist"
          size="sm"
          class="full-width"
          @click="uiStore.openModal('newGist')"
          data-test="new-gist-button"
        >
          <q-tooltip>Create New Gist (Cmd/Ctrl+N)</q-tooltip>
        </q-btn>
        <q-btn
          outline
          color="negative"
          icon="logout"
          label="Logout"
          size="sm"
          class="full-width"
          @click="handleLogout"
          data-test="logout-button"
        >
          <q-tooltip>Logout</q-tooltip>
        </q-btn>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'
import { useAuthStore } from 'src/stores/auth'
import { useGistsStore } from 'src/stores/gists'
import { useUIStore } from 'src/stores/ui'

const router = useRouter()
const $q = useQuasar()
const authStore = useAuthStore()
const gistsStore = useGistsStore()
const uiStore = useUIStore()

// Default avatar (GitHub Octocat)
const defaultAvatar = 'https://avatars.githubusercontent.com/u/9919?s=200&v=4'

// Computed properties
const formatLastSync = computed(() => {
  if (!gistsStore.lastSyncTime) return 'Never'

  const now = Date.now()
  const diff = now - gistsStore.lastSyncTime
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days === 1) return 'Yesterday'
  return `${days}d ago`
})

// Methods
function handleLogout() {
  $q.dialog({
    title: 'Logout',
    message: 'Are you sure you want to logout?',
    persistent: true,
    ok: {
      label: 'Logout',
      color: 'negative',
      'data-test': 'confirm-logout'
    },
    cancel: {
      label: 'Cancel',
      flat: true
    }
  }).onOk(() => {
    authStore.logout()
    router.push('/login')
  })
}
</script>

<style lang="scss" scoped>
.user-panel {
  background: var(--bg-primary);
  border-bottom: 1px solid var(--border-color);
}

.user-info {
  .q-avatar {
    border: 2px solid var(--q-primary);
  }
}
</style>
