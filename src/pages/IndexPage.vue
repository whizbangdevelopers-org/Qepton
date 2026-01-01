<template>
  <q-page class="home-page" data-test="snippet-panel">
    <div class="three-pane-layout">
      <!-- Left Pane: Gist List -->
      <div class="gist-list-pane" :class="{ 'full-width': !showPreviewPane }">
        <q-pull-to-refresh @refresh="handlePullToRefresh" color="primary">
          <div class="gist-list q-pa-md" data-test="gist-list">
            <!-- Header - Always visible -->
            <div class="gist-list-header q-mb-md">
              <div class="row items-center justify-between full-width">
                <div class="row items-center">
                  <h5 class="text-h5 q-my-none q-mr-sm">
                    {{ activeTagName }}
                  </h5>
                  <!-- Sort Options -->
                  <q-btn
                    flat
                    dense
                    round
                    size="sm"
                    :icon="uiStore.gistSort.direction === 'asc' ? 'arrow_upward' : 'arrow_downward'"
                    class="q-mr-xs"
                    data-test="sort-btn"
                  >
                    <q-tooltip>Sort gists</q-tooltip>
                    <q-menu anchor="bottom left" self="top left" data-test="sort-menu">
                      <q-list dense style="min-width: 180px">
                        <q-item-label header class="text-caption">Sort by</q-item-label>
                        <q-item
                          clickable
                          v-close-popup
                          :active="uiStore.gistSort.sortBy === 'updated'"
                          @click="uiStore.setGistSort('updated')"
                        >
                          <q-item-section avatar>
                            <q-icon name="schedule" size="sm" />
                          </q-item-section>
                          <q-item-section>Date Modified</q-item-section>
                          <q-item-section side v-if="uiStore.gistSort.sortBy === 'updated'">
                            <q-icon
                              :name="
                                uiStore.gistSort.direction === 'asc'
                                  ? 'arrow_upward'
                                  : 'arrow_downward'
                              "
                              size="xs"
                            />
                          </q-item-section>
                        </q-item>
                        <q-item
                          clickable
                          v-close-popup
                          :active="uiStore.gistSort.sortBy === 'name'"
                          @click="uiStore.setGistSort('name')"
                        >
                          <q-item-section avatar>
                            <q-icon name="sort_by_alpha" size="sm" />
                          </q-item-section>
                          <q-item-section>Name</q-item-section>
                          <q-item-section side v-if="uiStore.gistSort.sortBy === 'name'">
                            <q-icon
                              :name="
                                uiStore.gistSort.direction === 'asc'
                                  ? 'arrow_upward'
                                  : 'arrow_downward'
                              "
                              size="xs"
                            />
                          </q-item-section>
                        </q-item>
                        <q-separator />
                        <q-item clickable v-close-popup @click="uiStore.toggleSortDirection">
                          <q-item-section avatar>
                            <q-icon
                              :name="
                                uiStore.gistSort.direction === 'asc'
                                  ? 'arrow_downward'
                                  : 'arrow_upward'
                              "
                              size="sm"
                            />
                          </q-item-section>
                          <q-item-section>{{
                            uiStore.gistSort.direction === 'asc' ? 'Descending' : 'Ascending'
                          }}</q-item-section>
                        </q-item>
                      </q-list>
                    </q-menu>
                  </q-btn>
                  <q-chip
                    v-if="!gistsStore.isSyncing || hasGists"
                    dense
                    color="primary"
                    text-color="white"
                  >
                    {{ filteredGists.length }}
                  </q-chip>
                  <q-spinner v-else size="16px" color="primary" class="q-ml-xs" />
                </div>
                <!-- View Toggle -->
                <q-btn-toggle
                  :model-value="uiStore.gistListView"
                  @update:model-value="uiStore.setGistListView"
                  dense
                  flat
                  toggle-color="primary"
                  :options="[
                    { icon: 'view_list', value: 'list' },
                    { icon: 'grid_view', value: 'card' }
                  ]"
                  data-test="view-toggle"
                >
                  <q-tooltip>Toggle view</q-tooltip>
                </q-btn-toggle>
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
                  :hint="
                    searchStore.isRegexQuery
                      ? searchStore.isValidRegex
                        ? 'Regex mode'
                        : 'Invalid regex pattern'
                      : ''
                  "
                  hide-hint
                  data-test="global-search-input"
                  @clear="searchQuery = ''"
                >
                  <template #prepend>
                    <q-icon
                      :name="searchStore.isRegexQuery ? 'mdi-regex' : 'search'"
                      :color="searchStore.isRegexQuery ? 'purple' : undefined"
                    />
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
                    <q-badge
                      v-if="searchQuery && filteredGists.length !== displayedGists.length"
                      color="primary"
                      class="q-mr-xs"
                    >
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
                      <q-item-label header class="text-weight-bold"> Saved Searches </q-item-label>
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
                  :label="
                    searchStore.filters.languages.length > 0
                      ? `Languages (${searchStore.filters.languages.length})`
                      : 'Languages'
                  "
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
            <div
              v-if="gistsStore.isSyncing && !isPullRefreshing && !hasGists"
              class="flex flex-center q-py-xl"
            >
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

            <!-- List View -->
            <q-virtual-scroll
              v-else-if="uiStore.isListView"
              :items="filteredGists"
              :virtual-scroll-item-size="88"
              class="gist-virtual-scroll"
              v-slot="{ item: gist, index }"
              @click="keyboardNav.focusGistList()"
            >
              <q-item
                :key="gist.id"
                clickable
                :active="gistsStore.activeGistId === gist.id"
                @click="selectGist(gist.id)"
                data-test="gist-item"
                class="gist-item"
                :class="{
                  'border-top': index > 0,
                  'keyboard-focused': keyboardNav.focusedPane.value === 'gistList' && keyboardNav.focusedGistIndex.value === index
                }"
              >
                <q-item-section>
                  <q-item-label class="text-weight-bold gist-title-row">
<template v-for="tag in getGistTags(gist).slice(0, 5)" :key="tag">
                      <q-icon
                        :name="uiStore.showTagColors && uiStore.tagColors[tag] ? 'mdi-tag' : 'mdi-tag-outline'"
                        size="14px"
                        :style="uiStore.showTagColors && uiStore.tagColors[tag] ? { color: uiStore.tagColors[tag] } : undefined"
                      />
                      <span class="text-caption text-grey-6 q-mr-sm">#{{ tag }}</span>
                    </template>
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

            <!-- Keyboard Navigation Hint -->
            <div
              v-if="keyboardNav.focusedPane.value === 'gistList'"
              class="keyboard-hint q-mt-sm text-caption text-grey-6"
            >
              <q-icon name="keyboard" size="xs" class="q-mr-xs" />
              <kbd>j</kbd>/<kbd>k</kbd> navigate
              <kbd>Enter</kbd> select
              <kbd>Tab</kbd> switch pane
              <kbd>Esc</kbd> clear
            </div>
            <div
              v-if="keyboardNav.focusedPane.value === 'preview'"
              class="keyboard-hint q-mt-sm text-caption text-grey-6"
            >
              <q-icon name="keyboard" size="xs" class="q-mr-xs" />
              <kbd>j</kbd>/<kbd>k</kbd> navigate
              <kbd>Enter</kbd> expand
              <kbd>Cmd+C</kbd> copy
              <kbd>Tab</kbd> switch pane
            </div>

            <!-- Card View -->
            <div v-if="!uiStore.isListView" class="gist-card-grid" @click="keyboardNav.focusGistList()">
              <q-card
                v-for="(gist, index) in filteredGists"
                :key="gist.id"
                flat
                bordered
                clickable
                class="gist-card"
                :class="{
                  'gist-card--active': gistsStore.activeGistId === gist.id,
                  'keyboard-focused': keyboardNav.focusedPane.value === 'gistList' && keyboardNav.focusedGistIndex.value === index
                }"
                @click="selectGist(gist.id)"
                data-test="gist-card"
              >
                <q-card-section class="q-pb-xs">
                  <div class="row items-start no-wrap">
                    <div class="col">
                      <div class="text-subtitle2 text-weight-bold ellipsis-2-lines gist-title-row">
                        {{ getGistTitle(gist) }}
                      </div>
                    </div>
                    <q-icon
                      :name="gist.public ? 'public' : 'lock'"
                      size="xs"
                      :color="gist.public ? 'positive' : 'warning'"
                      class="q-ml-sm"
                    >
                      <q-tooltip>{{ gist.public ? 'Public' : 'Secret' }}</q-tooltip>
                    </q-icon>
                  </div>
                  <div v-if="getGistTags(gist).length > 0" class="q-mt-xs">
                    <template v-for="tag in getGistTags(gist).slice(0, 3)" :key="tag">
                      <q-icon
                        :name="uiStore.showTagColors && uiStore.tagColors[tag] ? 'mdi-tag' : 'mdi-tag-outline'"
                        size="12px"
                        :style="uiStore.showTagColors && uiStore.tagColors[tag] ? { color: uiStore.tagColors[tag] } : undefined"
                      />
                      <span class="text-caption text-grey-6 q-mr-sm">#{{ tag }}</span>
                    </template>
                  </div>
                </q-card-section>

                <q-card-section class="q-pt-none q-pb-sm">
                  <div class="text-caption text-grey-7 ellipsis-2-lines">
                    {{ getGistDescription(gist) }}
                  </div>
                </q-card-section>

                <q-separator />

                <q-card-section class="q-py-sm">
                  <div class="row items-center q-gutter-xs">
                    <q-chip
                      v-for="file in Object.keys(gist.files || {}).slice(0, 2)"
                      :key="file"
                      dense
                      size="sm"
                      color="grey-3"
                      text-color="grey-8"
                    >
                      {{ truncateFilename(file) }}
                    </q-chip>
                    <span
                      v-if="Object.keys(gist.files || {}).length > 2"
                      class="text-caption text-grey-6"
                    >
                      +{{ Object.keys(gist.files || {}).length - 2 }}
                    </span>
                  </div>
                </q-card-section>

                <q-card-section class="q-pt-none">
                  <div class="text-caption text-grey-5">
                    {{ formatDate(gist.updated_at) }}
                  </div>
                </q-card-section>
              </q-card>
            </div>
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
import { ref, computed, watch, onMounted, onUnmounted, provide } from 'vue'
import { useQuasar } from 'quasar'
import { useGistsStore } from 'src/stores/gists'
import { useSettingsStore } from 'src/stores/settings'
import { useAuthStore } from 'src/stores/auth'
import { useSearchStore } from 'src/stores/search'
import { useUIStore } from 'src/stores/ui'
import GistPreviewPanel from 'src/components/GistPreviewPanel.vue'
import { parseDescription } from 'src/services/parser'
import { searchService } from 'src/services/search'
import { useTagMeta } from 'src/composables/useMeta'
import { useKeyboardNavigation } from 'src/composables/useKeyboardNavigation'
import type { Gist } from 'src/types/github'
import type { SavedSearch, DateRangeFilter } from 'src/types/store'
import { parseLangName } from 'src/services/parser'

const $q = useQuasar()
const gistsStore = useGistsStore()
const settingsStore = useSettingsStore()
const authStore = useAuthStore()
const searchStore = useSearchStore()
const uiStore = useUIStore()

// Dynamic page title based on active tag
useTagMeta()

const isPullRefreshing = ref(false)
const searchQuery = ref('')
const searchInputRef = ref<InstanceType<typeof import('quasar').QInput> | null>(null)
const showMobilePreview = ref(false)

// Show preview pane on medium and larger screens
const showPreviewPane = computed(() => $q.screen.gt.sm)

// File expansion state (shared with GistPreviewPanel via provide)
const previewExpandedFiles = ref<Record<string, boolean>>({})

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

watch(searchQuery, query => {
  searchStore.setQuery(query)
})

const hasGists = computed(() => gistsStore.totalGists > 0)

const activeTagName = computed(() => {
  return gistsStore.activeTag === 'All Gists' ? 'All Gists' : gistsStore.activeTag
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
    gists = gists.filter(g => (visibility === 'public' ? g.public : !g.public))
  }

  if (languages.length > 0) {
    gists = gists.filter(g => {
      const gistLangs = Object.values(g.files || {})
        .map(f => (f.language ? `lang@${f.language.toLowerCase()}` : null))
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

  // Apply sorting
  const { sortBy, direction } = uiStore.gistSort
  const multiplier = direction === 'asc' ? 1 : -1

  gists = [...gists].sort((a, b) => {
    switch (sortBy) {
      case 'updated':
        return multiplier * (new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime())
      case 'name': {
        const nameA = getGistTitle(a).toLowerCase()
        const nameB = getGistTitle(b).toLowerCase()
        return multiplier * nameA.localeCompare(nameB)
      }
      default:
        return 0
    }
  })

  return gists
})

function getGistTitle(gist: Gist): string {
  const parsed = parseDescription(gist.description)
  return parsed.title || gist.description || 'Untitled'
}

function getGistDescription(gist: Gist): string {
  const parsed = parseDescription(gist.description)
  return parsed.description || 'No description'
}

function getGistTags(gist: Gist): string[] {
  const parsed = parseDescription(gist.description)
  return parsed.customTags || []
}

function truncateFilename(filename: string, maxLength = 15): string {
  if (filename.length <= maxLength) return filename
  const ext = filename.lastIndexOf('.')
  if (ext > 0 && filename.length - ext <= 5) {
    const name = filename.substring(0, ext)
    const extension = filename.substring(ext)
    const truncatedName = name.substring(0, maxLength - extension.length - 2)
    return `${truncatedName}..${extension}`
  }
  return filename.substring(0, maxLength - 2) + '..'
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

// Keyboard navigation setup (must be after filteredGists and selectGist are defined)
const activeGistFiles = computed(() => {
  const gist = gistsStore.activeGist
  return gist ? Object.keys(gist.files) : []
})

const keyboardNav = useKeyboardNavigation({
  gists: () => filteredGists.value,
  files: () => activeGistFiles.value,
  expandedFiles: () => previewExpandedFiles.value,
  onSelectGist: (gistId: string) => {
    selectGist(gistId)
  },
  onToggleFile: (filename: string) => {
    // Toggle file expansion when Enter is pressed
    previewExpandedFiles.value[filename] = !previewExpandedFiles.value[filename]
  },
  onCopyFile: async (content: string | undefined) => {
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
})

// Provide keyboard navigation to child components
provide('keyboardNav', keyboardNav)
provide('previewExpandedFiles', previewExpandedFiles)

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

async function handlePullToRefresh(done: () => void) {
  isPullRefreshing.value = true
  try {
    await Promise.all([gistsStore.syncGists(), gistsStore.syncStarredGists()])
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

  &.keyboard-focused {
    outline: 2px solid var(--q-primary);
    outline-offset: -2px;
    background: rgba(var(--q-primary-rgb), 0.08);
  }
}

.gist-card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
  max-height: calc(100vh - 280px);
  overflow-y: auto;
  padding: 4px;
}

.gist-card {
  background: var(--bg-primary);
  transition: all 0.2s ease;
  cursor: pointer;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  &--active {
    border-color: var(--q-primary);
    box-shadow: 0 0 0 2px var(--q-primary);
  }

  &.keyboard-focused {
    outline: 2px dashed var(--q-primary);
    outline-offset: 2px;
  }
}

.ellipsis-2-lines {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.keyboard-hint {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  padding: 8px 12px;
  background: var(--bg-primary);
  border-radius: 4px;
  border: 1px solid var(--border-color);

  kbd {
    display: inline-block;
    padding: 2px 6px;
    font-size: 11px;
    font-family: 'Fira Code', monospace;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-radius: 3px;
    box-shadow: 0 1px 0 rgba(0, 0, 0, 0.1);
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

.gist-tag {
  display: inline-flex;
  align-items: center;
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
