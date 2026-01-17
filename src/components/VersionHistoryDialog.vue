<template>
  <q-dialog
    :model-value="uiStore.modals.versionHistory"
    @update:model-value="handleClose"
    maximized
    transition-show="slide-up"
    transition-hide="slide-down"
    data-test="version-history-dialog"
  >
    <q-card class="version-history-dialog">
      <!-- Header -->
      <q-card-section class="row items-center q-pb-none bg-primary text-white">
        <q-icon name="history" size="sm" class="q-mr-sm" />
        <div class="text-h6">Version History</div>
        <q-space />
        <q-btn icon="close" flat round dense @click="handleClose" />
      </q-card-section>

      <q-card-section v-if="gistTitle" class="q-pt-sm q-pb-none">
        <div class="text-subtitle1 text-weight-medium">{{ gistTitle }}</div>
      </q-card-section>

      <!-- Loading State -->
      <q-card-section v-if="isLoading" class="flex flex-center q-py-xl">
        <q-spinner-dots size="40px" color="primary" />
        <span class="q-ml-sm text-grey-7">Loading version history...</span>
      </q-card-section>

      <!-- Error State -->
      <q-card-section v-else-if="error" class="text-center q-py-xl">
        <q-icon name="error" size="48px" color="negative" />
        <div class="text-h6 text-negative q-mt-md">Failed to load history</div>
        <div class="text-body2 text-grey-7 q-mt-sm">{{ error }}</div>
        <q-btn
          color="primary"
          label="Retry"
          class="q-mt-md"
          @click="loadHistory"
        />
      </q-card-section>

      <!-- Version List -->
      <q-card-section v-else-if="commits.length > 0" class="q-pa-none version-list-section">
        <q-list separator>
          <q-item
            v-for="(commit, index) in commits"
            :key="commit.version"
            clickable
            :active="selectedVersion === commit.version"
            @click="selectVersion(commit)"
            data-test="version-item"
          >
            <q-item-section avatar>
              <q-avatar v-if="commit.user?.avatar_url" size="32px">
                <img :src="commit.user.avatar_url" :alt="commit.user.login" />
              </q-avatar>
              <q-avatar v-else size="32px" color="grey-4" text-color="grey-7" icon="person" />
            </q-item-section>

            <q-item-section>
              <q-item-label>
                <span class="text-weight-medium">
                  {{ commit.user?.login || 'Unknown' }}
                </span>
                <q-badge
                  v-if="index === 0"
                  color="primary"
                  class="q-ml-sm"
                  label="Current"
                />
              </q-item-label>
              <q-item-label caption>
                {{ formatDate(commit.committed_at) }}
              </q-item-label>
            </q-item-section>

            <q-item-section side>
              <div class="text-caption">
                <span class="text-positive">+{{ commit.change_status.additions }}</span>
                <span class="q-mx-xs">/</span>
                <span class="text-negative">-{{ commit.change_status.deletions }}</span>
              </div>
              <q-item-label caption class="text-grey-6">
                {{ commit.version.substring(0, 7) }}
              </q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </q-card-section>

      <!-- Empty State -->
      <q-card-section v-else class="text-center q-py-xl">
        <q-icon name="history" size="48px" color="grey-5" />
        <div class="text-h6 text-grey-6 q-mt-md">No version history</div>
        <div class="text-body2 text-grey-5 q-mt-sm">
          This gist has no previous versions
        </div>
      </q-card-section>

      <!-- Selected Version Preview -->
      <q-card-section
        v-if="selectedVersionData"
        class="version-preview-section"
      >
        <q-separator class="q-mb-md" />
        <div class="row items-center q-mb-md">
          <div class="text-subtitle2">
            Version {{ selectedVersion?.substring(0, 7) }}
          </div>
          <q-space />
          <q-btn
            flat
            dense
            color="primary"
            icon="content_copy"
            label="Copy All"
            @click="copyVersionContent"
            data-test="copy-version-btn"
          />
        </div>

        <!-- Files in this version -->
        <div
          v-for="(file, filename) in selectedVersionData.files"
          :key="String(filename)"
          class="version-file q-mb-md"
        >
          <div class="file-header row items-center q-pa-sm">
            <q-icon name="insert_drive_file" size="sm" class="q-mr-sm" />
            <span class="text-weight-medium">{{ filename }}</span>
            <q-space />
            <q-btn
              flat
              dense
              size="sm"
              icon="content_copy"
              @click="copyFileContent(file.content)"
            >
              <q-tooltip>Copy file content</q-tooltip>
            </q-btn>
          </div>
          <pre class="file-content">{{ file.content || '(empty)' }}</pre>
        </div>
      </q-card-section>

      <!-- Footer -->
      <q-card-actions align="right" class="q-pa-md">
        <q-btn flat label="Close" @click="handleClose" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useUIStore } from 'src/stores/ui'
import { useGistsStore } from 'src/stores/gists'
import { githubAPI } from 'src/services/github-api'
import { parseDescription } from 'src/services/parser'
import type { GistCommit, GistVersion } from 'src/types/github'

const $q = useQuasar()
const uiStore = useUIStore()
const gistsStore = useGistsStore()

const isLoading = ref(false)
const error = ref<string | null>(null)
const commits = ref<GistCommit[]>([])
const selectedVersion = ref<string | null>(null)
const selectedVersionData = ref<GistVersion | null>(null)
const isLoadingVersion = ref(false)

const gistTitle = computed(() => {
  const gist = gistsStore.activeGist
  if (!gist) return ''
  const parsed = parseDescription(gist.description)
  return parsed.title || gist.description || 'Untitled'
})

// Load history when dialog opens
watch(
  () => uiStore.modals.versionHistory,
  async (isOpen) => {
    if (isOpen) {
      await loadHistory()
    } else {
      // Reset state when closing
      commits.value = []
      selectedVersion.value = null
      selectedVersionData.value = null
      error.value = null
    }
  }
)

async function loadHistory() {
  const gist = gistsStore.activeGist
  if (!gist) {
    error.value = 'No gist selected'
    return
  }

  isLoading.value = true
  error.value = null

  try {
    commits.value = await githubAPI.getGistCommits(gist.id)
  } catch (err) {
    console.error('Failed to load version history:', err)
    error.value = err instanceof Error ? err.message : 'Unknown error'
  } finally {
    isLoading.value = false
  }
}

async function selectVersion(commit: GistCommit) {
  if (selectedVersion.value === commit.version) {
    // Deselect if clicking the same version
    selectedVersion.value = null
    selectedVersionData.value = null
    return
  }

  const gist = gistsStore.activeGist
  if (!gist) return

  selectedVersion.value = commit.version
  isLoadingVersion.value = true

  try {
    selectedVersionData.value = await githubAPI.getGistVersion(gist.id, commit.version)
  } catch (err) {
    console.error('Failed to load version:', err)
    $q.notify({
      type: 'negative',
      message: 'Failed to load version content',
      icon: 'error'
    })
    selectedVersion.value = null
    selectedVersionData.value = null
  } finally {
    isLoadingVersion.value = false
  }
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor(diff / (1000 * 60))

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`

  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

async function copyFileContent(content: string | undefined) {
  if (!content) {
    $q.notify({
      type: 'warning',
      message: 'No content to copy',
      icon: 'warning',
      timeout: 2000
    })
    return
  }

  try {
    await navigator.clipboard.writeText(content)
    $q.notify({
      type: 'positive',
      message: 'Copied to clipboard',
      icon: 'check_circle',
      timeout: 1500
    })
  } catch {
    $q.notify({
      type: 'negative',
      message: 'Failed to copy',
      icon: 'error'
    })
  }
}

async function copyVersionContent() {
  if (!selectedVersionData.value) return

  const files = selectedVersionData.value.files
  const content = Object.entries(files)
    .map(([filename, file]) => `// ${filename}\n${file.content || ''}`)
    .join('\n\n')

  await copyFileContent(content)
}

function handleClose() {
  uiStore.closeModal('versionHistory')
}
</script>

<style lang="scss" scoped>
.version-history-dialog {
  display: flex;
  flex-direction: column;
  max-height: 100vh;
}

.version-list-section {
  flex: 1;
  overflow-y: auto;
  max-height: 300px;
}

.version-preview-section {
  flex: 1;
  overflow-y: auto;
}

.version-file {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
}

.file-header {
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
}

.file-content {
  margin: 0;
  padding: 12px 16px;
  font-family: 'Fira Code', monospace;
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-wrap: break-word;
  background: var(--bg-primary);
  max-height: 300px;
  overflow-y: auto;
}
</style>
