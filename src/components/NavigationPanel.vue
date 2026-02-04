<template>
  <div class="navigation-panel">
    <!-- User Panel -->
    <UserPanel />

    <q-separator class="q-my-md" />

    <!-- All Gists -->
    <div class="nav-section q-mb-md">
      <q-item
        v-if="uiStore.navDrawers.allGistsVisible"
        clickable
        :active="gistsStore.activeTag === 'All Gists'"
        @click="selectTag('All Gists')"
        class="tag-item"
      >
        <q-item-section avatar>
          <q-icon name="mdi-code-braces" />
        </q-item-section>
        <q-item-section>
          <q-item-label>All Gists</q-item-label>
        </q-item-section>
        <q-item-section side>
          <span class="text-caption text-grey-6">{{ gistsStore.totalGists }} Gists</span>
        </q-item-section>
      </q-item>

      <!-- Starred Gists -->
      <q-item
        v-if="uiStore.navDrawers.starredVisible"
        clickable
        :active="gistsStore.activeTag === 'Starred'"
        @click="selectTag('Starred')"
        class="tag-item"
      >
        <q-item-section avatar>
          <q-icon name="star" color="amber" />
        </q-item-section>
        <q-item-section>
          <q-item-label>Starred</q-item-label>
        </q-item-section>
        <q-item-section v-if="gistsStore.starredCount > 0" side>
          <q-badge color="amber" text-color="dark">{{ gistsStore.starredCount }}</q-badge>
        </q-item-section>
      </q-item>

      <!-- Pinned Gists -->
      <q-item
        v-if="uiStore.navDrawers.pinnedVisible && gistsStore.pinnedCount > 0"
        clickable
        :active="gistsStore.activeTag === 'Pinned'"
        @click="selectTag('Pinned')"
        class="tag-item"
      >
        <q-item-section avatar>
          <q-icon name="push_pin" color="deep-purple" />
        </q-item-section>
        <q-item-section>
          <q-item-label>Pinned</q-item-label>
        </q-item-section>
        <q-item-section side>
          <q-badge color="deep-purple">{{ gistsStore.pinnedCount }}</q-badge>
        </q-item-section>
      </q-item>

      <!-- Recent Gists -->
      <q-item
        v-if="uiStore.navDrawers.recentsVisible && gistsStore.recentCount > 0"
        clickable
        :active="gistsStore.activeTag === 'Recent'"
        @click="selectTag('Recent')"
        class="tag-item"
      >
        <q-item-section avatar>
          <q-icon name="history" color="blue-grey" />
        </q-item-section>
        <q-item-section>
          <q-item-label>Recent</q-item-label>
        </q-item-section>
        <q-item-section side>
          <div class="row items-center no-wrap">
            <q-badge color="blue-grey" class="q-mr-xs">{{ gistsStore.recentCount }}</q-badge>
            <q-btn
              flat
              dense
              round
              size="xs"
              icon="clear_all"
              @click.stop="clearRecent"
            >
              <q-tooltip>Clear recent</q-tooltip>
            </q-btn>
          </div>
        </q-item-section>
      </q-item>
    </div>

    <!-- Pinned Tags with Drag-and-Drop -->
    <div v-if="pinnedTags.length > 0" class="nav-section q-mb-md">
      <div class="section-header q-px-md q-py-xs">
        <span class="text-caption text-weight-bold text-grey-7">PINNED</span>
        <q-btn flat dense round size="xs" icon="settings" @click="uiStore.openModal('pinnedTags')">
          <q-tooltip>Manage Pinned Tags</q-tooltip>
        </q-btn>
      </div>

      <q-list dense>
        <q-item
          v-for="(tag, index) in pinnedTags"
          :key="tag"
          clickable
          :active="gistsStore.activeTag === tag"
          @click="selectTag(tag)"
          class="tag-item pinned-tag-item"
          draggable="true"
          @dragstart="handleDragStart($event, index)"
          @dragover.prevent="handleDragOver($event, index)"
          @drop="handleDrop($event, index)"
          @dragend="handleDragEnd"
          :class="{ 'drag-over': dragOverIndex === index }"
        >
          <q-item-section avatar>
            <q-icon name="drag_indicator" size="xs" class="drag-handle" />
          </q-item-section>
          <q-item-section avatar>
            <q-icon :name="getTagIcon(tag)" size="xs" />
          </q-item-section>
          <q-item-section>
            <q-item-label class="text-caption">
              {{ formatTagName(tag) }}
            </q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-badge color="grey-6" text-color="white">
              {{ getTagCount(tag) }}
            </q-badge>
          </q-item-section>
        </q-item>
      </q-list>
    </div>

    <q-separator class="q-my-sm" />

    <!-- Language Tags Drawer -->
    <q-expansion-item
      v-if="uiStore.navDrawers.languagesVisible"
      v-model="uiStore.navDrawers.languagesExpanded"
      dense
      header-class="section-header-expandable"
    >
      <template #header>
        <q-item-section avatar>
          <q-icon name="mdi-code-tags" size="sm" />
        </q-item-section>
        <q-item-section>
          <span class="text-caption text-weight-bold">LANGUAGES</span>
        </q-item-section>
        <q-item-section side>
          <q-badge color="primary" text-color="white">
            {{ languageTags.length }}
          </q-badge>
        </q-item-section>
      </template>

      <q-scroll-area style="height: 180px">
        <q-list dense>
          <q-item
            v-for="tag in languageTags"
            :key="tag"
            clickable
            :active="gistsStore.activeTag === tag"
            @click="selectTag(tag)"
            class="tag-item"
            data-test="language-tag"
          >
            <q-item-section avatar>
              <q-icon name="mdi-code-tags" size="xs" />
            </q-item-section>
            <q-item-section>
              <q-item-label class="text-caption">
                {{ formatTagName(tag) }}
              </q-item-label>
            </q-item-section>
            <q-item-section side>
              <div class="row items-center">
                <q-badge color="grey-6" text-color="white" class="q-mr-xs">
                  {{ getTagCount(tag) }}
                </q-badge>
                <q-btn
                  flat
                  dense
                  round
                  size="xs"
                  :icon="isPinned(tag) ? 'push_pin' : 'mdi-pin-outline'"
                  @click.stop="togglePin(tag)"
                >
                  <q-tooltip>
                    {{ isPinned(tag) ? 'Unpin' : 'Pin' }}
                  </q-tooltip>
                </q-btn>
              </div>
            </q-item-section>
          </q-item>
        </q-list>
      </q-scroll-area>
    </q-expansion-item>

    <q-separator v-if="uiStore.navDrawers.languagesVisible" class="q-my-sm" />

    <!-- Custom Tags Drawer -->
    <q-expansion-item
      v-if="uiStore.navDrawers.tagsVisible"
      v-model="uiStore.navDrawers.tagsExpanded"
      dense
      header-class="section-header-expandable"
    >
      <template #header>
        <q-item-section avatar>
          <q-icon name="mdi-tag" size="sm" />
        </q-item-section>
        <q-item-section>
          <span class="text-caption text-weight-bold">TAGS</span>
        </q-item-section>
        <q-item-section side>
          <q-badge color="primary" text-color="white">
            {{ customTags.length }}
          </q-badge>
        </q-item-section>
      </template>

      <q-scroll-area style="height: 180px">
        <q-list dense>
          <q-item
            v-for="tagItem in customTagsWithStarters"
            :key="tagItem.tag"
            clickable
            :active="gistsStore.activeTag === tagItem.tag"
            :disable="tagItem.count === 0"
            @click="tagItem.count > 0 ? selectTag(tagItem.tag) : undefined"
            class="tag-item"
            :class="{ 'starter-tag-unused': tagItem.count === 0 }"
          >
            <q-item-section avatar>
              <q-icon
                :name="tagItem.count === 0 ? 'mdi-tag-plus-outline' : (uiStore.showTagColors && uiStore.tagColors[tagItem.tag] ? 'mdi-tag' : 'mdi-tag-outline')"
                size="xs"
                :style="tagItem.count > 0 && uiStore.showTagColors && uiStore.tagColors[tagItem.tag] ? { color: uiStore.tagColors[tagItem.tag] } : undefined"
                :class="{ 'text-grey-5': tagItem.count === 0 }"
              />
            </q-item-section>
            <q-item-section>
              <q-item-label class="text-caption" :class="{ 'text-grey-5': tagItem.count === 0 }">
                #{{ tagItem.tag }}
                <q-tooltip v-if="tagItem.count === 0">
                  Add #{{ tagItem.tag }} to a gist description to use this tag
                </q-tooltip>
              </q-item-label>
            </q-item-section>
            <q-item-section side>
              <div class="row items-center">
                <q-badge
                  :color="tagItem.count === 0 ? 'grey-4' : 'grey-6'"
                  :text-color="tagItem.count === 0 ? 'grey-6' : 'white'"
                  class="q-mr-xs"
                >
                  {{ tagItem.count }}
                </q-badge>
                <template v-if="tagItem.count > 0">
                  <q-btn
                    flat
                    dense
                    round
                    size="xs"
                    icon="palette"
                    @click.stop
                  >
                    <q-tooltip>Set color</q-tooltip>
                    <q-menu anchor="bottom right" self="top right">
                      <div class="color-picker-menu q-pa-sm">
                        <div class="color-swatches">
                          <button
                            v-for="color in TAG_COLORS"
                            :key="color"
                            class="color-swatch"
                            :class="{ active: uiStore.tagColors[tagItem.tag] === color }"
                            :style="{ backgroundColor: color }"
                            @click="uiStore.setTagColor(tagItem.tag, color)"
                          />
                          <button
                            class="color-swatch color-swatch-none"
                            :class="{ active: !uiStore.tagColors[tagItem.tag] }"
                            @click="uiStore.removeTagColor(tagItem.tag)"
                          >
                            <q-icon name="close" size="12px" />
                          </button>
                        </div>
                      </div>
                    </q-menu>
                  </q-btn>
                  <q-btn
                    flat
                    dense
                    round
                    size="xs"
                    :icon="isPinned(tagItem.tag) ? 'push_pin' : 'mdi-pin-outline'"
                    @click.stop="togglePin(tagItem.tag)"
                  >
                    <q-tooltip>
                      {{ isPinned(tagItem.tag) ? 'Unpin' : 'Pin' }}
                    </q-tooltip>
                  </q-btn>
                </template>
              </div>
            </q-item-section>
          </q-item>

          <!-- Empty state only when no custom tags AND no starter tags -->
          <q-item v-if="customTagsWithStarters.length === 0">
            <q-item-section class="text-center text-grey-6">
              <q-item-label caption> No custom tags yet </q-item-label>
              <q-item-label caption class="q-mt-xs"> Add #tags to gist descriptions </q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </q-scroll-area>
    </q-expansion-item>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGistsStore } from 'src/stores/gists'
import { useUIStore } from 'src/stores/ui'
import { parseLangName } from 'src/services/parser'
import UserPanel from './UserPanel.vue'

const TAG_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#84cc16', '#22c55e', '#14b8a6', '#06b6d4',
  '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7',
  '#d946ef', '#ec4899', '#f43f5e', '#78716c'
]

const gistsStore = useGistsStore()
const uiStore = useUIStore()

// Drag and drop state
const draggedIndex = ref<number | null>(null)
const dragOverIndex = ref<number | null>(null)

// Computed properties
const pinnedTags = computed(() => {
  return gistsStore.pinnedTags.filter(tag => gistsStore.gistTags[tag])
})

const languageTags = computed(() => gistsStore.languageTags)
const customTags = computed(() => gistsStore.customTags)
const customTagsWithStarters = computed(() => gistsStore.customTagsWithStarters)

// Methods
function selectTag(tag: string) {
  gistsStore.setActiveTag(tag)
}

function formatTagName(tag: string): string {
  if (tag.startsWith('lang@')) {
    return parseLangName(tag)
  }
  return tag
}

function getTagIcon(tag: string): string {
  if (tag.startsWith('lang@')) {
    return 'mdi-code-tags'
  }
  return 'mdi-tag'
}

function getTagCount(tag: string): number {
  const tagInfo = gistsStore.tagInfo(tag)
  return tagInfo ? tagInfo.count : 0
}

function isPinned(tag: string): boolean {
  return gistsStore.pinnedTags.includes(tag)
}

function togglePin(tag: string) {
  gistsStore.togglePinnedTag(tag)
}

function clearRecent() {
  gistsStore.clearRecentGists()
  if (gistsStore.activeTag === 'Recent') {
    gistsStore.setActiveTag('All Gists')
  }
}

// Drag and drop handlers
function handleDragStart(event: DragEvent, index: number) {
  draggedIndex.value = index
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', index.toString())
  }
}

function handleDragOver(event: DragEvent, index: number) {
  event.preventDefault()
  dragOverIndex.value = index
}

function handleDrop(event: DragEvent, targetIndex: number) {
  event.preventDefault()

  if (draggedIndex.value === null || draggedIndex.value === targetIndex) {
    return
  }

  // Create a new array with the reordered items
  const newOrder = [...pinnedTags.value]
  const [movedItem] = newOrder.splice(draggedIndex.value, 1)
  newOrder.splice(targetIndex, 0, movedItem)

  // Update the store
  gistsStore.reorderPinnedTags(newOrder)

  // Reset drag state
  draggedIndex.value = null
  dragOverIndex.value = null
}

function handleDragEnd() {
  draggedIndex.value = null
  dragOverIndex.value = null
}
</script>

<style lang="scss" scoped>
.navigation-panel {
  height: 100%;
  overflow-y: auto;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--bg-secondary);
}

.tag-item {
  &:hover:not(.q-item--active) {
    background: var(--bg-secondary);
  }
}

:deep(.q-item--active) {
  background: var(--q-primary) !important;
  color: white;

  &:hover {
    background: var(--q-primary) !important;
  }

  .q-icon,
  .q-item-label {
    color: white !important;
  }
}

.pinned-tag-item {
  cursor: grab;

  &:active {
    cursor: grabbing;
  }

  .drag-handle {
    opacity: 0.4;
    transition: opacity 0.2s;
  }

  &:hover .drag-handle {
    opacity: 1;
  }

  &.drag-over {
    border-top: 2px solid var(--q-primary);
    background: var(--bg-secondary);
  }
}

:deep(.section-header-expandable) {
  padding: 4px 16px;
  min-height: 36px;
}

.color-picker-menu {
  width: 160px;
}

.color-swatches {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
}

.color-swatch {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  transition: transform 0.15s, border-color 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    transform: scale(1.15);
  }

  &.active {
    border-color: var(--q-primary);
  }
}

.color-swatch-none {
  background: var(--bg-secondary);
  border: 2px dashed var(--text-secondary);

  &:hover {
    border-color: var(--q-negative);
  }
}

.starter-tag-unused {
  opacity: 0.6;
  cursor: default;

  &:hover {
    background: transparent;
  }
}
</style>
