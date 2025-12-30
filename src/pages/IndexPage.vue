<template>
  <q-page class="home-page" data-test="snippet-panel">
    <!-- Pull to Refresh for Mobile -->
    <q-pull-to-refresh @refresh="handlePullToRefresh" color="primary">
      <div class="gist-list q-pa-md" data-test="gist-list">
        <!-- Header - Always visible -->
        <div class="gist-list-header q-mb-md">
          <div class="row items-center">
            <h5 class="text-h5 q-my-none q-mr-sm">
              {{ activeTagName }}
            </h5>
            <q-chip v-if="!gistsStore.isSyncing || hasGists" dense color="primary" text-color="white">
              {{ filteredGists.length }}
            </q-chip>
            <q-spinner v-else size="16px" color="primary" class="q-ml-xs" />
          </div>
        </div>

        <!-- Global Search Bar - Always visible -->
      <div class="search-bar q-mb-md">
        <div class="row items-center q-gutter-sm">
          <q-input
            ref="searchInputRef"
            v-model="searchQuery"
            placeholder="Search gists... (⌘K) or /regex/"
            outlined
            dense
            clearable
            class="col"
            :error="searchStore.isRegexQuery && !searchStore.isValidRegex"
            :hint="searchStore.isRegexQuery ? (searchStore.isValidRegex ? 'Regex mode' : 'Invalid regex pattern') : ''"
            hide-hint
            data-test="global-search-input"
          >
            <template #prepend>
              <q-icon :name="searchStore.isRegexQuery ? 'mdi-regex' : 'search'" :color="searchStore.isRegexQuery ? 'purple' : undefined" />
            </template>
            <template #append>
              <q-chip
                v-if="searchStore.isRegexQuery && searchStore.isValidRegex"
                dense
                size="sm"
                color="purple"
                text-color="white"
                class="q-mr-xs"
              >
                regex
              </q-chip>
              <q-badge v-if="searchQuery && filteredGists.length !== displayedGists.length" color="primary" class="q-mr-xs">
                {{ filteredGists.length }} / {{ displayedGists.length }}
              </q-badge>
            </template>
          </q-input>

          <q-btn
            v-if="searchQuery && searchQuery.length >= 2 && !searchStore.isCurrentQuerySaved"
            flat
            dense
            round
            icon="bookmark_add"
            color="primary"
            @click="handleSaveSearch"
            data-test="save-search-btn"
          >
            <q-tooltip>Save this search</q-tooltip>
          </q-btn>

          <q-btn
            flat
            dense
            round
            icon="history"
            :color="searchStore.savedSearches.length > 0 ? 'primary' : 'grey'"
            :disable="searchStore.savedSearches.length === 0"
            data-test="saved-searches-btn"
          >
            <q-tooltip>Saved searches</q-tooltip>
            <q-menu anchor="bottom right" self="top right" data-test="saved-searches-menu">
              <q-list style="min-width: 250px; max-width: 350px">
                <q-item-label header class="text-weight-bold">
                  Saved Searches
                </q-item-label>
                <q-separator />
                <q-item
                  v-for="saved in searchStore.sortedSavedSearches"
                  :key="saved.id"
                  clickable
                  v-close-popup
                  @click="applySavedSearch(saved)"
                  data-test="saved-search-item"
                >
                  <q-item-section avatar>
                    <q-icon name="search" size="sm" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>{{ saved.name }}</q-item-label>
                    <q-item-label v-if="saved.name !== saved.query" caption class="text-grey">
                      {{ saved.query }}
                    </q-item-label>
                  </q-item-section>
                  <q-item-section side>
                    <q-btn
                      flat
                      dense
                      round
                      size="sm"
                      icon="delete"
                      color="negative"
                      @click.stop="deleteSavedSearch(saved.id)"
                      data-test="delete-saved-search-btn"
                    >
                      <q-tooltip>Delete</q-tooltip>
                    </q-btn>
                  </q-item-section>
                </q-item>
                <q-item v-if="searchStore.savedSearches.length === 0">
                  <q-item-section class="text-center text-grey">
                    No saved searches yet
                  </q-item-section>
                </q-item>
              </q-list>
            </q-menu>
          </q-btn>
        </div>

        <!-- Filter Chips -->
        <div class="filter-chips row items-center q-gutter-xs q-mt-sm">
          <!-- Visibility Filter -->
          <q-btn-toggle
            :model-value="searchStore.filters.visibility"
            @update:model-value="searchStore.setVisibilityFilter"
            dense
            no-caps
            rounded
            toggle-color="primary"
            size="sm"
            :options="[
              { label: 'All', value: 'all' },
              { label: 'Public', value: 'public' },
              { label: 'Private', value: 'private' }
            ]"
            data-test="visibility-filter"
          />

          <q-separator vertical class="q-mx-xs" />

          <!-- Language Filter Dropdown -->
          <q-btn
            dense
            flat
            no-caps
            size="sm"
            icon="mdi-code-tags"
            :label="searchStore.filters.languages.length > 0 ? `Languages (${searchStore.filters.languages.length})` : 'Languages'"
            :color="searchStore.filters.languages.length > 0 ? 'primary' : 'grey-7'"
            data-test="language-filter-btn"
          >
            <q-menu anchor="bottom left" self="top left" data-test="language-filter-menu">
              <q-list dense style="min-width: 180px; max-height: 300px" class="scroll">
                <q-item-label header class="text-caption">Filter by Language</q-item-label>
                <q-item
                  v-for="lang in gistsStore.languageTags"
                  :key="lang"
                  clickable
                  dense
                  @click="searchStore.toggleLanguageFilter(lang)"
                >
                  <q-item-section side>
                    <q-checkbox
                      :model-value="searchStore.filters.languages.includes(lang)"
                      dense
                      @update:model-value="searchStore.toggleLanguageFilter(lang)"
                    />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label>{{ formatLangName(lang) }}</q-item-label>
                  </q-item-section>
                </q-item>
                <q-item v-if="gistsStore.languageTags.length === 0">
                  <q-item-section class="text-grey text-center">
                    No languages found
                  </q-item-section>
                </q-item>
              </q-list>
            </q-menu>
          </q-btn>

          <!-- Date Range Filter -->
          <q-btn
            dense
            flat
            no-caps
            size="sm"
            icon="event"
            :label="dateRangeLabel"
            :color="searchStore.filters.dateRange !== 'all' ? 'primary' : 'grey-7'"
            data-test="date-filter-btn"
          >
            <q-menu anchor="bottom left" self="top left">
              <q-list dense style="min-width: 150px">
                <q-item
                  v-for="option in dateRangeOptions"
                  :key="option.value"
                  clickable
                  v-close-popup
                  :active="searchStore.filters.dateRange === option.value"
                  @click="searchStore.setDateRangeFilter(option.value)"
                >
                  <q-item-section>{{ option.label }}</q-item-section>
                </q-item>
              </q-list>
            </q-menu>
          </q-btn>

          <!-- Active Language Chips -->
          <template v-if="searchStore.filters.languages.length > 0">
            <q-separator vertical class="q-mx-xs" />
            <q-chip
              v-for="lang in searchStore.filters.languages"
              :key="lang"
              dense
              removable
              color="primary"
              text-color="white"
              size="sm"
              @remove="searchStore.removeLanguageFilter(lang)"
              data-test="active-language-chip"
            >
              {{ formatLangName(lang) }}
            </q-chip>
          </template>

          <!-- Clear Filters -->
          <q-btn
            v-if="searchStore.hasActiveFilters"
            dense
            flat
            no-caps
            size="sm"
            icon="clear"
            label="Clear"
            color="grey-7"
            @click="searchStore.clearFilters"
            data-test="clear-filters-btn"
          />
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="gistsStore.isSyncing && !isPullRefreshing && !hasGists" class="flex flex-center q-py-xl">
        <div class="text-center">
          <q-spinner-gears size="60px" color="primary" />
          <p class="text-subtitle1 q-mt-md text-grey-7">Syncing gists...</p>
        </div>
      </div>

      <!-- Empty State: No Gists -->
      <div v-else-if="!hasGists" class="flex flex-center q-py-xl">
        <div class="text-center q-pa-md">
          <q-icon name="mdi-code-braces" size="80px" color="grey-5" />
          <h5 class="text-h5 q-mt-md q-mb-sm">No Gists Yet</h5>
          <p class="text-subtitle2 text-grey-7 q-mb-lg">
            Create your first gist or sync from GitHub
          </p>
          <div class="q-gutter-sm">
            <q-btn
              color="primary"
              label="Sync from GitHub"
              icon="sync"
              size="sm"
              :loading="gistsStore.isSyncing"
              @click="handleSync"
            />
          </div>
        </div>
      </div>

      <!-- Gist Cards with Virtual Scroll for Performance -->
      <q-virtual-scroll
        v-else
        :items="filteredGists"
        :virtual-scroll-item-size="88"
        class="gist-virtual-scroll"
        v-slot="{ item: gist, index }"
      >
        <q-item
          :key="gist.id"
          clickable
          :active="gistsStore.activeGistId === gist.id"
          @click="selectGist(gist.id)"
          data-test="gist-item"
          class="gist-item"
          :class="{ 'border-top': index > 0 }"
        >
          <q-item-section>
            <q-item-label class="text-weight-bold">
              {{ getGistTitle(gist) }}
            </q-item-label>
            <q-item-label caption lines="2">
              {{ getGistDescription(gist) }}
            </q-item-label>
            <q-item-label caption class="q-mt-xs">
              <q-chip
                v-for="file in Object.keys(gist.files || {}).slice(0, 3)"
                :key="file"
                dense
                size="sm"
                color="grey-3"
                text-color="grey-8"
                class="q-mr-xs"
              >
                {{ file }}
              </q-chip>
              <span v-if="Object.keys(gist.files || {}).length > 3" class="text-grey-6">
                +{{ Object.keys(gist.files || {}).length - 3 }} more
              </span>
            </q-item-label>
          </q-item-section>

          <q-item-section side>
            <div class="text-caption text-grey-6">
              {{ formatDate(gist.updated_at) }}
            </div>
            <div class="q-mt-xs">
              <q-icon
                :name="gist.public ? 'public' : 'lock'"
                size="sm"
                :color="gist.public ? 'positive' : 'warning'"
              >
                <q-tooltip>{{ gist.public ? 'Public' : 'Secret' }}</q-tooltip>
              </q-icon>
            </div>
          </q-item-section>
        </q-item>
      </q-virtual-scroll>

      <!-- Expanded Gist View (if active) -->
      <q-dialog v-model="showGistDetail" full-width full-height>
        <q-card v-if="activeGist" class="gist-detail-card">
          <!-- Header with actions -->
          <q-card-section class="row items-center bg-primary text-white">
            <div class="text-h6">{{ getGistTitle(activeGist) }}</div>
            <q-space />
            <q-btn
              flat
              label="Edit"
              icon="edit"
              @click="handleEdit"
              class="q-mr-sm"
            />
            <q-btn
              flat
              label="Delete"
              icon="delete"
              @click="handleDelete"
              class="q-mr-sm"
            />
            <q-btn icon="close" flat round dense @click="showGistDetail = false" />
          </q-card-section>

          <q-card-section>
            <!-- Visibility indicator -->
            <div class="row items-center q-gutter-sm q-mb-sm">
              <q-icon
                :name="activeGist.public ? 'public' : 'lock'"
                :color="activeGist.public ? 'positive' : 'warning'"
                size="sm"
              />
              <span :class="activeGist.public ? 'text-positive' : 'text-warning'" class="text-caption">
                {{ activeGist.public ? 'Public gist' : 'Secret gist' }}
              </span>
            </div>

            <p>{{ getGistDescription(activeGist) }}</p>

            <!-- Display mode toggle -->
            <div class="row items-center q-mb-md">
              <q-chip 
                dense 
                color="grey-8" 
                text-color="white"
                class="q-mr-sm"
              >
                {{ Object.keys(activeGist.files).length }} {{ Object.keys(activeGist.files).length === 1 ? 'file' : 'files' }}
              </q-chip>
              <q-space />
              <q-btn-toggle
                v-model="displayMode"
                dense
                flat
                toggle-color="primary"
                :options="[
                  { label: 'Formatted', value: 'formatted' },
                  { label: 'Raw', value: 'raw' }
                ]"
                data-test="display-mode-toggle"
              />
              <q-btn
                flat
                dense
                round
                icon="unfold_more"
                class="q-ml-sm"
                @click="expandAllFiles"
                data-test="expand-all-files"
              >
                <q-tooltip>Expand all</q-tooltip>
              </q-btn>
              <q-btn
                flat
                dense
                round
                icon="unfold_less"
                @click="collapseAllFiles"
                data-test="collapse-all-files"
              >
                <q-tooltip>Collapse all</q-tooltip>
              </q-btn>
            </div>

            <!-- Loading state for content -->
            <div v-if="activeGist && gistsStore.isGistLoading(activeGist.id)" class="flex flex-center q-py-xl">
              <q-spinner-dots size="40px" color="primary" />
              <span class="q-ml-sm text-grey-7">Loading content...</span>
            </div>

            <!-- File Accordion -->
            <div v-else class="file-accordion">
              <div 
                v-for="(file, filename) in activeGist.files" 
                :key="filename"
                class="file-item-wrapper"
              >
                <q-expansion-item
                  v-model="expandedFiles[String(filename)]"
                  :group="Object.keys(activeGist.files).length === 1 ? undefined : 'gist-files'"
                  :default-opened="Object.keys(activeGist.files).length === 1"
                  class="file-item"
                  header-class="file-header"
                  data-test="file-accordion-item"
                >
                  <template #header>
                    <q-item-section avatar class="file-icon-section">
                      <q-icon :name="getFileIcon(String(filename))" color="grey-6" />
                    </q-item-section>
                    <q-item-section>
                      <q-item-label class="file-name">{{ filename }}</q-item-label>
                      <q-item-label caption>
                        <q-chip
                          v-if="file.language"
                          dense
                          size="sm"
                          color="grey-8"
                          text-color="grey-3"
                        >
                          {{ file.language }}
                        </q-chip>
                        <span class="text-grey-6 q-ml-sm">{{ formatFileSize(file.size) }}</span>
                      </q-item-label>
                    </q-item-section>
                    <q-item-section side>
                      <q-btn
                        flat
                        dense
                        round
                        icon="content_copy"
                        size="sm"
                        @click.stop="copyFileContent(file.content)"
                        data-test="copy-code-button"
                      >
                        <q-tooltip>Copy {{ filename }}</q-tooltip>
                      </q-btn>
                    </q-item-section>
                  </template>

                  <!-- Expanded content -->
                  <div class="file-content-expanded">
                    <template v-if="displayMode === 'raw'">
                      <pre class="raw-content">{{ file.content || '(empty)' }}</pre>
                    </template>
                    <template v-else>
                      <div v-if="isMarkdownFile(String(filename))" 
                           class="markdown-preview q-pa-md"
                           data-test="markdown-preview"
                           v-html="renderMarkdown(file.content || '')" 
                      />
                      <div v-else-if="isJupyterFile(String(filename))"
                           class="jupyter-preview q-pa-md"
                           data-test="jupyter-preview"
                           v-html="renderJupyter(file.content)"
                      />
                      <div v-else data-test="file-content">
                        <CodeEditor
                          :model-value="file.content || ''"
                          :filename="String(filename)"
                          height="400px"
                          readonly
                        />
                      </div>
                    </template>
                  </div>
                </q-expansion-item>

                <!-- Preview when collapsed -->
                <div 
                  v-if="!expandedFiles[String(filename)]"
                  class="file-preview"
                  data-test="file-preview"
                  @click="expandedFiles[String(filename)] = true"
                >
                  <pre>{{ getFilePreview(file.content) }}</pre>
                  <div v-if="hasMoreLines(file.content)" class="preview-fade">
                    <span class="preview-more">{{ countRemainingLines(file.content) }} more lines</span>
                  </div>
                </div>
              </div>
            </div>
          </q-card-section>

          <!-- Bottom actions -->
          <q-card-actions align="right" class="q-pa-md">
            <q-btn flat label="Delete" icon="delete" color="negative" @click="handleDelete" />
            <q-space />
            <q-btn flat label="Edit" icon="edit" color="primary" @click="handleEdit" />
            <q-btn flat label="Close" @click="showGistDetail = false" />
          </q-card-actions>
        </q-card>
      </q-dialog>
    </div>
    </q-pull-to-refresh>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, reactive, watch, onMounted, onUnmounted } from 'vue'
import { useQuasar } from 'quasar'
import { useGistsStore } from 'src/stores/gists'
import { useUIStore } from 'src/stores/ui'
import { useSettingsStore } from 'src/stores/settings'
import CodeEditor from 'src/components/CodeEditor.vue'
import { useAuthStore } from 'src/stores/auth'
import { useSearchStore } from 'src/stores/search'
import { parseDescription } from 'src/services/parser'
import { renderMarkdown } from 'src/services/markdown'
import { searchService } from 'src/services/search'
import { renderNotebook, isJupyterNotebook, isJupyterFile } from 'src/services/jupyter'
import { useTagMeta } from 'src/composables/useMeta'
import type { Gist } from 'src/types/github'
import type { SavedSearch, DateRangeFilter } from 'src/types/store'
import { parseLangName } from 'src/services/parser'

const $q = useQuasar()
const gistsStore = useGistsStore()
const uiStore = useUIStore()
const settingsStore = useSettingsStore()
const authStore = useAuthStore()
const searchStore = useSearchStore()

// Dynamic page title based on active tag
useTagMeta()

const showGistDetail = ref(false)
const displayMode = ref<'formatted' | 'raw'>('formatted')
const isPullRefreshing = ref(false)
const expandedFiles = reactive<Record<string, boolean>>({})
const searchQuery = ref('')
const searchInputRef = ref<InstanceType<typeof import('quasar').QInput> | null>(null)

const dateRangeOptions: { label: string; value: DateRangeFilter }[] = [
  { label: 'All time', value: 'all' },
  { label: 'Today', value: 'today' },
  { label: 'This week', value: 'week' },
  { label: 'This month', value: 'month' },
  { label: 'This year', value: 'year' }
]

const dateRangeLabel = computed(() => {
  const option = dateRangeOptions.find(o => o.value === searchStore.filters.dateRange)
  return option?.label || 'Date'
})

function formatLangName(tag: string): string {
  return parseLangName(tag)
}

function isMarkdownFile(filename: string): boolean {
  return /\.(md|markdown)$/i.test(filename)
}

function renderJupyter(content: string | undefined): string {
  if (!content) return ''
  try {
    if (isJupyterNotebook(content)) {
      return renderNotebook(content)
    }
    return '<div class="error">Invalid Jupyter notebook format</div>'
  } catch {
    return '<div class="error">Failed to render notebook</div>'
  }
}

function getFilePreview(content: string | undefined): string {
  if (!content) return '(empty)'
  const lines = content.split('\n')
  return lines.slice(0, uiStore.previewLines).join('\n')
}

function hasMoreLines(content: string | undefined): boolean {
  if (!content) return false
  return content.split('\n').length > uiStore.previewLines
}

function countRemainingLines(content: string | undefined): number {
  if (!content) return 0
  const totalLines = content.split('\n').length
  return Math.max(0, totalLines - uiStore.previewLines)
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(filename: string): string {
  if (isMarkdownFile(filename)) return 'description'
  if (isJupyterFile(filename)) return 'science'
  if (/\.(js|ts|jsx|tsx)$/i.test(filename)) return 'javascript'
  if (/\.(py)$/i.test(filename)) return 'code'
  if (/\.(json|yaml|yml)$/i.test(filename)) return 'data_object'
  if (/\.(html|css|scss)$/i.test(filename)) return 'web'
  return 'insert_drive_file'
}

function expandAllFiles() {
  if (activeGist.value?.files) {
    Object.keys(activeGist.value.files).forEach(filename => {
      expandedFiles[filename] = true
    })
  }
}

function collapseAllFiles() {
  if (activeGist.value?.files) {
    Object.keys(activeGist.value.files).forEach(filename => {
      expandedFiles[filename] = false
    })
  }
}

watch(showGistDetail, (isOpen) => {
  if (isOpen && activeGist.value?.files) {
    Object.keys(expandedFiles).forEach(key => delete expandedFiles[key])
    const fileCount = Object.keys(activeGist.value.files).length
    if (fileCount === 1) {
      const firstFile = Object.keys(activeGist.value.files)[0]
      expandedFiles[firstFile] = true
    }
    displayMode.value = 'formatted'
  }
})

watch(searchQuery, (query) => {
  searchStore.setQuery(query)
})

const hasGists = computed(() => gistsStore.totalGists > 0)

const activeTagName = computed(() => {
  return gistsStore.activeTag === 'All Gists'
    ? 'All Gists'
    : gistsStore.activeTag
})

const displayedGists = computed(() => {
  return gistsStore.gistsByTag(gistsStore.activeTag)
})

const filteredGists = computed(() => {
  let gists = displayedGists.value

  const query = searchQuery.value.trim()
  if (query && query.length >= 2) {
    const searchResults = searchService.search(query)
    const searchResultIds = new Set(searchResults.map(g => g.id))
    gists = gists.filter(g => searchResultIds.has(g.id))
  }

  const { visibility, languages, dateRange } = searchStore.filters

  if (visibility !== 'all') {
    gists = gists.filter(g => visibility === 'public' ? g.public : !g.public)
  }

  if (languages.length > 0) {
    gists = gists.filter(g => {
      const gistLangs = Object.values(g.files || {})
        .map(f => f.language ? `lang@${f.language.toLowerCase()}` : null)
        .filter(Boolean)
      return languages.some(lang => gistLangs.includes(lang))
    })
  }

  if (dateRange !== 'all') {
    const now = Date.now()
    const cutoff = {
      today: now - 24 * 60 * 60 * 1000,
      week: now - 7 * 24 * 60 * 60 * 1000,
      month: now - 30 * 24 * 60 * 60 * 1000,
      year: now - 365 * 24 * 60 * 60 * 1000
    }[dateRange]
    
    if (cutoff) {
      gists = gists.filter(g => new Date(g.updated_at).getTime() >= cutoff)
    }
  }

  return gists
})

const activeGist = computed(() => gistsStore.activeGist)

function getGistTitle(gist: Gist): string {
  const parsed = parseDescription(gist.description)
  return parsed.title || gist.description || 'Untitled'
}

function getGistDescription(gist: Gist): string {
  const parsed = parseDescription(gist.description)
  return parsed.description || gist.description || 'No description'
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`
  if (days < 365) return `${Math.floor(days / 30)} months ago`
  return `${Math.floor(days / 365)} years ago`
}

async function selectGist(gistId: string) {
  gistsStore.setActiveGist(gistId)
  gistsStore.trackRecentGist(gistId)
  showGistDetail.value = true
  if (!gistsStore.isGistLoaded(gistId)) {
    await gistsStore.fetchGistContent(gistId)
  }
}

async function handleSync() {
  try {
    await Promise.all([
      gistsStore.syncGists(),
      gistsStore.syncStarredGists()
    ])
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

async function handlePullToRefresh(done: () => void) {
  isPullRefreshing.value = true
  try {
    await Promise.all([
      gistsStore.syncGists(),
      gistsStore.syncStarredGists()
    ])
    $q.notify({
      type: 'positive',
      message: `Synced ${gistsStore.totalGists} gists`,
      icon: 'check_circle',
      timeout: 1500
    })
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: 'Sync failed. Please check your connection.',
      icon: 'error'
    })
  } finally {
    isPullRefreshing.value = false
    done()
  }
}

function handleEdit() {
  showGistDetail.value = false
  uiStore.openModal('editGist')
}

function handleDelete() {
  showGistDetail.value = false
  uiStore.openModal('deleteGist')
}

async function copyFileContent(content: string | undefined) {
  if (!content) return
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

function focusSearchInput() {
  searchInputRef.value?.focus()
}

function handleSaveSearch() {
  searchStore.setQuery(searchQuery.value)
  searchStore.saveSearch()
  $q.notify({
    type: 'positive',
    message: 'Search saved',
    icon: 'bookmark',
    timeout: 1500
  })
}

function applySavedSearch(saved: SavedSearch) {
  searchQuery.value = saved.query
}

function deleteSavedSearch(id: string) {
  searchStore.deleteSavedSearch(id)
  $q.notify({
    type: 'info',
    message: 'Saved search deleted',
    icon: 'delete',
    timeout: 1500
  })
}

function handleKeyDown(event: KeyboardEvent) {
  const isMac = navigator.userAgent.toUpperCase().indexOf('MAC') >= 0
  const cmdOrCtrl = isMac ? event.metaKey : event.ctrlKey

  if (cmdOrCtrl && event.key === 'k') {
    event.preventDefault()
    focusSearchInput()
  }
}

// Auto-sync on mount if authenticated
onMounted(async () => {
  window.addEventListener('keydown', handleKeyDown)
  if (authStore.isAuthenticated) {
    await settingsStore.enableSync()
    await handleSync()
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})
</script>

<style lang="scss" scoped>
.home-page {
  background: var(--bg-secondary);
}

.gist-list {
  max-width: 1200px;
  margin: 0 auto;
}

.gist-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.search-bar {
  max-width: 100%;

  :deep(.q-field__control) {
    background: var(--bg-primary);
  }
}

.code-block-wrapper {
  position: relative;
}

.copy-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 1;
  background: var(--bg-primary);
  opacity: 0.7;

  &:hover {
    opacity: 1;
  }
}

.code-block {
  background: var(--bg-secondary);
  padding: 16px;
  padding-top: 40px;
  border-radius: 4px;
  overflow-x: auto;
  font-family: 'Fira Code', monospace;
  font-size: 14px;
  line-height: 1.5;
  margin: 0;

  code {
    color: var(--text-code-block);
  }
}

.file-accordion {
  background: transparent;
}

.file-item-wrapper {
  background: var(--bg-secondary);
  border-radius: 8px;
  margin-bottom: 12px;
  overflow: hidden;
  border: 1px solid var(--border-color);
}

.file-item {
  :deep(.q-expansion-item__container) {
    background: transparent;
  }

  :deep(.q-item) {
    min-height: 56px;
  }
}

.file-header {
  background: var(--bg-primary);

  &:hover {
    background: var(--bg-secondary);
  }
}

.file-icon-section {
  min-width: 40px;
}

.file-name {
  font-family: 'Fira Code', monospace;
  font-weight: 500;
}

.file-content-expanded {
  max-height: 500px;
  overflow: auto;
}

.raw-content {
  margin: 0;
  padding: 16px;
  font-family: 'Fira Code', monospace;
  font-size: 13px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-wrap: break-word;
  background: var(--bg-secondary);
}

.file-preview {
  position: relative;
  background: var(--bg-secondary);
  padding: 12px 16px;
  padding-bottom: 32px;
  cursor: pointer;
  transition: background 0.2s;
  border-top: 1px solid var(--border-color);

  &:hover {
    background: var(--bg-primary);
  }

  pre {
    margin: 0;
    font-family: 'Fira Code', monospace;
    font-size: 12px;
    line-height: 1.4;
    color: var(--text-secondary);
    white-space: pre-wrap;
    word-wrap: break-word;
  }
}

.preview-fade {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 48px;
  background: linear-gradient(transparent, var(--bg-secondary));
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: 8px;
  pointer-events: none;
}

.file-preview:hover .preview-fade {
  background: linear-gradient(transparent, var(--bg-primary));
}

.preview-more {
  font-size: 12px;
  color: var(--text-secondary);
  font-style: italic;
  background: var(--bg-secondary);
  padding: 2px 8px;
  border-radius: 4px;
}

.gist-virtual-scroll {
  height: calc(100vh - 200px);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--bg-primary);
}

.gist-item {
  background: var(--bg-primary);

  &.border-top {
    border-top: 1px solid var(--border-color);
  }
}

.markdown-preview {
  background: var(--bg-primary);
  min-height: 400px;
  max-height: 600px;
  overflow-y: auto;
  border: 1px solid var(--border-color);
  border-radius: 4px;

  :deep(h1), :deep(h2), :deep(h3), :deep(h4), :deep(h5), :deep(h6) {
    margin-top: 1em;
    margin-bottom: 0.5em;
    font-weight: 600;
  }

  :deep(h1) { font-size: 2em; border-bottom: 1px solid var(--border-color); padding-bottom: 0.3em; }
  :deep(h2) { font-size: 1.5em; border-bottom: 1px solid var(--border-color); padding-bottom: 0.3em; }
  :deep(h3) { font-size: 1.25em; }

  :deep(p) { margin: 1em 0; line-height: 1.6; }

  :deep(a) { color: var(--q-primary); text-decoration: none; &:hover { text-decoration: underline; } }

  :deep(code) {
    background: var(--bg-secondary);
    padding: 0.2em 0.4em;
    border-radius: 3px;
    font-family: 'Fira Code', monospace;
    font-size: 0.9em;
  }

  :deep(pre) {
    background: var(--bg-secondary);
    padding: 16px;
    border-radius: 4px;
    overflow-x: auto;

    code {
      background: none;
      padding: 0;
    }
  }

  :deep(ul), :deep(ol) { padding-left: 2em; margin: 1em 0; }
  :deep(li) { margin: 0.25em 0; }

  :deep(blockquote) {
    border-left: 4px solid var(--q-primary);
    margin: 1em 0;
    padding-left: 1em;
    color: var(--text-secondary);
  }

  :deep(table) {
    border-collapse: collapse;
    width: 100%;
    margin: 1em 0;

    th, td {
      border: 1px solid var(--border-color);
      padding: 8px 12px;
      text-align: left;
    }

    th { background: var(--bg-secondary); font-weight: 600; }
  }

  :deep(img) { max-width: 100%; height: auto; }

  :deep(hr) { border: none; border-top: 1px solid var(--border-color); margin: 2em 0; }
}

.jupyter-preview {
  background: var(--bg-primary);
  min-height: 400px;
  max-height: 600px;
  overflow-y: auto;
  border: 1px solid var(--border-color);
  border-radius: 4px;

  :deep(.nb-notebook) {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  :deep(.nb-cell) {
    margin-bottom: 16px;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    overflow: hidden;
  }

  :deep(.nb-input), :deep(.nb-output) {
    padding: 12px;
  }

  :deep(.nb-input) {
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border-color);
  }

  :deep(.nb-output) {
    background: var(--bg-primary);
  }

  :deep(.nb-stdout), :deep(.nb-stderr) {
    font-family: 'Fira Code', monospace;
    font-size: 13px;
    white-space: pre-wrap;
    word-break: break-word;
  }

  :deep(.nb-stderr) {
    color: #d32f2f;
  }

  :deep(pre) {
    margin: 0;
    padding: 0;
    background: transparent;
    font-family: 'Fira Code', monospace;
    font-size: 13px;
    line-height: 1.5;
    overflow-x: auto;
  }

  :deep(code) {
    font-family: 'Fira Code', monospace;
    font-size: 13px;
  }

  :deep(.nb-markdown) {
    padding: 12px 16px;

    h1, h2, h3, h4, h5, h6 {
      margin-top: 0.5em;
      margin-bottom: 0.5em;
    }

    p { margin: 0.5em 0; line-height: 1.6; }
    ul, ol { padding-left: 1.5em; }
  }

  :deep(.nb-output img) {
    max-width: 100%;
    height: auto;
  }

  :deep(table) {
    border-collapse: collapse;
    margin: 8px 0;

    th, td {
      border: 1px solid var(--border-color);
      padding: 6px 10px;
    }
  }

  .error {
    color: #d32f2f;
    padding: 16px;
    text-align: center;
  }
}
</style>
