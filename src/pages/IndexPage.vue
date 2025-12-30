<template>
  <q-page class="home-page" data-test="snippet-panel">
    <div class="three-pane-layout">
      <!-- Left Pane: Gist List -->
      <div class="gist-list-pane" :class="{ 'full-width': !showPreviewPane }">
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
                  placeholder="Search gists... (Cmd/Ctrl+K) or /regex/"
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
          </div>
        </q-pull-to-refresh>
      </div>

      <!-- Right Pane: Preview Panel (visible on larger screens) -->
      <div v-if="showPreviewPane" class="preview-pane">
        <GistPreviewPanel />
      </div>
    </div>

    <!-- Mobile: Full-screen dialog for preview -->
    <q-dialog v-model="showMobilePreview" full-width full-height position="right">
      <q-card class="mobile-preview-card">
        <q-card-section class="row items-center q-pa-sm bg-primary text-white">
          <q-btn icon="arrow_back" flat round dense @click="showMobilePreview = false" />
          <span class="q-ml-sm text-subtitle1">Gist Preview</span>
        </q-card-section>
        <GistPreviewPanel />
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useQuasar } from 'quasar'
import { useGistsStore } from 'src/stores/gists'
import { useSettingsStore } from 'src/stores/settings'
import { useAuthStore } from 'src/stores/auth'
import { useSearchStore } from 'src/stores/search'
import GistPreviewPanel from 'src/components/GistPreviewPanel.vue'
import { parseDescription } from 'src/services/parser'
import { searchService } from 'src/services/search'
import { useTagMeta } from 'src/composables/useMeta'
import type { Gist } from 'src/types/github'
import type { SavedSearch, DateRangeFilter } from 'src/types/store'
import { parseLangName } from 'src/services/parser'

const $q = useQuasar()
const gistsStore = useGistsStore()
const settingsStore = useSettingsStore()
const authStore = useAuthStore()
const searchStore = useSearchStore()

// Dynamic page title based on active tag
useTagMeta()

const isPullRefreshing = ref(false)
const searchQuery = ref('')
const searchInputRef = ref<InstanceType<typeof import('quasar').QInput> | null>(null)
const showMobilePreview = ref(false)

// Show preview pane on medium and larger screens
const showPreviewPane = computed(() => $q.screen.gt.sm)

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

  // On mobile, show the preview dialog
  if (!showPreviewPane.value) {
    showMobilePreview.value = true
  }

  // Fetch content if not loaded
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
  height: 100%;
}

.three-pane-layout {
  display: flex;
  height: calc(100vh - 50px);
  overflow: hidden;
}

.gist-list-pane {
  width: 400px;
  min-width: 320px;
  max-width: 500px;
  border-right: 1px solid var(--border-color);
  overflow: hidden;
  display: flex;
  flex-direction: column;

  &.full-width {
    width: 100%;
    max-width: none;
    border-right: none;
  }
}

.preview-pane {
  flex: 1;
  overflow: hidden;
}

.gist-list {
  height: 100%;
  overflow-y: auto;
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

.gist-virtual-scroll {
  height: calc(100vh - 280px);
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

.mobile-preview-card {
  height: 100%;
  display: flex;
  flex-direction: column;

  .gist-preview-panel {
    flex: 1;
  }
}

// Responsive adjustments
@media (max-width: 1024px) {
  .gist-list-pane {
    width: 350px;
    min-width: 280px;
  }
}

@media (max-width: 768px) {
  .gist-list-pane {
    width: 100%;
    max-width: none;
    border-right: none;
  }
}
</style>
